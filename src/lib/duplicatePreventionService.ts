import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { AbstractRecord, RegistrationRecord } from './managementService';

// ============================================================================
// CONSTANTS & EXACT USER-FACING VALIDATION MESSAGES
// ============================================================================

export const PAYMENT_TRANSACTIONS_COLLECTION = 'paymentTransactions';
export const UNIQUENESS_RESERVATIONS_COLLECTION = 'uniquenessReservations';

export const DETAILS_VERIFIED_MESSAGE =
  'Details verified. No existing registration found.';
export const DUPLICATE_EMAIL_MESSAGE =
  'This email address is already associated with an existing registration.';
export const DUPLICATE_MOBILE_MESSAGE =
  'This mobile number is already associated with an existing registration.';
export const DUPLICATE_UTR_MESSAGE =
  'This payment transaction ID has already been submitted. Please verify the transaction details.';
export const SIMILAR_NAME_WARNING_MESSAGE =
  'A participant with a similar name may already be registered. Please verify your details before continuing.';
export const SAME_NAME_AND_INSTITUTION_WARNING_MESSAGE =
  'A participant with the same name and institution may already be registered. Please verify your details carefully before continuing.';

export const DUPLICATE_ABSTRACT_CONTENT_MESSAGE =
  'An abstract with identical content has already been submitted. Please verify your submission to avoid duplicates.';
export const DUPLICATE_ABSTRACT_TITLE_AUTHOR_MESSAGE =
  'You have already submitted an abstract with this title. If you are submitting a different abstract, please enter its distinct title and content.';

export const CHECKING_EMAIL_MESSAGE = 'Checking email availability...';
export const CHECKING_MOBILE_MESSAGE = 'Checking mobile number availability...';
export const CHECKING_UTR_MESSAGE = 'Checking payment transaction ID...';
export const CHECKING_NAME_MESSAGE = 'Checking for similar participant names...';
export const CHECKING_ABSTRACT_MESSAGE = 'Checking for duplicate abstract submissions...';

export const UTR_AVAILABLE_MESSAGE = 'Payment transaction ID is available.';
export const EMAIL_AVAILABLE_MESSAGE = 'Email address is available.';
export const MOBILE_AVAILABLE_MESSAGE = 'Mobile number is available.';

// ============================================================================
// TYPES & STRUCTURED DUPLICATE ERRORS
// ============================================================================

export type UniquenessReservationType =
  | 'email'
  | 'mobile'
  | 'name'
  | 'abstract_content'
  | 'abstract_title_author';

export interface UniquenessReservationRecord {
  id: string;
  type: UniquenessReservationType;
  ownerId: string;
  ownerCollection: 'registrations' | 'abstractSubmissions';
  registrationIdsCount?: number;
  institutionHashes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionLockRecord {
  id: string;
  normalizedTransactionReference: string;
  registrationId: string;
  createdAt: string;
  updatedAt: string;
}

export type FieldAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'duplicate'
  | 'error';

export interface FieldAvailabilityResult {
  status: FieldAvailabilityStatus;
  normalizedValue: string;
  reservationKey: string;
  message: string;
  conflictingRecordId?: string;
}

export type NameAdvisoryStatus =
  | 'idle'
  | 'checking'
  | 'none'
  | 'similar_name'
  | 'same_name_and_institution'
  | 'error';

export interface NameAdvisoryResult {
  status: NameAdvisoryStatus;
  normalizedName: string;
  nameAdvisoryKey: string;
  matchedCount: number;
  message: string;
}

export type AbstractDuplicateCheckStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'duplicate_content'
  | 'duplicate_title_author'
  | 'error';

export interface AbstractDuplicateCheckResult {
  status: AbstractDuplicateCheckStatus;
  contentKey: string;
  titleAuthorKey: string;
  message: string;
  conflictingAbstractId?: string;
}

export type DuplicateErrorCode =
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_MOBILE'
  | 'DUPLICATE_UTR'
  | 'DUPLICATE_REGISTRATION_ID'
  | 'DUPLICATE_ABSTRACT_CONTENT'
  | 'DUPLICATE_ABSTRACT_TITLE'
  | 'DUPLICATE_ABSTRACT_ID';

export class DuplicateRecordError extends Error {
  readonly code: DuplicateErrorCode;
  readonly field:
    | 'email'
    | 'mobile'
    | 'transactionReference'
    | 'registrationId'
    | 'abstractContent'
    | 'abstractTitle'
    | 'abstractId';
  readonly normalizedValue: string;
  readonly reservationKey: string;
  readonly conflictingRecordId?: string;

