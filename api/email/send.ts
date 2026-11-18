import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  REQUEST_TIMEOUT_MS,
  applyRestrictedCors,
  getAppsScriptConfig,
  sanitizeErrorMessage,
  sendJson,
} from '../_lib/emailConfig';
import {
  buildAbstractAcceptedEmail,
  buildAbstractSubmittedEmail,
  buildRegistrationConfirmedEmail,
  buildRegistrationReceivedEmail,
  type ConferenceEmailBuildResult,
  type EmailEventType,
} from '../_lib/emailTemplates';
import {
  getFirestoreDocument,
  verifyFirebaseAdminBearerToken,
} from '../_lib/firebaseServerVerify';

interface PdfAttachmentPayload {
  filename: string;
  mimeType: string;
  base64: string;
}

interface SendEmailRequestBody {
  eventId?: unknown;
  eventType?: unknown;
  registrationId?: unknown;
  regDocId?: unknown;
  abstractId?: unknown;
  isAdminRetry?: unknown;
  attachment?: unknown;
}

const VALID_EVENT_TYPES = new Set<EmailEventType>([
  'registration_received',
  'registration_confirmation',
  'abstract_confirmation',
  'abstract_acceptance',
]);

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]{3,128}$/;
const MAX_REQUEST_BYTES = 6 * 1024 * 1024; // 6 MB
const MAX_ATTACHMENT_BASE64_LENGTH = 4 * 1024 * 1024; // ~3 MB decoded
const SENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const inFlightDispatches = new Map<string, Promise<DispatchOutcome>>();
const completedDispatches = new Map<string, { sentAt: string; recipient: string; cachedAt: number }>();

interface DispatchOutcome {
  statusCode: number;
  body: Record<string, unknown>;
}

function pruneCompletedCache(): void {
  const cutoff = Date.now() - SENT_CACHE_TTL_MS;
  for (const [key, entry] of completedDispatches.entries()) {
    if (entry.cachedAt < cutoff) {
      completedDispatches.delete(key);
    }
  }
}

