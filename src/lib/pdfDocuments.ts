import { jsPDF } from 'jspdf';
import { SCIENTIFIC_TRACKS } from '../data/conferenceData';
import type { AbstractRecord, RegistrationRecord } from './managementService';
import {
  classifyAllottedPresentationFormat,
  classifyParticipationMode,
  formatFoodPreferenceDisplay,
} from './presentationDashboardStats';
import { INTI_LOGO, PdfLogoAsset, SRMIST_LOGO, SRM_PHARMACY_LOGO } from './pdfLogos';
import { drawCommonPageBackground } from './pdfBackground';

export interface PdfAttachmentOutput {
  filename: string;
  mimeType: 'application/pdf';
  base64: string;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 182 mm
const FOOTER_TOP_Y = 274; // Keep all body content cleanly above wave + footer
const SIGNATURE_HEIGHT = 31; // Total height needed for signature block
const SECRETARIAT_EMAIL = 'org.secy.cp@srmist.edu.in';

const COLORS = {
  navy: [11, 22, 72] as const,
  deepIndigo: [18, 42, 114] as const,
  violet: [109, 60, 226] as const,
  purpleRibbon: [124, 58, 237] as const,
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
  amberFill: [254, 243, 199] as const,
  amberBorder: [252, 211, 77] as const,
  amberText: [146, 64, 14] as const,
  slateBadgeFill: [241, 245, 249] as const,
  slateBadgeBorder: [203, 213, 225] as const,
  disclaimerFill: [245, 242, 254] as const,
  disclaimerBorder: [209, 196, 249] as const,
};

/**
 * Normalizes rare Unicode symbols that standard WinAnsi Helvetica lacks
 * while preserving Latin-1, accents, en-dash/em-dash, curly quotes, micro sign, etc.
 */
export function sanitizePdfText(input: string | number | null | undefined): string {
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
      // Keep ASCII, Latin-1 supplement (0xA0-0xFF), and WinAnsi punctuation range
      if (
        (code >= 0x20 && code <= 0xff) ||
        code === 0x2013 || // en dash
        code === 0x2014 || // em dash
        code === 0x2018 ||
        code === 0x2019 ||
        code === 0x201c ||
        code === 0x201d ||
        code === 0x2022 || // bullet
        code === 0x2026 || // ellipsis
        code === 0x2122 || // TM
        code === 0x20ac || // Euro
        ch === '\n' ||
        ch === '\t'
      ) {
        out += ch;
      } else {
        out += '';
      }
    }
  }
  return out;
}

function formatDateOnly(isoOrDate?: string | null): string | null {
  if (!isoOrDate || !String(isoOrDate).trim()) return null;
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

export function resolveScientificTrackDisplay(trackId?: string | null): {
  primary: string;
  subtitle: string | null;
} {
  const raw = (trackId || '').trim();
  if (!raw) {
    return { primary: 'Not Specified', subtitle: null };
  }
  const normalized = raw.toLowerCase();
  const numericMatch = normalized.match(/(\d+)/);
  const parsedNum = numericMatch ? parseInt(numericMatch[1], 10) : null;

  const matched = SCIENTIFIC_TRACKS.find(
    (t) =>
      t.id.toLowerCase() === normalized ||
      `track ${t.number}` === normalized ||
      `track-${t.number}` === normalized ||
      (parsedNum !== null && parseInt(t.number, 10) === parsedNum && (normalized.includes('track') || /^\d+$/.test(normalized))) ||
      t.title.toLowerCase() === normalized
  );
  if (matched) {
    return {
      primary: `Track ${matched.number} – ${matched.title}`,
      subtitle: matched.focusArea ? `(${matched.focusArea})` : null,
    };
  }
  return { primary: sanitizePdfText(raw), subtitle: null };
}

function resolveOfficialAllottedFormat(abstract: AbstractRecord): string | null {
  const category = classifyAllottedPresentationFormat(abstract);
  if (!category) return null;
  const raw = (abstract.allottedPresentationFormat || abstract.finalPresentationFormat || '').trim();
  if (category === 'oral') return raw || 'Oral Presentation';
  if (category === 'eposter') return raw || 'E-Poster Presentation';
  return raw || 'Poster Presentation';
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

/**
 * Draws a crisp gradient rounded pill banner by building the rounded interior
 * using horizontal rounded-cap strips or vertical slices inside rounded bounds.
 */
function drawGradientPillBanner(doc: jsPDF, x: number, y: number, w: number, h: number, title: string) {
  const r = h / 2;
  const startColor: readonly [number, number, number] = [14, 58, 138]; // Deep conference blue
  const midColor: readonly [number, number, number] = [67, 56, 202]; // Indigo
  const endColor: readonly [number, number, number] = [139, 54, 217]; // Royal violet

  // True vector semicircle caps at both ends so corners are completely smooth
  doc.setFillColor(startColor[0], startColor[1], startColor[2]);
  doc.circle(x + r, y + r, r, 'F');
  doc.setFillColor(endColor[0], endColor[1], endColor[2]);
  doc.circle(x + w - r, y + r, r, 'F');

  // Smooth horizontal linear gradient across the rectangular span between caps
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
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text(title, PAGE_WIDTH / 2, y + h / 2 + 1.65, { align: 'center' });
}

function drawRupeeSymbol(doc: jsPDF, x: number, baselineY: number, sizeMm: number) {
  // Crisp vector Indian Rupee sign at x, baselineY
  doc.setLineWidth(0.32);
  doc.setDrawColor(11, 22, 72);
  const top = baselineY - sizeMm;
  const w = sizeMm * 0.62;
  // Top horizontal bar
  doc.line(x, top, x + w, top);
  // Second horizontal bar
  const midBarY = top + sizeMm * 0.27;
  doc.line(x, midBarY, x + w, midBarY);
  // Curved stem right edge then diagonal leg
  const neckX = x + w * 0.62;
  const bowlBottomY = top + sizeMm * 0.56;
  doc.line(x + w * 0.22, top, neckX, top);
  doc.line(neckX, top, neckX + w * 0.08, top + sizeMm * 0.27);
  doc.line(neckX + w * 0.08, top + sizeMm * 0.27, x + w * 0.42, bowlBottomY);
  doc.line(x + w * 0.42, bowlBottomY, x + w * 0.12, bowlBottomY);
  doc.line(x + w * 0.12, bowlBottomY, x + w * 0.72, baselineY);
}

// ============================================================================
// VECTOR ICON SET (sharp at any DPI)
// ============================================================================
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

function drawIconUser(doc: jsPDF, cx: number, cy: number, color: readonly [number, number, number] = COLORS.violet) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy - 2.1, 2.0, 'S');
  // Shoulders arc approximated cleanly
  doc.roundedRect(cx - 3.6, cy + 0.5, 7.2, 3.8, 1.8, 1.8, 'S');
}

function drawIconUsers(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.45);
  doc.circle(cx - 1.3, cy - 2.0, 1.7, 'S');
  doc.roundedRect(cx - 4.3, cy + 0.3, 6.0, 3.4, 1.6, 1.6, 'S');
  doc.circle(cx + 2.4, cy - 1.7, 1.3, 'S');
  doc.line(cx + 1.8, cy + 0.5, cx + 4.4, cy + 1.3);
  doc.line(cx + 4.4, cy + 1.3, cx + 4.4, cy + 3.6);
}

function drawIconUserCheck(doc: jsPDF, cx: number, cy: number) {
  drawIconUser(doc, cx - 0.8, cy, COLORS.violet);
  doc.setFillColor(109, 60, 226);
  doc.circle(cx + 3.2, cy + 2.8, 1.9, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.42);
  doc.line(cx + 2.3, cy + 2.8, cx + 3.0, cy + 3.5);
  doc.line(cx + 3.0, cy + 3.5, cx + 4.2, cy + 2.1);
}

function drawIconClipboardCheck(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.45);
  doc.roundedRect(cx - 3.6, cy - 3.8, 7.2, 8.6, 0.9, 0.9, 'S');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cx - 1.7, cy - 4.5, 3.4, 1.4, 0.4, 0.4, 'FD');
  // Small checkmarks & lines
  doc.line(cx - 2.2, cy - 1.0, cx - 1.5, cy - 0.3);
  doc.line(cx - 1.5, cy - 0.3, cx - 0.5, cy - 1.5);
  doc.line(cx + 0.3, cy - 0.8, cx + 2.4, cy - 0.8);

  doc.line(cx - 2.2, cy + 1.1, cx - 1.5, cy + 1.8);
  doc.line(cx - 1.5, cy + 1.8, cx - 0.5, cy + 0.6);
  doc.line(cx + 0.3, cy + 1.3, cx + 2.4, cy + 1.3);

  doc.line(cx - 2.2, cy + 3.1, cx + 2.4, cy + 3.1);
}

function drawIconCreditCard(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.48);
  doc.roundedRect(cx - 4.4, cy - 3.0, 8.8, 6.0, 0.9, 0.9, 'S');
  doc.setFillColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.rect(cx - 4.4, cy - 1.6, 8.8, 1.2, 'F');
  doc.line(cx - 3.2, cy + 1.4, cx - 0.4, cy + 1.4);
  doc.circle(cx + 2.6, cy + 1.3, 0.6, 'S');
}

