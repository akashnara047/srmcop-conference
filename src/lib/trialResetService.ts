import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import {
  db,
  storage,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  executeFullDatabaseBackup,
  verifyBackupAuthorization,
  type BackupExecutionResult,
  type BackupProgressUpdate,
} from './backupService';
import {
  ALLOCATION_COUNTER_MAP,
  OFFICIAL_ALLOCATION_CATEGORIES,
  formatAllocationId,
} from './presentationAllocationService';

export const TRIAL_RESET_STAGES = [
  'Creating mandatory full database ZIP backup',
  'Scanning registrations, abstracts & email logs',
  'Deleting registration & abstract records',
  'Clearing associated duplicate-prevention email logs',
  'Resetting registration, abstract & presentation allocation counters to 0',
  'Verifying clean post-reset state',
] as const;

export type TrialResetStageLabel = (typeof TRIAL_RESET_STAGES)[number];

export type TrialResetCounterId =
  | 'registrationCounter'
  | 'abstractCounter'
  | 'allocationCounterOral'
  | 'allocationCounterPoster'
  | 'allocationCounterEposter';

export interface CounterPreviewDetail {
  counterId: TrialResetCounterId;
  label: string;
  exists: boolean;
  storedSequenceNumber: number | null;
  currentSequenceNumber: number;
  proposedResetSequenceNumber: 0;
  currentNextId: string;
  proposedNextId: string;
}

export interface TrialResetProgressUpdate {
  stageIndex: number;
  stageLabel: TrialResetStageLabel;
  percent: number;
  detail: string;
  backupProgress?: BackupProgressUpdate;
}

export interface TrialResetPreviewStats {
  registrationsCount: number;
  abstractsCount: number;
  emailLogsTotalCount: number;
  associatedEmailLogsCount: number;
  unrelatedEmailLogsCount: number;
  registrationCounterSeq: number;
  abstractCounterSeq: number;
  allocationCounterOralSeq: number;
  allocationCounterPosterSeq: number;
  allocationCounterEposterSeq: number;
  currentNextRegistrationId: string;
  currentNextAbstractId: string;
  currentNextAllocationOralId: string;
  currentNextAllocationPosterId: string;
  currentNextAllocationEposterId: string;
  counters: Record<TrialResetCounterId, CounterPreviewDetail>;
}

export interface PreservedCollectionsStatus {
  admins: number;
  accommodationProperties: number;
  touristAttractions: number;
  contactEnquiries: number;
  databaseBackups: number;
  adminAuditLogs: number;
}

export interface TrialResetVerificationReport {
  executedAt: string;
  executedBy: string;
  backupId: string;
  backupFilename: string;
  backupStatus: 'complete' | 'incomplete';
  registrationsFound: number;
  registrationsDeleted: number;
  abstractsFound: number;
  abstractsDeleted: number;
  emailLogsTotalBefore: number;
  emailLogsCleared: number;
  emailLogsPreserved: number;
  storageObjectsDeleted: number;
  storageObjectsSkipped: number;
  registrationCounterBefore: number;
  registrationCounterAfter: number;
  registrationCounterExistedBefore: boolean;
  abstractCounterBefore: number;
  abstractCounterAfter: number;
  abstractCounterExistedBefore: boolean;
  allocationCounterOralBefore: number;
  allocationCounterOralAfter: number;
  allocationCounterOralExistedBefore: boolean;
  allocationCounterPosterBefore: number;
  allocationCounterPosterAfter: number;
  allocationCounterPosterExistedBefore: boolean;
  allocationCounterEposterBefore: number;
  allocationCounterEposterAfter: number;
  allocationCounterEposterExistedBefore: boolean;
  nextRegistrationId: string;
  nextAbstractId: string;
  nextAllocationOralId: string;
  nextAllocationPosterId: string;
  nextAllocationEposterId: string;
  remainingRegistrationsAfter: number;
  remainingAbstractsAfter: number;
  remainingAssociatedEmailLogsAfter: number;
  preservedCollectionsBefore: PreservedCollectionsStatus;
  preservedCollectionsAfter: PreservedCollectionsStatus;
}

