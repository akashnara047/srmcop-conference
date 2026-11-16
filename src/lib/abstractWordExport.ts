import {
  AlignmentType,
  Document,
  Header,
  Packer,
  PageOrientation,
  Paragraph,
  SectionType,
  TextRun,
  convertInchesToTwip,
  type ISectionOptions,
} from 'docx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { AbstractRecord, RegistrationRecord } from './managementService';
import {
  type InstitutionFilterValue,
  formatInstitutionCategoryLabel,
  getLinkedRegistrationForAbstractRecord,
  normalizeInstitutionCategory,
} from './presentationDashboardStats';

export const ABSTRACT_WORD_FILENAME = 'SRM_Conference_2027_All_Abstracts.docx';

// Exact A4 dimensions in twips (210mm x 297mm = 8.2677in x 11.6929in)
const A4_WIDTH_TWIPS = 11906;
const A4_HEIGHT_TWIPS = 16838;
const A4_WIDTH_INCHES = 8.268;
const A4_HEIGHT_INCHES = 11.693;

const FONT_FAMILY = 'Times New Roman';

export interface FormattedAuthorEntry {
  displayName: string;
  affiliationNumber: number | null;
  isCorresponding: boolean;
}

export interface NormalizedAbstractForWord {
  id: string;
  institutionCategoryLabel?: string;
  title: string;
  authors: FormattedAuthorEntry[];
  affiliations: Array<{ index: number; text: string }>;
  hasMultipleAffiliations: boolean;
  bodyParagraphs: string[];
  keywordsText: string;
}

export interface LayoutTier {
  name: string;
  marginTopIn: number;
  marginBottomIn: number;
  marginLeftIn: number;
  marginRightIn: number;
  headerMarginIn: number;
  titleSizePt: number;
  authorSizePt: number;
  affiliationSizePt: number;
  bodyHeadingSizePt: number;
  bodySizePt: number;
  keywordsSizePt: number;
  titleLineRatio: number;
  metaLineRatio: number;
  bodyLineRatio: number;
  titleAfterTwips: number;
  authorsAfterTwips: number;
  affiliationLineAfterTwips: number;
  affiliationsBlockAfterTwips: number;
  headingBeforeTwips: number;
  headingAfterTwips: number;
  bodyParaAfterTwips: number;
  keywordsBeforeTwips: number;
}

const LAYOUT_TIERS: LayoutTier[] = [
  {
    name: 'standard',
    marginTopIn: 0.72,
    marginBottomIn: 0.7,
    marginLeftIn: 0.72,
    marginRightIn: 0.72,
    headerMarginIn: 0.35,
    titleSizePt: 14,
    authorSizePt: 12,
    affiliationSizePt: 11.5,
    bodyHeadingSizePt: 12,
    bodySizePt: 12,
    keywordsSizePt: 11.5,
    titleLineRatio: 1.15,
    metaLineRatio: 1.15,
    bodyLineRatio: 1.18,
    titleAfterTwips: 160,
    authorsAfterTwips: 100,
    affiliationLineAfterTwips: 30,
    affiliationsBlockAfterTwips: 180,
    headingBeforeTwips: 40,
    headingAfterTwips: 80,
    bodyParaAfterTwips: 100,
    keywordsBeforeTwips: 140,
  },
  {
    name: 'compact-spacing',
    marginTopIn: 0.65,
    marginBottomIn: 0.65,
    marginLeftIn: 0.68,
    marginRightIn: 0.68,
    headerMarginIn: 0.3,
    titleSizePt: 14,
    authorSizePt: 12,
    affiliationSizePt: 11,
    bodyHeadingSizePt: 12,
    bodySizePt: 12,
    keywordsSizePt: 11,
    titleLineRatio: 1.12,
    metaLineRatio: 1.1,
    bodyLineRatio: 1.15,
    titleAfterTwips: 110,
    authorsAfterTwips: 70,
    affiliationLineAfterTwips: 20,
    affiliationsBlockAfterTwips: 120,
    headingBeforeTwips: 20,
    headingAfterTwips: 60,
    bodyParaAfterTwips: 70,
    keywordsBeforeTwips: 100,
  },
  {
    name: 'tight-fit',
    marginTopIn: 0.6,
    marginBottomIn: 0.6,
    marginLeftIn: 0.65,
    marginRightIn: 0.65,
    headerMarginIn: 0.28,
    titleSizePt: 14,
    authorSizePt: 12,
    affiliationSizePt: 11,
    bodyHeadingSizePt: 12,
    bodySizePt: 12,
    keywordsSizePt: 11,
    titleLineRatio: 1.08,
    metaLineRatio: 1.06,
    bodyLineRatio: 1.08,
    titleAfterTwips: 80,
    authorsAfterTwips: 50,
    affiliationLineAfterTwips: 10,
    affiliationsBlockAfterTwips: 80,
    headingBeforeTwips: 10,
    headingAfterTwips: 40,
    bodyParaAfterTwips: 50,
    keywordsBeforeTwips: 70,
  },
  {
    name: 'max-single-page',
    marginTopIn: 0.55,
    marginBottomIn: 0.55,
    marginLeftIn: 0.62,
    marginRightIn: 0.62,
    headerMarginIn: 0.25,
    titleSizePt: 14,
    authorSizePt: 12,
    affiliationSizePt: 11,
    bodyHeadingSizePt: 12,
    bodySizePt: 12,
    keywordsSizePt: 11,
    titleLineRatio: 1.04,
    metaLineRatio: 1.02,
    bodyLineRatio: 1.0,
    titleAfterTwips: 60,
    authorsAfterTwips: 36,
    affiliationLineAfterTwips: 0,
    affiliationsBlockAfterTwips: 60,
    headingBeforeTwips: 0,
    headingAfterTwips: 30,
    bodyParaAfterTwips: 36,
    keywordsBeforeTwips: 50,
  },
];