function drawIconDocCheck(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.45);
  doc.roundedRect(cx - 3.6, cy - 4.2, 6.8, 8.4, 0.8, 0.8, 'S');
  doc.line(cx - 2.2, cy - 2.1, cx + 1.6, cy - 2.1);
  doc.line(cx - 2.2, cy - 0.5, cx + 1.6, cy - 0.5);
  doc.line(cx - 2.2, cy + 1.1, cx + 0.6, cy + 1.1);
  doc.setFillColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.circle(cx + 2.9, cy + 3.0, 1.9, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.42);
  doc.line(cx + 2.0, cy + 3.0, cx + 2.7, cy + 3.7);
  doc.line(cx + 2.7, cy + 3.7, cx + 3.9, cy + 2.3);
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

function drawIconHourglass(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.48);
  doc.line(cx - 2.3, cy - 3.0, cx + 2.3, cy - 3.0);
  doc.line(cx - 2.3, cy + 3.0, cx + 2.3, cy + 3.0);
  doc.line(cx - 1.8, cy - 3.0, cx, cy);
  doc.line(cx + 1.8, cy - 3.0, cx, cy);
  doc.line(cx - 1.8, cy + 3.0, cx, cy);
  doc.line(cx + 1.8, cy + 3.0, cx, cy);
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

function drawIconInfoCircle(doc: jsPDF, cx: number, cy: number, radius = 3.2) {
  doc.setDrawColor(59, 91, 219);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, radius, 'FD');
  doc.setFillColor(59, 91, 219);
  doc.circle(cx, cy - 1.35, 0.42, 'F');
  doc.setLineWidth(0.55);
  doc.line(cx, cy - 0.4, cx, cy + 1.7);
}

function drawIconEnvelope(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, 4.0, 2.8, 0.4, 0.4, 'S');
  doc.line(x, y, x + 2.0, y + 1.6);
  doc.line(x + 4.0, y, x + 2.0, y + 1.6);
}

function drawIconLeaf(doc: jsPDF, cx: number, cy: number) {
  doc.setFillColor(22, 163, 74);
  doc.ellipse(cx + 0.2, cy - 0.1, 1.5, 0.9, 'F');
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(0.32);
  doc.line(cx - 1.5, cy + 1.0, cx + 0.9, cy - 0.3);
}

function drawIconMic(doc: jsPDF, cx: number, cy: number) {
  doc.setFillColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.roundedRect(cx - 0.85, cy - 2.1, 1.7, 2.5, 0.8, 0.8, 'F');
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setLineWidth(0.35);
  doc.line(cx - 1.4, cy - 0.2, cx - 1.4, cy + 0.5);
  doc.line(cx + 1.4, cy - 0.2, cx + 1.4, cy + 0.5);
  doc.line(cx - 1.4, cy + 0.5, cx + 1.4, cy + 0.5);
  doc.line(cx, cy + 0.5, cx, cy + 1.8);
  doc.line(cx - 1.0, cy + 1.8, cx + 1.0, cy + 1.8);
}

function drawIconPosterBoard(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(cx - 1.7, cy - 1.8, 3.4, 2.5, 0.3, 0.3, 'FD');
  doc.line(cx - 1.0, cy + 0.7, cx - 1.4, cy + 1.9);
  doc.line(cx + 1.0, cy + 0.7, cx + 1.4, cy + 1.9);
}

function drawIconMonitor(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(COLORS.violet[0], COLORS.violet[1], COLORS.violet[2]);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(cx - 1.9, cy - 1.7, 3.8, 2.5, 0.3, 0.3, 'FD');
  doc.line(cx, cy + 0.8, cx, cy + 1.7);
  doc.line(cx - 1.1, cy + 1.7, cx + 1.1, cy + 1.7);
}

// ============================================================================
// COMMON INSTITUTIONAL HEADER, SIGNATURES & FOOTER
// ============================================================================
function createConferenceA4Doc(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  drawCommonPageBackground(doc);
  return doc;
}

function addConferenceContinuationPage(
  doc: jsPDF,
  documentTitle: string,
  identifierText: string
): number {
  doc.addPage();
  drawCommonPageBackground(doc);
  return drawContinuationPageHeader(doc, documentTitle, identifierText);
}

function drawCommonPageOneHeader(doc: jsPDF, documentBannerTitle: string): number {
  // Top Institutional Logos Strip (Left: SRMIST, Centre: INTI, Right: SRM College of Pharmacy)
  const logoCenterY = 14.5;
  drawLogoPreserveAspect(doc, SRMIST_LOGO, 37, logoCenterY, 40);
  drawLogoPreserveAspect(doc, INTI_LOGO, 109.5, logoCenterY, 74);
  drawLogoPreserveAspect(doc, SRM_PHARMACY_LOGO, 174, logoCenterY, 16.5);

  // Subtle vertical dividers between the 3 institutions
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.32);
  doc.line(66, 6.5, 66, 22.5);
  doc.line(153, 6.5, 153, 22.5);

  // Trapezoid/Ribbon Badge: SRMCON 2027
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

  // Conference Subtitle + Title
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

  // Conference Dates & Venue metadata row
  drawIconCalendar(doc, 43.5, 46.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
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

  // Subtle divider line below conference header block
  doc.setDrawColor(219, 224, 245);
  doc.setLineWidth(0.35);
  doc.line(MARGIN_X, 54.6, PAGE_WIDTH - MARGIN_X, 54.6);

  // Full-width Gradient Document Title Banner
  drawGradientPillBanner(doc, MARGIN_X, 57.5, CONTENT_WIDTH, 10.0, documentBannerTitle);

  return 71.5; // Starting Y for body content
}

