'use strict';

const { Paragraph, AlignmentType } = require('docx');

function getAppointmentLetter(d, helpers, tables, constants, numberUtils) {
  const { docTitle, labelValue, body, p, run, blank, sigTable, pageBreak, clauseHead, subClause } = { ...helpers, ...tables };
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
    pageBreak(),
    docTitle('APPOINTMENT LETTER'),

    labelValue('Ref No.: ', `OE/HR/AL/[Serial No.]/${year}`),
    labelValue('Date: ', d.offerDate, { after: 200 }),

    body('To,'),
    p(run(d.empFullName, { bold: true, size: 11 }), { before: 40, after: 40 }),
    body(d.empAddress || '', { after: 200 }),

    labelValue('Subject: ', 'Letter of Appointment', { after: 200 }),

    body(`Dear ${salute} ${firstName},`, { after: 80 }),
    body([
      run('With reference to your application and subsequent discussions, we are pleased to appoint you as ', { size: 11 }),
      run(d.designation, { bold: true, size: 11 }),
      run(` at `, { size: 11 }),
      run(orgName, { bold: true, size: 11 }),
      run(' (hereinafter referred to as the "Company" or "Employer") on the following terms and conditions:', { size: 11 }),
    ], { after: 120 }),

    // 1. Commencement
    clauseHead(1, 'COMMENCEMENT OF EMPLOYMENT'),
    subClause('1.1', [
      run('Your employment with the Company shall commence from ', { size: 11 }),
      run(d.joiningDate, { bold: true, size: 11 }),
      run(' ("Date of Joining").', { size: 11 }),
    ]),
    subClause('1.2', [
      run(`Your place of work shall be at the Company's office located at `, { size: 11 }),
      run(d.officeAddress || '[Office Address]', { bold: true, size: 11 }),
      run(', or such other location as may be assigned by the Company from time to time.', { size: 11 }),
    ]),
    subClause('1.3', 'You represent that you possess the required skills, qualifications, and experience to perform the duties of the position and agree to be bound by all terms and conditions of this Appointment Letter.'),

    // 2. Designation
    clauseHead(2, 'DESIGNATION AND DUTIES'),
    subClause('2.1', [
      run('You are appointed to the position of ', { size: 11 }),
      run(d.designation, { bold: true, size: 11 }),
      run(' or such other designation as may be assigned by the Company.', { size: 11 }),
    ]),
    subClause('2.2', 'You shall perform such duties and responsibilities as may be assigned to you by the Company or your reporting manager from time to time.'),
    subClause('2.3', [
      run('You shall report to ', { size: 11 }),
      run(d.reportingManager || '[Reporting Manager\'s Designation]', { bold: true, size: 11 }),
      run(' or such other person as may be designated by the Company.', { size: 11 }),
    ]),
    subClause('2.4', 'The Company reserves the right to modify your designation, duties, responsibilities, and reporting relationships as deemed necessary in the interest of business operations.'),

    // 3. Probation
    clauseHead(3, 'PROBATION PERIOD'),
    subClause('3.1', [
      run('You shall be on probation for a period of ', { size: 11 }),
      run(d.probationPeriod || '6 (six) months', { bold: true, size: 11 }),
      run(' from the Date of Joining.', { size: 11 }),
    ]),
    subClause('3.2', 'During the probation period, the Company shall evaluate your performance, conduct, and suitability for continued employment.'),
    subClause('3.3', 'The Company may, at its sole discretion, extend the probation period or terminate your employment during the probation period without assigning any reason and without notice or compensation in lieu thereof.'),
    subClause('3.4', 'Upon successful completion of probation, you shall be confirmed in writing by the Company.'),

    // 4. Compensation
    clauseHead(4, 'COMPENSATION AND BENEFITS'),
    subClause('4.1', [
      run('Your annual Cost to Company (CTC) shall be ', { size: 11 }),
      run(`INR ${formatINR(ctc)}`, { bold: true, size: 11 }),
      run(` (${ctcWords} Only).`, { size: 11 }),
    ]),
    subClause('4.2', [run('The detailed compensation structure including all components is provided in ', { size: 11 }), run('Annexure A', { bold: true, size: 11 }), run('.', { size: 11 })]),
    subClause('4.3', 'Your salary shall be paid on or before the 7th of each succeeding month, subject to applicable statutory deductions.'),
    subClause('4.4', 'Annual salary revisions, if any, shall be at the sole discretion of the Company based on your performance, Company policy, and business conditions.'),

    // 5. Working Hours
    clauseHead(5, 'WORKING HOURS AND ATTENDANCE'),
    subClause('5.1', [run('Your working days shall be ', { size: 11 }), run(workDays, { bold: true, size: 11 }), run('.', { size: 11 })]),
    subClause('5.2', [
      run('Working hours shall be from ', { size: 11 }),
      run(workTime, { bold: true, size: 11 }),
      run(', with a break of ', { size: 11 }),
      run(d.breakDuration || '1 (one) hour', { bold: true, size: 11 }),
      run(' which includes the lunch break.', { size: 11 }),
    ]),
    subClause('5.3', [run('Detailed attendance policies and rules are provided in ', { size: 11 }), run('Annexure B', { bold: true, size: 11 }), run('.', { size: 11 })]),
    subClause('5.4', 'You may be required to work beyond normal working hours or on holidays as per business requirements, for which no additional compensation shall be payable unless specifically approved by the management.'),

    // 6. Leave
    clauseHead(6, 'LEAVE ENTITLEMENT'),
    subClause('6.1', [
      run('You shall be entitled to ', { size: 11 }),
      run(d.monthlyLeave || '1.5 (one and a half) days', { bold: true, size: 11 }),
      run(' of leave per calendar month, totaling ', { size: 11 }),
      run('18 days per financial year', { bold: true, size: 11 }),
      run(' (April to March).', { size: 11 }),
    ]),
    subClause('6.2', [
      run('A maximum of ', { size: 11 }),
      run(d.carryForward || '4 (four) days', { bold: true, size: 11 }),
      run(' of unutilized leave may be carried forward to the next financial year. Any leave balance exceeding this shall lapse on March 31st of each year.', { size: 11 }),
    ]),
    subClause('6.3', [run('There shall be ', { size: 11 }), run('no encashment or compensation', { bold: true, size: 11 }), run(' for unutilized or lapsed leaves.', { size: 11 })]),
    subClause('6.4', 'The list of public holidays shall be communicated separately by the office of the CEO via email or official communication channels at the beginning of each calendar year.'),
    subClause('6.5', [run('Detailed leave policy is provided in ', { size: 11 }), run('Annexure B', { bold: true, size: 11 }), run('.', { size: 11 })]),

    // 7. Notice Period
    clauseHead(7, 'NOTICE PERIOD AND TERMINATION'),
    subClause('7.1', [
      run('Employee Resignation – Notice Requirement: ', { bold: true, size: 11 }),
      run('In the event the Employee wishes to resign, the Employee shall serve a mandatory notice period of ', { size: 11 }),
      run(d.noticePeriod || '45 (Forty-Five) days', { bold: true, size: 11 }),
      run('. This notice period is non-negotiable and cannot be reduced or waived unless expressly approved in writing by the Director of the Company.', { size: 11 }),
    ]),
    subClause('7.2', [
      run('Company\'s Right to Terminate: ', { bold: true, size: 11 }),
      run('The Company reserves the absolute and unconditional right to terminate the Employee\'s services at any time with a notice period of ', { size: 11 }),
      run('1 (one) day or less', { bold: true, size: 11 }),
      run(', at its sole discretion, without assigning any reason whatsoever.', { size: 11 }),
    ]),
    subClause('7.3', [
      run('Immediate Termination Without Notice: ', { bold: true, size: 11 }),
      run('The Company may terminate employment immediately without notice in cases of: gross misconduct; breach of confidentiality; fraud, theft or dishonesty; violation of Company policies; any act prejudicial to the Company\'s interests; or during the probation period for any reason whatsoever.', { size: 11 }),
    ]),
    subClause('7.4', [
      run('Consequences of Not Serving Notice Period: ', { bold: true, size: 11 }),
      run('Failure to serve the complete notice period shall result in: (a) No Relieving Letter; (b) No Experience Certificate; (c) No Payslips or Form 16; (d) No Recommendation Letters; (e) Negative Background Verification disclosure; (f) Full & Final Settlement withheld; (g) No Clearance Certificate; (h) Legal action for breach of contract.', { size: 11 }),
    ]),
    subClause('7.5', [
      run('Absconding: ', { bold: true, size: 11 }),
      run(`Absence without approval for more than `, { size: 11 }),
      run(d.abscondDays || '3 (three) consecutive working days', { bold: true, size: 11 }),
      run(' shall be deemed absconding and employment shall stand automatically terminated, with all consequences under Clause 7.4 applying.', { size: 11 }),
    ]),
    subClause('7.6', [
      run('Mandatory Knowledge Transfer: ', { bold: true, size: 11 }),
      run('During the notice period, the Employee shall provide complete Knowledge Transfer to the designated successor. Failure to do so shall be treated as non-serving of notice period.', { size: 11 }),
    ]),
    subClause('7.7', 'Return of Company Property: Upon resignation or termination, all Company assets (laptops, phones, ID cards, documents, data, etc.) must be immediately returned. Failure shall result in deduction from Full and Final Settlement and may attract legal action.'),
    subClause('7.8', 'Exit Formalities: The Employee must complete all exit formalities including exit interview, handover documentation, and departmental clearances. Issuance of any certificates is contingent upon successful completion.'),

    // 8. Confidentiality
    clauseHead(8, 'CONFIDENTIALITY AND NON-DISCLOSURE'),
    subClause('8.1', 'You shall maintain strict confidentiality of all proprietary information, trade secrets, business strategies, client information, and any other confidential information of the Company.'),
    subClause('8.2', [
      run('Lifetime Obligation: ', { bold: true, size: 11 }),
      run('This confidentiality obligation shall remain in force throughout the lifetime of the Employee and shall survive the termination of employment for any reason whatsoever. There shall be no circumstance under which such trade secrets may be disclosed to any third party at any point during the Employee\'s lifetime.', { size: 11 }),
    ]),
    subClause('8.3', [
      run('Legal Consequences: ', { bold: true, size: 11 }),
      run('Any breach shall attract civil and criminal liability under the Indian Penal Code, Information Technology Act, and other applicable laws, which may result in imprisonment and monetary penalties.', { size: 11 }),
    ]),
    subClause('8.4', [run('Detailed provisions are set out in ', { size: 11 }), run('Annexure B', { bold: true, size: 11 }), run('.', { size: 11 })]),

    // 9. Intellectual Property
    clauseHead(9, 'INTELLECTUAL PROPERTY'),
    subClause('9.1', 'All work products, inventions, designs, processes, and materials created by you during your employment, whether during or outside working hours, shall be the exclusive property of the Company.'),
    subClause('9.2', 'You hereby assign and transfer all rights, title, and interest in such intellectual property to the Company.'),

    // 10. Code of Conduct
    clauseHead(10, 'CODE OF CONDUCT AND POLICIES'),
    subClause('10.1', [run('You shall comply with all rules, regulations, policies, and code of conduct of the Company as set out in ', { size: 11 }), run('Annexure B', { bold: true, size: 11 }), run(' and as amended from time to time.', { size: 11 })]),
    subClause('10.2', 'The Company reserves the right to modify its policies and procedures at any time, and you agree to be bound by such modifications upon notification.'),

    // 11. General
    clauseHead(11, 'GENERAL PROVISIONS'),
    subClause('11.1', [run('Exclusive Employment: ', { bold: true, size: 11 }), run('You shall devote your full time and attention to your position and shall not engage in any other employment or business without prior written consent of the Company.', { size: 11 })]),
    subClause('11.2', [run('Background Verification: ', { bold: true, size: 11 }), run('Your employment is subject to satisfactory background verification. Any discrepancy found may result in immediate termination.', { size: 11 })]),
    subClause('11.3', [run('Salary Confidentiality: ', { bold: true, size: 11 }), run('Your salary and other terms of this appointment are strictly confidential. Disclosure to any person, including other employees, may result in disciplinary action.', { size: 11 })]),
    subClause('11.4', [run('Governing Law: ', { bold: true, size: 11 }), run('This Appointment Letter shall be governed by the laws of India, and any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana.', { size: 11 })]),
    subClause('11.5', 'Entire Agreement: This Appointment Letter, along with its annexures, constitutes the entire agreement between you and the Company and supersedes all prior discussions, negotiations, and agreements.'),

    ...blank(1),
    body('Please sign and return the duplicate copy of this Appointment Letter along with all annexures as acceptance of the terms and conditions stated herein.', { before: 120 }),
    body(`We welcome you to the ${orgName} family and wish you a successful and rewarding career with us.`, { before: 80, after: 160 }),

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
      children: [run('ACCEPTANCE BY EMPLOYEE', { bold: true, underline: true, size: 11 })],
    }),
    body([
      run('I, ', { size: 11 }),
      run(d.empFullName, { bold: true, size: 11 }),
      run(', have read, understood, and accept all the terms and conditions of this Appointment Letter and its Annexures (A and B). I agree to abide by all policies, rules, and regulations of the Company.', { size: 11 }),
    ], { before: 80, after: 200 }),

    sigTable(
      ['Signature: ________________________________', '', `Name: ${d.empFullName}`, '', `Designation: ${d.designation}`],
      ['Date: ________________________________', '', 'Place: ________________________________']
    ),
  ];
}

module.exports = { getAppointmentLetter };
