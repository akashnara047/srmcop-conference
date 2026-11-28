import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  REQUEST_TIMEOUT_MS,
  applyRestrictedCors,
  getAppsScriptConfig,
  resolveEmailCcRecipient,
  sanitizeErrorMessage,
  sendJson,
} from '../_lib/emailConfig.ts';
import {
  AUTHORIZED_ADMIN_EMAILS,
  AuthVerificationError,
  getFirestoreDocument,
  verifyFirebaseAdminBearerToken,
} from '../_lib/firebaseServerVerify.ts';

export type EmailEventType =
  | 'registration_received'
  | 'registration_confirmation'
  | 'abstract_confirmation'
  | 'abstract_acceptance';

interface ConferenceEmailBuildResult {
  subject: string;
  htmlBody: string;
  textBody: string;
  structuredData: Record<string, unknown>;
}

interface PdfAttachmentPayload {
  filename: string;
  mimeType: string;
  base64: string;
  decodedBytes: number;
}

interface SendEmailRequestBody {
  eventId?: unknown;
  eventType?: unknown;
  registrationId?: unknown;
  regDocId?: unknown;
  abstractId?: unknown;
  isAdminRetry?: unknown;
  testMode?: unknown;
  testRecipient?: unknown;
  attachment?: unknown;
}

interface DispatchOutcome {
  statusCode: number;
  body: Record<string, unknown>;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]{3,128}$/;
const MAX_REQUEST_BYTES = 6 * 1024 * 1024; // 6 MB
const MAX_ATTACHMENT_BASE64_LENGTH = 4 * 1024 * 1024; // ~3 MB decoded
const SENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const VALID_EVENT_TYPES = new Set<EmailEventType>([
  'registration_received',
  'registration_confirmation',
  'abstract_confirmation',
  'abstract_acceptance',
]);

const CONFERENCE_TITLE =
  'International Conference on AI-Powered Innovations in Drug Discovery and Development';
const CONFERENCE_SHORT = 'SRMCON 2027';
const CONFERENCE_DATES = '15–16 February 2027';
const CONFERENCE_HOST = 'SRM College of Pharmacy, SRMIST';
const CONFERENCE_VENUE =
  'SRM College of Pharmacy, SRM Institute of Science and Technology (SRMIST), Kattankulathur, Tamil Nadu, India';
const CONFERENCE_COLLABORATOR = 'INTI International University, Malaysia';
const SECRETARIAT_EMAIL = 'org.secy.cp@srmist.edu.in';
const CONVENOR_EMAIL = 'dean.pharmacy.ktr@srmist.edu.in';

const TRACK_TITLES: Record<string, string> = {
  'track-01': 'Track 01: Pharmaceutical Technology & Pharmaceutics',
  'track-02': 'Track 02: Pharmacology & Experimental Therapeutics',
  'track-03': 'Track 03: Pharmaceutical Chemistry & Drug Discovery',
  'track-04': 'Track 04: Pharmaceutical Analysis & Analytical Technologies',
  'track-05': 'Track 05: Pharmacy Practice & Clinical Pharmacy',
  'track-06': 'Track 06: Pharmacognosy & Natural Product Research',
  'track-07': 'Track 07: Regulatory Affairs & Pharmaceutical Quality Assurance',
};

const inFlightDispatches = new Map<string, Promise<DispatchOutcome>>();
const completedDispatches = new Map<
  string,
  { sentAt: string; recipient: string; cachedAt: number }
>();


// ---------------------------------------------------------------------------
// Authoritative Institutional Email Templates
// ---------------------------------------------------------------------------
function resolveTrackTitle(trackId: unknown): string {
  const raw = typeof trackId === 'string' ? trackId.trim() : '';
  if (!raw) return 'Scientific Track Not Specified';
  return TRACK_TITLES[raw] || raw;
}