function drawContinuationPageHeader(
  doc: jsPDF,
  documentTitle: string,
  identifierText: string
): number {
  drawLinearGradientRect(doc, 0, 0, PAGE_WIDTH, 14, [14, 58, 138], [124, 58, 237], 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`SRMCON 2027  |  ${documentTitle}`, MARGIN_X, 8.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(sanitizePdfText(identifierText), PAGE_WIDTH - MARGIN_X, 8.8, { align: 'right' });
  return 22;
}

function drawSignatureBlock(doc: jsPDF, y: number) {
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.42);
  // Left signature line
  doc.line(24, y + 11, 82, y + 11);
  // Right signature line
  doc.line(128, y + 11, 186, y + 11);

  // Left: Dr. V. Chitra / Convenor / SRMCON 2027
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('Dr. V. Chitra', 53, y + 16.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
  doc.text('Convenor', 53, y + 21.0, { align: 'center' });
  doc.text('SRMCON 2027', 53, y + 25.2, { align: 'center' });

  // Right: Dr. N. Damodharan / Organising Secretary / SRMCON 2027
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

function drawFooterOnAllPages(doc: jsPDF, documentFooterTitle: string, generatedOnText: string) {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Bottom navy-to-indigo gradient band (y = 281..297) sits cleanly over the common background's lower edge
    drawLinearGradientRect(doc, 0, 281, PAGE_WIDTH, 16, [15, 29, 89], [67, 56, 202], 45);

    // Subtle institutional building silhouette on left matching mockup footer
    doc.setDrawColor(129, 140, 248);
    doc.setFillColor(49, 64, 145);
    doc.setLineWidth(0.22);
    doc.rect(9, 286.5, 6, 8, 'FD');
    doc.rect(15.5, 284.5, 9, 10, 'FD');
    doc.rect(25, 286.5, 6, 8, 'FD');
    doc.triangle(15.5, 284.5, 20, 282.5, 24.5, 284.5, 'FD');

    // Vertical divider after silhouette
    doc.setDrawColor(165, 180, 252);
    doc.setLineWidth(0.28);
    doc.line(35.5, 284.2, 35.5, 293.8);

    // Conference & Document Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(255, 255, 255);
    doc.text(`SRMCON 2027  |  ${documentFooterTitle}`, 40, 287.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(224, 231, 255);
    doc.text('SRM College of Pharmacy, SRMIST, Kattankulathur · 15–16 February 2027', 40, 292.3);

    // Right vertical divider & Generation Timestamp (strictly NO Document Reference Number)
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

// ============================================================================
// PDF 1: REGISTRATION CONFIRMATION (Verified + Approved ONLY)
// ============================================================================
export function assertRegistrationConfirmationEligible(reg: RegistrationRecord): void {
  if (reg.paymentStatus !== 'Verified' || reg.registrationStatus !== 'Approved') {
    throw new Error(
      `Registration Confirmation PDF cannot be generated because registration ${reg.registrationId || reg.id} is not both Verified and Approved (paymentStatus=${reg.paymentStatus}, registrationStatus=${reg.registrationStatus}).`
    );
  }
}

function formatRegistrationFeeParts(reg: RegistrationRecord): {
  usesRupeeVector: boolean;
  text: string;
} {
  const rawCurrency = String(
    (reg as unknown as Record<string, unknown>).paymentCurrency ||
      (reg as unknown as Record<string, unknown>).currency ||
      ''
  )
    .trim()
    .toUpperCase();

  const numericAmount =
    typeof reg.paymentAmount === 'number' && Number.isFinite(reg.paymentAmount) && reg.paymentAmount > 0
      ? reg.paymentAmount
      : typeof reg.amount === 'number' && Number.isFinite(reg.amount) && reg.amount > 0
      ? reg.amount
      : null;

  if (numericAmount === null) {
    return { usesRupeeVector: false, text: 'Not Available' };
  }

  if (rawCurrency === 'MYR' || rawCurrency === 'USD') {
    return {
      usesRupeeVector: false,
      text: `${rawCurrency} ${numericAmount.toLocaleString('en-US')}`,
    };
  }

  return {
    usesRupeeVector: true,
    text: numericAmount.toLocaleString('en-IN'),
  };
}

type RegistrationPdfStage = 'submission_receipt' | 'confirmed';

function buildRegistrationPdfInternal(
  reg: RegistrationRecord,
  stage: RegistrationPdfStage
): {
  doc: jsPDF;
  filename: string;
} {
  if (stage === 'confirmed') {
    assertRegistrationConfirmationEligible(reg);
  }

  const isConfirmedStage = stage === 'confirmed';
  const docTitle = isConfirmedStage ? 'Registration Confirmation' : 'Registration Receipt';
  const bannerTitle = isConfirmedStage ? 'REGISTRATION CONFIRMATION' : 'REGISTRATION RECEIPT';

  const doc = createConferenceA4Doc();

  const regIdDisplay = sanitizePdfText((reg.registrationId || reg.id || '').trim());
  const generatedOn = formatDateTime();

  let currentY = drawCommonPageOneHeader(doc, bannerTitle);

  // --------------------------------------------------------------------------
  // HIGHLIGHT CARD: REGISTRATION ID + STAGE STATUS BADGE
  // --------------------------------------------------------------------------
  const highlightH = isConfirmedStage ? 20.5 : 19.2;
  doc.setFillColor(COLORS.cardFill[0], COLORS.cardFill[1], COLORS.cardFill[2]);
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, highlightH, 2.8, 2.8, 'FD');

  drawIconUserCheck(doc, MARGIN_X + 12, currentY + highlightH / 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('REGISTRATION ID', MARGIN_X + 25, currentY + (isConfirmedStage ? 6.8 : 6.1));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isConfirmedStage ? 15.2 : 14.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(regIdDisplay || 'Not Available', MARGIN_X + 25, currentY + (isConfirmedStage ? 13.8 : 12.6));

  if (!isConfirmedStage) {
    const submittedDateStr = formatDateTime(reg.createdAt);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.slateMuted[0], COLORS.slateMuted[1], COLORS.slateMuted[2]);
    doc.text(`Submitted on: ${submittedDateStr}`, MARGIN_X + 25, currentY + 17.0);
  }

  if (isConfirmedStage) {
    // Vertical divider
    doc.setDrawColor(196, 204, 232);
    doc.line(126, currentY + 3.5, 126, currentY + highlightH - 3.5);

    // Confirmed Pill Badge on Right
    const badgeX = 132;
    const badgeY = currentY + 4.25;
    const badgeW = 58;
    const badgeH = 12;
    doc.setFillColor(COLORS.mintFill[0], COLORS.mintFill[1], COLORS.mintFill[2]);
    doc.setDrawColor(COLORS.mintBorder[0], COLORS.mintBorder[1], COLORS.mintBorder[2]);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.5, 2.5, 'FD');
    drawIconCheckCircle(doc, badgeX + 7.2, badgeY + badgeH / 2, 3.0, true);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(COLORS.mintText[0], COLORS.mintText[1], COLORS.mintText[2]);
    doc.text('REGISTRATION', badgeX + 13.5, badgeY + 5.2);
    doc.text('CONFIRMED', badgeX + 13.5, badgeY + 9.4);
  } else {
    // Vertical divider
    doc.setDrawColor(196, 204, 232);
    doc.line(113, currentY + 3.0, 113, currentY + highlightH - 3.0);

    // Amber Waiting Status Pill Badge on Right (Stage 1 Receipt)
    const badgeX = 117.5;
    const badgeY = currentY + 2.85;
    const badgeW = 74;
    const badgeH = 13.5;
    doc.setFillColor(COLORS.amberFill[0], COLORS.amberFill[1], COLORS.amberFill[2]);
    doc.setDrawColor(COLORS.amberBorder[0], COLORS.amberBorder[1], COLORS.amberBorder[2]);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.5, 2.5, 'FD');
    drawIconHourglass(doc, badgeX + 6.5, badgeY + badgeH / 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(COLORS.amberText[0], COLORS.amberText[1], COLORS.amberText[2]);
    doc.text('REGISTRATION RECEIVED –', badgeX + 11.8, badgeY + 5.3);
    doc.text('AWAITING PAYMENT VERIFICATION', badgeX + 11.8, badgeY + 9.7);
  }

  currentY += highlightH + (isConfirmedStage ? 4.5 : 3.2);

  // Helper to render a two-tone section card matching the Registration Confirmation mockup
  interface CardRow {
    label: string;
    value: string;
    customRenderer?: (valX: number, rowY: number) => number;
  }

  const renderSectionCard = (
    title: string,
    drawIcon: (pdf: jsPDF, cx: number, cy: number) => void,
    rows: CardRow[],
    minHeight = isConfirmedStage ? 32 : 26
  ) => {
    const iconColW = 24;
    const innerLeft = MARGIN_X + iconColW + 5;
    const labelW = 48;
    const colonX = innerLeft + labelW;
    const valueX = colonX + 4;
    const valueMaxW = MARGIN_X + CONTENT_WIDTH - valueX - 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);

    // Pre-calculate row heights for dynamic vertical fit
    const lineH = isConfirmedStage ? 4.4 : 4.1;
    const computedRows = rows.map((row) => {
      if (row.customRenderer) {
        return { row, lines: [] as string[], height: isConfirmedStage ? 7.2 : 6.2 };
      }
      const wrapped = doc.splitTextToSize(sanitizePdfText(row.value) || 'Not Available', valueMaxW);
      return {
        row,
        lines: wrapped,
        height: Math.max(wrapped.length * lineH + (isConfirmedStage ? 1.6 : 1.2), isConfirmedStage ? 5.8 : 5.2),
      };
    });

    const totalBodyH = computedRows.reduce((sum, item) => sum + item.height, 0);
    const cardHeaderOffset = isConfirmedStage ? 11.5 : 10.2;
    const cardBottomPad = isConfirmedStage ? 3.5 : 2.3;
    const cardH = Math.max(minHeight, cardHeaderOffset + totalBodyH + cardBottomPad);

    // Ensure card never overlaps footer
    if (currentY + cardH > FOOTER_TOP_Y - 6) {
      currentY = addConferenceContinuationPage(doc, docTitle, regIdDisplay);
    }

    // Main outer card
    doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
    doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, cardH, 2.8, 2.8, 'FD');

    // Left icon zone fill
    doc.setFillColor(COLORS.iconColumn[0], COLORS.iconColumn[1], COLORS.iconColumn[2]);
    doc.roundedRect(MARGIN_X, currentY, iconColW, cardH, 2.8, 2.8, 'F');
    doc.rect(MARGIN_X + iconColW - 2.8, currentY, 2.8, cardH, 'F');
    doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
    doc.line(MARGIN_X + iconColW, currentY, MARGIN_X + iconColW, currentY + cardH);

    // Center vector icon in left zone
    drawIcon(doc, MARGIN_X + iconColW / 2, currentY + cardH / 2);

    // Header strip inside right area
    const stripH = isConfirmedStage ? 8.2 : 7.5;
    doc.setFillColor(235, 239, 253);
    doc.rect(MARGIN_X + iconColW + 0.2, currentY + 0.2, CONTENT_WIDTH - iconColW - 0.5, stripH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isConfirmedStage ? 10.2 : 9.9);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(title, innerLeft, currentY + (isConfirmedStage ? 5.7 : 5.2));

    // Render rows
    let ry = currentY + (isConfirmedStage ? 13.5 : 12.1);
    for (const item of computedRows) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.2);
      doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
      doc.text(item.row.label, innerLeft, ry);
      doc.text(':', colonX, ry);

      if (item.row.customRenderer) {
        item.row.customRenderer(valueX, ry);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.2);
        doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
        doc.text(item.lines, valueX, ry);
      }

      ry += item.height;
    }

    currentY += cardH + (isConfirmedStage ? 4.5 : 3.2);
  };

  // 1. Participant Details Card
  renderSectionCard('Participant Details', drawIconUser, [
    { label: 'Full Name', value: reg.fullName || 'Not Available' },
    { label: 'Email', value: reg.email || 'Not Available' },
    { label: 'Affiliation', value: reg.institution || 'Not Available' },
    { label: 'Designation', value: reg.courseOrDesignation || 'Not Specified' },
  ]);

  // 2. Registration Details Card
  const categoryText =
    reg.category === 'Others' && reg.otherCategoryDescription
      ? `${reg.category} (${reg.otherCategoryDescription})`
      : reg.category || 'Not Specified';

  const modeClassification = classifyParticipationMode(reg);
  const modeDisplay =
    modeClassification === 'offline'
      ? 'Offline'
      : modeClassification === 'online'
      ? 'Online'
      : reg.participationMode || reg.modeOfParticipation || 'Not Specified';

  const foodDisplay = formatFoodPreferenceDisplay(reg);

  renderSectionCard('Registration Details', drawIconClipboardCheck, [
    { label: 'Participant Category', value: categoryText },
    { label: 'Participation Mode', value: modeDisplay },
    {
      label: 'Food Preference',
      value: foodDisplay,
      customRenderer: (valX, rowY) => {
        if (foodDisplay === 'Vegetarian') {
          const pillW = 35;
          doc.setFillColor(COLORS.mintFill[0], COLORS.mintFill[1], COLORS.mintFill[2]);
          doc.setDrawColor(COLORS.mintBorder[0], COLORS.mintBorder[1], COLORS.mintBorder[2]);
          doc.roundedRect(valX, rowY - 4.0, pillW, 6.0, 1.5, 1.5, 'FD');
          drawIconLeaf(doc, valX + 4.4, rowY - 1.0);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.0);
          doc.setTextColor(COLORS.mintText[0], COLORS.mintText[1], COLORS.mintText[2]);
          doc.text('Vegetarian', valX + 8.5, rowY + 0.1);
        } else if (foodDisplay === 'Non-Vegetarian') {
          const pillW = 41;
          doc.setFillColor(COLORS.amberFill[0], COLORS.amberFill[1], COLORS.amberFill[2]);
          doc.setDrawColor(COLORS.amberBorder[0], COLORS.amberBorder[1], COLORS.amberBorder[2]);
          doc.roundedRect(valX, rowY - 4.0, pillW, 6.0, 1.5, 1.5, 'FD');
          doc.setFillColor(194, 65, 12);
          doc.circle(valX + 4.5, rowY - 1.0, 1.35, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.0);
          doc.setTextColor(COLORS.amberText[0], COLORS.amberText[1], COLORS.amberText[2]);
          doc.text('Non-Vegetarian', valX + 8.0, rowY + 0.1);
        } else {
          const pillW = foodDisplay === 'Not Applicable' ? 36 : 34;
          doc.setFillColor(COLORS.slateBadgeFill[0], COLORS.slateBadgeFill[1], COLORS.slateBadgeFill[2]);
          doc.setDrawColor(COLORS.slateBadgeBorder[0], COLORS.slateBadgeBorder[1], COLORS.slateBadgeBorder[2]);
          doc.roundedRect(valX, rowY - 4.0, pillW, 6.0, 1.5, 1.5, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.8);
          doc.setTextColor(COLORS.slateMuted[0], COLORS.slateMuted[1], COLORS.slateMuted[2]);
          doc.text(foodDisplay, valX + 3.2, rowY + 0.1);
        }
        return 6.5;
      },
    },
  ]);

  // 3. Payment Details Card
  // - Confirmed Stage: displays verified payment information.
  // - Submission Receipt Stage: displays submitted payment reference clearly marked awaiting verification.
  const feeParts = formatRegistrationFeeParts(reg);
  const paymentDateDisplay = isConfirmedStage
    ? formatDateOnly(reg.verifiedAt) || formatDateOnly(reg.createdAt) || 'Not Available'
    : formatDateOnly(reg.createdAt) || 'Not Available';
  const txReference = (reg.transactionReference || '').trim() || 'Not Available';

  const paymentRows: CardRow[] = [
    {
      label: isConfirmedStage ? 'Registration Fee' : 'Submitted Fee',
      value: feeParts.text,
      customRenderer: (valX, rowY) => {
        if (feeParts.usesRupeeVector) {
          drawRupeeSymbol(doc, valX, rowY, 2.75);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
          doc.text(feeParts.text, valX + 3.2, rowY);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.4);
          doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
          doc.text(feeParts.text, valX, rowY);
        }
        return 6;
      },
    },
    { label: isConfirmedStage ? 'Payment Date' : 'Submission Date', value: paymentDateDisplay },
    { label: 'Transaction / Reference ID', value: txReference },
  ];

  if (!isConfirmedStage) {
    paymentRows.push({
      label: 'Verification Status',
      value: 'Awaiting Payment Verification',
      customRenderer: (valX, rowY) => {
        const pillW = 54;
        doc.setFillColor(COLORS.amberFill[0], COLORS.amberFill[1], COLORS.amberFill[2]);
        doc.setDrawColor(COLORS.amberBorder[0], COLORS.amberBorder[1], COLORS.amberBorder[2]);
        doc.roundedRect(valX, rowY - 4.0, pillW, 5.6, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(COLORS.amberText[0], COLORS.amberText[1], COLORS.amberText[2]);
        doc.text('Awaiting Payment Verification', valX + 3.5, rowY + 0.05);
        return 6.0;
      },
    });
  }

  renderSectionCard(
    isConfirmedStage ? 'Payment Details' : 'Submitted Payment Details (Pending Verification)',
    drawIconCreditCard,
    paymentRows
  );

  // 4. Statement Callout Box
  const statementText = isConfirmedStage
    ? "This document confirms that the above participant's registration for SRMCON 2027 has been successfully verified and confirmed."
    : 'This receipt confirms submission of your registration details and payment reference only. Registration will be officially confirmed only after payment verification and approval by the Organising Secretary.';
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(isConfirmedStage ? 9.1 : 8.8);
  const statementLines = doc.splitTextToSize(statementText, CONTENT_WIDTH - 24);
  const boxH = isConfirmedStage
    ? Math.max(13, statementLines.length * 4.5 + 5.5)
    : Math.max(12, statementLines.length * 4.2 + 4.8);

  if (currentY + boxH + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    currentY = addConferenceContinuationPage(doc, docTitle, regIdDisplay);
  }

  if (isConfirmedStage) {
    doc.setFillColor(COLORS.mintFill[0], COLORS.mintFill[1], COLORS.mintFill[2]);
    doc.setDrawColor(COLORS.mintBorder[0], COLORS.mintBorder[1], COLORS.mintBorder[2]);
    doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, boxH, 2.5, 2.5, 'FD');
    drawIconCheckCircle(doc, MARGIN_X + 10.5, currentY + boxH / 2, 3.0, false);
  } else {
    doc.setFillColor(COLORS.disclaimerFill[0], COLORS.disclaimerFill[1], COLORS.disclaimerFill[2]);
    doc.setDrawColor(COLORS.disclaimerBorder[0], COLORS.disclaimerBorder[1], COLORS.disclaimerBorder[2]);
    doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, boxH, 2.5, 2.5, 'FD');
    drawIconInfoCircle(doc, MARGIN_X + 10.5, currentY + boxH / 2, 3.1);
  }

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(isConfirmedStage ? 9.1 : 8.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(statementLines, MARGIN_X + 18, currentY + (isConfirmedStage ? 5.8 : 5.2));

  currentY += boxH + (isConfirmedStage ? 5 : 3.5);

  // 5. Common Signatures Section (side-by-side at bottom above footer)
  const sigY = Math.max(currentY, isConfirmedStage ? 232 : 229);
  if (sigY + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    const contY = addConferenceContinuationPage(doc, docTitle, regIdDisplay);
    drawSignatureBlock(doc, contY + 6);
  } else {
    drawSignatureBlock(doc, sigY);
  }

  drawFooterOnAllPages(doc, docTitle, generatedOn);

  return {
    doc,
    filename: isConfirmedStage
      ? `${regIdDisplay || 'SRMCON2027'}_Registration_Confirmation.pdf`
      : `${regIdDisplay || 'SRMCON2027'}_Registration_Receipt.pdf`,
  };
}

