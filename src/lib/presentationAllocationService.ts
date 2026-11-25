import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  AbstractRecord,
  AllocationEmailStatus,
  AllocationHistoryEntry,
  OfficialAllocationCategory,
} from './managementService';

export const OFFICIAL_ALLOCATION_CATEGORIES: readonly OfficialAllocationCategory[] = [
  'Oral Presentation',
  'Poster Presentation',
  'E-Poster Presentation',
] as const;

export interface AllocationCounterSpec {
  counterId: string;
  prefix: string;
  shortCode: 'OR' | 'POST' | 'EPOST';
}

export const ALLOCATION_COUNTER_MAP: Record<OfficialAllocationCategory, AllocationCounterSpec> = {
  'Oral Presentation': {
    counterId: 'allocationCounterOral',
    prefix: 'AICONDD-OR-2027-',
    shortCode: 'OR',
  },
  'Poster Presentation': {
    counterId: 'allocationCounterPoster',
    prefix: 'AICONDD-POST-2027-',
    shortCode: 'POST',
  },
  'E-Poster Presentation': {
    counterId: 'allocationCounterEposter',
    prefix: 'AICONDD-EPOST-2027-',
    shortCode: 'EPOST',
  },
};

export function isValidOfficialAllocationCategory(
  value: unknown
): value is OfficialAllocationCategory {
  return (
    value === 'Oral Presentation' ||
    value === 'Poster Presentation' ||
    value === 'E-Poster Presentation'
  );
}

export function formatAllocationId(category: OfficialAllocationCategory, seq: number): string {
  const spec = ALLOCATION_COUNTER_MAP[category];
  return `${spec.prefix}${String(seq).padStart(3, '0')}`;
}

export function isAbstractOfficiallyAllocated(abs?: Partial<AbstractRecord> | null): boolean {
  if (!abs) return false;
  return (
    abs.allocationStatus === 'Active' &&
    typeof abs.presentationAllocationId === 'string' &&
    abs.presentationAllocationId.trim().length > 0 &&
    isValidOfficialAllocationCategory(abs.officialAllocationCategory)
  );
}

export function getOfficialAllocationCategory(
  abs?: Partial<AbstractRecord> | null
): OfficialAllocationCategory | null {
  if (!abs || !isAbstractOfficiallyAllocated(abs)) return null;
  return abs.officialAllocationCategory as OfficialAllocationCategory;
}

export function getAllocationFilterCategoryKey(
  abs?: Partial<AbstractRecord> | null
): 'not_allocated' | 'oral' | 'poster' | 'eposter' {
  const cat = getOfficialAllocationCategory(abs);
  if (cat === 'Oral Presentation') return 'oral';
  if (cat === 'Poster Presentation') return 'poster';
  if (cat === 'E-Poster Presentation') return 'eposter';
  return 'not_allocated';
}

export interface ConfirmAllocationParams {
  abstractId: string;
  category: OfficialAllocationCategory;
  adminEmail: string;
  changeReason?: string;
}

export interface ConfirmAllocationResult {
  allocationId: string;
  category: OfficialAllocationCategory;
  isCategoryChange: boolean;
  previousAllocationId: string | null;
  previousCategory: OfficialAllocationCategory | null;
  allocatedAt: string;
  allocatedBy: string;
  updatedAbstract: AbstractRecord;
}

/**
 * Atomically confirms Official Presentation Allocation for an abstract using category-specific
 * Firestore sequence counters (`allocationCounterOral`, `allocationCounterPoster`, `allocationCounterEposter`).
 *
 * Guarantees:
 * - Strictly triggered ONLY on explicit admin confirmation (never on submission, approval, or dropdown change).
 * - Independent sequential numbering per category (never decremented or reused).
 * - Single Active allocation per abstract; category changes mark the previous Active entry as Superseded.
 * - Preserves participant's submitted `presentationPreference` and `presentationType` completely untouched.
 */