const REGISTRATION_OR_ABSTRACT_EMAIL_TYPES = new Set([
  'registration_received',
  'registration_confirmation',
  'abstract_confirmation',
  'abstract_acceptance',
]);

const EMAIL_EVENT_PREFIXES = [
  'EMAIL_REG_RECEIVED_',
  'EMAIL_REG_CONFIRMED_',
  'EMAIL_ABS_SUBMITTED_',
  'EMAIL_ABS_ACCEPTED_',
] as const;

const SEQUENTIAL_REG_ID_PATTERN = /^AICONDD\d+$/i;
const SEQUENTIAL_ABS_ID_PATTERN = /^AICONDD-ABS-\d+$/i;
const SEQUENTIAL_ALLOC_EVENT_PATTERN =
  /^EMAIL_PRES_ALLOC_AICONDD-(?:OR|POST|EPOST)-2027-\d+(?:_(?:1|R\d+))?$/i;

function formatRegIdFromSeq(seq: number): string {
  return `AICONDD${String(seq + 1).padStart(3, '0')}`;
}

function formatAbsIdFromSeq(seq: number): string {
  return `AICONDD-ABS-${String(seq + 1).padStart(3, '0')}`;
}

function extractStorageUrlsFromRecord(raw: DocumentData): string[] {
  const candidates = [
    raw.supportingDocumentUrl,
    raw.paymentProofUrl,
    raw.paymentReceiptUrl,
  ];
  const urls: string[] = [];
  for (const val of candidates) {
    if (
      typeof val === 'string' &&
      val.trim().length > 0 &&
      !val.includes('...[secured]') &&
      (val.startsWith('gs://') || val.includes('firebasestorage.googleapis.com'))
    ) {
      urls.push(val.trim());
    }
  }
  return urls;
}

async function fetchAllCollectionDocs(
  collectionName: string
): Promise<Array<{ id: string; ref: DocumentReference; data: DocumentData }>> {
  const pageSize = 500;
  const results: Array<{ id: string; ref: DocumentReference; data: DocumentData }> = [];
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

  try {
    while (true) {
      const q: Query<DocumentData> = lastDoc
        ? query(
            collection(db, collectionName),
            orderBy(documentId()),
            startAfter(lastDoc),
            limit(pageSize)
          )
        : query(collection(db, collectionName), orderBy(documentId()), limit(pageSize));

      const snap: QuerySnapshot<DocumentData> = await getDocs(q);
      if (snap.empty) break;

      for (const d of snap.docs) {
        results.push({ id: d.id, ref: d.ref, data: d.data() });
      }

      if (snap.docs.length < pageSize) break;
      lastDoc = snap.docs[snap.docs.length - 1];
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
  }

  return results;
}

function isAssociatedEmailLog(
  logId: string,
  data: DocumentData,
  deletedRegKeys: Set<string>,
  deletedAbsKeys: Set<string>
): boolean {
  const upperId = logId.trim().toUpperCase();
  const type = typeof data.type === 'string' ? data.type.trim() : '';
  const regId = typeof data.registrationId === 'string' ? data.registrationId.trim().toUpperCase() : '';
  const regDocId = typeof data.regDocId === 'string' ? data.regDocId.trim().toUpperCase() : '';
  const absId = typeof data.abstractId === 'string' ? data.abstractId.trim().toUpperCase() : '';
  const refId = typeof data.referenceId === 'string' ? data.referenceId.trim().toUpperCase() : '';

  // Direct link to any registration or abstract record being deleted
  if (
    (regId && deletedRegKeys.has(regId)) ||
    (regDocId && deletedRegKeys.has(regDocId)) ||
    (refId && deletedRegKeys.has(refId)) ||
    (absId && deletedAbsKeys.has(absId)) ||
    (refId && deletedAbsKeys.has(refId))
  ) {
    return true;
  }

  // Canonical sequential event IDs (e.g., EMAIL_REG_RECEIVED_AICONDD001, EMAIL_ABS_SUBMITTED_AICONDD-ABS-001)
  // Must be cleared so fresh trial run participants starting from AICONDD001 / AICONDD-ABS-001 are not blocked
  // by deterministic duplicate-email prevention.
  for (const prefix of EMAIL_EVENT_PREFIXES) {
    if (upperId.startsWith(prefix)) {
      const suffix = upperId.slice(prefix.length);
      if (
        deletedRegKeys.has(suffix) ||
        deletedAbsKeys.has(suffix) ||
        SEQUENTIAL_REG_ID_PATTERN.test(suffix) ||
        SEQUENTIAL_ABS_ID_PATTERN.test(suffix)
      ) {
        return true;
      }
    }
  }

  if (SEQUENTIAL_ALLOC_EVENT_PATTERN.test(upperId)) {
    return true;
  }

  // Fallback for any registration/abstract email log referencing sequential IDs
  if (REGISTRATION_OR_ABSTRACT_EMAIL_TYPES.has(type)) {
    if (
      SEQUENTIAL_REG_ID_PATTERN.test(regId) ||
      SEQUENTIAL_REG_ID_PATTERN.test(refId) ||
      SEQUENTIAL_ABS_ID_PATTERN.test(absId) ||
      SEQUENTIAL_ABS_ID_PATTERN.test(refId)
    ) {
      return true;
    }
  }

  return false;
}

async function deleteDocRefsInBatches(
  refs: DocumentReference[],
  collectionPath: string
): Promise<number> {
  if (refs.length === 0) return 0;
  const BATCH_SIZE = 400;
  let deleted = 0;

  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const refItem of chunk) {
      batch.delete(refItem);
    }
    try {
      await batch.commit();
      deleted += chunk.length;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, collectionPath);
    }
  }

  return deleted;
}

