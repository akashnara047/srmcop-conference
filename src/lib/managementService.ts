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
  presentationPlans?: string[];
  presentationPlan?: string;
  participatePharmaQuest?: string;
  dietaryPreference?: string;
  specialRequirements?: string;
  paymentMode?: string;
  transactionReference: string;
  paymentAmount?: number;
  amount?: number;
  paymentProofName?: string;
  paymentProofData?: string;
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
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  recordType?: 'live' | 'test';
  createdAt: string;
  updatedAt?: string;
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
  enteredEmail: string
): Promise<{ valid: boolean; registration: RegistrationRecord; regDocId: string }> {
  const cleanId = enteredRegId.trim().toUpperCase();
  const cleanEmail = enteredEmail.trim().toLowerCase();

  if (!cleanId) {
    throw new Error('Please enter your Registration ID (e.g. AICONDD001).');
  }
  if (!cleanEmail) {
    throw new Error('Please enter your registered email address.');
  }

  try {
    // 1. Query registrations by registrationId
    const regQuery = query(
      collection(db, 'registrations'),
      where('registrationId', '==', cleanId)
    );
    const snap = await getDocs(regQuery);

    let foundDoc: any = null;
    let regData: RegistrationRecord | null = null;

    if (!snap.empty) {
      foundDoc = snap.docs[0];
      regData = foundDoc.data() as RegistrationRecord;
      regData.id = foundDoc.id;
    } else {
      // Check fallback by document id (in case entered)
      const directSnap = await getDoc(doc(db, 'registrations', cleanId));
      if (directSnap.exists()) {
        foundDoc = directSnap;
        regData = directSnap.data() as RegistrationRecord;
        regData.id = directSnap.id;
      }
    }

    // Validation Check 1: Existence
    if (!regData || !foundDoc) {
      throw new Error(
        'Invalid Registration ID. Please enter the official Registration ID provided upon payment verification (e.g., AICONDD001).'
      );
    }

    // Validation Check 2: Payment verification status
    if (regData.paymentStatus !== 'Verified') {
      throw new Error(
        'Payment verification pending. Only delegates with verified payment can submit an abstract. Please check your registration status or contact the Organizing Secretary.'
      );
    }

    // Validation Check 3: Email match
    if (regData.email.trim().toLowerCase() !== cleanEmail) {
      throw new Error(
        'Email address does not match the registered delegate email for this Registration ID.'
      );
    }

    // Validation Check 4: Strict 1:1 check (Already submitted)
    if (regData.linkedAbstractId || regData.abstractSubmitted) {
      throw new Error(
        `An abstract has already been submitted for Registration ID ${cleanId} (Abstract ID: ${regData.linkedAbstractId}). Each registration is permitted one abstract submission only.`
      );
    }

    return {
      valid: true,
      registration: regData,
      regDocId: foundDoc.id,
    };
  } catch (error: any) {
    if (error.message && error.message.includes('Invalid') || error.message?.includes('Payment') || error.message?.includes('Email') || error.message?.includes('already been submitted')) {
      throw error;
    }
    console.error('Error verifying registration for abstract submission:', error);
    handleFirestoreError(error, OperationType.GET, 'registrations');
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
      'Presentation Preference': a.presentationPreference,
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
      'Presentation Preference': linkedAbs?.presentationPreference || reg.presentationPlan || 'None',
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
  doc.text(`${abstract.presentationPreference || abstract.presentationType || 'Oral Presentation'}`, 55, 154 + titleOffset);
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
export function generateSubmissionReceiptPDF(abstract: AbstractRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ABSTRACT SUBMISSION ACKNOWLEDGEMENT', 105, 14, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(34, 211, 238);
  doc.text('AI-Powered Innovations in Drug Discovery and Development 2027', 105, 21, { align: 'center' });
  doc.setTextColor(226, 232, 240);
  doc.text('SRM College of Pharmacy, SRMIST & INTI International University', 105, 26, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL SUBMISSION RECEIPT', 20, 45);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 50);

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, 55, 170, 75, 2, 2, 'FD');

  const addRow = (label: string, value: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value, 75, y);
  };

  addRow('Abstract ID:', abstract.id, 65);
  addRow('Registration ID:', abstract.registrationId, 72);
  addRow('Presenting Author:', abstract.presentingAuthor?.fullName || abstract.presentingAuthor?.name || '', 79);
  addRow('Author Email:', abstract.presentingAuthor?.email || '', 86);
  addRow('Track:', abstract.trackId, 93);
  addRow('Presentation Type:', abstract.presentationPreference || 'Oral Presentation', 100);
  addRow('Submission Date:', new Date(abstract.createdAt).toLocaleString(), 107);
  addRow('Review Status:', abstract.status, 114);
  addRow('Keywords:', (abstract.keywords || []).join(', '), 121);

  // Abstract Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Abstract Title:', 20, 140);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const titleLines = doc.splitTextToSize(abstract.title, 170);
  doc.text(titleLines, 20, 147);

  // Instructions
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(20, 175, 170, 35, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(67, 56, 202);
  doc.text('Next Steps:', 25, 183);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  const noteLines = doc.splitTextToSize(
    'Your abstract has been successfully registered in the scientific proceedings system. You can track your review progress anytime on the conference portal using your Abstract ID and registered email address.',
    160
  );
  doc.text(noteLines, 25, 190);

  doc.save(`Abstract_Receipt_${abstract.id}.pdf`);
}
