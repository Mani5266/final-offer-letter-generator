'use strict';

const { 
  Paragraph, TextRun, AlignmentType, UnderlineType, PageBreak, BorderStyle 
} = require('docx');
const { C } = require('./constants');

// ─── BORDER HELPERS ──────────────────────────────────────────────────────────

/**
 * Create a single-line border descriptor.
 * @param {string} [color='auto'] - Border color (hex without #, or 'auto')
 * @param {number} [sz=4] - Border width in half-points
 * @returns {Object} Border descriptor for docx TableCell/Paragraph
 */
function singleBorder(color = 'auto', sz = 4) {
  return { style: BorderStyle.SINGLE, size: sz, color };
}

/**
 * Create a border set (top/bottom/left/right) with the same single-line style.
 * @param {string} [color='auto'] - Border color
 * @param {number} [sz=4] - Border width in half-points
 * @returns {Object} Object with top, bottom, left, right border descriptors
 */
function allBorders(color = 'auto', sz = 4) {
  const b = singleBorder(color, sz);
  return { top: b, bottom: b, left: b, right: b };
}

/**
 * Create a border set with all borders hidden (NIL style).
 * @returns {Object} Object with top, bottom, left, right NIL borders
 */
function noBorders() {
  const b = { style: BorderStyle.NIL, size: 0, color: 'auto' };
  return { top: b, bottom: b, left: b, right: b };
}

// ─── RUN BUILDER ─────────────────────────────────────────────────────────────

/**
 * Create a TextRun with standardized defaults (Calibri 11pt, black).
 * @param {string|number} text - The text content
 * @param {Object} [opts] - Formatting options
 * @param {boolean} [opts.bold] - Bold text
 * @param {boolean} [opts.italic] - Italic text
 * @param {boolean} [opts.underline] - Single underline
 * @param {number} [opts.size=11] - Font size in points
 * @param {string} [opts.font='Calibri'] - Font family
 * @param {string} [opts.color] - Text color (hex without #)
 * @returns {TextRun} docx TextRun instance
 */
function run(text, opts = {}) {
  return new TextRun({
    text:      String(text ?? ''),
    bold:      opts.bold || false,
    italics:   opts.italic || false,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    size:      (opts.size || 11) * 2,
    font:      opts.font || 'Calibri',
    color:     opts.color || C.BLACK,
  });
}

// ─── PARAGRAPH BUILDER ───────────────────────────────────────────────────────

/**
 * Create a Paragraph from string(s) or TextRun(s).
 * Strings are auto-wrapped in a TextRun with the given opts.
 * @param {string|TextRun|Array<string|TextRun>} children - Content
 * @param {Object} [opts] - Paragraph + run formatting options
 * @param {string} [opts.align] - AlignmentType value
 * @param {number} [opts.before=80] - Spacing before in twips
 * @param {number} [opts.after=80] - Spacing after in twips
 * @param {number} [opts.indent] - Left indent in twips
 * @param {Object} [opts.numbering] - docx numbering config
 * @returns {Paragraph} docx Paragraph instance
 */
function p(children, opts = {}) {
  const runs = [];
  const items = Array.isArray(children) ? children : [children];
  for (const item of items) {
    if (typeof item === 'string') {
      runs.push(run(item, opts));
    } else {
      runs.push(item);
    }
  }
  return new Paragraph({
    alignment:  opts.align || AlignmentType.LEFT,
    spacing:    { before: opts.before ?? 80, after: opts.after ?? 80 },
    indent:     opts.indent ? { left: opts.indent } : undefined,
    numbering:  opts.numbering || undefined,
    children:   runs,
  });
}

// ─── BLANK LINE ──────────────────────────────────────────────────────────────

/**
 * Generate one or more empty paragraphs (vertical spacing).
 * @param {number} [n=1] - Number of blank lines
 * @returns {Paragraph[]} Array of empty Paragraph instances
 */
function blank(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')] }));
}

// ─── PAGE BREAK ──────────────────────────────────────────────────────────────

/**
 * Create a paragraph containing a page break.
 * @returns {Paragraph} Paragraph with a PageBreak child
 */
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── SECTION TITLE (e.g. "OFFER LETTER") ─────────────────────────────────────

/**
 * Create a centered, bold, underlined section title (e.g. "OFFER LETTER").
 * @param {string} text - Title text
 * @returns {Paragraph} Centered title paragraph
 */
function docTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [run(text, { bold: true, size: 18, underline: true })],
  });
}

// ─── BOLD LABEL + VALUE INLINE ───────────────────────────────────────────────

/**
 * Create a paragraph with a bold label followed by a normal-weight value.
 * @param {string} label - Bold label text (e.g. "Date: ")
 * @param {string} value - Value text
 * @param {Object} [opts] - Spacing overrides (before, after)
 * @returns {Paragraph}
 */
function labelValue(label, value, opts = {}) {
  return p([
    run(label, { bold: true, size: 11 }),
    run(value, { size: 11, ...opts }),
  ], { before: opts.before ?? 80, after: opts.after ?? 80 });
}

// ─── CLAUSE HEADING (numbered) ───────────────────────────────────────────────

/**
 * Create a numbered clause heading (e.g. "1. Offer of Employment").
 * @param {number} num - Clause number
 * @param {string} title - Clause title
 * @returns {Paragraph}
 */
function clauseHead(num, title) {
  return p([
    run(`${num}.  `, { bold: true, size: 11 }),
    run(title, { bold: true, size: 11 }),
  ], { before: 160, after: 60 });
}

// ─── SUB-CLAUSE (1.1, 1.2 style) ─────────────────────────────────────────────

/**
 * Create a sub-clause paragraph (e.g. "1.1 Your employment...").
 * @param {string} num - Sub-clause number (e.g. "1.1")
 * @param {string|TextRun[]} runs_or_text - Body content as plain string or array of TextRuns
 * @returns {Paragraph}
 */
function subClause(num, runs_or_text) {
  const children = typeof runs_or_text === 'string'
    ? [run(`${num}  `, { size: 11 }), run(runs_or_text, { size: 11 })]
    : [run(`${num}  `, { size: 11 }), ...runs_or_text];
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
    children,
  });
}

// ─── BODY TEXT ───────────────────────────────────────────────────────────────

/**
 * Create a body-text paragraph from a string or array of TextRuns.
 * @param {string|TextRun[]} runs_or_text - Content
 * @param {Object} [opts] - Formatting options
 * @param {string} [opts.align] - AlignmentType value
 * @param {number} [opts.before=80] - Spacing before in twips
 * @param {number} [opts.after=80] - Spacing after in twips
 * @param {number} [opts.indent] - Left indent in twips
 * @returns {Paragraph}
 */
function body(runs_or_text, opts = {}) {
  const children = typeof runs_or_text === 'string'
    ? [run(runs_or_text, { size: 11 })]
    : runs_or_text;
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing:   { before: opts.before ?? 80, after: opts.after ?? 80 },
    indent:    opts.indent ? { left: opts.indent } : undefined,
    children,
  });
}

module.exports = {
  singleBorder, allBorders, noBorders,
  run, p, blank, pageBreak, docTitle, labelValue, clauseHead, subClause, body
};