/**
 * Natural numeric comparator for Abstract IDs (e.g. AICONDD-ABS-001 < AICONDD-ABS-002 < AICONDD-ABS-010).
 */
export function compareAbstractIdsNaturally(aId: string, bId: string): number {
  const cleanA = (aId || '').trim();
  const cleanB = (bId || '').trim();

  const matchA = cleanA.match(/^(.*?)(\d+)$/);
  const matchB = cleanB.match(/^(.*?)(\d+)$/);

  if (matchA && matchB) {
    const prefixCmp = matchA[1].localeCompare(matchB[1], undefined, {
      sensitivity: 'base',
    });
    if (prefixCmp !== 0) return prefixCmp;
    const numA = Number.parseInt(matchA[2], 10);
    const numB = Number.parseInt(matchB[2], 10);
    if (numA !== numB) return numA - numB;
  }

  return cleanA.localeCompare(cleanB, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Deduplicate and naturally sort abstract records ascending by Abstract ID.
 */
export function prepareOrderedAbstracts(records: AbstractRecord[]): AbstractRecord[] {
  const seen = new Map<string, AbstractRecord>();
  for (const rec of records) {
    const id = (rec.id || '').trim();
    if (!id) continue;
    if (!seen.has(id)) {
      seen.set(id, { ...rec, id });
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    compareAbstractIdsNaturally(a.id, b.id)
  );
}

/**
 * Extract clean verbatim abstract body paragraphs without truncating or rewriting content.
 */
export function extractAbstractBodyParagraphs(
  abstractContent: AbstractRecord['abstractContent']
): string[] {
  let rawText = '';

  if (typeof abstractContent === 'string') {
    rawText = abstractContent;
  } else if (abstractContent && typeof abstractContent === 'object') {
    if (typeof abstractContent.text === 'string' && abstractContent.text.trim()) {
      rawText = abstractContent.text;
    } else {
      const structuredParts: Array<[string, string | undefined]> = [
        ['Background', abstractContent.background],
        ['Objective', abstractContent.objective],
        ['Methodology', abstractContent.methodology],
        ['Results', abstractContent.results],
        ['Conclusion', abstractContent.conclusion],
      ];
      const lines = structuredParts
        .filter(([, val]) => typeof val === 'string' && val.trim().length > 0)
        .map(([label, val]) => `${label}: ${val!.trim()}`);
      rawText = lines.join('\n');
    }
  }

  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return ['Abstract content not provided.'];
  }

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Normalize authors and affiliations while preserving submitted order,
 * corresponding author (*) designation, and author-to-affiliation mapping.
 */
export function normalizeAbstractForWord(
  abs: AbstractRecord,
  registrations?: RegistrationRecord[]
): NormalizedAbstractForWord {
  const linkedReg = registrations
    ? getLinkedRegistrationForAbstractRecord(abs, registrations)
    : undefined;
  const institutionCategoryLabel = linkedReg
    ? formatInstitutionCategoryLabel(linkedReg.institutionCategory)
    : undefined;
  const presObj = (abs.presentingAuthor || {}) as AbstractRecord['presentingAuthor'] & {
    isCorresponding?: boolean;
  };
  const presRawName = (presObj.fullName || presObj.name || '').trim();
  const presRawAff = (presObj.affiliation || presObj.institution || '').trim();

  const rawAuthors: Array<{
    rawName: string;
    rawAff: string;
    explicitCorrespondingFlag: boolean;
    isPresenting: boolean;
  }> = [];

  if (presRawName) {
    rawAuthors.push({
      rawName: presRawName,
      rawAff: presRawAff,
      explicitCorrespondingFlag: Boolean(presObj.isCorresponding),
      isPresenting: true,
    });
  }

  if (Array.isArray(abs.coAuthors)) {
    for (const co of abs.coAuthors) {
      const coName = (co?.name || '').trim();
      if (!coName) continue;
      const coAff = (co?.affiliation || '').trim() || presRawAff;
      const coFlag = Boolean((co as { isCorresponding?: boolean })?.isCorresponding);
      rawAuthors.push({
        rawName: coName,
        rawAff: coAff,
        explicitCorrespondingFlag: coFlag,
        isPresenting: false,
      });
    }
  }

  const anyExplicitCorresponding = rawAuthors.some(
    (a) => a.explicitCorrespondingFlag || a.rawName.includes('*')
  );

  // Build deduplicated ordered list of affiliations preserving first-seen casing
  const affiliationMap = new Map<string, { index: number; text: string }>();
  for (const a of rawAuthors) {
    const affTrimmed = a.rawAff.trim();
    if (!affTrimmed) continue;
    const key = affTrimmed.toLowerCase().replace(/\s+/g, ' ');
    if (!affiliationMap.has(key)) {
      affiliationMap.set(key, {
        index: affiliationMap.size + 1,
        text: affTrimmed,
      });
    }
  }

  const affiliations = Array.from(affiliationMap.values());
  const hasMultipleAffiliations = affiliations.length > 1;

  const authors: FormattedAuthorEntry[] = rawAuthors.map((a) => {
    const hasAsterisk = a.rawName.includes('*');
    const cleanName = a.rawName.replace(/\s*\*+\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const key = a.rawAff.trim().toLowerCase().replace(/\s+/g, ' ');
    const matchedAff = key ? affiliationMap.get(key) : undefined;

    const isCorresponding = anyExplicitCorresponding
      ? hasAsterisk || a.explicitCorrespondingFlag
      : a.isPresenting;

    return {
      displayName: cleanName,
      affiliationNumber: matchedAff ? matchedAff.index : null,
      isCorresponding,
    };
  });

  // Preserve submitted keywords in exact order
  const rawKeywords = Array.isArray(abs.keywords)
    ? abs.keywords
        .map((k) => String(k || '').trim())
        .filter((k) => k.length > 0)
    : typeof abs.keywords === 'string'
    ? String(abs.keywords)
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    : [];

  return {
    id: abs.id,
    institutionCategoryLabel,
    title: (abs.title || 'Untitled Abstract').trim(),
    authors,
    affiliations,
    hasMultipleAffiliations,
    bodyParagraphs: extractAbstractBodyParagraphs(abs.abstractContent),
    keywordsText: rawKeywords.join(', '),
  };
}

/**
 * Parse inline <sup>...</sup> or <sub>...</sub> scientific markup into native Word TextRuns.
 */
function buildScientificTextRuns(
  text: string,
  options: {
    sizeHalfPoints: number;
    bold?: boolean;
    color?: string;
  }
): TextRun[] {
  const tagRegex = /<(sup|sub)>(.*?)<\/\1>/gi;
  const runs: TextRun[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          font: FONT_FAMILY,
          size: options.sizeHalfPoints,
          bold: options.bold,
          color: options.color,
        })
      );
    }

    const tag = match[1].toLowerCase();
    const inner = match[2];
    if (inner) {
      runs.push(
        new TextRun({
          text: inner,
          font: FONT_FAMILY,
          size: options.sizeHalfPoints,
          bold: options.bold,
          color: options.color,
          superScript: tag === 'sup',
          subScript: tag === 'sub',
        })
      );
    }
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < text.length || runs.length === 0) {
    runs.push(
      new TextRun({
        text: text.slice(lastIndex),
        font: FONT_FAMILY,
        size: options.sizeHalfPoints,
        bold: options.bold,
        color: options.color,
      })
    );
  }

  return runs;
}

