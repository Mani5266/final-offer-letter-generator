// ── UTILS ─────────────────────────────────────────────────────────────────────

// NOTE: toWords() and fmtINR() are duplicated in backend/docGenerator/numberUtils.js.
// The backend copy is the canonical source. Keep both in sync when modifying.

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function toWords(n) {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  if (n < 20)  return ONES[n];
  if (n < 100) return TENS[Math.floor(n/10)] + (n%10 ? ' ' + ONES[n%10] : '');
  if (n < 1000) return ONES[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and ' + toWords(n%100) : '');
  if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
  if (n < 10000000) return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + toWords(n%100000) : '');
  return toWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + toWords(n%10000000) : '');
}

function fmtINR(n) { return new Intl.NumberFormat('en-IN').format(Math.round(n)); }

function v(id) { return (document.getElementById(id)?.value || '').trim(); }

function fmtDate(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtTime(t) {
  if (!t) return '—';
  const [h, mi] = t.split(':');
  const hr = +h; const ap = hr >= 12 ? 'PM' : 'AM';
  return `${hr%12||12}:${mi} ${ap}`;
}

function showAlert(type, msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : 'success'}`;
  toast.setAttribute('role', 'alert');

  const text = document.createElement('span');
  text.textContent = msg;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.onclick = () => dismissToast(toast);

  toast.appendChild(text);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Auto-dismiss after 5 seconds (errors stay 7 seconds)
  const duration = type === 'error' ? 7000 : 5000;
  toast._dismissTimer = setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._dismissTimer);
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  // Fallback removal in case animationend doesn't fire
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
}

/**
 * Escape HTML special characters to prevent XSS when inserting user data via innerHTML.
 * @param {string} str - Untrusted string to escape
 * @returns {string} HTML-safe string
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { toWords, fmtINR, v, fmtDate, fmtTime, showAlert, escapeHTML };
