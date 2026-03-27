'use strict';

const { Paragraph, AlignmentType } = require('docx');

function getAnnexureB(d, ctx) {
  const { helpers, tables, numberUtils } = ctx;
  const { docTitle, body, run, blank, sigTable, pageBreak } = { ...helpers, ...tables };
  const { formatTime } = numberUtils;

  const { orgName, workDays, workTime, monthlyLeaveNum, annualLeave } = ctx;

  function annexBHead(num, title) {
    return new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [run(`${num}. ${title}`, { bold: true, size: 11 })],
    });
  }

  return [
    pageBreak(),
    docTitle('ANNEXURE B'),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [run('CODE OF CONDUCT, POLICIES AND PROCEDURES', { bold: true, size: 12, underline: true })],
    }),

    body(`This Annexure sets out the policies, procedures, and code of conduct applicable to all employees of ${orgName}. All employees are required to read, understand, and comply with these provisions.`, { after: 120 }),

    // 1. Attendance
    annexBHead(1, 'ATTENDANCE AND WORKING HOURS'),
    body([run('Working Hours: ', { bold: true, size: 11 }), run(`Standard working hours are from ${workTime}, ${workDays}.`, { size: 11 })], { indent: 360, before: 40, after: 40 }),
    body([run('Break Time: ', { bold: true, size: 11 }), run(`Employees are entitled to ${d.breakDuration || '1 (one) hour'} break which includes lunch.`, { size: 11 })], { indent: 360, before: 40, after: 40 }),
    body([run('Attendance System: ', { bold: true, size: 11 }), run(`The Company follows a ${d.attendanceSystem || 'biometric/digital attendance system'}. All employees must record attendance upon arrival and departure.`, { size: 11 })], { indent: 360, before: 40, after: 40 }),
    body([run('Grace Period: ', { bold: true, size: 11 }), run('A grace period of 15 minutes is allowed from the start time. However, this grace period can only be availed ONCE per week. Subsequent late arrivals shall be treated as half-day absent.', { size: 11 })], { indent: 360, before: 40, after: 40 }),

    // 2. Leave
    annexBHead(2, 'LEAVE POLICY'),
    body([run('Leave Entitlement: ', { bold: true, size: 11 }), run(`Every employee is entitled to ${d.monthlyLeave || '1.5 (one and a half) days'} of leave per calendar month, totaling ${annualLeave} days per financial year.`, { size: 11 })], { indent: 360, before: 40, after: 40 }),
    body([run('Financial Year: ', { bold: true, size: 11 }), run('The financial year for leave calculation starts from April 1st and ends on March 31st.', { size: 11 })], { indent: 360, before: 40, after: 40 }),
    body([run('Leave Carry Forward: ', { bold: true, size: 11 }), run(`A maximum of ${d.carryForward || '4 (four) days'} of unutilized leave can be carried forward to the next financial year. Any balance exceeding this shall automatically lapse on March 31st.`, { size: 11 })], { indent: 360, before: 40, after: 40 }),
    body([run('No Leave Encashment: ', { bold: true, size: 11 }), run('There is no provision for encashment or monetary compensation for unutilized or lapsed leaves.', { size: 11 })], { indent: 360, before: 40, after: 40 }),

    // 3. Dress Code
    annexBHead(3, 'DRESS CODE'),
    body([run('Office: ', { bold: true, size: 11 }), run('Formals or Business Casuals.', { size: 11 })], { indent: 360, before: 40, after: 40 }),
    body([run('Client Location: ', { bold: true, size: 11 }), run('STRICTLY BUSINESS FORMALS on any given day of the year, without exception. This is mandatory and non-negotiable.', { bold: true, size: 11 })], { indent: 360, before: 40, after: 40 }),

    // 4. Equal Opportunity
    annexBHead(4, 'EQUAL EMPLOYMENT OPPORTUNITY'),
    body('The Company provides equal employment opportunity to all employees and applicants and does not discriminate on any basis prohibited by law.', { indent: 360, before: 40, after: 40 }),

    // 5. Professional Conduct
    annexBHead(5, 'PROFESSIONAL CODE OF CONDUCT'),
    body('All employees are expected to: act with integrity and professionalism; treat colleagues, clients, and stakeholders with dignity and respect; avoid conflicts of interest; perform duties with skill, honesty, care, and diligence; maintain confidentiality; and comply with all Company policies and applicable laws.', { indent: 360, before: 40, after: 40 }),

    // 6. Gifts & Conflict
    annexBHead(6, 'GIFTS, FAVOURS AND CONFLICT OF INTEREST'),
    body('Employees must avoid any personal, financial, or other conflict of interest associated with their duties. External appointments or outside business are not permitted without prior written permission. Employees must never offer or accept gifts or favors that may influence business transactions.', { indent: 360, before: 40, after: 40 }),

    // 7. Asset Management
    annexBHead(7, 'ASSET MANAGEMENT'),
    body('Employees are responsible for protecting all Company assets. Any damage, theft, or misuse shall be the responsibility of the employee. All Company assets must be returned in good condition upon termination or resignation.', { indent: 360, before: 40, after: 40 }),

    // 8. Electronic Resources
    annexBHead(8, 'USE OF ELECTRONIC AND NETWORK RESOURCES'),
    body('Company computers, email, internet, and other electronic resources are provided for business purposes only. These resources are Company property and may be monitored without prior notice. Inappropriate use may result in disciplinary action.', { indent: 360, before: 40, after: 40 }),

    // 9. Confidentiality
    annexBHead(9, 'CONFIDENTIALITY, NON-SOLICITATION AND NON-COMPETE'),
    body([
      run('LIFETIME CONFIDENTIALITY OBLIGATION: ', { bold: true, size: 11 }),
      run('All confidential information constitutes trade secrets of the Company. This obligation shall remain binding throughout the ENTIRE LIFETIME of the Employee and shall survive termination for any reason. Under no circumstances shall such trade secrets be disclosed to any third party at any point during the Employee\'s lifetime.', { size: 11 }),
    ], { indent: 360, before: 40, after: 40 }),
    body('For 3 (three) years following termination, employees shall not hire or solicit Company employees, or solicit Company clients. Employees shall not engage in any competing business without prior written consent.', { indent: 360, before: 40, after: 40 }),
    body([
      run('LEGAL CONSEQUENCES: ', { bold: true, size: 11 }),
      run('Any breach shall attract civil and criminal liability under the Indian Penal Code, Information Technology Act 2000, and other applicable laws, which may result in imprisonment and substantial monetary penalties.', { size: 11 }),
    ], { indent: 360, before: 40, after: 40 }),

    // 10. Intellectual Property
    annexBHead(10, 'INTELLECTUAL PROPERTY RIGHTS'),
    body('All work created during the course of employment shall be the exclusive property of the Company. Employees shall not use, misuse, or copy any Company trademarks, copyrights, or designs. All intellectual property must be delivered to the Company upon termination.', { indent: 360, before: 40, after: 40 }),

    // 11. Workplace Conduct
    annexBHead(11, 'WORKPLACE CONDUCT'),
    body('The following are strictly prohibited: smoking, consuming alcohol, or using recreational drugs on Company premises or during working hours; using mobile phones for personal calls during work hours; using Company landlines for personal calls; taking photographs of office premises or personnel.', { indent: 360, before: 40, after: 40 }),

    // 12. Harassment Policy
    annexBHead(12, 'POLICY ON HARASSMENT (INCLUDING SEXUAL HARASSMENT)'),
    body('The Company is committed to providing a harassment-free workplace. Harassment of any kind is strictly prohibited. Sexual harassment includes unwelcome physical contact, demands for sexual favors, sexually colored remarks, or any other unwelcome conduct of a sexual nature. Complaints must be made in writing to the HR Department or the Director within 3 months of the incident.', { indent: 360, before: 40, after: 40 }),

    // 13. Disciplinary Action
    annexBHead(13, 'DISCIPLINARY ACTION'),
    body('Disciplinary action may be taken for: insubordination; theft or misappropriation; falsifying records; harassment or equal opportunity violations; poor performance; unauthorized use of resources; breach of confidentiality. Actions range from verbal warning, written warning, suspension, stoppage of increment, demotion, to immediate termination and criminal prosecution.', { indent: 360, before: 40, after: 40 }),
    body([
      run('IMPORTANT WARNING – CONFIDENTIALITY BREACH: ', { bold: true, size: 11 }),
      run('Breach of confidentiality is a serious offence. In addition to immediate termination, the Company shall initiate criminal proceedings under the Indian Penal Code (Sections 403, 405, 406, 408, 420), Information Technology Act 2000 (Sections 43, 66, 72), and any other applicable laws. Such breach may result in IMPRISONMENT up to 3 years and/or substantial monetary fines.', { bold: true, size: 11 }),
    ], { indent: 360, before: 40, after: 40 }),

    // 14. Safety
    annexBHead(14, 'SAFETY AND HEALTH'),
    body([run('The Company strives to provide a safe work environment. A first-aid kit is available at ', { size: 11 }), run(d.firstAid || '[HR Room]', { bold: true, size: 11 }), run(' for employee convenience.', { size: 11 })], { indent: 360, before: 40, after: 40 }),

    // 15. Open Door
    annexBHead(15, 'OPEN DOOR POLICY'),
    body('The Company encourages open communication. Employees may freely discuss job-related concerns with their reporting manager or HR. HR is committed to resolving employee concerns in a timely and appropriate manner.', { indent: 360, before: 40, after: 40 }),

    // 16. Amendments
    annexBHead(16, 'AMENDMENTS'),
    body('The Company reserves the right to amend, modify, or withdraw any of these policies at any time. Employees will be notified of significant changes through official communication channels.', { indent: 360, before: 40, after: 40 }),

    ...blank(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 120 },
      children: [run('ACKNOWLEDGEMENT', { bold: true, underline: true, size: 11 })],
    }),
    body([
      run('I, ', { size: 11 }),
      run(d.empFullName, { bold: true, size: 11 }),
      run(', acknowledge that I have received, read, and understood the Code of Conduct, Policies, and Procedures contained in this Annexure B. I agree to comply with all the provisions stated herein and understand that violation may result in disciplinary action, including termination of employment.', { size: 11 }),
    ], { before: 80, after: 200 }),

    sigTable(
      [
        'Employee Signature: ________________________________',
        '',
        `Name: ${d.empFullName}`,
        '',
        `Designation: ${d.designation}`,
        '',
        `Employee ID: ${d.employeeId || '[Employee ID]'}`,
      ],
      ['Date: ________________________________', '', 'Place: ________________________________']
    ),
  ];
}

module.exports = { getAnnexureB };
