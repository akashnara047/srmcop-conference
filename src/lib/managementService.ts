import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  runTransaction,
  deleteDoc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';
import { formatFoodPreferenceDisplay } from './presentationDashboardStats';
import {
  generateRegistrationSubmissionReceiptPDF,
  createRegistrationSubmissionReceiptPreviewUrl,
  generateRegistrationConfirmationPDF,
  generateRegistrationConfirmationPDFBase64,
  createRegistrationConfirmationPreviewUrl,
  generateAbstractSubmissionAckPDF,
  generateAbstractSubmissionAckPDFBase64,
  createAbstractSubmissionAckPreviewUrl,
  generateAbstractAcceptanceLetterPDF,
  generateAbstractAcceptanceLetterPDFBase64,
  createAbstractAcceptanceLetterPreviewUrl,
  type PdfAttachmentOutput,
} from './pdfDocuments';
import {
  PAYMENT_TRANSACTIONS_COLLECTION,
  DuplicateTransactionReferenceError,
  isDuplicateTransactionReferenceError,
  normalizeTransactionReference,
  computeTransactionReferenceKey,
  type PaymentTransactionLockRecord,
} from './utrValidationService';

export interface RegistrationRecord {
  id: string; // Document ID (e.g. REG-...)
  registrationId?: string | null; // Official sequential ID: AICONDD001
  fullName: string;
  email: string;
  mobile: string;
  courseOrDesignation?: string;
  institution: string;
  institutionCategory?: 'internal' | 'external' | null;
  city?: string;
  country?: string;
  category: string;
  otherCategoryDescription?: string;
  participationMode?: string;
  modeOfParticipation?: string;
  presentationPlans?: string[];
  presentationPlan?: string;
  participatePharmaQuest?: string;
  pharmaQuest?: string;
  dietaryPreference?: string;
  specialRequirements?: string;
  paymentMode?: string;
  transactionReference: string;
  normalizedTransactionReference?: string;
  transactionReferenceKey?: string;
  paymentAmount?: number;
  amount?: number;
  paymentProofName?: string;
  paymentReceiptName?: string;
  paymentProofData?: string;
  paymentReceiptData?: string;
  paymentProofUrl?: string;
  paymentStatus: 'Pending Verification' | 'Under Verification' | 'Verified' | 'Rejected';
  registrationStatus: 'Awaiting Approval' | 'Approved' | 'Rejected';
  adminRemarks?: string;
  duplicateUtrExceptionApproved?: boolean;
  duplicateUtrExceptionReason?: string;
  duplicateUtrExceptionApprovedBy?: string;
  duplicateUtrExceptionApprovedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
  linkedAbstractId?: string | null;
  abstractSubmitted?: boolean;
  abstractSubmissionDate?: string | null;
  recordType?: 'live' | 'test';
}

export interface DuplicateUtrExceptionPayload {
  approved: boolean;
  reason: string;
  conflictingRegistrationIds: string[];
}

export interface AbstractRecord {
  id: string; // Official sequential ID: AICONDD-ABS-001
  registrationId: string; // Mandatory linked registration ID: AICONDD001
  registrationDocId?: string;
  title: string;
  trackId: string;
  presentationPreference: 'Oral Presentation' | 'Poster Presentation' | 'E-Poster Presentation' | string;
  presentationType?: string;
  presentingAuthor: {
    fullName?: string;
    name?: string;
    email: string;
    mobile?: string;
    phone?: string;
    designation?: string;
    affiliation?: string;
    institution?: string;
  };
  coAuthors?: Array<{
    name: string;
    affiliation: string;
  }>;
  abstractContent?: {
    text?: string;
    background?: string;
    objective?: string;
    methodology?: string;
    results?: string;
    conclusion?: string;
  } | string;
  keywords?: string[];
  status: 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected';
  allottedPresentationFormat?: 'Oral Presentation' | 'Poster Presentation' | 'E-Poster Presentation' | string | null;
  finalPresentationFormat?: 'Oral Presentation' | 'Poster Presentation' | 'E-Poster Presentation' | string | null;
  allottedBy?: string;
  allottedAt?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  supportingDocumentName?: string;
  supportingDocumentSize?: number;
  supportingDocumentType?: string;
  supportingDocumentUrl?: string;
  supportingDocumentData?: string;
  recordType?: 'live' | 'test';
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// 0. AUTOMATIC ATOMIC REGISTRATION ID ALLOCATION & SUBMISSION (AICONDDxxx)
//    WITH MANDATORY SERVER-SIDE / TRANSACTIONAL UTR UNIQUENESS ENFORCEMENT
// ---------------------------------------------------------------------------
export async function submitConferenceRegistration(
  registrationData: Omit<RegistrationRecord, 'id' | 'registrationId' | 'createdAt'>
): Promise<{ regDoc: RegistrationRecord; regId: string }> {
  const trimmedUtr = (registrationData.transactionReference || '').trim();
  const normalizedUtr = normalizeTransactionReference(trimmedUtr);
  if (!normalizedUtr) {
    throw new Error('Transaction / Reference Number is required.');
  }

  const utrKey = await computeTransactionReferenceKey(normalizedUtr);
  const utrLockRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, utrKey);
  const counterRef = doc(db, 'systemCounters', 'registrationCounter');
  const timestamp = new Date().toISOString();

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Atomically verify UTR uniqueness BEFORE reading/incrementing the registration ID counter.
      //    If two concurrent submissions attempt the same UTR, Firestore's serializable transaction
      //    commits at most one and retries the other, which sees utrLockSnap.exists() === true
      //    and rejects immediately without saving a duplicate or wasting a registration sequence ID.
      const utrLockSnap = await transaction.get(utrLockRef);
      if (utrLockSnap.exists()) {
        const existingLock = utrLockSnap.data() as Partial<PaymentTransactionLockRecord>;
        throw new DuplicateTransactionReferenceError({
          normalizedUtr,
          utrKey,
          conflictingRegistrationId: existingLock.registrationId,
        });
      }

