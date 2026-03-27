// ── SALARY ────────────────────────────────────────────────────────────────────
import { toWords, fmtINR } from './utils.js';

// NOTE: buildBreakdown() is duplicated in backend/docGenerator/numberUtils.js.
// The backend copy is the canonical source. Keep both in sync when modifying.

// Salary percentage constants — must match backend/docGenerator/constants.js SALARY_PERCENTAGES
const SP = {
  BASIC:                0.50,
  HRA:                  0.188,
  CONVEYANCE:           0.047,
  MEDICAL:              0.0282,
  CHILDREN_EDU:         0.0094,
  CHILDREN_HOST:        0.0094,
  SPECIAL:              0.047,
  LTA:                  0.047,
  EMPLOYER_PF_OF_BASIC: 0.12,
};

/**
 * Builds salary breakdown matching the standard Indian CTC structure.
 * CTC = Total of all components including Employer's PF contribution.
 *
 * Allocation (% of monthly CTC):
 *   Basic Pay          50.00%
 *   HRA                18.80%
 *   Conveyance          4.70%
 *   Medical             2.82%
 *   Children Education  0.94%
 *   Children Hostel     0.94%
 *   Special Allowance   4.70%
 *   Leave Travel        4.70%
 *   Employer PF        12% of Basic
 *   Differential       Remainder (balancing figure)
 */
function buildBreakdown(ctc) {
  const monthly    = ctc / 12;
  const basic      = Math.round(monthly * SP.BASIC);
  const hra        = Math.round(monthly * SP.HRA);
  const convey     = Math.round(monthly * SP.CONVEYANCE);
  const medical    = Math.round(monthly * SP.MEDICAL);
  const childEdu   = Math.round(monthly * SP.CHILDREN_EDU);
  const childHost  = Math.round(monthly * SP.CHILDREN_HOST);
  const special    = Math.round(monthly * SP.SPECIAL);
  const lta        = Math.round(monthly * SP.LTA);
  const empPF      = Math.round(basic * SP.EMPLOYER_PF_OF_BASIC);

  // Differential is the balancing figure to ensure total = monthly CTC exactly
  const allocated  = basic + hra + convey + medical + childEdu + childHost + special + lta + empPF;
  const diff       = Math.round(monthly) - allocated;

  const totalM     = basic + hra + convey + medical + childEdu + childHost + special + lta + diff + empPF;

  // For annual: use component * 12, but adjust Differential annual so total annual = input CTC exactly
  const annualFixed = (basic + hra + convey + medical + childEdu + childHost + special + lta + empPF) * 12;
  const diffAnnual  = ctc - annualFixed;

  return [
    { label: 'Basic Pay',                         monthly: basic,     annual: basic * 12,     type: 'earn' },
    { label: 'House Rent Allowance (HRA)',         monthly: hra,       annual: hra * 12,       type: 'earn' },
    { label: 'Conveyance Allowance',               monthly: convey,    annual: convey * 12,    type: 'earn' },
    { label: 'Medical Allowance',                  monthly: medical,   annual: medical * 12,   type: 'earn' },
    { label: 'Children Education',                 monthly: childEdu,  annual: childEdu * 12,  type: 'earn' },
    { label: 'Children Hostel Allowance',          monthly: childHost, annual: childHost * 12, type: 'earn' },
    { label: 'Special Allowance',                  monthly: special,   annual: special * 12,   type: 'earn' },
    { label: 'Leave Travel Allowance',             monthly: lta,       annual: lta * 12,       type: 'earn' },
    { label: 'Differential Allowance',             monthly: diff,      annual: diffAnnual,     type: 'earn' },
    { label: "Employer's contribution to PF",      monthly: empPF,     annual: empPF * 12,     type: 'earn' },
    { label: 'Total Salary (in Rs.)',              monthly: totalM,    annual: ctc,            type: 'total' },
  ];
}

function onCTCChange() {
  const ctc = parseInt(document.getElementById('annualCTC').value) || 0;
  const wordsEl = document.getElementById('salaryWords');
  const box     = document.getElementById('salaryBox');
  if (!ctc) {
    if (wordsEl) wordsEl.textContent = '';
    if (box) box.classList.add('hidden');
    return;
  }
  if (wordsEl) wordsEl.textContent = 'INR ' + toWords(ctc) + ' Only';
  const rows = buildBreakdown(ctc);
  const tbody = document.getElementById('salaryTbody');
  if (tbody) {
    tbody.innerHTML = rows.map(r => {
      const cls = r.type === 'total' ? ' class="total"' : '';
      return `<tr${cls}><td>${r.label}</td><td>${fmtINR(r.monthly)}</td><td>${fmtINR(r.annual)}</td></tr>`;
    }).join('');
  }
  if (box) box.classList.remove('hidden');
}

export { buildBreakdown, onCTCChange };
