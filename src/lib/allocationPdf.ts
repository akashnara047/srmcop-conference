import { jsPDF } from 'jspdf';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';
import type {
  AbstractRecord,
  OfficialAllocationCategory,
  PdfAttachmentOutput,
  RegistrationRecord,
} from './managementService';
import {
  getOfficialAllocationCategory,
  isAbstractOfficiallyAllocated,
} from './presentationAllocationService';
import { INTI_LOGO, PdfLogoAsset, SRMIST_LOGO, SRM_PHARMACY_LOGO } from './pdfLogos';
import { drawCommonPageBackground } from './pdfBackground';

const PAGE_WIDTH = 210;
const MARGIN_X = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const FOOTER_TOP_Y = 274;
const SIGNATURE_HEIGHT = 31;
const SECRETARIAT_EMAIL = 'org.secy.cp@srmist.edu.in';

const COLORS = {
  navy: [11, 22, 72] as const,
  violet: [109, 60, 226] as const,
  slateDark: [30, 41, 59] as const,
  slateMuted: [71, 85, 105] as const,
  cardFill: [243, 245, 253] as const,
  cardFillAlt: [247, 248, 254] as const,
  cardBorder: [215, 221, 245] as const,
  iconColumn: [236, 231, 253] as const,
  lavenderTag: [232, 226, 252] as const,
  mintFill: [231, 248, 236] as const,
  mintBorder: [134, 239, 172] as const,
  mintText: [20, 83, 45] as const,
  mintAccent: [22, 163, 74] as const,
  disclaimerFill: [245, 242, 254] as const,
  disclaimerBorder: [209, 196, 249] as const,
};

function sanitizePdfText(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const raw = String(input);
  const replacements: Record<string, string> = {
    '₹': 'INR ',
    'α': 'alpha',
    'β': 'beta',
    'γ': 'gamma',
    'δ': 'delta',
    'ε': 'epsilon',
    'κ': 'kappa',
    'λ': 'lambda',
    'μ': 'µ',
    'σ': 'sigma',
    'ω': 'omega',
    'Δ': 'Delta',
    'Ω': 'Ohm',
    '≥': '>=',
    '≤': '<=',
    '≠': '!=',
    '≈': '~=',
    '→': '->',
    '←': '<-',
    '↔': '<->',
    '∞': 'infinity',
    '₀': '0',
    '₁': '1',
    '₂': '2',
    '₃': '3',
    '₄': '4',
    '₅': '5',
    '₆': '6',
    '₇': '7',
    '₈': '8',
    '₉': '9',
    '\u200B': '',
    '\uFEFF': '',
  };

  let out = '';
  for (const ch of raw) {
    if (ch in replacements) {
      out += replacements[ch];
    } else {
      const code = ch.charCodeAt(0);
      if (
        (code >= 0x20 && code <= 0xff) ||
        code === 0x2013 ||
        code === 0x2014 ||
        code === 0x2018 ||
        code === 0x2019 ||
        code === 0x201c ||
        code === 0x201d ||
        code === 0x2022 ||
        code === 0x2026 ||
        code === 0x2122 ||
        code === 0x20ac ||
        ch === '\n' ||
        ch === '\t'
      ) {
        out += ch;
      }
    }
  }
  return out;
}

