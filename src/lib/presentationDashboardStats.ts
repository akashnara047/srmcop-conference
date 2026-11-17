import { RegistrationRecord, AbstractRecord } from './managementService';

export type InstitutionCategoryValue = 'internal' | 'external';
export type InstitutionFilterValue = 'all' | InstitutionCategoryValue;

export const INTERNAL_INSTITUTION_NAME =
  'SRM College of Pharmacy, SRMIST, Kattankulathur';

export type PresentationDashboardFilter =
  | 'all'
  | 'registered'
  | 'submitted'
  | 'pending_all'
  | 'not_submitted'
  | 'awaiting_decision'
  | 'accepted'
  | 'rejected'
  | 'oral_allotted'
  | 'poster_allotted'
  | 'eposter_allotted';

export type AllottedFormatCategory = 'oral' | 'poster' | 'eposter';

const NON_PRESENTING_TOKENS = new Set([
  '',
  'none',
  'n/a',
  'na',
  'nil',
  'no',
  'false',
  'delegate',
  'delegate only',
  'participant only',
  'attendee only',
  'non-presenting',
  'not presenting',
  'no presentation',
  'none selected',
]);

/**
 * Normalizes a Registration ID or Document ID for reliable case-insensitive matching.
 */
export function normalizeRegKey(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

/**
 * Reads ONLY the explicit stored `institutionCategory` field.
 * Never infers classification from free-text institution names so legacy records
 * without a category are never silently misclassified.
 */
export function normalizeInstitutionCategory(
  value?: string | null
): InstitutionCategoryValue | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  if (cleaned === 'internal') return 'internal';
  if (cleaned === 'external') return 'external';
  return null;
}

/**
 * Formats an explicit institutionCategory value for UI and export columns.
 */
export function formatInstitutionCategoryLabel(value?: string | null): string {
  const normalized = normalizeInstitutionCategory(value);
  if (normalized === 'internal') return 'Internal';
  if (normalized === 'external') return 'External';
  return 'Unclassified';
}

export type FoodPreferenceOption = 'Vegetarian' | 'Non-Vegetarian';
export type FoodPreferenceFilterValue = 'all' | 'vegetarian' | 'non-vegetarian';
export type ParticipationModeFilterValue = 'all' | 'offline' | 'online';
export type FoodPreferenceDisplay =
  | 'Vegetarian'
  | 'Non-Vegetarian'
  | 'Not Specified'
  | 'Not Applicable';

/**
 * Classifies a registration's participation mode strictly from stored fields.
 */
export function classifyParticipationMode(
  reg: Pick<RegistrationRecord, 'participationMode' | 'modeOfParticipation'>
): 'offline' | 'online' | 'unknown' {
  const raw = (reg.participationMode || reg.modeOfParticipation || '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (raw.includes('online') || raw.includes('virtual')) return 'online';
  if (raw.includes('offline') || raw.includes('on-site') || raw.includes('onsite')) {
    return 'offline';
  }
  return 'unknown';
}

/**
 * Reads ONLY the explicit stored food preference (`dietaryPreference`) field.
 * Never infers food preference from participant names, categories, or other fields.
 */
export function normalizeFoodPreferenceValue(
  value?: string | null
): FoodPreferenceOption | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return null;
  if (cleaned === 'vegetarian' || cleaned === 'veg') return 'Vegetarian';
  if (
    cleaned === 'non-vegetarian' ||
    cleaned === 'non vegetarian' ||
    cleaned === 'non-veg' ||
    cleaned === 'nonveg'
  ) {
    return 'Non-Vegetarian';
  }
  return null;
}

/**
 * Formats a registration's food preference for UI tables, modals, PDFs, and Excel export:
 * - Online registrations -> 'Not Applicable'
 * - Offline registrations -> 'Vegetarian' | 'Non-Vegetarian' | 'Not Specified'
 */
export function formatFoodPreferenceDisplay(
  reg: Pick<
    RegistrationRecord,
    'participationMode' | 'modeOfParticipation' | 'dietaryPreference'
  >
): FoodPreferenceDisplay {
  const mode = classifyParticipationMode(reg);
  if (mode === 'online') {
    return 'Not Applicable';
  }
  const normalizedPref = normalizeFoodPreferenceValue(reg.dietaryPreference);
  return normalizedPref ?? 'Not Specified';
}

export interface FoodPreferenceStats {
  totalOffline: number;
  vegetarian: number;
  nonVegetarian: number;
  notSpecified: number;
}

/**
 * Computes catering headcounts strictly across Offline registrations, deduplicated
 * by canonical Registration ID / document ID so each registration is counted once.
 * Online registrations are completely excluded.
 */
