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
import {
  formatFoodPreferenceDisplay,
  validateParticipationModeForCategory,
  VIRTUAL_PARTICIPATION_MODE,
  normalizeFoodPreferenceValue,
} from './presentationDashboardStats';
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
import {
  UNIQUENESS_RESERVATIONS_COLLECTION,
  DuplicateRecordError,
  isDuplicateRecordError,
  normalizeEmail,
  normalizeMobileInternational,
  normalizePersonName,
  normalizeAbstractTitle,
  normalizeAbstractContent,
  extractAbstractBodyText,
  computeEmailReservationKey,
  computeMobileReservationKey,
  computeNameAdvisoryKey,
  computeInstitutionHash,
  computeAbstractContentReservationKey,
  computeAbstractTitleAuthorKey,
  type UniquenessReservationRecord,
} from './duplicatePreventionService';

export interface RegistrationRecord {
  id: string; // Document ID (e.g. REG-...)
  registrationId?: string | null; // Official sequential ID: AICONDD001
  fullName: string;
  normalizedFullName?: string;
  nameAdvisoryKey?: string;
  possibleDuplicateNameFlag?: boolean;
  duplicateNameMatchLevel?: 'none' | 'similar_name' | 'same_name_and_institution';
  email: string;
  normalizedEmail?: string;
  emailReservationKey?: string;
  mobile: string;
  normalizedMobile?: string;
  mobileReservationKey?: string;
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
  linkedAbstractIds?: string[];
  abstractSubmitted?: boolean;
  abstractSubmissionDate?: string | null;
  recordType?: 'live' | 'test';
}

export interface DuplicateUtrExceptionPayload {
  approved: boolean;
  reason: string;
  conflictingRegistrationIds: string[];
}

export type OfficialAllocationCategory =
  | 'Oral Presentation'
  | 'Poster Presentation'
  | 'E-Poster Presentation';

export type AllocationEmailStatus = 'Not Sent' | 'Pending' | 'Sent' | 'Failed';

export interface AllocationHistoryEntry {
  allocationId: string;
  category: OfficialAllocationCategory;
  status: 'Active' | 'Superseded';
  allocatedAt: string;
  allocatedBy: string;
  supersededAt?: string | null;
  supersededBy?: string | null;
  supersededReason?: string | null;
  emailStatus?: AllocationEmailStatus;
  emailSentAt?: string | null;
  emailError?: string | null;
}

export interface AbstractRecord {
  id: string; // Official sequential ID: AICONDD-ABS-001
  registrationId: string; // Mandatory linked registration ID: AICONDD001
  registrationDocId?: string;
  title: string;
  normalizedTitle?: string;
  abstractContentKey?: string;
  abstractTitleAuthorKey?: string;
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
  officialAllocationCategory?: OfficialAllocationCategory | null;
  presentationAllocationId?: string | null;
  allocationStatus?: 'Not Allocated' | 'Active' | null;
  allocationCreatedAt?: string | null;
  allocationCreatedBy?: string | null;
  allocationEmailStatus?: AllocationEmailStatus | null;
  allocationEmailSentAt?: string | null;
  allocationEmailError?: string | null;
  allocationEmailAttempts?: number;
  allocationHistory?: AllocationHistoryEntry[];
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
//    WITH MANDATORY SERVER-SIDE / TRANSACTIONAL EMAIL, MOBILE & UTR UNIQUENESS
// ---------------------------------------------------------------------------
export async function submitConferenceRegistration(
  registrationData: Omit<RegistrationRecord, 'id' | 'registrationId' | 'createdAt'>
): Promise<{ regDoc: RegistrationRecord; regId: string }> {
  const trimmedName = (registrationData.fullName || '').trim().replace(/\s+/g, ' ');
  const trimmedEmail = (registrationData.email || '').trim();
  const trimmedMobile = (registrationData.mobile || '').trim();
  const trimmedInstitution = (registrationData.institution || '').trim().replace(/\s+/g, ' ');
  const trimmedUtr = (registrationData.transactionReference || '').trim();
  const trimmedCategory = (registrationData.category || '').trim();
  const country = (registrationData.country || 'India').trim();

  // Enforce Virtual participation restriction (International participants ONLY)
  const modeValidation = validateParticipationModeForCategory(
    trimmedCategory,
    registrationData.participationMode || registrationData.modeOfParticipation
  );
  if (!modeValidation.valid) {
    throw new Error(
      modeValidation.error || 'Virtual participation is available exclusively for International participants.'
    );
  }
  const canonicalParticipationMode = modeValidation.normalizedMode;
  const isVirtualRegistration = canonicalParticipationMode === VIRTUAL_PARTICIPATION_MODE;

  // Enforce conditional Food Preference: forbidden/omitted for Virtual, mandatory for Physical (Offline)
  const normalizedDietaryPref = isVirtualRegistration
    ? null
    : normalizeFoodPreferenceValue(registrationData.dietaryPreference);
  if (!isVirtualRegistration && !normalizedDietaryPref) {
    throw new Error('Food Preference (Vegetarian or Non-Vegetarian) is required for on-site physical participation.');
  }

  const normalizedEmail = normalizeEmail(trimmedEmail);
  const normalizedMobile = normalizeMobileInternational(trimmedMobile, country);
  const normalizedUtr = normalizeTransactionReference(trimmedUtr);
  const normalizedFullName = normalizePersonName(trimmedName);

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('A valid email address is required.');
  }
  if (!normalizedMobile || normalizedMobile.replace(/\D/g, '').length < 8) {
    throw new Error('A valid mobile number is required.');
  }
  if (!normalizedUtr) {
    throw new Error('Transaction / Reference Number is required.');
  }

