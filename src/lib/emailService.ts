import { deleteDoc, doc, getDoc, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  generateAcceptanceLetterPDFBase64,
  generateRegistrationReceiptPDFBase64,
  generateSubmissionReceiptPDFBase64,
  type AbstractRecord,
  type RegistrationRecord,
} from './managementService';

export type EmailEventType =
  | 'registration_received'
  | 'registration_confirmation'
  | 'abstract_confirmation'
  | 'abstract_acceptance';

export type EmailLogStatus = 'Pending' | 'Sent' | 'Already Sent' | 'Failed';

export interface EmailLogRecord {
  id: string;
  eventId: string;
  type: EmailEventType;
  referenceId: string;
  registrationId?: string | null;
  regDocId?: string | null;
  abstractId?: string | null;
  recipient: string;
  subject: string;
  status: EmailLogStatus;
  attemptCount: number;
  createdAt: string;
  lastAttemptedAt: string;
  sentAt: string | null;
  error: string | null;
  hasAttachment: boolean;
  attachmentName?: string | null;
  triggeredBy: string;
  duplicatePrevented?: boolean;
  providerService?: string | null;
  recordType?: 'live' | 'test';
  timestamp: string;
  updatedAt?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  eventId: string;
  eventType: EmailEventType;
  status: EmailLogStatus;
  cc?: string | null;
  duplicatePrevented?: boolean;
  sentAt?: string | null;
  error?: string | null;
}

export const OFFICIAL_ORGANIZER_EMAILS = [
  'dean.pharmacy.ktr@srmist.edu.in',
  'org.secy.cp@srmist.edu.in',
];

export const EMAIL_EVENT_LABELS: Record<EmailEventType, string> = {
  registration_received: 'Registration Done',
  registration_confirmation: 'Registration Confirmation',
  abstract_confirmation: 'Abstract Submission',
  abstract_acceptance: 'Abstract Acceptance & Allocation',
};

export const EMAIL_EVENT_SUBJECTS: Record<EmailEventType, string> = {
  registration_received: 'SRMCON 2027 – Registration Received',
  registration_confirmation: 'SRMCON 2027 – Registration Confirmed',
  abstract_confirmation: 'SRMCON 2027 – Abstract Submission Acknowledgement',
  abstract_acceptance: 'SRMCON 2027 – Abstract Accepted | Presentation Allocation Confirmed',
};

export function getAbstractAcceptedEmailSubject(presentationId?: string | null): string {
  const cleanId = (presentationId || '').trim();
  return cleanId
    ? `SRMCON 2027 – Abstract Accepted | Presentation Allocation Confirmed | ${cleanId}`
    : EMAIL_EVENT_SUBJECTS.abstract_acceptance;
}

const inFlightClientDispatches = new Map<string, Promise<EmailDispatchResult>>();
const STALE_PENDING_LOCK_MS = 25 * 1000;

export function getRegistrationReceivedEventId(regIdOrDocId: string): string {
  return `EMAIL_REG_RECEIVED_${regIdOrDocId.trim().toUpperCase()}`;
}

export function getRegistrationConfirmedEventId(regIdOrDocId: string): string {
  return `EMAIL_REG_CONFIRMED_${regIdOrDocId.trim().toUpperCase()}`;
}

export function getAbstractSubmittedEventId(abstractId: string): string {
  return `EMAIL_ABS_SUBMITTED_${abstractId.trim().toUpperCase()}`;
}

export function getAbstractAcceptedEventId(abstractId: string): string {
  return `EMAIL_ABS_ACCEPTED_${abstractId.trim().toUpperCase()}`;
}

function sanitizeClientError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
  const cleaned = raw
    .replace(/https?:\/\/script\.google\.com\/[^\s"']+/gi, '[email-endpoint]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > 350 ? `${cleaned.slice(0, 347)}...` : cleaned;
}

function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: unknown }).code || '').toLowerCase();
  const message = String((err as { message?: unknown }).message || '').toLowerCase();
  return code === 'permission-denied' || message.includes('missing or insufficient permissions');
}

async function getOptionalIdToken(): Promise<string | undefined> {
  try {
    if (!auth.currentUser) return undefined;
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
}

async function getRequiredAdminIdToken(): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Organising Secretary sign-in session is required to send this notification.');
  }
  return await auth.currentUser.getIdToken();
}

export interface EmailHealthResult {
  ok: boolean;
  service: string | null;
  remainingQuota: number | null;
  version?: string | null;
  attachmentSupported?: boolean;
  presentationAllocationSupported?: boolean;
  supportedActions?: string[];
  defaultCcEmail?: string | null;
  telemetryComplete?: boolean;
  telemetryWarnings?: string[];
  error: string | null;
}

export async function checkEmailServiceHealth(): Promise<EmailHealthResult> {
  try {
    const response = await fetch('/api/email/health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({}),
    });

    const rawText = await response.text().catch(() => '');
    let data: Record<string, unknown> = {};
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          data = parsed as Record<string, unknown>;
        }
      } catch {
        // Non-JSON response
      }
    }

    if (!response.ok || data.success !== true) {
      const fallbackMsg =
        response.status === 404 && !data.error && !data.message
          ? 'Email health API route /api/email/health returned HTTP 404 (endpoint unavailable).'
          : `Email health check returned HTTP ${response.status}`;
      return {
        ok: false,
        service: typeof data.service === 'string' ? data.service : null,
        remainingQuota: null,
        error: sanitizeClientError(data.error || data.message || fallbackMsg, fallbackMsg),
      };
    }

    return {
      ok: true,
      service: typeof data.service === 'string' ? data.service : 'SRMCOP Conference Email Service',
      remainingQuota:
        typeof data.remainingQuota === 'number' ? data.remainingQuota : null,
      version: typeof data.version === 'string' ? data.version : null,
      ...(typeof data.attachmentSupported === 'boolean'
        ? { attachmentSupported: data.attachmentSupported }
        : {}),
      ...(typeof data.presentationAllocationSupported === 'boolean'
        ? { presentationAllocationSupported: data.presentationAllocationSupported }
        : {}),
      ...(Array.isArray(data.supportedActions)
        ? {
            supportedActions: data.supportedActions.filter(
              (item): item is string => typeof item === 'string' && item.trim().length > 0
            ),
          }
        : {}),
      defaultCcEmail: typeof data.defaultCcEmail === 'string' ? data.defaultCcEmail : null,
      ...(typeof data.telemetryComplete === 'boolean'
        ? { telemetryComplete: data.telemetryComplete }
        : {}),
      ...(Array.isArray(data.telemetryWarnings)
        ? {
            telemetryWarnings: data.telemetryWarnings.filter(
              (item): item is string => typeof item === 'string'
            ),
          }
        : {}),
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      service: null,
      remainingQuota: null,
      error: sanitizeClientError(err, 'Unable to reach email health service.'),
    };
  }
}

