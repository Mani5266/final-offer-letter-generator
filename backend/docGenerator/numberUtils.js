'use strict';

// CANONICAL SOURCE for toWords(), formatINR(), and buildBreakdown().
// Frontend copies exist in frontend/js/utils.js (toWords, fmtINR)
// and frontend/js/salary.js (buildBreakdown). Keep in sync when modifying.

const { SALARY_PERCENTAGES: SP } = require('./constants');

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

/**
 * Converts an ISO date string (e.g. '2026-03-27') to a legal-friendly format.
 * Output: '27th March 2026'
 * Returns the original string unchanged if parsing fails.
 */
function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00'); // force local midnight to avoid timezone shift
  if (isNaN(d.getTime())) return isoStr;

  const day = d.getDate();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  // Ordinal suffix
  const suffix = (day % 10 === 1 && day !== 11) ? 'st'
    : (day % 10 === 2 && day !== 12) ? 'nd'
    : (day % 10 === 3 && day !== 13) ? 'rd'
    : 'th';

  return `${day}${suffix} ${month} ${year}`;
}

/**
 * Converts a 24-hour time string (e.g. '19:30') to 12-hour format ('7:30 PM').
 * If the input is already in 12h format (contains AM/PM) or is empty, returns as-is.
 */
function formatTime(timeStr) {
  if (!timeStr) return '';
  // Already in 12h format
  if (/[AaPp][Mm]/.test(timeStr)) return timeStr;

  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return timeStr;

  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${period}`;
}

module.exports = { formatINR, toWords, buildBreakdown, formatDate, formatTime };
