// ── UTILS ─────────────────────────────────────────────────────────────────────
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
  ['alertError','alertSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
  const el = document.getElementById(type === 'error' ? 'alertError' : 'alertSuccess');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

export { toWords, fmtINR, v, fmtDate, fmtTime, showAlert };
