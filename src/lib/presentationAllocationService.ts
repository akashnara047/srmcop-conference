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

export interface ApproveAndAllocateParams {
  abstractId: string;
  category: OfficialAllocationCategory;
  adminEmail: string;
  reviewNotes?: string;
}

export interface ApproveAndAllocateResult {
  allocationId: string;
  category: OfficialAllocationCategory;
  approvedAt: string;
  approvedBy: string;
  allocatedAt: string;
  allocatedBy: string;
  updatedAbstract: AbstractRecord;
}

// Client-tab synchronous in-flight guard preventing double-click / rapid duplicate submissions
const inFlightAllocationAbstractIds = new Set<string>();

function hasAnyActiveAllocationHistory(abs: Partial<AbstractRecord>): boolean {
  return (
    Array.isArray(abs.allocationHistory) &&
    abs.allocationHistory.some((entry) => entry && entry.status === 'Active')
  );
}

interface InternalAllocationTransactionParams {
  abstractId: string;
  category: OfficialAllocationCategory;
  adminEmail: string;
  mode: 'approve_and_allocate' | 'change_allocation';
  reviewNotes?: string;
  changeReason?: string;
}

async function executeUnifiedAllocationTransaction(
  params: InternalAllocationTransactionParams
): Promise<{
  allocationId: string;
  category: OfficialAllocationCategory;
  isCategoryChange: boolean;
  previousAllocationId: string | null;
  previousCategory: OfficialAllocationCategory | null;
  timestamp: string;
  adminEmail: string;
  updatedAbstract: AbstractRecord;
}> {
  const abstractId = (params.abstractId || '').trim();
  const adminEmail = (params.adminEmail || '').trim().toLowerCase() || 'org.secy.cp@srmist.edu.in';
  const category = params.category;
  const trimmedReason = (params.changeReason || '').trim();
  const trimmedReviewNotes = (params.reviewNotes || '').trim();

  if (!abstractId) {
    throw new Error('Abstract ID is required for presentation allocation.');
  }
  if (!isValidOfficialAllocationCategory(category)) {
    throw new Error(
      'Select a valid Presentation Category (Oral Presentation, Poster Presentation, or E-Poster Presentation).'
    );
  }

  if (inFlightAllocationAbstractIds.has(abstractId)) {
    throw new Error(
      `An approval and allocation request for abstract ${abstractId} is already in progress.`
    );
  }

  inFlightAllocationAbstractIds.add(abstractId);

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
          `Abstract ${abstractId} has status "Rejected" and cannot be approved or allotted a Presentation ID.`
        );
      }

      const hasExistingActive =
        isAbstractOfficiallyAllocated(absData) || hasAnyActiveAllocationHistory(absData);
      const previousAllocationId = hasExistingActive
        ? (absData.presentationAllocationId || '').trim() ||
          absData.allocationHistory?.find((h) => h.status === 'Active')?.allocationId ||
          null
        : null;
      const previousCategory = hasExistingActive
        ? ((absData.officialAllocationCategory as OfficialAllocationCategory) ||
            absData.allocationHistory?.find((h) => h.status === 'Active')?.category ||
            null)
        : null;

      if (params.mode === 'approve_and_allocate') {
        if (absData.status === 'Accepted') {
          throw new Error(
            `Abstract ${abstractId} is already Approved${
              previousAllocationId ? ` (Presentation ID: ${previousAllocationId})` : ''
            }. Duplicate approval is blocked.`
          );
        }
        if (hasExistingActive) {
          throw new Error(
            `Abstract ${abstractId} already has an Active allocation (${
              previousAllocationId || 'recorded'
            }). Multiple active allocations for the same abstract are not allowed.`
          );
        }
      } else {
        if (absData.status !== 'Accepted') {
          throw new Error(
            `Abstract ${abstractId} must be approved via "Approve & Allocate" before performing an administrative category correction.`
          );
        }
        if (hasExistingActive && previousCategory === category) {
          throw new Error(
            `Abstract ${abstractId} already has an Active allocation for ${category} (${previousAllocationId}). Select a different category to change allocation.`
          );
        }
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

      const approvalFields =
        params.mode === 'approve_and_allocate'
          ? {
              status: 'Accepted' as const,
              reviewNotes:
                trimmedReviewNotes ||
                absData.reviewNotes?.trim() ||
                'Abstract accepted by Scientific Committee.',
              reviewedBy: adminEmail,
              reviewedAt: timestamp,
            }
          : {};

      const updateFields = {
        ...approvalFields,
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

      const auditPrefix = params.mode === 'approve_and_allocate' ? 'APPROVE_ALLOC' : 'ALLOC';
      const auditNonce = Math.random().toString(36).slice(2, 7).toUpperCase();
      const auditId = `${auditPrefix}_${Date.now()}_${auditNonce}_${abstractId
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toUpperCase()}`;
      const auditRef = doc(db, 'adminAuditLogs', auditId);
      transaction.set(auditRef, {
        id: auditId,
        adminEmail,
        action:
          params.mode === 'approve_and_allocate'
            ? 'APPROVE_AND_ALLOCATE_ABSTRACT'
            : hasExistingActive
            ? 'CHANGE_PRESENTATION_ALLOCATION'
            : 'CONFIRM_PRESENTATION_ALLOCATION',
        targetId: abstractId,
        details:
          params.mode === 'approve_and_allocate'
            ? `Approved abstract ${abstractId} and allocated ${category} (${newAllocationId}) in a single atomic transaction.`
            : hasExistingActive
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
        isCategoryChange: params.mode === 'change_allocation' && hasExistingActive,
        previousAllocationId,
        previousCategory,
        timestamp,
        adminEmail,
        updatedAbstract,
      };
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already has an Active allocation') ||
        error.message.includes('already Approved') ||
        error.message.includes('Duplicate approval is blocked') ||
        error.message.includes('cannot be approved or allotted') ||
        error.message.includes('must be approved via') ||
        error.message.includes('could not be found') ||
        error.message.includes('already in progress'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `abstractSubmissions/${abstractId}`);
    throw error;
  } finally {
    inFlightAllocationAbstractIds.delete(abstractId);
  }
}

/**
 * Unified atomic operation for Run 1:
 * Approves an abstract (`status: 'Accepted'`), increments the selected category's sequential
 * counter (`allocationCounterOral` / `allocationCounterPoster` / `allocationCounterEposter`),
 * generates the Presentation ID (`AICONDD-OR-2027-xxx` / `AICONDD-POST-2027-xxx` / `AICONDD-EPOST-2027-xxx`),
 * and persists both approval and active allocation together in one Firestore transaction.
 */
export async function approveAndAllocateAbstract(
  params: ApproveAndAllocateParams
): Promise<ApproveAndAllocateResult> {
  const res = await executeUnifiedAllocationTransaction({
    abstractId: params.abstractId,
    category: params.category,
    adminEmail: params.adminEmail,
    mode: 'approve_and_allocate',
    reviewNotes: params.reviewNotes,
  });

  return {
    allocationId: res.allocationId,
    category: res.category,
    approvedAt: res.timestamp,
    approvedBy: res.adminEmail,
    allocatedAt: res.timestamp,
    allocatedBy: res.adminEmail,
    updatedAbstract: res.updatedAbstract,
  };
}

/**
 * Authorised administrative category correction for an already-approved abstract.
 * Reuses the exact same Presentation ID generator & category counters, marks the previous
 * Active allocation entry in `allocationHistory` as `Superseded`, and preserves the Original Abstract ID.
 */
export async function confirmOfficialPresentationAllocation(
  params: ConfirmAllocationParams
): Promise<ConfirmAllocationResult> {
  const res = await executeUnifiedAllocationTransaction({
    abstractId: params.abstractId,
    category: params.category,
    adminEmail: params.adminEmail,
    mode: 'change_allocation',
    changeReason: params.changeReason,
  });

  return {
    allocationId: res.allocationId,
    category: res.category,
    isCategoryChange: res.isCategoryChange,
    previousAllocationId: res.previousAllocationId,
    previousCategory: res.previousCategory,
    allocatedAt: res.timestamp,
    allocatedBy: res.adminEmail,
    updatedAbstract: res.updatedAbstract,
  };
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