function escapeHtml(value: unknown): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateReadable(isoOrDate: unknown): string {
  if (typeof isoOrDate !== 'string' || !isoOrDate.trim()) {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function renderKeyValueRows(
  rows: Array<{ label: string; value: string; monospace?: boolean }>
): string {
  return rows
    .map(
      ({ label, value, monospace }) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px; font-weight: 600; width: 38%; vertical-align: top;">
          ${escapeHtml(label)}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 600; vertical-align: top; ${
          monospace ? "font-family: 'Courier New', Courier, monospace;" : ''
        }">
          ${escapeHtml(value)}
        </td>
      </tr>`
    )
    .join('');
}

function wrapInstitutionalEmailLayout(params: {
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  heading: string;
  recipientName: string;
  introParagraphHtml: string;
  detailsRows: Array<{ label: string; value: string; monospace?: boolean }>;
  nextStepsTitle: string;
  nextStepsItemsHtml: string[];
  closingNoteHtml?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1fd; font-family: Arial, Helvetica, sans-serif; color: #1e293b; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f1fd; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 640px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dcd3fa;">
          <tr>
            <td style="background-color: #0f1b4b; padding: 24px 24px 20px 24px; text-align: center; border-bottom: 4px solid #6d3ce2;">
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #22d3ee; margin-bottom: 6px;">
                ${escapeHtml(CONFERENCE_SHORT)} &middot; ${escapeHtml(CONFERENCE_DATES)}
              </div>
              <div style="font-size: 18px; font-weight: 700; line-height: 1.35; color: #ffffff; margin: 0 0 8px 0;">
                ${escapeHtml(CONFERENCE_TITLE)}
              </div>
              <div style="font-size: 12px; color: #e2e8f0; line-height: 1.5;">
                Organised by <strong>${escapeHtml(CONFERENCE_HOST)}</strong><br />
                In Collaboration with <strong>${escapeHtml(CONFERENCE_COLLABORATOR)}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 10px 24px;">
              <div style="display: inline-block; padding: 5px 12px; border-radius: 999px; background-color: ${params.badgeBg}; color: ${params.badgeColor}; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 12px;">
                ${escapeHtml(params.badgeText)}
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 20px; line-height: 1.3; color: #0f1b4b; font-weight: 700;">
                ${escapeHtml(params.heading)}
              </h1>
              <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>${escapeHtml(params.recipientName)}</strong>,
              </p>
              <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                ${params.introParagraphHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; border-collapse: collapse;">
                ${renderKeyValueRows(params.detailsRows)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 24px 18px 24px;">
              <div style="background-color: #faf8fe; border: 1px solid #ddd6fe; border-left: 4px solid #6d3ce2; border-radius: 8px; padding: 14px 16px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #5b21b6; margin-bottom: 8px;">
                  ${escapeHtml(params.nextStepsTitle)}
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #334155;">
                  ${params.nextStepsItemsHtml.map((item) => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                </ul>
              </div>
            </td>
          </tr>
          ${
            params.closingNoteHtml
              ? `<tr>
                  <td style="padding: 0 24px 16px 24px; font-size: 13px; line-height: 1.6; color: #475569;">
                    ${params.closingNoteHtml}
                  </td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding: 16px 24px 22px 24px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">Warm regards,</p>
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f1b4b;">
                Organising Secretariat &mdash; SRMCON 2027
              </p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; line-height: 1.5;">
                Dr. N. Damodharan (Organising Secretary &amp; Vice Principal) &middot; Dr. V. Chitra (Conference Convenor &amp; Dean)<br />
                ${escapeHtml(CONFERENCE_VENUE)}<br />
                Secretariat Desk: <a href="mailto:${SECRETARIAT_EMAIL}" style="color: #6d3ce2; text-decoration: none;">${SECRETARIAT_EMAIL}</a> &middot;
                <a href="mailto:${CONVENOR_EMAIL}" style="color: #6d3ce2; text-decoration: none;">${CONVENOR_EMAIL}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0b0f33; padding: 14px 20px; text-align: center; font-size: 11px; color: #cbd5e1; line-height: 1.5;">
              &copy; 2027 SRM College of Pharmacy, SRMIST &middot; In Collaboration with INTI International University, Malaysia<br />
              This is an automated conference notification. Please quote your Registration ID / Abstract ID in all correspondence.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatParticipantDisplayNameEmail(reg: Record<string, unknown>): string {
  const title = typeof reg.title === 'string' ? reg.title.trim() : '';
  const fullName = typeof reg.fullName === 'string' ? reg.fullName.trim() : '';
  if (title && fullName) return `${title} ${fullName}`;
  return fullName || title || 'Delegate';
}

function getEmailYearOptions(course: string): readonly string[] {
  if (course === 'B.Pharm') return ['I Year', 'II Year', 'III Year', 'IV Year'];
  if (course === 'Pharm.D') return ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year', 'VI Year'];
  if (course === 'M.Pharm') return ['I Year', 'II Year'];
  return [];
}

function extractRegistrationProfileRowsEmail(reg: Record<string, unknown>): {
  rows: Array<{ label: string; value: string }>;
  structuredProps: Record<string, string>;
} {
  const title = typeof reg.title === 'string' ? reg.title.trim() : '';
  const course = typeof reg.course === 'string' ? reg.course.trim() : '';
  const specialisation = typeof reg.specialisation === 'string' ? reg.specialisation.trim() : '';
  const otherDegree = typeof reg.otherDegree === 'string' ? reg.otherDegree.trim() : '';
  const designation = typeof reg.designation === 'string' ? reg.designation.trim() : '';
  const facultyDesignation =
    typeof reg.facultyDesignation === 'string' ? reg.facultyDesignation.trim() : '';
  const yearOfStudy = typeof reg.yearOfStudy === 'string' ? reg.yearOfStudy.trim() : '';
  const legacyCourseOrDesig =
    typeof reg.courseOrDesignation === 'string' ? reg.courseOrDesignation.trim() : '';

  const rows: Array<{ label: string; value: string }> = [];
  const structuredProps: Record<string, string> = {};
  if (title) structuredProps.title = title;

  if (course || designation) {
    if (course) {
      rows.push({ label: 'Course / Programme', value: course });
      structuredProps.course = course;
    }
    if (course === 'M.Pharm' && specialisation) {
      rows.push({ label: 'Specialisation', value: specialisation });
      structuredProps.specialisation = specialisation;
    }
    if (course === 'Other Degrees' && otherDegree) {
      rows.push({ label: 'Other Degree', value: otherDegree });
      structuredProps.otherDegree = otherDegree;
    }
    if (designation) {
      rows.push({ label: 'Designation', value: designation });
      structuredProps.designation = designation;
    }
    if (designation === 'Faculty' && facultyDesignation) {
      rows.push({ label: 'Faculty Designation', value: facultyDesignation });
      structuredProps.facultyDesignation = facultyDesignation;
    }
    if (
      designation === 'Student' &&
      getEmailYearOptions(course).length > 0 &&
      yearOfStudy
    ) {
      rows.push({ label: 'Year of Study', value: yearOfStudy });
      structuredProps.yearOfStudy = yearOfStudy;
    }
  } else if (legacyCourseOrDesig) {
    rows.push({ label: 'Course / Designation', value: legacyCourseOrDesig });
  }

  return { rows, structuredProps };
}

function buildRegistrationReceivedEmail(reg: Record<string, unknown>): ConferenceEmailBuildResult {
  const fullName = formatParticipantDisplayNameEmail(reg);
  const profileDetails = extractRegistrationProfileRowsEmail(reg);
  const registrationId = String(reg.registrationId || reg.id || '').trim();
  const email = String(reg.email || '').trim();
  const baseCategory = String(reg.category || 'Delegate').trim();
  const otherCategory = String(reg.otherCategoryDescription || '').trim();
  const categoryDisplay = otherCategory ? `${baseCategory} (${otherCategory})` : baseCategory;
  const rawParticipationMode = String(
    reg.participationMode || reg.modeOfParticipation || 'Not specified'
  ).trim();
  const isVirtual =
    rawParticipationMode.toLowerCase().includes('virtual') ||
    rawParticipationMode.toLowerCase().includes('online');
  const participationModeDisplay = isVirtual ? 'Virtual' : rawParticipationMode;
  const transactionReference = String(reg.transactionReference || '').trim();
  const paymentAmount = reg.paymentAmount ?? reg.amount ?? '';
  const rawCurrency = String(reg.paymentCurrency || reg.currency || '').trim().toUpperCase();
  const amountDisplay = paymentAmount
    ? rawCurrency === 'MYR' || rawCurrency === 'USD'
      ? `${rawCurrency} ${paymentAmount}`
      : `INR ${paymentAmount}`
    : 'Submitted on form';

  const subject = 'SRMCON 2027 – Registration Received';

  const detailsRows = [
    { label: 'Participant Name', value: fullName },
    { label: 'Registration ID', value: registrationId, monospace: true },
    { label: 'Registered Email', value: email },
    ...profileDetails.rows,
    { label: 'Participant Category', value: categoryDisplay },
    ...(isVirtual
      ? [{ label: 'Participant Type', value: 'International Virtual Participant' }]
      : []),
    { label: 'Participation Mode', value: participationModeDisplay },
    { label: 'Conference Title', value: CONFERENCE_TITLE },
    { label: 'Conference Dates', value: CONFERENCE_DATES },
    ...(isVirtual
      ? [{ label: 'Attendance Mode', value: 'Virtual / Online Conference Access (International Participants)' }]
      : [{ label: 'Venue', value: CONFERENCE_VENUE }]),
    { label: 'Payment Verification Status', value: 'Pending Verification (Submitted for Review)' },
  ];

  const htmlBody = wrapInstitutionalEmailLayout({
    badgeText: isVirtual
      ? 'Registration Received · International Virtual Participant'
      : 'Registration Received · Payment Pending Verification',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    heading: 'Registration Details Received',
    recipientName: fullName,
    introParagraphHtml: isVirtual
      ? `Thank you for submitting your registration as an <strong>International Virtual Participant</strong> for the <strong>${escapeHtml(
          CONFERENCE_TITLE
        )} (${CONFERENCE_SHORT})</strong>. Your virtual registration details have been recorded under Registration ID <strong>${escapeHtml(
          registrationId
        )}</strong>.<br /><br /><strong>Important:</strong> Your registration is currently <strong>awaiting payment verification</strong> and is not yet officially confirmed.`
      : `Thank you for submitting your registration for the <strong>${escapeHtml(
          CONFERENCE_TITLE
        )} (${CONFERENCE_SHORT})</strong>. Your registration details have been recorded under Registration ID <strong>${escapeHtml(
          registrationId
        )}</strong>.<br /><br /><strong>Important:</strong> Your registration is currently <strong>awaiting payment verification</strong> and is not yet officially confirmed.`,
    detailsRows,
    nextStepsTitle: 'Payment Verification & Next Steps',
    nextStepsItemsHtml: [
      `Your submitted payment details (Amount: <strong>${escapeHtml(
        amountDisplay
      )}</strong>${transactionReference ? `, Reference/UTR: <strong>${escapeHtml(transactionReference)}</strong>` : ''}) are queued for verification by the Organising Secretariat.`,
      isVirtual
        ? `Once your payment is verified and approved, you will receive an official <strong>Registration Confirmation email</strong> along with your official Registration Confirmation PDF for Virtual participation.`
        : `Once your payment is verified and approved, you will receive an official <strong>Registration Confirmation email</strong> along with your official Registration Confirmation PDF.`,
      `Please retain your Registration ID (<strong>${escapeHtml(
        registrationId
      )}</strong>). You can track your verification status anytime via the Registration Portal and use this ID if you wish to submit a scientific abstract.`,
    ],
  });

  const textBody = [
    `Dear ${fullName},`,
    '',
    isVirtual
      ? `Thank you for submitting your registration as an International Virtual Participant for ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}).`
      : `Thank you for submitting your registration for ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}).`,
    'Your registration details have been received and are currently awaiting payment verification (not yet officially confirmed).',
    '',
    `Registration ID: ${registrationId}`,
    `Registered Email: ${email}`,
    ...profileDetails.rows.map((r) => `${r.label}: ${r.value}`),
    `Participant Category: ${categoryDisplay}`,
    ...(isVirtual ? ['Participant Type: International Virtual Participant'] : []),
    `Participation Mode: ${participationModeDisplay}`,
    `Conference Dates: ${CONFERENCE_DATES}`,
    ...(isVirtual
      ? ['Attendance Mode: Virtual / Online Conference Access (International Participants)']
      : [`Venue: ${CONFERENCE_VENUE}`]),
    `Collaborating Institution: ${CONFERENCE_COLLABORATOR}`,
    `Payment Status: Pending Verification (${amountDisplay}${transactionReference ? `, Ref: ${transactionReference}` : ''})`,
    '',
    'Next Steps:',
    '- The Organising Secretariat will verify your submitted payment reference.',
    '- Once verified, you will receive an official Registration Confirmed email with your official Confirmation PDF.',
    `- Quote Registration ID ${registrationId} for status checks or abstract submission.`,
    '',
    'Warm regards,',
    'Organising Secretariat – SRMCON 2027',
    `SRM College of Pharmacy, SRMIST (${SECRETARIAT_EMAIL})`,
  ].join('\n');

  return {
    subject,
    htmlBody,
    textBody,
    structuredData: {
      participantName: fullName,
      ...profileDetails.structuredProps,
      registrationId,
      email,
      category: categoryDisplay,
      ...(isVirtual ? { participantType: 'International Virtual Participant' } : {}),
      participationMode: participationModeDisplay,
      conferenceTitle: CONFERENCE_TITLE,
      conferenceDates: CONFERENCE_DATES,
      ...(isVirtual
        ? { attendanceMode: 'Virtual / Online Conference Access' }
        : { venue: CONFERENCE_VENUE }),
      paymentStatus: 'Pending Verification',
    },
  };
}

function buildRegistrationConfirmedEmail(reg: Record<string, unknown>): ConferenceEmailBuildResult {
  const fullName = formatParticipantDisplayNameEmail(reg);
  const profileDetails = extractRegistrationProfileRowsEmail(reg);
  const registrationId = String(reg.registrationId || reg.id || '').trim();
  const email = String(reg.email || '').trim();
  const baseCategory = String(reg.category || 'Delegate').trim();
  const otherCategory = String(reg.otherCategoryDescription || '').trim();
  const categoryDisplay = otherCategory ? `${baseCategory} (${otherCategory})` : baseCategory;
  const rawParticipationMode = String(
    reg.participationMode || reg.modeOfParticipation || 'Offline (On-site at SRMIST)'
  ).trim();
  const isVirtual =
    rawParticipationMode.toLowerCase().includes('virtual') ||
    rawParticipationMode.toLowerCase().includes('online');
  const participationModeDisplay = isVirtual ? 'Virtual' : rawParticipationMode;
  const paymentAmount = reg.paymentAmount ?? reg.amount ?? '';
  const rawCurrency = String(reg.paymentCurrency || reg.currency || '').trim().toUpperCase();
  const paymentMode = String(reg.paymentMode || '').trim();
  const transactionReference = String(reg.transactionReference || '').trim();
  const verifiedAtFormatted = reg.verifiedAt
    ? formatDateReadable(reg.verifiedAt)
    : formatDateReadable(new Date().toISOString());

  const paymentSummaryParts: string[] = [];
  if (paymentAmount) {
    paymentSummaryParts.push(
      rawCurrency === 'MYR' || rawCurrency === 'USD'
        ? `${rawCurrency} ${paymentAmount}`
        : `INR ${paymentAmount}`
    );
  }
  if (paymentMode) paymentSummaryParts.push(paymentMode);
  if (transactionReference) paymentSummaryParts.push(`Ref/UTR: ${transactionReference}`);
  const paymentSummary =
    paymentSummaryParts.length > 0 ? paymentSummaryParts.join(' · ') : 'Verified by Secretariat';

  const subject = 'SRMCON 2027 – Registration Confirmed';

  const detailsRows = [
    { label: 'Participant Name', value: fullName },
    { label: 'Official Registration ID', value: registrationId, monospace: true },
    ...profileDetails.rows,
    { label: 'Participant Category', value: categoryDisplay },
    ...(isVirtual
      ? [{ label: 'Participant Type', value: 'International Virtual Participant' }]
      : []),
    { label: 'Participation Mode', value: participationModeDisplay },
    { label: 'Payment Verification', value: `Verified on ${verifiedAtFormatted}` },
    { label: 'Payment Details', value: paymentSummary },
    { label: 'Conference Dates', value: CONFERENCE_DATES },
    ...(isVirtual
      ? [{ label: 'Attendance Mode', value: 'Virtual / Online Conference Access (International Participants)' }]
      : [{ label: 'Venue', value: CONFERENCE_VENUE }]),
  ];

  const htmlBody = wrapInstitutionalEmailLayout({
    badgeText: isVirtual
      ? 'Payment Verified · Confirmed International Virtual Participant'
      : 'Payment Verified · Registration Confirmed',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    heading: 'Official Conference Registration Confirmation',
    recipientName: fullName,
    introParagraphHtml: isVirtual
      ? `We are pleased to confirm that your payment has been verified and your registration as an <strong>International Virtual Participant</strong> for the <strong>${escapeHtml(
          CONFERENCE_TITLE
        )} (${CONFERENCE_SHORT})</strong> is officially <strong>CONFIRMED</strong>.<br /><br />Your official Registration Confirmation PDF is attached to this email for your records.`
      : `We are pleased to confirm that your payment has been verified and your registration for the <strong>${escapeHtml(
          CONFERENCE_TITLE
        )} (${CONFERENCE_SHORT})</strong> is officially <strong>CONFIRMED</strong>.<br /><br />Your official Registration Confirmation PDF is attached to this email for your records.`,
    detailsRows,
    nextStepsTitle: isVirtual ? 'Virtual Participation Information' : 'Participation Information',
    nextStepsItemsHtml: [
      `Please retain your official Registration ID (<strong>${escapeHtml(
        registrationId
      )}</strong>) and the attached Registration Confirmation PDF.`,
      isVirtual
        ? `As an <strong>International Virtual Participant</strong> (Participation Mode: <strong>Virtual</strong>), you will receive virtual conference access links and session schedule communications from the Organising Secretariat prior to the conference.`
        : `For <strong>On-site</strong> check-in and delegate kit issuance at SRMIST Kattankulathur, please present the attached Registration Confirmation PDF along with a valid photo ID at the registration desk.`,
      `If you plan to present research work, you may submit and track your abstract via the Abstract Portal using Registration ID <strong>${escapeHtml(
        registrationId
      )}</strong>.`,
    ],
  });

  const textBody = [
    `Dear ${fullName},`,
    '',
    isVirtual
      ? `Your payment has been verified and your registration as an International Virtual Participant for ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}) is officially CONFIRMED.`
      : `Your payment has been verified and your registration for ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}) is officially CONFIRMED.`,
    '',
    `Official Registration ID: ${registrationId}`,
    ...profileDetails.rows.map((r) => `${r.label}: ${r.value}`),
    `Participant Category: ${categoryDisplay}`,
    ...(isVirtual ? ['Participant Type: International Virtual Participant'] : []),
    `Participation Mode: ${participationModeDisplay}`,
    `Payment Confirmation: Verified on ${verifiedAtFormatted} (${paymentSummary})`,
    `Conference Dates: ${CONFERENCE_DATES}`,
    ...(isVirtual
      ? ['Attendance Mode: Virtual / Online Conference Access (International Participants)']
      : [`Venue: ${CONFERENCE_VENUE}`]),
    `Collaborating Institution: ${CONFERENCE_COLLABORATOR}`,
    '',
    'Your official Registration Confirmation PDF is attached to this email.',
    ...(isVirtual
      ? [
          'As an International Virtual Participant, virtual session access instructions will be shared by the Organising Secretariat prior to the conference.',
        ]
      : []),
    `Please quote Registration ID ${registrationId} in all conference communications.`,
    '',
    'Warm regards,',
    'Organising Secretariat – SRMCON 2027',
    `SRM College of Pharmacy, SRMIST (${SECRETARIAT_EMAIL})`,
  ].join('\n');

  return {
    subject,
    htmlBody,
    textBody,
    structuredData: {
      participantName: fullName,
      ...profileDetails.structuredProps,
      registrationId,
      email,
      category: categoryDisplay,
      ...(isVirtual ? { participantType: 'International Virtual Participant' } : {}),
      participationMode: participationModeDisplay,
      paymentStatus: 'Verified',
      registrationStatus: 'Approved',
      paymentSummary,
      verifiedAt: verifiedAtFormatted,
      conferenceTitle: CONFERENCE_TITLE,
      conferenceDates: CONFERENCE_DATES,
      ...(isVirtual
        ? { attendanceMode: 'Virtual / Online Conference Access' }
        : { venue: CONFERENCE_VENUE }),
    },
  };
}

function buildAbstractSubmittedEmail(abs: Record<string, unknown>): ConferenceEmailBuildResult {
  const presentingAuthor = (abs.presentingAuthor || {}) as Record<string, unknown>;
  const authorName = String(
    presentingAuthor.fullName || presentingAuthor.name || 'Presenting Author'
  ).trim();
  const authorEmail = String(presentingAuthor.email || '').trim();
  const abstractId = String(abs.id || '').trim();
  const registrationId = String(abs.registrationId || '').trim();
  const title = String(abs.title || 'Untitled Abstract').trim();
  const trackTitle = resolveTrackTitle(abs.trackId);
  const preferredMode = String(
    abs.presentationPreference || abs.presentationType || 'Not specified'
  ).trim();
  const submissionDate = formatDateReadable(abs.createdAt);

  const subject = 'SRMCON 2027 – Abstract Submission Acknowledgement';

  const detailsRows = [
    { label: 'Presenting Author', value: authorName },
    { label: 'Abstract ID', value: abstractId, monospace: true },
    { label: 'Linked Registration ID', value: registrationId, monospace: true },
    { label: 'Abstract Title', value: title },
    { label: 'Selected Scientific Track', value: trackTitle },
    { label: 'Preferred Presentation Mode', value: preferredMode },
    { label: 'Submission Date', value: submissionDate },
    { label: 'Current Review Status', value: 'Received – Awaiting Scientific Review' },
    { label: 'Conference Dates & Venue', value: `${CONFERENCE_DATES} · ${CONFERENCE_VENUE}` },
  ];

  const htmlBody = wrapInstitutionalEmailLayout({
    badgeText: 'Abstract Received · Awaiting Review',
    badgeBg: '#ede9fe',
    badgeColor: '#5b21b6',
    heading: 'Abstract Submission Acknowledgement',
    recipientName: authorName,
    introParagraphHtml: `Thank you for submitting your abstract to the <strong>${escapeHtml(
      CONFERENCE_TITLE
    )} (${CONFERENCE_SHORT})</strong>. This email confirms that your submission has been successfully received and is currently <strong>awaiting review</strong> by the Scientific Review Committee.<br /><br />Your Abstract Submission Acknowledgement PDF is attached for your records.`,
    detailsRows,
    nextStepsTitle: 'Peer Review & Next Steps',
    nextStepsItemsHtml: [
      `Your abstract has been assigned Reference ID <strong>${escapeHtml(
        abstractId
      )}</strong>. Please quote this ID in all future scientific correspondence.`,
      `Your submission will be evaluated by the Scientific Review Committee for originality, methodology, and track alignment. Submission acknowledgement does not constitute final acceptance.`,
      `Once review is completed, an official acceptance notification will be sent if your abstract is accepted. You may check live review progress anytime in the Abstract Submission Portal.`,
    ],
  });

  const textBody = [
    `Dear ${authorName},`,
    '',
    `Thank you for submitting your abstract to ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}).`,
    'Your abstract has been received and is awaiting review by the Scientific Review Committee.',
    '',
    `Abstract ID: ${abstractId}`,
    `Linked Registration ID: ${registrationId}`,
    `Abstract Title: ${title}`,
    `Selected Scientific Track: ${trackTitle}`,
    `Preferred Presentation Mode: ${preferredMode}`,
    `Submission Date: ${submissionDate}`,
    'Status: Received – Awaiting Review',
    `Conference Dates: ${CONFERENCE_DATES}`,
    `Venue: ${CONFERENCE_VENUE}`,
    '',
    'Your Abstract Submission Acknowledgement PDF is attached to this email.',
    '',
    'Warm regards,',
    'Organising Secretariat – SRMCON 2027',
    `SRM College of Pharmacy, SRMIST (${SECRETARIAT_EMAIL})`,
  ].join('\n');

  return {
    subject,
    htmlBody,
    textBody,
    structuredData: {
      authorName,
      email: authorEmail,
      abstractId,
      registrationId,
      abstractTitle: title,
      trackTitle,
      preferredMode,
      submissionDate,
      status: 'Submitted',
      conferenceTitle: CONFERENCE_TITLE,
      conferenceDates: CONFERENCE_DATES,
      venue: CONFERENCE_VENUE,
    },
  };
}

function buildAbstractAcceptedEmail(abs: Record<string, unknown>): ConferenceEmailBuildResult {
  const presentingAuthor = (abs.presentingAuthor || {}) as Record<string, unknown>;
  const authorName = String(
    presentingAuthor.fullName || presentingAuthor.name || 'Presenting Author'
  ).trim();
  const authorEmail = String(presentingAuthor.email || '').trim();
  const institution = String(
    presentingAuthor.affiliation || presentingAuthor.institution || ''
  ).trim();
  const abstractId = String(abs.id || '').trim();
  const registrationId = String(abs.registrationId || '').trim();
  const title = String(abs.title || 'Untitled Abstract').trim();
  const trackTitle = resolveTrackTitle(abs.trackId);

  const presentationId = String(abs.presentationAllocationId || '').trim();
  const presentationCategory =
    typeof abs.officialAllocationCategory === 'string' && abs.officialAllocationCategory.trim()
      ? abs.officialAllocationCategory.trim()
      : typeof abs.allottedPresentationFormat === 'string' && abs.allottedPresentationFormat.trim()
      ? abs.allottedPresentationFormat.trim()
      : typeof abs.finalPresentationFormat === 'string' && abs.finalPresentationFormat.trim()
      ? abs.finalPresentationFormat.trim()
      : '';

  if (!presentationId || !presentationCategory) {
    throw new Error(
      `Consolidated acceptance email requires committed Presentation ID and Presentation Category for abstract ${abstractId || 'unknown'}.`
    );
  }

  const acceptanceDate = formatDateReadable(
    abs.reviewedAt || abs.allocationCreatedAt || abs.updatedAt
  );
  const reviewNotes =
    typeof abs.reviewNotes === 'string' && abs.reviewNotes.trim() ? abs.reviewNotes.trim() : '';

  const subject = `SRMCON 2027 – Abstract Accepted | Presentation Allocation Confirmed | ${presentationId}`;

  const detailsRows: Array<{ label: string; value: string; monospace?: boolean }> = [
    { label: 'Presenting Author', value: authorName },
    ...(institution ? [{ label: 'Institution', value: institution }] : []),
    { label: 'ABSTRACT ID', value: abstractId, monospace: true },
    { label: 'PRESENTATION ID', value: presentationId, monospace: true },
    { label: 'PRESENTATION CATEGORY', value: presentationCategory },
    { label: 'Abstract Title', value: title },
    { label: 'Scientific Track', value: trackTitle },
    { label: 'Acceptance Date', value: acceptanceDate },
    { label: 'Linked Registration ID', value: registrationId, monospace: true },
    { label: 'Conference Dates', value: CONFERENCE_DATES },
    {
      label: 'Venue',
      value: 'SRM Institute of Science and Technology (SRMIST), Kattankulathur, Tamil Nadu, India',
    },
  ];

  if (reviewNotes) {
    detailsRows.push({ label: 'Committee Remarks', value: reviewNotes });
  }

  const htmlBody = wrapInstitutionalEmailLayout({
    badgeText: 'Abstract Accepted · Presentation Allocation Confirmed',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    heading: 'Abstract Acceptance & Presentation Allocation Confirmation',
    recipientName: authorName,
    introParagraphHtml: `Greetings from SRMCON 2027.<br /><br />We are pleased to inform you that your abstract titled &ldquo;<strong>${escapeHtml(
      title
    )}</strong>&rdquo; has been <strong>accepted</strong> for presentation at the International Conference on &ldquo;<strong>${escapeHtml(
      CONFERENCE_TITLE
    )}</strong>&rdquo;, scheduled for <strong>${escapeHtml(
      CONFERENCE_DATES
    )}</strong> at <strong>SRM Institute of Science and Technology (SRMIST), Kattankulathur, Tamil Nadu, India</strong>.<br /><br />Your consolidated <strong>Abstract Acceptance and Presentation Allocation Confirmation PDF</strong> is attached to this email for your records.`,
    detailsRows,
    nextStepsTitle: 'Important Instructions – Presentation ID vs. Abstract ID',
    nextStepsItemsHtml: [
      `<strong>Use Your Presentation ID (Not Abstract ID):</strong> Your allocated Presentation ID (<strong>${escapeHtml(
        presentationId
      )}</strong>) is strictly separate from your original Abstract ID (<strong>${escapeHtml(
        abstractId
      )}</strong>). Please use your <strong>Presentation ID</strong> (<strong>${escapeHtml(
        presentationId
      )}</strong>) when preparing and submitting your presentation materials and for all presentation-related correspondence.`,
      `<strong>Do Not Enter Abstract ID in Presentation Fields:</strong> Always quote <strong>${escapeHtml(
        presentationId
      )}</strong> &mdash; do not enter your Abstract ID (<strong>${escapeHtml(
        abstractId
      )}</strong>) in any Presentation ID field.`,
      `<strong>Allocated Category &amp; Guidelines:</strong> Your abstract is allocated to <strong>${escapeHtml(
        presentationCategory
      )}</strong>. Please prepare your slides/poster strictly in accordance with the official ${escapeHtml(
        presentationCategory
      )} guidelines and templates on the SRMCON 2027 website.`,
      `<strong>Registration &amp; Schedule:</strong> Please retain the attached confirmation PDF and ensure your conference registration under Registration ID <strong>${escapeHtml(
        registrationId
      )}</strong> is verified. Session timings and hall allocations will be shared prior to <strong>${escapeHtml(
        CONFERENCE_DATES
      )}</strong>.`,
    ],
    closingNoteHtml:
      '<strong>Organising Committee &middot; SRMCON 2027</strong><br />SRM College of Pharmacy, SRM Institute of Science and Technology (SRMIST)',
  });

  const textBody = [
    `Dear ${authorName},`,
    '',
    'Greetings from SRMCON 2027.',
    '',
    `We are pleased to inform you that your abstract titled "${title}" has been accepted for presentation at the International Conference on "${CONFERENCE_TITLE}", scheduled for ${CONFERENCE_DATES} at SRM Institute of Science and Technology (SRMIST), Kattankulathur, Tamil Nadu, India.`,
    '',
    `ABSTRACT ID: ${abstractId}`,
    `PRESENTATION ID: ${presentationId}`,
    `PRESENTATION CATEGORY: ${presentationCategory}`,
    ...(institution ? [`INSTITUTION: ${institution}`] : []),
    `SCIENTIFIC TRACK: ${trackTitle}`,
    `ACCEPTANCE DATE: ${acceptanceDate}`,
    `LINKED REGISTRATION ID: ${registrationId}`,
    ...(reviewNotes ? [`COMMITTEE REMARKS: ${reviewNotes}`] : []),
    '',
    'IMPORTANT INSTRUCTIONS:',
    `- Your Presentation ID (${presentationId}) is separate from your original Abstract ID (${abstractId}).`,
    `- Please use your Presentation ID (${presentationId}), NOT your Abstract ID (${abstractId}), when preparing and submitting your presentation materials and for all presentation-related correspondence.`,
    '- Do not enter your Abstract ID in any Presentation ID field.',
    `- Prepare your presentation in accordance with the official ${presentationCategory} guidelines and templates available on the SRMCON 2027 website.`,
    '- Your Abstract Acceptance and Presentation Allocation Confirmation PDF is attached to this email.',
    `- Ensure your conference registration under Registration ID ${registrationId} is verified if not already completed.`,
    '',
    'Warm regards,',
    'Organising Committee',
    'SRMCON 2027',
    'SRM College of Pharmacy',
    'SRM Institute of Science and Technology (SRMIST)',
    `Secretariat Desk: ${SECRETARIAT_EMAIL}`,
  ].join('\n');

  return {
    subject,
    htmlBody,
    textBody,
    structuredData: {
      authorName,
      email: authorEmail,
      institution,
      abstractId,
      presentationId,
      presentationCategory,
      registrationId,
      abstractTitle: title,
      trackTitle,
      acceptanceDate,
      status: 'Accepted',
      conferenceTitle: CONFERENCE_TITLE,
      conferenceDates: CONFERENCE_DATES,
      venue: CONFERENCE_VENUE,
    },
  };
}

// ---------------------------------------------------------------------------
// Request Parsing, Validation & Apps Script Dispatch
// ---------------------------------------------------------------------------
function pruneCompletedCache(): void {
  const cutoff = Date.now() - SENT_CACHE_TTL_MS;
  for (const [key, entry] of completedDispatches.entries()) {
    if (entry.cachedAt < cutoff) {
      completedDispatches.delete(key);
    }
  }
}

async function readJsonBody(req: IncomingMessage): Promise<SendEmailRequestBody> {
  const maybePreParsed = (req as IncomingMessage & { body?: unknown }).body;
  if (maybePreParsed && typeof maybePreParsed === 'object' && !Buffer.isBuffer(maybePreParsed)) {
    return maybePreParsed as SendEmailRequestBody;
  }
  if (typeof maybePreParsed === 'string') {
    return JSON.parse(maybePreParsed) as SendEmailRequestBody;
  }

  return await new Promise<SendEmailRequestBody>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > MAX_REQUEST_BYTES) {
        reject(new Error('Request payload exceeds maximum allowed size.'));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        if (!raw) {
          resolve({});
          return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new Error('Request body must be a JSON object.'));
          return;
        }
        resolve(parsed as SendEmailRequestBody);
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (typeof req.resume === 'function') {
      req.resume();
    }
  });
}

function validatePdfAttachment(raw: unknown): PdfAttachmentPayload | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Attachment payload must be an object.');
  }

  const candidate = raw as Record<string, unknown>;
  const filenameRaw = typeof candidate.filename === 'string' ? candidate.filename.trim() : '';
  const mimeType = typeof candidate.mimeType === 'string' ? candidate.mimeType.trim() : '';
  const base64Raw = typeof candidate.base64 === 'string' ? candidate.base64.trim() : '';

  if (!filenameRaw || filenameRaw.length > 160) {
    throw new Error('Attachment filename is invalid.');
  }
  const safeFilename = filenameRaw.replace(/[^a-zA-Z0-9._\-]/g, '_');
  if (!safeFilename.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF attachments are permitted.');
  }
  if (mimeType !== 'application/pdf') {
    throw new Error('Attachment MIME type must be application/pdf.');
  }

  const cleanBase64 = base64Raw.replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
  if (!cleanBase64 || cleanBase64.length > MAX_ATTACHMENT_BASE64_LENGTH) {
    throw new Error('Attachment PDF payload is empty or exceeds size limit.');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    throw new Error('Attachment PDF content is not valid base64.');
  }

  const decodedBuffer = Buffer.from(cleanBase64, 'base64');
  if (decodedBuffer.length < 5 || decodedBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Attachment payload does not contain a valid %PDF- file header.');
  }

  console.info(
    `[api/email/send][Stage 4] Attachment validated: hasAttachment=true, filename=${safeFilename}, mimeType=application/pdf, base64Length=${cleanBase64.length}, decodedBytes=${decodedBuffer.length}, attachmentCount=1`
  );

  return {
    filename: safeFilename,
    mimeType: 'application/pdf',
    base64: cleanBase64,
    decodedBytes: decodedBuffer.length,
  };
}