/**
 * Estimate wrapped line count for a paragraph in Times New Roman.
 */
function estimateWrappedLineCount(
  text: string,
  usableWidthPt: number,
  fontSizePt: number,
  isBold = false
): number {
  const plain = text.replace(/<\/?(sup|sub)>/gi, '').trim();
  if (!plain) return 0;

  // Average character width factor for Times New Roman (~0.48em normal, ~0.51em bold)
  const avgCharWidthPt = fontSizePt * (isBold ? 0.51 : 0.48);
  const maxCharsPerLine = Math.max(20, Math.floor(usableWidthPt / avgCharWidthPt));

  const words = plain.split(/\s+/);
  let lines = 1;
  let currentLineLen = 0;

  for (const word of words) {
    const wordLen = word.length;
    if (currentLineLen === 0) {
      currentLineLen = wordLen;
    } else if (currentLineLen + 1 + wordLen <= maxCharsPerLine) {
      currentLineLen += 1 + wordLen;
    } else {
      lines += 1;
      currentLineLen = wordLen;
    }

    // Handle extraordinarily long uninterrupted tokens (e.g. IUPAC names)
    while (currentLineLen > maxCharsPerLine) {
      lines += 1;
      currentLineLen -= maxCharsPerLine;
    }
  }

  return lines;
}