  constructor(params: {
    code: DuplicateErrorCode;
    field: DuplicateRecordError['field'];
    normalizedValue: string;
    reservationKey: string;
    conflictingRecordId?: string;
    message?: string;
  }) {
    const defaultMessages: Record<DuplicateErrorCode, string> = {
      DUPLICATE_EMAIL: DUPLICATE_EMAIL_MESSAGE,
      DUPLICATE_MOBILE: DUPLICATE_MOBILE_MESSAGE,
      DUPLICATE_UTR: DUPLICATE_UTR_MESSAGE,
      DUPLICATE_REGISTRATION_ID:
        'This Registration ID is already assigned to another participant.',
      DUPLICATE_ABSTRACT_CONTENT: DUPLICATE_ABSTRACT_CONTENT_MESSAGE,
      DUPLICATE_ABSTRACT_TITLE: DUPLICATE_ABSTRACT_TITLE_AUTHOR_MESSAGE,
      DUPLICATE_ABSTRACT_ID: 'This Abstract ID is already assigned to another abstract.',
    };
    super(params.message || defaultMessages[params.code]);
    this.name = 'DuplicateRecordError';
    this.code = params.code;
    this.field = params.field;
    this.normalizedValue = params.normalizedValue;
    this.reservationKey = params.reservationKey;
    this.conflictingRecordId = params.conflictingRecordId;
  }
}

export function isDuplicateRecordError(err: unknown): err is DuplicateRecordError {
  return (
    err instanceof DuplicateRecordError ||
    (typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      typeof (err as { code?: unknown }).code === 'string' &&
      (err as { code: string }).code.startsWith('DUPLICATE_'))
  );
}

// ============================================================================
// COUNTRY DIAL CODE MAP FOR INTERNATIONAL MOBILE NORMALIZATION
// ============================================================================

const COUNTRY_DIAL_CODES: Record<string, string> = {
  india: '91',
  malaysia: '60',
  'united states': '1',
  usa: '1',
  canada: '1',
  'united kingdom': '44',
  uk: '44',
  singapore: '65',
  australia: '61',
  germany: '49',
  'united arab emirates': '971',
  uae: '971',
  'saudi arabia': '966',
  japan: '81',
  'south korea': '82',
  france: '33',
  italy: '39',
  netherlands: '31',
  switzerland: '41',
  sweden: '46',
  'south africa': '27',
  brazil: '55',
  'new zealand': '64',
};

// ============================================================================
// NORMALIZATION RULES (SECTION A & B)
// ============================================================================

export function normalizeWhitespace(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}

export function normalizeEmail(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Normalizes UTR / Payment Transaction Reference values by removing ALL accidental
 * whitespace (leading, trailing, internal) and applying consistent uppercase handling.
 */
export function normalizeTransactionReference(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalizes mobile phone numbers to a consistent canonical international E.164 format
 * including country code (e.g., "+919876543210").
 */
export function normalizeMobileInternational(
  raw: string | null | undefined,
  country: string | null | undefined = 'India'
): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const countryKey = normalizeWhitespace(country || 'India').toLowerCase();
  const defaultDialCode = COUNTRY_DIAL_CODES[countryKey] || (countryKey === 'other' ? '' : '91');

  // Remove spaces, hyphens, parentheses, dots
  let cleaned = trimmed.replace(/[\s\-().]/g, '');

  // Handle explicit international prefix (+ or 00)
  if (cleaned.startsWith('+')) {
    let digits = cleaned.slice(1).replace(/\D/g, '');
    if (!digits) return '';
    // Fix common trunk-zero mistake after country code (e.g., +91 09876543210 -> +919876543210)
    if (defaultDialCode && digits.startsWith(`${defaultDialCode}0`) && digits.length === defaultDialCode.length + 11) {
      digits = defaultDialCode + digits.slice(defaultDialCode.length + 1);
    }
    return `+${digits}`;
  }

  if (cleaned.startsWith('00')) {
    const digits = cleaned.slice(2).replace(/\D/g, '');
    if (digits.length >= 8) {
      return `+${digits}`;
    }
  }

  let digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';

  // Strip national trunk zeros (e.g., 09876543210 -> 9876543210)
  while (digits.startsWith('0') && digits.length > 8) {
    digits = digits.slice(1);
  }

  if (defaultDialCode) {
    // Already includes country dial code without '+' (e.g., 919876543210 for India)
    if (digits.startsWith(defaultDialCode) && digits.length >= defaultDialCode.length + 8) {
      // Guard against 10-digit Indian mobile numbers starting with '91' (length 10, not 12)
      if (!(defaultDialCode === '91' && digits.length === 10)) {
        return `+${digits}`;
      }
    }
    return `+${defaultDialCode}${digits}`;
  }

  return `+${digits}`;
}

const HONORIFIC_PREFIX_REGEX =
  /^(?:dr|prof|professor|mr|mrs|ms|miss|shri|smt|sir|mx|rev)\.?\s+/i;

/**
 * Normalizes participant names strictly for duplicate comparison without altering
 * the displayed name stored on the registration record.
 */
export function normalizePersonName(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  let value = raw.trim().toLowerCase();
  // Remove punctuation/periods while preserving word separation
  value = value.replace(/[.,/_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Iteratively strip leading academic/courtesy honorifics ("Dr. Prof. A. Kumar" -> "a kumar")
  let previous = '';
  while (value !== previous) {
    previous = value;
    value = value.replace(HONORIFIC_PREFIX_REGEX, '').trim();
  }
  return value.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function normalizeInstitution(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAbstractTitle(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractAbstractBodyText(
  content: AbstractRecord['abstractContent'] | string | null | undefined
): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content.text === 'string' && content.text.trim()) {
    return content.text;
  }
  return [
    content.background,
    content.objective,
    content.methodology,
    content.results,
    content.conclusion,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ');
}

export function normalizeAbstractContent(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// SIMILARITY HELPERS (NAMES & ABSTRACT CONTENT)
// ============================================================================

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function areNamesSimilar(
  rawNameA: string,
  rawNameB: string
): { isMatch: boolean; isExactNormalized: boolean; similarity: number } {
  const a = normalizePersonName(rawNameA);
  const b = normalizePersonName(rawNameB);
  if (!a || !b) {
    return { isMatch: false, isExactNormalized: false, similarity: 0 };
  }
  if (a === b) {
    return { isMatch: true, isExactNormalized: true, similarity: 1 };
  }

  // Token-order invariant match ("Priya Sharma" vs "Sharma Priya")
  const tokensA = a.split(' ').filter(Boolean);
  const tokensB = b.split(' ').filter(Boolean);
  const sortedA = [...tokensA].sort().join(' ');
  const sortedB = [...tokensB].sort().join(' ');
  if (sortedA === sortedB) {
    return { isMatch: true, isExactNormalized: true, similarity: 0.98 };
  }

  // Compact match ignoring spaces ("A Kumar" vs "AKumar")
  const compactA = a.replace(/\s+/g, '');
  const compactB = b.replace(/\s+/g, '');
  if (compactA === compactB) {
    return { isMatch: true, isExactNormalized: true, similarity: 0.96 };
  }

  // Near-identical spelling (minor typo / extra letter)
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b);
  const similarity = maxLen > 0 ? 1 - dist / maxLen : 0;

  if (maxLen >= 6 && dist <= 2 && similarity >= 0.82) {
    return { isMatch: true, isExactNormalized: false, similarity };
  }
  if (maxLen >= 4 && dist <= 1 && similarity >= 0.8) {
    return { isMatch: true, isExactNormalized: false, similarity };
  }

  return { isMatch: false, isExactNormalized: false, similarity };
}

/**
 * Computes content similarity in [0, 1] using word 3-gram shingles (for longer texts)
 * combined with token Jaccard overlap so duplicate abstracts are caught even when the
 * title or a few words are altered.
 */
export function computeAbstractContentSimilarity(rawA: string, rawB: string): number {
  const normA = normalizeAbstractContent(rawA);
  const normB = normalizeAbstractContent(rawB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const wordsA = normA.split(' ').filter(Boolean);
  const wordsB = normB.split(' ').filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  // Word-level Jaccard
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let tokenIntersection = 0;
  for (const w of setA) {
    if (setB.has(w)) tokenIntersection += 1;
  }
  const tokenUnion = setA.size + setB.size - tokenIntersection;
  const tokenJaccard = tokenUnion > 0 ? tokenIntersection / tokenUnion : 0;

  // 3-word shingle Jaccard (captures phrase structure and prevents false positives)
  if (wordsA.length >= 6 && wordsB.length >= 6) {
    const shinglesA = new Set<string>();
    const shinglesB = new Set<string>();
    for (let i = 0; i <= wordsA.length - 3; i++) {
      shinglesA.add(`${wordsA[i]} ${wordsA[i + 1]} ${wordsA[i + 2]}`);
    }
    for (let i = 0; i <= wordsB.length - 3; i++) {
      shinglesB.add(`${wordsB[i]} ${wordsB[i + 1]} ${wordsB[i + 2]}`);
    }
    let shingleIntersection = 0;
    for (const s of shinglesA) {
      if (shinglesB.has(s)) shingleIntersection += 1;
    }
    const shingleUnion = shinglesA.size + shinglesB.size - shingleIntersection;
    const shingleJaccard = shingleUnion > 0 ? shingleIntersection / shingleUnion : 0;
    return Number((shingleJaccard * 0.65 + tokenJaccard * 0.35).toFixed(4));
  }

  return Number(tokenJaccard.toFixed(4));
}

// ============================================================================
// DETERMINISTIC SHA-256 HASHING (WEB CRYPTO + PURE-TS FALLBACK)
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256HexFallback(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3);
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10);
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
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
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
    .map((val) => val.toString(16).padStart(8, '0'))
    .join('');
}

export async function sha256Hex(input: string): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(input);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return sha256HexFallback(input);
    }
  }
  return sha256HexFallback(input);
}

// ============================================================================
// DETERMINISTIC RESERVATION KEYS
// ============================================================================

export async function computeTransactionReferenceKey(rawUtr: string): Promise<string> {
  const normalized = normalizeTransactionReference(rawUtr);
  if (!normalized) return '';
  return `UTR_${await sha256Hex(normalized)}`;
}

export async function computeEmailReservationKey(rawEmail: string): Promise<string> {
  const normalized = normalizeEmail(rawEmail);
  if (!normalized) return '';
  return `EMAIL_${await sha256Hex(normalized)}`;
}

export async function computeMobileReservationKey(
  rawMobile: string,
  country: string = 'India'
): Promise<string> {
  const normalized = normalizeMobileInternational(rawMobile, country);
  if (!normalized) return '';
  return `MOBILE_${await sha256Hex(normalized)}`;
}

export async function computeNameAdvisoryKey(rawName: string): Promise<string> {
  const normalized = normalizePersonName(rawName);
  if (!normalized) return '';
  return `NAME_${await sha256Hex(normalized)}`;
}

export async function computeInstitutionHash(rawInstitution: string): Promise<string> {
  const normalized = normalizeInstitution(rawInstitution);
  if (!normalized) return '';
  return (await sha256Hex(normalized)).slice(0, 16);
}

export async function computeAbstractContentReservationKey(rawContent: string): Promise<string> {
  const normalized = normalizeAbstractContent(rawContent);
  if (!normalized) return '';
  return `ABS_CONTENT_${await sha256Hex(normalized)}`;
}

export async function computeAbstractTitleAuthorKey(
  rawTitle: string,
  rawAuthorEmail: string
): Promise<string> {
  const normTitle = normalizeAbstractTitle(rawTitle);
  const normEmail = normalizeEmail(rawAuthorEmail);
  if (!normTitle || !normEmail) return '';
  return `ABS_TITLE_AUTHOR_${await sha256Hex(`${normEmail}::${normTitle}`)}`;
}

// ============================================================================
// REAL-TIME PARTICIPANT AVAILABILITY CHECKS (ZERO-PII FIRESTORE GETDOC)
// ============================================================================

export async function checkEmailAvailability(
  rawEmail: string,
  excludeRegistrationId?: string | null
): Promise<FieldAvailabilityResult> {
  const normalized = normalizeEmail(rawEmail);
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { status: 'idle', normalizedValue: normalized, reservationKey: '', message: '' };
  }

  const key = await computeEmailReservationKey(normalized);
  try {
    const snap = await getDoc(doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, key));
    if (!snap.exists()) {
      return {
        status: 'available',
        normalizedValue: normalized,
        reservationKey: key,
        message: EMAIL_AVAILABLE_MESSAGE,
      };
    }

    const data = snap.data() as Partial<UniquenessReservationRecord>;
    const ownerUpper = (data.ownerId || '').trim().toUpperCase();
    const excludeUpper = (excludeRegistrationId || '').trim().toUpperCase();

    if (excludeUpper && ownerUpper === excludeUpper) {
      return {
        status: 'available',
        normalizedValue: normalized,
        reservationKey: key,
        message: EMAIL_AVAILABLE_MESSAGE,
      };
    }

    return {
      status: 'duplicate',
      normalizedValue: normalized,
      reservationKey: key,
      message: DUPLICATE_EMAIL_MESSAGE,
      conflictingRecordId: data.ownerId,
    };
  } catch (err) {
    console.warn('[duplicatePrevention] Real-time email availability check warning:', err);
    return {
      status: 'error',
      normalizedValue: normalized,
      reservationKey: key,
      message: 'Unable to verify email availability right now. It will be re-checked upon submission.',
    };
  }
}