function estimateBase64DecodedBytes(base64?: string): number {
  if (!base64) return 0;
  const clean = base64.replace(/\s+/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

async function postToEmailSendApi(params: {
  payload: Record<string, unknown>;
  bearerToken?: string;
}): Promise<{
  ok: boolean;
  status: EmailLogStatus;
  sentAt: string | null;
  cc: string | null;
  duplicatePrevented: boolean;
  service: string | null;
  attachmentCount: number;
  attachmentFilename: string | null;
  error: string | null;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (params.bearerToken) {
    headers.Authorization = `Bearer ${params.bearerToken}`;
  }

  const att = params.payload.attachment as
    | { filename?: string; mimeType?: string; base64?: string }
    | undefined;
  const expectsAttachment = Boolean(att);
  const attBase64Len = att?.base64?.length || 0;
  const attDecodedBytes = estimateBase64DecodedBytes(att?.base64);

  console.info(
    `[emailService][Stage 2/3] Sending request to /api/email/send: eventId=${String(
      params.payload.eventId
    )}, eventType=${String(params.payload.eventType)}, hasAttachment=${expectsAttachment}, filename=${
      att?.filename || 'none'
    }, mimeType=${att?.mimeType || 'none'}, base64Length=${attBase64Len}, decodedBytes=${attDecodedBytes}, attachmentCount=${
      expectsAttachment ? 1 : 0
    }`
  );

  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(params.payload),
  });

  const rawText = await response.text().catch(() => '');
  let data: Record<string, unknown> = {};
  if (rawText) {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // Non-JSON response (e.g., server/router 404 HTML)
    }
  }

  const duplicatePrevented = data.duplicatePrevented === true || data.alreadySent === true;
  const reportedAttachmentCount =
    typeof data.attachmentCount === 'number' ? data.attachmentCount : 0;
  const confirmedBlobCreated = data.blobCreated === true;
  const confirmedAttachmentSent = data.attachmentSent === true;

  if (!response.ok || data.success !== true) {
    const fallbackStatusMsg =
      response.status === 404 && !data.error && !data.message
        ? 'Email API route /api/email/send returned HTTP 404 (endpoint not found on server)'
        : `Email API returned HTTP ${response.status}`;
    return {
      ok: false,
      status: 'Failed',
      sentAt: null,
      cc: null,
      duplicatePrevented: false,
      service: typeof data.service === 'string' ? data.service : null,
      attachmentCount: 0,
      attachmentFilename: null,
      error: sanitizeClientError(
        data.error || data.message || fallbackStatusMsg,
        'Email notification delivery failed.'
      ),
    };
  }

  // Do not treat HTTP 200 alone as proof of PDF attachment delivery
  if (
    expectsAttachment &&
    !duplicatePrevented &&
    (reportedAttachmentCount < 1 || !confirmedBlobCreated || !confirmedAttachmentSent)
  ) {
    return {
      ok: false,
      status: 'Failed',
      sentAt: null,
      cc: null,
      duplicatePrevented: false,
      service: typeof data.service === 'string' ? data.service : null,
      attachmentCount: reportedAttachmentCount,
      attachmentFilename: null,
      error: `Required PDF attachment was not confirmed by email service (attachmentCount=${reportedAttachmentCount}, blobCreated=${String(
        data.blobCreated ?? 'missing'
      )}). Ensure the updated Apps Script and Vercel API are deployed.`,
    };
  }

  return {
    ok: true,
    status: duplicatePrevented ? 'Already Sent' : 'Sent',
    sentAt: typeof data.sentAt === 'string' ? data.sentAt : null,
    cc: typeof data.cc === 'string' && data.cc.trim() ? data.cc.trim() : null,
    duplicatePrevented,
    service: typeof data.service === 'string' ? data.service : 'SRMCOP Conference Email Service',
    attachmentCount: reportedAttachmentCount,
    attachmentFilename:
      typeof data.attachmentFilename === 'string'
        ? data.attachmentFilename
        : att?.filename || null,
    error: null,
  };
}

function coalesceClientDispatch(
  eventId: string,
  runner: () => Promise<EmailDispatchResult>
): Promise<EmailDispatchResult> {
  const existing = inFlightClientDispatches.get(eventId);
  if (existing) {
    return existing;
  }

  const promise = runner().finally(() => {
    inFlightClientDispatches.delete(eventId);
  });
  inFlightClientDispatches.set(eventId, promise);
  return promise;
}

async function reserveAdminEmailLogAttempt(params: {
  eventId: string;
  eventType: EmailEventType;
  referenceId: string;
  registrationId?: string | null;
  regDocId?: string | null;
  abstractId?: string | null;
  recipient: string;
  subjectOverride?: string;
  hasAttachment: boolean;
  attachmentName?: string | null;
  triggeredBy: string;
  recordType?: 'live' | 'test';
}): Promise<{ proceed: boolean; alreadySent: boolean; sentAt: string | null }> {
  const logRef = doc(db, 'emailLogs', params.eventId);
  const now = new Date().toISOString();
  const resolvedSubject = (params.subjectOverride || EMAIL_EVENT_SUBJECTS[params.eventType]).trim();

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(logRef);
    if (snap.exists()) {
      const existing = snap.data() as Partial<EmailLogRecord>;
      if (existing.status === 'Sent' || (existing.status as string) === 'Delivered') {
        return {
          proceed: false,
          alreadySent: true,
          sentAt: existing.sentAt || existing.lastAttemptedAt || now,
        };
      }

      const lastAttemptMs = existing.lastAttemptedAt ? Date.parse(existing.lastAttemptedAt) : 0;
      if (
        existing.status === 'Pending' &&
        lastAttemptMs > 0 &&
        Date.now() - lastAttemptMs < STALE_PENDING_LOCK_MS
      ) {
        return {
          proceed: false,
          alreadySent: false,
          sentAt: null,
        };
      }

      transaction.update(logRef, {
        recipient: params.recipient,
        subject: resolvedSubject,
        status: 'Pending',
        attemptCount: (typeof existing.attemptCount === 'number' ? existing.attemptCount : 1) + 1,
        lastAttemptedAt: now,
        error: null,
        hasAttachment: params.hasAttachment,
        attachmentName: params.attachmentName || existing.attachmentName || null,
        triggeredBy: params.triggeredBy,
        timestamp: now,
        updatedAt: now,
      });

      return { proceed: true, alreadySent: false, sentAt: null };
    }

    const initialDoc: EmailLogRecord = {
      id: params.eventId,
      eventId: params.eventId,
      type: params.eventType,
      referenceId: params.referenceId,
      registrationId: params.registrationId || null,
      regDocId: params.regDocId || null,
      abstractId: params.abstractId || null,
      recipient: params.recipient,
      subject: resolvedSubject,
      status: 'Pending',
      attemptCount: 1,
      createdAt: now,
      lastAttemptedAt: now,
      sentAt: null,
      error: null,
      hasAttachment: params.hasAttachment,
      attachmentName: params.attachmentName || null,
      triggeredBy: params.triggeredBy,
      duplicatePrevented: false,
      providerService: 'SRMCOP Conference Email Service',
      recordType: params.recordType || 'live',
      timestamp: now,
      updatedAt: now,
    };

    transaction.set(logRef, initialDoc);
    return { proceed: true, alreadySent: false, sentAt: null };
  });
}