/**
 * Estimate total vertical height in points for one normalized abstract under a layout tier.
 */
export function estimateAbstractPageHeightPt(
  item: NormalizedAbstractForWord,
  tier: LayoutTier
): number {
  const usableWidthPt =
    (A4_WIDTH_INCHES - tier.marginLeftIn - tier.marginRightIn) * 72;
  const twipToPt = (twips: number) => twips / 20;

  let totalPt = 0;

  // Title
  const titleLines = estimateWrappedLineCount(
    item.title,
    usableWidthPt,
    tier.titleSizePt,
    true
  );
  totalPt +=
    titleLines * tier.titleSizePt * tier.titleLineRatio +
    twipToPt(tier.titleAfterTwips);

  // Authors
  if (item.authors.length > 0) {
    const authorLinePlain = item.authors
      .map((a) => {
        const sup =
          (item.hasMultipleAffiliations && a.affiliationNumber
            ? String(a.affiliationNumber)
            : '') + (a.isCorresponding ? '*' : '');
        return `${a.displayName}${sup}`;
      })
      .join(', ');
    const authorLines = estimateWrappedLineCount(
      authorLinePlain,
      usableWidthPt,
      tier.authorSizePt,
      false
    );
    totalPt +=
      authorLines * tier.authorSizePt * tier.metaLineRatio +
      twipToPt(tier.authorsAfterTwips);
  }

  // Affiliations
  if (item.affiliations.length > 0) {
    for (let i = 0; i < item.affiliations.length; i++) {
      const aff = item.affiliations[i];
      const affStr = item.hasMultipleAffiliations
        ? `${aff.index} ${aff.text}`
        : aff.text;
      const affLines = estimateWrappedLineCount(
        affStr,
        usableWidthPt,
        tier.affiliationSizePt,
        false
      );
      const isLast = i === item.affiliations.length - 1;
      totalPt +=
        affLines * tier.affiliationSizePt * tier.metaLineRatio +
        twipToPt(
          isLast ? tier.affiliationsBlockAfterTwips : tier.affiliationLineAfterTwips
        );
    }
  }

  // ABSTRACT Heading
  totalPt +=
    tier.bodyHeadingSizePt * tier.metaLineRatio +
    twipToPt(tier.headingBeforeTwips + tier.headingAfterTwips);

  // Abstract Body Paragraphs
  for (let i = 0; i < item.bodyParagraphs.length; i++) {
    const para = item.bodyParagraphs[i];
    const bodyLines = estimateWrappedLineCount(
      para,
      usableWidthPt,
      tier.bodySizePt,
      false
    );
    const isLast = i === item.bodyParagraphs.length - 1;
    totalPt +=
      bodyLines * tier.bodySizePt * tier.bodyLineRatio +
      twipToPt(isLast ? 0 : tier.bodyParaAfterTwips);
  }

  // KEYWORDS Section
  if (item.keywordsText) {
    totalPt += twipToPt(tier.keywordsBeforeTwips);
    const kwFull = `KEYWORDS: ${item.keywordsText}`;
    const kwLines = estimateWrappedLineCount(
      kwFull,
      usableWidthPt,
      tier.keywordsSizePt,
      false
    );
    totalPt += kwLines * tier.keywordsSizePt * tier.metaLineRatio;
  }

  // Conservative Word cross-engine line-metric buffer (18 pt)
  return totalPt + 18;
}

