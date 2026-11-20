import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { RegistrationRecord } from './managementService';

export const UTR_AVAILABLE_MESSAGE = 'Payment transaction ID is available.';
export const UTR_DUPLICATE_MESSAGE =
  'This payment transaction ID has already been submitted. Please verify your transaction details.';
export const UTR_CHECKING_MESSAGE = 'Checking payment transaction ID...';

export const PAYMENT_TRANSACTIONS_COLLECTION = 'paymentTransactions';

export interface PaymentTransactionLockRecord {
  id: string;
  normalizedTransactionReference: string;
  registrationId: string;
  createdAt: string;
  updatedAt: string;
}

export type UtrAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'duplicate'
  | 'error';

export interface UtrAvailabilityResult {
  status: Exclude<UtrAvailabilityStatus, 'checking'>;
  rawUtr: string;
  normalizedUtr: string;
  utrKey: string;
  message: string;
  isOwnRecord?: boolean;
  conflictingRegistrationId?: string;
}

export interface DuplicateUtrGroup {
  normalizedUtr: string;
  displayUtr: string;
  records: RegistrationRecord[];
}

export interface DuplicateUtrAnalysis {
  duplicateGroups: DuplicateUtrGroup[];
  byNormalizedUtr: Map<string, RegistrationRecord[]>;
  conflictingRecordIds: Set<string>;
  totalDuplicateGroups: number;
  totalAffectedRecords: number;
}

export interface UtrLockSyncReport {
  scanned: number;
  created: number;
  alreadyIndexed: number;
  duplicateConflictsSkipped: number;
  errors: number;
}

/**
 * Structured error thrown when a duplicate UTR / Payment Transaction ID is detected
 * during registration submission or rejected-payment resubmission.
 */
export class DuplicateTransactionReferenceError extends Error {
  readonly code = 'DUPLICATE_UTR' as const;
  readonly normalizedUtr: string;
  readonly utrKey: string;
  readonly conflictingRegistrationId?: string;

  constructor(params: {
    normalizedUtr: string;
    utrKey: string;
    conflictingRegistrationId?: string;
    message?: string;
  }) {
    super(params.message || UTR_DUPLICATE_MESSAGE);
    this.name = 'DuplicateTransactionReferenceError';
    this.normalizedUtr = params.normalizedUtr;
    this.utrKey = params.utrKey;
    this.conflictingRegistrationId = params.conflictingRegistrationId;
  }
}

export function isDuplicateTransactionReferenceError(
  err: unknown
): err is DuplicateTransactionReferenceError {
  if (!err || typeof err !== 'object') return false;
  return (
    err instanceof DuplicateTransactionReferenceError ||
    (err as { code?: unknown }).code === 'DUPLICATE_UTR' ||
    (err as { name?: unknown }).name === 'DuplicateTransactionReferenceError'
  );
}

/**
 * Normalizes a UTR / Payment Transaction ID consistently before comparison:
 * - Trims leading and trailing whitespace
 * - Collapses consecutive internal whitespace to a single space
 * - Converts to uppercase for case-insensitive matching
 */