function formatDateTime(isoOrDate?: string | null): string {
  const parsed = isoOrDate ? new Date(isoOrDate) : new Date();
  const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const datePart = safe.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = safe.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

function resolveScientificTrackLabel(trackId?: string | null): string {
  const raw = (trackId || '').trim();
  if (!raw) return 'Not Specified';
  const normalized = raw.toLowerCase();
  const numericMatch = normalized.match(/(\d+)/);
  const parsedNum = numericMatch ? parseInt(numericMatch[1], 10) : null;

  const matched = SCIENTIFIC_TRACKS.find(
    (t) =>
      t.id.toLowerCase() === normalized ||
      `track ${t.number}` === normalized ||
      `track-${t.number}` === normalized ||
      (parsedNum !== null &&
        parseInt(t.number, 10) === parsedNum &&
        (normalized.includes('track') || /^\d+$/.test(normalized))) ||
      t.title.toLowerCase() === normalized
  );
  if (matched) {
    return `Track ${matched.number} – ${matched.title}`;
  }
  return sanitizePdfText(raw);
}

function drawLogoPreserveAspect(
  doc: jsPDF,
  asset: PdfLogoAsset,
  centerX: number,
  centerY: number,
  targetWidthMm: number
) {
  const w = targetWidthMm;
  const h = w / asset.aspectRatio;
  doc.addImage(asset.dataUri, 'PNG', centerX - w / 2, centerY - h / 2, w, h, undefined, 'FAST');
}

function drawLinearGradientRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fromRgb: readonly [number, number, number],
  toRgb: readonly [number, number, number],
  steps = 44
) {
  const sliceW = w / steps;
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * t);
    const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * t);
    const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(x + i * sliceW, y, sliceW + 0.15, h, 'F');
  }
}

function drawGradientPillBanner(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
) {
  const r = h / 2;
  const startColor: readonly [number, number, number] = [14, 58, 138];
  const midColor: readonly [number, number, number] = [67, 56, 202];
  const endColor: readonly [number, number, number] = [139, 54, 217];

  doc.setFillColor(startColor[0], startColor[1], startColor[2]);
  doc.circle(x + r, y + r, r, 'F');
  doc.setFillColor(endColor[0], endColor[1], endColor[2]);
  doc.circle(x + w - r, y + r, r, 'F');

  const bodyX = x + r;
  const bodyW = Math.max(0, w - r * 2);
  const steps = 140;
  const sliceW = bodyW / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    let c1 = startColor;
    let c2 = midColor;
    let localT = t * 2;
    if (t > 0.5) {
      c1 = midColor;
      c2 = endColor;
      localT = (t - 0.5) * 2;
    }
    const cr = Math.round(c1[0] + (c2[0] - c1[0]) * localT);
    const cg = Math.round(c1[1] + (c2[1] - c1[1]) * localT);
    const cb = Math.round(c1[2] + (c2[2] - c1[2]) * localT);
    doc.setFillColor(cr, cg, cb);
    doc.rect(bodyX + i * sliceW, y, sliceW + 0.15, h, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.2);
  doc.setTextColor(255, 255, 255);
  doc.text(title, PAGE_WIDTH / 2, y + h / 2 + 1.5, { align: 'center' });
}

function drawIconCalendar(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(99, 60, 212);
  doc.setFillColor(238, 232, 254);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, 4.2, 4.2, 0.7, 0.7, 'FD');
  doc.setFillColor(99, 60, 212);
  doc.rect(x, y, 4.2, 1.2, 'F');
  doc.line(x + 1.1, y - 0.5, x + 1.1, y + 0.4);
  doc.line(x + 3.1, y - 0.5, x + 3.1, y + 0.4);
  doc.rect(x + 0.9, y + 1.9, 0.65, 0.65, 'F');
  doc.rect(x + 2.1, y + 1.9, 0.65, 0.65, 'F');
  doc.rect(x + 0.9, y + 2.95, 0.65, 0.65, 'F');
}

function drawIconMapPin(doc: jsPDF, cx: number, cy: number) {
  doc.setFillColor(99, 60, 212);
  doc.circle(cx, cy - 0.4, 1.55, 'F');
  doc.triangle(cx - 1.35, cy + 0.15, cx + 1.35, cy + 0.15, cx, cy + 2.4, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy - 0.45, 0.55, 'F');
}

function drawIconCheckCircle(doc: jsPDF, cx: number, cy: number, radius = 3.0, filled = true) {
  if (filled) {
    doc.setFillColor(COLORS.mintAccent[0], COLORS.mintAccent[1], COLORS.mintAccent[2]);
    doc.circle(cx, cy, radius, 'F');
    doc.setDrawColor(255, 255, 255);
  } else {
    doc.setDrawColor(COLORS.mintAccent[0], COLORS.mintAccent[1], COLORS.mintAccent[2]);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.45);
    doc.circle(cx, cy, radius, 'FD');
  }
  doc.setLineWidth(0.5);
  doc.line(cx - radius * 0.42, cy + 0.1, cx - radius * 0.1, cy + radius * 0.42);
  doc.line(cx - radius * 0.1, cy + radius * 0.42, cx + radius * 0.48, cy - radius * 0.32);
}

