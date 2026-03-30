'use strict';

const { AlignmentType, BorderStyle, LevelFormat } = require('docx');

// ─── PAGE CONSTANTS (exact from template XML) ────────────────────────────────
const PAGE_W    = 11906;  // A4
const PAGE_H    = 16838;
const MAR_TOP   = 1440;
const MAR_BOT   = 1440;
const MAR_LEFT  = 1440;
const MAR_RIGHT = 1700;
// Content width in DXA = page_w - left - right = 11906 - 1440 - 1700 = 8766
const CONTENT_W = 8766;

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = { 
  BLACK: '000000', 
  NAVY: '1F3864', 
  GRAY: '595959', 
  LGRAY: 'D9D9D9', 
  WHITE: 'FFFFFF' 
};

// ─── NUMBERING CONFIG ─────────────────────────────────────────────────────────
const NUMBERING = {
  config: [
    {
      reference: 'alpha-lower',
      levels: [{
        level: 0,
        format: LevelFormat.LOWER_LETTER,
        text: '%1.',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
  ],
};

// ─── SALARY BREAKDOWN PERCENTAGES ────────────────────────────────────────────
// Allocation as fraction of monthly CTC (except PF which is fraction of Basic)
const SALARY_PERCENTAGES = {
  BASIC:          0.50,
  HRA:            0.188,
  CONVEYANCE:     0.047,
  MEDICAL:        0.0282,
  CHILDREN_EDU:   0.0094,
  CHILDREN_HOST:  0.0094,
  SPECIAL:        0.047,
  LTA:            0.047,
  EMPLOYER_PF_OF_BASIC: 0.12,
};

module.exports = {
  PAGE_W, PAGE_H, MAR_TOP, MAR_BOT, MAR_LEFT, MAR_RIGHT, CONTENT_W,
  C, NUMBERING, SALARY_PERCENTAGES
};
