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
import { db, handleFirestoreError, OperationType } from './firebase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export interface RegistrationRecord {
  id: string; // Document ID (e.g. REG-...)
  registrationId?: string | null; // Official sequential ID: AICONDD001
  fullName: string;
  email: string;
  mobile: string;
  courseOrDesignation?: string;
  institution: string;
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

    // Validation Check 2: Payment verification status
    if (regData.paymentStatus !== 'Verified') {
      if (regData.paymentStatus === 'Rejected') {
        throw new Error(
          'Registration payment was marked as rejected. Please contact the conference secretariat (org.secy.cp@srmist.edu.in) to update your payment details.'
        );
      }
      throw new Error(
        'Payment verification is pending. Only delegates with verified payments can submit an abstract. Your payment is currently awaiting verification by the secretariat. Please allow time for processing or check your registration status.'
      );
    }

    // Validation Check 3: Email match (if email is provided)
    if (enteredEmail && enteredEmail.trim()) {
      const cleanEmail = enteredEmail.trim().toLowerCase();
      if (regData.email.trim().toLowerCase() !== cleanEmail) {
        throw new Error(
          'Email address does not match the registered delegate email for this Registration ID.'
        );
      }
    }

    // Validation Check 4: Strict 1:1 check (Already submitted)
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
        error.message.includes('Payment verification is pending') ||
        error.message.includes('rejected') ||
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
  recordType?: 'live' | 'test';
}): Promise<string> {
  const counterRef = doc(db, 'systemCounters', 'abstractCounter');
  const regRef = doc(db, 'registrations', params.regDocId);

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
export function exportRegistrationsToExcel(registrations: RegistrationRecord[], filename = 'AICONDD_Registrations_2027.xlsx') {
  const data = registrations.map((r) => ({
    'Official Reg ID': r.registrationId || 'Pending Verification',
    'Application Ref': r.id,
    'Participant Name': r.fullName,
    'Email Address': r.email,
    'Mobile Number': r.mobile,
    'Category': r.category + (r.otherCategoryDescription ? ` (${r.otherCategoryDescription})` : ''),
    'Course / Designation': r.courseOrDesignation || '',
    'Institution / University': r.institution || '',
    'City': r.city || '',
    'Country': r.country || '',
    'Participation Mode': r.participationMode || '',
    'PharmaQuest Participation': r.participatePharmaQuest || 'No',
    'Dietary Preference': r.dietaryPreference || 'Not Specified',
    'Payment Fee (INR)': r.paymentAmount || r.amount || 2500,
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

export function exportAbstractsToExcel(abstracts: AbstractRecord[], filename = 'AICONDD_Abstract_Submissions_2027.xlsx') {
  const data = abstracts.map((a) => {
    const author = a.presentingAuthor || {};
    const coAuthorStr = (a.coAuthors || []).map((c) => `${c.name} (${c.affiliation})`).join('; ');
    const abstractBody = typeof a.abstractContent === 'string'
      ? a.abstractContent
      : a.abstractContent?.text || '';

    return {
      'Abstract ID': a.id,
      'Linked Registration ID': a.registrationId,
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
      abstractMap.set(abs.registrationId, abs);
    }
  });

  const masterRows = registrations.map((reg) => {
    const linkedAbs = reg.registrationId ? abstractMap.get(reg.registrationId) : null;
    return {
      'Registration ID': reg.registrationId || 'Pending Verification',
      'Delegate Name': reg.fullName,
      'Email': reg.email,
      'Mobile': reg.mobile,
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
// 6. PDF ACCEPTANCE LETTER GENERATION (JSPDF)
// ---------------------------------------------------------------------------
export function generateAcceptanceLetterPDF(abstract: AbstractRecord, registration?: RegistrationRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const authorName = abstract.presentingAuthor?.fullName || abstract.presentingAuthor?.name || registration?.fullName || 'Presenting Author';
  const authorInst = abstract.presentingAuthor?.affiliation || abstract.presentingAuthor?.institution || registration?.institution || 'Institution';
  const authorEmail = abstract.presentingAuthor?.email || registration?.email || '';

  // Header Background bar
  doc.setFillColor(15, 23, 42); // Deep navy #0F172A
  doc.rect(0, 0, 210, 36, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SRM COLLEGE OF PHARMACY', 105, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('SRM Institute of Science and Technology, Kattankulathur, Tamil Nadu, India', 105, 18, { align: 'center' });
  doc.text('In Collaboration with INTI International University, Malaysia', 105, 23, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(34, 211, 238); // Cyan accent
  doc.text('INTERNATIONAL CONFERENCE ON AI-POWERED INNOVATIONS IN DRUG DISCOVERY (15-16 FEB 2027)', 105, 30, { align: 'center' });

  // Letter title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL ACCEPTANCE LETTER', 105, 48, { align: 'center' });

  // Divider line
  doc.setDrawColor(168, 85, 247);
  doc.setLineWidth(0.8);
  doc.line(20, 52, 190, 52);

  // Meta row: Date and Ref
  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${todayStr}`, 20, 59);
  doc.text(`Abstract Reference ID: ${abstract.id}`, 190, 59, { align: 'right' });
  doc.text(`Conference Registration ID: ${abstract.registrationId}`, 190, 64, { align: 'right' });

  // Recipient Block
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text('To,', 20, 72);
  doc.text(authorName, 20, 77);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(authorInst, 20, 82);
  doc.text(`Email: ${authorEmail}`, 20, 87);

  // Subject
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Subject: Acceptance of Abstract [${abstract.id}] for Conference Presentation`, 20, 96);

  // Letter Body
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.5);

  const introText = `Dear ${authorName},\n\nOn behalf of the Scientific Review Committee of the International Conference on AI-Powered Innovations in Drug Discovery and Development (15–16 February 2027), we are pleased to inform you that your abstract has been formally ACCEPTED for presentation at the conference.`;

  const splitIntro = doc.splitTextToSize(introText, 170);
  doc.text(splitIntro, 20, 104);

  // Abstract Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, 126, 170, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('ABSTRACT PRESENTATION SPECIFICATIONS:', 25, 133);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Abstract Title:`, 25, 140);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(abstract.title, 130);
  doc.text(titleLines, 55, 140);

  const titleOffset = (titleLines.length - 1) * 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Track:`, 25, 148 + titleOffset);
  doc.text(`Presentation Type:`, 25, 154 + titleOffset);
  doc.text(`Review Status:`, 25, 160 + titleOffset);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${abstract.trackId}`, 55, 148 + titleOffset);
  doc.text(`${abstract.allottedPresentationFormat || abstract.presentationPreference || abstract.presentationType || 'Oral Presentation'}`, 55, 154 + titleOffset);
  doc.setTextColor(22, 101, 52); // green
  doc.text('ACCEPTED FOR PRESENTATION', 55, 160 + titleOffset);

  // Additional instructions
  const instructionsY = 182 + titleOffset;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);

  const instructionsText = `Important Guidelines for Presenting Authors:
1. Your presentation schedule, session timing, and hall allocation will be published on the conference website prior to the event.
2. Please ensure your presentation slides (16:9 widescreen) or poster (36" x 48") strictly adhere to the presentation format guidelines.
3. As your registration is verified under ${abstract.registrationId}, your delegate kit, presentation certificate, and conference banquet pass will be issued at the registration desk.`;

  const splitInstr = doc.splitTextToSize(instructionsText, 170);
  doc.text(splitInstr, 20, instructionsY);

  // Signatures Row
  const sigY = 230;
  doc.setDrawColor(203, 213, 225);
  doc.line(25, sigY + 15, 80, sigY + 15);
  doc.line(130, sigY + 15, 185, sigY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Dr. N. Damodharan', 25, sigY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Organising Secretary · Vice Principal', 25, sigY + 24);
  doc.text('SRM College of Pharmacy, SRMIST', 25, sigY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Dr. V. Chitra', 130, sigY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Dean, SRM College of Pharmacy', 130, sigY + 24);
  doc.text('Conference Convener, SRMIST', 130, sigY + 28);

  // Footer bar
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 282, 210, 15, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SRM College of Pharmacy, SRM Institute of Science and Technology, Kattankulathur - 603203, Tamil Nadu, India', 105, 288, { align: 'center' });
  doc.text('Secretariat Desk: org.secy.cp@srmist.edu.in · Website: SRMIST Kattankulathur Conference Portal', 105, 292, { align: 'center' });

  doc.save(`Acceptance_Letter_${abstract.id}.pdf`);
}

// ---------------------------------------------------------------------------
// 7. PDF SUBMISSION ACKNOWLEDGEMENT RECEIPT (JSPDF)
// ---------------------------------------------------------------------------
export function generateSubmissionReceiptPDF(abstract: AbstractRecord, registration?: RegistrationRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const contentWidth = 170;

  const authorName =
    abstract.presentingAuthor?.fullName ||
    abstract.presentingAuthor?.name ||
    registration?.fullName ||
    'Presenting Author';
  const authorEmail =
    abstract.presentingAuthor?.email || registration?.email || 'N/A';
  const authorMobile =
    abstract.presentingAuthor?.mobile ||
    abstract.presentingAuthor?.phone ||
    registration?.mobile ||
    'N/A';
  const authorDesignation =
    abstract.presentingAuthor?.designation ||
    registration?.courseOrDesignation ||
    'Participant';
  const authorAffiliation =
    abstract.presentingAuthor?.affiliation ||
    abstract.presentingAuthor?.institution ||
    registration?.institution ||
    'Affiliated Institution';

  const coAuthorsStr =
    abstract.coAuthors && abstract.coAuthors.length > 0
      ? abstract.coAuthors
          .filter((c) => c.name.trim())
          .map((c) => `${c.name} (${c.affiliation || authorAffiliation})`)
          .join('; ')
      : 'None';

  const abstractBody =
    typeof abstract.abstractContent === 'string'
      ? abstract.abstractContent
      : abstract.abstractContent?.text || '';

  const submissionDateFormatted = abstract.createdAt
    ? new Date(abstract.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-GB');

  // Header render function for page 1 and subsequent pages
  const renderHeader = (isFirstPage: boolean) => {
    // Navy top bar
    doc.setFillColor(15, 27, 75); // Deep navy #0F1B4B
    doc.rect(0, 0, pageWidth, isFirstPage ? 32 : 18, 'F');
    // Violet accent stripe
    doc.setFillColor(113, 60, 224); // #713CE0
    doc.rect(0, isFirstPage ? 32 : 18, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    if (isFirstPage) {
      doc.setFontSize(13);
      doc.text('SRM COLLEGE OF PHARMACY', pageWidth / 2, 11, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240);
      doc.text('SRM Institute of Science and Technology, Kattankulathur - 603203, Tamil Nadu, India', pageWidth / 2, 16, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(34, 211, 238); // Cyan
      doc.text('AI-Powered Innovations in Drug Discovery and Development (15–16 February 2027)', pageWidth / 2, 23, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('In Association with Indian Pharmaceutical Association (IPA) & INTI International University, Malaysia', pageWidth / 2, 28, { align: 'center' });
    } else {
      doc.setFontSize(9.5);
      doc.text('SRM COLLEGE OF PHARMACY · AI-POWERED DRUG DISCOVERY CONFERENCE 2027', pageWidth / 2, 10, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(34, 211, 238);
      doc.text(`Official Abstract Submission Receipt · Abstract ID: ${abstract.id}`, pageWidth / 2, 15, { align: 'center' });
    }
  };

  const renderFooter = (pageNumber: number, totalPages: number = 1) => {
    doc.setFillColor(15, 27, 75);
    doc.rect(0, 284, pageWidth, 13, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(241, 245, 249);
    doc.text(
      'SRM College of Pharmacy, SRM Institute of Science and Technology, Kattankulathur - 603203, Tamil Nadu, India',
      pageWidth / 2,
      289,
      { align: 'center' }
    );
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(
      `Official Computer-Generated Submission Receipt. No physical signature required. | org.secy.cp@srmist.edu.in | Page ${pageNumber} of ${totalPages}`,
      pageWidth / 2,
      293,
      { align: 'center' }
    );
  };

  // Render Page 1 Header
  renderHeader(true);

  // Title & Reference Block
  let currentY = 41;
  doc.setTextColor(15, 27, 75);
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL ABSTRACT SUBMISSION RECEIPT', marginX, currentY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated On: ${new Date().toLocaleString('en-GB')}`, marginX, currentY + 5.5);

  // ID Cards on Top Right
  doc.setFillColor(243, 232, 255); // Purple tint
  doc.setDrawColor(192, 132, 252);
  doc.roundedRect(120, currentY - 5, 70, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(109, 40, 217);
  doc.text('ASSIGNED ABSTRACT ID', 125, currentY);
  doc.setFontSize(11);
  doc.text(abstract.id, 125, currentY + 5);

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Linked Reg ID: ${abstract.registrationId}`, 125, currentY + 10);

  // Helper function to draw key-value pairs
  const drawRow = (label: string, value: string, xLabel: number, xVal: number, y: number, maxWidth = 55) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, xLabel, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const split = doc.splitTextToSize(value || 'N/A', maxWidth);
    doc.text(split, xVal, y);
  };

  // Section 1: Presenting Author Particulars Box
  currentY = 58;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 38, 2, 2, 'FD');

  doc.setFillColor(113, 60, 224); // Violet indicator line
  doc.rect(marginX, currentY, 3, 38, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 27, 75);
  doc.text('PRESENTING AUTHOR & REGISTRATION PARTICULARS', marginX + 6, currentY + 6.5);

  drawRow('Full Name:', authorName, marginX + 6, marginX + 38, currentY + 15, 60);
  drawRow('Email Address:', authorEmail, 115, 142, currentY + 15, 46);

  drawRow('Designation:', authorDesignation, marginX + 6, marginX + 38, currentY + 23, 60);
  drawRow('Mobile Phone:', authorMobile, 115, 142, currentY + 23, 46);

  drawRow('Institution / Org:', authorAffiliation, marginX + 6, marginX + 38, currentY + 31, 120);

  // Section 2: Abstract Particulars Box
  currentY = 100;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 42, 2, 2, 'FD');

  doc.setFillColor(6, 182, 212); // Cyan indicator line
  doc.rect(marginX, currentY, 3, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 27, 75);
  doc.text('ABSTRACT METADATA & SUBMISSION SPECIFICATIONS', marginX + 6, currentY + 6.5);

  drawRow('Abstract Title:', abstract.title, marginX + 6, marginX + 38, currentY + 15, 120);
  drawRow('Scientific Track:', abstract.trackId, marginX + 6, marginX + 38, currentY + 23, 58);
  drawRow('Presentation Type:', abstract.presentationPreference || 'Oral Presentation', 115, 142, currentY + 23, 46);

  drawRow('Co-Authors:', coAuthorsStr, marginX + 6, marginX + 38, currentY + 31, 120);
  drawRow('Keywords:', (abstract.keywords || []).join(', ') || 'N/A', marginX + 6, marginX + 38, currentY + 37, 120);

  // Section 3: Abstract Content Box
  currentY = 146;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 27, 75);
  doc.text('ABSTRACT CONTENT (MAX 250 WORDS):', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const textLines = doc.splitTextToSize(abstractBody || 'No abstract text provided.', contentWidth - 8);
  const textHeight = Math.min(textLines.length * 4.2 + 8, 48);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY + 3, contentWidth, textHeight, 2, 2, 'FD');
  doc.text(textLines.slice(0, 11), marginX + 4, currentY + 9);

  // Section 4: Declaration & Next Steps Box
  currentY = currentY + textHeight + 7;
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(marginX, currentY, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(109, 40, 217);
  doc.text('NEXT STEPS & PEER REVIEW TIMELINE:', marginX + 5, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const steps = [
    `1. Your abstract reference ID is ${abstract.id}. Quote this ID for all conference proceedings inquiries.`,
    '2. The Scientific Review Committee evaluates all submissions on originality, methodology, and scientific impact.',
    '3. Acceptance notifications will be published on the conference portal by 30 December 2026.',
    '4. Upon acceptance, an official presentation schedule and acceptance letter will be issued to your email.',
  ];
  let sy = currentY + 11.5;
  steps.forEach((s) => {
    doc.text(s, marginX + 5, sy);
    sy += 5;
  });

  // Section 5: Author Declaration statement
  currentY = currentY + 38;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Author Declaration: The presenting author has confirmed that this abstract is original, has not been published elsewhere,',
    marginX,
    currentY
  );
  doc.text(
    'and all co-authors have consented to its submission and presentation at the conference.',
    marginX,
    currentY + 4
  );

  // Section 6: Official Signatures
  currentY = 244;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX + 5, currentY + 14, marginX + 65, currentY + 14);
  doc.line(marginX + 105, currentY + 14, marginX + 165, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 27, 75);
  doc.text('Dr. N. Damodharan', marginX + 5, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Organising Secretary · Vice Principal', marginX + 5, currentY + 22);
  doc.text('SRM College of Pharmacy, SRMIST', marginX + 5, currentY + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 27, 75);
  doc.text('Dr. V. Chitra', marginX + 105, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Dean & Conference Convener', marginX + 105, currentY + 22);
  doc.text('SRM College of Pharmacy, SRMIST', marginX + 105, currentY + 26);

  // Render Footer
  renderFooter(1, 1);

  // Save with standard format: <AbstractID>_Abstract_Submission_Receipt.pdf
  doc.save(`${abstract.id}_Abstract_Submission_Receipt.pdf`);
}

// ---------------------------------------------------------------------------
// 8. PDF REGISTRATION RECEIPT GENERATOR (JSPDF)
// ---------------------------------------------------------------------------
export function generateRegistrationReceiptPDF(reg: RegistrationRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top Decorative Gradient/Navy Header Bar
  doc.setFillColor(15, 27, 75); // #0F1B4B deep conference navy
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(113, 60, 224); // #713CE0 vibrant violet accent line
  doc.rect(0, 32, 210, 2, 'F');

  // Institution & Conference Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('SRM COLLEGE OF PHARMACY', 105, 12, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('SRM Institute of Science and Technology, Kattankulathur - 603203, Tamil Nadu, India', 105, 17, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(34, 211, 238); // Cyan accent
  doc.text('AI-Powered Innovations in Drug Discovery and Development (15–16 February 2027)', 105, 24, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('In Association with Indian Pharmaceutical Association (IPA) & INTI International University, Malaysia', 105, 29, { align: 'center' });

  // Receipt Title & Issuance Date
  doc.setTextColor(15, 27, 75);
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFERENCE REGISTRATION RECEIPT', 20, 43);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const formattedDate = reg.createdAt
    ? new Date(reg.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-GB');
  doc.text(`Issued On: ${formattedDate}`, 20, 49);

  // Prominent Registration ID Card on the Right
  const regIdDisplay = reg.registrationId || reg.id;
  doc.setFillColor(237, 233, 254);
  doc.setDrawColor(196, 181, 253);
  doc.roundedRect(120, 38, 70, 15, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(109, 40, 217);
  doc.text('REGISTRATION ID', 125, 44);
  doc.setFontSize(12.5);
  doc.text(regIdDisplay, 125, 50);

  const drawRow = (label: string, value: string, xLabel: number, xVal: number, y: number, maxWidth = 55) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, xLabel, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const split = doc.splitTextToSize(value || 'N/A', maxWidth);
    doc.text(split, xVal, y);
  };

  // Section 1: Delegate Information Box
  let currentY = 57;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, currentY, 170, 74, 2, 2, 'FD');

  doc.setFillColor(113, 60, 224); // Violet border indicator
  doc.rect(20, currentY, 3, 74, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 27, 75);
  doc.text('DELEGATE & ACADEMIC PARTICULARS', 26, currentY + 7);

  drawRow('Full Name:', reg.fullName, 26, 58, currentY + 16, 54);
  drawRow('Email Address:', reg.email, 115, 142, currentY + 16, 46);

  drawRow('Mobile Phone:', reg.mobile, 26, 58, currentY + 25, 54);
  const catDisplay = `${reg.category}${reg.otherCategoryDescription ? ` (${reg.otherCategoryDescription})` : ''}`;
  drawRow('Category:', catDisplay, 115, 142, currentY + 25, 46);

  drawRow('Designation / Role:', reg.courseOrDesignation || 'Delegate', 26, 58, currentY + 34, 54);
  drawRow('Participation Mode:', reg.participationMode || reg.modeOfParticipation || 'Offline (On-site)', 115, 142, currentY + 34, 46);

  drawRow('Institution / Org:', reg.institution, 26, 58, currentY + 43, 54);
  drawRow('Location:', `${reg.city || ''}, ${reg.country || 'India'}`, 115, 142, currentY + 43, 46);

  const presPlan = Array.isArray(reg.presentationPlans) && reg.presentationPlans.length > 0
    ? reg.presentationPlans.join(', ')
    : reg.presentationPlan || 'None';
  drawRow('Presentation Plan:', presPlan, 26, 58, currentY + 54, 54);
  drawRow('PharmaQuest:', reg.participatePharmaQuest || reg.pharmaQuest || 'No', 115, 142, currentY + 54, 46);

  drawRow('Dietary Preference:', reg.dietaryPreference || 'Not Specified', 26, 58, currentY + 64, 54);
  drawRow('Abstract Eligibility:', `Permitted (Use ID: ${regIdDisplay})`, 115, 142, currentY + 64, 46);

  // Section 2: Payment & Fee Particulars Box
  currentY = 135;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, currentY, 170, 52, 2, 2, 'FD');

  doc.setFillColor(6, 182, 212); // Cyan border indicator
  doc.rect(20, currentY, 3, 52, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 27, 75);
  doc.text('PAYMENT & TRANSACTION PARTICULARS', 26, currentY + 7);

  drawRow('Registration Fee:', `INR ${reg.paymentAmount || reg.amount || '0'}`, 26, 58, currentY + 17, 54);
  drawRow('Payment Mode:', reg.paymentMode || 'Bank Transfer / UPI', 115, 142, currentY + 17, 46);

  drawRow('Transaction Ref / UTR:', reg.transactionReference, 26, 58, currentY + 26, 54);
  drawRow('Proof Document:', reg.paymentProofName || reg.paymentReceiptName || 'Uploaded on file', 115, 142, currentY + 26, 46);

  drawRow('Payment Status:', reg.paymentStatus || 'Pending Verification', 26, 58, currentY + 36, 54);
  drawRow('Registration Status:', reg.registrationStatus || 'Awaiting Approval', 115, 142, currentY + 36, 46);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Payment is verified by the organising secretariat against official bank accounts before final delegate kit issue.',
    26,
    currentY + 46
  );

  // Section 3: Important Information for Delegates
  currentY = 191;
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(20, currentY, 170, 47, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(109, 40, 217);
  doc.text('IMPORTANT INSTRUCTIONS FOR PARTICIPANTS:', 25, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const notes = [
    `1. Quote your Registration ID (${regIdDisplay}) for abstract submission, queries, or certificate inquiries.`,
    '2. Abstract Submission: If presenting an Oral, Poster, or E-Poster, submit your abstract quoting this Registration ID.',
    '3. Check-In & Delegate Kit: Produce this receipt and photo ID at Dr. T. P. Ganesan Auditorium / College of Pharmacy.',
    '4. Venue & Dates: 15–16 February 2027 at SRM Institute of Science and Technology, Kattankulathur, Chennai.',
    '5. Secretariat Support: For verification status, email org.secy.cp@srmist.edu.in or dean.pharmacy.ktr@srmist.edu.in.',
  ];

  let ny = currentY + 14;
  notes.forEach((note) => {
    doc.text(note, 25, ny);
    ny += 6.5;
  });

  // Authorization Signatures
  currentY = 244;
  doc.setDrawColor(203, 213, 225);
  doc.line(25, currentY + 14, 85, currentY + 14);
  doc.line(125, currentY + 14, 185, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 27, 75);
  doc.text('Dr. N. Damodharan', 25, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Organising Secretary · Vice Principal', 25, currentY + 22);
  doc.text('SRM College of Pharmacy, SRMIST', 25, currentY + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 27, 75);
  doc.text('Dr. V. Chitra', 125, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Dean & Conference Convener', 125, currentY + 22);
  doc.text('SRM College of Pharmacy, SRMIST', 125, currentY + 26);

  // Footer Band
  doc.setFillColor(15, 27, 75);
  doc.rect(0, 282, 210, 15, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(241, 245, 249);
  doc.text(
    'SRM College of Pharmacy, SRM Institute of Science and Technology, Kattankulathur - 603203, Tamil Nadu, India',
    105,
    287,
    { align: 'center' }
  );
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text(
    'This is an official computer-generated registration receipt. No physical signature is required. | org.secy.cp@srmist.edu.in',
    105,
    292,
    { align: 'center' }
  );

  const filename = `${regIdDisplay}_Registration_Receipt.pdf`;
  doc.save(filename);
}