/**
 * Select the most comfortable layout tier that fits on a single A4 page.
 * Flags the abstract ID if content still risks overflowing even at maximum safe compaction.
 */
function selectFittingTier(item: NormalizedAbstractForWord): {
  tier: LayoutTier;
  overflowsEstimate: boolean;
} {
  for (const tier of LAYOUT_TIERS) {
    const usableHeightPt =
      (A4_HEIGHT_INCHES - tier.marginTopIn - tier.marginBottomIn) * 72;
    const estPt = estimateAbstractPageHeightPt(item, tier);
    if (estPt <= usableHeightPt) {
      return { tier, overflowsEstimate: false };
    }
  }

  return {
    tier: LAYOUT_TIERS[LAYOUT_TIERS.length - 1],
    overflowsEstimate: true,
  };
}

/**
 * Build one Word Section representing strictly one abstract on one A4 page.
 */
function buildAbstractSection(
  item: NormalizedAbstractForWord,
  tier: LayoutTier,
  isFirstSection: boolean
): ISectionOptions {
  const children: Paragraph[] = [];

  // 1. Title (14 pt, Bold, Centred)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 0,
        after: tier.titleAfterTwips,
        line: Math.round(240 * tier.titleLineRatio),
      },
      children: buildScientificTextRuns(item.title, {
        sizeHalfPoints: tier.titleSizePt * 2,
        bold: true,
        color: '000000',
      }),
    })
  );

  // 2. Author List (12 pt, Centred, exact submitted sequence & corresponding * + superscript mapping)
  if (item.authors.length > 0) {
    const authorRuns: TextRun[] = [];
    item.authors.forEach((author, idx) => {
      if (idx > 0) {
        authorRuns.push(
          new TextRun({
            text: ', ',
            font: FONT_FAMILY,
            size: tier.authorSizePt * 2,
            color: '000000',
          })
        );
      }

      authorRuns.push(
        new TextRun({
          text: author.displayName,
          font: FONT_FAMILY,
          size: tier.authorSizePt * 2,
          color: '000000',
        })
      );

      const supLabel =
        (item.hasMultipleAffiliations && author.affiliationNumber
          ? String(author.affiliationNumber)
          : '') + (author.isCorresponding ? '*' : '');

      if (supLabel) {
        authorRuns.push(
          new TextRun({
            text: supLabel,
            font: FONT_FAMILY,
            size: tier.authorSizePt * 2,
            superScript: true,
            color: '000000',
          })
        );
      }
    });

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: tier.authorsAfterTwips,
          line: Math.round(240 * tier.metaLineRatio),
        },
        children: authorRuns,
      })
    );
  }

  // 3. Affiliations (11-12 pt, Centred, matching author-to-affiliation mapping)
  if (item.affiliations.length > 0) {
    item.affiliations.forEach((aff, idx) => {
      const isLast = idx === item.affiliations.length - 1;
      const runs: TextRun[] = [];
      if (item.hasMultipleAffiliations) {
        runs.push(
          new TextRun({
            text: String(aff.index),
            font: FONT_FAMILY,
            size: tier.affiliationSizePt * 2,
            superScript: true,
            color: '1E293B',
          })
        );
        runs.push(
          new TextRun({
            text: ` ${aff.text}`,
            font: FONT_FAMILY,
            size: tier.affiliationSizePt * 2,
            color: '1E293B',
          })
        );
      } else {
        runs.push(
          new TextRun({
            text: aff.text,
            font: FONT_FAMILY,
            size: tier.affiliationSizePt * 2,
            color: '1E293B',
          })
        );
      }

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 0,
            after: isLast
              ? tier.affiliationsBlockAfterTwips
              : tier.affiliationLineAfterTwips,
            line: Math.round(240 * tier.metaLineRatio),
          },
          children: runs,
        })
      );
    });
  }

  // 4. ABSTRACT Heading (12 pt, Bold, Left)
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      keepNext: true,
      spacing: {
        before: tier.headingBeforeTwips,
        after: tier.headingAfterTwips,
        line: Math.round(240 * tier.metaLineRatio),
      },
      children: [
        new TextRun({
          text: 'ABSTRACT',
          font: FONT_FAMILY,
          size: tier.bodyHeadingSizePt * 2,
          bold: true,
          color: '000000',
        }),
      ],
    })
  );

  // 5. Abstract Body (12 pt, Justified, ~1.15-1.2 line spacing, verbatim)
  item.bodyParagraphs.forEach((paraText, idx) => {
    const isLast = idx === item.bodyParagraphs.length - 1;
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          before: 0,
          after: isLast ? 0 : tier.bodyParaAfterTwips,
          line: Math.round(240 * tier.bodyLineRatio),
        },
        children: buildScientificTextRuns(paraText, {
          sizeHalfPoints: tier.bodySizePt * 2,
          bold: false,
          color: '000000',
        }),
      })
    );
  });

  // 6. KEYWORDS (11-12 pt, Left-aligned, preserving original keyword order)
  if (item.keywordsText) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: {
          before: tier.keywordsBeforeTwips,
          after: 0,
          line: Math.round(240 * tier.metaLineRatio),
        },
        children: [
          new TextRun({
            text: 'KEYWORDS: ',
            font: FONT_FAMILY,
            size: tier.keywordsSizePt * 2,
            bold: true,
            color: '000000',
          }),
          new TextRun({
            text: item.keywordsText,
            font: FONT_FAMILY,
            size: tier.keywordsSizePt * 2,
            bold: false,
            color: '000000',
          }),
        ],
      })
    );
  }

  // Top-right page header displaying Abstract ID and linked Institution Category (9 pt, muted slate)
  const headerLabel = item.institutionCategoryLabel
    ? `${item.id}  |  ${item.institutionCategoryLabel}`
    : item.id;
  const topRightHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: headerLabel,
            font: FONT_FAMILY,
            size: 18, // 9 pt
            color: '475569',
          }),
        ],
      }),
    ],
  });

  return {
    properties: {
      ...(isFirstSection ? {} : { type: SectionType.NEXT_PAGE }),
      page: {
        size: {
          width: A4_WIDTH_TWIPS,
          height: A4_HEIGHT_TWIPS,
          orientation: PageOrientation.PORTRAIT,
        },
        margin: {
          top: convertInchesToTwip(tier.marginTopIn),
          bottom: convertInchesToTwip(tier.marginBottomIn),
          left: convertInchesToTwip(tier.marginLeftIn),
          right: convertInchesToTwip(tier.marginRightIn),
          header: convertInchesToTwip(tier.headerMarginIn),
          footer: convertInchesToTwip(0.35),
        },
      },
    },
    headers: {
      default: topRightHeader,
    },
    children,
  };
}