export async function checkMobileAvailability(
  rawMobile: string,
  country: string = 'India',
  excludeRegistrationId?: string | null
): Promise<FieldAvailabilityResult> {
  const digitsOnly = (rawMobile || '').replace(/\D/g, '');
  const normalized = normalizeMobileInternational(rawMobile, country);
  if (!normalized || digitsOnly.length < 8) {
    return { status: 'idle', normalizedValue: normalized, reservationKey: '', message: '' };
  }

  const key = await computeMobileReservationKey(rawMobile, country);
  try {
    const snap = await getDoc(doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, key));
    if (!snap.exists()) {
      return {
        status: 'available',
        normalizedValue: normalized,
        reservationKey: key,
        message: MOBILE_AVAILABLE_MESSAGE,
      };
    }

    const data = snap.data() as Partial<UniquenessReservationRecord>;
    const ownerUpper = (data.ownerId || '').trim().toUpperCase();
    const excludeUpper = (excludeRegistrationId || '').trim().toUpperCase();

    if (excludeUpper && ownerUpper === excludeUpper) {
      return {
        status: 'available',
        normalizedValue: normalized,
        reservationKey: key,
        message: MOBILE_AVAILABLE_MESSAGE,
      };
    }

    return {
      status: 'duplicate',
      normalizedValue: normalized,
      reservationKey: key,
      message: DUPLICATE_MOBILE_MESSAGE,
      conflictingRecordId: data.ownerId,
    };
  } catch (err) {
    console.warn('[duplicatePrevention] Real-time mobile availability check warning:', err);
    return {
      status: 'error',
      normalizedValue: normalized,
      reservationKey: key,
      message: 'Unable to verify mobile number right now. It will be re-checked upon submission.',
    };
  }
}

