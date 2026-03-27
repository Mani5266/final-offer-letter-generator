const { generateDoc } = require('./backend/docGenerator');
const fs = require('fs');

const dummyData = {
    orgName: 'Test Org',
    cin: 'U12345TG2024PTC123456',
    entityType: 'Private Limited',
    officeAddress: 'Hyderabad',
    signatoryName: 'John Doe',
    signatoryDesig: 'Director',
    firstAid: 'HR Room',
    salutation: 'Mr.',
    empFullName: 'Jane Smith',
    empAddress: 'Kochi',
    designation: 'SDE',
    reportingManager: 'Manager X',
    attendanceSystem: 'Biometric',
    annualCTC: 600000,
    offerDate: '2024-03-25',
    offerValidity: '2024-04-01',
    joiningDate: '2024-04-10',
    probationPeriod: '6 months',
    workDayFrom: 'Monday',
    workDayTo: 'Friday',
    workStart: '10:00 AM',
    workEnd: '7:00 PM',
    breakDuration: '1 hour',
    monthlyLeave: '1.5',
    carryForward: '4',
    noticePeriod: '45 days',
    abscondDays: '3',
};

async function test() {
    try {
        console.log('Generating document...');
        const buffer = await generateDoc(dummyData);
        fs.writeFileSync('test.docx', buffer);
        console.log('Document generated successfully at test.docx');
    } catch (e) {
        console.error('FAILED TO GENERATE:', e);
    }
}

test();
