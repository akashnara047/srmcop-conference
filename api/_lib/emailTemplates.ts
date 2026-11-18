export type EmailEventType =
  | 'registration_received'
  | 'registration_confirmation'
  | 'abstract_confirmation'
  | 'abstract_acceptance';

export interface ConferenceEmailBuildResult {
  subject: string;
  htmlBody: string;
  textBody: string;
  structuredData: Record<string, unknown>;
}

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

export function resolveTrackTitle(trackId: unknown): string {
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

function renderKeyValueRows(rows: Array<{ label: string; value: string; monospace?: boolean }>): string {
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
          <!-- Header -->
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

          <!-- Status Banner & Main Heading -->
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

          <!-- Structured Summary Table -->
          <tr>
            <td style="padding: 12px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; border-collapse: collapse;">
                ${renderKeyValueRows(params.detailsRows)}
              </table>
            </td>
          </tr>

          <!-- Next Steps / Important Notes -->
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

          <!-- Closing & Signatures -->
          <tr>
            <td style="padding: 16px 24px 22px 24px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">
                Warm regards,
              </p>
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

          <!-- Footer -->
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

export function buildRegistrationReceivedEmail(reg: Record<string, unknown>): ConferenceEmailBuildResult {
  const fullName = String(reg.fullName || 'Delegate').trim();
  const registrationId = String(reg.registrationId || reg.id || '').trim();
  const email = String(reg.email || '').trim();
  const baseCategory = String(reg.category || 'Delegate').trim();
  const otherCategory = String(reg.otherCategoryDescription || '').trim();
  const categoryDisplay = otherCategory ? `${baseCategory} (${otherCategory})` : baseCategory;
  const participationMode = String(reg.participationMode || reg.modeOfParticipation || 'Not specified').trim();
  const transactionReference = String(reg.transactionReference || '').trim();
  const paymentAmount = reg.paymentAmount ?? reg.amount ?? '';
  const amountDisplay = paymentAmount ? `INR ${paymentAmount}` : 'Submitted on form';

  const subject = 'SRMCON 2027 – Registration Received';

  const detailsRows = [
    { label: 'Participant Name', value: fullName },
    { label: 'Registration ID', value: registrationId, monospace: true },
    { label: 'Registered Email', value: email },
    { label: 'Participant Category', value: categoryDisplay },
    { label: 'Participation Mode', value: participationMode },
    { label: 'Conference Title', value: CONFERENCE_TITLE },
    { label: 'Conference Dates', value: CONFERENCE_DATES },
    { label: 'Venue', value: CONFERENCE_VENUE },
    { label: 'Payment Verification Status', value: 'Pending Verification (Submitted for Review)' },
  ];

  const htmlBody = wrapInstitutionalEmailLayout({
    badgeText: 'Registration Received · Payment Pending Verification',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    heading: 'Registration Details Received',
    recipientName: fullName,
    introParagraphHtml: `Thank you for submitting your registration for the <strong>${escapeHtml(
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
      `Once your payment is verified and approved, you will receive an official <strong>Registration Confirmation email</strong> along with your official Registration Receipt PDF.`,
      `Please retain your Registration ID (<strong>${escapeHtml(
        registrationId
      )}</strong>). You can track your verification status anytime via the Registration Portal and use this ID if you wish to submit a scientific abstract.`,
    ],
  });

  const textBody = [
    `Dear ${fullName},`,
    '',
    `Thank you for submitting your registration for ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}).`,
    'Your registration details have been received and are currently awaiting payment verification (not yet officially confirmed).',
    '',
    `Registration ID: ${registrationId}`,
    `Registered Email: ${email}`,
    `Participant Category: ${categoryDisplay}`,
    `Participation Mode: ${participationMode}`,
    `Conference Dates: ${CONFERENCE_DATES}`,
    `Venue: ${CONFERENCE_VENUE}`,
    `Collaborating Institution: ${CONFERENCE_COLLABORATOR}`,
    `Payment Status: Pending Verification (${amountDisplay}${transactionReference ? `, Ref: ${transactionReference}` : ''})`,
    '',
    'Next Steps:',
    '- The Organising Secretariat will verify your submitted payment reference.',
    '- Once verified, you will receive an official Registration Confirmed email with your PDF receipt.',
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
      registrationId,
      email,
      category: categoryDisplay,
      participationMode,
      conferenceTitle: CONFERENCE_TITLE,
      conferenceDates: CONFERENCE_DATES,
      venue: CONFERENCE_VENUE,
      paymentStatus: 'Pending Verification',
    },
  };
}

export function buildRegistrationConfirmedEmail(reg: Record<string, unknown>): ConferenceEmailBuildResult {
  const fullName = String(reg.fullName || 'Delegate').trim();
  const registrationId = String(reg.registrationId || reg.id || '').trim();
  const email = String(reg.email || '').trim();
  const baseCategory = String(reg.category || 'Delegate').trim();
  const otherCategory = String(reg.otherCategoryDescription || '').trim();
  const categoryDisplay = otherCategory ? `${baseCategory} (${otherCategory})` : baseCategory;
  const participationMode = String(reg.participationMode || reg.modeOfParticipation || 'Offline (On-site at SRMIST)').trim();
  const paymentAmount = reg.paymentAmount ?? reg.amount ?? '';
  const paymentMode = String(reg.paymentMode || '').trim();
  const transactionReference = String(reg.transactionReference || '').trim();
  const verifiedAtFormatted = reg.verifiedAt ? formatDateReadable(reg.verifiedAt) : formatDateReadable(new Date().toISOString());

  const paymentSummaryParts: string[] = [];
  if (paymentAmount) paymentSummaryParts.push(`INR ${paymentAmount}`);
  if (paymentMode) paymentSummaryParts.push(paymentMode);
  if (transactionReference) paymentSummaryParts.push(`Ref/UTR: ${transactionReference}`);
  const paymentSummary = paymentSummaryParts.length > 0 ? paymentSummaryParts.join(' · ') : 'Verified by Secretariat';

  const subject = 'SRMCON 2027 – Registration Confirmed';

  const detailsRows = [
    { label: 'Participant Name', value: fullName },
    { label: 'Official Registration ID', value: registrationId, monospace: true },
    { label: 'Participant Category', value: categoryDisplay },
    { label: 'Participation Mode', value: participationMode },
    { label: 'Payment Verification', value: `Verified on ${verifiedAtFormatted}` },
    { label: 'Payment Details', value: paymentSummary },
    { label: 'Conference Dates', value: CONFERENCE_DATES },
    { label: 'Venue', value: CONFERENCE_VENUE },
  ];

  const isOnline = participationMode.toLowerCase().includes('online') || participationMode.toLowerCase().includes('virtual');

  const htmlBody = wrapInstitutionalEmailLayout({
    badgeText: 'Payment Verified · Registration Confirmed',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    heading: 'Official Conference Registration Confirmation',
    recipientName: fullName,
    introParagraphHtml: `We are pleased to confirm that your payment has been verified and your registration for the <strong>${escapeHtml(
      CONFERENCE_TITLE
    )} (${CONFERENCE_SHORT})</strong> is officially <strong>CONFIRMED</strong>.<br /><br />Your official Registration Receipt PDF is attached to this email for your records.`,
    detailsRows,
    nextStepsTitle: 'Participation Information',
    nextStepsItemsHtml: [
      `Please retain your official Registration ID (<strong>${escapeHtml(
        registrationId
      )}</strong>) and the attached Registration Receipt PDF.`,
      isOnline
        ? `As an <strong>Online (Virtual)</strong> participant, keep your Registration ID handy for session participation communications from the Organising Secretariat.`
        : `For <strong>On-site</strong> check-in and delegate kit issuance at SRMIST Kattankulathur, please present the attached Registration Receipt PDF along with a valid photo ID at the registration desk.`,
      `If you plan to present research work, you may submit and track your abstract via the Abstract Portal using Registration ID <strong>${escapeHtml(
        registrationId
      )}</strong>.`,
    ],
  });

  const textBody = [
    `Dear ${fullName},`,
    '',
    `Your payment has been verified and your registration for ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}) is officially CONFIRMED.`,
    '',
    `Official Registration ID: ${registrationId}`,
    `Participant Category: ${categoryDisplay}`,
    `Participation Mode: ${participationMode}`,
    `Payment Confirmation: Verified on ${verifiedAtFormatted} (${paymentSummary})`,
    `Conference Dates: ${CONFERENCE_DATES}`,
    `Venue: ${CONFERENCE_VENUE}`,
    `Collaborating Institution: ${CONFERENCE_COLLABORATOR}`,
    '',
    'Your official Registration Receipt PDF is attached to this email.',
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
      registrationId,
      email,
      category: categoryDisplay,
      participationMode,
      paymentStatus: 'Verified',
      registrationStatus: 'Approved',
      paymentSummary,
      verifiedAt: verifiedAtFormatted,
      conferenceTitle: CONFERENCE_TITLE,
      conferenceDates: CONFERENCE_DATES,
      venue: CONFERENCE_VENUE,
    },
  };
}

export function buildAbstractSubmittedEmail(abs: Record<string, unknown>): ConferenceEmailBuildResult {
  const presentingAuthor = (abs.presentingAuthor || {}) as Record<string, unknown>;
  const authorName = String(
    presentingAuthor.fullName || presentingAuthor.name || 'Presenting Author'
  ).trim();
  const authorEmail = String(presentingAuthor.email || '').trim();
  const abstractId = String(abs.id || '').trim();
  const registrationId = String(abs.registrationId || '').trim();
  const title = String(abs.title || 'Untitled Abstract').trim();
  const trackTitle = resolveTrackTitle(abs.trackId);
  const preferredMode = String(abs.presentationPreference || abs.presentationType || 'Not specified').trim();
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
    )} (${CONFERENCE_SHORT})</strong>. This email confirms that your submission has been successfully received and is currently <strong>awaiting review</strong> by the Scientific Review Committee.<br /><br />Your Abstract Submission Receipt PDF is attached for your records.`,
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
    `Status: Received – Awaiting Review`,
    `Conference Dates: ${CONFERENCE_DATES}`,
    `Venue: ${CONFERENCE_VENUE}`,
    '',
    'Your Abstract Submission Receipt PDF is attached to this email.',
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

export function buildAbstractAcceptedEmail(abs: Record<string, unknown>): ConferenceEmailBuildResult {
  const presentingAuthor = (abs.presentingAuthor || {}) as Record<string, unknown>;
  const authorName = String(
    presentingAuthor.fullName || presentingAuthor.name || 'Presenting Author'
  ).trim();
  const authorEmail = String(presentingAuthor.email || '').trim();
  const abstractId = String(abs.id || '').trim();
  const registrationId = String(abs.registrationId || '').trim();
  const title = String(abs.title || 'Untitled Abstract').trim();
  const trackTitle = resolveTrackTitle(abs.trackId);

  // CRITICAL: Only include presentation category if explicitly allotted; never invent or fall back to author's preference
  const allottedCategoryRaw =
    typeof abs.allottedPresentationFormat === 'string' && abs.allottedPresentationFormat.trim()
      ? abs.allottedPresentationFormat.trim()
      : typeof abs.finalPresentationFormat === 'string' && abs.finalPresentationFormat.trim()
      ? abs.finalPresentationFormat.trim()
      : '';

  const reviewNotes =
    typeof abs.reviewNotes === 'string' && abs.reviewNotes.trim() ? abs.reviewNotes.trim() : '';

  const subject = 'SRMCON 2027 – Abstract Accepted';

  const detailsRows: Array<{ label: string; value: string; monospace?: boolean }> = [
    { label: 'Presenting Author', value: authorName },
    { label: 'Abstract ID', value: abstractId, monospace: true },
    { label: 'Linked Registration ID', value: registrationId, monospace: true },
    { label: 'Abstract Title', value: title },
    { label: 'Scientific Track', value: trackTitle },
    { label: 'Acceptance Status', value: 'Accepted' },
  ];

  if (allottedCategoryRaw) {
    detailsRows.push({ label: 'Assigned Presentation Category', value: allottedCategoryRaw });
  } else {
    detailsRows.push({
      label: 'Presentation Category',
      value: 'Not yet assigned (will be communicated separately once allocated)',
    });
  }

  detailsRows.push(
    { label: 'Conference Dates', value: CONFERENCE_DATES },
    { label: 'Venue', value: CONFERENCE_VENUE }
  );

  if (reviewNotes) {
    detailsRows.push({ label: 'Committee Remarks', value: reviewNotes });
  }

  const htmlBody = wrapInstitutionalEmailLayout({
    badgeText: 'Abstract Accepted',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    heading: 'Abstract Acceptance Notification',
    recipientName: authorName,
    introParagraphHtml: `On behalf of the Scientific Review Committee of the <strong>${escapeHtml(
      CONFERENCE_TITLE
    )} (${CONFERENCE_SHORT})</strong>, we are pleased to inform you that your submitted abstract has been officially <strong>ACCEPTED</strong> for presentation at the conference.`,
    detailsRows,
    nextStepsTitle: 'Important Next Steps',
    nextStepsItemsHtml: [
      allottedCategoryRaw
        ? `Your abstract has been allocated to <strong>${escapeHtml(
            allottedCategoryRaw
          )}</strong>. Please prepare your presentation in accordance with the official format guidelines and templates available on the conference website.`
        : `Your final presentation category (Oral / Poster / E-Poster) is awaiting formal slot allocation and will be updated on the Abstract Portal once assigned.`,
      `Session timings, hall allocations, and presentation schedules will be announced on the conference portal prior to <strong>${escapeHtml(
        CONFERENCE_DATES
      )}</strong>.`,
      `Please ensure your conference registration fee payment under Registration ID <strong>${escapeHtml(
        registrationId
      )}</strong> is verified (if not already completed), and retain both your Registration ID and Abstract ID (<strong>${escapeHtml(
        abstractId
      )}</strong>) for certificate and check-in purposes.`,
    ],
  });

  const textBody = [
    `Dear ${authorName},`,
    '',
    `Congratulations! Your abstract submitted to ${CONFERENCE_TITLE} (${CONFERENCE_SHORT}) has been ACCEPTED for presentation.`,
    '',
    `Abstract ID: ${abstractId}`,
    `Linked Registration ID: ${registrationId}`,
    `Abstract Title: ${title}`,
    `Scientific Track: ${trackTitle}`,
    'Acceptance Status: Accepted',
    allottedCategoryRaw
      ? `Assigned Presentation Category: ${allottedCategoryRaw}`
      : 'Presentation Category: Not yet assigned (will be communicated separately once allocated)',
    `Conference Dates: ${CONFERENCE_DATES}`,
    `Venue: ${CONFERENCE_VENUE}`,
    `Collaborating Institution: ${CONFERENCE_COLLABORATOR}`,
    ...(reviewNotes ? [`Committee Remarks: ${reviewNotes}`] : []),
    '',
    'Next Steps:',
    '- Check the Abstract Portal for presentation schedule updates and official template guidelines.',
    `- Ensure your registration payment under ${registrationId} is verified if not already confirmed.`,
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
      status: 'Accepted',
      presentationCategory: allottedCategoryRaw || null,
      conferenceTitle: CONFERENCE_TITLE,
      conferenceDates: CONFERENCE_DATES,
      venue: CONFERENCE_VENUE,
    },
  };
}