export async function checkTransactionReferenceAvailability(
  rawUtr: string,
  excludeRegistrationId?: string | null
): Promise<FieldAvailabilityResult> {
  const normalized = normalizeTransactionReference(rawUtr);
  if (!normalized) {
    return { status: 'idle', normalizedValue: '', reservationKey: '', message: '' };
  }

  const key = await computeTransactionReferenceKey(normalized);
  try {
    const snap = await getDoc(doc(db, PAYMENT_TRANSACTIONS_COLLECTION, key));
    if (!snap.exists()) {
      return {
        status: 'available',
        normalizedValue: normalized,
        reservationKey: key,
        message: UTR_AVAILABLE_MESSAGE,
      };
    }

    const data = snap.data() as Partial<PaymentTransactionLockRecord>;
    const ownerUpper = (data.registrationId || '').trim().toUpperCase();
    const excludeUpper = (excludeRegistrationId || '').trim().toUpperCase();

    if (excludeUpper && ownerUpper === excludeUpper) {
      return {
        status: 'available',
        normalizedValue: normalized,
        reservationKey: key,
        message: UTR_AVAILABLE_MESSAGE,
      };
    }

    return {
      status: 'duplicate',
      normalizedValue: normalized,
      reservationKey: key,
      message: DUPLICATE_UTR_MESSAGE,
      conflictingRecordId: data.registrationId,
    };
  } catch (err) {
    console.warn('[duplicatePrevention] Real-time UTR availability check warning:', err);
    return {
      status: 'error',
      normalizedValue: normalized,
      reservationKey: key,
      message:
        'Unable to verify payment transaction ID right now. It will be re-checked upon submission.',
    };
  }
}

/**
 * Non-blocking advisory check for exact normalized participant name and optional
 * same-institution match (zero PII exposed; stores only hashed institution tags).
 */
export async function checkNameAdvisoryMatch(
  rawFullName: string,
  rawInstitution: string = '',
  excludeRegistrationId?: string | null
): Promise<NameAdvisoryResult> {
  const normalizedName = normalizePersonName(rawFullName);
  if (!normalizedName || normalizedName.length < 3) {
    return {
      status: 'idle',
      normalizedName,
      nameAdvisoryKey: '',
      matchedCount: 0,
      message: '',
    };
  }

  const key = await computeNameAdvisoryKey(normalizedName);
  try {
    const snap = await getDoc(doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, key));
    if (!snap.exists()) {
      return {
        status: 'none',
        normalizedName,
        nameAdvisoryKey: key,
        matchedCount: 0,
        message: '',
      };
    }

    const data = snap.data() as Partial<UniquenessReservationRecord>;
    const ownerUpper = (data.ownerId || '').trim().toUpperCase();
    const excludeUpper = (excludeRegistrationId || '').trim().toUpperCase();
    const totalCount =
      typeof data.registrationIdsCount === 'number' && data.registrationIdsCount > 0
        ? data.registrationIdsCount
        : 1;

    if (excludeUpper && ownerUpper === excludeUpper && totalCount <= 1) {
      return {
        status: 'none',
        normalizedName,
        nameAdvisoryKey: key,
        matchedCount: 0,
        message: '',
      };
    }

    const instHash = rawInstitution.trim()
      ? await computeInstitutionHash(rawInstitution)
      : '';
    const existingInstHashes = Array.isArray(data.institutionHashes)
      ? data.institutionHashes
      : [];

    if (instHash && existingInstHashes.includes(instHash)) {
      return {
        status: 'same_name_and_institution',
        normalizedName,
        nameAdvisoryKey: key,
        matchedCount: totalCount,
        message: SAME_NAME_AND_INSTITUTION_WARNING_MESSAGE,
      };
    }

    return {
      status: 'similar_name',
      normalizedName,
      nameAdvisoryKey: key,
      matchedCount: totalCount,
      message: SIMILAR_NAME_WARNING_MESSAGE,
    };
  } catch (err) {
    console.warn('[duplicatePrevention] Real-time name advisory check warning:', err);
    return {
      status: 'error',
      normalizedName,
      nameAdvisoryKey: key,
      matchedCount: 0,
      message: '',
    };
  }
}