interface CounterReadState {
  exists: boolean;
  storedSequenceNumber: number | null;
  effectiveSequenceNumber: number;
}

async function readCounterState(counterId: TrialResetCounterId): Promise<CounterReadState> {
  try {
    const snap = await getDoc(doc(db, 'systemCounters', counterId));
    if (!snap.exists()) {
      return {
        exists: false,
        storedSequenceNumber: null,
        effectiveSequenceNumber: 0,
      };
    }
    const raw = snap.data()?.lastSequenceNumber;
    const validSeq =
      typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null;
    return {
      exists: true,
      storedSequenceNumber: validSeq,
      effectiveSequenceNumber: validSeq ?? 0,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `systemCounters/${counterId}`);
  }
}

function buildCounterPreviewDetail(
  counterId: TrialResetCounterId,
  label: string,
  state: CounterReadState,
  formatNextIdFn: (seq: number) => string
): CounterPreviewDetail {
  return {
    counterId,
    label,
    exists: state.exists,
    storedSequenceNumber: state.storedSequenceNumber,
    currentSequenceNumber: state.effectiveSequenceNumber,
    proposedResetSequenceNumber: 0,
    currentNextId: formatNextIdFn(state.effectiveSequenceNumber),
    proposedNextId: formatNextIdFn(0),
  };
}

async function readAllFiveCounterStates(): Promise<{
  registration: CounterReadState;
  abstract: CounterReadState;
  oral: CounterReadState;
  poster: CounterReadState;
  eposter: CounterReadState;
}> {
  const [registration, abstract, oral, poster, eposter] = await Promise.all([
    readCounterState('registrationCounter'),
    readCounterState('abstractCounter'),
    readCounterState('allocationCounterOral'),
    readCounterState('allocationCounterPoster'),
    readCounterState('allocationCounterEposter'),
  ]);
  return { registration, abstract, oral, poster, eposter };
}