export function computeFoodPreferenceStats(
  registrations: RegistrationRecord[]
): FoodPreferenceStats {
  const deduped = deduplicateRegistrations(registrations);
  let totalOffline = 0;
  let vegetarian = 0;
  let nonVegetarian = 0;
  let notSpecified = 0;

  for (const reg of deduped.values()) {
    if (!reg || (!reg.id && !reg.registrationId)) continue;
    if (classifyParticipationMode(reg) !== 'offline') continue;

    totalOffline += 1;
    const pref = normalizeFoodPreferenceValue(reg.dietaryPreference);
    if (pref === 'Vegetarian') {
      vegetarian += 1;
    } else if (pref === 'Non-Vegetarian') {
      nonVegetarian += 1;
    } else {
      notSpecified += 1;
    }
  }

  return {
    totalOffline,
    vegetarian,
    nonVegetarian,
    notSpecified,
  };
}

/**
 * Evaluates whether a registration matches the active Food Preference filter.
 * Online registrations never match 'vegetarian' or 'non-vegetarian'.
 */
export function matchesFoodPreferenceFilter(
  reg: Pick<
    RegistrationRecord,
    'participationMode' | 'modeOfParticipation' | 'dietaryPreference'
  >,
  filter: FoodPreferenceFilterValue
): boolean {
  if (filter === 'all') return true;
  if (classifyParticipationMode(reg) !== 'offline') return false;
  const pref = normalizeFoodPreferenceValue(reg.dietaryPreference);
  if (filter === 'vegetarian') return pref === 'Vegetarian';
  if (filter === 'non-vegetarian') return pref === 'Non-Vegetarian';
  return false;
}

/**
 * Resolves the linked registration record for an abstract strictly via Registration ID
 * (and optional registrationDocId / linkedAbstractId fallback).
 */
export function getLinkedRegistrationForAbstractRecord(
  abs: AbstractRecord,
  registrations: RegistrationRecord[]
): RegistrationRecord | undefined {
  const absRegKey = normalizeRegKey(abs.registrationId);
  const absDocKey = normalizeRegKey(abs.registrationDocId);
  const absIdKey = normalizeRegKey(abs.id);

  return registrations.find((r) => {
    const rIdKey = normalizeRegKey(r.registrationId);
    const rDocKey = normalizeRegKey(r.id);
    if (absRegKey && (rIdKey === absRegKey || rDocKey === absRegKey)) return true;
    if (absDocKey && rDocKey === absDocKey) return true;
    if (absIdKey && r.linkedAbstractId && normalizeRegKey(r.linkedAbstractId) === absIdKey) {
      return true;
    }
    return false;
  });
}

/**
 * Extracts normalized presentation plan tokens strictly from a registration record.
 */
export function getRegistrationPresentationTokens(reg: RegistrationRecord): string[] {
  const rawEntries: string[] = [];

  if (Array.isArray(reg.presentationPlans)) {
    for (const item of reg.presentationPlans) {
      if (typeof item === 'string' && item.trim()) {
        rawEntries.push(item.trim());
      }
    }
  }

  if (typeof reg.presentationPlan === 'string' && reg.presentationPlan.trim()) {
    const parts = reg.presentationPlan.split(/[,;|]+/);
    for (const part of parts) {
      if (part.trim()) {
        rawEntries.push(part.trim());
      }
    }
  }

  return rawEntries;
}

/**
 * Determines strictly from a registration record whether the participant opted into
 * scientific presentation participation (Oral, Physical Poster, or E-Poster).
 * Payment status is intentionally ignored (Pending, Verified, Rejected are all eligible).
 */
export function isPresentationEligibleRegistration(reg: RegistrationRecord): boolean {
  const tokens = getRegistrationPresentationTokens(reg);
  if (tokens.length === 0) return false;

  return tokens.some((raw) => {
    const normalized = raw.trim().toLowerCase();
    if (NON_PRESENTING_TOKENS.has(normalized)) return false;
    if (
      normalized.startsWith('no presentation') ||
      normalized.startsWith('not presenting') ||
      normalized.startsWith('non-presenting') ||
      normalized.startsWith('delegate only')
    ) {
      return false;
    }

    return /\b(oral|poster|e-poster|eposter|presentation)\b/.test(normalized);
  });
}

/**
 * Formats the participant's registration-time presentation opt-in selection for display.
 */
