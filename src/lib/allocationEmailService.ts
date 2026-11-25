import { auth } from './firebase';
import type { AbstractRecord, RegistrationRecord } from './managementService';
import { generatePresentationAllocationPDFBase64 } from './allocationPdf';
import {
  isAbstractOfficiallyAllocated,
  updateAllocationEmailTracking,
} from './presentationAllocationService';

export interface AllocationEmailResult {
  success: boolean;
  eventId: string;
  sentAt: string | null;
  duplicatePrevented?: boolean;
  error?: string | null;
}

const inFlightClientDispatches = new Map<string, Promise<AllocationEmailResult>>();

function sanitizeClientError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
  const cleaned = raw
    .replace(/https?:\/\/script\.google\.com\/[^\s"']+/gi, '[email-endpoint]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > 350 ? `${cleaned.slice(0, 347)}...` : cleaned;
}

export function buildAllocationEmailEventId(
  allocationId: string,
  attemptNumber = 1
): string {
  const cleanAlloc = allocationId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  return attemptNumber <= 1
    ? `EMAIL_PRES_ALLOC_${cleanAlloc}_1`
    : `EMAIL_PRES_ALLOC_${cleanAlloc}_R${attemptNumber}`;
}

/**
 * Independent Official Presentation Allocation Confirmation Email Workflow.
 * - Requires persisted Active allocation and Presentation Allocation ID before PDF/email execution.
 * - Guards against concurrent duplicate clicks via in-flight promise map.
 * - Generates the dedicated Presentation Allocation Confirmation PDF and attaches it.
 * - Updates allocationEmailStatus / allocationEmailSentAt / allocationHistory email state.
 */
export async function sendOfficialPresentationAllocationEmail(params: {
  abstract: AbstractRecord;
  registration?: RegistrationRecord;
  isResend?: boolean;
}): Promise<AllocationEmailResult> {
  const { abstract, registration, isResend = false } = params;

  if (!isAbstractOfficiallyAllocated(abstract)) {
    return {
      success: false,
      eventId: '',
      sentAt: null,
      error:
        'Cannot send allocation confirmation email because no Active official allocation is saved.',
    };
  }

  const allocationId = (abstract.presentationAllocationId || '').trim();
  const dedupeKey = `${abstract.id}:${allocationId}:${isResend ? 'resend' : 'initial'}`;
  const existingFlight = inFlightClientDispatches.get(dedupeKey);
  if (existingFlight) {
    return existingFlight;
  }

  const runPromise = (async (): Promise<AllocationEmailResult> => {
    const baseAttempts =
      typeof abstract.allocationEmailAttempts === 'number' &&
      abstract.allocationEmailAttempts >= 1
        ? abstract.allocationEmailAttempts
        : 1;
    const attemptNumber = isResend ? baseAttempts + 1 : 1;
    const eventId = buildAllocationEmailEventId(allocationId, attemptNumber);

    if (!isResend && abstract.allocationEmailStatus === 'Sent') {
      return {
        success: true,
        eventId,
        sentAt: abstract.allocationEmailSentAt || null,
        duplicatePrevented: true,
      };
    }

    try {
      if (!auth.currentUser) {
        throw new Error('Organising Secretary authentication session is required.');
      }

      if (isResend) {
        await updateAllocationEmailTracking({
          abstractId: abstract.id,
          allocationId,
          status: 'Pending',
          error: null,
          incrementAttempt: true,
          currentAttempts: abstract.allocationEmailAttempts || 0,
          existingHistory: abstract.allocationHistory,
        });
      }

      const attachment = generatePresentationAllocationPDFBase64(abstract, registration);
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch('/api/email/allocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          eventId,
          abstractId: abstract.id,
          allocationId,
          isResend,
          attachment,
        }),
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
          // Non-JSON upstream error
        }
      }

      if (!response.ok || data.success !== true) {
        const errMsg = sanitizeClientError(
          data.error || data.message || `Email service returned HTTP ${response.status}`,
          'Failed to send Official Presentation Allocation Confirmation email.'
        );
        await updateAllocationEmailTracking({
          abstractId: abstract.id,
          allocationId,
          status: 'Failed',
          error: errMsg,
          existingHistory: abstract.allocationHistory,
        });
        return {
          success: false,
          eventId,
          sentAt: null,
          error: errMsg,
        };
      }

      const sentAt =
        typeof data.sentAt === 'string' && data.sentAt.trim()
          ? data.sentAt.trim()
          : new Date().toISOString();

      await updateAllocationEmailTracking({
        abstractId: abstract.id,
        allocationId,
        status: 'Sent',
        sentAt,
        error: null,
        existingHistory: abstract.allocationHistory,
      });

      return {
        success: true,
        eventId,
        sentAt,
        duplicatePrevented: data.duplicatePrevented === true || data.alreadySent === true,
      };
    } catch (err) {
      const errMsg = sanitizeClientError(
        err,
        'Unexpected error sending Official Presentation Allocation Confirmation email.'
      );
      try {
        await updateAllocationEmailTracking({
          abstractId: abstract.id,
          allocationId,
          status: 'Failed',
          error: errMsg,
          existingHistory: abstract.allocationHistory,
        });
      } catch {
        // Preserve original error surface
      }
      return {
        success: false,
        eventId,
        sentAt: null,
        error: errMsg,
      };
    }
  })().finally(() => {
    inFlightClientDispatches.delete(dedupeKey);
  });

  inFlightClientDispatches.set(dedupeKey, runPromise);
  return runPromise;
}