async function readPreservedCollectionsCounts(): Promise<PreservedCollectionsStatus> {
  const readCount = async (col: string): Promise<number> => {
    try {
      const snap = await getDocs(collection(db, col));
      return snap.size;
    } catch {
      return 0;
    }
  };

  const [
    admins,
    accommodationProperties,
    touristAttractions,
    contactEnquiries,
    databaseBackups,
    adminAuditLogs,
  ] = await Promise.all([
    readCount('admins'),
    readCount('accommodationProperties'),
    readCount('touristAttractions'),
    readCount('contactEnquiries'),
    readCount('databaseBackups'),
    readCount('adminAuditLogs'),
  ]);

  return {
    admins,
    accommodationProperties,
    touristAttractions,
    contactEnquiries,
    databaseBackups,
    adminAuditLogs,
  };
}

/**
 * Fetches a live read-only preview of records and all five sequence counters that will
 * be affected by a trial-run reset. Requires Organising Secretary authorization.
 */
export async function fetchTrialResetPreviewStats(): Promise<TrialResetPreviewStats> {
  await verifyBackupAuthorization();

  const [regDocs, absDocs, emailDocs, counterStates] = await Promise.all([
    fetchAllCollectionDocs('registrations'),
    fetchAllCollectionDocs('abstractSubmissions'),
    fetchAllCollectionDocs('emailLogs'),
    readAllFiveCounterStates(),
  ]);

  const deletedRegKeys = new Set<string>();
  const deletedAbsKeys = new Set<string>();

  for (const r of regDocs) {
    deletedRegKeys.add(r.id.trim().toUpperCase());
    if (typeof r.data.registrationId === 'string' && r.data.registrationId.trim()) {
      deletedRegKeys.add(r.data.registrationId.trim().toUpperCase());
    }
    if (typeof r.data.linkedAbstractId === 'string' && r.data.linkedAbstractId.trim()) {
      deletedAbsKeys.add(r.data.linkedAbstractId.trim().toUpperCase());
    }
  }
  for (const a of absDocs) {
    deletedAbsKeys.add(a.id.trim().toUpperCase());
  }

  let associatedEmailLogsCount = 0;
  for (const log of emailDocs) {
    if (isAssociatedEmailLog(log.id, log.data, deletedRegKeys, deletedAbsKeys)) {
      associatedEmailLogsCount += 1;
    }
  }

  const counters: Record<TrialResetCounterId, CounterPreviewDetail> = {
    registrationCounter: buildCounterPreviewDetail(
      'registrationCounter',
      'Registration Counter',
      counterStates.registration,
      formatRegIdFromSeq
    ),
    abstractCounter: buildCounterPreviewDetail(
      'abstractCounter',
      'Abstract Counter',
      counterStates.abstract,
      formatAbsIdFromSeq
    ),
    allocationCounterOral: buildCounterPreviewDetail(
      'allocationCounterOral',
      'Oral Presentation Allocation Counter',
      counterStates.oral,
      (seq) => formatAllocationId('Oral Presentation', seq + 1)
    ),
    allocationCounterPoster: buildCounterPreviewDetail(
      'allocationCounterPoster',
      'Poster Presentation Allocation Counter',
      counterStates.poster,
      (seq) => formatAllocationId('Poster Presentation', seq + 1)
    ),
    allocationCounterEposter: buildCounterPreviewDetail(
      'allocationCounterEposter',
      'E-Poster Presentation Allocation Counter',
      counterStates.eposter,
      (seq) => formatAllocationId('E-Poster Presentation', seq + 1)
    ),
  };

  return {
    registrationsCount: regDocs.length,
    abstractsCount: absDocs.length,
    emailLogsTotalCount: emailDocs.length,
    associatedEmailLogsCount,
    unrelatedEmailLogsCount: emailDocs.length - associatedEmailLogsCount,
    registrationCounterSeq: counterStates.registration.effectiveSequenceNumber,
    abstractCounterSeq: counterStates.abstract.effectiveSequenceNumber,
    allocationCounterOralSeq: counterStates.oral.effectiveSequenceNumber,
    allocationCounterPosterSeq: counterStates.poster.effectiveSequenceNumber,
    allocationCounterEposterSeq: counterStates.eposter.effectiveSequenceNumber,
    currentNextRegistrationId: counters.registrationCounter.currentNextId,
    currentNextAbstractId: counters.abstractCounter.currentNextId,
    currentNextAllocationOralId: counters.allocationCounterOral.currentNextId,
    currentNextAllocationPosterId: counters.allocationCounterPoster.currentNextId,
    currentNextAllocationEposterId: counters.allocationCounterEposter.currentNextId,
    counters,
  };
}