export function formatRegistrationPresentationPlan(reg: RegistrationRecord): string {
  const tokens = getRegistrationPresentationTokens(reg).filter((raw) => {
    const normalized = raw.trim().toLowerCase();
    return (
      !NON_PRESENTING_TOKENS.has(normalized) &&
      !normalized.startsWith('no presentation') &&
      !normalized.startsWith('not presenting') &&
      !normalized.startsWith('delegate only')
    );
  });
  return tokens.length > 0 ? Array.from(new Set(tokens)).join(', ') : 'None';
}

/**
 * Classifies an abstract's FINAL ALLOTTED presentation format (never participant preference).
 */
export function classifyAllottedPresentationFormat(
  abs: AbstractRecord
): AllottedFormatCategory | null {
  const raw = (abs.allottedPresentationFormat || abs.finalPresentationFormat || '')
    .trim()
    .toLowerCase();

  if (
    !raw ||
    raw === 'none' ||
    raw === 'pending allocation' ||
    raw === 'awaiting allocation' ||
    raw === 'unassigned'
  ) {
    return null;
  }

  // Check E-Poster before Poster because "e-poster" contains "poster"
  if (raw.includes('e-poster') || raw.includes('eposter') || raw.includes('e poster')) {
    return 'eposter';
  }
  if (raw.includes('oral')) {
    return 'oral';
  }
  if (raw.includes('poster')) {
    return 'poster';
  }

  return null;
}

export interface RegistrationInstitutionStats {
  totalRegistrations: number;
  internalRegistrations: number;
  externalRegistrations: number;
  unclassifiedRegistrations: number;
}

export interface SubmittedPresentationEntry {
  canonicalRegKey: string;
  registration: RegistrationRecord;
  abstract: AbstractRecord;
}

export interface PresentationDashboardMetrics {
  eligibleRegistrations: RegistrationRecord[];
  submittedEntries: SubmittedPresentationEntry[];
  notSubmittedRegistrations: RegistrationRecord[];
  awaitingDecisionAbstracts: AbstractRecord[];
  acceptedAbstracts: AbstractRecord[];
  rejectedAbstracts: AbstractRecord[];
  oralAllottedAbstracts: AbstractRecord[];
  posterAllottedAbstracts: AbstractRecord[];
  eposterAllottedAbstracts: AbstractRecord[];

  counts: {
    registeredForPresentation: number;
    abstractsSubmitted: number;
    notSubmitted: number;
    awaitingAcceptanceDecision: number;
    abstractsPendingTotal: number;
    acceptedAbstracts: number;
    rejectedAbstracts: number;
    oralAllotted: number;
    posterAllotted: number;
    eposterAllotted: number;
  };

  // Lookup structures for O(1) filtering & row rendering
  abstractByCanonicalRegKey: Map<string, AbstractRecord>;
  registrationByAbstractId: Map<string, RegistrationRecord>;
  submittedAbstractIdSet: Set<string>;
  awaitingDecisionAbstractIdSet: Set<string>;
  acceptedAbstractIdSet: Set<string>;
  rejectedAbstractIdSet: Set<string>;
  oralAllottedAbstractIdSet: Set<string>;
  posterAllottedAbstractIdSet: Set<string>;
  eposterAllottedAbstractIdSet: Set<string>;
  notSubmittedRegKeySet: Set<string>;
}

function getRegistrationCompletenessScore(reg: RegistrationRecord): number {
  let score = 0;
  if (reg.registrationId && reg.registrationId.trim()) score += 4;
  if (reg.linkedAbstractId) score += 2;
  if (reg.paymentStatus === 'Verified') score += 1;
  return score;
}

function getAbstractPriorityScore(abs: AbstractRecord): number {
  let score = 0;
  if (abs.status === 'Accepted') score += 4;
  else if (abs.status === 'Under Review') score += 3;
  else if (abs.status === 'Submitted') score += 2;
  if (classifyAllottedPresentationFormat(abs)) score += 2;
  return score;
}

function deduplicateRegistrations(
  registrations: RegistrationRecord[]
): Map<string, RegistrationRecord> {
  const canonicalRegMap = new Map<string, RegistrationRecord>();

  for (const reg of registrations) {
    const primaryKey = normalizeRegKey(reg.registrationId) || normalizeRegKey(reg.id);
    if (!primaryKey) continue;

    const existing = canonicalRegMap.get(primaryKey);
    if (!existing) {
      canonicalRegMap.set(primaryKey, reg);
    } else {
      const existingScore = getRegistrationCompletenessScore(existing);
      const currentScore = getRegistrationCompletenessScore(reg);
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const currentTime = new Date(reg.updatedAt || reg.createdAt || 0).getTime();
      if (
        currentScore > existingScore ||
        (currentScore === existingScore && currentTime > existingTime)
      ) {
        canonicalRegMap.set(primaryKey, reg);
      }
    }
  }

  return canonicalRegMap;
}