async function finalizeEmailLogDoc(params: {
  eventId: string;
  ok: boolean;
  sentAt: string | null;
  error: string | null;
  duplicatePrevented: boolean;
  service: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const logRef = doc(db, 'emailLogs', params.eventId);
  try {
    await updateDoc(logRef, {
      status: params.duplicatePrevented ? 'Already Sent' : params.ok ? 'Sent' : 'Failed',
      lastAttemptedAt: now,
      sentAt: params.ok ? params.sentAt : null,
      error: params.ok ? null : params.error || 'Email delivery failed.',
      duplicatePrevented: params.duplicatePrevented,
      providerService: params.service || 'SRMCOP Conference Email Service',
      timestamp: now,
      updatedAt: now,
    });
  } catch (updateErr) {
    console.warn(`[emailService] Unable to update emailLogs/${params.eventId}:`, updateErr);
  }
}

// ============================================================================
// EVENT 1 – REGISTRATION DONE (Immediate Submission Acknowledgement)
// ============================================================================
export async function triggerRegistrationReceivedEmail(
  reg: RegistrationRecord
): Promise<EmailDispatchResult> {
  const regKey = (reg.registrationId || reg.id || '').trim().toUpperCase();
  const regDocId = (reg.id || regKey).trim();
  const eventId = getRegistrationReceivedEventId(regKey);

  return coalesceClientDispatch(eventId, async () => {
    const now = new Date().toISOString();

    try {
      const pendingDoc: EmailLogRecord = {
        id: eventId,
        eventId,
        type: 'registration_received',
        referenceId: regKey,
        registrationId: regKey,
        regDocId,
        abstractId: null,
        recipient: reg.email.trim(),
        subject: EMAIL_EVENT_SUBJECTS.registration_received,
        status: 'Pending',
        attemptCount: 1,
        createdAt: now,
        lastAttemptedAt: now,
        sentAt: null,
        error: null,
        hasAttachment: false,
        attachmentName: null,
        triggeredBy: 'participant_registration_submission',
        duplicatePrevented: false,
        providerService: 'SRMCOP Conference Email Service',
        recordType: reg.recordType || 'live',
        timestamp: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'emailLogs', eventId), pendingDoc);
    } catch (logErr) {
      if (isPermissionDeniedError(logErr)) {
        // Document already exists on server; still invoke /api/email/send so Apps Script
        // idempotency confirms actual delivery state without short-circuiting a prior Failed log.
        console.warn('[emailService] emailLogs doc already exists or create denied for Event 1; deferring idempotency to server.');
      } else {
        console.warn('[emailService] Non-fatal log creation note for Event 1:', logErr);
      }
    }

    try {
      const optionalToken = await getOptionalIdToken();
      const apiResult = await postToEmailSendApi({
        bearerToken: optionalToken,
        payload: {
          eventId,
          eventType: 'registration_received',
          registrationId: regKey,
          regDocId,
        },
      });

      await finalizeEmailLogDoc({
        eventId,
        ok: apiResult.ok,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
        duplicatePrevented: apiResult.duplicatePrevented,
        service: apiResult.service,
      });

      return {
        success: apiResult.ok,
        eventId,
        eventType: 'registration_received',
        status: apiResult.status,
        cc: apiResult.cc,
        duplicatePrevented: apiResult.duplicatePrevented,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
      };
    } catch (err) {
      const msg = sanitizeClientError(err, 'Unable to send registration received email.');
      await finalizeEmailLogDoc({
        eventId,
        ok: false,
        sentAt: null,
        error: msg,
        duplicatePrevented: false,
        service: 'SRMCOP Conference Email Service',
      });
      return {
        success: false,
        eventId,
        eventType: 'registration_received',
        status: 'Failed',
        error: msg,
      };
    }
  });
}

// ============================================================================
// EVENT 2 – REGISTRATION CONFIRMATION (After Payment Verification Only)
// ============================================================================
export async function triggerRegistrationConfirmedEmail(
  reg: RegistrationRecord
): Promise<EmailDispatchResult> {
  const regKey = (reg.registrationId || reg.id || '').trim().toUpperCase();
  const regDocId = (reg.id || regKey).trim();
  const eventId = getRegistrationConfirmedEventId(regKey);

  if (reg.paymentStatus !== 'Verified' || reg.registrationStatus !== 'Approved') {
    return {
      success: false,
      eventId,
      eventType: 'registration_confirmation',
      status: 'Failed',
      error: 'Registration confirmation email requires Verified payment and Approved status.',
    };
  }

  return coalesceClientDispatch(eventId, async () => {
    let hasReservedLog = false;
    try {
      const bearerToken = await getRequiredAdminIdToken();
      const attachment = generateRegistrationReceiptPDFBase64(reg);

      const reservation = await reserveAdminEmailLogAttempt({
        eventId,
        eventType: 'registration_confirmation',
        referenceId: regKey,
        registrationId: regKey,
        regDocId,
        abstractId: null,
        recipient: reg.email.trim(),
        hasAttachment: true,
        attachmentName: attachment.filename,
        triggeredBy: auth.currentUser?.email || 'org.secy.cp@srmist.edu.in',
        recordType: reg.recordType || 'live',
      });

      if (!reservation.proceed) {
        return {
          success: reservation.alreadySent,
          eventId,
          eventType: 'registration_confirmation',
          status: reservation.alreadySent ? 'Sent' : 'Pending',
          duplicatePrevented: true,
          sentAt: reservation.sentAt,
        };
      }
      hasReservedLog = true;

      const apiResult = await postToEmailSendApi({
        bearerToken,
        payload: {
          eventId,
          eventType: 'registration_confirmation',
          registrationId: regKey,
          regDocId,
          attachment,
        },
      });

      await finalizeEmailLogDoc({
        eventId,
        ok: apiResult.ok,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
        duplicatePrevented: apiResult.duplicatePrevented,
        service: apiResult.service,
      });

      return {
        success: apiResult.ok,
        eventId,
        eventType: 'registration_confirmation',
        status: apiResult.status,
        cc: apiResult.cc,
        duplicatePrevented: apiResult.duplicatePrevented,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
      };
    } catch (err) {
      const msg = sanitizeClientError(err, 'Unable to send registration confirmation email.');
      if (hasReservedLog) {
        await finalizeEmailLogDoc({
          eventId,
          ok: false,
          sentAt: null,
          error: msg,
          duplicatePrevented: false,
          service: 'SRMCOP Conference Email Service',
        });
      }
      return {
        success: false,
        eventId,
        eventType: 'registration_confirmation',
        status: 'Failed',
        error: msg,
      };
    }
  });
}