export function buildRegistrationSubmissionReceiptPDFDoc(reg: RegistrationRecord): {
  doc: jsPDF;
  filename: string;
} {
  return buildRegistrationPdfInternal(reg, 'submission_receipt');
}

export function buildRegistrationConfirmationPDFDoc(reg: RegistrationRecord): {
  doc: jsPDF;
  filename: string;
} {
  return buildRegistrationPdfInternal(reg, 'confirmed');
}

// ============================================================================
// PDF 2: ABSTRACT SUBMISSION ACKNOWLEDGEMENT
// ============================================================================
interface ParsedAuthorSuperscriptToken {
  authorName: string;
  supNumber: string | null;
  hasCommaAfter: boolean;
}

function buildOrderedCoAuthorData(
  coAuthors: AbstractRecord['coAuthors'] | undefined
): {
  tokens: ParsedAuthorSuperscriptToken[];
  affiliations: Array<{ index: number; text: string }>;
} {
  if (!Array.isArray(coAuthors) || coAuthors.length === 0) {
    return { tokens: [], affiliations: [] };
  }

  // Strictly preserve submitted order; NEVER sort alphabetically.
  const validAuthors = coAuthors.filter((c) => c && typeof c.name === 'string' && c.name.trim().length > 0);
  if (validAuthors.length === 0) {
    return { tokens: [], affiliations: [] };
  }

  const affiliationToNumber = new Map<string, number>();
  const affiliations: Array<{ index: number; text: string }> = [];
  const tokens: ParsedAuthorSuperscriptToken[] = [];

  validAuthors.forEach((author, idx) => {
    const cleanName = sanitizePdfText(author.name.trim());
    const rawAff = sanitizePdfText((author.affiliation || '').trim());
    let supNum: string | null = null;

    if (rawAff) {
      const normKey = rawAff.toLowerCase().replace(/\s+/g, ' ');
      let assigned = affiliationToNumber.get(normKey);
      if (!assigned) {
        assigned = affiliations.length + 1;
        affiliationToNumber.set(normKey, assigned);
        affiliations.push({ index: assigned, text: rawAff });
      }
      supNum = String(assigned);
    }

    tokens.push({
      authorName: cleanName,
      supNumber: supNum,
      hasCommaAfter: idx < validAuthors.length - 1,
    });
  });

  return { tokens, affiliations };
}