function drawIconDocLines(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.45);
  doc.roundedRect(cx - 3.6, cy - 4.4, 7.2, 8.8, 0.8, 0.8, 'S');
  doc.line(cx - 2.2, cy - 2.3, cx + 2.0, cy - 2.3);
  doc.line(cx - 2.2, cy - 0.7, cx + 2.0, cy - 0.7);
  doc.line(cx - 2.2, cy + 0.9, cx + 2.0, cy + 0.9);
  doc.rect(cx - 2.2, cy + 2.1, 1.8, 1.2, 'S');
  doc.line(cx + 0.4, cy + 2.5, cx + 2.0, cy + 2.5);
}

function drawIconClipboardCheck(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.45);
  doc.roundedRect(cx - 3.6, cy - 3.8, 7.2, 8.6, 0.9, 0.9, 'S');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cx - 1.7, cy - 4.5, 3.4, 1.4, 0.4, 0.4, 'FD');
  doc.line(cx - 2.2, cy - 1.0, cx - 1.5, cy - 0.3);
  doc.line(cx - 1.5, cy - 0.3, cx - 0.5, cy - 1.5);
  doc.line(cx + 0.3, cy - 0.8, cx + 2.4, cy - 0.8);
  doc.line(cx - 2.2, cy + 1.1, cx - 1.5, cy + 1.8);
  doc.line(cx - 1.5, cy + 1.8, cx - 0.5, cy + 0.6);
  doc.line(cx + 0.3, cy + 1.3, cx + 2.4, cy + 1.3);
  doc.line(cx - 2.2, cy + 3.1, cx + 2.4, cy + 3.1);
}

function drawIconBadgeAward(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setFillColor(238, 232, 254);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy - 1.1, 3.3, 'FD');
  doc.line(cx - 1.8, cy + 1.8, cx - 2.5, cy + 4.4);
  doc.line(cx + 1.8, cy + 1.8, cx + 2.5, cy + 4.4);
  doc.line(cx - 2.5, cy + 4.4, cx, cy + 3.3);
  doc.line(cx + 2.5, cy + 4.4, cx, cy + 3.3);
  doc.line(cx - 1.2, cy - 1.0, cx - 0.2, cy);
  doc.line(cx - 0.2, cy, cx + 1.5, cy - 2.0);
}

