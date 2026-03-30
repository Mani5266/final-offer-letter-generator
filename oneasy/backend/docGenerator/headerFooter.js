'use strict';

const { Header, Footer, Paragraph, AlignmentType, TextRun, PageNumber, ImageRun } = require('docx');
const { run } = require('./helpers');

/**
 * Build the document header with optional company logo.
 * @param {string} orgName - Company name
 * @param {string} cin - CIN / Registration number
 * @param {Buffer|null} logoBuffer - Logo image buffer (PNG/JPG) or null
 */
function makeHeader(orgName, cin, logoBuffer) {
  const children = [];

  // If a logo is provided, add it centered above the company name
  if (logoBuffer) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 120, height: 60 },
            type: 'png',
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [run(orgName.toUpperCase(), { bold: true, size: 14 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [run(cin ? `CIN: ${cin}` : '', { italic: true, size: 9 })],
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