function measureAndDrawCoAuthorsWithSuperscripts(
  doc: jsPDF,
  tokens: ParsedAuthorSuperscriptToken[],
  startX: number,
  startY: number,
  maxWidth: number,
  dryRun = false
): number {
  const lineHeight = 5.0;
  let cursorX = startX;
  let cursorY = startY;
  let lineCount = 1;

  tokens.forEach((token) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const nameW = doc.getTextWidth(token.authorName);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    const supW = token.supNumber ? doc.getTextWidth(token.supNumber) + 0.4 : 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const commaW = token.hasCommaAfter ? doc.getTextWidth(', ') : 0;
    const totalTokenW = nameW + supW + commaW;

    if (cursorX > startX && cursorX + totalTokenW > startX + maxWidth) {
      cursorX = startX;
      cursorY += lineHeight;
      lineCount += 1;
    }

    // If a single extraordinarily long author name exceeds maxWidth, split safely
    if (cursorX === startX && totalTokenW > maxWidth) {
      const wrappedName = doc.splitTextToSize(token.authorName, maxWidth - 6);
      if (!dryRun) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
        doc.text(wrappedName, cursorX, cursorY);
      }
      const lastLine = wrappedName[wrappedName.length - 1] || '';
      if (wrappedName.length > 1) {
        cursorY += (wrappedName.length - 1) * lineHeight;
        lineCount += wrappedName.length - 1;
      }
      const lastW = doc.getTextWidth(lastLine);
      let tailX = startX + lastW;
      if (token.supNumber && !dryRun) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
        doc.text(token.supNumber, tailX + 0.3, cursorY - 1.3);
      }
      tailX += supW;
      if (token.hasCommaAfter && !dryRun) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(', ', tailX, cursorY);
      }
      cursorX = tailX + commaW;
      return;
    }

    if (!dryRun) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
      doc.text(token.authorName, cursorX, cursorY);

      if (token.supNumber) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.text(token.supNumber, cursorX + nameW + 0.3, cursorY - 1.3);
      }

      if (token.hasCommaAfter) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(', ', cursorX + nameW + supW, cursorY);
      }
    }

    cursorX += totalTokenW;
  });

  return lineCount * lineHeight;
}

