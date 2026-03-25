'use strict';

const { Paragraph, AlignmentType } = require('docx');

function getOfferLetter(d, helpers, tables, constants, numberUtils) {
  const { docTitle, labelValue, body, p, run, blank, sigTable } = { ...helpers, ...tables };
  const { formatINR, toWords } = numberUtils;
  
  const year      = new Date().getFullYear();
  const ctc       = parseInt(d.annualCTC) || 0;
  const ctcWords  = toWords(ctc);
  const firstName = (d.empFullName || '').split(' ')[0];
  const salute    = d.salutation || 'Mr.';
  const orgName   = d.orgName || 'OnEasy Consultants Private Limited';
  const workDays  = `${d.workDayFrom || 'Monday'} to ${d.workDayTo || 'Saturday'}`;
  const workTime  = `${d.workStart || '10:30 AM'} to ${d.workEnd || '7:30 PM'} IST`;

  return [
    docTitle('OFFER LETTER'),

    labelValue('Ref No.: ', `OE/HR/OL/[Serial No.]/${year}`),
    labelValue('Date: ', d.offerDate, { after: 200 }),

    body('To,'),
    p(run(d.empFullName, { bold: true, size: 11 }), { before: 40, after: 40 }),
    body(d.empAddress || '', { after: 200 }),

    labelValue('Subject: ', `Offer of Employment as ${d.designation}`, { after: 200 }),

    body(`Dear ${salute} ${firstName},`, { after: 160 }),

    // 1. Offer of Employment
    helpers.clauseHead(1, 'Offer of Employment'),
    body([
      run(`On behalf of `, { size: 11 }),
      run(orgName, { bold: true, size: 11 }),
      run(` (hereinafter referred to as the "Company"), we are pleased to offer you the position of `, { size: 11 }),
      run(d.designation, { bold: true, size: 11 }),
      run(` in our organization. This offer is made based on your qualifications, experience, and the favorable impression you have made during the selection process.`, { size: 11 }),
    ], { indent: 360 }),

    // 2. Compensation
    helpers.clauseHead(2, 'Compensation'),
    body([
      run('Your annual compensation will be ', { size: 11 }),
      run(`INR ${formatINR(ctc)}`, { bold: true, size: 11 }),
      run(` (${ctcWords} Only). The detailed breakdown of your compensation structure is provided in `, { size: 11 }),
      run('Annexure A', { bold: true, size: 11 }),
      run(' attached herewith.', { size: 11 }),
    ], { indent: 360 }),

    // 3. Date of Joining
    helpers.clauseHead(3, 'Date of Joining'),
    body([
      run('Your proposed date of joining is ', { size: 11 }),
      run(d.joiningDate, { bold: true, size: 11 }),
      run(`. Please report to our office at `, { size: 11 }),
      run(d.officeAddress || '[Office Address]', { size: 11 }),
      run(' by ', { size: 11 }),
      run('10:30 AM', { bold: true, size: 11 }),
      run(' on the said date.', { size: 11 }),
    ], { indent: 360 }),

    // 4. Working Hours
    helpers.clauseHead(4, 'Working Hours'),
    body([
      run('Your working days will be ', { size: 11 }),
      run(workDays, { bold: true, size: 11 }),
      run(' from ', { size: 11 }),
      run(workTime, { bold: true, size: 11 }),
      run(', with a break of ', { size: 11 }),
      run(d.breakDuration || '1 (one) hour', { bold: true, size: 11 }),
      run(' which includes the lunch break.', { size: 11 }),
    ], { indent: 360 }),

    // 5. Validity of Offer
    helpers.clauseHead(5, 'Validity of Offer'),
    body([
      run('This offer is valid until ', { size: 11 }),
      run(d.offerValidity, { bold: true, size: 11 }),
      run('. If we do not receive your acceptance by this date, the offer shall stand automatically withdrawn.', { size: 11 }),
    ], { indent: 360 }),

    // 6. Conditions Precedent
    helpers.clauseHead(6, 'Conditions Precedent'),
    body('This offer is contingent upon:', { indent: 360 }),
    body('1.  Satisfactory verification of your credentials, references, and background.', { indent: 720, before: 40, after: 40 }),
    body('2.  Submission of all required documents as listed in the joining formalities.', { indent: 720, before: 40, after: 40 }),
    body('3.  Your acceptance of the terms and conditions outlined in the Appointment Letter and its annexures.', { indent: 720, before: 40, after: 40 }),

    // 7. Documents Required
    helpers.clauseHead(7, 'Documents Required at Joining'),
    body('Please bring the following documents on your date of joining:', { indent: 360 }),
    body('1.  Original and photocopies of all educational certificates and mark sheets.', { indent: 720, before: 40, after: 40 }),
    body('2.  Experience certificates and relieving letters from previous employers.', { indent: 720, before: 40, after: 40 }),
    body('3.  Copy of PAN Card and Aadhaar Card.', { indent: 720, before: 40, after: 40 }),
    body('4.  Two passport-size photographs.', { indent: 720, before: 40, after: 40 }),
    body('5.  Bank account details (cancelled cheque or bank statement).', { indent: 720, before: 40, after: 40 }),
    body('6.  Address proof (Aadhaar / Passport / Utility Bill).', { indent: 720, before: 40, after: 40 }),

    // 8. Acceptance
    helpers.clauseHead(8, 'Acceptance'),
    body('Please sign and return the duplicate copy of this Offer Letter as a token of your acceptance. Upon joining, you will be issued a formal Appointment Letter containing detailed terms and conditions of your employment.', { indent: 360 }),

    ...blank(1),
    body('We are confident that you will significantly contribute to our team\'s success and look forward to a mutually rewarding professional relationship.', { before: 120 }),
    body('If you have any questions, please do not hesitate to contact us.', { before: 80, after: 160 }),

    body('Yours sincerely,'),
    ...blank(1),
    body(`For ${orgName}`, { bold: true }),
    body(''),
    body('________________________________'),
    body(d.signatoryName || 'CA Abhishek Boddu', { bold: true }),
    body(d.signatoryDesignation || 'Director'),

    ...blank(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [run('ACCEPTANCE BY CANDIDATE', { bold: true, underline: true, size: 11 })],
    }),

    body([
      run(`I, `, { size: 11 }),
      run(d.empFullName, { bold: true, size: 11 }),
      run(`, hereby accept the offer of employment as `, { size: 11 }),
      run(d.designation, { bold: true, size: 11 }),
      run(` at ${orgName} on the terms and conditions mentioned above. I confirm that I will join on `, { size: 11 }),
      run(d.joiningDate, { bold: true, size: 11 }),
      run(' and will submit all required documents on the date of joining.', { size: 11 }),
    ], { before: 80, after: 200 }),

    tables.sigTable(
      ['Signature: ________________________________', '', `Name: ${d.empFullName}`],
      ['Date: ________________________________', '', 'Place: ________________________________']
    ),
  ];
}

module.exports = { getOfferLetter };