export function normalizeTransactionReference(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Pure TypeScript SHA-256 fallback (FIPS 180-4) used only if Web Crypto
 * `crypto.subtle` is unavailable (e.g. non-secure HTTP context).
 */
function sha256HexFallback(input: string): string {
  const utf8 = new TextEncoder().encode(input);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = utf8.length * 8;
  const paddedLen = Math.ceil((utf8.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(utf8);
  padded[utf8.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Computes a deterministic, Firestore-safe, privacy-preserving lock document ID
 * for a normalized UTR / Payment Transaction ID: `UTR_<64-char-lowercase-sha256>`.
 */
export async function computeTransactionReferenceKey(rawUtr: string): Promise<string> {
  const normalized = normalizeTransactionReference(rawUtr);
  if (!normalized) return '';

  let hexDigest = '';
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.crypto &&
      globalThis.crypto.subtle &&
      typeof globalThis.crypto.subtle.digest === 'function'
    ) {
      const encoded = new TextEncoder().encode(normalized);
      const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      hexDigest = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    hexDigest = '';
  }

  if (!hexDigest) {
    hexDigest = sha256HexFallback(normalized);
  }

  return `UTR_${hexDigest}`;
}

function normalizeRecordIdentifier(id: string | null | undefined): string {
  return typeof id === 'string' ? id.trim().toUpperCase() : '';
}

/**
 * Checks Firestore in real time whether the entered UTR / Payment Transaction ID
 * is already registered in `paymentTransactions/{utrKey}` across ALL registrations
 * regardless of status (Pending Verification, Under Verification, Verified, Approved, Rejected).
 *
 * When `currentRegistrationId` is provided (e.g. a participant editing/resubmitting their
 * own registration), a lock owned by that same registration is NOT flagged as a duplicate.
 */
export async function checkTransactionReferenceAvailability(
  rawUtr: string,
  currentRegistrationId?: string | null
): Promise<UtrAvailabilityResult> {
  const normalizedUtr = normalizeTransactionReference(rawUtr);
  if (!normalizedUtr) {
    return {
      status: 'idle',
      rawUtr,
      normalizedUtr: '',
      utrKey: '',
      message: '',
    };
  }

  const utrKey = await computeTransactionReferenceKey(normalizedUtr);
  const currentIdNorm = normalizeRecordIdentifier(currentRegistrationId);

  try {
    const lockRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, utrKey);
    const snap = await getDoc(lockRef);

    if (!snap.exists()) {
      return {
        status: 'available',
        rawUtr,
        normalizedUtr,
        utrKey,
        message: UTR_AVAILABLE_MESSAGE,
        isOwnRecord: false,
      };
    }

    const data = snap.data() as Partial<PaymentTransactionLockRecord>;
    const ownerRegId = normalizeRecordIdentifier(data.registrationId);

    if (currentIdNorm && ownerRegId && ownerRegId === currentIdNorm) {
      return {
        status: 'available',
        rawUtr,
        normalizedUtr,
        utrKey,
        message: UTR_AVAILABLE_MESSAGE,
        isOwnRecord: true,
      };
    }

    return {
      status: 'duplicate',
      rawUtr,
      normalizedUtr,
      utrKey,
      message: UTR_DUPLICATE_MESSAGE,
      isOwnRecord: false,
      conflictingRegistrationId: data.registrationId || undefined,
    };
  } catch (err) {
    console.error('[utrValidationService] Real-time UTR availability check failed:', err);
    return {
      status: 'error',
      rawUtr,
      normalizedUtr,
      utrKey,
      message:
        'Unable to verify payment transaction ID right now. Please check your connection and try again.',
    };
  }
}

/**
 * Audits the complete registration dataset (regardless of status or active UI filters)
 * to identify every duplicate UTR / Payment Transaction ID group.
 * Never modifies or deletes any existing registration records.
 */
export function analyzeDuplicateTransactionReferences(
  registrations: RegistrationRecord[]
): DuplicateUtrAnalysis {
  const grouped = new Map<string, RegistrationRecord[]>();

  for (const reg of registrations) {
    const normalized = normalizeTransactionReference(
      reg.normalizedTransactionReference || reg.transactionReference
    );
    if (!normalized) continue;
    const list = grouped.get(normalized);
    if (list) {
      list.push(reg);
    } else {
      grouped.set(normalized, [reg]);
    }
  }

  const duplicateGroups: DuplicateUtrGroup[] = [];
  const byNormalizedUtr = new Map<string, RegistrationRecord[]>();
  const conflictingRecordIds = new Set<string>();

  for (const [normalizedUtr, records] of grouped.entries()) {
    if (records.length > 1) {
      const sorted = [...records].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return aTime - bTime;
      });
      duplicateGroups.push({
        normalizedUtr,
        displayUtr: sorted[0]?.transactionReference?.trim() || normalizedUtr,
        records: sorted,
      });
      byNormalizedUtr.set(normalizedUtr, sorted);
      for (const r of sorted) {
        conflictingRecordIds.add(r.id);
      }
    }
  }

  duplicateGroups.sort((a, b) => b.records.length - a.records.length);

  return {
    duplicateGroups,
    byNormalizedUtr,
    conflictingRecordIds,
    totalDuplicateGroups: duplicateGroups.length,
    totalAffectedRecords: conflictingRecordIds.size,
  };
}

/**
 * Returns all OTHER registration records sharing the same normalized UTR
 * as `targetReg` (excluding `targetReg` itself).
 */
export function getConflictingRegistrationsForRecord(
  targetReg: RegistrationRecord,
  allRegistrations: RegistrationRecord[],
  precomputed?: DuplicateUtrAnalysis
): RegistrationRecord[] {
  const normalized = normalizeTransactionReference(
    targetReg.normalizedTransactionReference || targetReg.transactionReference
  );
  if (!normalized) return [];

  if (precomputed) {
    const group = precomputed.byNormalizedUtr.get(normalized);
    if (!group) return [];
    return group.filter((r) => r.id !== targetReg.id);
  }

  return allRegistrations.filter((r) => {
    if (r.id === targetReg.id) return false;
    const otherNorm = normalizeTransactionReference(
      r.normalizedTransactionReference || r.transactionReference
    );
    return otherNorm === normalized;
  });
}

/**
 * Idempotent Admin helper: ensures every pre-existing registration in Firestore
 * has a corresponding `paymentTransactions/{utrKey}` lock entry so real-time
 * public duplicate checks cover historical records as well.
 *
 * Strictly non-destructive: NEVER modifies or deletes any `registrations` document
 * and never overwrites an existing `paymentTransactions/{utrKey}` lock.
 */
export async function syncMissingPaymentTransactionLocks(
  registrations: RegistrationRecord[]
): Promise<UtrLockSyncReport> {
  const report: UtrLockSyncReport = {
    scanned: registrations.length,
    created: 0,
    alreadyIndexed: 0,
    duplicateConflictsSkipped: 0,
    errors: 0,
  };

  if (registrations.length === 0) return report;

  // Sort oldest-first so the earliest submission holds the primary lock key
  const sorted = [...registrations].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return aTime - bTime;
  });

  const seenNormalized = new Set<string>();

  for (const reg of sorted) {
    const normalized = normalizeTransactionReference(
      reg.normalizedTransactionReference || reg.transactionReference
    );
    if (!normalized) continue;

    if (seenNormalized.has(normalized)) {
      report.duplicateConflictsSkipped += 1;
      continue;
    }
    seenNormalized.add(normalized);

    try {
      const utrKey = await computeTransactionReferenceKey(normalized);
      const lockRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, utrKey);
      const existingSnap = await getDoc(lockRef);

      if (existingSnap.exists()) {
        report.alreadyIndexed += 1;
        continue;
      }

      const nowIso = new Date().toISOString();
      const lockDoc: PaymentTransactionLockRecord = {
        id: utrKey,
        normalizedTransactionReference: normalized,
        registrationId: reg.id,
        createdAt: reg.createdAt || nowIso,
        updatedAt: nowIso,
      };
      await setDoc(lockRef, lockDoc);
      report.created += 1;
    } catch (err) {
      report.errors += 1;
      console.warn(
        `[utrValidationService] Non-fatal lock sync warning for registration ${reg.id}:`,
        err
      );
    }
  }

  return report;
}
