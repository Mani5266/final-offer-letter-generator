'use strict';

const { singleBorder, allBorders, noBorders, run, p, blank, pageBreak, docTitle, labelValue, clauseHead, subClause, body } = require('../docGenerator/helpers');
const { Paragraph, TextRun, BorderStyle } = require('docx');

describe('helpers', () => {
  // ── Border helpers ────────────────────────────────────────────────────
  describe('singleBorder', () => {
    test('returns SINGLE border with defaults', () => {
      const b = singleBorder();
      expect(b.style).toBe(BorderStyle.SINGLE);
      expect(b.color).toBe('auto');
      expect(b.size).toBe(4);
    });

    test('accepts custom color and size', () => {
      const b = singleBorder('FF0000', 8);
      expect(b.color).toBe('FF0000');
      expect(b.size).toBe(8);
    });
  });

  describe('allBorders', () => {
    test('returns all four sides', () => {
      const b = allBorders();
      expect(b.top).toBeDefined();
      expect(b.bottom).toBeDefined();
      expect(b.left).toBeDefined();
      expect(b.right).toBeDefined();
      expect(b.top.style).toBe(BorderStyle.SINGLE);
    });
  });

  describe('noBorders', () => {
    test('returns NIL borders on all sides', () => {
      const b = noBorders();
      expect(b.top.style).toBe(BorderStyle.NIL);
      expect(b.bottom.style).toBe(BorderStyle.NIL);
      expect(b.left.size).toBe(0);
    });
  });

  // ── Run builder ────────────────────────────────────────────────────────
  describe('run', () => {
    test('creates TextRun instance', () => {
      const r = run('Hello');
      expect(r).toBeInstanceOf(TextRun);
    });

    test('handles null/undefined text', () => {
      const r = run(null);
      expect(r).toBeInstanceOf(TextRun);
    });

    test('handles number text', () => {
      const r = run(42);
      expect(r).toBeInstanceOf(TextRun);
    });
  });

  // ── Paragraph builder ──────────────────────────────────────────────────
  describe('p', () => {
    test('creates Paragraph instance from string', () => {
      const para = p('Hello world');
      expect(para).toBeInstanceOf(Paragraph);
    });

    test('creates Paragraph from array of strings', () => {
      const para = p(['Hello', ' world']);
      expect(para).toBeInstanceOf(Paragraph);
    });

    test('creates Paragraph from array of TextRuns', () => {
      const para = p([run('Hello'), run(' world')]);
      expect(para).toBeInstanceOf(Paragraph);
    });
  });

  // ── Blank lines ────────────────────────────────────────────────────────
  describe('blank', () => {
    test('returns array of empty paragraphs', () => {
      const result = blank(3);
      expect(result).toHaveLength(3);
      result.forEach(para => expect(para).toBeInstanceOf(Paragraph));
    });

    test('defaults to 1 blank line', () => {
      const result = blank();
      expect(result).toHaveLength(1);
    });
  });

  // ── Page break ─────────────────────────────────────────────────────────
  describe('pageBreak', () => {
    test('returns Paragraph instance', () => {
      expect(pageBreak()).toBeInstanceOf(Paragraph);
    });
  });

  // ── Doc title ──────────────────────────────────────────────────────────
  describe('docTitle', () => {
    test('returns Paragraph instance', () => {
      expect(docTitle('OFFER LETTER')).toBeInstanceOf(Paragraph);
    });
  });

  // ── Label-value ────────────────────────────────────────────────────────
  describe('labelValue', () => {
    test('returns Paragraph instance', () => {
      expect(labelValue('Date: ', '1st April 2026')).toBeInstanceOf(Paragraph);
    });
  });

  // ── Clause head ────────────────────────────────────────────────────────
  describe('clauseHead', () => {
    test('returns Paragraph instance', () => {
      expect(clauseHead(1, 'Offer of Employment')).toBeInstanceOf(Paragraph);
    });
  });

  // ── Sub-clause ─────────────────────────────────────────────────────────
  describe('subClause', () => {
    test('creates Paragraph from string', () => {
      expect(subClause('1.1', 'Your employment starts on...')).toBeInstanceOf(Paragraph);
    });

    test('creates Paragraph from TextRun array', () => {
      expect(subClause('1.2', [run('Clause text')])).toBeInstanceOf(Paragraph);
    });
  });

  // ── Body text ──────────────────────────────────────────────────────────
  describe('body', () => {
    test('creates Paragraph from string', () => {
      expect(body('Paragraph text')).toBeInstanceOf(Paragraph);
    });

    test('creates Paragraph from TextRun array', () => {
      expect(body([run('Text')])).toBeInstanceOf(Paragraph);
    });
  });
});
