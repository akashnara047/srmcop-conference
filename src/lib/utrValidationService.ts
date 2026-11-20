import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { RegistrationRecord } from './managementService';
import {
  PAYMENT_TRANSACTIONS_COLLECTION,
  UTR_AVAILABLE_MESSAGE,
  DUPLICATE_UTR_MESSAGE as UTR_DUPLICATE_MESSAGE,
  CHECKING_UTR_MESSAGE as UTR_CHECKING_MESSAGE,
  normalizeTransactionReference,
  computeTransactionReferenceKey,
  checkTransactionReferenceAvailability as checkUtrAvailabilityUnified,
  DuplicateRecordError,
  type PaymentTransactionLockRecord,
} from './duplicatePreventionService';

export {
  PAYMENT_TRANSACTIONS_COLLECTION,
  UTR_AVAILABLE_MESSAGE,
  UTR_DUPLICATE_MESSAGE,
  UTR_CHECKING_MESSAGE,
  normalizeTransactionReference,
  computeTransactionReferenceKey,
  type PaymentTransactionLockRecord,
};

export type UtrAvailabilityStatus = 'idle' | 'checking' | 'available' | 'duplicate' | 'error';

export interface UtrAvailabilityResult {
  status: UtrAvailabilityStatus;
  normalizedUtr: string;
  utrKey: string;
  message: string;
  conflictingRegistrationId?: string;
}

export interface DuplicateUtrGroup {
  normalizedUtr: string;
  displayUtr: string;
  records: RegistrationRecord[];
}

export interface DuplicateUtrAnalysis {
  groupsByNormalizedUtr: Map<string, DuplicateUtrGroup>;
  duplicateGroups: DuplicateUtrGroup[];
  conflictingRecordIds: Set<string>;
  totalDuplicateGroups: number;
  totalAffectedRecords: number;
}

/**
 * Structured error thrown when atomic Firestore transaction / server validation
 * rejects a duplicate UTR / Payment Transaction ID.
 */
export class DuplicateTransactionReferenceError extends DuplicateRecordError {
  readonly normalizedUtr: string;
  readonly utrKey: string;
  readonly conflictingRegistrationId?: string;

  constructor(params: {
    normalizedUtr: string;
    utrKey: string;
    conflictingRegistrationId?: string;
    message?: string;
  }) {
    super({
      code: 'DUPLICATE_UTR',
      field: 'transactionReference',
      normalizedValue: params.normalizedUtr,
      reservationKey: params.utrKey,
      conflictingRecordId: params.conflictingRegistrationId,
      message: params.message || UTR_DUPLICATE_MESSAGE,
    });
    this.name = 'DuplicateTransactionReferenceError';
    this.normalizedUtr = params.normalizedUtr;
    this.utrKey = params.utrKey;
    this.conflictingRegistrationId = params.conflictingRegistrationId;
  }
}

export function isDuplicateTransactionReferenceError(
  err: unknown
): err is DuplicateTransactionReferenceError {
  return (
    err instanceof DuplicateTransactionReferenceError ||
    (typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: unknown }).code === 'DUPLICATE_UTR')
  );
}

/**
 * Real-time Firestore availability check against /paymentTransactions/{utrKey}.
 * Uses single-document getDoc so no participant PII or collection scan is exposed.
 */
export async function checkTransactionReferenceAvailability(
  rawUtr: string,
  excludeRegistrationId?: string | null
): Promise<UtrAvailabilityResult> {
  const res = await checkUtrAvailabilityUnified(rawUtr, excludeRegistrationId);
  return {
    status: res.status,
    normalizedUtr: res.normalizedValue,
    utrKey: res.reservationKey,
    message: res.message,
    conflictingRegistrationId: res.conflictingRecordId,
  };
}

/**
 * Scans all registrations in memory (across ALL statuses) to identify duplicate UTRs
 * using space-stripped, case-insensitive normalization.
 */