export function buildAbstractSubmissionAckPDFDoc(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): { doc: jsPDF; filename: string } {
  const doc = createConferenceA4Doc();

  const absIdDisplay = sanitizePdfText((abstract.id || '').trim());
  const generatedOn = formatDateTime();
  let currentY = drawCommonPageOneHeader(doc, 'ABSTRACT SUBMISSION ACKNOWLEDGEMENT');

  // --------------------------------------------------------------------------
  // HIGHLIGHT CARD: ABSTRACT ID + STATUS BADGE
  // --------------------------------------------------------------------------
  const statusRaw = (abstract.status || 'Submitted').trim();
  const isAwaitingReview = statusRaw === 'Submitted' || statusRaw === 'Under Review';
  const statusLine1 = isAwaitingReview ? 'Submitted – Awaiting' : statusRaw;
  const statusLine2 = isAwaitingReview ? 'Scientific Review' : 'Abstract Status';
  const submissionDateStr = formatDateTime(abstract.createdAt);

  const idCardH = 22;
  doc.setFillColor(COLORS.cardFill[0], COLORS.cardFill[1], COLORS.cardFill[2]);
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, idCardH, 2.8, 2.8, 'FD');

  drawIconDocCheck(doc, MARGIN_X + 12.5, currentY + idCardH / 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('ABSTRACT ID', MARGIN_X + 26, currentY + 6.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(absIdDisplay || 'Not Available', MARGIN_X + 26, currentY + 13.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(COLORS.slateMuted[0], COLORS.slateMuted[1], COLORS.slateMuted[2]);
  doc.text(`Submitted on: ${submissionDateStr}`, MARGIN_X + 26, currentY + 18.2);

  // Vertical divider
  doc.setDrawColor(196, 204, 232);
  doc.line(120, currentY + 3.5, 120, currentY + idCardH - 3.5);

  // Right Status Badge
  const badgeX = 125;
  const badgeY = currentY + 4.0;
  const badgeW = 67;
  const badgeH = 14.0;
  if (statusRaw === 'Accepted') {
    doc.setFillColor(COLORS.mintFill[0], COLORS.mintFill[1], COLORS.mintFill[2]);
    doc.setDrawColor(COLORS.mintBorder[0], COLORS.mintBorder[1], COLORS.mintBorder[2]);
  } else if (statusRaw === 'Rejected') {
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(252, 165, 165);
  } else {
    doc.setFillColor(COLORS.lavenderTag[0], COLORS.lavenderTag[1], COLORS.lavenderTag[2]);
    doc.setDrawColor(196, 181, 253);
  }
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.8, 2.8, 'FD');

  if (statusRaw === 'Accepted') {
    drawIconCheckCircle(doc, badgeX + 7.5, badgeY + badgeH / 2, 3.0, true);
    doc.setTextColor(COLORS.mintText[0], COLORS.mintText[1], COLORS.mintText[2]);
  } else {
    drawIconHourglass(doc, badgeX + 7.5, badgeY + badgeH / 2);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(statusLine1, badgeX + 14.5, badgeY + 5.7);
  doc.text(statusLine2, badgeX + 14.5, badgeY + 10.3);

  currentY += idCardH + 4.2;

  // Helper to draw chevron/tag row cards (Abstract Title, Scientific Track)
  const drawTagRowCard = (label: string, primaryText: string, subtitleText: string | null) => {
    const labelColW = 41;
    const textX = MARGIN_X + labelColW + 6;
    const textMaxW = MARGIN_X + CONTENT_WIDTH - textX - 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    const primaryLines = doc.splitTextToSize(sanitizePdfText(primaryText) || 'Not Specified', textMaxW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.7);
    const subLines = subtitleText ? doc.splitTextToSize(sanitizePdfText(subtitleText), textMaxW) : [];

    const textH = primaryLines.length * 4.6 + subLines.length * 4.2;
    const rowH = Math.max(12.5, textH + 5.5);

    if (currentY + rowH > FOOTER_TOP_Y - 6) {
      currentY = addConferenceContinuationPage(doc, 'Abstract Submission Acknowledgement', absIdDisplay);
    }

    doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
    doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, rowH, 2.5, 2.5, 'FD');

    // Left chevron/tag pill
    const tagY = currentY + (rowH - 7.4) / 2;
    doc.setFillColor(COLORS.lavenderTag[0], COLORS.lavenderTag[1], COLORS.lavenderTag[2]);
    doc.roundedRect(MARGIN_X + 3, tagY, labelColW - 7.5, 7.4, 1.5, 1.5, 'F');
    doc.triangle(
      MARGIN_X + labelColW - 4.5,
      tagY,
      MARGIN_X + labelColW - 4.5,
      tagY + 7.4,
      MARGIN_X + labelColW - 1.5,
      tagY + 3.7,
      'F'
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(label, MARGIN_X + 6.0, tagY + 4.9);

    // Subtle vertical divider
    doc.setDrawColor(215, 221, 245);
    doc.line(MARGIN_X + labelColW + 1, currentY + 2.5, MARGIN_X + labelColW + 1, currentY + rowH - 2.5);

    // Right value text
    const startTextY = currentY + 5.8 + Math.max(0, (rowH - 5.5 - textH) / 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(primaryLines, textX, startTextY);

    if (subLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.7);
      doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
      doc.text(subLines, textX, startTextY + primaryLines.length * 4.6 + 0.4);
    }

    currentY += rowH + 4.0;
  };

  // Row 1: Abstract Title (Full title, dynamic wrap, zero truncation)
  drawTagRowCard('Abstract Title', abstract.title || 'Untitled Abstract', null);

  // Row 2: Scientific Track (Resolved full track name from SCIENTIFIC_TRACKS)
  const resolvedTrack = resolveScientificTrackDisplay(abstract.trackId);
  drawTagRowCard('Scientific Track', resolvedTrack.primary, resolvedTrack.subtitle);

  // --------------------------------------------------------------------------
  // PRESENTING AUTHOR CARD
  // --------------------------------------------------------------------------
  const pa = abstract.presentingAuthor || {};
  const paName = sanitizePdfText(
    pa.fullName || pa.name || registration?.fullName || 'Presenting Author'
  );
  const paDepartment = sanitizePdfText((pa as Record<string, unknown>).department as string | undefined);
  const paAffiliation = sanitizePdfText(
    pa.affiliation || pa.institution || registration?.institution || 'Not Specified'
  );
  const paEmail = sanitizePdfText(pa.email || registration?.email || '');

  const labelZoneW = 46;
  const authorContentX = MARGIN_X + labelZoneW + 5;
  const authorMaxW = MARGIN_X + CONTENT_WIDTH - authorContentX - 5;

  const paAffiliationCombined =
    paDepartment && !paAffiliation.toLowerCase().includes(paDepartment.toLowerCase())
      ? `${paDepartment}\n${paAffiliation}`
      : paAffiliation;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  const paAffLines = doc.splitTextToSize(paAffiliationCombined, authorMaxW);
  const paBlockH = Math.max(
    22,
    6.5 + 4.8 + paAffLines.length * 4.2 + (paEmail ? 5.8 : 1.5) + 3.5
  );

  if (currentY + paBlockH > FOOTER_TOP_Y - 6) {
    currentY = addConferenceContinuationPage(doc, 'Abstract Submission Acknowledgement', absIdDisplay);
  }

  doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, paBlockH, 2.8, 2.8, 'FD');

  drawIconUser(doc, MARGIN_X + 8.5, currentY + paBlockH / 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('Presenting Author', MARGIN_X + 15.5, currentY + paBlockH / 2 + 1.0);

  doc.setDrawColor(215, 221, 245);
  doc.line(MARGIN_X + labelZoneW, currentY + 3, MARGIN_X + labelZoneW, currentY + paBlockH - 3);

  let py = currentY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(paName, authorContentX, py);
  py += 4.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
  doc.text(paAffLines, authorContentX, py);
  py += paAffLines.length * 4.2 + 1.2;

  if (paEmail) {
    drawIconEnvelope(doc, authorContentX, py - 2.3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(paEmail, authorContentX + 6.0, py);
  }

  currentY += paBlockH + 4.0;

  // --------------------------------------------------------------------------
  // CO-AUTHORS & AFFILIATIONS CARD (Dynamic multi-page safe, submitted order)
  // --------------------------------------------------------------------------
  const coAuthorData = buildOrderedCoAuthorData(abstract.coAuthors);

  // Measure height required for co-authors section
  const coAuthorsNamesH =
    coAuthorData.tokens.length > 0
      ? measureAndDrawCoAuthorsWithSuperscripts(
          doc,
          coAuthorData.tokens,
          authorContentX,
          currentY + 7,
          authorMaxW,
          true
        )
      : 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  const affiliationBlocks = coAuthorData.affiliations.map((aff) => ({
    index: aff.index,
    lines: doc.splitTextToSize(aff.text, authorMaxW - 5),
  }));
  const affiliationsTotalH = affiliationBlocks.reduce(
    (sum, blk) => sum + blk.lines.length * 4.0 + 1.4,
    0
  );

  const coBlockH = Math.max(20, 6.8 + coAuthorsNamesH + (affiliationsTotalH > 0 ? 1.8 + affiliationsTotalH : 0) + 4.0);

  // If the entire co-author card fits cleanly on the current page, render it as one unified card
  if (currentY + coBlockH <= FOOTER_TOP_Y - 4) {
    doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
    doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
    doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, coBlockH, 2.8, 2.8, 'FD');

    drawIconUsers(doc, MARGIN_X + 8.5, currentY + Math.min(coBlockH / 2, 16));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    const labelCenterY = currentY + Math.min(coBlockH / 2, 16);
    doc.text('Co-authors', MARGIN_X + 15.5, labelCenterY - 0.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.7);
    doc.text('(in submitted order)', MARGIN_X + 15.5, labelCenterY + 3.4);

    doc.setDrawColor(215, 221, 245);
    doc.line(MARGIN_X + labelZoneW, currentY + 3, MARGIN_X + labelZoneW, currentY + coBlockH - 3);

    let cy = currentY + 7.2;
    if (coAuthorData.tokens.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.0);
      doc.setTextColor(COLORS.slateMuted[0], COLORS.slateMuted[1], COLORS.slateMuted[2]);
      doc.text('None', authorContentX, cy);
    } else {
      measureAndDrawCoAuthorsWithSuperscripts(
        doc,
        coAuthorData.tokens,
        authorContentX,
        cy,
        authorMaxW,
        false
      );
      cy += coAuthorsNamesH + 1.4;

      affiliationBlocks.forEach((blk) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
        doc.text(String(blk.index), authorContentX, cy - 1.1);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.6);
        doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
        doc.text(blk.lines, authorContentX + 3.8, cy);
        cy += blk.lines.length * 4.0 + 1.4;
      });
    }

    currentY += coBlockH + 4.5;
  } else {
    // Multi-page co-author / affiliation list: paginate cleanly line-by-line
    if (currentY + 36 > FOOTER_TOP_Y) {
      currentY = addConferenceContinuationPage(doc, 'Abstract Submission Acknowledgement', absIdDisplay);
    }

    doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
    doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
    doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, 8.5, 2.0, 2.0, 'FD');
    drawIconUsers(doc, MARGIN_X + 7.5, currentY + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text('Co-authors (in submitted order)', MARGIN_X + 15, currentY + 5.6);
    currentY += 12.5;

    const fullContentW = CONTENT_WIDTH - 10;
    const namesH = measureAndDrawCoAuthorsWithSuperscripts(
      doc,
      coAuthorData.tokens,
      MARGIN_X + 5,
      currentY,
      fullContentW,
      true
    );
    if (currentY + namesH > FOOTER_TOP_Y - 6) {
      currentY = addConferenceContinuationPage(doc, 'Abstract Submission Acknowledgement', absIdDisplay);
    }
    measureAndDrawCoAuthorsWithSuperscripts(
      doc,
      coAuthorData.tokens,
      MARGIN_X + 5,
      currentY,
      fullContentW,
      false
    );
    currentY += namesH + 3.0;

    for (const aff of coAuthorData.affiliations) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      const lines = doc.splitTextToSize(aff.text, fullContentW - 6);
      const needed = lines.length * 4.0 + 2.0;
      if (currentY + needed > FOOTER_TOP_Y - 4) {
        currentY = addConferenceContinuationPage(doc, 'Abstract Submission Acknowledgement', absIdDisplay);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
      doc.text(String(aff.index), MARGIN_X + 5, currentY - 1.1);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
      doc.text(lines, MARGIN_X + 9, currentY);
      currentY += needed;
    }
    currentY += 3.0;
  }

  // --------------------------------------------------------------------------
  // MANDATORY DISCLAIMER BOX
  // --------------------------------------------------------------------------
  const disclaimerText =
    'This acknowledgement confirms receipt of the abstract submission only. It does not constitute acceptance of the abstract. All submissions are subject to scientific review.';
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9.2);
  const discLines = doc.splitTextToSize(disclaimerText, CONTENT_WIDTH - 24);
  const discH = Math.max(14.5, discLines.length * 4.5 + 5.5);

  if (currentY + discH + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    currentY = addConferenceContinuationPage(doc, 'Abstract Submission Acknowledgement', absIdDisplay);
  }

  doc.setFillColor(COLORS.disclaimerFill[0], COLORS.disclaimerFill[1], COLORS.disclaimerFill[2]);
  doc.setDrawColor(COLORS.disclaimerBorder[0], COLORS.disclaimerBorder[1], COLORS.disclaimerBorder[2]);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, discH, 2.5, 2.5, 'FD');
  drawIconInfoCircle(doc, MARGIN_X + 10.5, currentY + discH / 2, 3.2);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9.2);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(discLines, MARGIN_X + 18, currentY + 5.8);

  currentY += discH + 6;

  // --------------------------------------------------------------------------
  // SIGNATURES & FOOTER
  // --------------------------------------------------------------------------
  const sigY = Math.max(currentY, 232);
  if (sigY + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    const contY = addConferenceContinuationPage(doc, 'Abstract Submission Acknowledgement', absIdDisplay);
    drawSignatureBlock(doc, contY + 6);
  } else {
    drawSignatureBlock(doc, sigY);
  }

  drawFooterOnAllPages(doc, 'Abstract Submission Acknowledgement', generatedOn);

  return {
    doc,
    filename: `${absIdDisplay || 'SRMCON2027'}_Abstract_Submission_Acknowledgement.pdf`,
  };
}

// ============================================================================
// PDF 3: ABSTRACT ACCEPTANCE LETTER (Accepted Status ONLY)
// ============================================================================
export function assertAbstractAcceptanceEligible(abstract: AbstractRecord): void {
  if (abstract.status !== 'Accepted') {
    throw new Error(
      `Abstract Acceptance Letter PDF cannot be generated because abstract ${abstract.id} has status "${abstract.status || 'Unknown'}" instead of "Accepted".`
    );
  }
}

interface RichSpan {
  text: string;
  bold: boolean;
}

/**
 * Renders word-wrapped mixed normal + bold spans cleanly across multiple lines without overlaps.
 */