// ============================================================================
// EVENT 3 – ABSTRACT SUBMISSION ACKNOWLEDGEMENT (With Submission PDF)
// ============================================================================
export async function triggerAbstractSubmittedEmail(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): Promise<EmailDispatchResult> {
  const absId = abstract.id.trim().toUpperCase();
  const eventId = getAbstractSubmittedEventId(absId);
  const recipient = (abstract.presentingAuthor?.email || registration?.email || '').trim();

  return coalesceClientDispatch(eventId, async () => {
    const now = new Date().toISOString();
    let createdPendingLog = false;
    const attachment = generateSubmissionReceiptPDFBase64(abstract, registration);

    try {
      const pendingDoc: EmailLogRecord = {
        id: eventId,
        eventId,
        type: 'abstract_confirmation',
        referenceId: absId,
        registrationId: abstract.registrationId || null,
        regDocId: abstract.registrationDocId || registration?.id || null,
        abstractId: absId,
        recipient,
        subject: EMAIL_EVENT_SUBJECTS.abstract_confirmation,
        status: 'Pending',
        attemptCount: 1,
        createdAt: now,
        lastAttemptedAt: now,
        sentAt: null,
        error: null,
        hasAttachment: true,
        attachmentName: attachment.filename,
        triggeredBy: 'participant_abstract_submission',
        duplicatePrevented: false,
        providerService: 'SRMCOP Conference Email Service',
        recordType: abstract.recordType || registration?.recordType || 'live',
        timestamp: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'emailLogs', eventId), pendingDoc);
      createdPendingLog = true;
    } catch (logErr) {
      if (isPermissionDeniedError(logErr)) {
        console.warn('[emailService] emailLogs doc already exists or create denied for Event 3; deferring idempotency to server.');
      } else {
        console.warn('[emailService] Non-fatal log creation note for Event 3:', logErr);
      }
    }

    try {
      const optionalToken = await getOptionalIdToken();
      const apiResult = await postToEmailSendApi({
        bearerToken: optionalToken,
        payload: {
          eventId,
          eventType: 'abstract_confirmation',
          abstractId: absId,
          attachment,
        },
      });

      if (createdPendingLog) {
        await finalizeEmailLogDoc({
          eventId,
          ok: apiResult.ok,
          sentAt: apiResult.sentAt,
          error: apiResult.error,
          duplicatePrevented: apiResult.duplicatePrevented,
          service: apiResult.service,
        });
      }

      return {
        success: apiResult.ok,
        eventId,
        eventType: 'abstract_confirmation',
        status: apiResult.status,
        cc: apiResult.cc,
        duplicatePrevented: apiResult.duplicatePrevented,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
      };
    } catch (err) {
      const msg = sanitizeClientError(err, 'Unable to send abstract submission acknowledgement email.');
      if (createdPendingLog) {
        await finalizeEmailLogDoc({
          eventId,
          ok: false,
          sentAt: null,
          error: msg,
          duplicatePrevented: false,
          service: 'SRMCOP Conference Email Service',
        });
      }
      return {
        success: false,
        eventId,
        eventType: 'abstract_confirmation',
        status: 'Failed',
        error: msg,
      };
    }
  });
}

function resolveCommittedAbstractAllocation(abstract?: AbstractRecord | null): {
  presentationId: string;
  presentationCategory: string;
} {
  const presentationId = (abstract?.presentationAllocationId || '').trim();
  const presentationCategory = (
    abstract?.officialAllocationCategory ||
    abstract?.allottedPresentationFormat ||
    abstract?.finalPresentationFormat ||
    ''
  ).trim();
  return { presentationId, presentationCategory };
}

async function syncAbstractAcceptanceCommunicationState(params: {
  abstract: AbstractRecord;
  pdfStatus?: 'Pending' | 'Generated' | 'Failed';
  pdfFilename?: string | null;
  pdfGeneratedAt?: string | null;
  emailStatus?: 'Pending' | 'Sent' | 'Failed';
  emailSentAt?: string | null;
  emailError?: string | null;
}): Promise<void> {
  const absId = (params.abstract.id || '').trim();
  if (!absId) return;

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    updatedAt: now,
  };

  if (params.pdfStatus !== undefined) {
    patch.acceptancePdfStatus = params.pdfStatus;
  }
  if (params.pdfFilename !== undefined) {
    patch.acceptancePdfFilename = params.pdfFilename;
  }
  if (params.pdfGeneratedAt !== undefined) {
    patch.acceptancePdfGeneratedAt = params.pdfGeneratedAt;
  }
  if (params.emailStatus !== undefined) {
    patch.acceptanceEmailStatus = params.emailStatus;
    patch.allocationEmailStatus = params.emailStatus;
    patch.allocationEmailError = params.emailError ?? null;
    if (params.emailSentAt !== undefined) {
      patch.acceptanceEmailSentAt = params.emailSentAt;
      patch.allocationEmailSentAt = params.emailSentAt;
    } else if (params.emailError !== undefined) {
      patch.acceptanceEmailError = params.emailError;
    }

    const activeAllocId = (params.abstract.presentationAllocationId || '').trim();
    if (activeAllocId && Array.isArray(params.abstract.allocationHistory)) {
      patch.allocationHistory = params.abstract.allocationHistory.map((entry) => {
        if (entry && entry.allocationId === activeAllocId && entry.status === 'Active') {
          return {
            ...entry,
            emailStatus: params.emailStatus!,
            emailSentAt: params.emailSentAt ?? entry.emailSentAt ?? null,
            emailError: params.emailError ?? null,
          };
        }
        return entry;
      });
    }
  } else if (params.emailError !== undefined) {
    patch.acceptanceEmailError = params.emailError;
    patch.allocationEmailError = params.emailError;
  }

  try {
    await updateDoc(doc(db, 'abstractSubmissions', absId), patch);
  } catch (syncErr) {
    console.warn(`[emailService] Unable to sync communication status on abstractSubmissions/${absId}:`, syncErr);
  }
}