/**
 * Executes the complete SRMCON 2027 pre-trial data reset in strict safe order:
 * 1. Mandatory full database backup ZIP export & download
 * 2. Snapshot counts & preserved collections baseline
 * 3. Delete all registrations & abstractSubmissions
 * 4. Clear only associated emailLogs (preserving unrelated logs)
 * 5. Atomically reset all 5 systemCounters (registrationCounter, abstractCounter,
 *    allocationCounterOral, allocationCounterPoster, allocationCounterEposter) to 0
 *    in a single Firestore writeBatch
 * 6. Write AdminAuditLog entry and verify clean post-reset state
 */
export async function executeTrialRunReset(
  onProgress: (update: TrialResetProgressUpdate) => void,
  options?: { allowIncompleteBackup?: boolean }
): Promise<TrialResetVerificationReport> {
  const adminUser = await verifyBackupAuthorization();
  const adminEmail = adminUser.email || 'org.secy.cp@srmist.edu.in';

  // STAGE 1: Mandatory Full Backup First
  onProgress({
    stageIndex: 0,
    stageLabel: TRIAL_RESET_STAGES[0],
    percent: 10,
    detail: 'Creating and downloading full pre-reset ZIP backup before modifying any records...',
  });

  const backupResult: BackupExecutionResult = await executeFullDatabaseBackup((backupProgress) => {
    onProgress({
      stageIndex: 0,
      stageLabel: TRIAL_RESET_STAGES[0],
      percent: Math.min(35, Math.max(10, Math.round(10 + backupProgress.percent * 0.25))),
      detail: `Backup step: ${backupProgress.stageLabel}`,
      backupProgress,
    });
  });

  if (backupResult.manifest.status !== 'complete' && !options?.allowIncompleteBackup) {
    throw new Error(
      `Reset aborted for data safety: the pre-reset backup finished with ${backupResult.manifest.errors.length} error(s). Resolve the backup error or download the partial backup before retrying.`
    );
  }

  // STAGE 2: Scan records, email logs & baseline counts
  onProgress({
    stageIndex: 1,
    stageLabel: TRIAL_RESET_STAGES[1],
    percent: 42,
    detail: 'Collecting exact pre-reset document lists and all five counter states...',
  });

  const [
    regDocs,
    absDocs,
    paymentTxDocs,
    uniquenessResDocs,
    emailDocs,
    countersBefore,
    preservedBefore,
  ] = await Promise.all([
    fetchAllCollectionDocs('registrations'),
    fetchAllCollectionDocs('abstractSubmissions'),
    fetchAllCollectionDocs('paymentTransactions'),
    fetchAllCollectionDocs('uniquenessReservations'),
    fetchAllCollectionDocs('emailLogs'),
    readAllFiveCounterStates(),
    readPreservedCollectionsCounts(),
  ]);

  const deletedRegKeys = new Set<string>();
  const deletedAbsKeys = new Set<string>();
  const storageUrlsToDelete = new Set<string>();

  for (const r of regDocs) {
    deletedRegKeys.add(r.id.trim().toUpperCase());
    if (typeof r.data.registrationId === 'string' && r.data.registrationId.trim()) {
      deletedRegKeys.add(r.data.registrationId.trim().toUpperCase());
    }
    if (typeof r.data.linkedAbstractId === 'string' && r.data.linkedAbstractId.trim()) {
      deletedAbsKeys.add(r.data.linkedAbstractId.trim().toUpperCase());
    }
    for (const url of extractStorageUrlsFromRecord(r.data)) {
      storageUrlsToDelete.add(url);
    }
  }

  for (const a of absDocs) {
    deletedAbsKeys.add(a.id.trim().toUpperCase());
    for (const url of extractStorageUrlsFromRecord(a.data)) {
      storageUrlsToDelete.add(url);
    }
  }

  const associatedEmailRefs: DocumentReference[] = [];
  for (const log of emailDocs) {
    if (isAssociatedEmailLog(log.id, log.data, deletedRegKeys, deletedAbsKeys)) {
      associatedEmailRefs.push(log.ref);
    }
  }

  // STAGE 3: Delete registrations & abstractSubmissions
  onProgress({
    stageIndex: 2,
    stageLabel: TRIAL_RESET_STAGES[2],
    percent: 58,
    detail: `Deleting ${regDocs.length} registration(s) and ${absDocs.length} abstract(s)...`,
  });

  const registrationsDeleted = await deleteDocRefsInBatches(
    regDocs.map((d) => d.ref),
    'registrations'
  );
  const abstractsDeleted = await deleteDocRefsInBatches(
    absDocs.map((d) => d.ref),
    'abstractSubmissions'
  );
  await deleteDocRefsInBatches(
    paymentTxDocs.map((d) => d.ref),
    'paymentTransactions'
  );
  await deleteDocRefsInBatches(
    uniquenessResDocs.map((d) => d.ref),
    'uniquenessReservations'
  );

  // Best-effort cleanup of referenced Firebase Storage objects (non-fatal)
  let storageObjectsDeleted = 0;
  let storageObjectsSkipped = 0;
  for (const url of storageUrlsToDelete) {
    try {
      await deleteObject(ref(storage, url));
      storageObjectsDeleted += 1;
    } catch {
      storageObjectsSkipped += 1;
    }
  }

  // STAGE 4: Clear only associated email logs
  onProgress({
    stageIndex: 3,
    stageLabel: TRIAL_RESET_STAGES[3],
    percent: 74,
    detail: `Clearing ${associatedEmailRefs.length} linked email log(s) and preserving ${emailDocs.length - associatedEmailRefs.length} unrelated log(s)...`,
  });

  const emailLogsCleared = await deleteDocRefsInBatches(associatedEmailRefs, 'emailLogs');

  // STAGE 5: Atomically reset all 5 sequence counters in one Firestore writeBatch
  onProgress({
    stageIndex: 4,
    stageLabel: TRIAL_RESET_STAGES[4],
    percent: 88,
    detail:
      'Atomically resetting registrationCounter, abstractCounter, and all three presentation allocation counters to 0...',
  });

  const resetIso = new Date().toISOString();
  try {
    const counterResetBatch = writeBatch(db);

    counterResetBatch.set(
      doc(db, 'systemCounters', 'registrationCounter'),
      {
        lastSequenceNumber: 0,
        updatedAt: resetIso,
      },
      { merge: true }
    );

    counterResetBatch.set(
      doc(db, 'systemCounters', 'abstractCounter'),
      {
        lastSequenceNumber: 0,
        updatedAt: resetIso,
      },
      { merge: true }
    );

    for (const category of OFFICIAL_ALLOCATION_CATEGORIES) {
      const spec = ALLOCATION_COUNTER_MAP[category];
      counterResetBatch.set(
        doc(db, 'systemCounters', spec.counterId),
        {
          lastSequenceNumber: 0,
          prefix: spec.prefix,
          category,
          updatedAt: resetIso,
          updatedBy: adminEmail,
        },
        { merge: true }
      );
    }

    await counterResetBatch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'systemCounters');
  }

  // Record audit trail entry
  try {
    const auditId = `TRIAL_RESET_${Date.now()}`;
    await setDoc(doc(db, 'adminAuditLogs', auditId), {
      id: auditId,
      adminEmail,
      action: 'TRIAL_RUN_RESET',
      targetId: 'registrations_abstracts_counters',
      details: `Pre-trial reset completed after backup ${backupResult.filename}. Deleted ${registrationsDeleted} registrations, ${abstractsDeleted} abstracts, ${emailLogsCleared} linked email logs. Atomically reset all 5 counters (registrationCounter, abstractCounter, allocationCounterOral, allocationCounterPoster, allocationCounterEposter) to 0.`,
      timestamp: resetIso,
    });
  } catch (auditErr) {
    console.warn('Non-fatal warning writing trial reset audit log:', auditErr);
  }

  // STAGE 6: Verify clean post-reset state
  onProgress({
    stageIndex: 5,
    stageLabel: TRIAL_RESET_STAGES[5],
    percent: 95,
    detail: 'Verifying empty collections, all five reset counters, and preserved conference data...',
  });

  const [
    remainingRegs,
    remainingAbs,
    remainingEmailDocs,
    countersAfter,
    preservedAfter,
  ] = await Promise.all([
    fetchAllCollectionDocs('registrations'),
    fetchAllCollectionDocs('abstractSubmissions'),
    fetchAllCollectionDocs('emailLogs'),
    readAllFiveCounterStates(),
    readPreservedCollectionsCounts(),
  ]);

  let remainingAssociatedEmailLogsAfter = 0;
  for (const log of remainingEmailDocs) {
    if (isAssociatedEmailLog(log.id, log.data, deletedRegKeys, deletedAbsKeys)) {
      remainingAssociatedEmailLogsAfter += 1;
    }
  }

  onProgress({
    stageIndex: 5,
    stageLabel: TRIAL_RESET_STAGES[5],
    percent: 100,
    detail:
      'Trial-run reset verified and ready for fresh registrations (AICONDD001), abstracts (AICONDD-ABS-001), and allocations (-001).',
  });

  return {
    executedAt: resetIso,
    executedBy: adminEmail,
    backupId: backupResult.backupId,
    backupFilename: backupResult.filename,
    backupStatus: backupResult.manifest.status,
    registrationsFound: regDocs.length,
    registrationsDeleted,
    abstractsFound: absDocs.length,
    abstractsDeleted,
    emailLogsTotalBefore: emailDocs.length,
    emailLogsCleared,
    emailLogsPreserved: remainingEmailDocs.length,
    storageObjectsDeleted,
    storageObjectsSkipped,
    registrationCounterBefore: countersBefore.registration.effectiveSequenceNumber,
    registrationCounterAfter: countersAfter.registration.effectiveSequenceNumber,
    registrationCounterExistedBefore: countersBefore.registration.exists,
    abstractCounterBefore: countersBefore.abstract.effectiveSequenceNumber,
    abstractCounterAfter: countersAfter.abstract.effectiveSequenceNumber,
    abstractCounterExistedBefore: countersBefore.abstract.exists,
    allocationCounterOralBefore: countersBefore.oral.effectiveSequenceNumber,
    allocationCounterOralAfter: countersAfter.oral.effectiveSequenceNumber,
    allocationCounterOralExistedBefore: countersBefore.oral.exists,
    allocationCounterPosterBefore: countersBefore.poster.effectiveSequenceNumber,
    allocationCounterPosterAfter: countersAfter.poster.effectiveSequenceNumber,
    allocationCounterPosterExistedBefore: countersBefore.poster.exists,
    allocationCounterEposterBefore: countersBefore.eposter.effectiveSequenceNumber,
    allocationCounterEposterAfter: countersAfter.eposter.effectiveSequenceNumber,
    allocationCounterEposterExistedBefore: countersBefore.eposter.exists,
    nextRegistrationId: formatRegIdFromSeq(countersAfter.registration.effectiveSequenceNumber),
    nextAbstractId: formatAbsIdFromSeq(countersAfter.abstract.effectiveSequenceNumber),
    nextAllocationOralId: formatAllocationId(
      'Oral Presentation',
      countersAfter.oral.effectiveSequenceNumber + 1
    ),
    nextAllocationPosterId: formatAllocationId(
      'Poster Presentation',
      countersAfter.poster.effectiveSequenceNumber + 1
    ),
    nextAllocationEposterId: formatAllocationId(
      'E-Poster Presentation',
      countersAfter.eposter.effectiveSequenceNumber + 1
    ),
    remainingRegistrationsAfter: remainingRegs.length,
    remainingAbstractsAfter: remainingAbs.length,
    remainingAssociatedEmailLogsAfter,
    preservedCollectionsBefore: preservedBefore,
    preservedCollectionsAfter: preservedAfter,
  };
}

