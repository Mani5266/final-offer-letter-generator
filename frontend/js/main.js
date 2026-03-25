import { API_URL } from './config.js';
import { v, fmtDate, fmtTime, showAlert, toWords, fmtINR } from './utils.js';
import { onCTCChange } from './salary.js';
import { addAI, sendChat } from './ai.js';
import { login, signup, logout, checkSession } from './auth.js';

let currentStep = 0;
let currentUser = null;
let currentPage = 'generator'; // 'generator' or 'history'

// ── AUTH INTEGRATION ──
function initAuth() {
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authError = document.getElementById('authError');

  loginTab.onclick = () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    authError.style.display = 'none';
  };

  signupTab.onclick = () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
    authError.style.display = 'none';
  };

  document.getElementById('loginSubmit').onclick = async () => {
    const user = await login(v('loginEmail'), v('loginPass'));
    if (user) handleAuthSuccess(user);
  };

  document.getElementById('signupSubmit').onclick = async () => {
    const data = await signup(v('signupEmail'), v('signupPass'), v('signupName'));
    if (data) {
      showAlert('success', 'Signup successful! Please check your email and then login.');
      loginTab.click();
    }
  };

  document.getElementById('logoutBtn').onclick = logout;
}

function handleAuthSuccess(user) {
  currentUser = user;
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('userMenu').style.display = 'flex';
  document.getElementById('headerNav').style.display = 'flex';
  document.getElementById('headerTagline').style.display = 'none';
  document.getElementById('userEmailDisplay').textContent = user.email || user.user_metadata?.full_name || '';
  addAI(`Hello! I'm your AI assistant. Let's generate your offer letter.`);
  loadDraft();
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-user-id': currentUser?.id || ''
  };
}

// ── PAGE NAVIGATION ──
function switchPage(page) {
  currentPage = page;

  // Update nav tabs
  document.querySelectorAll('.header-nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === page);
  });

  // Toggle pages
  const generatorEls = [
    document.querySelector('.progress-wrap'),
    document.querySelector('.steps-nav'),
    document.querySelector('.main')
  ];
  const historyPage = document.getElementById('historyPage');

  if (page === 'generator') {
    generatorEls.forEach(el => { if (el) el.style.display = ''; });
    historyPage.style.display = 'none';
  } else {
    generatorEls.forEach(el => { if (el) el.style.display = 'none'; });
    historyPage.style.display = 'block';
    fetchOffers();
  }
}

// ── NAVIGATION ──
function goTo(n) {
  const prevPane = document.getElementById(`step-${currentStep}`);
  if (prevPane) prevPane.classList.remove('active');
  
  currentStep = n;
  document.getElementById(`step-${n}`).classList.add('active');

  const tabs = document.querySelectorAll('.step-tab');
  tabs.forEach((t, i) => {
    t.classList.remove('active', 'done');
    if (i === n) t.classList.add('active');
    if (i < n)  t.classList.add('done');
  });

  const progress = document.getElementById('progressBar');
  if (progress) progress.style.width = Math.round(n / 5 * 100) + '%';

  if (n === 5) buildReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildReview() {
  const ctc = parseInt(v('annualCTC')) || 0;
  const sections = [
    { title: '🏢 Company', rows: [['Name', v('orgName')], ['Signatory', v('signatoryName')]] },
    { title: '👤 Employee', rows: [['Name', v('empFullName')], ['Designation', v('designation')]] },
    { title: '💰 Compensation', rows: [['Annual CTC', '₹' + fmtINR(ctc)]] },
  ];
  const grid = document.getElementById('reviewGrid');
  if (grid) {
    grid.innerHTML = sections.map(s => `
      <div class="rv-card">
        <h4>${s.title}</h4>
        ${s.rows.map(([k,val]) => `<div class="rv-row"><span>${k}</span><strong>${val || '—'}</strong></div>`).join('')}
      </div>
    `).join('');
  }
}

function validate() {
  const req = ['orgName', 'signatoryName', 'empFullName', 'annualCTC'];
  for (const id of req) if (!v(id)) return 'Fill all required fields';
  return null;
}

// ── PERSISTENCE & HISTORY ──
let currentOfferId = null;

function saveDraft() {
  const draft = { currentStep, data: {} };
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.id) draft.data[el.id] = el.value;
  });
  localStorage.setItem('oneasy_draft', JSON.stringify(draft));
}

function loadDraft() {
  const saved = localStorage.getItem('oneasy_draft');
  if (!saved) return;
  try {
    const { currentStep: step, data } = JSON.parse(saved);
    Object.keys(data).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = data[id];
    });
    onCTCChange();          // recalculate salary breakdown from restored CTC
    goTo(step || 0);
  } catch (e) {}
}

async function saveToRecords() {
  const err = validate();
  if (err) return showAlert('error', err);

  const payload = getPayload();
  const body = { id: currentOfferId, emp_name: payload.empFullName, designation: payload.designation, annual_ctc: payload.annualCTC, payload };

  try {
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      currentOfferId = data.id;
      showAlert('success', '✅ Offer saved.');
    } else throw new Error(data.error);
  } catch (e) { showAlert('error', e.message); }
}

function formatCardDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function fetchOffers() {
  const gridEl = document.getElementById('historyGrid');
  const emptyEl = document.getElementById('historyEmpty');

  try {
    const res = await fetch('/api/offers', { headers: getAuthHeaders() });
    const data = await res.json();

    if (!data || data.length === 0) {
      gridEl.innerHTML = '';
      gridEl.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }

    gridEl.style.display = 'grid';
    emptyEl.style.display = 'none';

    gridEl.innerHTML = data.map(o => {
      const p = o.payload || {};
      const orgName = p.orgName || 'N/A';
      const designation = o.designation || p.designation || 'N/A';
      const ctc = o.annual_ctc || p.annualCTC || 0;
      const joiningDate = p.joiningDate || 'N/A';

      return `
        <div class="offer-card">
          <h3 class="offer-card-name">${o.emp_name || 'Unknown'}</h3>
          <div class="offer-card-date">Generated on ${formatCardDate(o.created_at)}</div>
          <div class="offer-card-divider"></div>
          <div class="offer-card-details">
            <div class="offer-detail-row">
              <span class="offer-detail-label">Organization:</span>
              <span class="offer-detail-value">${orgName}</span>
            </div>
            <div class="offer-detail-row">
              <span class="offer-detail-label">Designation:</span>
              <span class="offer-detail-value">${designation}</span>
            </div>
            <div class="offer-detail-row">
              <span class="offer-detail-label">Annual CTC:</span>
              <span class="offer-detail-value">₹${fmtINR(ctc)}</span>
            </div>
            <div class="offer-detail-row">
              <span class="offer-detail-label">Joining:</span>
              <span class="offer-detail-value">${joiningDate}</span>
            </div>
          </div>
          <div class="offer-card-actions">
            <button class="btn-card btn-regenerate" onclick="window.regenerateOffer('${o.id}')">📄 Re-generate</button>
            <button class="btn-card btn-view-stored" onclick="window.viewStored('${o.id}')">✨ View Stored</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    gridEl.innerHTML = '<div style="padding:2rem;color:var(--error);">Failed to load history.</div>';
  }
}

// Re-generate: load offer into form and switch to generator
window.regenerateOffer = async (id) => {
  const res = await fetch('/api/offers', { headers: getAuthHeaders() });
  const all = await res.json();
  const o = all.find(x => x.id === id);
  if (!o) return;
  currentOfferId = o.id;
  Object.keys(o.payload).forEach(key => {
    const el = document.getElementById(key);
    if (el) el.value = o.payload[key];
  });
  onCTCChange();
  switchPage('generator');
  goTo(5); // Go to Review & Generate
};

// View Stored: show offer details in an alert-style modal
window.viewStored = async (id) => {
  const res = await fetch('/api/offers', { headers: getAuthHeaders() });
  const all = await res.json();
  const o = all.find(x => x.id === id);
  if (!o) return;

  const p = o.payload || {};
  const details = [
    `Employee: ${o.emp_name}`,
    `Designation: ${o.designation}`,
    `Organization: ${p.orgName || 'N/A'}`,
    `Annual CTC: ₹${fmtINR(o.annual_ctc)}`,
    `Joining Date: ${p.joiningDate || 'N/A'}`,
    `Offer Date: ${p.offerDate || 'N/A'}`,
    `Signatory: ${p.signatoryName || 'N/A'}`,
    `Probation: ${p.probationPeriod || 'N/A'}`,
  ];
  alert(details.join('\n'));
};

window.deleteOffer = async (id) => {
  if (!confirm('Delete?')) return;
  await fetch(`/api/offers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  fetchOffers();
};

function getPayload() {
  const p = {};
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.id) p[el.id] = el.value;
  });
  p.annualCTC = parseInt(v('annualCTC')) || 0;
  return p;
}

async function generate() {
  const err = validate();
  if (err) return showAlert('error', err);
  
  const payload = getPayload();

  // Also save to records automatically
  const saveBody = { id: currentOfferId, emp_name: payload.empFullName, designation: payload.designation, annual_ctc: payload.annualCTC, payload };
  try {
    const saveRes = await fetch('/api/offers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(saveBody)
    });
    const saveData = await saveRes.json();
    if (saveRes.ok) currentOfferId = saveData.id;
  } catch (e) { /* silent save error */ }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Generation failed');

    // Read the filename from backend Content-Disposition header
    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = `Offer_${payload.empFullName || 'Letter'}.docx`;
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match) filename = match[1];

    const blob = await res.blob();
    const docxBlob = new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    // Use msSaveBlob for IE/Edge legacy, or navigator approach
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(docxBlob, filename);
    } else {
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      // Use setTimeout to ensure the element is in DOM before clicking
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 150);
      }, 0);
    }
    showAlert('success', 'Downloaded!');
  } catch (e) { showAlert('error', e.message); }
}

async function init() {
  initAuth();
  const user = await checkSession();
  if (user) handleAuthSuccess(user);

  // Step tab navigation
  document.querySelectorAll('.step-tab').forEach(t => t.onclick = () => goTo(+t.dataset.step));
  document.getElementById('chatBtn').onclick = () => sendChat(currentStep);
  document.getElementById('generateBtn').onclick = generate;
  
  // Save draft on form changes
  document.querySelectorAll('input, select, textarea').forEach(el => el.oninput = saveDraft);

  // Bind CTC handler AFTER the generic saveDraft binding so it doesn't get overwritten
  document.getElementById('annualCTC').oninput = () => { onCTCChange(); saveDraft(); };

  // Header nav tab clicks
  document.getElementById('navGenerator').onclick = () => switchPage('generator');
  document.getElementById('navHistory').onclick = () => switchPage('history');

  // Refresh List button
  document.getElementById('refreshListBtn').onclick = fetchOffers;

  // Go to Generator from empty state
  const goToGenBtn = document.getElementById('goToGeneratorBtn');
  if (goToGenBtn) goToGenBtn.onclick = () => switchPage('generator');

  window.goTo = goTo;
}

document.addEventListener('DOMContentLoaded', init);
