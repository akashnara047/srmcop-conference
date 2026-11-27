import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  REQUEST_TIMEOUT_MS,
  applyRestrictedCors,
  getAppsScriptConfig,
  resolveEmailCcRecipient,
  sanitizeErrorMessage,
  sendJson,
} from '../_lib/emailConfig.ts';
import {
  AuthVerificationError,
  getFirestoreDocument,
  verifyFirebaseAdminBearerToken,
} from '../_lib/firebaseServerVerify.ts';

interface AllocationEmailRequestBody {
  eventId?: unknown;
  abstractId?: unknown;
  allocationId?: unknown;
  isResend?: unknown;
  attachment?: unknown;
}

interface PdfAttachmentPayload {
  filename: string;
  mimeType: string;
  base64: string;
  decodedBytes: number;
}

interface DispatchOutcome {
  statusCode: number;
  body: Record<string, unknown>;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]{3,128}$/;
const MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHMENT_BASE64_LENGTH = 4 * 1024 * 1024;
const SENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const CONFERENCE_TITLE =
  'International Conference on AI-Powered Innovations in Drug Discovery and Development';
const CONFERENCE_SHORT = 'SRMCON 2027';
const CONFERENCE_DATES = '15–16 February 2027';
const CONFERENCE_HOST = 'SRM College of Pharmacy, SRMIST';
const CONFERENCE_VENUE =
  'SRM College of Pharmacy, SRM Institute of Science and Technology (SRMIST), Kattankulathur, Tamil Nadu, India';
const CONFERENCE_COLLABORATOR = 'INTI International University, Malaysia';
const SECRETARIAT_EMAIL = 'org.secy.cp@srmist.edu.in';
const CONVENOR_EMAIL = 'dean.pharmacy.ktr@srmist.edu.in';

const TRACK_TITLES: Record<string, string> = {
  'track-01': 'Track 01: Pharmaceutical Technology & Pharmaceutics',
  'track-02': 'Track 02: Pharmacology & Experimental Therapeutics',
  'track-03': 'Track 03: Pharmaceutical Chemistry & Drug Discovery',
  'track-04': 'Track 04: Pharmaceutical Analysis & Analytical Technologies',
  'track-05': 'Track 05: Pharmacy Practice & Clinical Pharmacy',
  'track-06': 'Track 06: Pharmacognosy & Natural Product Research',
  'track-07': 'Track 07: Regulatory Affairs & Pharmaceutical Quality Assurance',
};

const inFlightDispatches = new Map<string, Promise<DispatchOutcome>>();
const completedDispatches = new Map<
  string,
  { sentAt: string; recipient: string; cachedAt: number }
>();

function pruneCompletedCache(): void {
  const cutoff = Date.now() - SENT_CACHE_TTL_MS;
  for (const [k, v] of completedDispatches.entries()) {
    if (v.cachedAt < cutoff) completedDispatches.delete(k);
  }
}

async function readJsonBody(req: IncomingMessage): Promise<AllocationEmailRequestBody> {
  const preParsed = (req as IncomingMessage & { body?: unknown }).body;
  if (preParsed && typeof preParsed === 'object' && !Array.isArray(preParsed)) {
    return preParsed as AllocationEmailRequestBody;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > MAX_REQUEST_BYTES) {
        reject(new Error('Request payload exceeds maximum allowed size.'));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        if (!raw) {
          resolve({});
          return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new Error('Request body must be a JSON object.'));
          return;
        }
        resolve(parsed as AllocationEmailRequestBody);
      } catch {
        reject(new Error('Invalid JSON payload.'));
      }
    });

    req.on('error', (err) => reject(err));

    if (typeof req.resume === 'function') {
      req.resume();
    }
  });
}