export function analyzeDuplicateTransactionReferences(
  registrations: RegistrationRecord[]
): DuplicateUtrAnalysis {
  const buckets = new Map<string, RegistrationRecord[]>();

  for (const reg of registrations) {
    const normalized = normalizeTransactionReference(
      reg.normalizedTransactionReference || reg.transactionReference
    );
    if (!normalized) continue;
    const existing = buckets.get(normalized);
    if (existing) {
      existing.push(reg);
    } else {
      buckets.set(normalized, [reg]);
    }
  }

  const groupsByNormalizedUtr = new Map<string, DuplicateUtrGroup>();
  const duplicateGroups: DuplicateUtrGroup[] = [];
  const conflictingRecordIds = new Set<string>();

  for (const [normalizedUtr, records] of buckets.entries()) {
    const sortedRecords = [...records].sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );
    const group: DuplicateUtrGroup = {
      normalizedUtr,
      displayUtr: sortedRecords[0]?.transactionReference?.trim() || normalizedUtr,
      records: sortedRecords,
    };
    groupsByNormalizedUtr.set(normalizedUtr, group);

    if (sortedRecords.length > 1) {
      duplicateGroups.push(group);
      for (const r of sortedRecords) {
        conflictingRecordIds.add(r.id);
      }
    }
  }

  duplicateGroups.sort((a, b) => b.records.length - a.records.length);

  return {
    groupsByNormalizedUtr,
    duplicateGroups,
    conflictingRecordIds,
    totalDuplicateGroups: duplicateGroups.length,
    totalAffectedRecords: conflictingRecordIds.size,
  };
}

/**
 * Returns all OTHER registration records sharing the same normalized UTR as `target`.
 */
export function getConflictingRegistrationsForRecord(
  target: RegistrationRecord,
  allRegistrations: RegistrationRecord[],
  precomputed?: DuplicateUtrAnalysis
): RegistrationRecord[] {
  const normalized = normalizeTransactionReference(
    target.normalizedTransactionReference || target.transactionReference
  );
  if (!normalized) return [];

  const group = precomputed
    ? precomputed.groupsByNormalizedUtr.get(normalized)
    : analyzeDuplicateTransactionReferences(allRegistrations).groupsByNormalizedUtr.get(normalized);

  if (!group || group.records.length <= 1) return [];
  return group.records.filter((r) => r.id !== target.id);
}

/**
 * Idempotent, non-destructive admin backfill for /paymentTransactions/{utrKey}.
 */
export async function syncMissingPaymentTransactionLocks(
  registrations: RegistrationRecord[]
): Promise<{ created: number; existing: number; skipped: number }> {
  let created = 0;
  let existing = 0;
  let skipped = 0;

  const sorted = [...registrations].sort((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || '')
  );

  for (const reg of sorted) {
    const normalized = normalizeTransactionReference(
      reg.normalizedTransactionReference || reg.transactionReference
    );
    if (!normalized) {
      skipped += 1;
      continue;
    }

    const utrKey = await computeTransactionReferenceKey(normalized);
    if (!utrKey) {
      skipped += 1;
      continue;
    }

    try {
      const lockRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, utrKey);
      const snap = await getDoc(lockRef);
      if (snap.exists()) {
        existing += 1;
        continue;
      }

      const timestamp = reg.createdAt || new Date().toISOString();
      const lockDoc: PaymentTransactionLockRecord = {
        id: utrKey,
        normalizedTransactionReference: normalized,
        registrationId: reg.id || reg.registrationId || 'LEGACY',
        createdAt: timestamp,
        updatedAt: reg.updatedAt || timestamp,
      };
      await setDoc(lockRef, lockDoc);
      created += 1;
    } catch (err) {
      console.warn(
        `[utrValidationService] Non-fatal lock backfill note for ${reg.id}:`,
        err
      );
      skipped += 1;
    }
  }

  return { created, existing, skipped };
}