function renderWrappedRichParagraph(
  doc: jsPDF,
  spans: RichSpan[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number
): number {
  // Group contiguous non-whitespace segments across spans so punctuation attached to a span boundary
  // (like “ + BoldTitle + ”,) wraps together cleanly without awkward orphaned quotes/spaces.
  const segments: Array<Array<{ text: string; bold: boolean }>> = [];
  let currentGroup: Array<{ text: string; bold: boolean }> = [];

  for (const span of spans) {
    const cleaned = sanitizePdfText(span.text);
    const parts = cleaned.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        if (currentGroup.length > 0) {
          segments.push(currentGroup);
          currentGroup = [];
        }
      } else {
        currentGroup.push({ text: part, bold: span.bold });
      }
    }
  }
  if (currentGroup.length > 0) {
    segments.push(currentGroup);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  const spaceW = doc.getTextWidth(' ');

  let cursorX = x;
  let cursorY = y;

  for (const group of segments) {
    let groupW = 0;
    for (const piece of group) {
      doc.setFont('helvetica', piece.bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      groupW += doc.getTextWidth(piece.text);
    }

    const needSpace = cursorX > x ? spaceW : 0;
    if (cursorX > x && cursorX + needSpace + groupW > x + maxWidth) {
      cursorX = x;
      cursorY += lineHeight;
    } else if (cursorX > x) {
      cursorX += spaceW;
    }

    // Handle an unusually long unbroken token cleanly
    if (cursorX === x && groupW > maxWidth && group.length === 1) {
      const piece = group[0];
      doc.setFont('helvetica', piece.bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      const chunks = doc.splitTextToSize(piece.text, maxWidth);
      chunks.forEach((chunk: string, idx: number) => {
        if (idx > 0) {
          cursorX = x;
          cursorY += lineHeight;
        }
        doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
        doc.text(chunk, cursorX, cursorY);
        cursorX += doc.getTextWidth(chunk);
      });
      continue;
    }

    for (const piece of group) {
      doc.setFont('helvetica', piece.bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
      doc.text(piece.text, cursorX, cursorY);
      cursorX += doc.getTextWidth(piece.text);
    }
  }

  return cursorY - y + lineHeight;
}

export function buildAbstractAcceptanceLetterPDFDoc(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): { doc: jsPDF; filename: string } {
  assertAbstractAcceptanceEligible(abstract);

  const doc = createConferenceA4Doc();

  const absIdDisplay = sanitizePdfText((abstract.id || '').trim());
  const generatedOn = formatDateTime();
  let currentY = drawCommonPageOneHeader(doc, 'ABSTRACT ACCEPTANCE LETTER');

  // --------------------------------------------------------------------------
  // ISSUE DATE ROW (Strictly NO Document Reference Number on Left!)
  // --------------------------------------------------------------------------
  const issueDate =
    formatDateOnly(abstract.reviewedAt) ||
    formatDateOnly(abstract.updatedAt) ||
    formatDateOnly(new Date().toISOString()) ||
    '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(`Date: ${issueDate}`, PAGE_WIDTH - MARGIN_X, currentY + 2, { align: 'right' });

  // --------------------------------------------------------------------------
  // RECIPIENT BLOCK ("To")
  // --------------------------------------------------------------------------
  const pa = abstract.presentingAuthor || {};
  const authorName = sanitizePdfText(
    pa.fullName || pa.name || registration?.fullName || 'Presenting Author'
  );
  const paDept = sanitizePdfText((pa as Record<string, unknown>).department as string | undefined);
  const authorInst = sanitizePdfText(
    pa.affiliation || pa.institution || registration?.institution || ''
  );
  const locationParts = [registration?.city, registration?.country]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => sanitizePdfText(s.trim()));
  const locationStr = locationParts.join(', ');

  currentY += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.6);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('To', MARGIN_X, currentY);
  currentY += 4.6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text(authorName, MARGIN_X, currentY);
  currentY += 4.6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.3);
  doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);

  if (paDept && !authorInst.toLowerCase().includes(paDept.toLowerCase())) {
    const deptLines = doc.splitTextToSize(paDept, 125);
    doc.text(deptLines, MARGIN_X, currentY);
    currentY += deptLines.length * 4.3;
  }

  if (authorInst) {
    const instLines = doc.splitTextToSize(authorInst, 125);
    doc.text(instLines, MARGIN_X, currentY);
    currentY += instLines.length * 4.3;
  }

  if (locationStr) {
    const instLower = authorInst.toLowerCase();
    const missingParts = locationParts.filter((p) => !instLower.includes(p.toLowerCase()));
    if (missingParts.length > 0 && !instLower.includes('india')) {
      doc.text(locationStr, MARGIN_X, currentY);
      currentY += 4.3;
    }
  }

  currentY += 2.5;

  // --------------------------------------------------------------------------
  // SUBJECT BANNER BAR
  // --------------------------------------------------------------------------
  doc.setFillColor(COLORS.lavenderTag[0], COLORS.lavenderTag[1], COLORS.lavenderTag[2]);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, 8.2, 2.0, 2.0, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('Subject: Acceptance of Abstract – SRMCON 2027', MARGIN_X + 4.5, currentY + 5.5);

  currentY += 13.0;

  // --------------------------------------------------------------------------
  // FORMAL SALUTATION & ACCEPTANCE BODY PARAGRAPH
  // --------------------------------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.6);
  doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
  doc.text(`Dear ${authorName},`, MARGIN_X, currentY);
  currentY += 5.8;

  const cleanTitle = sanitizePdfText(abstract.title || 'Untitled Abstract');
  const paragraphHeight = renderWrappedRichParagraph(
    doc,
    [
      { text: 'We are pleased to inform you that your abstract titled “', bold: false },
      { text: cleanTitle, bold: true },
      { text: '”, submitted for SRMCON 2027, has been ', bold: false },
      { text: 'accepted', bold: true },
      { text: ' for presentation at the International Conference on ', bold: false },
      { text: 'AI-Powered Innovations in Drug Discovery and Development', bold: true },
      {
        text: ', scheduled for 15–16 February 2027 at SRM Institute of Science and Technology, Kattankulathur.',
        bold: false,
      },
    ],
    MARGIN_X,
    currentY,
    CONTENT_WIDTH,
    4.7,
    9.5
  );

  currentY += paragraphHeight + 3.0;

  // --------------------------------------------------------------------------
  // ABSTRACT INFORMATION CARD
  // --------------------------------------------------------------------------
  const resolvedTrack = resolveScientificTrackDisplay(abstract.trackId);
  const trackText = resolvedTrack.primary;
  const allottedFormat = resolveOfficialAllottedFormat(abstract);
  const formatCategory = classifyAllottedPresentationFormat(abstract);

  const infoIconColW = 24;
  const infoValueX = MARGIN_X + infoIconColW + 52;
  const infoColonX = infoValueX - 4;
  const infoLabelX = MARGIN_X + infoIconColW + 5;
  const infoMaxW = MARGIN_X + CONTENT_WIDTH - infoValueX - 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  const absTitleLines = doc.splitTextToSize(cleanTitle, infoMaxW);
  const trackLines = doc.splitTextToSize(trackText, infoMaxW);

  const infoRows: Array<{
    label: string;
    lines: string[];
    isFormatPill?: boolean;
    isAcceptedBadge?: boolean;
    height: number;
  }> = [
    { label: 'Abstract ID', lines: [absIdDisplay], height: 6.2 },
    {
      label: 'Abstract Title',
      lines: absTitleLines,
      height: Math.max(absTitleLines.length * 4.3 + 1.8, 6.2),
    },
    {
      label: 'Scientific Track',
      lines: trackLines,
      height: Math.max(trackLines.length * 4.3 + 1.8, 6.2),
    },
    {
      label: 'Acceptance Status',
      lines: ['Accepted'],
      isAcceptedBadge: true,
      height: 6.8,
    },
  ];

  if (allottedFormat) {
    infoRows.push({
      label: 'Presentation Format',
      lines: [sanitizePdfText(allottedFormat)],
      isFormatPill: true,
      height: 8.2,
    });
  }

  const infoBodyH = infoRows.reduce((s, r) => s + r.height, 0);
  const infoCardH = Math.max(26, infoBodyH + 7.5);

  if (currentY + infoCardH > FOOTER_TOP_Y - 6) {
    currentY = addConferenceContinuationPage(doc, 'Abstract Acceptance Letter', absIdDisplay);
  }

  doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, infoCardH, 2.8, 2.8, 'FD');

  doc.setFillColor(COLORS.iconColumn[0], COLORS.iconColumn[1], COLORS.iconColumn[2]);
  doc.roundedRect(MARGIN_X, currentY, infoIconColW, infoCardH, 2.8, 2.8, 'F');
  doc.rect(MARGIN_X + infoIconColW - 2.8, currentY, 2.8, infoCardH, 'F');
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.line(MARGIN_X + infoIconColW, currentY, MARGIN_X + infoIconColW, currentY + infoCardH);

  drawIconDocLines(doc, MARGIN_X + infoIconColW / 2, currentY + infoCardH / 2);

  let iry = currentY + 6.5;
  for (const r of infoRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(r.label, infoLabelX, iry);
    doc.text(':', infoColonX, iry);

    if (r.isAcceptedBadge) {
      doc.setFillColor(COLORS.mintFill[0], COLORS.mintFill[1], COLORS.mintFill[2]);
      doc.setDrawColor(COLORS.mintBorder[0], COLORS.mintBorder[1], COLORS.mintBorder[2]);
      doc.roundedRect(infoValueX, iry - 4.0, 26, 5.6, 1.4, 1.4, 'FD');
      drawIconCheckCircle(doc, infoValueX + 3.6, iry - 1.2, 1.8, true);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.7);
      doc.setTextColor(COLORS.mintText[0], COLORS.mintText[1], COLORS.mintText[2]);
      doc.text('Accepted', infoValueX + 7.2, iry - 0.1);
    } else if (r.isFormatPill) {
      const fmtText = r.lines[0];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      const pillW = Math.min(infoMaxW, doc.getTextWidth(fmtText) + 14);
      doc.setFillColor(COLORS.lavenderTag[0], COLORS.lavenderTag[1], COLORS.lavenderTag[2]);
      doc.setDrawColor(196, 181, 253);
      doc.roundedRect(infoValueX, iry - 4.4, pillW, 6.8, 1.8, 1.8, 'FD');

      if (formatCategory === 'oral') {
        drawIconMic(doc, infoValueX + 5.2, iry - 1.0);
      } else if (formatCategory === 'eposter') {
        drawIconMonitor(doc, infoValueX + 5.2, iry - 1.0);
      } else {
        drawIconPosterBoard(doc, infoValueX + 5.2, iry - 1.0);
      }

      doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
      doc.text(fmtText, infoValueX + 9.5, iry + 0.1);
    } else {
      doc.setFont('helvetica', r.label === 'Abstract ID' ? 'bold' : 'normal');
      doc.setFontSize(9.2);
      doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
      doc.text(r.lines, infoValueX, iry);
    }

    iry += r.height;
  }

  currentY += infoCardH + 4.5;

  // --------------------------------------------------------------------------
  // NEXT STEPS / INSTRUCTIONS CARD
  // --------------------------------------------------------------------------
  const formatGuidancePhrase = allottedFormat
    ? `Detailed ${sanitizePdfText(allottedFormat).toLowerCase()} guidelines and the conference session schedule will be shared in due course.`
    : 'Detailed presentation guidelines and the conference session schedule will be shared in due course.';

  const bullets = [
    'Please ensure that at least one of the authors is duly registered for the conference.',
    formatGuidancePhrase,
    `For any queries, contact the SRMCON 2027 Secretariat at ${SECRETARIAT_EMAIL}.`,
  ];

  const instrTextX = MARGIN_X + infoIconColW + 9;
  const instrMaxW = MARGIN_X + CONTENT_WIDTH - instrTextX - 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.0);
  const bulletWrapped = bullets.map((b) => doc.splitTextToSize(b, instrMaxW));
  const bulletsH = bulletWrapped.reduce((s, lines) => s + lines.length * 4.3 + 1.5, 0);
  const instrCardH = Math.max(24, 10.5 + bulletsH + 3.0);

  if (currentY + instrCardH + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    currentY = addConferenceContinuationPage(doc, 'Abstract Acceptance Letter', absIdDisplay);
  }

  doc.setFillColor(COLORS.cardFillAlt[0], COLORS.cardFillAlt[1], COLORS.cardFillAlt[2]);
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.roundedRect(MARGIN_X, currentY, CONTENT_WIDTH, instrCardH, 2.8, 2.8, 'FD');

  doc.setFillColor(COLORS.iconColumn[0], COLORS.iconColumn[1], COLORS.iconColumn[2]);
  doc.roundedRect(MARGIN_X, currentY, infoIconColW, instrCardH, 2.8, 2.8, 'F');
  doc.rect(MARGIN_X + infoIconColW - 2.8, currentY, 2.8, instrCardH, 'F');
  doc.setDrawColor(COLORS.cardBorder[0], COLORS.cardBorder[1], COLORS.cardBorder[2]);
  doc.line(MARGIN_X + infoIconColW, currentY, MARGIN_X + infoIconColW, currentY + instrCardH);

  drawIconClipboardCheck(doc, MARGIN_X + infoIconColW / 2, currentY + instrCardH / 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('Next Steps / Instructions', MARGIN_X + infoIconColW + 5, currentY + 7.0);

  let by = currentY + 12.2;
  bulletWrapped.forEach((lines) => {
    doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.circle(MARGIN_X + infoIconColW + 6.2, by - 1.1, 0.72, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.0);
    doc.setTextColor(COLORS.slateDark[0], COLORS.slateDark[1], COLORS.slateDark[2]);
    doc.text(lines, instrTextX, by);
    by += lines.length * 4.3 + 1.5;
  });

  currentY += instrCardH + 5;

  // --------------------------------------------------------------------------
  // SIGNATURES & FOOTER
  // --------------------------------------------------------------------------
  const sigY = Math.max(currentY, 232);
  if (sigY + SIGNATURE_HEIGHT > FOOTER_TOP_Y) {
    const contY = addConferenceContinuationPage(doc, 'Abstract Acceptance Letter', absIdDisplay);
    drawSignatureBlock(doc, contY + 6);
  } else {
    drawSignatureBlock(doc, sigY);
  }

  drawFooterOnAllPages(doc, 'Abstract Acceptance Letter', generatedOn);

  return {
    doc,
    filename: `Acceptance_Letter_${absIdDisplay || 'SRMCON2027'}.pdf`,
  };
}

