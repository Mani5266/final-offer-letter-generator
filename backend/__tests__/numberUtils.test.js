'use strict';

const { formatINR, toWords, buildBreakdown, formatDate, formatTime } = require('../docGenerator/numberUtils');

describe('formatINR', () => {
  test('formats with Indian comma grouping', () => {
    expect(formatINR(1200000)).toBe('12,00,000');
    expect(formatINR(100000)).toBe('1,00,000');
    expect(formatINR(1000)).toBe('1,000');
    expect(formatINR(100)).toBe('100');
    expect(formatINR(0)).toBe('0');
  });

  test('rounds to nearest integer before formatting', () => {
    expect(formatINR(1234.5)).toBe('1,235');
    expect(formatINR(1234.4)).toBe('1,234');
  });

  test('handles large numbers (crores)', () => {
    expect(formatINR(10000000)).toBe('1,00,00,000');
    expect(formatINR(50000000)).toBe('5,00,00,000');
  });
});

describe('toWords', () => {
  test('zero', () => {
    expect(toWords(0)).toBe('Zero');
  });

  test('single digits', () => {
    expect(toWords(1)).toBe('One');
    expect(toWords(9)).toBe('Nine');
  });

  test('teens', () => {
    expect(toWords(11)).toBe('Eleven');
    expect(toWords(19)).toBe('Nineteen');
  });

  test('tens', () => {
    expect(toWords(20)).toBe('Twenty');
    expect(toWords(42)).toBe('Forty Two');
    expect(toWords(99)).toBe('Ninety Nine');
  });

  test('hundreds', () => {
    expect(toWords(100)).toBe('One Hundred');
    expect(toWords(101)).toBe('One Hundred and One');
    expect(toWords(250)).toBe('Two Hundred and Fifty');
    expect(toWords(999)).toBe('Nine Hundred and Ninety Nine');
  });

  test('thousands', () => {
    expect(toWords(1000)).toBe('One Thousand');
    expect(toWords(1001)).toBe('One Thousand One');
    expect(toWords(10500)).toBe('Ten Thousand Five Hundred');
    expect(toWords(99999)).toBe('Ninety Nine Thousand Nine Hundred and Ninety Nine');
  });

  test('lakhs', () => {
    expect(toWords(100000)).toBe('One Lakh');
    expect(toWords(500000)).toBe('Five Lakh');
    expect(toWords(1200000)).toBe('Twelve Lakh');
  });

  test('crores', () => {
    expect(toWords(10000000)).toBe('One Crore');
    expect(toWords(50000000)).toBe('Five Crore');
  });

  test('complex numbers', () => {
    expect(toWords(1234567)).toBe('Twelve Lakh Thirty Four Thousand Five Hundred and Sixty Seven');
  });

  test('rounds floating point before conversion', () => {
    expect(toWords(5.7)).toBe('Six');
    expect(toWords(5.3)).toBe('Five');
  });
});

describe('buildBreakdown', () => {
  test('returns 11 rows (10 components + total)', () => {
    const rows = buildBreakdown(1200000);
    expect(rows).toHaveLength(11);
  });

  test('last row is total with type "total"', () => {
    const rows = buildBreakdown(1200000);
    const total = rows[rows.length - 1];
    expect(total.type).toBe('total');
    expect(total.label).toContain('Total');
  });

  test('annual total matches input CTC exactly', () => {
    const ctcs = [600000, 1200000, 1800000, 3600000, 500000, 10000000];
    for (const ctc of ctcs) {
      const rows = buildBreakdown(ctc);
      const totalRow = rows.find(r => r.type === 'total');
      expect(totalRow.annual).toBe(ctc);
    }
  });

  test('all component rows have type "earn"', () => {
    const rows = buildBreakdown(1200000);
    const components = rows.filter(r => r.type === 'earn');
    expect(components).toHaveLength(10);
  });

  test('basic pay is 50% of monthly CTC', () => {
    const ctc = 1200000;
    const monthly = ctc / 12; // 100000
    const rows = buildBreakdown(ctc);
    const basic = rows.find(r => r.label === 'Basic Pay');
    expect(basic.monthly).toBe(Math.round(monthly * 0.50));
  });

  test('employer PF is 12% of basic pay', () => {
    const ctc = 1200000;
    const monthly = ctc / 12;
    const basic = Math.round(monthly * 0.50);
    const rows = buildBreakdown(ctc);
    const pf = rows.find(r => r.label.includes('PF'));
    expect(pf.monthly).toBe(Math.round(basic * 0.12));
  });

  test('monthly total equals sum of all component monthlies', () => {
    const rows = buildBreakdown(1200000);
    const components = rows.filter(r => r.type === 'earn');
    const sum = components.reduce((acc, r) => acc + r.monthly, 0);
    const total = rows.find(r => r.type === 'total');
    expect(total.monthly).toBe(sum);
  });

  test('has correct component labels', () => {
    const rows = buildBreakdown(1200000);
    const labels = rows.map(r => r.label);
    expect(labels).toContain('Basic Pay');
    expect(labels).toContain('House Rent Allowance (HRA)');
    expect(labels).toContain('Conveyance Allowance');
    expect(labels).toContain('Medical Allowance');
    expect(labels).toContain('Children Education');
    expect(labels).toContain('Children Hostel Allowance');
    expect(labels).toContain('Special Allowance');
    expect(labels).toContain('Leave Travel Allowance');
    expect(labels).toContain('Differential Allowance');
    expect(labels).toContain("Employer's contribution to PF");
  });
});

describe('formatDate', () => {
  test('formats ISO date to legal format', () => {
    expect(formatDate('2026-03-27')).toBe('27th March 2026');
    expect(formatDate('2026-01-01')).toBe('1st January 2026');
    expect(formatDate('2026-05-02')).toBe('2nd May 2026');
    expect(formatDate('2026-06-03')).toBe('3rd June 2026');
  });

  test('ordinal suffix edge cases', () => {
    expect(formatDate('2026-07-11')).toBe('11th July 2026');
    expect(formatDate('2026-08-12')).toBe('12th August 2026');
    expect(formatDate('2026-09-13')).toBe('13th September 2026');
    expect(formatDate('2026-10-21')).toBe('21st October 2026');
    expect(formatDate('2026-11-22')).toBe('22nd November 2026');
    expect(formatDate('2026-12-23')).toBe('23rd December 2026');
  });

  test('returns empty string for falsy input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  test('returns original string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatTime', () => {
  test('converts 24h to 12h format', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
    expect(formatTime('13:30')).toBe('1:30 PM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('23:59')).toBe('11:59 PM');
    expect(formatTime('19:30')).toBe('7:30 PM');
  });

  test('returns empty string for falsy input', () => {
    expect(formatTime('')).toBe('');
    expect(formatTime(null)).toBe('');
    expect(formatTime(undefined)).toBe('');
  });

  test('returns as-is if already 12h format', () => {
    expect(formatTime('7:30 PM')).toBe('7:30 PM');
    expect(formatTime('10:30 AM')).toBe('10:30 AM');
  });

  test('returns as-is for unparseable input', () => {
    expect(formatTime('invalid')).toBe('invalid');
  });
});
