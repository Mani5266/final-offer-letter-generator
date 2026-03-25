// ── SALARY ────────────────────────────────────────────────────────────────────
import { toWords, fmtINR } from './utils.js';

function buildBreakdown(ctc) {
  const m  = ctc / 12;
  const basic   = Math.round(m * 0.40);
  const hra     = Math.round(basic * 0.50);
  const convey  = 1600;
  const medical = 1250;
  const special = Math.round(m - basic - hra - convey - medical);
  const grossM  = basic + hra + convey + medical + special;
  const pf      = Math.round(basic * 0.12);
  const pt      = 200;
  const netM    = grossM - pf - pt;
  return [
    { label: 'Basic Salary',                    monthly: basic,    annual: basic*12,    type:'earn' },
    { label: 'House Rent Allowance (HRA)',       monthly: hra,      annual: hra*12,      type:'earn' },
    { label: 'Conveyance Allowance',             monthly: convey,   annual: convey*12,   type:'earn' },
    { label: 'Medical Allowance',                monthly: medical,  annual: medical*12,  type:'earn' },
    { label: 'Special Allowance',                monthly: special,  annual: special*12,  type:'earn' },
    { label: 'Gross Earnings',                   monthly: grossM,   annual: grossM*12,   type:'total' },
    { label: 'Provident Fund (Employee – 12%)',  monthly: pf,       annual: pf*12,       type:'earn' },
    { label: 'Professional Tax',                 monthly: pt,       annual: pt*12,       type:'earn' },
    { label: 'Total Deductions',                 monthly: pf+pt,    annual: (pf+pt)*12,  type:'total' },
    { label: 'Net Monthly Take-Home',            monthly: netM,     annual: netM*12,     type:'total' },
  ];
}

function onCTCChange() {
  const ctc = parseInt(document.getElementById('annualCTC').value) || 0;
  const wordsEl = document.getElementById('salaryWords');
  const box     = document.getElementById('salaryBox');
  if (!ctc) { 
    if (wordsEl) wordsEl.textContent = ''; 
    if (box) box.style.display = 'none'; 
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
  if (box) box.style.display = 'block';
}

export { buildBreakdown, onCTCChange };
