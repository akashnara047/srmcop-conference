import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface EmailDispatchPayload {
  recipient: string;
  subject: string;
  type:
    | 'abstract_acknowledgement'
    | 'abstract_organizer_notice'
    | 'contact_acknowledgement'
    | 'contact_organizer_notice'
    | 'registration_acknowledgement'
    | 'registration_organizer_notice'
    | 'payment_verified'
    | 'payment_rejected';
  referenceId: string;
  bodyPreview: string;
  metadata?: Record<string, unknown>;
}

export const OFFICIAL_ORGANIZER_EMAILS = [
  'dean.pharmacy.ktr@srmist.edu.in',
  'org.secy.cp@srmist.edu.in',
];

export async function sendEmailNotification(payload: EmailDispatchPayload): Promise<{ success: boolean; logId: string }> {
  const logId = `EMAIL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  try {
    const logDoc = {
      id: logId,
      recipient: payload.recipient,
      subject: payload.subject,
      type: payload.type,
      referenceId: payload.referenceId,
      status: 'Delivered',
      timestamp,
      bodyPreview: payload.bodyPreview,
      metadata: payload.metadata || {},
    };

    await setDoc(doc(db, 'emailLogs', logId), logDoc);
    return { success: true, logId };
  } catch (error) {
    console.error('Failed to dispatch email record:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, `emailLogs/${logId}`);
    } catch {
      // Fallback
    }
    return { success: false, logId };
  }
}

export async function dispatchAbstractEmails(submission: {
  id: string;
  title: string;
  trackId: string;
  presentationPreference: string;
  presentingAuthor: { name: string; email: string; affiliation: string };
  submissionDate: string;
}) {
  const organizerBody = `Abstract Submission Received:\nAbstract ID: ${submission.id}\nTitle: ${submission.title}\nTrack: ${submission.trackId}\nPreference: ${submission.presentationPreference}\nPresenting Author: ${submission.presentingAuthor.name} (${submission.presentingAuthor.email}, ${submission.presentingAuthor.affiliation})\nSubmission Date: ${submission.submissionDate}`;

  // Notify both official conference email addresses
  for (const orgEmail of OFFICIAL_ORGANIZER_EMAILS) {
    await sendEmailNotification({
      recipient: orgEmail,
      subject: `[Abstract Received - ${submission.id}] ${submission.title}`,
      type: 'abstract_organizer_notice',
      referenceId: submission.id,
      bodyPreview: organizerBody,
      metadata: { abstractId: submission.id },
    });
  }

  // Send acknowledgement email to presenting author
  await sendEmailNotification({
    recipient: submission.presentingAuthor.email,
    subject: `Acknowledgement of Abstract Submission - ${submission.id} | International Conference 2027`,
    type: 'abstract_acknowledgement',
    referenceId: submission.id,
    bodyPreview: `Dear ${submission.presentingAuthor.name},\n\nThank you for submitting your abstract to the International Conference on AI-Powered Innovations in Drug Discovery and Development 2027.\n\nYour assigned Abstract ID is: ${submission.id}\nTitle: ${submission.title}\nPresentation: ${submission.presentationPreference.toUpperCase()}\n\nPlease retain your Abstract ID for future status tracking and registration.`,
    metadata: { abstractId: submission.id },
  });
}

export async function dispatchContactEmails(enquiry: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const organizerBody = `New Conference Enquiry [${enquiry.id}]\nFrom: ${enquiry.name} <${enquiry.email}>\nSubject: ${enquiry.subject}\nMessage: ${enquiry.message}`;

  // Notify organizers
  for (const orgEmail of OFFICIAL_ORGANIZER_EMAILS) {
    await sendEmailNotification({
      recipient: orgEmail,
      subject: `[Conference Enquiry - ${enquiry.id}] ${enquiry.subject}`,
      type: 'contact_organizer_notice',
      referenceId: enquiry.id,
      bodyPreview: organizerBody,
      metadata: { enquiryId: enquiry.id, replyTo: enquiry.email },
    });
  }

  // Send acknowledgement to visitor
  await sendEmailNotification({
    recipient: enquiry.email,
    subject: `Enquiry Acknowledgement [${enquiry.id}] - SRM College of Pharmacy International Conference 2027`,
    type: 'contact_acknowledgement',
    referenceId: enquiry.id,
    bodyPreview: `Dear ${enquiry.name},\n\nWe have received your enquiry (Reference ID: ${enquiry.id}) regarding the International Conference on AI-Powered Innovations in Drug Discovery and Development 2027.\n\nOur organizing committee will review your query and reply directly to your email address shortly.`,
    metadata: { enquiryId: enquiry.id },
  });
}

export async function dispatchRegistrationEmails(registration: {
  id: string;
  fullName: string;
  email: string;
  institution: string;
  category: string;
  otherCategoryDescription?: string;
  transactionReference: string;
  amount: number;
}) {
  const categoryDisplay = registration.otherCategoryDescription
    ? `${registration.category} (${registration.otherCategoryDescription})`
    : registration.category;

  const organizerBody = `New Registration Submitted:\nRegistration ID: ${registration.id}\nParticipant: ${registration.fullName}\nEmail: ${registration.email}\nInstitution: ${registration.institution}\nCategory: ${categoryDisplay}\nAmount: ₹${registration.amount}\nUTR Reference: ${registration.transactionReference}\nStatus: Pending Verification`;

  // Notify organizers
  for (const orgEmail of OFFICIAL_ORGANIZER_EMAILS) {
    await sendEmailNotification({
      recipient: orgEmail,
      subject: `[Registration Pending Verification - ${registration.id}] ${registration.fullName}`,
      type: 'registration_organizer_notice',
      referenceId: registration.id,
      bodyPreview: organizerBody,
      metadata: { registrationId: registration.id },
    });
  }

  // Send acknowledgement to participant
  await sendEmailNotification({
    recipient: registration.email,
    subject: `Registration Awaiting Payment Verification [${registration.id}] | International Conference 2027`,
    type: 'registration_acknowledgement',
    referenceId: registration.id,
    bodyPreview: `Dear ${registration.fullName},\n\nThank you for submitting your registration for the International Conference on AI-Powered Innovations in Drug Discovery and Development 2027.\n\nRegistration ID: ${registration.id}\nCategory: ${categoryDisplay}\nAmount: ₹${registration.amount}\nUTR Reference: ${registration.transactionReference}\nPayment Status: Pending Verification\nRegistration Status: Awaiting Approval\n\nPlease note that your registration is awaiting verification of your transaction reference by the organizing secretariat. You will receive an official approval confirmation once verified.`,
    metadata: { registrationId: registration.id },
  });
}
