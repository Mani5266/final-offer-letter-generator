'use strict';

const { Paragraph, AlignmentType } = require('docx');

function getAnnexureA(d, helpers, tables, constants, numberUtils) {
  const { docTitle, body, run, blank, sigTable, pageBreak, salaryTable } = { ...helpers, ...tables };
  const { formatINR, toWords, buildBreakdown } = numberUtils;
  
  const ctc       = parseInt(d.annualCTC) || 0;
  const ctcWords  = toWords(ctc);
  const breakdown = buildBreakdown(ctc);
  const orgName   = d.orgName || 'OnEasy Consultants Private Limited';

  return [
    pageBreak(),
    docTitle('ANNEXURE A'),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [run('COMPENSATION STRUCTURE', { bold: true, size: 12 })],
    }),

    body([
      run('Employee Name: ', { bold: true, size: 11 }),
      run(d.empFullName, { size: 11 }),
      run('          Designation: ', { bold: true, size: 11 }),
      run(d.designation, { size: 11 }),
    ], { before: 80, after: 40 }),
    body([
      run('Date of Joining: ', { bold: true, size: 11 }),
      run(d.joiningDate, { size: 11 }),
      run('          Annual CTC: ', { bold: true, size: 11 }),
      run(`INR ${formatINR(ctc)} (${ctcWords} Only)`, { size: 11 }),
    ], { before: 40, after: 120 }),

    salaryTable(breakdown),

    ...blank(1),
    body('Notes:', { bold: true, before: 120, after: 60 }),
    body('•  The above salary structure is subject to applicable statutory deductions.', { indent: 360, before: 30, after: 30 }),
    body('•  Any revisions to the salary structure will be communicated in writing.', { indent: 360, before: 30, after: 30 }),
    body('•  This annexure forms an integral part of the Appointment Letter.', { indent: 360, before: 30, after: 60 }),

    ...blank(2),
    sigTable(
      ['Employee Signature: ________________________________', '', 'Date: ________________________________'],
      [`For ${orgName}`, '', 'Authorized Signatory']
    ),
  ];
}

module.exports = { getAnnexureA };
