'use strict';

const { Header, Footer, Paragraph, AlignmentType, TextRun, PageNumber, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign, TableLayoutType } = require('docx');
const { run } = require('./helpers');

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

/**
 * Build the document header.
 * Layout: [Logo flush-left] [Company Name]
 *                CIN centered below
 *         ──────────────────────────────
 */
function makeHeader(orgName, cin, logoBuffer) {
  if (logoBuffer) {
    const logoCell = new TableCell({
      width: { size: 1000, type: WidthType.DXA },
      borders: noBorders,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 0, bottom: 0, left: 0, right: 60 },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 65, height: 38 },
              type: 'png',
            }),
          ],
        }),
      ],
    });

    const nameCell = new TableCell({
      width: { size: 7766, type: WidthType.DXA },
      borders: noBorders,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 0, bottom: 0, left: 60, right: 0 },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0 },
          children: [run(orgName.toUpperCase(), { bold: true, size: 20, font: 'Calibri' })],
        }),
      ],
    });

    const headerTable = new Table({
      rows: [
        new TableRow({ children: [logoCell, nameCell] }),
      ],
      width: { size: 8766, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
    });

    const headerChildren = [headerTable];

    if (cin) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 0 },
          children: [run(`CIN: ${cin}`, { size: 9, color: '595959' })],
        })
      );
    }

    headerChildren.push(
      new Paragraph({
        spacing: { before: 80, after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1F3864' } },
        children: [],
      })
    );

    return new Header({ children: headerChildren });
  }

  // No logo fallback
  const children = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [run(orgName.toUpperCase(), { bold: true, size: 20, font: 'Calibri' })],
    }),
  ];

  if (cin) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 0 },
        children: [run(`CIN: ${cin}`, { size: 9, color: '595959' })],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 80, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1F3864' } },
      children: [],
    })
  );

  return new Header({ children });
}

function makeFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          run('Page ', { size: 9 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
          run(' of ', { size: 9 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
        ],
      }),
    ],
  });
}

module.exports = { makeHeader, makeFooter };