function drawPageOneHeader(doc: jsPDF): number {
  const logoCenterY = 14.5;
  drawLogoPreserveAspect(doc, SRMIST_LOGO, 37, logoCenterY, 40);
  drawLogoPreserveAspect(doc, INTI_LOGO, 109.5, logoCenterY, 74);
  drawLogoPreserveAspect(doc, SRM_PHARMACY_LOGO, 174, logoCenterY, 16.5);

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.32);
  doc.line(66, 6.5, 66, 22.5);
  doc.line(153, 6.5, 153, 22.5);

  const ribW = 64;
  const ribX = PAGE_WIDTH / 2 - ribW / 2;
  const ribY = 26.2;
  const ribH = 7.4;
  doc.setFillColor(124, 58, 237);
  doc.rect(ribX + 3, ribY, ribW - 6, ribH, 'F');
  doc.triangle(ribX, ribY + ribH, ribX + 3.2, ribY, ribX + 3.2, ribY + ribH, 'F');
  doc.triangle(ribX + ribW - 3.2, ribY, ribX + ribW, ribY, ribX + ribW - 3.2, ribY + ribH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SRMCON 2027', PAGE_WIDTH / 2, ribY + 5.1, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('International Conference on', PAGE_WIDTH / 2, 38.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('AI-Powered Innovations in Drug Discovery and Development', PAGE_WIDTH / 2, 43.3, {
    align: 'center',
  });

  drawIconCalendar(doc, 43.5, 46.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text('15–16 February 2027', 49.5, 49.9);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.32);
  doc.line(84, 46.2, 84, 52.8);

  drawIconMapPin(doc, 91.5, 48.6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('SRM College of Pharmacy,', 95, 48.3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text('SRM Institute of Science and Technology, Kattankulathur', 95, 52.0);

  doc.setDrawColor(219, 224, 245);
  doc.setLineWidth(0.35);
  doc.line(MARGIN_X, 54.6, PAGE_WIDTH - MARGIN_X, 54.6);

  drawGradientPillBanner(
    doc,
    MARGIN_X,
    57.5,
    CONTENT_WIDTH,
    10.0,
    'PRESENTATION ALLOCATION CONFIRMATION'
  );

  return 71.5;
}

function addContinuationPage(doc: jsPDF, allocationId: string): number {
  doc.addPage();
  drawCommonPageBackground(doc);
  drawLinearGradientRect(doc, 0, 0, PAGE_WIDTH, 14, [14, 58, 138], [124, 58, 237], 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SRMCON 2027  |  Presentation Allocation Confirmation', MARGIN_X, 8.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(sanitizePdfText(allocationId), PAGE_WIDTH - MARGIN_X, 8.8, { align: 'right' });
  return 22;
}

function drawSignatureBlock(doc: jsPDF, y: number) {
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.42);
  doc.line(24, y + 11, 82, y + 11);
  doc.line(128, y + 11, 186, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('Dr. V. Chitra', 53, y + 16.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
  doc.text('Convenor', 53, y + 21.0, { align: 'center' });
  doc.text('SRMCON 2027', 53, y + 25.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('Dr. N. Damodharan', 157, y + 16.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
  doc.text('Organising Secretary', 157, y + 21.0, { align: 'center' });
  doc.text('SRMCON 2027', 157, y + 25.2, { align: 'center' });
}

function drawFooterOnAllPages(doc: jsPDF, generatedOnText: string) {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawLinearGradientRect(doc, 0, 281, PAGE_WIDTH, 16, [15, 29, 89], [67, 56, 202], 45);

    doc.setDrawColor(129, 140, 248);
    doc.setFillColor(49, 64, 145);
    doc.setLineWidth(0.22);
    doc.rect(9, 286.5, 6, 8, 'FD');
    doc.rect(15.5, 284.5, 9, 10, 'FD');
    doc.rect(25, 286.5, 6, 8, 'FD');
    doc.triangle(15.5, 284.5, 20, 282.5, 24.5, 284.5, 'FD');

    doc.setDrawColor(165, 180, 252);
    doc.setLineWidth(0.28);
    doc.line(35.5, 284.2, 35.5, 293.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.1);
    doc.setTextColor(255, 255, 255);
    doc.text('SRMCON 2027  |  Presentation Allocation Confirmation', 40, 287.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(224, 231, 255);
    doc.text('SRM College of Pharmacy, SRMIST, Kattankulathur · 15–16 February 2027', 40, 292.3);

    doc.setDrawColor(165, 180, 252);
    doc.line(145, 284.2, 145, 293.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(241, 245, 249);
    if (totalPages > 1) {
      doc.text(`Generated on: ${generatedOnText}`, 149, 287.6);
      doc.text(`Page ${p} of ${totalPages}`, 149, 292.2);
    } else {
      doc.text(`Generated on: ${generatedOnText}`, 149, 289.8);
    }
  }
}

function getCategoryGuidelines(
  category: OfficialAllocationCategory,
  allocationId: string,
  abstractId: string
): string[] {
  const refPhrase = `Quote your Presentation Allocation ID (${allocationId}) and Abstract ID (${abstractId}) in all correspondence and at session check-in.`;
  if (category === 'Oral Presentation') {
    return [
      'Your submission has been officially allotted an Oral Presentation slot at SRMCON 2027.',
      'Please prepare a concise PowerPoint presentation (16:9 format) and report to the Scientific Session Hall desk at least 30 minutes prior to your scheduled session.',
      refPhrase,
      `For assistance or schedule queries, contact the SRMCON 2027 Secretariat at ${SECRETARIAT_EMAIL}.`,
    ];
  }
  if (category === 'E-Poster Presentation') {
    return [
      'Your submission has been officially allotted an E-Poster Presentation slot at SRMCON 2027.',
      'Please prepare your single-slide digital E-Poster in 16:9 widescreen PDF/PPTX format as per conference E-Poster instructions to be notified prior to the conference.',
      refPhrase,
      `For assistance or schedule queries, contact the SRMCON 2027 Secretariat at ${SECRETARIAT_EMAIL}.`,
    ];
  }
  return [
    'Your submission has been officially allotted a Physical Poster Presentation slot at SRMCON 2027.',
    'Please bring your printed poster prepared according to the conference poster display dimensions and mount it at the designated poster zone during the morning display window.',
    refPhrase,
    `For assistance or schedule queries, contact the SRMCON 2027 Secretariat at ${SECRETARIAT_EMAIL}.`,
  ];
}

export function assertOfficialAllocationPdfEligible(abstract: AbstractRecord): void {
  if (!isAbstractOfficiallyAllocated(abstract)) {
    throw new Error(
      `Presentation Allocation Confirmation PDF cannot be generated because abstract ${abstract.id} does not have an Active official presentation allocation.`
    );
  }
}

export function buildPresentationAllocationPDFDoc(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): { doc: jsPDF; filename: string } {
  assertOfficialAllocationPdfEligible(abstract);

  const officialCategory = getOfficialAllocationCategory(abstract)!;
  const allocationId = sanitizePdfText((abstract.presentationAllocationId || '').trim());
  const absId = sanitizePdfText((abstract.id || '').trim());
  const regId = sanitizePdfText(
    (abstract.registrationId || registration?.registrationId || 'Not Available').trim()
  );

  const pa = abstract.presentingAuthor || {};
  const authorName = sanitizePdfText(
    pa.fullName || pa.name || registration?.fullName || 'Presenting Author'
  );
  const authorEmail = sanitizePdfText(pa.email || registration?.email || 'Not Available');
  const authorInstitution = sanitizePdfText(
    pa.affiliation || pa.institution || registration?.institution || 'Not Available'
  );
  const absTitle = sanitizePdfText(abstract.title || 'Untitled Abstract');
  const trackText = resolveScientificTrackLabel(abstract.trackId);
  const submittedPreference = sanitizePdfText(
    abstract.presentationPreference || abstract.presentationType || 'Not Specified'
  );
  const allocatedAtStr = formatDateTime(abstract.allocationCreatedAt || abstract.allottedAt);
  const allocatedByStr = sanitizePdfText(
    abstract.allocationCreatedBy || abstract.allottedBy || SECRETARIAT_EMAIL
  );
  const generatedOn = formatDateTime();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  drawCommonPageBackground(doc);

  let currentY = drawPageOneHeader(doc);

  // Highlight Card: Presentation Allocation ID + Active Status Pill
  const highlightH = 22.0;
  doc.setFillColor(COLORS.cardFill[0], COLORS.cardFill[1], COLORS.cardFill[2]);
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, highlightH, 2.8, 2.8, 'FD');

  drawIconBadgeAward(doc, MARGIN_X + 12, currentY + highlightH / 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.text('OFFICIAL PRESENTATION ALLOCATION ID', MARGIN_X + 24, currentY + 6.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(allocationId, MARGIN_X + 24, currentY + 13.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(COLORS.slateMuted[0], COLORS.slateMuted[1], COLORS.slateMuted[2]);
  doc.text(`Official Category: ${officialCategory}`, MARGIN_X + 24, currentY + 18.4);

  doc.setDrawColor(196, 204, 232);
  doc.line(126, currentY + 3.5, 126, currentY + highlightH - 3.5);

  const badgeX = 132;
  const badgeY = currentY + 4.5;
  const badgeW = 58;
  const badgeH = 13;
  doc.setFillColor(COLORS.mintFill[0], COLORS.mintFill[1], COLORS.mintFill[2]);
  doc.setDrawColor(COLORS.mintBorder[0], COLORS.mintBorder[1], COLORS.mintBorder[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.5, 2.5, 'FD');
  drawIconCheckCircle(doc, badgeX + 7.2, badgeY + badgeH / 2, 3.0, true);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.setTextColor(COLORS.mintText[0], COLORS.mintText[1], COLORS.mintText[2]);
  doc.text('ALLOCATION', badgeX + 13.5, badgeY + 5.5);
  doc.text('CONFIRMED (ACTIVE)', badgeX + 13.5, badgeY + 9.7);

  currentY += highlightH + 4.2;

  const renderSectionCard = (
    title: string,
    drawIcon: (pdf: jsPDF, cx: number, cy: number) => void,
    rows: Array<{ label: string; value: string; boldValue?: boolean }>
  ) => {
    const iconColW = 24;
    const innerLeft = MARGIN_X + iconColW + 5;
    const labelW = 51;
    const colonX = innerLeft + labelW;
    const valueX = colonX + 4;
    const valueMaxW = MARGIN_X + CONTENT_WIDTH - valueX - 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.0);
    const lineH = 4.2;

    const computedRows = rows.map((row) => {
      const wrapped = doc.splitTextToSize(sanitizePdfText(row.value) || 'Not Available', valueMaxW);
      return {
        row,
        lines: wrapped,
        height: Math.max(wrapped.length * lineH + 1.5, 5.6),
      };
    });

    const totalBodyH = computedRows.reduce((s, r) => s + r.height, 0);
    const cardH = Math.max(24, 11.0 + totalBodyH + 3.0);

    if (currentY + cardH > FOOTER_TOP_Y - 6) {
      currentY = addContinuationPage(doc, allocationId);
    }

    doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
    doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, cardH, 2.8, 2.8, 'FD');

    doc.setFillColor(COLORS.iconColumn[0], COLORS.iconColumn[1], COLORS.iconColumn[2]);
    doc.roundedRect(MARGIN_X, currentY, iconColW, cardH, 2.8, 2.8, 'F');
    doc.rect(MARGIN_X + iconColW - 2.8, currentY, 2.8, cardH, 'F');
    doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
    doc.line(MARGIN_X + iconColW, currentY, MARGIN_X + iconColW, currentY + cardH);

    drawIcon(doc, MARGIN_X + iconColW / 2, currentY + cardH / 2);

    doc.setFillColor(235, 239, 253);
    doc.rect(MARGIN_X + iconColW + 0.2, currentY + 0.2, CONTENT_WIDTH - iconColW - 0.5, 7.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(title, innerLeft, currentY + 5.4);

    let ry = currentY + 13.0;
    for (const item of computedRows) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.0);
      doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
      doc.text(item.row.label, innerLeft, ry);
      doc.text(':', colonX, ry);

      doc.setFont('helvetica', item.row.boldValue ? 'bold' : 'normal');
      doc.setFontSize(9.0);
      doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
      doc.text(item.lines, valueX, ry);
      ry += item.height;
    }

    currentY += cardH + 4.0;
  };

  // Card 1: Presenter & Abstract Identification
  renderSectionCard('Presenter & Abstract Identification', drawIconDocLines, [
    { label: 'Presenting Author', value: authorName, boldValue: true },
    { label: 'Author Email', value: authorEmail },
    { label: 'Affiliation', value: authorInstitution },
    { label: 'Registration ID', value: regId, boldValue: true },
    { label: 'Abstract ID', value: absId, boldValue: true },
    { label: 'Abstract Title', value: absTitle },
    { label: 'Scientific Track', value: trackText },
  ]);

  // Card 2: Official Presentation Allocation Summary (clearly separating preference vs official allotment)
  renderSectionCard('Official Presentation Allocation Summary', drawIconBadgeAward, [
    { label: 'Presentation Allocation ID', value: allocationId, boldValue: true },
    { label: 'Official Allotted Category', value: officialCategory, boldValue: true },
    { label: 'Allocation Status', value: 'Active (Confirmed by Organising Secretariat)', boldValue: true },
    { label: 'Participant Preference', value: `${submittedPreference} (Submitted Reference Only)` },
    { label: 'Allocated On', value: allocatedAtStr },
    { label: 'Allocated By', value: allocatedByStr },
  ]);

  // Card 3: Official Presentation Guidelines
  const guidelines = getCategoryGuidelines(officialCategory, allocationId, absId);
  const iconColW = 24;
  const instrTextX = MARGIN_X + iconColW + 9;
  const instrMaxW = MARGIN_X + CONTENT_WIDTH - instrTextX - 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.7);
  const wrappedBullets = guidelines.map((b) => doc.splitTextToSize(sanitizePdfText(b), instrMaxW));
  const bulletsH = wrappedBullets.reduce((s, lines) => s + lines.length * 4.1 + 1.4, 0);
  const instrCardH = Math.max(24, 10.5 + bulletsH + 3.0);

  if (currentY + instrCardH + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    currentY = addContinuationPage(doc, allocationId);
  }

  doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, instrCardH, 2.8, 2.8, 'FD');

  doc.setFillColor(COLORS.iconColumn[0], COLORS.iconColumn[1], COLORS.iconColumn[2]);
  doc.roundedRect(MARGIN_X, currentY, iconColW, instrCardH, 2.8, 2.8, 'F');
  doc.rect(MARGIN_X + iconColW - 2.8, currentY, 2.8, instrCardH, 'F');
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.line(MARGIN_X + iconColW, currentY, MARGIN_X + iconColW, currentY + instrCardH);
  drawIconClipboardCheck(doc, MARGIN_X + iconColW / 2, currentY + instrCardH / 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(`Presentation Guidelines (${officialCategory})`, MARGIN_X + iconColW + 5, currentY + 6.8);

  let by = currentY + 11.8;
  wrappedBullets.forEach((lines) => {
    doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.circle(MARGIN_X + iconColW + 6.2, by - 1.1, 0.7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.7);
    doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
    doc.text(lines, instrTextX, by);
    by += lines.length * 4.1 + 1.4;
  });

  currentY += instrCardH + 4.5;

  const sigY = Math.max(currentY, 232);
  if (sigY + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    const contY = addContinuationPage(doc, allocationId);
    drawSignatureBlock(doc, contY + 6);
  } else {
    drawSignatureBlock(doc, sigY);
  }

  drawFooterOnAllPages(doc, generatedOn);

  return {
    doc,
    filename: `${allocationId}_Presentation_Allocation_Confirmation.pdf`,
  };
}

export function generatePresentationAllocationPDF(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): void {
  const { doc, filename } = buildPresentationAllocationPDFDoc(abstract, registration);
  doc.save(filename);
}

export function createPresentationAllocationPreviewUrl(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): { url: string; filename: string } {
  const { doc, filename } = buildPresentationAllocationPDFDoc(abstract, registration);
  const blob = doc.output('blob');
  return {
    url: URL.createObjectURL(blob),
    filename,
  };
}

export function generatePresentationAllocationPDFBase64(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): PdfAttachmentOutput {
  const { doc, filename } = buildPresentationAllocationPDFDoc(abstract, registration);
  const dataUri = doc.output('datauristring');
  const commaIdx = dataUri.indexOf(',');
  const base64 =
    commaIdx >= 0 ? dataUri.slice(commaIdx + 1).replace(/\s+/g, '') : dataUri.replace(/\s+/g, '');

  if (!base64 || base64.length < 32 || !base64.startsWith('JVBERi')) {
    throw new Error(`Generated Presentation Allocation PDF "${filename}" is invalid or empty.`);
  }

  return {
    filename,
    mimeType: 'application/pdf',
    base64,
  };
}