export async function checkAbstractDuplicateAvailability(params: {
  title: string;
  content: string;
  authorEmail: string;
  excludeAbstractId?: string | null;
}): Promise<AbstractDuplicateCheckResult> {
  const normTitle = normalizeAbstractTitle(params.title);
  const normContent = normalizeAbstractContent(params.content);
  const normEmail = normalizeEmail(params.authorEmail);

  const contentKey = normContent.length >= 25 ? await computeAbstractContentReservationKey(normContent) : '';
  const titleAuthorKey =
    normTitle.length >= 5 && normEmail ? await computeAbstractTitleAuthorKey(normTitle, normEmail) : '';

  if (!contentKey && !titleAuthorKey) {
    return { status: 'idle', contentKey, titleAuthorKey, message: '' };
  }

  const excludeUpper = (params.excludeAbstractId || '').trim().toUpperCase();

  try {
    if (contentKey) {
      const contentSnap = await getDoc(doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, contentKey));
      if (contentSnap.exists()) {
        const data = contentSnap.data() as Partial<UniquenessReservationRecord>;
        const ownerUpper = (data.ownerId || '').trim().toUpperCase();
        if (!excludeUpper || ownerUpper !== excludeUpper) {
          return {
            status: 'duplicate_content',
            contentKey,
            titleAuthorKey,
            message: DUPLICATE_ABSTRACT_CONTENT_MESSAGE,
            conflictingAbstractId: data.ownerId,
          };
        }
      }
    }

    if (titleAuthorKey) {
      const titleSnap = await getDoc(doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, titleAuthorKey));
      if (titleSnap.exists()) {
        const data = titleSnap.data() as Partial<UniquenessReservationRecord>;
        const ownerUpper = (data.ownerId || '').trim().toUpperCase();
        if (!excludeUpper || ownerUpper !== excludeUpper) {
          return {
            status: 'duplicate_title_author',
            contentKey,
            titleAuthorKey,
            message: DUPLICATE_ABSTRACT_TITLE_AUTHOR_MESSAGE,
            conflictingAbstractId: data.ownerId,
          };
        }
      }
    }

    return {
      status: 'available',
      contentKey,
      titleAuthorKey,
      message: 'Abstract content and title verified as unique.',
    };
  } catch (err) {
    console.warn('[duplicatePrevention] Real-time abstract duplicate check warning:', err);
    return {
      status: 'error',
      contentKey,
      titleAuthorKey,
      message: 'Unable to check for duplicate abstracts right now. It will be verified upon submission.',
    };
  }
}

// ============================================================================
// COMPREHENSIVE FULL-DATABASE DUPLICATE AUDIT ENGINE (ADMIN PORTAL & REPORTS)
// ============================================================================

export type RegistrationDuplicateFlagType =
  | 'duplicate_reg_id'
  | 'duplicate_email'
  | 'duplicate_mobile'
  | 'duplicate_utr'
  | 'same_name_institution'
  | 'similar_name';

export interface RegistrationDuplicateGroup {
  groupId: string;
  type: RegistrationDuplicateFlagType;
  severity: 'critical' | 'warning';
  label: string;
  matchedValue: string;
  records: RegistrationRecord[];
}

export type AbstractDuplicateFlagType =
  | 'duplicate_abstract_id'
  | 'duplicate_title'
  | 'identical_content'
  | 'similar_content';

export interface AbstractDuplicateGroup {
  groupId: string;
  type: AbstractDuplicateFlagType;
  severity: 'critical' | 'warning';
  label: string;
  matchedValue: string;
  similarityPercent?: number;
  records: AbstractRecord[];
}

export interface FullDuplicateAuditResult {
  scannedRegistrations: number;
  scannedAbstracts: number;
  duplicateRegistrationIdGroups: RegistrationDuplicateGroup[];
  duplicateEmailGroups: RegistrationDuplicateGroup[];
  duplicateMobileGroups: RegistrationDuplicateGroup[];
  duplicateUtrGroups: RegistrationDuplicateGroup[];
  similarNameGroups: RegistrationDuplicateGroup[];
  allRegistrationGroups: RegistrationDuplicateGroup[];
  registrationFlagsByDocId: Map<string, RegistrationDuplicateGroup[]>;
  flaggedRegistrationDocIds: Set<string>;
  duplicateAbstractIdGroups: AbstractDuplicateGroup[];
  duplicateAbstractTitleGroups: AbstractDuplicateGroup[];
  similarAbstractContentGroups: AbstractDuplicateGroup[];
  allAbstractGroups: AbstractDuplicateGroup[];
  abstractFlagsByDocId: Map<string, AbstractDuplicateGroup[]>;
  flaggedAbstractDocIds: Set<string>;
  totalRegistrationIssues: number;
  totalAbstractIssues: number;
}