export interface CompiledWordBookResult {
  document: Document;
  totalAbstracts: number;
  totalPages: number;
  flaggedOverflowIds: string[];
  orderedIds: string[];
}

/**
 * Build an A4 Word Document (.docx) with one abstract per page in natural Abstract ID order,
 * optionally scoped by institutionFilter ('all' | 'internal' | 'external').
 */
export function buildAllAbstractsWordDocument(
  rawRecords: AbstractRecord[],
  registrations?: RegistrationRecord[],
  institutionFilter: InstitutionFilterValue = 'all'
): CompiledWordBookResult {
  let ordered = prepareOrderedAbstracts(rawRecords);

  if (institutionFilter !== 'all') {
    const regList = registrations || [];
    ordered = ordered.filter((abs) => {
      const linkedReg = getLinkedRegistrationForAbstractRecord(abs, regList);
      return normalizeInstitutionCategory(linkedReg?.institutionCategory) === institutionFilter;
    });
  }

  const flaggedOverflowIds: string[] = [];

  const sections: ISectionOptions[] = ordered.map((record, index) => {
    const normalized = normalizeAbstractForWord(record, registrations);
    const { tier, overflowsEstimate } = selectFittingTier(normalized);
    if (overflowsEstimate) {
      flaggedOverflowIds.push(normalized.id);
    }
    return buildAbstractSection(normalized, tier, index === 0);
  });

  const document = new Document({
    creator: 'SRM College of Pharmacy Conference Secretariat',
    title: 'SRM Conference 2027 - Compiled Scientific Abstracts',
    description:
      'Compiled conference abstract proceedings formatted one abstract per A4 page.',
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: 24,
            color: '000000',
          },
        },
      },
    },
    sections,
  });

  return {
    document,
    totalAbstracts: ordered.length,
    totalPages: ordered.length,
    flaggedOverflowIds,
    orderedIds: ordered.map((a) => a.id),
  };
}

