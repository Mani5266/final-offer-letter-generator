'use strict';

// Mock supabase to avoid .env requirement
jest.mock('../utils/supabase', () => ({
  supabaseAdmin: {},
  supabase: {},
}));

const { generateDoc } = require('../docGenerator/index');

describe('generateDoc integration', () => {
  const fullPayload = {
    orgName: 'Acme Corp Pvt. Ltd.',
    entityType: 'Company',
    cin: 'U12345MH2020PTC123456',
    signatoryName: 'Rajesh Kumar',
    signatoryDesig: 'Managing Director',
    officeAddress: '123 MG Road, Bengaluru, Karnataka 560001',
    firstAid: 'Dr. Anand',
    salutation: 'Mr.',
    empFullName: 'Sai Kiran',
    empAddress: '456 Oak Street, Hyderabad',
    designation: 'Senior Software Engineer',
    employeeId: 'EMP-2026-001',
    reportingManager: 'Priya Sharma',
    attendanceSystem: 'biometric attendance system',
    offerDate: '2026-03-01',
    offerValidity: '2026-03-15',
    joiningDate: '2026-04-01',
    annualCTC: 1200000,
    probationPeriod: '6 months',
    workDayFrom: 'Monday',
    workDayTo: 'Saturday',
    workStart: '10:30',
    workEnd: '19:30',
    breakDuration: '30 minutes',
    monthlyLeave: '1.5',
    carryForward: '5 days',
    noticePeriod: '30 days',
    abscondDays: '7 days',
  };

  test('returns a Buffer', async () => {
    const result = await generateDoc(fullPayload);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('buffer has DOCX magic bytes (PK zip header)', async () => {
    const result = await generateDoc(fullPayload);
    // DOCX files are ZIP archives — they start with PK (0x50 0x4B)
    expect(result[0]).toBe(0x50);
    expect(result[1]).toBe(0x4B);
  });

  test('buffer has reasonable size (> 10KB)', async () => {
    const result = await generateDoc(fullPayload);
    expect(result.length).toBeGreaterThan(10000);
  });

  test('generates doc with minimal payload (defaults applied)', async () => {
    const minPayload = {
      orgName: 'Test Co',
      officeAddress: 'Addr',
      signatoryName: 'Sig',
      signatoryDesig: 'CEO',
      empFullName: 'Emp',
      designation: 'Dev',
      annualCTC: 600000,
      offerDate: '2026-01-01',
      offerValidity: '2026-01-15',
      joiningDate: '2026-02-01',
    };
    const result = await generateDoc(minPayload);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result[0]).toBe(0x50);
    expect(result[1]).toBe(0x4B);
  });

  test('different CTC values produce valid documents', async () => {
    for (const ctc of [300000, 1200000, 5000000, 10000000]) {
      const payload = { ...fullPayload, annualCTC: ctc };
      const result = await generateDoc(payload);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(5000);
    }
  });
});