function addFlagToMap<T>(map: Map<string, T[]>, id: string, flag: T): void {
  const existing = map.get(id);
  if (existing) {
    existing.push(flag);
  } else {
    map.set(id, [flag]);
  }
}

/**
 * Scans ALL registrations and ALL abstracts across every status (Pending Verification,
 * Under Verification, Verified, Approved, Rejected, Submitted, etc.) without modifying
 * or deleting any existing records.
 */
export function runFullDuplicateAudit(
  registrations: RegistrationRecord[],
  abstracts: AbstractRecord[]
): FullDuplicateAuditResult {
  const regIdBuckets = new Map<string, RegistrationRecord[]>();
  const emailBuckets = new Map<string, RegistrationRecord[]>();
  const mobileBuckets = new Map<string, RegistrationRecord[]>();
  const utrBuckets = new Map<string, RegistrationRecord[]>();

  for (const reg of registrations) {
    const regIdNorm = (reg.registrationId || '').trim().toUpperCase();
    if (regIdNorm) {
      const list = regIdBuckets.get(regIdNorm) || [];
      list.push(reg);
      regIdBuckets.set(regIdNorm, list);
    }

    const emailNorm = normalizeEmail(reg.normalizedEmail || reg.email);
    if (emailNorm) {
      const list = emailBuckets.get(emailNorm) || [];
      list.push(reg);
      emailBuckets.set(emailNorm, list);
    }

    const mobileNorm = normalizeMobileInternational(
      reg.normalizedMobile || reg.mobile,
      reg.country || 'India'
    );
    if (mobileNorm && mobileNorm.replace(/\D/g, '').length >= 8) {
      const list = mobileBuckets.get(mobileNorm) || [];
      list.push(reg);
      mobileBuckets.set(mobileNorm, list);
    }

    const utrNorm = normalizeTransactionReference(
      reg.normalizedTransactionReference || reg.transactionReference
    );
    if (utrNorm) {
      const list = utrBuckets.get(utrNorm) || [];
      list.push(reg);
      utrBuckets.set(utrNorm, list);
    }
  }

  const sortRegs = (list: RegistrationRecord[]) =>
    [...list].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  const duplicateRegistrationIdGroups: RegistrationDuplicateGroup[] = [];
  for (const [val, list] of regIdBuckets.entries()) {
    if (list.length > 1) {
      duplicateRegistrationIdGroups.push({
        groupId: `regid:${val}`,
        type: 'duplicate_reg_id',
        severity: 'critical',
        label: 'Duplicate Registration ID',
        matchedValue: val,
        records: sortRegs(list),
      });
    }
  }

  const duplicateEmailGroups: RegistrationDuplicateGroup[] = [];
  for (const [val, list] of emailBuckets.entries()) {
    if (list.length > 1) {
      duplicateEmailGroups.push({
        groupId: `email:${val}`,
        type: 'duplicate_email',
        severity: 'critical',
        label: 'Duplicate Email',
        matchedValue: val,
        records: sortRegs(list),
      });
    }
  }

  const duplicateMobileGroups: RegistrationDuplicateGroup[] = [];
  for (const [val, list] of mobileBuckets.entries()) {
    if (list.length > 1) {
      duplicateMobileGroups.push({
        groupId: `mobile:${val}`,
        type: 'duplicate_mobile',
        severity: 'critical',
        label: 'Duplicate Mobile',
        matchedValue: val,
        records: sortRegs(list),
      });
    }
  }

  const duplicateUtrGroups: RegistrationDuplicateGroup[] = [];
  for (const [val, list] of utrBuckets.entries()) {
    if (list.length > 1) {
      duplicateUtrGroups.push({
        groupId: `utr:${val}`,
        type: 'duplicate_utr',
        severity: 'critical',
        label: 'Repeated UTR',
        matchedValue: val,
        records: sortRegs(list),
      });
    }
  }

  // Exact & Near-Identical Participant Names (Union-Find clustering)
  const similarNameGroups: RegistrationDuplicateGroup[] = [];
  const visitedNameIndices = new Set<number>();

  for (let i = 0; i < registrations.length; i++) {
    if (visitedNameIndices.has(i)) continue;
    const baseName = normalizePersonName(registrations[i].fullName);
    if (!baseName) continue;

    const cluster: RegistrationRecord[] = [registrations[i]];
    for (let j = i + 1; j < registrations.length; j++) {
      if (visitedNameIndices.has(j)) continue;
      const cmp = areNamesSimilar(registrations[i].fullName, registrations[j].fullName);
      if (cmp.isMatch) {
        cluster.push(registrations[j]);
        visitedNameIndices.add(j);
      }
    }

    if (cluster.length > 1) {
      visitedNameIndices.add(i);
      const instCounts = new Map<string, number>();
      let hasSameInstitution = false;
      for (const r of cluster) {
        const inst = normalizeInstitution(r.institution);
        if (inst) {
          const next = (instCounts.get(inst) || 0) + 1;
          instCounts.set(inst, next);
          if (next > 1) hasSameInstitution = true;
        }
      }

      similarNameGroups.push({
        groupId: `name:${baseName}`,
        type: hasSameInstitution ? 'same_name_institution' : 'similar_name',
        severity: 'warning',
        label: hasSameInstitution ? 'Same Name & Institution' : 'Similar Participant Name',
        matchedValue: registrations[i].fullName,
        records: sortRegs(cluster),
      });
    }
  }

  const allRegistrationGroups = [
    ...duplicateRegistrationIdGroups,
    ...duplicateUtrGroups,
    ...duplicateEmailGroups,
    ...duplicateMobileGroups,
    ...similarNameGroups,
  ];

  const registrationFlagsByDocId = new Map<string, RegistrationDuplicateGroup[]>();
  const flaggedRegistrationDocIds = new Set<string>();
  for (const group of allRegistrationGroups) {
    for (const r of group.records) {
      addFlagToMap(registrationFlagsByDocId, r.id, group);
      flaggedRegistrationDocIds.add(r.id);
    }
  }

  // ==========================================================================
  // ABSTRACT DUPLICATE AUDIT
  // Note: NEVER flags legitimate collaborative abstracts solely due to shared co-authors.
  // ==========================================================================
  const absIdBuckets = new Map<string, AbstractRecord[]>();
  const absTitleBuckets = new Map<string, AbstractRecord[]>();

  for (const abs of abstracts) {
    const absIdNorm = (abs.id || '').trim().toUpperCase();
    if (absIdNorm) {
      const list = absIdBuckets.get(absIdNorm) || [];
      list.push(abs);
      absIdBuckets.set(absIdNorm, list);
    }

    const titleNorm = normalizeAbstractTitle(abs.title);
    if (titleNorm) {
      const list = absTitleBuckets.get(titleNorm) || [];
      list.push(abs);
      absTitleBuckets.set(titleNorm, list);
    }
  }

  const sortAbs = (list: AbstractRecord[]) =>
    [...list].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  const duplicateAbstractIdGroups: AbstractDuplicateGroup[] = [];
  for (const [val, list] of absIdBuckets.entries()) {
    if (list.length > 1) {
      duplicateAbstractIdGroups.push({
        groupId: `absid:${val}`,
        type: 'duplicate_abstract_id',
        severity: 'critical',
        label: 'Duplicate Abstract ID',
        matchedValue: val,
        records: sortAbs(list),
      });
    }
  }

  const duplicateAbstractTitleGroups: AbstractDuplicateGroup[] = [];
  for (const [val, list] of absTitleBuckets.entries()) {
    if (list.length > 1) {
      duplicateAbstractTitleGroups.push({
        groupId: `abstitle:${val}`,
        type: 'duplicate_title',
        severity: 'warning',
        label: 'Repeated Abstract Title',
        matchedValue: list[0].title,
        records: sortAbs(list),
      });
    }
  }

  // Identical or Substantially Similar Abstract Content (catches slightly modified titles too!)
  const similarAbstractContentGroups: AbstractDuplicateGroup[] = [];
  const pairedContentKeys = new Set<string>();
  const absBodies = abstracts.map((a) => extractAbstractBodyText(a.abstractContent));

  for (let i = 0; i < abstracts.length; i++) {
    if (!absBodies[i] || absBodies[i].trim().length < 25) continue;
    for (let j = i + 1; j < abstracts.length; j++) {
      if (!absBodies[j] || absBodies[j].trim().length < 25) continue;
      const sim = computeAbstractContentSimilarity(absBodies[i], absBodies[j]);
      if (sim >= 0.7) {
        const pairKey = [abstracts[i].id, abstracts[j].id].sort().join('::');
        if (pairedContentKeys.has(pairKey)) continue;
        pairedContentKeys.add(pairKey);

        const simPct = Math.round(sim * 100);
        const isIdentical = sim >= 0.96;
        similarAbstractContentGroups.push({
          groupId: `abscontent:${pairKey}`,
          type: isIdentical ? 'identical_content' : 'similar_content',
          severity: isIdentical ? 'critical' : 'warning',
          label: isIdentical
            ? 'Identical Abstract Content'
            : `Substantially Similar Content (${simPct}%)`,
          matchedValue: `${abstracts[i].id} ↔ ${abstracts[j].id}`,
          similarityPercent: simPct,
          records: sortAbs([abstracts[i], abstracts[j]]),
        });
      }
    }
  }

  const allAbstractGroups = [
    ...duplicateAbstractIdGroups,
    ...similarAbstractContentGroups,
    ...duplicateAbstractTitleGroups,
  ];

  const abstractFlagsByDocId = new Map<string, AbstractDuplicateGroup[]>();
  const flaggedAbstractDocIds = new Set<string>();
  for (const group of allAbstractGroups) {
    for (const a of group.records) {
      addFlagToMap(abstractFlagsByDocId, a.id, group);
      flaggedAbstractDocIds.add(a.id);
    }
  }

  return {
    scannedRegistrations: registrations.length,
    scannedAbstracts: abstracts.length,
    duplicateRegistrationIdGroups,
    duplicateEmailGroups,
    duplicateMobileGroups,
    duplicateUtrGroups,
    similarNameGroups,
    allRegistrationGroups,
    registrationFlagsByDocId,
    flaggedRegistrationDocIds,
    duplicateAbstractIdGroups,
    duplicateAbstractTitleGroups,
    similarAbstractContentGroups,
    allAbstractGroups,
    abstractFlagsByDocId,
    flaggedAbstractDocIds,
    totalRegistrationIssues: allRegistrationGroups.length,
    totalAbstractIssues: allAbstractGroups.length,
  };
}