// ============================================================================
// EVENT 4 – CONSOLIDATED ABSTRACT ACCEPTANCE & PRESENTATION ALLOCATION
// (Strictly Accepted Status + Committed Presentation ID & Category ONLY)
// ============================================================================
export async function triggerAbstractAcceptedEmail(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): Promise<EmailDispatchResult> {
  const absId = abstract.id.trim().toUpperCase();
  const eventId = getAbstractAcceptedEventId(absId);

  if (abstract.status !== 'Accepted') {
    return {
      success: false,
      eventId,
      eventType: 'abstract_acceptance',
      status: 'Failed',
      error: 'Abstract acceptance email can only be sent when abstract status is Accepted.',
    };
  }

  const { presentationId, presentationCategory } = resolveCommittedAbstractAllocation(abstract);
  if (!presentationId || !presentationCategory) {
    return {
      success: false,
      eventId,
      eventType: 'abstract_acceptance',
      status: 'Failed',
      error:
        'Consolidated acceptance confirmation requires a committed Presentation ID and Presentation Category.',
    };
  }

  return coalesceClientDispatch(eventId, async () => {
    let hasReservedLog = false;
    const recipient = (abstract.presentingAuthor?.email || registration?.email || '').trim();
    const subjectOverride = getAbstractAcceptedEmailSubject(presentationId);

    try {
      const bearerToken = await getRequiredAdminIdToken();

      // Check existing Sent status before generating PDF / creating duplicate work
      const preSnap = await getDoc(doc(db, 'emailLogs', eventId));
      if (preSnap.exists()) {
        const existingPre = preSnap.data() as Partial<EmailLogRecord>;
        if (existingPre.status === 'Sent' || (existingPre.status as string) === 'Delivered') {
          const preSentAt = existingPre.sentAt || existingPre.lastAttemptedAt || new Date().toISOString();
          await syncAbstractAcceptanceCommunicationState({
            abstract,
            pdfStatus: existingPre.hasAttachment ? 'Generated' : abstract.acceptancePdfStatus || 'Generated',
            pdfFilename: existingPre.attachmentName || abstract.acceptancePdfFilename || null,
            emailStatus: 'Sent',
            emailSentAt: preSentAt,
            emailError: null,
          });
          return {
            success: true,
            eventId,
            eventType: 'abstract_acceptance',
            status: 'Sent',
            duplicatePrevented: true,
            sentAt: preSentAt,
          };
        }
      }

      // Generate Consolidated Acceptance & Presentation Allocation PDF from committed record
      let attachment: { filename: string; mimeType: 'application/pdf'; base64: string };
      try {
        attachment = generateAcceptanceLetterPDFBase64(abstract, registration);
      } catch (pdfErr) {
        const pdfErrorMsg = sanitizeClientError(
          pdfErr,
          'Failed to generate consolidated Abstract Acceptance and Presentation Allocation PDF.'
        );
        const reservedFailureLog = await reserveAdminEmailLogAttempt({
          eventId,
          eventType: 'abstract_acceptance',
          referenceId: absId,
          registrationId: abstract.registrationId || null,
          regDocId: abstract.registrationDocId || registration?.id || null,
          abstractId: absId,
          recipient,
          subjectOverride,
          hasAttachment: false,
          attachmentName: null,
          triggeredBy: auth.currentUser?.email || 'org.secy.cp@srmist.edu.in',
          recordType: abstract.recordType || 'live',
        }).catch(() => ({ proceed: false, alreadySent: false, sentAt: null }));

        if (reservedFailureLog.alreadySent) {
          return {
            success: true,
            eventId,
            eventType: 'abstract_acceptance',
            status: 'Sent',
            duplicatePrevented: true,
            sentAt: reservedFailureLog.sentAt,
          };
        }

        if (reservedFailureLog.proceed) {
          await finalizeEmailLogDoc({
            eventId,
            ok: false,
            sentAt: null,
            error: pdfErrorMsg,
            duplicatePrevented: false,
            service: 'SRMCOP Conference Email Service',
          });
        }

        await syncAbstractAcceptanceCommunicationState({
          abstract,
          pdfStatus: 'Failed',
          pdfFilename: null,
          emailStatus: 'Failed',
          emailSentAt: null,
          emailError: pdfErrorMsg,
        });

        return {
          success: false,
          eventId,
          eventType: 'abstract_acceptance',
          status: 'Failed',
          error: pdfErrorMsg,
        };
      }

      const pdfGeneratedAt = new Date().toISOString();
      const reservation = await reserveAdminEmailLogAttempt({
        eventId,
        eventType: 'abstract_acceptance',
        referenceId: absId,
        registrationId: abstract.registrationId || null,
        regDocId: abstract.registrationDocId || registration?.id || null,
        abstractId: absId,
        recipient,
        subjectOverride,
        hasAttachment: true,
        attachmentName: attachment.filename,
        triggeredBy: auth.currentUser?.email || 'org.secy.cp@srmist.edu.in',
        recordType: abstract.recordType || 'live',
      });

      if (!reservation.proceed) {
        if (reservation.alreadySent) {
          await syncAbstractAcceptanceCommunicationState({
            abstract,
            pdfStatus: 'Generated',
            pdfFilename: attachment.filename,
            pdfGeneratedAt,
            emailStatus: 'Sent',
            emailSentAt: reservation.sentAt,
            emailError: null,
          });
        }
        return {
          success: reservation.alreadySent,
          eventId,
          eventType: 'abstract_acceptance',
          status: reservation.alreadySent ? 'Sent' : 'Pending',
          duplicatePrevented: true,
          sentAt: reservation.sentAt,
        };
      }
      hasReservedLog = true;

      await syncAbstractAcceptanceCommunicationState({
        abstract,
        pdfStatus: 'Generated',
        pdfFilename: attachment.filename,
        pdfGeneratedAt,
        emailStatus: 'Pending',
        emailError: null,
      });

      const apiResult = await postToEmailSendApi({
        bearerToken,
        payload: {
          eventId,
          eventType: 'abstract_acceptance',
          abstractId: absId,
          attachment,
        },
      });

      await finalizeEmailLogDoc({
        eventId,
        ok: apiResult.ok,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
        duplicatePrevented: apiResult.duplicatePrevented,
        service: apiResult.service,
      });

      await syncAbstractAcceptanceCommunicationState({
        abstract,
        pdfStatus: 'Generated',
        pdfFilename: attachment.filename,
        pdfGeneratedAt,
        emailStatus: apiResult.ok ? 'Sent' : 'Failed',
        emailSentAt: apiResult.ok ? apiResult.sentAt || new Date().toISOString() : null,
        emailError: apiResult.ok ? null : apiResult.error || 'Email delivery failed.',
      });

      return {
        success: apiResult.ok,
        eventId,
        eventType: 'abstract_acceptance',
        status: apiResult.status,
        cc: apiResult.cc,
        duplicatePrevented: apiResult.duplicatePrevented,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
      };
    } catch (err) {
      const msg = sanitizeClientError(err, 'Unable to send consolidated abstract acceptance email.');
      if (hasReservedLog) {
        await finalizeEmailLogDoc({
          eventId,
          ok: false,
          sentAt: null,
          error: msg,
          duplicatePrevented: false,
          service: 'SRMCOP Conference Email Service',
        });
      }
      await syncAbstractAcceptanceCommunicationState({
        abstract,
        emailStatus: 'Failed',
        emailSentAt: null,
        emailError: msg,
      });
      return {
        success: false,
        eventId,
        eventType: 'abstract_acceptance',
        status: 'Failed',
        error: msg,
      };
    }
  });
}