export interface WordExportExecutionResult {
  empty: boolean;
  totalAbstracts: number;
  totalPages: number;
  filename: string;
  flaggedOverflowIds: string[];
}

export interface WordExportOptions {
  registrations?: RegistrationRecord[];
  institutionFilter?: InstitutionFilterValue;
}

/**
 * Retrieve submitted abstract records from Firestore (plus linked registrations for
 * institution classification), optionally filter by institution category, compile them
 * into a single .docx workbook (one abstract per A4 page), and trigger browser download.
 */
export async function exportAllAbstractsToWord(
  fallbackRecords: AbstractRecord[] = [],
  filename: string = ABSTRACT_WORD_FILENAME,
  options: WordExportOptions = {}
): Promise<WordExportExecutionResult> {
  const institutionFilter = options.institutionFilter || 'all';

  let allRecords: AbstractRecord[] = [];
  try {
    const snapshot = await getDocs(collection(db, 'abstractSubmissions'));
    allRecords = snapshot.docs.map((d) => ({
      ...(d.data() as AbstractRecord),
      id: d.id,
    }));
  } catch (err) {
    if (fallbackRecords.length > 0) {
      allRecords = fallbackRecords;
    } else {
      throw err;
    }
  }

  let allRegistrations: RegistrationRecord[] = options.registrations || [];
  try {
    const regSnap = await getDocs(collection(db, 'registrations'));
    allRegistrations = regSnap.docs.map((d) => ({
      ...(d.data() as RegistrationRecord),
      id: d.id,
    }));
  } catch {
    // Keep fallback registrations provided by AdminPortal if live fetch fails
  }

  const compiled = buildAllAbstractsWordDocument(
    allRecords,
    allRegistrations,
    institutionFilter
  );

  if (compiled.totalAbstracts === 0) {
    return {
      empty: true,
      totalAbstracts: 0,
      totalPages: 0,
      filename,
      flaggedOverflowIds: [],
    };
  }
  const blob = await Packer.toBlob(compiled.document);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    empty: false,
    totalAbstracts: compiled.totalAbstracts,
    totalPages: compiled.totalPages,
    filename,
    flaggedOverflowIds: compiled.flaggedOverflowIds,
  };
}