export async function confirmOfficialPresentationAllocation(
  params: ConfirmAllocationParams
): Promise<ConfirmAllocationResult> {
  const abstractId = (params.abstractId || '').trim();
  const adminEmail = (params.adminEmail || '').trim().toLowerCase() || 'org.secy.cp@srmist.edu.in';
  const category = params.category;
  const trimmedReason = (params.changeReason || '').trim();

  if (!abstractId) {
    throw new Error('Abstract ID is required for official presentation allocation.');
  }
  if (!isValidOfficialAllocationCategory(category)) {
    throw new Error('Select a valid Official Presentation Allocation Category.');
  }

  const spec = ALLOCATION_COUNTER_MAP[category];
  const abstractRef = doc(db, 'abstractSubmissions', abstractId);
  const counterRef = doc(db, 'systemCounters', spec.counterId);

  try {
    return await runTransaction(db, async (transaction) => {
      const [absSnap, counterSnap] = await Promise.all([
        transaction.get(abstractRef),
        transaction.get(counterRef),
      ]);

      if (!absSnap.exists()) {
        throw new Error(`Abstract ${abstractId} could not be found in Firestore.`);
      }

      const absData = { id: absSnap.id, ...absSnap.data() } as AbstractRecord;

      if (absData.status === 'Rejected') {
        throw new Error(
          `Abstract ${abstractId} has status "Rejected" and cannot be allotted an official presentation slot.`
        );
      }

      const hasExistingActive = isAbstractOfficiallyAllocated(absData);
      const previousAllocationId = hasExistingActive
        ? (absData.presentationAllocationId || '').trim() || null
        : null;
      const previousCategory = hasExistingActive
        ? (absData.officialAllocationCategory as OfficialAllocationCategory)
        : null;

      if (hasExistingActive && previousCategory === category) {
        throw new Error(
          `Abstract ${abstractId} already has an Active allocation for ${category} (${previousAllocationId}). Select a different category to change allocation.`
        );
      }

      const currentSeq = counterSnap.exists()
        ? Number(counterSnap.data()?.lastSequenceNumber || 0)
        : 0;
      const safeCurrentSeq = Number.isFinite(currentSeq) && currentSeq >= 0 ? currentSeq : 0;
      const nextSeq = safeCurrentSeq + 1;
      const newAllocationId = formatAllocationId(category, nextSeq);
      const timestamp = new Date().toISOString();

      const existingHistory: AllocationHistoryEntry[] = Array.isArray(absData.allocationHistory)
        ? absData.allocationHistory.map((entry) => {
            if (entry.status === 'Active') {
              return {
                ...entry,
                status: 'Superseded' as const,
                supersededAt: timestamp,
                supersededBy: adminEmail,
                supersededReason:
                  trimmedReason ||
                  `Official category changed from ${entry.category} to ${category}`,
              };
            }
            return entry;
          })
        : [];

      const newHistoryEntry: AllocationHistoryEntry = {
        allocationId: newAllocationId,
        category,
        status: 'Active',
        allocatedAt: timestamp,
        allocatedBy: adminEmail,
        supersededAt: null,
        supersededBy: null,
        supersededReason: null,
        emailStatus: 'Pending',
        emailSentAt: null,
        emailError: null,
      };

      const nextHistory = [...existingHistory, newHistoryEntry];

      transaction.set(
        counterRef,
        {
          lastSequenceNumber: nextSeq,
          prefix: spec.prefix,
          category,
          updatedAt: timestamp,
          updatedBy: adminEmail,
        },
        { merge: true }
      );

      const updateFields = {
        officialAllocationCategory: category,
        presentationAllocationId: newAllocationId,
        allocationStatus: 'Active' as const,
        allocationCreatedAt: timestamp,
        allocationCreatedBy: adminEmail,
        allocationEmailStatus: 'Pending' as AllocationEmailStatus,
        allocationEmailSentAt: null,
        allocationEmailError: null,
        allocationEmailAttempts: (absData.allocationEmailAttempts || 0) + 1,
        allocationHistory: nextHistory,
        allottedPresentationFormat: category,
        allottedBy: adminEmail,
        allottedAt: timestamp,
        updatedAt: timestamp,
      };

      transaction.update(abstractRef, updateFields);

      const auditId = `ALLOC_${Date.now()}_${abstractId.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase()}`;
      const auditRef = doc(db, 'adminAuditLogs', auditId);
      transaction.set(auditRef, {
        id: auditId,
        adminEmail,
        action: hasExistingActive
          ? 'CHANGE_PRESENTATION_ALLOCATION'
          : 'CONFIRM_PRESENTATION_ALLOCATION',
        targetId: abstractId,
        details: hasExistingActive
          ? `Changed official presentation allocation for ${abstractId} from ${previousCategory} (${previousAllocationId}, marked Superseded) to ${category} (${newAllocationId}).${
              trimmedReason ? ` Reason: ${trimmedReason}` : ''
            }`
          : `Confirmed official presentation allocation for ${abstractId}: ${category} (${newAllocationId}). Submitted preference preserved as "${
              absData.presentationPreference || absData.presentationType || 'Not Specified'
            }".`,
        timestamp,
      });

      const updatedAbstract: AbstractRecord = {
        ...absData,
        ...updateFields,
      };

      return {
        allocationId: newAllocationId,
        category,
        isCategoryChange: hasExistingActive,
        previousAllocationId,
        previousCategory,
        allocatedAt: timestamp,
        allocatedBy: adminEmail,
        updatedAbstract,
      };
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already has an Active allocation') ||
        error.message.includes('cannot be allotted') ||
        error.message.includes('could not be found'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `abstractSubmissions/${abstractId}`);
    throw error;
  }
}

/**
 * Updates allocation email delivery tracking on the abstract document and its matching
 * Active entry in `allocationHistory` without altering allocation IDs or sequences.
 */
export async function updateAllocationEmailTracking(params: {
  abstractId: string;
  allocationId: string;
  status: AllocationEmailStatus;
  sentAt?: string | null;
  error?: string | null;
  incrementAttempt?: boolean;
  existingHistory?: AllocationHistoryEntry[];
  currentAttempts?: number;
}): Promise<void> {
  const abstractRef = doc(db, 'abstractSubmissions', params.abstractId);
  const now = new Date().toISOString();

  const nextHistory = Array.isArray(params.existingHistory)
    ? params.existingHistory.map((entry) => {
        if (entry.allocationId === params.allocationId && entry.status === 'Active') {
          return {
            ...entry,
            emailStatus: params.status,
            emailSentAt: params.sentAt ?? entry.emailSentAt ?? null,
            emailError: params.error ?? null,
          };
        }
        return entry;
      })
    : undefined;

  const patch: Record<string, unknown> = {
    allocationEmailStatus: params.status,
    allocationEmailError: params.error ?? null,
    updatedAt: now,
  };
  if (params.sentAt !== undefined) {
    patch.allocationEmailSentAt = params.sentAt;
  }
  if (params.incrementAttempt) {
    patch.allocationEmailAttempts = (params.currentAttempts || 0) + 1;
  }
  if (nextHistory) {
    patch.allocationHistory = nextHistory;
  }

  await updateDoc(abstractRef, patch);
}