function validatePdfAttachment(rawAttachment: unknown): PdfAttachmentPayload {
  if (!rawAttachment || typeof rawAttachment !== 'object' || Array.isArray(rawAttachment)) {
    throw new Error('Official Presentation Allocation Confirmation PDF attachment is required.');
  }

  const obj = rawAttachment as Record<string, unknown>;
  const filename = typeof obj.filename === 'string' ? obj.filename.trim() : '';
  const mimeType = typeof obj.mimeType === 'string' ? obj.mimeType.trim().toLowerCase() : '';
  const base64Raw = typeof obj.base64 === 'string' ? obj.base64.trim() : '';
  const base64 = base64Raw.replace(/^data:[^,]+,/, '').replace(/\s+/g, '');

  if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
    throw new Error('Invalid PDF attachment filename.');
  }
  if (mimeType && mimeType !== 'application/pdf') {
    throw new Error('Unsupported attachment MIME type. Only PDF attachments are permitted.');
  }
  if (!base64 || base64.length > MAX_ATTACHMENT_BASE64_LENGTH) {
    throw new Error('PDF attachment payload is empty or exceeds size limit.');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('PDF attachment is not valid Base64.');
  }

  const decoded = Buffer.from(base64, 'base64');
  if (decoded.length < 5 || decoded.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('PDF attachment does not contain a valid %PDF- header.');
  }

  return {
    filename: filename.replace(/[^a-zA-Z0-9._-]/g, '_'),
    mimeType: 'application/pdf',
    base64,
    decodedBytes: decoded.length,
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateReadable(isoOrDate: unknown): string {
  if (typeof isoOrDate !== 'string' || !isoOrDate.trim()) {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildAllocationConfirmationEmail(abs: Record<string, unknown>): {
  subject: string;
  htmlBody: string;
  textBody: string;
  structuredData: Record<string, unknown>;
} {
  const pa = (abs.presentingAuthor || {}) as Record<string, unknown>;
  const authorName = String(pa.fullName || pa.name || 'Presenting Author').trim();
  const abstractId = String(abs.id || '').trim();
  const registrationId = String(abs.registrationId || '').trim();
  const title = String(abs.title || 'Untitled Abstract').trim();
  const trackRaw = String(abs.trackId || '').trim();
  const trackTitle = TRACK_TITLES[trackRaw] || trackRaw || 'Scientific Track Not Specified';
  const allocationId = String(abs.presentationAllocationId || '').trim();
  const officialCategory = String(abs.officialAllocationCategory || '').trim();
  const submittedPreference = String(
    abs.presentationPreference || abs.presentationType || 'Not specified'
  ).trim();
  const allocatedAtDisplay = formatDateReadable(abs.allocationCreatedAt || abs.allottedAt);

  const subject = `SRMCON 2027 – Official Presentation Allocation Confirmation – ${allocationId}`;

  const rows: Array<{ label: string; value: string; monospace?: boolean }> = [
    { label: 'Presenting Author', value: authorName },
    { label: 'Presentation Allocation ID', value: allocationId, monospace: true },
    { label: 'Official Allotted Category', value: officialCategory },
    { label: 'Allocation Status', value: 'Active (Official Confirmation)' },
    { label: 'Abstract ID', value: abstractId, monospace: true },
    { label: 'Linked Registration ID', value: registrationId || 'Not Linked', monospace: true },
    { label: 'Abstract Title', value: title },
    { label: 'Scientific Track', value: trackTitle },
    { label: 'Submitted Preference (Ref. Only)', value: submittedPreference },
    { label: 'Allocation Confirmed On', value: allocatedAtDisplay },
    { label: 'Conference Dates', value: CONFERENCE_DATES },
    { label: 'Venue', value: CONFERENCE_VENUE },
  ];

  const rowsHtml = rows
    .map(
      ({ label, value, monospace }) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px; font-weight: 600; width: 38%; vertical-align: top;">
          ${escapeHtml(label)}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 600; vertical-align: top; ${
          monospace ? "font-family: 'Courier New', Courier, monospace;" : ''
        }">
          ${escapeHtml(value)}
        </td>
      </tr>`
    )
    .join('');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1fd; font-family: Arial, Helvetica, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f1fd; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 640px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dcd3fa;">
          <tr>
            <td style="background-color: #0f1b4b; padding: 24px 24px 20px 24px; text-align: center; border-bottom: 4px solid #6d3ce2;">
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #22d3ee; margin-bottom: 6px;">
                ${escapeHtml(CONFERENCE_SHORT)} &middot; ${escapeHtml(CONFERENCE_DATES)}
              </div>
              <div style="font-size: 18px; font-weight: 700; line-height: 1.35; color: #ffffff; margin: 0 0 8px 0;">
                ${escapeHtml(CONFERENCE_TITLE)}
              </div>
              <div style="font-size: 12px; color: #e2e8f0; line-height: 1.5;">
                Organised by <strong>${escapeHtml(CONFERENCE_HOST)}</strong><br />
                In Collaboration with <strong>${escapeHtml(CONFERENCE_COLLABORATOR)}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 10px 24px;">
              <div style="display: inline-block; padding: 5px 12px; border-radius: 999px; background-color: #d1fae5; color: #065f46; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 12px;">
                Official Presentation Allocation &middot; Active
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 20px; line-height: 1.3; color: #0f1b4b; font-weight: 700;">
                Official Presentation Allocation Confirmation
              </h1>
              <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>${escapeHtml(authorName)}</strong>,
              </p>
              <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                This is to officially confirm that your abstract <strong>${escapeHtml(
                  abstractId
                )}</strong> (&ldquo;${escapeHtml(
    title
  )}&rdquo;) has been allocated an official presentation category for <strong>${escapeHtml(
    CONFERENCE_SHORT
  )}</strong>:<br /><br />
                <div style="background-color: #f3f0ff; border: 1px solid #c4b5fd; border-radius: 10px; padding: 12px 16px; margin-bottom: 10px;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #5b21b6; font-weight: 700;">Official Presentation Allocation ID</div>
                  <div style="font-size: 18px; font-weight: 700; color: #0f1b4b; font-family: 'Courier New', Courier, monospace; margin-top: 2px;">${escapeHtml(
                    allocationId
                  )}</div>
                  <div style="font-size: 13px; font-weight: 700; color: #312e81; margin-top: 4px;">Official Category: ${escapeHtml(
                    officialCategory
                  )}</div>
                </div>
                Please note that your <strong>Official Allotted Category (${escapeHtml(
                  officialCategory
                )})</strong> and <strong>Presentation Allocation ID (${escapeHtml(
    allocationId
  )})</strong> represent your final confirmed conference slot and are distinct from your initial submission preference (${escapeHtml(
    submittedPreference
  )}). Your official <strong>Presentation Allocation Confirmation PDF</strong> is attached to this email.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; border-collapse: collapse;">
                ${rowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 24px 18px 24px;">
              <div style="background-color: #faf8fe; border: 1px solid #ddd6fe; border-left: 4px solid #6d3ce2; border-radius: 8px; padding: 14px 16px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #5b21b6; margin-bottom: 8px;">
                  Presentation Guidelines &amp; Next Steps
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #334155;">
                  <li style="margin-bottom: 5px;">Retain the attached <strong>Presentation Allocation Confirmation PDF</strong> and quote Presentation Allocation ID <strong>${escapeHtml(
                    allocationId
                  )}</strong> alongside Abstract ID <strong>${escapeHtml(
    abstractId
  )}</strong> in all scientific correspondence.</li>
                  <li style="margin-bottom: 5px;">Prepare your presentation strictly according to your <strong>Official Allotted Category (${escapeHtml(
                    officialCategory
                  )})</strong> guidelines. Session hall/board schedules will be shared prior to the conference.</li>
                  <li>For queries, write to <a href="mailto:${SECRETARIAT_EMAIL}" style="color: #6d3ce2; text-decoration: none;">${SECRETARIAT_EMAIL}</a>.</li>
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 22px 24px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">Warm regards,</p>
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f1b4b;">
                Organising Secretariat &mdash; SRMCON 2027
              </p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; line-height: 1.5;">
                Dr. N. Damodharan (Organising Secretary &amp; Vice Principal) &middot; Dr. V. Chitra (Conference Convenor &amp; Dean)<br />
                ${escapeHtml(CONFERENCE_VENUE)}<br />
                Secretariat Desk: <a href="mailto:${SECRETARIAT_EMAIL}" style="color: #6d3ce2; text-decoration: none;">${SECRETARIAT_EMAIL}</a> &middot;
                <a href="mailto:${CONVENOR_EMAIL}" style="color: #6d3ce2; text-decoration: none;">${CONVENOR_EMAIL}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0b0f33; padding: 14px 20px; text-align: center; font-size: 11px; color: #cbd5e1; line-height: 1.5;">
              &copy; 2027 SRM College of Pharmacy, SRMIST &middot; In Collaboration with INTI International University, Malaysia<br />
              This is an official presentation allocation notification. Quote ${escapeHtml(
                allocationId
              )} / ${escapeHtml(abstractId)} in all correspondence.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = [
    `Dear ${authorName},`,
    '',
    `Your abstract ${abstractId} ("${title}") has been allocated an official presentation category for ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}).`,
    '',
    `Official Presentation Allocation ID: ${allocationId}`,
    `Official Allotted Category: ${officialCategory}`,
    'Allocation Status: Active',
    `Abstract ID: ${abstractId}`,
    `Linked Registration ID: ${registrationId || 'Not Linked'}`,
    `Scientific Track: ${trackTitle}`,
    `Submitted Preference (Reference Only): ${submittedPreference}`,
    `Allocated On: ${allocatedAtDisplay}`,
    `Conference Dates: ${CONFERENCE_DATES}`,
    `Venue: ${CONFERENCE_VENUE}`,
    '',
    'Your official Presentation Allocation Confirmation PDF is attached to this email.',
    `Please quote Presentation Allocation ID ${allocationId} and Abstract ID ${abstractId} in all correspondence.`,
    '',
    'Warm regards,',
    'Organising Secretariat – SRMCON 2027',
    `SRM College of Pharmacy, SRMIST (${SECRETARIAT_EMAIL})`,
  ].join('\n');

  return {
    subject,
    htmlBody,
    textBody,
    structuredData: {
      authorName,
      abstractId,
      registrationId,
      allocationId,
      officialCategory,
      submittedPreference,
      abstractTitle: title,
      trackTitle,
    },
  };
}

function isAppsScriptAuthFailure(payload: Record<string, unknown>, statusCode: number): boolean {
  if (statusCode === 401 || statusCode === 403) return true;
  if (payload.authenticated === false || payload.authorized === false) return true;
  const errText = String(payload.error || payload.message || '').toLowerCase();
  return (
    errText.includes('unauthorized') ||
    errText.includes('unauthorised') ||
    errText.includes('invalid token') ||
    errText.includes('invalid secret')
  );
}

async function postToAppsScript(params: {
  appsScriptUrl: string;
  appsScriptSecret: string;
  action: 'presentation_allocation' | 'abstract_acceptance';
  eventId: string;
  recipient: string;
  builtEmail: ReturnType<typeof buildAllocationConfirmationEmail>;
  attachment: PdfAttachmentPayload;
}): Promise<{ ok: boolean; statusCode: number; payload: Record<string, unknown>; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const ccRecipient = resolveEmailCcRecipient(params.recipient);
    const upstreamPayload: Record<string, unknown> = {
      token: params.appsScriptSecret,
      action: params.action,
      eventId: params.eventId,
      to: params.recipient,
      recipient: params.recipient,
      ...(ccRecipient ? { cc: ccRecipient } : {}),
      subject: params.builtEmail.subject,
      htmlBody: params.builtEmail.htmlBody,
      textBody: params.builtEmail.textBody,
      data: params.builtEmail.structuredData,
      requiresAttachment: true,
      attachment: {
        filename: params.attachment.filename,
        mimeType: params.attachment.mimeType,
        base64: params.attachment.base64,
      },
    };

    const upstreamResponse = await fetch(params.appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(upstreamPayload),
      redirect: 'follow',
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();
    let parsedPayload: Record<string, unknown>;
    try {
      const json = JSON.parse(rawText);
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        throw new Error('Invalid JSON response');
      }
      parsedPayload = json as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        statusCode: 502,
        payload: {},
        error: 'Received an invalid response from the Google Apps Script email service.',
      };
    }

    return {
      ok: upstreamResponse.ok,
      statusCode: upstreamResponse.status,
      payload: parsedPayload,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function dispatchAllocationToAppsScript(params: {
  appsScriptUrl: string;
  appsScriptSecret: string;
  eventId: string;
  recipient: string;
  builtEmail: ReturnType<typeof buildAllocationConfirmationEmail>;
  attachment: PdfAttachmentPayload;
}): Promise<DispatchOutcome> {
  try {
    let attempt = await postToAppsScript({
      ...params,
      action: 'presentation_allocation',
    });

    // If the currently deployed external Google Apps Script has not yet been redeployed with
    // `presentation_allocation` in supportedActions, gracefully fall back to the existing
    // attachment-enforced transport action (`abstract_acceptance`), which forwards our custom
    // subject, HTML/text body, eventId, CC, and PDF attachment directly to MailApp.sendEmail.
    const errText = String(attempt.payload.error || '').toLowerCase();
    if (
      attempt.payload.success !== true &&
      errText.includes('unsupported action') &&
      errText.includes('presentation_allocation')
    ) {
      attempt = await postToAppsScript({
        ...params,
        action: 'abstract_acceptance',
      });
    }

    if (attempt.error && attempt.statusCode === 502) {
      return {
        statusCode: 502,
        body: { success: false, eventId: params.eventId, error: attempt.error },
      };
    }

    const parsedPayload = attempt.payload;
    if (isAppsScriptAuthFailure(parsedPayload, attempt.statusCode)) {
      return {
        statusCode: 401,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Authentication failed with the Google Apps Script email service.',
        },
      };
    }

    if (!attempt.ok) {
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: `Google Apps Script email service returned HTTP ${attempt.statusCode}.`,
        },
      };
    }

    const duplicateReported =
      parsedPayload.duplicate === true ||
      parsedPayload.alreadySent === true ||
      parsedPayload.duplicatePrevented === true;

    if (parsedPayload.success !== true) {
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: sanitizeErrorMessage(
            parsedPayload.error || parsedPayload.message,
            'Google Apps Script email service could not send the allocation email.'
          ),
        },
      };
    }

    const upstreamAttachmentReceived = parsedPayload.attachmentReceived === true;
    const upstreamBlobCreated = parsedPayload.blobCreated === true;
    const upstreamAttachmentCount =
      typeof parsedPayload.attachmentCount === 'number' ? parsedPayload.attachmentCount : 0;
    const upstreamMailAppSent = parsedPayload.mailAppSent === true;

    if (
      !duplicateReported &&
      (!upstreamAttachmentReceived ||
        !upstreamBlobCreated ||
        upstreamAttachmentCount < 1 ||
        !upstreamMailAppSent)
    ) {
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Google Apps Script did not confirm PDF attachment delivery.',
        },
      };
    }

    const sentAt =
      typeof parsedPayload.sentAt === 'string' && parsedPayload.sentAt.trim()
        ? parsedPayload.sentAt.trim()
        : new Date().toISOString();

    completedDispatches.set(params.eventId, {
      sentAt,
      recipient: params.recipient,
      cachedAt: Date.now(),
    });

    return {
      statusCode: 200,
      body: {
        success: true,
        eventId: params.eventId,
        eventType: 'presentation_allocation',
        recipient: params.recipient,
        cc:
          typeof parsedPayload.cc === 'string' && parsedPayload.cc.trim()
            ? parsedPayload.cc.trim()
            : resolveEmailCcRecipient(params.recipient),
        subject: params.builtEmail.subject,
        status: 'Sent',
        sentAt,
        duplicatePrevented: duplicateReported,
        alreadySent: duplicateReported,
        service:
          typeof parsedPayload.service === 'string' && parsedPayload.service.trim()
            ? parsedPayload.service.trim()
            : 'SRMCOP Conference Email Service',
        attachmentFilename: params.attachment.filename,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        statusCode: 504,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Request to Google Apps Script email service timed out.',
        },
      };
    }
    return {
      statusCode: 503,
      body: {
        success: false,
        eventId: params.eventId,
        error: 'Google Apps Script email service is currently unavailable.',
      },
    };
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!applyRestrictedCors(req, res)) {
    sendJson(res, 403, { success: false, error: 'Origin not allowed.' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { success: false, error: 'Method Not Allowed. Only POST requests are accepted.' });
    return;
  }

  const appsScriptConfig = getAppsScriptConfig();
  if (!appsScriptConfig.ok) {
    sendJson(res, 500, { success: false, error: appsScriptConfig.error });
    return;
  }

  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  let adminBearerToken: string;
  if (typeof req.pause === 'function') {
    req.pause();
  }
  try {
    await verifyFirebaseAdminBearerToken(authHeader);
    adminBearerToken = authHeader!.slice('Bearer '.length).trim();
  } catch (err) {
    const authStatusCode = err instanceof AuthVerificationError ? err.statusCode : 401;
    sendJson(res, authStatusCode, {
      success: false,
      error: sanitizeErrorMessage(err, 'Unauthorized administrative email request.'),
    });
    return;
  }

  let body: AllocationEmailRequestBody;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: sanitizeErrorMessage(err, 'Invalid JSON request payload.'),
    });
    return;
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  const abstractId = typeof body.abstractId === 'string' ? body.abstractId.trim() : '';
  const requestedAllocationId =
    typeof body.allocationId === 'string' ? body.allocationId.trim() : '';

  if (!eventId || !VALID_ID_REGEX.test(eventId)) {
    sendJson(res, 400, { success: false, error: 'Valid eventId is required.' });
    return;
  }
  if (!abstractId || !VALID_ID_REGEX.test(abstractId)) {
    sendJson(res, 400, { success: false, eventId, error: 'Valid abstractId is required.' });
    return;
  }

  let validatedAttachment: PdfAttachmentPayload;
  try {
    validatedAttachment = validatePdfAttachment(body.attachment);
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      eventId,
      error: sanitizeErrorMessage(err, 'Invalid PDF attachment payload.'),
    });
    return;
  }

  let absDoc: Record<string, unknown> | null;
  try {
    absDoc = await getFirestoreDocument('abstractSubmissions', abstractId, adminBearerToken);
    if (!absDoc && abstractId !== abstractId.toUpperCase()) {
      absDoc = await getFirestoreDocument(
        'abstractSubmissions',
        abstractId.toUpperCase(),
        adminBearerToken
      );
    }
  } catch (err) {
    sendJson(res, 503, {
      success: false,
      eventId,
      error: sanitizeErrorMessage(err, 'Unable to verify abstract allocation state from database.'),
    });
    return;
  }

  if (!absDoc) {
    sendJson(res, 404, {
      success: false,
      eventId,
      error: `Abstract record ${abstractId} was not found.`,
    });
    return;
  }

  const allocationStatus = String(absDoc.allocationStatus || '').trim();
  const activeAllocationId = String(absDoc.presentationAllocationId || '').trim();
  const activeCategory = String(absDoc.officialAllocationCategory || '').trim();

  if (allocationStatus !== 'Active' || !activeAllocationId || !activeCategory) {
    sendJson(res, 409, {
      success: false,
      eventId,
      error: 'Abstract does not have an Active official presentation allocation persisted.',
    });
    return;
  }

  if (requestedAllocationId && requestedAllocationId !== activeAllocationId) {
    sendJson(res, 409, {
      success: false,
      eventId,
      error: `Requested allocationId (${requestedAllocationId}) does not match active allocation (${activeAllocationId}).`,
    });
    return;
  }

  const pa = (absDoc.presentingAuthor || {}) as Record<string, unknown>;
  const recipient = String(pa.email || absDoc.email || '').trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    sendJson(res, 400, {
      success: false,
      eventId,
      error: 'Abstract does not contain a valid presenting author email address.',
    });
    return;
  }

  const builtEmail = buildAllocationConfirmationEmail(absDoc);

  pruneCompletedCache();
  const cachedSent = completedDispatches.get(eventId);
  if (cachedSent) {
    sendJson(res, 200, {
      success: true,
      eventId,
      eventType: 'presentation_allocation',
      recipient: cachedSent.recipient,
      subject: builtEmail.subject,
      status: 'Sent',
      sentAt: cachedSent.sentAt,
      alreadySent: true,
      duplicatePrevented: true,
      service: 'SRMCOP Conference Email Service',
    });
    return;
  }

  let pendingPromise = inFlightDispatches.get(eventId);
  if (!pendingPromise) {
    pendingPromise = dispatchAllocationToAppsScript({
      appsScriptUrl: appsScriptConfig.url,
      appsScriptSecret: appsScriptConfig.secret,
      eventId,
      recipient,
      builtEmail,
      attachment: validatedAttachment,
    }).finally(() => {
      inFlightDispatches.delete(eventId);
    });
    inFlightDispatches.set(eventId, pendingPromise);
  }

  const outcome = await pendingPromise;
  sendJson(res, outcome.statusCode, outcome.body);
}
