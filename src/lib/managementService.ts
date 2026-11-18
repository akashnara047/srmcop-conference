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
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
  linkedAbstractId?: string | null;
  abstractSubmitted?: boolean;
  abstractSubmissionDate?: string | null;
  recordType?: 'live' | 'test';
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
// ---------------------------------------------------------------------------
export async function submitConferenceRegistration(
  registrationData: Omit<RegistrationRecord, 'id' | 'registrationId' | 'createdAt'>
): Promise<{ regDoc: RegistrationRecord; regId: string }> {
  const counterRef = doc(db, 'systemCounters', 'registrationCounter');
  const timestamp = new Date().toISOString();

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Fetch current sequence counter atomically (no read of registrations collection)
      const counterSnap = await transaction.get(counterRef);
      const currentSeq = counterSnap.exists()
        ? (counterSnap.data()?.lastSequenceNumber || 0)
        : 0;
      const nextSeq = currentSeq + 1;

      // Format: AICONDD001, AICONDD002, AICONDD003... (monotonically increasing, 3-digit minimum zero padding)
      const newRegId = `AICONDD${String(nextSeq).padStart(3, '0')}`;
      const regRef = doc(db, 'registrations', newRegId);

      // 2. Increment atomic counter (never decremented, numbers never reused even if records are deleted)
      transaction.set(
        counterRef,
        {
          lastSequenceNumber: nextSeq,
          updatedAt: timestamp,
        },
        { merge: true }
      );

      // 3. Construct the official registration record
      const regDoc: RegistrationRecord = {
        ...registrationData,
        id: newRegId,
        registrationId: newRegId,
        createdAt: timestamp,
      };

      // 4. Save registration document
      transaction.set(regRef, regDoc);

      return { regDoc, regId: newRegId };
    });

    return result;
  } catch (error) {
    console.error('Error submitting conference registration:', error);
    handleFirestoreError(error, OperationType.WRITE, 'registrations');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 1. ATOMIC REGISTRATION ID ALLOCATION (AICONDDxxx)
// ---------------------------------------------------------------------------
export async function verifyPaymentAndAllocateRegId(
  regDocId: string,
  adminEmail: string,
  remarks?: string
): Promise<string> {
  const counterRef = doc(db, 'systemCounters', 'registrationCounter');
  const regRef = doc(db, 'registrations', regDocId);

  try {
    const allocatedId = await runTransaction(db, async (transaction) => {
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error('Registration document not found.');
      }
      const regData = regSnap.data() as RegistrationRecord;

      // If already has an official registration ID, preserve it
      if (regData.registrationId && regData.registrationId.startsWith('AICONDD')) {
        transaction.update(regRef, {
          paymentStatus: 'Verified',
          registrationStatus: 'Approved',
          verifiedBy: adminEmail,
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          adminRemarks: remarks || regData.adminRemarks || 'Payment verified.',
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
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update registration record
      transaction.update(regRef, {
        registrationId: newRegId,
        paymentStatus: 'Verified',
        registrationStatus: 'Approved',
        verifiedBy: adminEmail,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        adminRemarks: remarks || 'Payment verified. Official Registration ID assigned.',
      });

      return newRegId;
    });

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
export async function deleteAbstractRecord(
  abstractId: string,
  registrationDocId?: string,
  registrationId?: string
): Promise<void> {
  try {
    // 1. Delete abstract document
    await deleteDoc(doc(db, 'abstractSubmissions', abstractId));

    // 2. Unlink the registration document so the delegate can submit a replacement
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
  deleteLinkedAbstract: boolean = false
): Promise<void> {
  try {
    // 1. If linked abstract exists and user opted to delete it
    if (linkedAbstractId && deleteLinkedAbstract) {
      try {
        await deleteDoc(doc(db, 'abstractSubmissions', linkedAbstractId));
      } catch (e) {
        console.warn('Could not delete linked abstract during registration deletion:', e);
      }
    }

    // 2. Delete registration document
    await deleteDoc(doc(db, 'registrations', regDocId));
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