/**
 * Computes Registration Management statistics across ALL successfully registered
 * participants (including non-presenting delegates), deduplicated by Registration ID.
 */
export function computeRegistrationInstitutionStats(
  registrations: RegistrationRecord[]
): RegistrationInstitutionStats {
  const deduped = deduplicateRegistrations(registrations);
  let totalRegistrations = 0;
  let internalRegistrations = 0;
  let externalRegistrations = 0;
  let unclassifiedRegistrations = 0;

  for (const reg of deduped.values()) {
    totalRegistrations += 1;
    const category = normalizeInstitutionCategory(reg.institutionCategory);
    if (category === 'internal') {
      internalRegistrations += 1;
    } else if (category === 'external') {
      externalRegistrations += 1;
    } else {
      unclassifiedRegistrations += 1;
    }
  }

  return {
    totalRegistrations,
    internalRegistrations,
    externalRegistrations,
    unclassifiedRegistrations,
  };
}

/**
 * Computes all real-time Scientific Presentation Dashboard counts and filter sets
 * strictly from live Registration and Abstract records, optionally scoped by
 * `institutionFilter` ('all' | 'internal' | 'external').
 */
export function computePresentationDashboardMetrics(
  registrations: RegistrationRecord[],
  abstracts: AbstractRecord[],
  institutionFilter: InstitutionFilterValue = 'all'
): PresentationDashboardMetrics {
  // 1. Deduplicate registrations by canonical Registration ID (or doc ID fallback)
  const canonicalRegMap = deduplicateRegistrations(registrations);
  const lookupKeyToCanonicalKey = new Map<string, string>();

  // 2. Keep ONLY registrations matching institutionFilter AND having a valid presentation opt-in
  //    (paymentStatus is ignored; non-presenting delegates are excluded).
  const eligibleRegistrations: RegistrationRecord[] = [];
  const eligibleByCanonicalKey = new Map<string, RegistrationRecord>();

  for (const [canonicalKey, reg] of canonicalRegMap.entries()) {
    if (institutionFilter !== 'all') {
      const instCat = normalizeInstitutionCategory(reg.institutionCategory);
      if (instCat !== institutionFilter) continue;
    }

    if (!isPresentationEligibleRegistration(reg)) continue;

    eligibleRegistrations.push(reg);
    eligibleByCanonicalKey.set(canonicalKey, reg);

    const regIdKey = normalizeRegKey(reg.registrationId);
    const docIdKey = normalizeRegKey(reg.id);
    if (regIdKey) lookupKeyToCanonicalKey.set(regIdKey, canonicalKey);
    if (docIdKey) lookupKeyToCanonicalKey.set(docIdKey, canonicalKey);
  }

  // 3. Deduplicate abstracts by Abstract ID and match strictly 1:1 to eligible registrations
  const uniqueAbstractsById = new Map<string, AbstractRecord>();
  for (const abs of abstracts) {
    const absKey = normalizeRegKey(abs.id);
    if (!absKey) continue;
    if (!uniqueAbstractsById.has(absKey)) {
      uniqueAbstractsById.set(absKey, abs);
    }
  }

  const abstractByCanonicalRegKey = new Map<string, AbstractRecord>();

  for (const abs of uniqueAbstractsById.values()) {
    let matchedCanonicalKey =
      lookupKeyToCanonicalKey.get(normalizeRegKey(abs.registrationId)) ||
      lookupKeyToCanonicalKey.get(normalizeRegKey(abs.registrationDocId));

    // Fallback check: registration explicitly links to this abstract ID
    if (!matchedCanonicalKey) {
      const absIdKey = normalizeRegKey(abs.id);
      for (const [canonicalKey, reg] of eligibleByCanonicalKey.entries()) {
        if (reg.linkedAbstractId && normalizeRegKey(reg.linkedAbstractId) === absIdKey) {
          matchedCanonicalKey = canonicalKey;
          break;
        }
      }
    }

    if (!matchedCanonicalKey) {
      continue;
    }

    const existingAbs = abstractByCanonicalRegKey.get(matchedCanonicalKey);
    if (!existingAbs) {
      abstractByCanonicalRegKey.set(matchedCanonicalKey, abs);
    } else {
      const existingScore = getAbstractPriorityScore(existingAbs);
      const currentScore = getAbstractPriorityScore(abs);
      const existingTime = new Date(existingAbs.updatedAt || existingAbs.createdAt || 0).getTime();
      const currentTime = new Date(abs.updatedAt || abs.createdAt || 0).getTime();
      if (
        currentScore > existingScore ||
        (currentScore === existingScore && currentTime > existingTime)
      ) {
        abstractByCanonicalRegKey.set(matchedCanonicalKey, abs);
      }
    }
  }

  // 4. Derive every dashboard bucket cleanly
  const submittedEntries: SubmittedPresentationEntry[] = [];
  const notSubmittedRegistrations: RegistrationRecord[] = [];
  const awaitingDecisionAbstracts: AbstractRecord[] = [];
  const acceptedAbstracts: AbstractRecord[] = [];
  const rejectedAbstracts: AbstractRecord[] = [];
  const oralAllottedAbstracts: AbstractRecord[] = [];
  const posterAllottedAbstracts: AbstractRecord[] = [];
  const eposterAllottedAbstracts: AbstractRecord[] = [];

  const registrationByAbstractId = new Map<string, RegistrationRecord>();
  const submittedAbstractIdSet = new Set<string>();
  const awaitingDecisionAbstractIdSet = new Set<string>();
  const acceptedAbstractIdSet = new Set<string>();
  const rejectedAbstractIdSet = new Set<string>();
  const oralAllottedAbstractIdSet = new Set<string>();
  const posterAllottedAbstractIdSet = new Set<string>();
  const eposterAllottedAbstractIdSet = new Set<string>();
  const notSubmittedRegKeySet = new Set<string>();

  for (const reg of eligibleRegistrations) {
    const canonicalKey = normalizeRegKey(reg.registrationId) || normalizeRegKey(reg.id);
    const abs = abstractByCanonicalRegKey.get(canonicalKey);

    if (!abs) {
      notSubmittedRegistrations.push(reg);
      notSubmittedRegKeySet.add(canonicalKey);
      continue;
    }

    submittedEntries.push({ canonicalRegKey: canonicalKey, registration: reg, abstract: abs });
    submittedAbstractIdSet.add(abs.id);
    registrationByAbstractId.set(abs.id, reg);

    if (abs.status === 'Accepted') {
      acceptedAbstracts.push(abs);
      acceptedAbstractIdSet.add(abs.id);
    } else if (abs.status === 'Rejected') {
      rejectedAbstracts.push(abs);
      rejectedAbstractIdSet.add(abs.id);
    } else {
      awaitingDecisionAbstracts.push(abs);
      awaitingDecisionAbstractIdSet.add(abs.id);
    }

    // Final Presentation Format Allocation cards (strictly from final allotted field, never preference)
    if (abs.status !== 'Rejected') {
      const allottedCategory = classifyAllottedPresentationFormat(abs);
      if (allottedCategory === 'oral') {
        oralAllottedAbstracts.push(abs);
        oralAllottedAbstractIdSet.add(abs.id);
      } else if (allottedCategory === 'poster') {
        posterAllottedAbstracts.push(abs);
        posterAllottedAbstractIdSet.add(abs.id);
      } else if (allottedCategory === 'eposter') {
        eposterAllottedAbstracts.push(abs);
        eposterAllottedAbstractIdSet.add(abs.id);
      }
    }
  }

  return {
    eligibleRegistrations,
    submittedEntries,
    notSubmittedRegistrations,
    awaitingDecisionAbstracts,
    acceptedAbstracts,
    rejectedAbstracts,
    oralAllottedAbstracts,
    posterAllottedAbstracts,
    eposterAllottedAbstracts,
    counts: {
      registeredForPresentation: eligibleRegistrations.length,
      abstractsSubmitted: submittedEntries.length,
      notSubmitted: notSubmittedRegistrations.length,
      awaitingAcceptanceDecision: awaitingDecisionAbstracts.length,
      abstractsPendingTotal:
        notSubmittedRegistrations.length + awaitingDecisionAbstracts.length,
      acceptedAbstracts: acceptedAbstracts.length,
      rejectedAbstracts: rejectedAbstracts.length,
      oralAllotted: oralAllottedAbstracts.length,
      posterAllotted: posterAllottedAbstracts.length,
      eposterAllotted: eposterAllottedAbstracts.length,
    },
    abstractByCanonicalRegKey,
    registrationByAbstractId,
    submittedAbstractIdSet,
    awaitingDecisionAbstractIdSet,
    acceptedAbstractIdSet,
    rejectedAbstractIdSet,
    oralAllottedAbstractIdSet,
    posterAllottedAbstractIdSet,
    eposterAllottedAbstractIdSet,
    notSubmittedRegKeySet,
  };
}