// ============================================================================
// PUBLIC EXPORTED HELPERS (Download, Base64 Email Attachment, Preview Blob URL)
// ============================================================================
function extractBase64FromDoc(doc: jsPDF): string {
  const dataUri = doc.output('datauristring');
  const commaIdx = dataUri.indexOf(',');
  return commaIdx >= 0 ? dataUri.slice(commaIdx + 1).replace(/\s+/g, '') : dataUri.replace(/\s+/g, '');
}

function assertValidPdfBase64Signature(base64: string, filename: string): void {
  if (!base64 || base64.length < 32) {
    throw new Error(`Generated PDF "${filename}" produced an empty or truncated Base64 payload.`);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error(`Generated PDF "${filename}" is not valid Base64.`);
  }
  // Base64 of "%PDF-" starts with "JVBERi"
  if (!base64.startsWith('JVBERi')) {
    throw new Error(`Generated PDF "${filename}" does not start with a valid %PDF- header.`);
  }
}

function estimateBase64DecodedByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function buildValidatedPdfAttachmentOutput(
  doc: jsPDF,
  filename: string
): PdfAttachmentOutput {
  const base64 = extractBase64FromDoc(doc);
  assertValidPdfBase64Signature(base64, filename);
  const decodedBytes = estimateBase64DecodedByteLength(base64);
  console.info(
    `[pdfDocuments][Stage 1] PDF generated: hasAttachment=true, filename=${filename}, mimeType=application/pdf, base64Length=${base64.length}, decodedBytes=${decodedBytes}, attachmentCount=1`
  );
  return {
    filename,
    mimeType: 'application/pdf',
    base64,
  };
}

function createBlobUrlFromDoc(doc: jsPDF): string {
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

export function generateRegistrationSubmissionReceiptPDF(reg: RegistrationRecord): void {
  const { doc, filename } = buildRegistrationSubmissionReceiptPDFDoc(reg);
  doc.save(filename);
}

export function createRegistrationSubmissionReceiptPreviewUrl(reg: RegistrationRecord): {
  url: string;
  filename: string;
} {
  const { doc, filename } = buildRegistrationSubmissionReceiptPDFDoc(reg);
  return {
    url: createBlobUrlFromDoc(doc),
    filename,
  };
}

export function generateRegistrationConfirmationPDF(reg: RegistrationRecord): void {
  const { doc, filename } = buildRegistrationConfirmationPDFDoc(reg);
  doc.save(filename);
}

export function generateRegistrationConfirmationPDFBase64(
  reg: RegistrationRecord
): PdfAttachmentOutput {
  const { doc, filename } = buildRegistrationConfirmationPDFDoc(reg);
  return buildValidatedPdfAttachmentOutput(doc, filename);
}

export function createRegistrationConfirmationPreviewUrl(reg: RegistrationRecord): {
  url: string;
  filename: string;
} {
  const { doc, filename } = buildRegistrationConfirmationPDFDoc(reg);
  return {
    url: createBlobUrlFromDoc(doc),
    filename,
  };
}

export function generateAbstractSubmissionAckPDF(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): void {
  const { doc, filename } = buildAbstractSubmissionAckPDFDoc(abstract, registration);
  doc.save(filename);
}

export function generateAbstractSubmissionAckPDFBase64(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): PdfAttachmentOutput {
  const { doc, filename } = buildAbstractSubmissionAckPDFDoc(abstract, registration);
  return buildValidatedPdfAttachmentOutput(doc, filename);
}

export function createAbstractSubmissionAckPreviewUrl(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): { url: string; filename: string } {
  const { doc, filename } = buildAbstractSubmissionAckPDFDoc(abstract, registration);
  return {
    url: createBlobUrlFromDoc(doc),
    filename,
  };
}

export function generateAbstractAcceptanceLetterPDF(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): void {
  const { doc, filename } = buildAbstractAcceptanceLetterPDFDoc(abstract, registration);
  doc.save(filename);
}

export function generateAbstractAcceptanceLetterPDFBase64(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): PdfAttachmentOutput {
  const { doc, filename } = buildAbstractAcceptanceLetterPDFDoc(abstract, registration);
  return buildValidatedPdfAttachmentOutput(doc, filename);
}

export function createAbstractAcceptanceLetterPreviewUrl(
  abstract: AbstractRecord,
  registration?: RegistrationRecord
): { url: string; filename: string } {
  const { doc, filename } = buildAbstractAcceptanceLetterPDFDoc(abstract, registration);
  return {
    url: createBlobUrlFromDoc(doc),
    filename,
  };
}