// ============================================================================
// ADMIN RETRY / MANUAL RESEND FOR FAILED OR MISSING EMAILS
// ============================================================================
export async function retryEmailNotification(params: {
  eventId: string;
  eventType: EmailEventType;
  registration?: RegistrationRecord;
  abstract?: AbstractRecord;
}): Promise<EmailDispatchResult> {
  const { eventId, eventType, registration } = params;

  return coalesceClientDispatch(`retry:${eventId}`, async () => {
    let hasReservedLog = false;
    let resolvedAbstract = params.abstract;
    let attachmentCreated = false;
    let attachmentFilename: string | null = null;
    let pdfGeneratedAt: string | null = null;

    try {
      const bearerToken = await getRequiredAdminIdToken();

      // Check existing log doc first if present
      const existingSnap = await getDoc(doc(db, 'emailLogs', eventId));
      const existingLog = existingSnap.exists() ? (existingSnap.data() as Partial<EmailLogRecord>) : null;
      if (existingLog && (existingLog.status === 'Sent' || (existingLog.status as string) === 'Delivered')) {
        const existingSentAt = existingLog.sentAt || existingLog.lastAttemptedAt || null;
        if (eventType === 'abstract_acceptance' && resolvedAbstract) {
          await syncAbstractAcceptanceCommunicationState({
            abstract: resolvedAbstract,
            pdfStatus: existingLog.hasAttachment ? 'Generated' : resolvedAbstract.acceptancePdfStatus || 'Generated',
            pdfFilename: existingLog.attachmentName || resolvedAbstract.acceptancePdfFilename || null,
            emailStatus: 'Sent',
            emailSentAt: existingSentAt,
            emailError: null,
          });
        }
        return {
          success: true,
          eventId,
          eventType,
          status: 'Sent',
          duplicatePrevented: true,
          sentAt: existingSentAt,
        };
      }

      if (eventType === 'registration_confirmation') {
        if (!registration || registration.paymentStatus !== 'Verified' || registration.registrationStatus !== 'Approved') {
          return {
            success: false,
            eventId,
            eventType,
            status: 'Failed',
            error: 'Registration confirmation email requires Verified payment and Approved status.',
          };
        }
      }

      if (eventType === 'abstract_acceptance') {
        const lookupAbsId = (
          resolvedAbstract?.id ||
          existingLog?.abstractId ||
          existingLog?.referenceId ||
          ''
        ).trim();
        if (lookupAbsId) {
          try {
            const freshAbsSnap = await getDoc(doc(db, 'abstractSubmissions', lookupAbsId));
            if (freshAbsSnap.exists()) {
              resolvedAbstract = {
                id: freshAbsSnap.id,
                ...freshAbsSnap.data(),
              } as AbstractRecord;
            }
          } catch {
            // Fall back cleanly to provided abstract snapshot if direct fetch is unavailable
          }
        }

        if (!resolvedAbstract || resolvedAbstract.status !== 'Accepted') {
          return {
            success: false,
            eventId,
            eventType,
            status: 'Failed',
            error: 'Abstract acceptance email can only be sent when abstract status is Accepted.',
          };
        }

        const { presentationId, presentationCategory } =
          resolveCommittedAbstractAllocation(resolvedAbstract);
        if (!presentationId || !presentationCategory) {
          return {
            success: false,
            eventId,
            eventType,
            status: 'Failed',
            error:
              'Consolidated acceptance email requires a committed Presentation ID and Presentation Category.',
          };
        }
      }

      let attachment: { filename: string; mimeType: 'application/pdf'; base64: string } | undefined;
      try {
        if (eventType === 'registration_confirmation' && registration) {
          attachment = generateRegistrationReceiptPDFBase64(registration);
        } else if (eventType === 'abstract_confirmation' && resolvedAbstract) {
          attachment = generateSubmissionReceiptPDFBase64(resolvedAbstract, registration);
        } else if (eventType === 'abstract_acceptance' && resolvedAbstract) {
          attachment = generateAcceptanceLetterPDFBase64(resolvedAbstract, registration);
          attachmentCreated = true;
          attachmentFilename = attachment.filename;
          pdfGeneratedAt = new Date().toISOString();
        }
      } catch (pdfErr) {
        const pdfErrorMsg = sanitizeClientError(pdfErr, 'PDF generation failed during retry.');
        if (eventType === 'abstract_acceptance' && resolvedAbstract) {
          await syncAbstractAcceptanceCommunicationState({
            abstract: resolvedAbstract,
            pdfStatus: 'Failed',
            pdfFilename: null,
            emailStatus: 'Failed',
            emailSentAt: null,
            emailError: pdfErrorMsg,
          });
        }
        return {
          success: false,
          eventId,
          eventType,
          status: 'Failed',
          error: pdfErrorMsg,
        };
      }

      const regKey = registration
        ? (registration.registrationId || registration.id || '').trim().toUpperCase()
        : (existingLog?.registrationId || '').trim().toUpperCase();
      const regDocId = registration?.id || existingLog?.regDocId || regKey || null;
      const absId = resolvedAbstract
        ? resolvedAbstract.id.trim().toUpperCase()
        : (existingLog?.abstractId || '').trim().toUpperCase();

      const recipient =
        (eventType === 'registration_received' || eventType === 'registration_confirmation'
          ? registration?.email
          : resolvedAbstract?.presentingAuthor?.email) ||
        existingLog?.recipient ||
        '';

      const referenceId =
        eventType === 'registration_received' || eventType === 'registration_confirmation'
          ? regKey
          : absId;

      const subjectOverride =
        eventType === 'abstract_acceptance' && resolvedAbstract
          ? getAbstractAcceptedEmailSubject(resolvedAbstract.presentationAllocationId)
          : undefined;

      const reservation = await reserveAdminEmailLogAttempt({
        eventId,
        eventType,
        referenceId,
        registrationId: regKey || null,
        regDocId,
        abstractId: absId || null,
        recipient: recipient.trim(),
        subjectOverride,
        hasAttachment: !!attachment,
        attachmentName: attachment?.filename || null,
        triggeredBy: `admin_retry:${auth.currentUser?.email || 'org.secy.cp@srmist.edu.in'}`,
        recordType: registration?.recordType || resolvedAbstract?.recordType || existingLog?.recordType || 'live',
      });

      if (!reservation.proceed) {
        if (reservation.alreadySent && eventType === 'abstract_acceptance' && resolvedAbstract) {
          await syncAbstractAcceptanceCommunicationState({
            abstract: resolvedAbstract,
            pdfStatus: 'Generated',
            pdfFilename: attachmentFilename,
            pdfGeneratedAt,
            emailStatus: 'Sent',
            emailSentAt: reservation.sentAt,
            emailError: null,
          });
        }
        return {
          success: reservation.alreadySent,
          eventId,
          eventType,
          status: reservation.alreadySent ? 'Sent' : 'Pending',
          duplicatePrevented: reservation.alreadySent,
          sentAt: reservation.sentAt,
          error: reservation.alreadySent
            ? null
            : 'An email dispatch attempt is currently in progress. Please wait 30 seconds and retry.',
        };
      }
      hasReservedLog = true;

      if (eventType === 'abstract_acceptance' && resolvedAbstract) {
        await syncAbstractAcceptanceCommunicationState({
          abstract: resolvedAbstract,
          pdfStatus: 'Generated',
          pdfFilename: attachmentFilename,
          pdfGeneratedAt,
          emailStatus: 'Pending',
          emailError: null,
        });
      }

      const apiResult = await postToEmailSendApi({
        bearerToken,
        payload: {
          eventId,
          eventType,
          isAdminRetry: true,
          ...(regKey ? { registrationId: regKey } : {}),
          ...(regDocId ? { regDocId } : {}),
          ...(absId ? { abstractId: absId } : {}),
          ...(attachment ? { attachment } : {}),
        },
      });

      await finalizeEmailLogDoc({
        eventId,
        ok: apiResult.ok,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
        duplicatePrevented: apiResult.duplicatePrevented,
        service: apiResult.service,
      });

      if (eventType === 'abstract_acceptance' && resolvedAbstract) {
        await syncAbstractAcceptanceCommunicationState({
          abstract: resolvedAbstract,
          pdfStatus: 'Generated',
          pdfFilename: attachmentFilename,
          pdfGeneratedAt,
          emailStatus: apiResult.ok ? 'Sent' : 'Failed',
          emailSentAt: apiResult.ok ? apiResult.sentAt || new Date().toISOString() : null,
          emailError: apiResult.ok ? null : apiResult.error || 'Email delivery failed.',
        });
      }

      return {
        success: apiResult.ok,
        eventId,
        eventType,
        status: apiResult.status,
        cc: apiResult.cc,
        duplicatePrevented: apiResult.duplicatePrevented,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
      };
    } catch (err) {
      const msg = sanitizeClientError(err, 'Retry dispatch failed.');
      if (hasReservedLog) {
        await finalizeEmailLogDoc({
          eventId,
          ok: false,
          sentAt: null,
          error: msg,
          duplicatePrevented: false,
          service: 'SRMCOP Conference Email Service',
        });
      }
      if (eventType === 'abstract_acceptance' && resolvedAbstract) {
        await syncAbstractAcceptanceCommunicationState({
          abstract: resolvedAbstract,
          ...(attachmentCreated
            ? {
                pdfStatus: 'Generated' as const,
                pdfFilename: attachmentFilename,
                pdfGeneratedAt,
              }
            : {}),
          emailStatus: 'Failed',
          emailSentAt: null,
          emailError: msg,
        });
      }
      return {
        success: false,
        eventId,
        eventType,
        status: 'Failed',
        error: msg,
      };
    }
  });
}

