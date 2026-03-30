'use strict';

const { Table, TableRow, TableCell, Paragraph, WidthType, BorderStyle, ShadingType, AlignmentType } = require('docx');
const { CONTENT_W, C } = require('./constants');
const { noBorders, allBorders, run } = require('./helpers');
const { formatINR } = require('./numberUtils');

// ─── SIGNATURE TABLE (2-column, no borders, matches template) ────────────────

/**
 * Create a two-column signature table with no visible borders.
 * Each column contains vertically stacked text lines.
 * @param {string[]} leftLines - Lines for the left column (e.g. signatory info)
 * @param {string[]} rightLines - Lines for the right column (e.g. date/place)
 * @returns {Table} docx Table instance
 */
function sigTable(leftLines, rightLines) {
  function col(lines, w) {
    return new TableCell({
      borders: noBorders(),
      width: { size: w, type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 0, right: 0 },
      children: lines.map(l =>
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [run(l, { size: 11 })] })
      ),
    });
  }
  const half = Math.floor(CONTENT_W / 2);
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [half, CONTENT_W - half],
    borders: { ...noBorders(), insideH: { style: BorderStyle.NIL }, insideV: { style: BorderStyle.NIL } },
    rows: [new TableRow({ children: [col(leftLines, half), col(rightLines, CONTENT_W - half)] })],
  });
}

// ─── SALARY TABLE ────────────────────────────────────────────────────────────

/**
 * Create a formatted salary breakdown table with header row and data rows.
 * Columns: Description | Monthly | Annual. Total rows get grey background.
 * @param {Object[]} breakdown - Array of salary line items from buildBreakdown()
 * @param {string} breakdown[].label - Row description (e.g. "Basic Salary")
 * @param {number} breakdown[].monthly - Monthly amount
 * @param {number} breakdown[].annual - Annual amount
 * @param {string} [breakdown[].type] - "total" for highlighted total rows
 * @returns {Table} docx Table instance
 */
function salaryTable(breakdown) {
  const col1 = Math.floor(CONTENT_W * 0.5);
  const col2 = Math.floor(CONTENT_W * 0.25);
  const col3 = CONTENT_W - col1 - col2;

  function hdrCell(text, w) {
    return new TableCell({
      borders: allBorders('auto', 4),
      shading: { fill: '1F3864', type: ShadingType.CLEAR },
      width: { size: w, type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(text, { bold: true, size: 10, color: C.WHITE })],
      })],
    });
  }

  function dataCell(text, w, bold = false, bg = C.WHITE) {
    return new TableCell({
      borders: allBorders('auto', 4),
      shading: { fill: bg, type: ShadingType.CLEAR },
      width: { size: w, type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 100, right: 100 },
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [run(text, { bold, size: 10 })],
      })],
    });
  }

  function labelCell(text, w, bold = false, bg = C.WHITE) {
    return new TableCell({
      borders: allBorders('auto', 4),
      shading: { fill: bg, type: ShadingType.CLEAR },
      width: { size: w, type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 100, right: 100 },
      children: [new Paragraph({
        children: [run(text, { bold, size: 10 })],
      })],
    });
  }

  const rows = [
    new TableRow({
      children: [
        hdrCell('Description', col1),
        hdrCell('Monthly (Rs. Per Month)', col2),
        hdrCell('Annual (Rs. Per Annum)', col3),
      ],
    }),
  ];

  for (const row of breakdown) {
    const isTotal = row.type === 'total';
    const bg      = isTotal ? 'D9D9D9' : C.WHITE;
    rows.push(new TableRow({
      children: [
        labelCell(row.label, col1, isTotal, bg),
        dataCell(formatINR(row.monthly), col2, isTotal, bg),
        dataCell(formatINR(row.annual),  col3, isTotal, bg),
      ],
    }));
  }

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col1, col2, col3],
    rows,
  });
}

module.exports = { sigTable, salaryTable };