async function readJsonBody(req: IncomingMessage): Promise<SendEmailRequestBody> {
  const maybePreParsed = (req as IncomingMessage & { body?: unknown }).body;
  if (maybePreParsed && typeof maybePreParsed === 'object' && !Buffer.isBuffer(maybePreParsed)) {
    return maybePreParsed as SendEmailRequestBody;
  }
  if (typeof maybePreParsed === 'string') {
    return JSON.parse(maybePreParsed) as SendEmailRequestBody;
  }

  return await new Promise<SendEmailRequestBody>((resolve, reject) => {
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
        resolve(parsed as SendEmailRequestBody);
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

function validatePdfAttachment(raw: unknown): PdfAttachmentPayload | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Attachment payload must be an object.');
  }

  const candidate = raw as Record<string, unknown>;
  const filenameRaw = typeof candidate.filename === 'string' ? candidate.filename.trim() : '';
  const mimeType = typeof candidate.mimeType === 'string' ? candidate.mimeType.trim() : '';
  const base64Raw = typeof candidate.base64 === 'string' ? candidate.base64.trim() : '';

  if (!filenameRaw || filenameRaw.length > 160) {
    throw new Error('Attachment filename is invalid.');
  }
  const safeFilename = filenameRaw.replace(/[^a-zA-Z0-9._\-]/g, '_');
  if (!safeFilename.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF attachments are permitted.');
  }
  if (mimeType !== 'application/pdf') {
    throw new Error('Attachment MIME type must be application/pdf.');
  }

  // Strip optional data URI prefix if passed
  const cleanBase64 = base64Raw.replace(/^data:application\/pdf;[^,]*,/, '').replace(/\s+/g, '');
  if (!cleanBase64 || cleanBase64.length > MAX_ATTACHMENT_BASE64_LENGTH) {
    throw new Error('Attachment PDF payload is empty or exceeds size limit.');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    throw new Error('Attachment PDF content is not valid base64.');
  }

  return {
    filename: safeFilename,
    mimeType: 'application/pdf',
    base64: cleanBase64,
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
    errText.includes('invalid secret') ||
    errText.includes('authentication') ||
    errText.includes('forbidden')
  );
}

function extractRecipientForRegistration(reg: Record<string, unknown>): string {
  return typeof reg.email === 'string' ? reg.email.trim() : '';
}

function extractRecipientForAbstract(abs: Record<string, unknown>): string {
  const author = abs.presentingAuthor;
  if (author && typeof author === 'object' && !Array.isArray(author)) {
    const email = (author as Record<string, unknown>).email;
    if (typeof email === 'string') return email.trim();
  }
  return '';
}

async function dispatchToAppsScript(params: {
  appsScriptUrl: string;
  appsScriptSecret: string;
  eventId: string;
  eventType: EmailEventType;
  recipient: string;
  builtEmail: ConferenceEmailBuildResult;
  attachment: PdfAttachmentPayload | null;
}): Promise<DispatchOutcome> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstreamPayload: Record<string, unknown> = {
      token: params.appsScriptSecret,
      action: params.eventType,
      eventId: params.eventId,
      to: params.recipient,
      recipient: params.recipient,
      email: params.recipient,
      subject: params.builtEmail.subject,
      htmlBody: params.builtEmail.htmlBody,
      textBody: params.builtEmail.textBody,
      data: params.builtEmail.structuredData,
    };

    if (params.attachment) {
      const attachmentObject = {
        filename: params.attachment.filename,
        name: params.attachment.filename,
        mimeType: params.attachment.mimeType,
        contentType: params.attachment.mimeType,
        base64: params.attachment.base64,
        content: params.attachment.base64,
      };
      upstreamPayload.attachment = attachmentObject;
      upstreamPayload.attachments = [attachmentObject];
    }

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
        throw new Error('Unexpected JSON shape');
      }
      parsedPayload = json as Record<string, unknown>;
    } catch {
      console.error(
        `[api/email/send] Non-JSON response from Apps Script (HTTP ${upstreamResponse.status}).`
      );
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Received an invalid response from the Google Apps Script email service.',
        },
      };
    }

    if (isAppsScriptAuthFailure(parsedPayload, upstreamResponse.status)) {
      console.error('[api/email/send] Upstream authentication failed.');
      return {
        statusCode: 401,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Authentication failed with the Google Apps Script email service.',
        },
      };
    }

    if (!upstreamResponse.ok) {
      console.error(`[api/email/send] Upstream HTTP error ${upstreamResponse.status}.`);
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: `Google Apps Script email service returned HTTP ${upstreamResponse.status}.`,
        },
      };
    }

    const duplicateReported =
      parsedPayload.duplicate === true ||
      parsedPayload.alreadySent === true ||
      parsedPayload.duplicatePrevented === true;

    if (parsedPayload.success !== true) {
      const upstreamError = sanitizeErrorMessage(
        parsedPayload.error || parsedPayload.message,
        'Google Apps Script email service could not send the email.'
      );
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: upstreamError,
        },
      };
    }

    const sentAt =
      typeof parsedPayload.sentAt === 'string' && parsedPayload.sentAt.trim()
        ? parsedPayload.sentAt.trim()
        : new Date().toISOString();

    const serviceName =
      typeof parsedPayload.service === 'string' && parsedPayload.service.trim()
        ? parsedPayload.service.trim()
        : 'SRMCOP Conference Email Service';

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
        eventType: params.eventType,
        recipient: params.recipient,
        subject: params.builtEmail.subject,
        status: 'Sent',
        sentAt,
        duplicatePrevented: duplicateReported,
        alreadySent: duplicateReported,
        service: serviceName,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[api/email/send] Request to Google Apps Script timed out.');
      return {
        statusCode: 504,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Request to Google Apps Script email service timed out.',
        },
      };
    }

    console.error('[api/email/send] Network error communicating with Google Apps Script.');
    return {
      statusCode: 503,
      body: {
        success: false,
        eventId: params.eventId,
        error: 'Google Apps Script email service is currently unavailable.',
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!applyRestrictedCors(req, res)) {
    sendJson(res, 403, {
      success: false,
      error: 'Origin not allowed.',
    });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, {
      success: false,
      error: 'Method Not Allowed. Only POST requests are accepted.',
    });
    return;
  }

  const appsScriptConfig = getAppsScriptConfig();
  if (!appsScriptConfig.ok) {
    console.error('[api/email/send] Missing or invalid server email environment configuration.');
    sendJson(res, 500, {
      success: false,
      error: appsScriptConfig.error,
    });
    return;
  }

  let body: SendEmailRequestBody;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: sanitizeErrorMessage(err, 'Invalid JSON request payload.'),
    });
    return;
  }

  const eventType = typeof body.eventType === 'string' ? (body.eventType.trim() as EmailEventType) : null;
  if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
    sendJson(res, 400, {
      success: false,
      error: 'Invalid or unsupported email eventType.',
    });
    return;
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  if (!eventId || !VALID_ID_REGEX.test(eventId)) {
    sendJson(res, 400, {
      success: false,
      error: 'Valid eventId is required.',
    });
    return;
  }

  const isAdminEvent =
    eventType === 'registration_confirmation' ||
    eventType === 'abstract_acceptance' ||
    body.isAdminRetry === true;

  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  let adminBearerToken: string | undefined;

  if (isAdminEvent) {
    try {
      await verifyFirebaseAdminBearerToken(authHeader);
      adminBearerToken = authHeader!.slice('Bearer '.length).trim();
    } catch (err) {
      sendJson(res, 401, {
        success: false,
        eventId,
        error: sanitizeErrorMessage(err, 'Unauthorized administrative email request.'),
      });
      return;
    }
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    // Optional admin token on retry of public events
    try {
      await verifyFirebaseAdminBearerToken(authHeader);
      adminBearerToken = authHeader.slice('Bearer '.length).trim();
    } catch {
      adminBearerToken = undefined;
    }
  }

  let validatedAttachment: PdfAttachmentPayload | null = null;
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

  // Verify authoritative Firestore document and workflow invariants
  let recipient = '';
  let expectedEventId = '';
  let builtEmail: ConferenceEmailBuildResult;

  try {
    if (eventType === 'registration_received' || eventType === 'registration_confirmation') {
      const regDocIdRaw = typeof body.regDocId === 'string' ? body.regDocId.trim() : '';
      const registrationIdRaw =
        typeof body.registrationId === 'string' ? body.registrationId.trim() : '';
      const lookupDocId = regDocIdRaw || registrationIdRaw;

      if (!lookupDocId || !VALID_ID_REGEX.test(lookupDocId)) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'Valid registrationId is required.',
        });
        return;
      }

      let regDoc = await getFirestoreDocument('registrations', lookupDocId, adminBearerToken);
      if (!regDoc && lookupDocId !== lookupDocId.toUpperCase()) {
        regDoc = await getFirestoreDocument(
          'registrations',
          lookupDocId.toUpperCase(),
          adminBearerToken
        );
      }
      if (!regDoc && registrationIdRaw && registrationIdRaw !== lookupDocId) {
        regDoc = await getFirestoreDocument(
          'registrations',
          registrationIdRaw.toUpperCase(),
          adminBearerToken
        );
      }
      if (!regDoc) {
        sendJson(res, 404, {
          success: false,
          eventId,
          error: `Registration record ${registrationIdRaw || lookupDocId} was not found.`,
        });
        return;
      }

      const canonicalRegId = String(regDoc.registrationId || regDoc.id || registrationIdRaw || lookupDocId)
        .trim()
        .toUpperCase();
      expectedEventId =
        eventType === 'registration_received'
          ? `EMAIL_REG_RECEIVED_${canonicalRegId}`
          : `EMAIL_REG_CONFIRMED_${canonicalRegId}`;

      if (eventId !== expectedEventId) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'eventId does not match the canonical registration email event identifier.',
        });
        return;
      }

      if (eventType === 'registration_confirmation') {
        const paymentStatus = String(regDoc.paymentStatus || '').trim();
        const registrationStatus = String(regDoc.registrationStatus || '').trim();
        if (paymentStatus !== 'Verified' || registrationStatus !== 'Approved') {
          sendJson(res, 409, {
            success: false,
            eventId,
            error:
              'Registration confirmation email cannot be sent before payment verification and registration approval.',
          });
          return;
        }
        if (!validatedAttachment) {
          sendJson(res, 400, {
            success: false,
            eventId,
            error: 'Registration confirmation email requires the official Registration Receipt PDF attachment.',
          });
          return;
        }
      }

      recipient = extractRecipientForRegistration(regDoc);
      builtEmail =
        eventType === 'registration_received'
          ? buildRegistrationReceivedEmail(regDoc)
          : buildRegistrationConfirmedEmail(regDoc);
    } else {
      const abstractIdRaw =
        typeof body.abstractId === 'string' ? body.abstractId.trim() : '';
      if (!abstractIdRaw || !VALID_ID_REGEX.test(abstractIdRaw)) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'Valid abstractId is required.',
        });
        return;
      }

      let absDoc = await getFirestoreDocument('abstractSubmissions', abstractIdRaw, adminBearerToken);
      if (!absDoc && abstractIdRaw !== abstractIdRaw.toUpperCase()) {
        absDoc = await getFirestoreDocument(
          'abstractSubmissions',
          abstractIdRaw.toUpperCase(),
          adminBearerToken
        );
      }
      if (!absDoc) {
        sendJson(res, 404, {
          success: false,
          eventId,
          error: `Abstract record ${abstractIdRaw} was not found.`,
        });
        return;
      }

      const canonicalAbsId = String(absDoc.id || abstractIdRaw).trim().toUpperCase();
      expectedEventId =
        eventType === 'abstract_confirmation'
          ? `EMAIL_ABS_SUBMITTED_${canonicalAbsId}`
          : `EMAIL_ABS_ACCEPTED_${canonicalAbsId}`;

      if (eventId !== expectedEventId) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'eventId does not match the canonical abstract email event identifier.',
        });
        return;
      }

      if (eventType === 'abstract_acceptance') {
        const absStatus = String(absDoc.status || '').trim();
        if (absStatus !== 'Accepted') {
          sendJson(res, 409, {
            success: false,
            eventId,
            error: 'Abstract acceptance email can only be sent when abstract status is Accepted.',
          });
          return;
        }
      }

      recipient = extractRecipientForAbstract(absDoc);
      builtEmail =
        eventType === 'abstract_confirmation'
          ? buildAbstractSubmittedEmail(absDoc)
          : buildAbstractAcceptedEmail(absDoc);
    }
  } catch (err) {
    console.error('[api/email/send] Firestore verification error:', sanitizeErrorMessage(err, 'Lookup failed'));
    sendJson(res, 503, {
      success: false,
      eventId,
      error: 'Unable to verify conference record state from database.',
    });
    return;
  }

  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    sendJson(res, 400, {
      success: false,
      eventId,
      error: 'Record does not contain a valid recipient email address.',
    });
    return;
  }

  // Admin-level Firestore emailLog duplicate protection check
  if (adminBearerToken) {
    try {
      const existingLog = await getFirestoreDocument('emailLogs', eventId, adminBearerToken);
      if (existingLog && existingLog.status === 'Sent') {
        sendJson(res, 200, {
          success: true,
          eventId,
          eventType,
          recipient,
          subject: builtEmail.subject,
          status: 'Sent',
          sentAt: existingLog.sentAt || existingLog.lastAttemptedAt || new Date().toISOString(),
          alreadySent: true,
          duplicatePrevented: true,
          service: 'SRMCOP Conference Email Service',
        });
        return;
      }
    } catch {
      // Proceed cleanly to in-memory + Apps Script deduplication if log read was unavailable
    }
  }

  pruneCompletedCache();
  const cachedSent = completedDispatches.get(eventId);
  if (cachedSent) {
    sendJson(res, 200, {
      success: true,
      eventId,
      eventType,
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

  // Coalesce simultaneous in-flight requests for the exact same eventId
  let pendingPromise = inFlightDispatches.get(eventId);
  if (!pendingPromise) {
    pendingPromise = dispatchToAppsScript({
      appsScriptUrl: appsScriptConfig.url,
      appsScriptSecret: appsScriptConfig.secret,
      eventId,
      eventType,
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
