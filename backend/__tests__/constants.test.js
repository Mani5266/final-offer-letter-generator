'use strict';

const {
  PAGE_W, PAGE_H, MAR_TOP, MAR_BOT, MAR_LEFT, MAR_RIGHT, CONTENT_W,
  C, NUMBERING, SALARY_PERCENTAGES,
} = require('../docGenerator/constants');

describe('constants', () => {
  // ── Page dimensions ────────────────────────────────────────────────────
  describe('page dimensions', () => {
    test('A4 page width', () => {
      expect(PAGE_W).toBe(11906);
    });

    test('A4 page height', () => {
      expect(PAGE_H).toBe(16838);
    });

    test('CONTENT_W = PAGE_W - MAR_LEFT - MAR_RIGHT', () => {
      expect(CONTENT_W).toBe(PAGE_W - MAR_LEFT - MAR_RIGHT);
    });

    test('margins are positive', () => {
      expect(MAR_TOP).toBeGreaterThan(0);
      expect(MAR_BOT).toBeGreaterThan(0);
      expect(MAR_LEFT).toBeGreaterThan(0);
      expect(MAR_RIGHT).toBeGreaterThan(0);
    });
  });

  // ── Colors ─────────────────────────────────────────────────────────────
  describe('colors', () => {
    test('has expected color constants', () => {
      expect(C.BLACK).toBe('000000');
      expect(C.NAVY).toBe('1F3864');
      expect(C.GRAY).toBe('595959');
      expect(C.LGRAY).toBe('D9D9D9');
      expect(C.WHITE).toBe('FFFFFF');
    });

    test('all colors are 6-char hex strings', () => {
      for (const [, val] of Object.entries(C)) {
        expect(val).toMatch(/^[0-9A-Fa-f]{6}$/);
      }
    });
  });

  // ── Numbering ──────────────────────────────────────────────────────────
  describe('numbering', () => {
    test('has config array', () => {
      expect(Array.isArray(NUMBERING.config)).toBe(true);
      expect(NUMBERING.config.length).toBeGreaterThan(0);
    });

    test('first config has reference "alpha-lower"', () => {
      expect(NUMBERING.config[0].reference).toBe('alpha-lower');
    });
  });

  // ── Salary percentages ────────────────────────────────────────────────
  describe('salary percentages', () => {
    test('BASIC is 0.50', () => {
      expect(SALARY_PERCENTAGES.BASIC).toBe(0.50);
    });

    test('HRA is 0.188', () => {
      expect(SALARY_PERCENTAGES.HRA).toBe(0.188);
    });

    test('EMPLOYER_PF_OF_BASIC is 0.12', () => {
      expect(SALARY_PERCENTAGES.EMPLOYER_PF_OF_BASIC).toBe(0.12);
    });

    test('all percentages are positive numbers < 1', () => {
      for (const [, val] of Object.entries(SALARY_PERCENTAGES)) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThan(0);
        expect(val).toBeLessThan(1);
      }
    });

    test('component percentages (excl PF) sum to less than 1', () => {
      const { EMPLOYER_PF_OF_BASIC, ...components } = SALARY_PERCENTAGES;
      const sum = Object.values(components).reduce((a, b) => a + b, 0);
      // Should be < 1 since differential makes up the rest
      expect(sum).toBeLessThan(1);
    });
  });
});