  const [emailKey, mobileKey, utrKey, nameAdvisoryKey, institutionHash] = await Promise.all([
    computeEmailReservationKey(normalizedEmail),
    computeMobileReservationKey(normalizedMobile, country),
    computeTransactionReferenceKey(normalizedUtr),
    normalizedFullName.length >= 3 ? computeNameAdvisoryKey(normalizedFullName) : Promise.resolve(''),
    trimmedInstitution ? computeInstitutionHash(trimmedInstitution) : Promise.resolve(''),
  ]);

  const emailLockRef = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, emailKey);
  const mobileLockRef = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, mobileKey);
  const utrLockRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, utrKey);
  const nameAdvisoryRef = nameAdvisoryKey
    ? doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, nameAdvisoryKey)
    : null;
  const counterRef = doc(db, 'systemCounters', 'registrationCounter');
  const timestamp = new Date().toISOString();

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Atomically verify Email, Mobile, and UTR uniqueness BEFORE reading/incrementing the ID counter.
      //    Firestore serializable transactions guarantee that under concurrent identical submissions,
      //    at most one commits and the second retries, immediately detecting the lock and aborting
      //    without wasting a sequential Registration ID.
      const [emailLockSnap, mobileLockSnap, utrLockSnap, nameAdvisorySnap] = await Promise.all([
        transaction.get(emailLockRef),
        transaction.get(mobileLockRef),
        transaction.get(utrLockRef),
        nameAdvisoryRef ? transaction.get(nameAdvisoryRef) : Promise.resolve(null),
      ]);

      if (emailLockSnap.exists()) {
        const existingLock = emailLockSnap.data() as Partial<UniquenessReservationRecord>;
        throw new DuplicateRecordError({
          code: 'DUPLICATE_EMAIL',
          field: 'email',
          normalizedValue: normalizedEmail,
          reservationKey: emailKey,
          conflictingRecordId: existingLock.ownerId,
        });
      }

      if (mobileLockSnap.exists()) {
        const existingLock = mobileLockSnap.data() as Partial<UniquenessReservationRecord>;
        throw new DuplicateRecordError({
          code: 'DUPLICATE_MOBILE',
          field: 'mobile',
          normalizedValue: normalizedMobile,
          reservationKey: mobileKey,
          conflictingRecordId: existingLock.ownerId,
        });
      }

      if (utrLockSnap.exists()) {
        const existingLock = utrLockSnap.data() as Partial<PaymentTransactionLockRecord>;
        throw new DuplicateTransactionReferenceError({
          normalizedUtr,
          utrKey,
          conflictingRegistrationId: existingLock.registrationId,
        });
      }

      // 2. Evaluate non-blocking Name Advisory index (different contact details allowed, flagged for Org. Secretary review)
      let possibleDuplicateNameFlag = false;
      let duplicateNameMatchLevel: 'none' | 'similar_name' | 'same_name_and_institution' = 'none';
      let nextNameCount = 1;
      let nextInstitutionHashes: string[] = institutionHash ? [institutionHash] : [];
      let nameCreatedAt = timestamp;

      if (nameAdvisorySnap && nameAdvisorySnap.exists()) {
        const existingNameData = nameAdvisorySnap.data() as Partial<UniquenessReservationRecord>;
        possibleDuplicateNameFlag = true;
        const prevHashes = Array.isArray(existingNameData.institutionHashes)
          ? existingNameData.institutionHashes
          : [];
        if (institutionHash && prevHashes.includes(institutionHash)) {
          duplicateNameMatchLevel = 'same_name_and_institution';
        } else {
          duplicateNameMatchLevel = 'similar_name';
        }
        nextNameCount = Math.min(10000, (existingNameData.registrationIdsCount || 1) + 1);
        nextInstitutionHashes =
          institutionHash && !prevHashes.includes(institutionHash) && prevHashes.length < 50
            ? [...prevHashes, institutionHash]
            : prevHashes.slice(0, 50);
        nameCreatedAt = existingNameData.createdAt || timestamp;
      }

      // 3. Fetch current sequence counter atomically
      const counterSnap = await transaction.get(counterRef);
      const currentSeq = counterSnap.exists()
        ? (counterSnap.data()?.lastSequenceNumber || 0)
        : 0;
      const nextSeq = currentSeq + 1;

      // Format: AICONDD001, AICONDD002, AICONDD003... (monotonically increasing, never reused)
      const newRegId = `AICONDD${String(nextSeq).padStart(3, '0')}`;
      const regRef = doc(db, 'registrations', newRegId);

      // 4. Increment atomic counter
      transaction.set(
        counterRef,
        {
          lastSequenceNumber: nextSeq,
          updatedAt: timestamp,
        },
        { merge: true }
      );

      // 5. Claim atomic PII-free UTR, Email, and Mobile locks
      const utrLockDoc: PaymentTransactionLockRecord = {
        id: utrKey,
        normalizedTransactionReference: normalizedUtr,
        registrationId: newRegId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      transaction.set(utrLockRef, utrLockDoc);

      const emailLockDoc: UniquenessReservationRecord = {
        id: emailKey,
        type: 'email',
        ownerId: newRegId,
        ownerCollection: 'registrations',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      transaction.set(emailLockRef, emailLockDoc);

      const mobileLockDoc: UniquenessReservationRecord = {
        id: mobileKey,
        type: 'mobile',
        ownerId: newRegId,
        ownerCollection: 'registrations',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      transaction.set(mobileLockRef, mobileLockDoc);

      // 6. Create or update non-blocking Name Advisory record
      if (nameAdvisoryRef && nameAdvisoryKey) {
        const nameAdvisoryDoc: UniquenessReservationRecord = {
          id: nameAdvisoryKey,
          type: 'name',
          ownerId: newRegId,
          ownerCollection: 'registrations',
          registrationIdsCount: nextNameCount,
          institutionHashes: nextInstitutionHashes,
          createdAt: nameCreatedAt,
          updatedAt: timestamp,
        };
        transaction.set(nameAdvisoryRef, nameAdvisoryDoc);
      }

      // 7. Construct and save the official registration record (preserving original displayed name).
      //    Always enforce safe initial statuses and exclude admin-only verification fields
      //    regardless of whether a browser session happens to be signed into the Admin Portal.
      const {
        verifiedBy: _ignoredVerifiedBy,
        verifiedAt: _ignoredVerifiedAt,
        duplicateUtrExceptionApproved: _ignoredDupApproved,
        duplicateUtrExceptionReason: _ignoredDupReason,
        duplicateUtrExceptionApprovedBy: _ignoredDupBy,
        duplicateUtrExceptionApprovedAt: _ignoredDupAt,
        dietaryPreference: _ignoredRawDietaryPreference,
        modeOfParticipation: _ignoredRawModeOfParticipation,
        ...safeRegistrationData
      } = registrationData;

      const regDoc: RegistrationRecord = {
        ...safeRegistrationData,
        category: trimmedCategory,
        participationMode: canonicalParticipationMode,
        ...(isVirtualRegistration
          ? {}
          : { dietaryPreference: normalizedDietaryPref || undefined }),
        fullName: trimmedName,
        ...(normalizedFullName ? { normalizedFullName } : {}),
        ...(nameAdvisoryKey ? { nameAdvisoryKey } : {}),
        possibleDuplicateNameFlag,
        duplicateNameMatchLevel,
        email: trimmedEmail,
        normalizedEmail,
        emailReservationKey: emailKey,
        mobile: trimmedMobile,
        normalizedMobile,
        mobileReservationKey: mobileKey,
        institution: trimmedInstitution,
        transactionReference: trimmedUtr,
        normalizedTransactionReference: normalizedUtr,
        transactionReferenceKey: utrKey,
        paymentStatus: 'Pending Verification',
        registrationStatus: 'Awaiting Approval',
        adminRemarks: '',
        id: newRegId,
        registrationId: newRegId,
        createdAt: timestamp,
      };
      // Strictly guarantee dietaryPreference is never stored on Virtual registration documents
      if (isVirtualRegistration) {
        delete regDoc.dietaryPreference;
      }
      transaction.set(regRef, regDoc);

      return { regDoc, regId: newRegId };
    });

    return result;
  } catch (error) {
    if (isDuplicateTransactionReferenceError(error) || isDuplicateRecordError(error)) {
      throw error;
    }
    console.error('Error submitting conference registration:', error);
    handleFirestoreError(error, OperationType.WRITE, 'registrations');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 0B. ATOMIC REJECTED-PAYMENT UTR RESUBMISSION
//     ALLOWS OWN UTR OR A BRAND-NEW UNIQUE UTR; BLOCKS OTHERS' UTRs.
//     CRITICAL POLICY: NEVER SILENTLY RELEASES AN OLD REJECTED UTR LOCK
//     FOR REUSE BY ANOTHER PARTICIPANT.
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

      // 3. Commit new lock (if needed) and update registration atomically.
      //    Intentionally keep the previous rejected UTR lock intact so it cannot be silently reused by another participant.
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
    if (isDuplicateTransactionReferenceError(error) || isDuplicateRecordError(error)) {
      throw error;
    }
    console.error('Error resubmitting rejected registration UTR:', error);
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${regDocId}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 0C. ATOMIC REGISTRATION IDENTIFIER EDIT (PRESERVES UNCHANGED IDENTIFIERS,
//     BLOCKS COLLISIONS, SWAPS LOCKS ATOMICALLY AFTER COMMIT, WRITES AUDIT LOG)
// ---------------------------------------------------------------------------
export async function updateRegistrationIdentifiers(params: {
  regDocId: string;
  updates: {
    fullName?: string;
    email?: string;
    mobile?: string;
    country?: string;
    institution?: string;
    transactionReference?: string;
  };
  adminEmail: string;
  auditReason?: string;
  releaseOldUtrAfterInvestigation?: boolean;
}): Promise<RegistrationRecord> {
  const regDocId = params.regDocId.trim();
  if (!regDocId) {
    throw new Error('Registration ID is required for editing.');
  }

  const regRef = doc(db, 'registrations', regDocId);
  const nowIso = new Date().toISOString();

  // Pre-read current document to compute deterministic keys for transaction reads
  const preSnap = await getDoc(regRef);
  if (!preSnap.exists()) {
    throw new Error('Registration record not found.');
  }
  const preData = preSnap.data() as RegistrationRecord;

  const nextFullName =
    params.updates.fullName !== undefined
      ? params.updates.fullName.trim().replace(/\s+/g, ' ')
      : preData.fullName;
  const nextCountry =
    params.updates.country !== undefined
      ? params.updates.country.trim()
      : preData.country || 'India';
  const nextEmail =
    params.updates.email !== undefined ? params.updates.email.trim() : preData.email;
  const nextMobile =
    params.updates.mobile !== undefined ? params.updates.mobile.trim() : preData.mobile;
  const nextInstitution =
    params.updates.institution !== undefined
      ? params.updates.institution.trim().replace(/\s+/g, ' ')
      : preData.institution;
  const nextUtr =
    params.updates.transactionReference !== undefined
      ? params.updates.transactionReference.trim()
      : preData.transactionReference;

  const nextNormEmail = normalizeEmail(nextEmail);
  const nextNormMobile = normalizeMobileInternational(nextMobile, nextCountry);
  const nextNormUtr = normalizeTransactionReference(nextUtr);
  const nextNormName = normalizePersonName(nextFullName);

  if (!nextNormEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextNormEmail)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!nextNormMobile || nextNormMobile.replace(/\D/g, '').length < 8) {
    throw new Error('Please provide a valid mobile number.');
  }
  if (!nextNormUtr) {
    throw new Error('Transaction / Reference Number cannot be empty.');
  }

  const oldNormEmail = normalizeEmail(preData.normalizedEmail || preData.email);
  const oldNormMobile = normalizeMobileInternational(
    preData.normalizedMobile || preData.mobile,
    preData.country || 'India'
  );
  const oldNormUtr = normalizeTransactionReference(
    preData.normalizedTransactionReference || preData.transactionReference
  );

  const utrChanged = nextNormUtr !== oldNormUtr;
  if (utrChanged && (!params.auditReason || params.auditReason.trim().length < 5)) {
    throw new Error(
      'A documented investigation reason is required before modifying a payment UTR.'
    );
  }

  const [
    oldEmailKey,
    newEmailKey,
    oldMobileKey,
    newMobileKey,
    oldUtrKey,
    newUtrKey,
    newNameKey,
  ] = await Promise.all([
    preData.emailReservationKey
      ? Promise.resolve(preData.emailReservationKey)
      : oldNormEmail
      ? computeEmailReservationKey(oldNormEmail)
      : Promise.resolve(''),
    computeEmailReservationKey(nextNormEmail),
    preData.mobileReservationKey
      ? Promise.resolve(preData.mobileReservationKey)
      : oldNormMobile
      ? computeMobileReservationKey(oldNormMobile, preData.country || 'India')
      : Promise.resolve(''),
    computeMobileReservationKey(nextNormMobile, nextCountry),
    preData.transactionReferenceKey
      ? Promise.resolve(preData.transactionReferenceKey)
      : oldNormUtr
      ? computeTransactionReferenceKey(oldNormUtr)
      : Promise.resolve(''),
    computeTransactionReferenceKey(nextNormUtr),
    nextNormName.length >= 3 ? computeNameAdvisoryKey(nextNormName) : Promise.resolve(''),
  ]);

  const emailChanged = newEmailKey !== oldEmailKey;
  const mobileChanged = newMobileKey !== oldMobileKey;
  const regDocIdUpper = regDocId.toUpperCase();

  try {
    const updatedRecord = await runTransaction(db, async (transaction) => {
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error('Registration record not found.');
      }
      const current = regSnap.data() as RegistrationRecord;

      const newEmailRef = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, newEmailKey);
      const oldEmailRef = oldEmailKey
        ? doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, oldEmailKey)
        : null;
      const newMobileRef = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, newMobileKey);
      const oldMobileRef = oldMobileKey
        ? doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, oldMobileKey)
        : null;
      const newUtrRef = doc(db, PAYMENT_TRANSACTIONS_COLLECTION, newUtrKey);
      const oldUtrRef = oldUtrKey ? doc(db, PAYMENT_TRANSACTIONS_COLLECTION, oldUtrKey) : null;

      // Read all involved locks before performing any writes
      const [
        newEmailSnap,
        oldEmailSnap,
        newMobileSnap,
        oldMobileSnap,
        newUtrSnap,
        oldUtrSnap,
      ] = await Promise.all([
        transaction.get(newEmailRef),
        emailChanged && oldEmailRef ? transaction.get(oldEmailRef) : Promise.resolve(null),
        transaction.get(newMobileRef),
        mobileChanged && oldMobileRef ? transaction.get(oldMobileRef) : Promise.resolve(null),
        transaction.get(newUtrRef),
        utrChanged && oldUtrRef && params.releaseOldUtrAfterInvestigation
          ? transaction.get(oldUtrRef)
          : Promise.resolve(null),
      ]);

      // 1. Validate new Email reservation (allow own unchanged reservation; block anyone else's)
      if (newEmailSnap.exists()) {
        const owner = ((newEmailSnap.data() as Partial<UniquenessReservationRecord>).ownerId || '')
          .trim()
          .toUpperCase();
        if (owner && owner !== regDocIdUpper) {
          throw new DuplicateRecordError({
            code: 'DUPLICATE_EMAIL',
            field: 'email',
            normalizedValue: nextNormEmail,
            reservationKey: newEmailKey,
            conflictingRecordId: (newEmailSnap.data() as Partial<UniquenessReservationRecord>).ownerId,
          });
        }
      }

      // 2. Validate new Mobile reservation
      if (newMobileSnap.exists()) {
        const owner = ((newMobileSnap.data() as Partial<UniquenessReservationRecord>).ownerId || '')
          .trim()
          .toUpperCase();
        if (owner && owner !== regDocIdUpper) {
          throw new DuplicateRecordError({
            code: 'DUPLICATE_MOBILE',
            field: 'mobile',
            normalizedValue: nextNormMobile,
            reservationKey: newMobileKey,
            conflictingRecordId: (newMobileSnap.data() as Partial<UniquenessReservationRecord>).ownerId,
          });
        }
      }

      // 3. Validate new UTR reservation
      if (newUtrSnap.exists()) {
        const owner = ((newUtrSnap.data() as Partial<PaymentTransactionLockRecord>).registrationId || '')
          .trim()
          .toUpperCase();
        if (owner && owner !== regDocIdUpper) {
          throw new DuplicateTransactionReferenceError({
            normalizedUtr: nextNormUtr,
            utrKey: newUtrKey,
            conflictingRegistrationId: (newUtrSnap.data() as Partial<PaymentTransactionLockRecord>)
              .registrationId,
          });
        }
      }

      // 4. Write new/missing reservations atomically
      if (!newEmailSnap.exists()) {
        const emailDoc: UniquenessReservationRecord = {
          id: newEmailKey,
          type: 'email',
          ownerId: regDocId,
          ownerCollection: 'registrations',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        transaction.set(newEmailRef, emailDoc);
      }

      if (!newMobileSnap.exists()) {
        const mobileDoc: UniquenessReservationRecord = {
          id: newMobileKey,
          type: 'mobile',
          ownerId: regDocId,
          ownerCollection: 'registrations',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        transaction.set(newMobileRef, mobileDoc);
      }

      if (!newUtrSnap.exists()) {
        const utrDoc: PaymentTransactionLockRecord = {
          id: newUtrKey,
          normalizedTransactionReference: nextNormUtr,
          registrationId: regDocId,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        transaction.set(newUtrRef, utrDoc);
      }

      // 5. Release old email/mobile reservations ONLY when changed AND strictly owned by this registration
      if (emailChanged && oldEmailRef && oldEmailSnap?.exists()) {
        const oldOwner = ((oldEmailSnap.data() as Partial<UniquenessReservationRecord>).ownerId || '')
          .trim()
          .toUpperCase();
        if (oldOwner === regDocIdUpper) {
          transaction.delete(oldEmailRef);
        }
      }

      if (mobileChanged && oldMobileRef && oldMobileSnap?.exists()) {
        const oldOwner = ((oldMobileSnap.data() as Partial<UniquenessReservationRecord>).ownerId || '')
          .trim()
          .toUpperCase();
        if (oldOwner === regDocIdUpper) {
          transaction.delete(oldMobileRef);
        }
      }

      // Old UTR lock is NEVER released unless explicitly instructed after documented admin investigation
      if (
        utrChanged &&
        params.releaseOldUtrAfterInvestigation &&
        oldUtrRef &&
        oldUtrSnap?.exists()
      ) {
        const oldOwner = (
          (oldUtrSnap.data() as Partial<PaymentTransactionLockRecord>).registrationId || ''
        )
          .trim()
          .toUpperCase();
        if (oldOwner === regDocIdUpper) {
          transaction.delete(oldUtrRef);
        }
      }

      // 6. Commit updated registration fields
      const patch: Partial<RegistrationRecord> = {
        fullName: nextFullName,
        ...(nextNormName ? { normalizedFullName: nextNormName } : {}),
        ...(newNameKey ? { nameAdvisoryKey: newNameKey } : {}),
        email: nextEmail,
        normalizedEmail: nextNormEmail,
        emailReservationKey: newEmailKey,
        mobile: nextMobile,
        normalizedMobile: nextNormMobile,
        mobileReservationKey: newMobileKey,
        country: nextCountry,
        institution: nextInstitution,
        transactionReference: nextUtr,
        normalizedTransactionReference: nextNormUtr,
        transactionReferenceKey: newUtrKey,
        updatedAt: nowIso,
      };
      transaction.update(regRef, patch);

      return {
        ...current,
        ...patch,
      } as RegistrationRecord;
    });

    // Write immutable audit trail entry for identifier edit
    try {
      const auditId = `EDIT_REG_IDENT_${Date.now()}_${regDocId}`;
      const changedFields: string[] = [];
      if (emailChanged) changedFields.push(`email (${preData.email} -> ${nextEmail})`);
      if (mobileChanged) changedFields.push(`mobile (${preData.mobile} -> ${nextMobile})`);
      if (utrChanged)
        changedFields.push(`UTR (${preData.transactionReference} -> ${nextUtr})`);
      if (nextFullName !== preData.fullName)
        changedFields.push(`name (${preData.fullName} -> ${nextFullName})`);
      if (nextInstitution !== preData.institution)
        changedFields.push(`institution updated`);

      if (changedFields.length > 0) {
        await setDoc(doc(db, 'adminAuditLogs', auditId), {
          id: auditId,
          adminEmail: params.adminEmail,
          action: 'EDIT_REGISTRATION_IDENTIFIERS',
          targetId: regDocId,
          details: `Updated ${regDocId}: ${changedFields.join('; ')}.${
            params.auditReason ? ` Reason: ${params.auditReason.trim()}` : ''
          }`,
          timestamp: nowIso,
        });
      }
    } catch (auditErr) {
      console.warn('[managementService] Non-fatal audit log warning on registration edit:', auditErr);
    }

    return updatedRecord;
  } catch (error) {
    if (isDuplicateTransactionReferenceError(error) || isDuplicateRecordError(error)) {
      throw error;
    }
    console.error('Error updating registration identifiers:', error);
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
// 2. VERIFY REGISTRATION FOR ABSTRACT SUBMISSION
//    Validates Registration ID & allows genuinely different abstracts by the
//    same participant while duplicate content/titles are blocked atomically.
// ---------------------------------------------------------------------------
export async function verifyRegistrationForAbstractSubmission(
  enteredRegId: string,
  enteredEmail?: string
): Promise<{
  valid: boolean;
  registration: RegistrationRecord;
  regDocId: string;
  existingAbstractIds: string[];
}> {
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

    // Collect any already-linked abstracts without blocking genuinely distinct new submissions
    const existingAbstractIds = Array.from(
      new Set(
        [
          ...(Array.isArray(regData.linkedAbstractIds) ? regData.linkedAbstractIds : []),
          ...(regData.linkedAbstractId ? [regData.linkedAbstractId] : []),
        ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    );

    return {
      valid: true,
      registration: regData,
      regDocId: cleanId,
      existingAbstractIds,
    };
  } catch (error: any) {
    if (
      error.message &&
      (error.message.includes('not found') ||
        error.message.includes('does not match') ||
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
//    WITH ATOMIC CONTENT & TITLE+AUTHOR DUPLICATE PREVENTION
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
  const trimmedTitle = params.title.trim().replace(/\s+/g, ' ');
  const trimmedContent = params.abstractContent.trim();
  const normalizedTitle = normalizeAbstractTitle(trimmedTitle);
  const normalizedContent = normalizeAbstractContent(trimmedContent);
  const normalizedAuthorEmail = normalizeEmail(params.presentingAuthor.email);

  if (!normalizedTitle) {
    throw new Error('Title of the Abstract is required.');
  }
  if (!normalizedContent) {
    throw new Error('Abstract content is required.');
  }
  if (!normalizedAuthorEmail) {
    throw new Error('Presenting author email is required.');
  }

  const [abstractContentKey, abstractTitleAuthorKey] = await Promise.all([
    computeAbstractContentReservationKey(normalizedContent),
    computeAbstractTitleAuthorKey(normalizedTitle, normalizedAuthorEmail),
  ]);

  const counterRef = doc(db, 'systemCounters', 'abstractCounter');
  const regRef = doc(db, 'registrations', params.regDocId);
  const contentLockRef = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, abstractContentKey);
  const titleAuthorLockRef = doc(db, UNIQUENESS_RESERVATIONS_COLLECTION, abstractTitleAuthorKey);

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
      // 1. Atomically verify registration AND duplicate content / title+author reservations
      //    BEFORE reading/incrementing the abstract sequence counter.
      const [regSnap, contentLockSnap, titleAuthorLockSnap] = await Promise.all([
        transaction.get(regRef),
        transaction.get(contentLockRef),
        transaction.get(titleAuthorLockRef),
      ]);

      if (!regSnap.exists()) {
        throw new Error('Associated registration could not be found.');
      }
      const regData = regSnap.data() as RegistrationRecord;

      if (contentLockSnap.exists()) {
        const existingLock = contentLockSnap.data() as Partial<UniquenessReservationRecord>;
        throw new DuplicateRecordError({
          code: 'DUPLICATE_ABSTRACT_CONTENT',
          field: 'abstractContent',
          normalizedValue: normalizedContent.slice(0, 120),
          reservationKey: abstractContentKey,
          conflictingRecordId: existingLock.ownerId,
        });
      }

      if (titleAuthorLockSnap.exists()) {
        const existingLock = titleAuthorLockSnap.data() as Partial<UniquenessReservationRecord>;
        throw new DuplicateRecordError({
          code: 'DUPLICATE_ABSTRACT_TITLE',
          field: 'abstractTitle',
          normalizedValue: normalizedTitle,
          reservationKey: abstractTitleAuthorKey,
          conflictingRecordId: existingLock.ownerId,
        });
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
      const timestamp = new Date().toISOString();

      // 3. Increment counter
      transaction.set(
        counterRef,
        {
          lastSequenceNumber: nextSeq,
          updatedAt: timestamp,
        },
        { merge: true }
      );

      // 4. Claim atomic abstract content & title+author reservations
      const contentLockDoc: UniquenessReservationRecord = {
        id: abstractContentKey,
        type: 'abstract_content',
        ownerId: newAbstractId,
        ownerCollection: 'abstractSubmissions',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      transaction.set(contentLockRef, contentLockDoc);

      const titleAuthorLockDoc: UniquenessReservationRecord = {
        id: abstractTitleAuthorKey,
        type: 'abstract_title_author',
        ownerId: newAbstractId,
        ownerCollection: 'abstractSubmissions',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      transaction.set(titleAuthorLockRef, titleAuthorLockDoc);

      // 5. Create abstract document
      const abstractData: AbstractRecord = {
        id: newAbstractId,
        registrationId: params.registrationId,
        registrationDocId: params.regDocId,
        title: trimmedTitle,
        normalizedTitle,
        abstractContentKey,
        abstractTitleAuthorKey,
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
          text: trimmedContent,
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

      // 6. Update linked registration record (supports multiple distinct abstracts cleanly while preserving linkedAbstractId)
      const prevIds = Array.from(
        new Set(
          [
            ...(Array.isArray(regData.linkedAbstractIds) ? regData.linkedAbstractIds : []),
            ...(regData.linkedAbstractId ? [regData.linkedAbstractId] : []),
          ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        )
      );
      const nextLinkedIds = [...prevIds, newAbstractId];

      transaction.update(regRef, {
        linkedAbstractId: regData.linkedAbstractId || newAbstractId,
        linkedAbstractIds: nextLinkedIds,
        abstractSubmitted: true,
        abstractSubmissionDate: regData.abstractSubmissionDate || timestamp,
        updatedAt: timestamp,
      });

      return newAbstractId;
    });

    return allocatedAbstractId;
  } catch (error) {
    if (isDuplicateRecordError(error)) {
      throw error;
    }
    console.error('Error allocating abstract ID and submitting:', error);
    handleFirestoreError(error, OperationType.WRITE, 'abstractSubmissions');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. DELETION LOGIC (SAFE UNLINKING, OWNER-ONLY LOCK RELEASE & AUDIT TRAIL)
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

async function releaseOwnedReservationSafely(
  collectionName: string,
  key: string,
  expectedOwnerId: string,
  ownerField: 'ownerId' | 'registrationId'
): Promise<boolean> {
  if (!key || !expectedOwnerId) return false;
  try {
    const ref = doc(db, collectionName, key);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const ownerVal = String((snap.data() as Record<string, unknown>)[ownerField] || '')
      .trim()
      .toUpperCase();
    if (ownerVal === expectedOwnerId.trim().toUpperCase()) {
      await deleteDoc(ref);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[managementService] Non-fatal reservation release warning (${key}):`, err);
    return false;
  }
}

export async function deleteAbstractRecord(
  abstractId: string,
  registrationDocId?: string,
  registrationId?: string,
  adminEmail?: string
): Promise<void> {
  try {
    // 1. Inspect abstract reservations before deleting so we only release locks owned by this abstract
    let contentKeyToRelease = '';
    let titleAuthorKeyToRelease = '';
    try {
      const absSnap = await getDoc(doc(db, 'abstractSubmissions', abstractId));
      if (absSnap.exists()) {
        const absData = absSnap.data() as Partial<AbstractRecord>;
        const bodyText = extractAbstractBodyText(absData.abstractContent);
        contentKeyToRelease =
          absData.abstractContentKey ||
          (bodyText ? await computeAbstractContentReservationKey(bodyText) : '');
        titleAuthorKeyToRelease =
          absData.abstractTitleAuthorKey ||
          (absData.title && absData.presentingAuthor?.email
            ? await computeAbstractTitleAuthorKey(absData.title, absData.presentingAuthor.email)
            : '');
      }
    } catch (lookupErr) {
      console.warn('[managementService] Non-fatal abstract reservation lookup warning:', lookupErr);
    }

    // 2. Delete abstract document
    await deleteDoc(doc(db, 'abstractSubmissions', abstractId));

    // 3. Release abstract content & title+author locks ONLY if owned by this deleted abstract
    await Promise.all([
      releaseOwnedReservationSafely(
        UNIQUENESS_RESERVATIONS_COLLECTION,
        contentKeyToRelease,
        abstractId,
        'ownerId'
      ),
      releaseOwnedReservationSafely(
        UNIQUENESS_RESERVATIONS_COLLECTION,
        titleAuthorKeyToRelease,
        abstractId,
        'ownerId'
      ),
    ]);

    // 4. Remove associated abstract email logs so stale notifications are not orphaned
    const absKey = abstractId.trim().toUpperCase();
    await deleteEmailLogIdsSafely([
      `EMAIL_ABS_SUBMITTED_${absKey}`,
      `EMAIL_ABS_ACCEPTED_${absKey}`,
    ]);

    // 5. Unlink only this abstract ID from the registration document (preserving any other distinct abstracts)
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
      const regRef = doc(db, 'registrations', targetRegDocId);
      const regSnap = await getDoc(regRef);
      if (regSnap.exists()) {
        const regData = regSnap.data() as RegistrationRecord;
        const remainingIds = (
          Array.isArray(regData.linkedAbstractIds)
            ? regData.linkedAbstractIds
            : regData.linkedAbstractId
            ? [regData.linkedAbstractId]
            : []
        ).filter((id) => id.trim().toUpperCase() !== absKey);

        await updateDoc(regRef, {
          linkedAbstractId: remainingIds[0] || null,
          linkedAbstractIds: remainingIds,
          abstractSubmitted: remainingIds.length > 0,
          abstractSubmissionDate: remainingIds.length > 0 ? regData.abstractSubmissionDate || null : null,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 6. Write deletion audit entry
    if (adminEmail) {
      try {
        const auditId = `DEL_ABS_${Date.now()}_${absKey}`;
        await setDoc(doc(db, 'adminAuditLogs', auditId), {
          id: auditId,
          adminEmail,
          action: 'DELETE_ABSTRACT_RECORD',
          targetId: abstractId,
          details: `Deleted abstract ${abstractId} (Linked Reg: ${registrationId || registrationDocId || 'N/A'}) and released its owned content/title reservations.`,
          timestamp: new Date().toISOString(),
        });
      } catch (auditErr) {
        console.warn('[managementService] Non-fatal abstract deletion audit log warning:', auditErr);
      }
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
  registrationId?: string | null,
  adminEmail?: string
): Promise<void> {
  try {
    // 1. Inspect registration's owned reservations before deleting
    let utrKeyToRelease = '';
    let emailKeyToRelease = '';
    let mobileKeyToRelease = '';
    let allLinkedAbstracts: string[] = linkedAbstractId ? [linkedAbstractId] : [];
    let snapshotSummary = '';

    try {
      const existingRegSnap = await getDoc(doc(db, 'registrations', regDocId));
      if (existingRegSnap.exists()) {
        const regData = existingRegSnap.data() as Partial<RegistrationRecord>;
        utrKeyToRelease =
          regData.transactionReferenceKey ||
          (regData.transactionReference
            ? await computeTransactionReferenceKey(regData.transactionReference)
            : '');
        emailKeyToRelease =
          regData.emailReservationKey ||
          (regData.email ? await computeEmailReservationKey(regData.email) : '');
        mobileKeyToRelease =
          regData.mobileReservationKey ||
          (regData.mobile
            ? await computeMobileReservationKey(regData.mobile, regData.country || 'India')
            : '');
        if (Array.isArray(regData.linkedAbstractIds)) {
          allLinkedAbstracts = Array.from(
            new Set([...allLinkedAbstracts, ...regData.linkedAbstractIds])
          ).filter(Boolean);
        }
        snapshotSummary = `${regData.fullName || ''} (${regData.email || ''}, UTR: ${
          regData.transactionReference || 'N/A'
        })`;
      }
    } catch (lookupErr) {
      console.warn('[managementService] Non-fatal lock lookup warning before deletion:', lookupErr);
    }

    // 2. If linked abstract(s) exist and admin opted to delete them
    if (deleteLinkedAbstract && allLinkedAbstracts.length > 0) {
      for (const absId of allLinkedAbstracts) {
        try {
          await deleteAbstractRecord(absId, undefined, undefined, adminEmail);
        } catch (e) {
          console.warn(`Could not delete linked abstract ${absId} during registration deletion:`, e);
        }
      }
    }

    // 3. Delete registration document (counter is NEVER decremented; Registration ID is never reused)
    await deleteDoc(doc(db, 'registrations', regDocId));

    // 4. Release associated reservations ONLY if this deleted registration owned them
    //    (Never touches reservations belonging to any other registration)
    await Promise.all([
      releaseOwnedReservationSafely(
        PAYMENT_TRANSACTIONS_COLLECTION,
        utrKeyToRelease,
        regDocId,
        'registrationId'
      ),
      releaseOwnedReservationSafely(
        UNIQUENESS_RESERVATIONS_COLLECTION,
        emailKeyToRelease,
        regDocId,
        'ownerId'
      ),
      releaseOwnedReservationSafely(
        UNIQUENESS_RESERVATIONS_COLLECTION,
        mobileKeyToRelease,
        regDocId,
        'ownerId'
      ),
    ]);

    // 5. Remove associated registration email logs so stale notifications are not orphaned
    const regKeys = [regDocId, registrationId || '']
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);
    const regLogIds = regKeys.flatMap((key) => [
      `EMAIL_REG_RECEIVED_${key}`,
      `EMAIL_REG_CONFIRMED_${key}`,
    ]);
    await deleteEmailLogIdsSafely(regLogIds);

    // 6. Write immutable cancellation/deletion audit trail entry preserving historical trace
    if (adminEmail) {
      try {
        const auditId = `DEL_REG_${Date.now()}_${regDocId.trim().toUpperCase()}`;
        await setDoc(doc(db, 'adminAuditLogs', auditId), {
          id: auditId,
          adminEmail,
          action: 'DELETE_REGISTRATION_RECORD',
          targetId: registrationId || regDocId,
          details: `Admin deleted registration ${registrationId || regDocId} [${snapshotSummary}]. Registration ID counter preserved (ID never reused); owned email/mobile/UTR locks released.`,
          timestamp: new Date().toISOString(),
        });
      } catch (auditErr) {
        console.warn('[managementService] Non-fatal registration deletion audit log warning:', auditErr);
      }
    }
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
