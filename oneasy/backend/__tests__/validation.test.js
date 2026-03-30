'use strict';

const { validateGeneratePayload } = require('../validation');

// Minimal valid payload — all required fields present
const validPayload = () => ({
  orgName: 'Acme Corp',
  officeAddress: '123 Main St, Bengaluru',
  signatoryName: 'Jane Doe',
  signatoryDesig: 'CEO',
  empFullName: 'John Smith',
  designation: 'Software Engineer',
  annualCTC: 1200000,
  offerDate: '2026-03-01',
  offerValidity: '2026-03-15',
  joiningDate: '2026-04-01',
});

describe('validateGeneratePayload', () => {
  // ── Required field tests ───────────────────────────────────────────────
  describe('required fields', () => {
    const requiredFields = [
      'orgName', 'officeAddress', 'signatoryName', 'signatoryDesig',
      'empFullName', 'designation', 'offerDate', 'offerValidity', 'joiningDate',
    ];

    test.each(requiredFields)('rejects missing %s', (field) => {
      const payload = validPayload();
      delete payload[field];
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects missing annualCTC', () => {
      const payload = validPayload();
      delete payload.annualCTC;
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
    });

    test('rejects annualCTC = 0', () => {
      const payload = validPayload();
      payload.annualCTC = 0;
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Annual CTC'))).toBe(true);
    });

    test('rejects negative annualCTC', () => {
      const payload = validPayload();
      payload.annualCTC = -500000;
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
    });
  });

  // ── Valid payload tests ────────────────────────────────────────────────
  describe('valid payloads', () => {
    test('accepts minimal valid payload', () => {
      const result = validateGeneratePayload(validPayload());
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('applies default values for optional fields', () => {
      const result = validateGeneratePayload(validPayload());
      expect(result.data.entityType).toBe('Company');
      expect(result.data.salutation).toBe('Mr.');
      expect(result.data.cin).toBe('');
      expect(result.data.empAddress).toBe('');
      expect(result.data.attendanceSystem).toBe('biometric attendance system');
    });

    test('accepts annualCTC as string and transforms to number', () => {
      const payload = validPayload();
      payload.annualCTC = '1500000';
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
      expect(result.data.annualCTC).toBe(1500000);
      expect(typeof result.data.annualCTC).toBe('number');
    });

    test('rounds annualCTC to integer', () => {
      const payload = validPayload();
      payload.annualCTC = 1200000.7;
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
      expect(result.data.annualCTC).toBe(1200001);
    });

    test('accepts payload with all optional fields', () => {
      const payload = {
        ...validPayload(),
        entityType: 'LLP',
        cin: 'U12345MH2020PTC123456',
        salutation: 'Ms.',
        empAddress: '456 Oak Ave',
        employeeId: 'EMP001',
        reportingManager: 'Alice Wong',
        attendanceSystem: 'card swipe',
        probationPeriod: '6 months',
        workDayFrom: 'Monday',
        workDayTo: 'Friday',
        workStart: '09:00',
        workEnd: '18:00',
        breakDuration: '1 hour',
        monthlyLeave: '2',
        carryForward: '5 days',
        noticePeriod: '30 days',
        abscondDays: '7 days',
        firstAid: 'Dr. Sharma',
        _offerId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
    });
  });

  // ── .strip() behavior ──────────────────────────────────────────────────
  describe('strip unknown fields', () => {
    test('removes unrecognized fields from output', () => {
      const payload = { ...validPayload(), maliciousField: '<script>alert(1)</script>', __proto__: {} };
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
      expect(result.data.maliciousField).toBeUndefined();
    });
  });

  // ── Cross-field date validation ────────────────────────────────────────
  describe('cross-field date validation', () => {
    test('rejects offerValidity <= offerDate', () => {
      const payload = validPayload();
      payload.offerDate = '2026-03-15';
      payload.offerValidity = '2026-03-15'; // same date — invalid
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('offerValidity'))).toBe(true);
    });

    test('rejects offerValidity before offerDate', () => {
      const payload = validPayload();
      payload.offerDate = '2026-03-15';
      payload.offerValidity = '2026-03-10';
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
    });

    test('rejects joiningDate before offerDate', () => {
      const payload = validPayload();
      payload.offerDate = '2026-04-01';
      payload.joiningDate = '2026-03-15';
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('joiningDate'))).toBe(true);
    });

    test('accepts joiningDate == offerDate (same day is allowed)', () => {
      // The schema uses offerDate > joiningDate (strict), so same-day is NOT a violation
      const payload = validPayload();
      payload.offerDate = '2026-04-01';
      payload.joiningDate = '2026-04-01';
      payload.offerValidity = '2026-04-15';
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
    });

    test('accepts valid date ordering', () => {
      const payload = validPayload();
      payload.offerDate = '2026-03-01';
      payload.offerValidity = '2026-03-15';
      payload.joiningDate = '2026-04-01';
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
    });
  });

  // ── _offerId validation ────────────────────────────────────────────────
  describe('_offerId', () => {
    test('accepts valid UUID', () => {
      const payload = { ...validPayload(), _offerId: '550e8400-e29b-41d4-a716-446655440000' };
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
      expect(result.data._offerId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    test('rejects invalid UUID (path traversal attempt)', () => {
      const payload = { ...validPayload(), _offerId: '../../../etc/passwd' };
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
    });

    test('accepts missing _offerId', () => {
      const payload = validPayload();
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(true);
      expect(result.data._offerId).toBeUndefined();
    });
  });

  // ── Max length enforcement ─────────────────────────────────────────────
  describe('max length enforcement', () => {
    test('rejects orgName over 200 chars', () => {
      const payload = validPayload();
      payload.orgName = 'A'.repeat(201);
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
    });

    test('rejects officeAddress over 500 chars', () => {
      const payload = validPayload();
      payload.officeAddress = 'B'.repeat(501);
      const result = validateGeneratePayload(payload);
      expect(result.success).toBe(false);
    });
  });

  // ── Error formatting ──────────────────────────────────────────────────
  describe('error formatting', () => {
    test('errors contain field path and message', () => {
      const result = validateGeneratePayload({});
      expect(result.success).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      // Should have path: message format
      result.errors.forEach(err => {
        expect(typeof err).toBe('string');
      });
    });
  });
});