      // 2. Fetch current sequence counter atomically (no read of registrations collection)
      const counterSnap = await transaction.get(counterRef);
      const currentSeq = counterSnap.exists()
        ? (counterSnap.data()?.lastSequenceNumber || 0)
        : 0;
      const nextSeq = currentSeq + 1;

      // Format: AICONDD001, AICONDD002, AICONDD003... (monotonically increasing, 3-digit minimum zero padding)
      const newRegId = `AICONDD${String(nextSeq).padStart(3, '0')}`;
      const regRef = doc(db, 'registrations', newRegId);

      // 3. Increment atomic counter (never decremented, numbers never reused even if records are deleted)
      transaction.set(
        counterRef,
        {
          lastSequenceNumber: nextSeq,
          updatedAt: timestamp,
        },
        { merge: true }
      );

      // 4. Claim atomic PII-free UTR lock document
      const lockDoc: PaymentTransactionLockRecord = {
        id: utrKey,
        normalizedTransactionReference: normalizedUtr,
        registrationId: newRegId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      transaction.set(utrLockRef, lockDoc);

      // 5. Construct and save the official registration record
      const regDoc: RegistrationRecord = {
        ...registrationData,
        transactionReference: trimmedUtr,
        normalizedTransactionReference: normalizedUtr,
        transactionReferenceKey: utrKey,
        id: newRegId,
        registrationId: newRegId,
        createdAt: timestamp,
      };
      transaction.set(regRef, regDoc);

      return { regDoc, regId: newRegId };
    });

    return result;
  } catch (error) {
    if (isDuplicateTransactionReferenceError(error)) {
      throw error;
    }
    console.error('Error submitting conference registration:', error);
    handleFirestoreError(error, OperationType.WRITE, 'registrations');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 0B. ATOMIC REJECTED-PAYMENT UTR RESUBMISSION (ALLOWS OWN UTR, BLOCKS OTHERS)
// ---------------------------------------------------------------------------
export async function resubmitRejectedRegistrationUtr(params: {
  regDocId: string;
  newTransactionReference: string;
}): Promise<{
  transactionReference: string;
  normalizedTransactionReference: string;
  transactionReferenceKey: string;
  paymentStatus: 'Pending Verification';
  updatedAt: string;
}> {
  const regDocId = params.regDocId.trim();
  const trimmedUtr = params.newTransactionReference.trim();
  const normalizedUtr = normalizeTransactionReference(trimmedUtr);

  if (!regDocId) {
    throw new Error('Registration identifier is missing.');
  }
  if (!normalizedUtr) {
    throw new Error('Please enter a valid UTR / payment transaction reference.');
  }

  const newUtrKey = await computeTransactionReferenceKey(normalizedUtr);
  const regRef = doc(db, 'registrations', regDocId);
  const newLockRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, newUtrKey);
  const timestamp = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Read registration document and verify it is eligible for rejected-payment resubmission
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error('Registration record not found.');
      }
      const regData = regSnap.data() as RegistrationRecord;
      if (regData.paymentStatus !== 'Rejected') {
        throw new Error('Transaction reference can only be resubmitted when payment status is Rejected.');
      }

      // 2. Check new UTR lock atomically
      const newLockSnap = await transaction.get(newLockRef);
      const regDocIdUpper = regDocId.toUpperCase();
      let needCreateNewLock = true;

      if (newLockSnap.exists()) {
        const existingLock = newLockSnap.data() as Partial<PaymentTransactionLockRecord>;
        const lockOwnerUpper = (existingLock.registrationId || '').trim().toUpperCase();
        if (lockOwnerUpper && lockOwnerUpper !== regDocIdUpper) {
          throw new DuplicateTransactionReferenceError({
            normalizedUtr,
            utrKey: newUtrKey,
            conflictingRegistrationId: existingLock.registrationId,
          });
        }
        // Participant's own registration already holds this exact UTR lock -> allow without false duplicate
        needCreateNewLock = false;
      }

      // 3. Determine if an old UTR lock owned by this same registration should be released
      const oldUtrKey =
        regData.transactionReferenceKey ||
        (regData.transactionReference
          ? await computeTransactionReferenceKey(regData.transactionReference)
          : '');
      let oldLockRefToDelete: ReturnType<typeof doc> | null = null;
      if (oldUtrKey && oldUtrKey !== newUtrKey) {
        const candidateOldRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, oldUtrKey);
        const oldLockSnap = await transaction.get(candidateOldRef);
        if (oldLockSnap.exists()) {
          const oldOwnerUpper = (
            (oldLockSnap.data() as Partial<PaymentTransactionLockRecord>).registrationId || ''
          )
            .trim()
            .toUpperCase();
          if (oldOwnerUpper === regDocIdUpper) {
            oldLockRefToDelete = candidateOldRef;
          }
        }
      }

      // 4. Commit all writes atomically
      if (needCreateNewLock) {
        const lockDoc: PaymentTransactionLockRecord = {
          id: newUtrKey,
          normalizedTransactionReference: normalizedUtr,
          registrationId: regDocId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        transaction.set(newLockRef, lockDoc);
      }

      if (oldLockRefToDelete) {
        transaction.delete(oldLockRefToDelete);
      }

      transaction.update(regRef, {
        transactionReference: trimmedUtr,
        normalizedTransactionReference: normalizedUtr,
        transactionReferenceKey: newUtrKey,
        paymentStatus: 'Pending Verification',
        updatedAt: timestamp,
      });
    });

    return {
      transactionReference: trimmedUtr,
      normalizedTransactionReference: normalizedUtr,
      transactionReferenceKey: newUtrKey,
      paymentStatus: 'Pending Verification',
      updatedAt: timestamp,
    };
  } catch (error) {
    if (isDuplicateTransactionReferenceError(error)) {
      throw error;
    }
    console.error('Error resubmitting rejected registration UTR:', error);
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${regDocId}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 1. ATOMIC REGISTRATION ID ALLOCATION (AICONDDxxx)
// ---------------------------------------------------------------------------
export async function verifyPaymentAndAllocateRegId(
  regDocId: string,
  adminEmail: string,
  remarks?: string,
  duplicateException?: DuplicateUtrExceptionPayload
): Promise<string> {
  const counterRef = doc(db, 'systemCounters', 'registrationCounter');
  const regRef = doc(db, 'registrations', regDocId);
  const nowIso = new Date().toISOString();

  if (duplicateException?.approved && duplicateException.reason.trim().length < 5) {
    throw new Error(
      'An explicit authorised exception reason is required before verifying a registration with a duplicate UTR.'
    );
  }

  const exceptionMetadata = duplicateException?.approved
    ? {
        duplicateUtrExceptionApproved: true,
        duplicateUtrExceptionReason: duplicateException.reason.trim(),
        duplicateUtrExceptionApprovedBy: adminEmail,
        duplicateUtrExceptionApprovedAt: nowIso,
      }
    : {};

  let verifiedTransactionReference = '';

  try {
    const allocatedId = await runTransaction(db, async (transaction) => {
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error('Registration document not found.');
      }
      const regData = regSnap.data() as RegistrationRecord;
      verifiedTransactionReference = regData.transactionReference || '';

      const effectiveRemarks = duplicateException?.approved
        ? `[DUPLICATE UTR EXCEPTION AUTHORISED: ${duplicateException.reason.trim()}]${
            remarks ? ` ${remarks}` : ''
          }`.slice(0, 500)
        : remarks || regData.adminRemarks || 'Payment verified.';

      // If already has an official registration ID, preserve it
      if (regData.registrationId && regData.registrationId.startsWith('AICONDD')) {
        transaction.update(regRef, {
          paymentStatus: 'Verified',
          registrationStatus: 'Approved',
          verifiedBy: adminEmail,
          verifiedAt: nowIso,
          updatedAt: nowIso,
          adminRemarks: effectiveRemarks,
          ...exceptionMetadata,
        });
        return regData.registrationId;
      }

      // Fetch atomic counter
      const counterSnap = await transaction.get(counterRef);
      const currentSeq = counterSnap.exists()
        ? (counterSnap.data()?.lastSequenceNumber || 0)
        : 0;
      const nextSeq = currentSeq + 1;

      // Format: AICONDD001, AICONDD002, etc. (3-digit zero-padding minimum)
      const newRegId = `AICONDD${String(nextSeq).padStart(3, '0')}`;

      // Update counter
      transaction.set(
        counterRef,
        {
          lastSequenceNumber: nextSeq,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Update registration record
      transaction.update(regRef, {
        registrationId: newRegId,
        paymentStatus: 'Verified',
        registrationStatus: 'Approved',
        verifiedBy: adminEmail,
        verifiedAt: nowIso,
        updatedAt: nowIso,
        adminRemarks: duplicateException?.approved
          ? effectiveRemarks
          : remarks || 'Payment verified. Official Registration ID assigned.',
        ...exceptionMetadata,
      });

      return newRegId;
    });

    // Write immutable audit trail entry when Organising Secretary authorises a duplicate UTR exception
    if (duplicateException?.approved) {
      try {
        const auditId = `DUP_UTR_EXC_${Date.now()}_${allocatedId}`;
        await setDoc(doc(db, 'adminAuditLogs', auditId), {
          id: auditId,
          adminEmail,
          action: 'DUPLICATE_UTR_VERIFICATION_EXCEPTION',
          targetId: allocatedId,
          details: `Authorised verification exception for ${allocatedId} (UTR: ${verifiedTransactionReference}). Conflicting record(s): ${
            duplicateException.conflictingRegistrationIds.join(', ') || 'Recorded'
          }. Reason: ${duplicateException.reason.trim()}`,
          timestamp: nowIso,
        });
      } catch (auditErr) {
        console.warn('Non-fatal warning writing duplicate UTR exception audit log:', auditErr);
      }
    }

    return allocatedId;
  } catch (error) {
    console.error('Error verifying payment and allocating registration ID:', error);
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${regDocId}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. VERIFY REGISTRATION FOR ABSTRACT SUBMISSION (STRICT 1:1 ENFORCEMENT)
// ---------------------------------------------------------------------------
export async function verifyRegistrationForAbstractSubmission(
  enteredRegId: string,
  enteredEmail?: string
): Promise<{ valid: boolean; registration: RegistrationRecord; regDocId: string }> {
  const cleanId = enteredRegId.trim().toUpperCase();

  if (!cleanId) {
    throw new Error('Please enter your official Registration ID (e.g. AICONDD001).');
  }

  try {
    // 1. Single-document getDoc by Registration ID / document ID (Allowed for public by security rules)
    const directSnap = await getDoc(doc(db, 'registrations', cleanId));
    if (!directSnap.exists()) {
      throw new Error(
        `Registration ID "${cleanId}" was not found. Please ensure you enter the official Registration ID allocated to you after successful conference registration (e.g. AICONDD001).`
      );
    }

    const regData = directSnap.data() as RegistrationRecord;
    regData.id = directSnap.id;

    // Validation Check 2: Email match (if email is provided)
    if (enteredEmail && enteredEmail.trim()) {
      const cleanEmail = enteredEmail.trim().toLowerCase();
      if (regData.email.trim().toLowerCase() !== cleanEmail) {
        throw new Error(
          'Email address does not match the registered delegate email for this Registration ID.'
        );
      }
    }

    // Validation Check 3: Strict 1:1 check (Already submitted)
    if (regData.linkedAbstractId || regData.abstractSubmitted) {
      const linkedId = regData.linkedAbstractId || 'on record';
      throw new Error(
        `An abstract has already been submitted using Registration ID ${cleanId} (Abstract ID: ${linkedId}). Each registration is permitted exactly one abstract submission.`
      );
    }

    return {
      valid: true,
      registration: regData,
      regDocId: cleanId,
    };
  } catch (error: any) {
    if (
      error.message &&
      (error.message.includes('not found') ||
        error.message.includes('does not match') ||
        error.message.includes('already been submitted') ||
        error.message.includes('Registration ID'))
    ) {
      throw error;
    }
    console.error('Error verifying registration for abstract submission:', error);
    handleFirestoreError(error, OperationType.GET, `registrations/${cleanId}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. ATOMIC ABSTRACT ID ALLOCATION & SUBMISSION (AICONDD-ABS-xxx)
// ---------------------------------------------------------------------------
export async function submitAbstractWithAtomicId(params: {
  registrationId: string;
  regDocId: string;
  title: string;
  trackId: string;
  presentationPreference: string;
  presentingAuthor: {
    fullName: string;
    email: string;
    mobile: string;
    designation: string;
    affiliation: string;
  };
  coAuthors: Array<{ name: string; affiliation: string }>;
  abstractContent: string;
  keywords: string[];
  supportingDocumentFile?: File | null;
  supportingDocumentData?: string;
  recordType?: 'live' | 'test';
}): Promise<string> {
  const counterRef = doc(db, 'systemCounters', 'abstractCounter');
  const regRef = doc(db, 'registrations', params.regDocId);

  // Attempt optional supporting document storage outside the Firestore transaction
  let supportingDocumentUrl: string | undefined;
  let supportingDocumentData: string | undefined;
  let supportingDocumentName: string | undefined;
  let supportingDocumentSize: number | undefined;
  let supportingDocumentType: string | undefined;

  if (params.supportingDocumentFile) {
    const file = params.supportingDocumentFile;
    supportingDocumentName = file.name;
    supportingDocumentSize = file.size;
    supportingDocumentType = file.type;

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `abstract-documents/${params.registrationId}/${Date.now()}_${safeName}`);
      await uploadBytes(storageRef, file);
      supportingDocumentUrl = await getDownloadURL(storageRef);
    } catch (storageErr) {
      console.warn('Firebase Storage upload skipped or unavailable, falling back if file fits Firestore limit:', storageErr);
      if (params.supportingDocumentData && params.supportingDocumentData.length <= 750000) {
        supportingDocumentData = params.supportingDocumentData;
      }
    }
  }

  try {
    const allocatedAbstractId = await runTransaction(db, async (transaction) => {
      // 1. Verify registration again inside transaction to prevent race conditions
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error('Associated registration could not be found.');
      }
      const regData = regSnap.data() as RegistrationRecord;
      if (regData.linkedAbstractId || regData.abstractSubmitted) {
        throw new Error(
          `An abstract has already been submitted for Registration ID ${params.registrationId}.`
        );
      }

      // 2. Fetch abstract sequence counter
      const counterSnap = await transaction.get(counterRef);
      const currentSeq = counterSnap.exists()
        ? (counterSnap.data()?.lastSequenceNumber || 0)
        : 0;
      const nextSeq = currentSeq + 1;

      // Format: AICONDD-ABS-001, AICONDD-ABS-002, etc.
      const newAbstractId = `AICONDD-ABS-${String(nextSeq).padStart(3, '0')}`;
      const abstractDocRef = doc(db, 'abstractSubmissions', newAbstractId);

      // 3. Increment counter
      transaction.set(
        counterRef,
        {
          lastSequenceNumber: nextSeq,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 4. Create abstract document
      const timestamp = new Date().toISOString();
      const abstractData: AbstractRecord = {
        id: newAbstractId,
        registrationId: params.registrationId,
        registrationDocId: params.regDocId,
        title: params.title.trim(),
        trackId: params.trackId,
        presentationPreference: params.presentationPreference,
        presentationType: params.presentationPreference,
        presentingAuthor: {
          ...params.presentingAuthor,
          name: params.presentingAuthor.fullName,
          phone: params.presentingAuthor.mobile,
          institution: params.presentingAuthor.affiliation,
        },
        coAuthors: params.coAuthors,
        abstractContent: {
          text: params.abstractContent.trim(),
        },
        keywords: params.keywords,
        ...(supportingDocumentName ? { supportingDocumentName } : {}),
        ...(supportingDocumentSize !== undefined ? { supportingDocumentSize } : {}),
        ...(supportingDocumentType ? { supportingDocumentType } : {}),
        ...(supportingDocumentUrl ? { supportingDocumentUrl } : {}),
        ...(supportingDocumentData ? { supportingDocumentData } : {}),
        status: 'Submitted',
        reviewNotes: '',
        recordType: params.recordType || regData.recordType || 'live',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      transaction.set(abstractDocRef, abstractData);

      // 5. Update linked registration record
      transaction.update(regRef, {
        linkedAbstractId: newAbstractId,
        abstractSubmitted: true,
        abstractSubmissionDate: timestamp,
        updatedAt: timestamp,
      });

      return newAbstractId;
    });

    return allocatedAbstractId;
  } catch (error) {
    console.error('Error allocating abstract ID and submitting:', error);
    handleFirestoreError(error, OperationType.WRITE, 'abstractSubmissions');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. DELETION LOGIC (SAFE UNLINKING & PRESERVING COUNTER NUMBERS)
// ---------------------------------------------------------------------------
async function deleteEmailLogIdsSafely(logIds: string[]): Promise<void> {
  const uniqueIds = Array.from(
    new Set(logIds.map((id) => id.trim().toUpperCase()).filter(Boolean))
  );
  for (const logId of uniqueIds) {
    try {
      await deleteDoc(doc(db, 'emailLogs', logId));
    } catch (e) {
      console.warn(`[managementService] Non-fatal email log cleanup note (${logId}):`, e);
    }
  }
}

export async function deleteAbstractRecord(
  abstractId: string,
  registrationDocId?: string,
  registrationId?: string
): Promise<void> {
  try {
    // 1. Delete abstract document
    await deleteDoc(doc(db, 'abstractSubmissions', abstractId));

    // 2. Remove associated abstract email logs so stale notifications are not orphaned
    const absKey = abstractId.trim().toUpperCase();
    await deleteEmailLogIdsSafely([
      `EMAIL_ABS_SUBMITTED_${absKey}`,
      `EMAIL_ABS_ACCEPTED_${absKey}`,
    ]);

    // 3. Unlink the registration document so the delegate can submit a replacement
    let targetRegDocId = registrationDocId;
    if (!targetRegDocId && registrationId) {
      const q = query(
        collection(db, 'registrations'),
        where('registrationId', '==', registrationId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        targetRegDocId = snap.docs[0].id;
      }
    }

    if (targetRegDocId) {
      await updateDoc(doc(db, 'registrations', targetRegDocId), {
        linkedAbstractId: null,
        abstractSubmitted: false,
        abstractSubmissionDate: null,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error deleting abstract:', error);
    handleFirestoreError(error, OperationType.DELETE, `abstractSubmissions/${abstractId}`);
    throw error;
  }
}

export async function deleteRegistrationRecord(
  regDocId: string,
  linkedAbstractId?: string | null,
  deleteLinkedAbstract: boolean = false,
  registrationId?: string | null
): Promise<void> {
  try {
    // 1. If linked abstract exists and user opted to delete it
    if (linkedAbstractId && deleteLinkedAbstract) {
      try {
        await deleteDoc(doc(db, 'abstractSubmissions', linkedAbstractId));
        const absKey = linkedAbstractId.trim().toUpperCase();
        await deleteEmailLogIdsSafely([
          `EMAIL_ABS_SUBMITTED_${absKey}`,
          `EMAIL_ABS_ACCEPTED_${absKey}`,
        ]);
      } catch (e) {
        console.warn('Could not delete linked abstract during registration deletion:', e);
      }
    }

    // 1B. Inspect registration's UTR lock before deleting so we only release locks owned by this record
    let utrKeyToRelease = '';
    try {
      const existingRegSnap = await getDoc(doc(db, 'registrations', regDocId));
      if (existingRegSnap.exists()) {
        const regData = existingRegSnap.data() as Partial<RegistrationRecord>;
        utrKeyToRelease =
          regData.transactionReferenceKey ||
          (regData.transactionReference
            ? await computeTransactionReferenceKey(regData.transactionReference)
            : '');
      }
    } catch (lookupErr) {
      console.warn('[managementService] Non-fatal UTR lock lookup warning before deletion:', lookupErr);
    }

    // 2. Delete registration document
    await deleteDoc(doc(db, 'registrations', regDocId));

    // 2B. Release associated UTR lock ONLY if this deleted registration owned it
    if (utrKeyToRelease) {
      try {
        const lockRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, utrKeyToRelease);
        const lockSnap = await getDoc(lockRef);
        if (lockSnap.exists()) {
          const lockOwner = (
            (lockSnap.data() as Partial<PaymentTransactionLockRecord>).registrationId || ''
          )
            .trim()
            .toUpperCase();
          if (lockOwner === regDocId.trim().toUpperCase()) {
            await deleteDoc(lockRef);
          }
        }
      } catch (lockErr) {
        console.warn('[managementService] Non-fatal UTR lock cleanup warning:', lockErr);
      }
    }

    // 3. Remove associated registration email logs so stale notifications are not orphaned
    const regKeys = [regDocId, registrationId || '']
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);
    const regLogIds = regKeys.flatMap((key) => [
      `EMAIL_REG_RECEIVED_${key}`,
      `EMAIL_REG_CONFIRMED_${key}`,
    ]);
    await deleteEmailLogIdsSafely(regLogIds);
  } catch (error) {
    console.error('Error deleting registration:', error);
    handleFirestoreError(error, OperationType.DELETE, `registrations/${regDocId}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. EXCEL EXPORT HELPERS (XLSX)
// ---------------------------------------------------------------------------
function formatExcelInstitutionCategory(value?: string | null): string {
  if (typeof value !== 'string') return 'Unclassified';
  const cleaned = value.trim().toLowerCase();
  if (cleaned === 'internal') return 'Internal';
  if (cleaned === 'external') return 'External';
  return 'Unclassified';
}

export function exportRegistrationsToExcel(registrations: RegistrationRecord[], filename = 'AICONDD_Registrations_2027.xlsx') {
  const data = registrations.map((r) => ({
    'Official Reg ID': r.registrationId || 'Pending Verification',
    'Application Ref': r.id,
    'Participant Name': r.fullName,
    'Email Address': r.email,
    'Mobile Number': r.mobile,
    'Category': r.category + (r.otherCategoryDescription ? ` (${r.otherCategoryDescription})` : ''),
    'Course / Designation': r.courseOrDesignation || '',
    'Institution Category': formatExcelInstitutionCategory(r.institutionCategory),
    'Institution / University': r.institution || '',
    'City': r.city || '',
    'Country': r.country || '',
    'Participation Mode': r.participationMode || '',
    'PharmaQuest Participation': r.participatePharmaQuest || 'No',
    'Food Preference': formatFoodPreferenceDisplay(r),
    'Payment Fee (INR)': r.paymentAmount || r.amount || 2000,
    'Payment Mode': r.paymentMode || '',
    'Transaction Reference (UTR)': r.transactionReference || '',
    'Payment Status': r.paymentStatus,
    'Registration Status': r.registrationStatus,
    'Linked Abstract ID': r.linkedAbstractId || 'None',
    'Verified By': r.verifiedBy || '',
    'Verified At': r.verifiedAt ? new Date(r.verifiedAt).toLocaleString() : '',
    'Submission Date': r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
    'Record Type': (r.recordType || 'live').toUpperCase(),
    'Admin Remarks': r.adminRemarks || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
  XLSX.writeFile(workbook, filename);
}

export function exportAbstractsToExcel(
  abstracts: AbstractRecord[],
  filename = 'AICONDD_Abstract_Submissions_2027.xlsx',
  registrations?: RegistrationRecord[]
) {
  const regMap = new Map<string, RegistrationRecord>();
  if (registrations) {
    registrations.forEach((r) => {
      if (r.registrationId) regMap.set(r.registrationId.trim().toUpperCase(), r);
      regMap.set(r.id.trim().toUpperCase(), r);
    });
  }

  const data = abstracts.map((a) => {
    const author = a.presentingAuthor || {};
    const coAuthorStr = (a.coAuthors || []).map((c) => `${c.name} (${c.affiliation})`).join('; ');
    const abstractBody = typeof a.abstractContent === 'string'
      ? a.abstractContent
      : a.abstractContent?.text || '';
    const regKey = (a.registrationId || '').trim().toUpperCase();
    const docKey = (a.registrationDocId || '').trim().toUpperCase();
    const linkedReg = (regKey ? regMap.get(regKey) : undefined) || (docKey ? regMap.get(docKey) : undefined);

    return {
      'Abstract ID': a.id,
      'Linked Registration ID': a.registrationId,
      'Institution Category': linkedReg ? formatExcelInstitutionCategory(linkedReg.institutionCategory) : 'Unclassified',
      ...(registrations ? { 'Associated Payment Status': linkedReg?.paymentStatus || 'Unknown' } : {}),
      'Title': a.title,
      'Scientific Track': a.trackId,
      'Preferred Presentation Format': a.presentationPreference || a.presentationType || '',
      'Allotted Presentation Format': a.allottedPresentationFormat || 'Awaiting Allocation',
      'Allotted By': a.allottedBy || '',
      'Allotted At': a.allottedAt ? new Date(a.allottedAt).toLocaleString() : '',
      'Presenting Author Name': author.fullName || author.name || '',
      'Presenting Author Email': author.email || '',
      'Presenting Author Phone': author.mobile || author.phone || '',
      'Presenting Author Designation': author.designation || '',
      'Presenting Author Institution': author.affiliation || author.institution || '',
      'Co-Authors': coAuthorStr || 'None',
      'Keywords': (a.keywords || []).join(', '),
      'Abstract Content': abstractBody,
      'Review Status': a.status,
      'Review Remarks': a.reviewNotes || '',
      'Submission Timestamp': a.createdAt ? new Date(a.createdAt).toLocaleString() : '',
      'Record Type': (a.recordType || 'live').toUpperCase(),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Abstracts');
  XLSX.writeFile(workbook, filename);
}

export function exportMasterParticipantsToExcel(
  registrations: RegistrationRecord[],
  abstracts: AbstractRecord[],
  filename = 'AICONDD_Master_Participants_2027.xlsx'
) {
  // Build lookup map for abstracts by registrationId
  const abstractMap = new Map<string, AbstractRecord>();
  abstracts.forEach((abs) => {
    if (abs.registrationId) {
      abstractMap.set(abs.registrationId.trim().toUpperCase(), abs);
    }
  });

  const masterRows = registrations.map((reg) => {
    const regKey = (reg.registrationId || reg.id || '').trim().toUpperCase();
    const linkedAbs = regKey ? abstractMap.get(regKey) : null;
    return {
      'Registration ID': reg.registrationId || 'Pending Verification',
      'Delegate Name': reg.fullName,
      'Email': reg.email,
      'Mobile': reg.mobile,
      'Institution Category': formatExcelInstitutionCategory(reg.institutionCategory),
      'Institution': reg.institution,
      'Category': reg.category,
      'Payment Status': reg.paymentStatus,
      'Registration Status': reg.registrationStatus,
      'Abstract Submitted?': linkedAbs ? 'YES' : 'NO',
      'Abstract ID': linkedAbs?.id || reg.linkedAbstractId || 'None',
      'Abstract Title': linkedAbs?.title || 'None',
      'Scientific Track': linkedAbs?.trackId || 'None',
      'Abstract Review Status': linkedAbs?.status || 'N/A',
      'Preferred Presentation Format': linkedAbs?.presentationPreference || reg.presentationPlan || 'None',
      'Allotted Presentation Format': linkedAbs?.allottedPresentationFormat || 'Awaiting Allocation',
      'Record Type': (reg.recordType || 'live').toUpperCase(),
    };
  });

  const workbook = XLSX.utils.book_new();
  const masterSheet = XLSX.utils.json_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(workbook, masterSheet, 'Participant Master List');

  // Also include raw sheets
  const regSheet = XLSX.utils.json_to_sheet(registrations);
  XLSX.utils.book_append_sheet(workbook, regSheet, 'All Registrations');

  const absSheet = XLSX.utils.json_to_sheet(abstracts);
  XLSX.utils.book_append_sheet(workbook, absSheet, 'All Abstracts');

  XLSX.writeFile(workbook, filename);
}

// ---------------------------------------------------------------------------
// 6–8. OFFICIAL INSTITUTIONAL PDF DOCUMENT EXPORTS (Delegated to pdfDocuments)
// ---------------------------------------------------------------------------
export {
  generateRegistrationSubmissionReceiptPDF,
  createRegistrationSubmissionReceiptPreviewUrl,
  createRegistrationConfirmationPreviewUrl,
  createAbstractSubmissionAckPreviewUrl,
  createAbstractAcceptanceLetterPreviewUrl,
  type PdfAttachmentOutput,
};

export function generateAcceptanceLetterPDF(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): void {
  generateAbstractAcceptanceLetterPDF(abstract, registration);
}

export function generateAcceptanceLetterPDFBase64(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): PdfAttachmentOutput {
  return generateAbstractAcceptanceLetterPDFBase64(abstract, registration);
}

export function generateSubmissionReceiptPDF(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): void {
  generateAbstractSubmissionAckPDF(abstract, registration);
}

export function generateSubmissionReceiptPDFBase64(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): PdfAttachmentOutput {
  return generateAbstractSubmissionAckPDFBase64(abstract, registration);
}

export function generateRegistrationReceiptPDF(reg: RegistrationRecord): void {
  generateRegistrationConfirmationPDF(reg);
}

export function generateRegistrationReceiptPDFBase64(
  reg: RegistrationRecord
): PdfAttachmentOutput {
  return generateRegistrationConfirmationPDFBase64(reg);
}