async function generateServerTestPdfAttachment(
  eventType: Exclude<EmailEventType, 'registration_received'>,
  recipient: string
): Promise<PdfAttachmentPayload> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const titleByEvent: Record<Exclude<EmailEventType, 'registration_received'>, string> = {
    registration_confirmation: 'REGISTRATION CONFIRMATION (DIAGNOSTIC TEST)',
    abstract_confirmation: 'ABSTRACT SUBMISSION ACKNOWLEDGEMENT (DIAGNOSTIC TEST)',
    abstract_acceptance: 'ABSTRACT ACCEPTANCE & PRESENTATION ALLOCATION (DIAGNOSTIC TEST)',
  };

  const filenameByEvent: Record<Exclude<EmailEventType, 'registration_received'>, string> = {
    registration_confirmation: 'AICONDD-TEST_Registration_Confirmation.pdf',
    abstract_confirmation: 'AICONDD-ABS-TEST_Abstract_Submission_Acknowledgement.pdf',
    abstract_acceptance: 'SRMCON2027_Acceptance_AICONDD-ABS-TEST_AICONDD-OR-2027-TEST.pdf',
  };

  doc.setFillColor(11, 22, 72);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('SRMCON 2027 - SRM College of Pharmacy, SRMIST', 105, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.text(titleByEvent[eventType], 105, 22, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Automated Email PDF Attachment Diagnostic Verification', 18, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Event Type: ${eventType}`, 18, 56);
  doc.text(`Authorised Test Recipient: ${recipient}`, 18, 63);
  doc.text(`Generated At (UTC): ${new Date().toISOString()}`, 18, 70);
  doc.text('Status: Valid %PDF- attachment generated and transmitted end-to-end.', 18, 80);
  doc.text('No conference registration, abstract, or counter records were modified.', 18, 87);

  const dataUri = doc.output('datauristring');
  const commaIdx = dataUri.indexOf(',');
  const base64 = (commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri).replace(/\s+/g, '');

  const validated = validatePdfAttachment({
    filename: filenameByEvent[eventType],
    mimeType: 'application/pdf',
    base64,
  });

  if (!validated) {
    throw new Error('Failed to generate diagnostic PDF attachment.');
  }

  return validated;
}

function isAppsScriptAuthFailure(payload: Record<string, unknown>, statusCode: number): boolean {
  if (statusCode === 401 || statusCode === 403) return true;
  if (payload.authenticated === false || payload.authorized === false) return true;
  const errText = String(payload.error || payload.message || '').toLowerCase();
  return (
    errText.includes('unauthorized') ||
    errText.includes('unauthorised') ||
    errText.includes('invalid token') ||
    errText.includes('invalid secret') ||
    errText.includes('authentication') ||
    errText.includes('forbidden')
  );
}

function extractRecipientForRegistration(reg: Record<string, unknown>): string {
  return typeof reg.email === 'string' ? reg.email.trim() : '';
}

function extractRecipientForAbstract(abs: Record<string, unknown>): string {
  const author = abs.presentingAuthor;
  if (author && typeof author === 'object' && !Array.isArray(author)) {
    const email = (author as Record<string, unknown>).email;
    if (typeof email === 'string') return email.trim();
  }
  return '';
}

async function dispatchToAppsScript(params: {
  appsScriptUrl: string;
  appsScriptSecret: string;
  eventId: string;
  eventType: EmailEventType;
  recipient: string;
  builtEmail: ConferenceEmailBuildResult;
  attachment: PdfAttachmentPayload | null;
}): Promise<DispatchOutcome> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const ccRecipient = resolveEmailCcRecipient(params.recipient);

    const upstreamPayload: Record<string, unknown> = {
      token: params.appsScriptSecret,
      action: params.eventType,
      eventId: params.eventId,
      to: params.recipient,
      ...(ccRecipient ? { cc: ccRecipient } : {}),
      subject: params.builtEmail.subject,
      htmlBody: params.builtEmail.htmlBody,
      textBody: params.builtEmail.textBody,
      data: params.builtEmail.structuredData,
      requiresAttachment: Boolean(params.attachment),
    };

    // Send a single compact attachment object to prevent payload bloat (Code.gs reads attachment.base64)
    if (params.attachment) {
      upstreamPayload.attachment = {
        filename: params.attachment.filename,
        mimeType: params.attachment.mimeType,
        base64: params.attachment.base64,
      };
    }

    const serializedUpstreamBody = JSON.stringify(upstreamPayload);
    console.info(
      `[api/email/send][Stage 5] Forwarding to Apps Script: eventId=${params.eventId}, action=${
        params.eventType
      }, cc=${ccRecipient || 'none'}, hasAttachment=${Boolean(params.attachment)}, filename=${
        params.attachment?.filename || 'none'
      }, mimeType=${params.attachment?.mimeType || 'none'}, base64Length=${
        params.attachment?.base64.length || 0
      }, decodedBytes=${params.attachment?.decodedBytes || 0}, attachmentCount=${
        params.attachment ? 1 : 0
      }, requestBytes=${Buffer.byteLength(serializedUpstreamBody)}`
    );

    const upstreamResponse = await fetch(params.appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: serializedUpstreamBody,
      redirect: 'follow',
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();

    let parsedPayload: Record<string, unknown>;
    try {
      const json = JSON.parse(rawText);
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        throw new Error('Unexpected JSON shape');
      }
      parsedPayload = json as Record<string, unknown>;
    } catch {
      console.error(
        `[api/email/send] Non-JSON response from Apps Script (HTTP ${upstreamResponse.status}).`
      );
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Received an invalid response from the Google Apps Script email service.',
        },
      };
    }

    if (isAppsScriptAuthFailure(parsedPayload, upstreamResponse.status)) {
      console.error('[api/email/send] Upstream authentication failed.');
      return {
        statusCode: 401,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Authentication failed with the Google Apps Script email service.',
        },
      };
    }

    if (!upstreamResponse.ok) {
      console.error(`[api/email/send] Upstream HTTP error ${upstreamResponse.status}.`);
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: `Google Apps Script email service returned HTTP ${upstreamResponse.status}.`,
        },
      };
    }

    const duplicateReported =
      parsedPayload.duplicate === true ||
      parsedPayload.alreadySent === true ||
      parsedPayload.duplicatePrevented === true;

    console.info(
      `[api/email/send] Apps Script response: eventId=${params.eventId}, success=${String(
        parsedPayload.success
      )}, attachmentReceived=${String(parsedPayload.attachmentReceived ?? 'n/a')}, blobCreated=${String(
        parsedPayload.blobCreated ?? 'n/a'
      )}, attachmentCount=${String(parsedPayload.attachmentCount ?? 'n/a')}, duplicate=${duplicateReported}`
    );

    if (parsedPayload.success !== true) {
      const upstreamError = sanitizeErrorMessage(
        parsedPayload.error || parsedPayload.message,
        'Google Apps Script email service could not send the email.'
      );
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: upstreamError,
        },
      };
    }

    // Require positive upstream confirmation whenever a PDF attachment is required (never accept HTTP 200 alone)
    const upstreamAttachmentReceived = parsedPayload.attachmentReceived === true;
    const upstreamBlobCreated = parsedPayload.blobCreated === true;
    const upstreamAttachmentCount =
      typeof parsedPayload.attachmentCount === 'number' ? parsedPayload.attachmentCount : 0;
    const upstreamMailAppSent = parsedPayload.mailAppSent === true;

    if (
      params.attachment &&
      !duplicateReported &&
      (!upstreamAttachmentReceived ||
        !upstreamBlobCreated ||
        upstreamAttachmentCount < 1 ||
        !upstreamMailAppSent)
    ) {
      return {
        statusCode: 502,
        body: {
          success: false,
          eventId: params.eventId,
          error: `Google Apps Script did not confirm PDF attachment delivery (attachmentReceived=${String(
            parsedPayload.attachmentReceived ?? 'missing'
          )}, blobCreated=${String(
            parsedPayload.blobCreated ?? 'missing'
          )}, attachmentCount=${String(
            parsedPayload.attachmentCount ?? 'missing'
          )}, mailAppSent=${String(
            parsedPayload.mailAppSent ?? 'missing'
          )}). Deploy the updated docs/google-apps-script/Code.gs as a New Version.`,
        },
      };
    }

    const sentAt =
      typeof parsedPayload.sentAt === 'string' && parsedPayload.sentAt.trim()
        ? parsedPayload.sentAt.trim()
        : new Date().toISOString();

    const serviceName =
      typeof parsedPayload.service === 'string' && parsedPayload.service.trim()
        ? parsedPayload.service.trim()
        : 'SRMCOP Conference Email Service';

    if (!duplicateReported) {
      completedDispatches.set(params.eventId, {
        sentAt,
        recipient: params.recipient,
        cachedAt: Date.now(),
      });
    }

    const resolvedResponseCc =
      typeof parsedPayload.cc === 'string' && parsedPayload.cc.trim()
        ? parsedPayload.cc.trim()
        : ccRecipient;

    return {
      statusCode: 200,
      body: {
        success: true,
        eventId: params.eventId,
        eventType: params.eventType,
        recipient: params.recipient,
        cc: resolvedResponseCc || null,
        subject: params.builtEmail.subject,
        status: duplicateReported ? 'Already Sent' : 'Sent',
        sentAt,
        duplicatePrevented: duplicateReported,
        alreadySent: duplicateReported,
        service: serviceName,
        attachmentSent: duplicateReported ? Boolean(params.attachment) : upstreamBlobCreated && upstreamAttachmentCount >= 1,
        attachmentFilename: params.attachment?.filename || null,
        attachmentCount: upstreamAttachmentCount,
        attachmentBytes:
          typeof parsedPayload.attachmentBytes === 'number'
            ? parsedPayload.attachmentBytes
            : params.attachment?.decodedBytes ?? 0,
        blobCreated:
          typeof parsedPayload.blobCreated === 'boolean' ? parsedPayload.blobCreated : false,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[api/email/send] Request to Google Apps Script timed out.');
      return {
        statusCode: 504,
        body: {
          success: false,
          eventId: params.eventId,
          error: 'Request to Google Apps Script email service timed out.',
        },
      };
    }

    console.error('[api/email/send] Network error communicating with Google Apps Script.');
    return {
      statusCode: 503,
      body: {
        success: false,
        eventId: params.eventId,
        error: 'Google Apps Script email service is currently unavailable.',
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!applyRestrictedCors(req, res)) {
    sendJson(res, 403, {
      success: false,
      error: 'Origin not allowed.',
    });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, {
      success: false,
      error: 'Method Not Allowed. Only POST requests are accepted.',
    });
    return;
  }

  const appsScriptConfig = getAppsScriptConfig();
  if (!appsScriptConfig.ok) {
    console.error('[api/email/send] Missing or invalid server email environment configuration.');
    sendJson(res, 500, {
      success: false,
      error: appsScriptConfig.error,
    });
    return;
  }

  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  let adminBearerToken: string | undefined;
  let verifiedAdminEmail: string | undefined;

  // Enforce Bearer authentication BEFORE body/schema validation whenever an Authorization
  // header is supplied, returning 401 for missing/invalid tokens and 403 for non-admin tokens.
  if (authHeader !== undefined) {
    if (typeof req.pause === 'function') {
      req.pause();
    }
    try {
      const verified = await verifyFirebaseAdminBearerToken(authHeader);
      adminBearerToken = authHeader.slice('Bearer '.length).trim();
      verifiedAdminEmail = verified.email;
    } catch (err) {
      const authStatusCode = err instanceof AuthVerificationError ? err.statusCode : 401;
      sendJson(res, authStatusCode, {
        success: false,
        error: sanitizeErrorMessage(err, 'Unauthorized administrative email request.'),
      });
      return;
    }
  }

  let body: SendEmailRequestBody;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    if (authHeader === undefined) {
      sendJson(res, 401, {
        success: false,
        error: 'Missing admin authorization token.',
      });
      return;
    }
    sendJson(res, 400, {
      success: false,
      error: sanitizeErrorMessage(err, 'Invalid JSON request payload.'),
    });
    return;
  }

  const rawEventType =
    typeof body.eventType === 'string' ? body.eventType.trim() : '';
  const isUnauthenticatedPublicAllowed =
    (rawEventType === 'registration_received' || rawEventType === 'abstract_confirmation') &&
    body.testMode !== true &&
    body.isAdminRetry !== true;

  // Unauthenticated callers may ONLY invoke public participant events (Events 1 & 3);
  // all other requests (admin events, testMode, retries, missing/unknown eventType) must
  // fail with 401 BEFORE field/schema validation runs.
  if (authHeader === undefined && !isUnauthenticatedPublicAllowed) {
    sendJson(res, 401, {
      success: false,
      error: 'Missing admin authorization token.',
    });
    return;
  }

  const eventType = rawEventType as EmailEventType;
  if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
    sendJson(res, 400, {
      success: false,
      error: 'Invalid or unsupported email eventType.',
    });
    return;
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  if (!eventId || !VALID_ID_REGEX.test(eventId)) {
    sendJson(res, 400, {
      success: false,
      error: 'Valid eventId is required.',
    });
    return;
  }

  const isTestMode = body.testMode === true;

  let validatedAttachment: PdfAttachmentPayload | null = null;
  try {
    validatedAttachment = validatePdfAttachment(body.attachment);
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      eventId,
      error: sanitizeErrorMessage(err, 'Invalid PDF attachment payload.'),
    });
    return;
  }

  // Enforce per-event attachment contract:
  // Event 1 (registration_received): no PDF attachment
  // Events 2, 3, 4: PDF attachment required (in testMode, generate server diagnostic PDF if omitted)
  if (eventType === 'registration_received') {
    validatedAttachment = null;
  } else if (!validatedAttachment && !isTestMode) {
    const attachmentLabels: Record<Exclude<EmailEventType, 'registration_received'>, string> = {
      registration_confirmation: 'official Registration Confirmation PDF',
      abstract_confirmation: 'Abstract Submission Acknowledgement PDF',
      abstract_acceptance:
        'official consolidated Abstract Acceptance & Presentation Allocation Confirmation PDF',
    };
    sendJson(res, 400, {
      success: false,
      eventId,
      error: `This email event requires the ${attachmentLabels[eventType]} attachment.`,
    });
    return;
  }

  // Safe Admin-Authenticated Test Dispatch (does not read or mutate registrations/abstracts/counters)
  if (isTestMode) {
    if (!eventId.startsWith('EMAIL_TEST_')) {
      sendJson(res, 400, {
        success: false,
        eventId,
        error: 'Test mode eventId must start with EMAIL_TEST_.',
      });
      return;
    }

    const candidateRecipient =
      typeof body.testRecipient === 'string' && body.testRecipient.trim()
        ? body.testRecipient.trim().toLowerCase()
        : verifiedAdminEmail || '';

    if (
      !candidateRecipient ||
      (!(AUTHORIZED_ADMIN_EMAILS as readonly string[]).includes(candidateRecipient) &&
        candidateRecipient !== verifiedAdminEmail)
    ) {
      sendJson(res, 403, {
        success: false,
        eventId,
        error: 'Test mode delivery is restricted to authorized organiser email addresses.',
      });
      return;
    }

    if (eventType !== 'registration_received' && !validatedAttachment) {
      try {
        validatedAttachment = await generateServerTestPdfAttachment(eventType, candidateRecipient);
      } catch (pdfErr) {
        sendJson(res, 500, {
          success: false,
          eventId,
          error: sanitizeErrorMessage(pdfErr, 'Failed to generate test mode PDF attachment.'),
        });
        return;
      }
    }

    let testBuiltEmail: ConferenceEmailBuildResult;
    if (eventType === 'registration_received') {
      testBuiltEmail = buildRegistrationReceivedEmail({
        fullName: 'SRMCON Secretariat Diagnostic Test',
        registrationId: 'AICONDD-TEST',
        email: candidateRecipient,
        category: 'Faculty / Academician',
        participationMode: 'Offline (On-site)',
        transactionReference: 'DIAGNOSTIC-TEST',
        paymentAmount: 1500,
      });
    } else if (eventType === 'registration_confirmation') {
      testBuiltEmail = buildRegistrationConfirmedEmail({
        fullName: 'SRMCON Secretariat Diagnostic Test',
        registrationId: 'AICONDD-TEST',
        email: candidateRecipient,
        category: 'Faculty / Academician',
        participationMode: 'Offline (On-site)',
        paymentAmount: 1500,
        paymentMode: 'UPI',
        transactionReference: 'DIAGNOSTIC-TEST',
        verifiedAt: new Date().toISOString(),
      });
    } else if (eventType === 'abstract_confirmation') {
      testBuiltEmail = buildAbstractSubmittedEmail({
        id: 'AICONDD-ABS-TEST',
        registrationId: 'AICONDD-TEST',
        title: 'SRMCON 2027 Email Pipeline Diagnostic Verification',
        trackId: 'track-03',
        presentationPreference: 'Oral Presentation',
        presentingAuthor: {
          fullName: 'SRMCON Secretariat Diagnostic Test',
          email: candidateRecipient,
        },
        createdAt: new Date().toISOString(),
      });
    } else {
      testBuiltEmail = buildAbstractAcceptedEmail({
        id: 'AICONDD-ABS-TEST',
        registrationId: 'AICONDD-TEST',
        title: 'SRMCON 2027 Email Pipeline Diagnostic Verification',
        trackId: 'track-03',
        presentationAllocationId: 'AICONDD-OR-2027-TEST',
        officialAllocationCategory: 'Oral Presentation',
        allottedPresentationFormat: 'Oral Presentation',
        reviewedAt: new Date().toISOString(),
        presentingAuthor: {
          fullName: 'SRMCON Secretariat Diagnostic Test',
          email: candidateRecipient,
          affiliation: 'SRM College of Pharmacy, SRMIST',
        },
      });
    }

    testBuiltEmail = {
      ...testBuiltEmail,
      subject: `[TEST] ${testBuiltEmail.subject}`,
    };

    const testOutcome = await dispatchToAppsScript({
      appsScriptUrl: appsScriptConfig.url,
      appsScriptSecret: appsScriptConfig.secret,
      eventId,
      eventType,
      recipient: candidateRecipient,
      builtEmail: testBuiltEmail,
      attachment: validatedAttachment,
    });
    sendJson(res, testOutcome.statusCode, testOutcome.body);
    return;
  }

  // Verify authoritative Firestore document and workflow invariants
  let recipient = '';
  let expectedEventId = '';
  let builtEmail: ConferenceEmailBuildResult;

  try {
    if (eventType === 'registration_received' || eventType === 'registration_confirmation') {
      const regDocIdRaw = typeof body.regDocId === 'string' ? body.regDocId.trim() : '';
      const registrationIdRaw =
        typeof body.registrationId === 'string' ? body.registrationId.trim() : '';
      const lookupDocId = regDocIdRaw || registrationIdRaw;

      if (!lookupDocId || !VALID_ID_REGEX.test(lookupDocId)) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'Valid registrationId is required.',
        });
        return;
      }

      let regDoc = await getFirestoreDocument('registrations', lookupDocId, adminBearerToken);
      if (!regDoc && lookupDocId !== lookupDocId.toUpperCase()) {
        regDoc = await getFirestoreDocument(
          'registrations',
          lookupDocId.toUpperCase(),
          adminBearerToken
        );
      }
      if (!regDoc && registrationIdRaw && registrationIdRaw !== lookupDocId) {
        regDoc = await getFirestoreDocument(
          'registrations',
          registrationIdRaw.toUpperCase(),
          adminBearerToken
        );
      }
      if (!regDoc) {
        sendJson(res, 404, {
          success: false,
          eventId,
          error: `Registration record ${registrationIdRaw || lookupDocId} was not found.`,
        });
        return;
      }

      const canonicalRegId = String(
        regDoc.registrationId || regDoc.id || registrationIdRaw || lookupDocId
      )
        .trim()
        .toUpperCase();
      expectedEventId =
        eventType === 'registration_received'
          ? `EMAIL_REG_RECEIVED_${canonicalRegId}`
          : `EMAIL_REG_CONFIRMED_${canonicalRegId}`;

      if (eventId !== expectedEventId) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'eventId does not match the canonical registration email event identifier.',
        });
        return;
      }

      if (eventType === 'registration_confirmation') {
        const paymentStatus = String(regDoc.paymentStatus || '').trim();
        const registrationStatus = String(regDoc.registrationStatus || '').trim();
        if (paymentStatus !== 'Verified' || registrationStatus !== 'Approved') {
          sendJson(res, 409, {
            success: false,
            eventId,
            error:
              'Registration confirmation email cannot be sent before payment verification and registration approval.',
          });
          return;
        }
      }

      recipient = extractRecipientForRegistration(regDoc);
      builtEmail =
        eventType === 'registration_received'
          ? buildRegistrationReceivedEmail(regDoc)
          : buildRegistrationConfirmedEmail(regDoc);
    } else {
      const abstractIdRaw =
        typeof body.abstractId === 'string' ? body.abstractId.trim() : '';
      if (!abstractIdRaw || !VALID_ID_REGEX.test(abstractIdRaw)) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'Valid abstractId is required.',
        });
        return;
      }

      let absDoc = await getFirestoreDocument(
        'abstractSubmissions',
        abstractIdRaw,
        adminBearerToken
      );
      if (!absDoc && abstractIdRaw !== abstractIdRaw.toUpperCase()) {
        absDoc = await getFirestoreDocument(
          'abstractSubmissions',
          abstractIdRaw.toUpperCase(),
          adminBearerToken
        );
      }
      if (!absDoc) {
        sendJson(res, 404, {
          success: false,
          eventId,
          error: `Abstract record ${abstractIdRaw} was not found.`,
        });
        return;
      }

      const canonicalAbsId = String(absDoc.id || abstractIdRaw).trim().toUpperCase();
      expectedEventId =
        eventType === 'abstract_confirmation'
          ? `EMAIL_ABS_SUBMITTED_${canonicalAbsId}`
          : `EMAIL_ABS_ACCEPTED_${canonicalAbsId}`;

      if (eventId !== expectedEventId) {
        sendJson(res, 400, {
          success: false,
          eventId,
          error: 'eventId does not match the canonical abstract email event identifier.',
        });
        return;
      }

      if (eventType === 'abstract_acceptance') {
        const absStatus = String(absDoc.status || '').trim();
        if (absStatus !== 'Accepted') {
          sendJson(res, 409, {
            success: false,
            eventId,
            error: 'Abstract acceptance email can only be sent when abstract status is Accepted.',
          });
          return;
        }
        const committedPresentationId = String(absDoc.presentationAllocationId || '').trim();
        const committedCategory = String(
          absDoc.officialAllocationCategory ||
            absDoc.allottedPresentationFormat ||
            absDoc.finalPresentationFormat ||
            ''
        ).trim();
        if (!committedPresentationId || !committedCategory) {
          sendJson(res, 409, {
            success: false,
            eventId,
            error:
              'Consolidated acceptance email requires an allocated Presentation ID and Presentation Category.',
          });
          return;
        }
      }

      recipient = extractRecipientForAbstract(absDoc);
      builtEmail =
        eventType === 'abstract_confirmation'
          ? buildAbstractSubmittedEmail(absDoc)
          : buildAbstractAcceptedEmail(absDoc);
    }
  } catch (err) {
    console.error(
      '[api/email/send] Firestore verification error:',
      sanitizeErrorMessage(err, 'Lookup failed')
    );
    sendJson(res, 503, {
      success: false,
      eventId,
      error: 'Unable to verify conference record state from database.',
    });
    return;
  }

  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    sendJson(res, 400, {
      success: false,
      eventId,
      error: 'Record does not contain a valid recipient email address.',
    });
    return;
  }

  if (adminBearerToken) {
    try {
      const existingLog = await getFirestoreDocument('emailLogs', eventId, adminBearerToken);
      if (existingLog && existingLog.status === 'Sent') {
        sendJson(res, 200, {
          success: true,
          eventId,
          eventType,
          recipient,
          subject: builtEmail.subject,
          status: 'Already Sent',
          sentAt: existingLog.sentAt || null,
          alreadySent: true,
          duplicatePrevented: true,
          service: 'SRMCOP Conference Email Service',
        });
        return;
      }
    } catch {
      // Proceed cleanly to in-memory + Apps Script deduplication if log read was unavailable
    }
  }

  pruneCompletedCache();
  const cachedSent = completedDispatches.get(eventId);
  if (cachedSent) {
    sendJson(res, 200, {
      success: true,
      eventId,
      eventType,
      recipient: cachedSent.recipient,
      subject: builtEmail.subject,
      status: 'Already Sent',
      sentAt: cachedSent.sentAt,
      alreadySent: true,
      duplicatePrevented: true,
      service: 'SRMCOP Conference Email Service',
    });
    return;
  }

  let pendingPromise = inFlightDispatches.get(eventId);
  if (!pendingPromise) {
    pendingPromise = dispatchToAppsScript({
      appsScriptUrl: appsScriptConfig.url,
      appsScriptSecret: appsScriptConfig.secret,
      eventId,
      eventType,
      recipient,
      builtEmail,
      attachment: validatedAttachment,
    }).finally(() => {
      inFlightDispatches.delete(eventId);
    });
    inFlightDispatches.set(eventId, pendingPromise);
  }

  const outcome = await pendingPromise;
  sendJson(res, outcome.statusCode, outcome.body);
}