// ============================================================================
// IDEMPOTENT, NON-DESTRUCTIVE ADMIN BACKFILL OF MISSING RESERVATIONS
// ============================================================================

export async function syncMissingUniquenessReservations(
  registrations: RegistrationRecord[],
  abstracts: AbstractRecord[] = []
): Promise<{ created: number; updated: number; existing: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let existing = 0;
  let skipped = 0;

  // Process oldest first so the earliest submission claims each strict lock deterministically
  const sortedRegs = [...registrations].sort((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || '')
  );

  for (const reg of sortedRegs) {
    const ownerId = reg.id || reg.registrationId || '';
    if (!ownerId) {
      skipped += 1;
      continue;
    }
    const createdAt = reg.createdAt || new Date().toISOString();
    const updatedAt = reg.updatedAt || createdAt;

    // 1. UTR lock in /paymentTransactions
    const normUtr = normalizeTransactionReference(
      reg.normalizedTransactionReference || reg.transactionReference
    );
    if (normUtr) {
      const utrKey = await computeTransactionReferenceKey(normUtr);
      try {
        const utrRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, utrKey);
        const snap = await getDoc(utrRef);
        if (snap.exists()) {
          existing += 1;
        } else {
          const lockDoc: PaymentTransactionLockRecord = {
            id: utrKey,
            normalizedTransactionReference: normUtr,
            registrationId: ownerId,
            createdAt,
            updatedAt,
          };
          await setDoc(utrRef, lockDoc);
          created += 1;
        }
      } catch (err) {
        console.warn(`[duplicatePrevention] Non-fatal UTR backfill note for ${ownerId}:`, err);
        skipped += 1;
      }
    }

    // 2. Email reservation in /uniquenessReservations
    const normEmail = normalizeEmail(reg.normalizedEmail || reg.email);
    if (normEmail) {
      const emailKey = await computeEmailReservationKey(normEmail);
      try {
        const ref = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, emailKey);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          existing += 1;
        } else {
          const resDoc: UniquenessReservationRecord = {
            id: emailKey,
            type: 'email',
            ownerId,
            ownerCollection: 'registrations',
            createdAt,
            updatedAt,
          };
          await setDoc(ref, resDoc);
          created += 1;
        }
      } catch (err) {
        console.warn(`[duplicatePrevention] Non-fatal email backfill note for ${ownerId}:`, err);
        skipped += 1;
      }
    }

    // 3. International Mobile reservation in /uniquenessReservations
    const normMobile = normalizeMobileInternational(
      reg.normalizedMobile || reg.mobile,
      reg.country || 'India'
    );
    if (normMobile && normMobile.replace(/\D/g, '').length >= 8) {
      const mobileKey = await computeMobileReservationKey(normMobile, reg.country || 'India');
      try {
        const ref = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, mobileKey);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          existing += 1;
        } else {
          const resDoc: UniquenessReservationRecord = {
            id: mobileKey,
            type: 'mobile',
            ownerId,
            ownerCollection: 'registrations',
            createdAt,
            updatedAt,
          };
          await setDoc(ref, resDoc);
          created += 1;
        }
      } catch (err) {
        console.warn(`[duplicatePrevention] Non-fatal mobile backfill note for ${ownerId}:`, err);
        skipped += 1;
      }
    }

    // 4. Name advisory index in /uniquenessReservations (non-blocking, zero-PII)
    const normName = normalizePersonName(reg.fullName);
    if (normName && normName.length >= 3) {
      const nameKey = await computeNameAdvisoryKey(normName);
      const instHash = reg.institution ? await computeInstitutionHash(reg.institution) : '';
      try {
        const ref = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, nameKey);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const resDoc: UniquenessReservationRecord = {
            id: nameKey,
            type: 'name',
            ownerId,
            ownerCollection: 'registrations',
            registrationIdsCount: 1,
            institutionHashes: instHash ? [instHash] : [],
            createdAt,
            updatedAt,
          };
          await setDoc(ref, resDoc);
          created += 1;
        } else {
          const existingData = snap.data() as Partial<UniquenessReservationRecord>;
          const existingHashes = Array.isArray(existingData.institutionHashes)
            ? existingData.institutionHashes
            : [];
          if (instHash && !existingHashes.includes(instHash) && existingHashes.length < 50) {
            await setDoc(
              ref,
              {
                id: nameKey,
                type: 'name',
                ownerId: existingData.ownerId || ownerId,
                ownerCollection: 'registrations',
                registrationIdsCount: Math.max(
                  existingData.registrationIdsCount || 1,
                  existingHashes.length + 1
                ),
                institutionHashes: [...existingHashes, instHash],
                createdAt: existingData.createdAt || createdAt,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
            updated += 1;
          } else {
            existing += 1;
          }
        }
      } catch (err) {
        console.warn(`[duplicatePrevention] Non-fatal name advisory backfill note for ${ownerId}:`, err);
        skipped += 1;
      }
    }
  }

  // 5. Abstract content & title+author reservations
  const sortedAbs = [...abstracts].sort((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || '')
  );

  for (const abs of sortedAbs) {
    if (!abs.id) {
      skipped += 1;
      continue;
    }
    const createdAt = abs.createdAt || new Date().toISOString();
    const updatedAt = abs.updatedAt || createdAt;
    const bodyText = extractAbstractBodyText(abs.abstractContent);
    const authorEmail = abs.presentingAuthor?.email || '';

    if (bodyText && normalizeAbstractContent(bodyText).length >= 25) {
      const contentKey = await computeAbstractContentReservationKey(bodyText);
      try {
        const ref = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, contentKey);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          existing += 1;
        } else {
          const resDoc: UniquenessReservationRecord = {
            id: contentKey,
            type: 'abstract_content',
            ownerId: abs.id,
            ownerCollection: 'abstractSubmissions',
            createdAt,
            updatedAt,
          };
          await setDoc(ref, resDoc);
          created += 1;
        }
      } catch (err) {
        console.warn(`[duplicatePrevention] Non-fatal abstract content backfill note for ${abs.id}:`, err);
        skipped += 1;
      }
    }

    if (abs.title && authorEmail) {
      const titleKey = await computeAbstractTitleAuthorKey(abs.title, authorEmail);
      if (titleKey) {
        try {
          const ref = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, titleKey);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            existing += 1;
          } else {
            const resDoc: UniquenessReservationRecord = {
              id: titleKey,
              type: 'abstract_title_author',
              ownerId: abs.id,
              ownerCollection: 'abstractSubmissions',
              createdAt,
              updatedAt,
            };
            await setDoc(ref, resDoc);
            created += 1;
          }
        } catch (err) {
          console.warn(`[duplicatePrevention] Non-fatal abstract title backfill note for ${abs.id}:`, err);
          skipped += 1;
        }
      }
    }
  }

  return { created, updated, existing, skipped };
}
