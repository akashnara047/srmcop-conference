import { doc, getDoc, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
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

export type EmailLogStatus = 'Pending' | 'Sent' | 'Failed';

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
  abstract_acceptance: 'Abstract Confirmation',
};

export const EMAIL_EVENT_SUBJECTS: Record<EmailEventType, string> = {
  registration_received: 'SRMCON 2027 – Registration Received',
  registration_confirmation: 'SRMCON 2027 – Registration Confirmed',
  abstract_confirmation: 'SRMCON 2027 – Abstract Submission Acknowledgement',
  abstract_acceptance: 'SRMCON 2027 – Abstract Accepted',
};

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

async function postToEmailSendApi(params: {
  payload: Record<string, unknown>;
  bearerToken?: string;
}): Promise<{
  ok: boolean;
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
  if (att) {
    console.info(
      `[emailService] Sending email with PDF attachment: eventId=${String(
        params.payload.eventId
      )}, eventType=${String(params.payload.eventType)}, filename=${att.filename}, mimeType=${
        att.mimeType
      }, base64Length=${att.base64?.length || 0}`
    );
  }

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
    typeof data.attachmentCount === 'number' ? data.attachmentCount : expectsAttachment ? 1 : 0;

  if (!response.ok || data.success !== true) {
    const fallbackStatusMsg =
      response.status === 404 && !data.error && !data.message
        ? 'Email API route /api/email/send returned HTTP 404 (endpoint not found on server)'
        : `Email API returned HTTP ${response.status}`;
    return {
      ok: false,
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

  if (expectsAttachment && !duplicatePrevented && reportedAttachmentCount === 0) {
    return {
      ok: false,
      sentAt: null,
      cc: null,
      duplicatePrevented: false,
      service: typeof data.service === 'string' ? data.service : null,
      attachmentCount: 0,
      attachmentFilename: null,
      error: 'Email service reported 0 attachments attached for a required PDF email event.',
    };
  }

  return {
    ok: true,
    sentAt: typeof data.sentAt === 'string' ? data.sentAt : new Date().toISOString(),
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
  hasAttachment: boolean;
  attachmentName?: string | null;
  triggeredBy: string;
  recordType?: 'live' | 'test';
}): Promise<{ proceed: boolean; alreadySent: boolean; sentAt: string | null }> {
  const logRef = doc(db, 'emailLogs', params.eventId);
  const now = new Date().toISOString();

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
      subject: EMAIL_EVENT_SUBJECTS[params.eventType],
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
      status: params.ok ? 'Sent' : 'Failed',
      lastAttemptedAt: now,
      sentAt: params.ok ? params.sentAt || now : null,
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
    let createdPendingLog = false;

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
      createdPendingLog = true;
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
        eventType: 'registration_received',
        status: apiResult.ok ? 'Sent' : 'Failed',
        cc: apiResult.cc,
        duplicatePrevented: apiResult.duplicatePrevented,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
      };
    } catch (err) {
      const msg = sanitizeClientError(err, 'Unable to send registration received email.');
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
        status: apiResult.ok ? 'Sent' : 'Failed',
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
        status: apiResult.ok ? 'Sent' : 'Failed',
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

// ============================================================================
// EVENT 4 – ABSTRACT ACCEPTANCE CONFIRMATION (Strictly Accepted Status Only)
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

  return coalesceClientDispatch(eventId, async () => {
    let hasReservedLog = false;
    try {
      const bearerToken = await getRequiredAdminIdToken();
      const recipient = (abstract.presentingAuthor?.email || registration?.email || '').trim();
      const attachment = generateAcceptanceLetterPDFBase64(abstract, registration);

      const reservation = await reserveAdminEmailLogAttempt({
        eventId,
        eventType: 'abstract_acceptance',
        referenceId: absId,
        registrationId: abstract.registrationId || null,
        regDocId: abstract.registrationDocId || registration?.id || null,
        abstractId: absId,
        recipient,
        hasAttachment: true,
        attachmentName: attachment.filename,
        triggeredBy: auth.currentUser?.email || 'org.secy.cp@srmist.edu.in',
        recordType: abstract.recordType || 'live',
      });

      if (!reservation.proceed) {
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

      return {
        success: apiResult.ok,
        eventId,
        eventType: 'abstract_acceptance',
        status: apiResult.ok ? 'Sent' : 'Failed',
        cc: apiResult.cc,
        duplicatePrevented: apiResult.duplicatePrevented,
        sentAt: apiResult.sentAt,
        error: apiResult.error,
      };
    } catch (err) {
      const msg = sanitizeClientError(err, 'Unable to send abstract acceptance email.');
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
  const { eventId, eventType, registration, abstract } = params;

  return coalesceClientDispatch(`retry:${eventId}`, async () => {
    let hasReservedLog = false;
    try {
      const bearerToken = await getRequiredAdminIdToken();

      // Check existing log doc first if present
      const existingSnap = await getDoc(doc(db, 'emailLogs', eventId));
      const existingLog = existingSnap.exists() ? (existingSnap.data() as Partial<EmailLogRecord>) : null;
      if (existingLog && (existingLog.status === 'Sent' || (existingLog.status as string) === 'Delivered')) {
        return {
          success: true,
          eventId,
          eventType,
          status: 'Sent',
          duplicatePrevented: true,
          sentAt: existingLog.sentAt || existingLog.lastAttemptedAt || null,
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
        if (!abstract || abstract.status !== 'Accepted') {
          return {
            success: false,
            eventId,
            eventType,
            status: 'Failed',
            error: 'Abstract acceptance email can only be sent when abstract status is Accepted.',
          };
        }
      }

      let attachment: { filename: string; mimeType: 'application/pdf'; base64: string } | undefined;
      if (eventType === 'registration_confirmation' && registration) {
        attachment = generateRegistrationReceiptPDFBase64(registration);
      } else if (eventType === 'abstract_confirmation' && abstract) {
        attachment = generateSubmissionReceiptPDFBase64(abstract, registration);
      } else if (eventType === 'abstract_acceptance' && abstract) {
        attachment = generateAcceptanceLetterPDFBase64(abstract, registration);
      }

      const regKey = registration
        ? (registration.registrationId || registration.id || '').trim().toUpperCase()
        : (existingLog?.registrationId || '').trim().toUpperCase();
      const regDocId = registration?.id || existingLog?.regDocId || regKey || null;
      const absId = abstract
        ? abstract.id.trim().toUpperCase()
        : (existingLog?.abstractId || '').trim().toUpperCase();

      const recipient =
        (eventType === 'registration_received' || eventType === 'registration_confirmation'
          ? registration?.email
          : abstract?.presentingAuthor?.email) ||
        existingLog?.recipient ||
        '';

      const referenceId =
        eventType === 'registration_received' || eventType === 'registration_confirmation'
          ? regKey
          : absId;

      const reservation = await reserveAdminEmailLogAttempt({
        eventId,
        eventType,
        referenceId,
        registrationId: regKey || null,
        regDocId,
        abstractId: absId || null,
        recipient: recipient.trim(),
        hasAttachment: !!attachment,
        attachmentName: attachment?.filename || null,
        triggeredBy: `admin_retry:${auth.currentUser?.email || 'org.secy.cp@srmist.edu.in'}`,
        recordType: registration?.recordType || abstract?.recordType || existingLog?.recordType || 'live',
      });

      if (!reservation.proceed) {
        return {
          success: reservation.alreadySent,
          eventId,
          eventType,
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

      return {
        success: apiResult.ok,
        eventId,
        eventType,
        status: apiResult.ok ? 'Sent' : 'Failed',
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
      allottedPresentationFormat: 'Oral Presentation',
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
      status: apiResult.ok ? 'Sent' : 'Failed',
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