// ============================================================================
// ADMIN-AUTHENTICATED SAFE TEST DISPATCH (No Firestore Records Modified)
// ============================================================================
export async function sendAdminTestEmail(params: {
  eventType: EmailEventType;
  testRecipient?: string;
}): Promise<EmailDispatchResult> {
  const eventId = `EMAIL_TEST_${params.eventType.toUpperCase()}_${Date.now()}`;
  try {
    const bearerToken = await getRequiredAdminIdToken();
    const recipient = (params.testRecipient || auth.currentUser?.email || '').trim().toLowerCase();

    const sampleReg: RegistrationRecord = {
      id: 'AICONDD-TEST',
      registrationId: 'AICONDD-TEST',
      fullName: 'SRMCON Secretariat Diagnostic Test',
      email: recipient,
      mobile: '9876543210',
      institution: 'SRM College of Pharmacy, SRMIST',
      courseOrDesignation: 'Organising Secretariat Test',
      category: 'Faculty / Academician',
      participationMode: 'Offline (On-site)',
      dietaryPreference: 'Vegetarian',
      paymentMode: 'UPI',
      transactionReference: 'DIAGNOSTIC-TEST-UTR',
      paymentAmount: 1500,
      paymentStatus: 'Verified',
      registrationStatus: 'Approved',
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    const sampleAbs: AbstractRecord = {
      id: 'AICONDD-ABS-TEST',
      registrationId: 'AICONDD-TEST',
      title: 'SRMCON 2027 Automated Email & PDF Attachment Diagnostic Verification',
      trackId: 'track-03',
      presentationPreference: 'Oral Presentation',
      officialAllocationCategory: 'Oral Presentation',
      presentationAllocationId: 'AICONDD-OR-2027-TEST',
      allocationStatus: 'Active',
      allottedPresentationFormat: 'Oral Presentation',
      reviewedAt: new Date().toISOString(),
      presentingAuthor: {
        fullName: 'SRMCON Secretariat Diagnostic Test',
        email: recipient,
        designation: 'Organising Secretariat Test',
        affiliation: 'SRM College of Pharmacy, SRMIST',
      },
      coAuthors: [],
      abstractContent: {
        text: 'Diagnostic test verifying end-to-end PDF attachment generation, Vercel serverless dispatch, and Google Apps Script MailApp delivery.',
      },
      keywords: ['SRMCON 2027', 'Diagnostic Verification'],
      status: 'Accepted',
      createdAt: new Date().toISOString(),
    };

    let attachment: { filename: string; mimeType: 'application/pdf'; base64: string } | undefined;
    if (params.eventType === 'registration_confirmation') {
      attachment = generateRegistrationReceiptPDFBase64(sampleReg);
    } else if (params.eventType === 'abstract_confirmation') {
      attachment = generateSubmissionReceiptPDFBase64(sampleAbs, sampleReg);
    } else if (params.eventType === 'abstract_acceptance') {
      attachment = generateAcceptanceLetterPDFBase64(sampleAbs, sampleReg);
    }

    const apiResult = await postToEmailSendApi({
      bearerToken,
      payload: {
        eventId,
        eventType: params.eventType,
        testMode: true,
        ...(recipient ? { testRecipient: recipient } : {}),
        ...(attachment ? { attachment } : {}),
      },
    });

    return {
      success: apiResult.ok,
      eventId,
      eventType: params.eventType,
      status: apiResult.status,
      cc: apiResult.cc,
      duplicatePrevented: apiResult.duplicatePrevented,
      sentAt: apiResult.sentAt,
      error: apiResult.error,
    };
  } catch (err) {
    return {
      success: false,
      eventId,
      eventType: params.eventType,
      status: 'Failed',
      error: sanitizeClientError(err, 'Admin test email dispatch failed.'),
    };
  }
}

const REG_EMAIL_EVENT_PREFIXES = [
  'EMAIL_REG_RECEIVED_',
  'EMAIL_REG_CONFIRMED_',
] as const;

const ABS_EMAIL_EVENT_PREFIXES = [
  'EMAIL_ABS_SUBMITTED_',
  'EMAIL_ABS_ACCEPTED_',
] as const;

function stripEventPrefix(docIdUpper: string, prefixes: readonly string[]): string {
  for (const prefix of prefixes) {
    if (docIdUpper.startsWith(prefix)) {
      return docIdUpper.slice(prefix.length).trim();
    }
  }
  return '';
}

/**
 * Identifies obsolete failed `emailLogs` records whose underlying registration or
 * abstract record no longer exists in Firestore (e.g. historical failed notifications
 * left over from deleted trial runs). Sent logs and logs tied to any existing
 * registration/abstract record are strictly preserved.
 */
export function findOrphanedFailedEmailLogs(params: {
  emailLogs: EmailLogRecord[];
  registrations: RegistrationRecord[];
  abstracts: AbstractRecord[];
}): EmailLogRecord[] {
  const existingRegKeys = new Set<string>();
  for (const reg of params.registrations) {
    if (reg.id) existingRegKeys.add(reg.id.trim().toUpperCase());
    if (reg.registrationId) existingRegKeys.add(reg.registrationId.trim().toUpperCase());
  }

  const existingAbsKeys = new Set<string>();
  for (const abs of params.abstracts) {
    if (abs.id) existingAbsKeys.add(abs.id.trim().toUpperCase());
  }

  const orphaned: EmailLogRecord[] = [];

  for (const log of params.emailLogs) {
    if (log.status !== 'Failed') continue;

    const docIdUpper = (log.eventId || log.id || '').trim().toUpperCase();
    const regKey = (log.registrationId || '').trim().toUpperCase();
    const regDocKey = (log.regDocId || '').trim().toUpperCase();
    const absKey = (log.abstractId || '').trim().toUpperCase();
    const refKey = (log.referenceId || '').trim().toUpperCase();

    const isRegEvent =
      log.type === 'registration_received' ||
      log.type === 'registration_confirmation' ||
      docIdUpper.startsWith('EMAIL_REG_');

    const isAbsEvent =
      log.type === 'abstract_confirmation' ||
      log.type === 'abstract_acceptance' ||
      docIdUpper.startsWith('EMAIL_ABS_');

    if (isRegEvent) {
      const suffix = stripEventPrefix(docIdUpper, REG_EMAIL_EVENT_PREFIXES);
      const candidates = [regKey, regDocKey, refKey, suffix].filter(
        (val) => Boolean(val) && val !== 'AICONDD-TEST'
      );
      if (candidates.length > 0 && candidates.every((key) => !existingRegKeys.has(key))) {
        orphaned.push(log);
      }
      continue;
    }

    if (isAbsEvent) {
      const suffix = stripEventPrefix(docIdUpper, ABS_EMAIL_EVENT_PREFIXES);
      const candidates = [absKey, refKey, suffix].filter(
        (val) => Boolean(val) && val !== 'AICONDD-ABS-TEST'
      );
      if (candidates.length > 0 && candidates.every((key) => !existingAbsKeys.has(key))) {
        orphaned.push(log);
      }
    }
  }

  return orphaned;
}

/**
 * Deletes obsolete orphaned failed email log documents from Firestore `emailLogs`
 * and clears any matching client dispatch state. Requires an authorised Organising
 * Secretary session (`isAdmin()`).
 */
export async function cleanupOrphanedFailedEmailLogs(params: {
  emailLogs: EmailLogRecord[];
  registrations: RegistrationRecord[];
  abstracts: AbstractRecord[];
}): Promise<{ deletedIds: string[]; failedIds: string[] }> {
  if (!auth.currentUser) {
    return { deletedIds: [], failedIds: [] };
  }

  const orphanedLogs = findOrphanedFailedEmailLogs(params);
  if (orphanedLogs.length === 0) {
    return { deletedIds: [], failedIds: [] };
  }

  const deletedIds: string[] = [];
  const failedIds: string[] = [];

  for (const log of orphanedLogs) {
    const docId = (log.id || log.eventId || '').trim();
    if (!docId) continue;

    inFlightClientDispatches.delete(docId);
    inFlightClientDispatches.delete(`retry:${docId}`);

    try {
      await deleteDoc(doc(db, 'emailLogs', docId));
      deletedIds.push(docId);
    } catch (err) {
      console.warn(`[emailService] Failed to delete orphaned email log ${docId}:`, err);
      failedIds.push(docId);
    }
  }

  if (deletedIds.length > 0) {
    console.info(
      `[emailService] Cleaned up ${deletedIds.length} obsolete orphaned failed email log(s): ${deletedIds.join(', ')}`
    );
  }

  return { deletedIds, failedIds };
}


