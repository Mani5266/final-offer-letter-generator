'use strict';

function formatINR(n) {
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function toWords(n) {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + toWords(n % 100) : '');
  if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
  if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
  return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
}

function buildBreakdown(ctc) {
  const monthly   = ctc / 12;
  const basic     = Math.round(monthly * 0.40);
  const hra       = Math.round(basic * 0.50);
  const convey    = 1600;
  const medical   = 1250;
  const special   = Math.round(monthly - basic - hra - convey - medical);
  const grossM    = basic + hra + convey + medical + special;
  const grossA    = grossM * 12;
  const pf        = Math.round(basic * 0.12);
  const pt        = 200;
  const netM      = grossM - pf - pt;

  return [
    { label: 'Basic Salary',                    monthly: basic,   annual: basic * 12,   type: 'earn' },
    { label: 'House Rent Allowance (HRA)',       monthly: hra,     annual: hra * 12,     type: 'earn' },
    { label: 'Conveyance Allowance',             monthly: convey,  annual: convey * 12,  type: 'earn' },
    { label: 'Medical Allowance',                monthly: medical, annual: medical * 12, type: 'earn' },
    { label: 'Special Allowance',                monthly: special, annual: special * 12, type: 'earn' },
    { label: 'Gross Earnings',                   monthly: grossM,  annual: grossA,       type: 'total' },
    { label: 'Provident Fund (Employee – 12%)',  monthly: pf,      annual: pf * 12,      type: 'earn' },
    { label: 'Professional Tax',                 monthly: pt,      annual: pt * 12,      type: 'earn' },
    { label: 'Total Deductions',                 monthly: pf + pt, annual: (pf + pt)*12, type: 'total' },
    { label: 'Net Monthly Take-Home',            monthly: netM,    annual: netM * 12,    type: 'total' },
  ];
}

module.exports = { formatINR, toWords, buildBreakdown };