export function formatTrialResetTextReport(report: TrialResetVerificationReport): string {
  const formatBeforeLabel = (before: number, existed: boolean) =>
    existed ? String(before) : `missing (effective ${before})`;

  return [
    '====================================================================',
    'SRMCON 2027 – PRE-TRIAL DATA RESET & VERIFICATION REPORT',
    '====================================================================',
    `Executed At (UTC)             : ${report.executedAt}`,
    `Executed By                   : ${report.executedBy}`,
    `Pre-Reset Backup Archive      : ${report.backupFilename} (${report.backupStatus.toUpperCase()})`,
    '',
    '1. DELETION & CLEANUP SUMMARY',
    `   - Registrations Found      : ${report.registrationsFound}`,
    `   - Registrations Deleted    : ${report.registrationsDeleted}`,
    `   - Abstracts Found          : ${report.abstractsFound}`,
    `   - Abstracts Deleted        : ${report.abstractsDeleted}`,
    `   - Email Logs Cleared       : ${report.emailLogsCleared} (of ${report.emailLogsTotalBefore} total)`,
    `   - Unrelated Logs Preserved : ${report.emailLogsPreserved}`,
    `   - Storage Files Removed    : ${report.storageObjectsDeleted}${report.storageObjectsSkipped > 0 ? ` (${report.storageObjectsSkipped} skipped/missing)` : ''}`,
    '',
    '2. SEQUENCE COUNTER VERIFICATION (ALL 5 COUNTERS)',
    `   - registrationCounter      : ${formatBeforeLabel(report.registrationCounterBefore, report.registrationCounterExistedBefore)} -> ${report.registrationCounterAfter}`,
    `   - Next Registration ID     : ${report.nextRegistrationId}`,
    `   - abstractCounter          : ${formatBeforeLabel(report.abstractCounterBefore, report.abstractCounterExistedBefore)} -> ${report.abstractCounterAfter}`,
    `   - Next Abstract ID         : ${report.nextAbstractId}`,
    `   - allocationCounterOral    : ${formatBeforeLabel(report.allocationCounterOralBefore, report.allocationCounterOralExistedBefore)} -> ${report.allocationCounterOralAfter}`,
    `   - Next Oral Alloc ID       : ${report.nextAllocationOralId}`,
    `   - allocationCounterPoster  : ${formatBeforeLabel(report.allocationCounterPosterBefore, report.allocationCounterPosterExistedBefore)} -> ${report.allocationCounterPosterAfter}`,
    `   - Next Poster Alloc ID     : ${report.nextAllocationPosterId}`,
    `   - allocationCounterEposter : ${formatBeforeLabel(report.allocationCounterEposterBefore, report.allocationCounterEposterExistedBefore)} -> ${report.allocationCounterEposterAfter}`,
    `   - Next E-Poster Alloc ID   : ${report.nextAllocationEposterId}`,
    '',
    '3. POST-RESET STATE & PRESERVED COLLECTIONS',
    `   - Remaining Registrations  : ${report.remainingRegistrationsAfter}`,
    `   - Remaining Abstracts      : ${report.remainingAbstractsAfter}`,
    `   - Remaining Linked Logs    : ${report.remainingAssociatedEmailLogsAfter}`,
    `   - admins                   : ${report.preservedCollectionsAfter.admins} doc(s)`,
    `   - accommodationProperties  : ${report.preservedCollectionsAfter.accommodationProperties} doc(s)`,
    `   - touristAttractions       : ${report.preservedCollectionsAfter.touristAttractions} doc(s)`,
    `   - contactEnquiries         : ${report.preservedCollectionsAfter.contactEnquiries} doc(s)`,
    `   - databaseBackups          : ${report.preservedCollectionsAfter.databaseBackups} doc(s)`,
    `   - adminAuditLogs           : ${report.preservedCollectionsAfter.adminAuditLogs} doc(s)`,
    '====================================================================',
  ].join('\n');
}
