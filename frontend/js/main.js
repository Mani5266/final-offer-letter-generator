import { API_URL } from './config.js';
import { v, fmtDate, fmtTime, showAlert, toWords, fmtINR } from './utils.js';
import { onCTCChange } from './salary.js';
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
  document.getElementById('appShell').style.display = 'flex';

  // Set user email in sidebar
  const emailDisplay = document.getElementById('userEmailDisplay');
  const email = user.email || user.user_metadata?.full_name || '';
  if (emailDisplay) emailDisplay.textContent = email;

  // Set avatar initial
  const avatar = document.getElementById('userAvatar');
  if (avatar && email) avatar.textContent = email.charAt(0).toUpperCase();

  loadDraft();
  fetchSidebarDrafts();
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
  const generatorPage = document.getElementById('generatorPage');
  const historyPage = document.getElementById('historyPage');

  if (page === 'generator') {
    generatorPage.style.display = '';
    historyPage.style.display = 'none';
  } else {
    generatorPage.style.display = 'none';
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
  const contentArea = document.querySelector('.content-area');
  if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildReview() {
  const ctc = parseInt(v('annualCTC')) || 0;
  const sections = [
    { title: 'Company', rows: [['Name', v('orgName')], ['Signatory', v('signatoryName')]] },
    { title: 'Employee', rows: [['Name', v('empFullName')], ['Designation', v('designation')]] },
    { title: 'Compensation', rows: [['Annual CTC', fmtINR(ctc)]] },
  ];
  const grid = document.getElementById('reviewGrid');
  if (grid) {
    grid.innerHTML = sections.map(s => `
      <div class="rv-card">
        <h4>${s.title}</h4>
        ${s.rows.map(([k,val]) => `<div class="rv-row"><span>${k}</span><strong>${val || '\u2014'}</strong></div>`).join('')}
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
    onCTCChange();
    goTo(step || 0);
  } catch (e) {}
}

async function resetForm() {
  currentOfferId = null;
  document.querySelectorAll('.form-card input, .form-card select, .form-card textarea').forEach(el => {
    if (el.type === 'date' || el.type === 'time') {
      if (el.id === 'workStart') el.value = '10:30';
      else if (el.id === 'workEnd') el.value = '19:30';
      else el.value = '';
    } else if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else if (el.id === 'breakDuration') {
      el.value = '1 (one) hour';
    } else if (el.id === 'monthlyLeave') {
      el.value = '1.5 (one and a half) days';
    } else if (el.id === 'carryForward') {
      el.value = '4 (four) days';
    } else if (el.id === 'noticePeriod') {
      el.value = '45 (Forty-Five) days';
    } else if (el.id === 'abscondDays') {
      el.value = '3 (three) consecutive working days';
    } else if (el.id === 'firstAid') {
      el.value = 'HR Room';
    } else {
      el.value = '';
    }
  });
  const probation = document.getElementById('probationPeriod');
  if (probation) probation.value = '6 (six) months';
  const wdf = document.getElementById('workDayFrom');
  if (wdf) wdf.value = 'Monday';
  const wdt = document.getElementById('workDayTo');
  if (wdt) wdt.value = 'Saturday';

  onCTCChange();
  goTo(0);
  saveDraft();
  switchPage('generator');

  // Immediately create a DB record so it appears in the sidebar
  try {
    const payload = getPayload();
    const body = { emp_name: 'Untitled', designation: '', annual_ctc: 0, payload };
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) currentOfferId = data.id;
  } catch (e) { /* silent */ }
  fetchSidebarDrafts();
}

// Debounced server save — updates name + payload in DB as user types
let _serverSaveTimer = null;
function debouncedServerSave() {
  if (!currentOfferId) return;
  clearTimeout(_serverSaveTimer);
  _serverSaveTimer = setTimeout(async () => {
    const payload = getPayload();
    const empName = payload.empFullName || 'Untitled';
    const body = { id: currentOfferId, emp_name: empName, designation: payload.designation || '', annual_ctc: payload.annualCTC || 0, payload };
    try {
      await fetch('/api/offers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      fetchSidebarDrafts();
    } catch (e) { /* silent */ }
  }, 800);
}

// ── SIDEBAR DRAFTS ──
async function fetchSidebarDrafts() {
  const container = document.getElementById('sidebarDrafts');
  if (!container) return;

  try {
    const res = await fetch('/api/offers', { headers: getAuthHeaders() });
    const data = await res.json();

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="sidebar-empty">No drafts yet. Create your first offer letter above.</div>';
      return;
    }

    const recent = data.slice(0, 5);
    container.innerHTML = recent.map(o => {
      const name = o.emp_name || 'Untitled';
      const date = formatCardDate(o.created_at);
      const isActive = o.id === currentOfferId ? ' active' : '';
      return `
        <div class="sidebar-draft-item${isActive}" data-id="${o.id}">
          <div class="sidebar-draft-header">
            <div class="sidebar-draft-info">
              <div class="sidebar-draft-name">${name}</div>
              <div class="sidebar-draft-meta">${date}</div>
            </div>
            <div class="sidebar-draft-actions">
              <button class="sidebar-draft-action sidebar-action-edit" data-id="${o.id}" data-name="${name}" title="Rename">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
              <button class="sidebar-draft-action sidebar-action-delete" data-id="${o.id}" title="Delete">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click item body to load into form
    container.querySelectorAll('.sidebar-draft-item').forEach(item => {
      item.onclick = (e) => {
        if (e.target.closest('.sidebar-draft-actions')) return;
        window.regenerateOffer(item.dataset.id);
      };
    });

    // Edit (inline rename) buttons
    container.querySelectorAll('.sidebar-action-edit').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const item = btn.closest('.sidebar-draft-item');
        const nameEl = item.querySelector('.sidebar-draft-name');
        const currentName = btn.dataset.name;
        const id = btn.dataset.id;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'sidebar-draft-edit-input';
        input.value = currentName === 'Untitled' ? '' : currentName;
        input.placeholder = 'Enter name...';
        nameEl.replaceWith(input);
        input.focus();
        input.select();

        const save = async () => {
          const newName = input.value.trim() || 'Untitled';
          input.disabled = true;
          try {
            await fetch('/api/offers', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ id, emp_name: newName })
            });
          } catch (e) { /* silent */ }
          fetchSidebarDrafts();
          if (currentPage === 'history') fetchOffers();
        };

        input.onblur = save;
        input.onkeydown = (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') { fetchSidebarDrafts(); }
        };
      };
    });

    // Delete buttons
    container.querySelectorAll('.sidebar-action-delete').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        window.deleteOffer(btn.dataset.id);
      };
    });
  } catch (e) {
    container.innerHTML = '<div class="sidebar-empty">Unable to load recent drafts.</div>';
  }
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
      showAlert('success', 'Offer saved.');
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
              <span class="offer-detail-label">Organization</span>
              <span class="offer-detail-value">${orgName}</span>
            </div>
            <div class="offer-detail-row">
              <span class="offer-detail-label">Designation</span>
              <span class="offer-detail-value">${designation}</span>
            </div>
            <div class="offer-detail-row">
              <span class="offer-detail-label">Annual CTC</span>
              <span class="offer-detail-value">${fmtINR(ctc)}</span>
            </div>
            <div class="offer-detail-row">
              <span class="offer-detail-label">Joining</span>
              <span class="offer-detail-value">${joiningDate}</span>
            </div>
          </div>
          <div class="offer-card-actions">
            <button class="btn-card btn-regenerate" onclick="window.regenerateOffer('${o.id}')">Re-generate</button>
            <button class="btn-card btn-view-stored" onclick="window.viewStored('${o.id}')">View Details</button>
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
  goTo(5);
};

// View Stored: show offer details in modal
window.viewStored = async (id) => {
  const res = await fetch('/api/offers', { headers: getAuthHeaders() });
  const all = await res.json();
  const o = all.find(x => x.id === id);
  if (!o) return;

  const p = o.payload || {};
  const details = [
    ['Employee', o.emp_name || 'N/A'],
    ['Designation', o.designation || p.designation || 'N/A'],
    ['Organization', p.orgName || 'N/A'],
    ['Annual CTC', fmtINR(o.annual_ctc || 0)],
    ['Joining Date', p.joiningDate || 'N/A'],
    ['Offer Date', p.offerDate || 'N/A'],
    ['Signatory', p.signatoryName || 'N/A'],
    ['Probation', p.probationPeriod || 'N/A'],
  ];

  const modal = document.getElementById('detailModal');
  document.getElementById('modalTitle').textContent = o.emp_name || 'Offer Details';
  document.getElementById('modalBody').innerHTML = details.map(([label, value]) =>
    `<div class="modal-detail-row">
      <span class="modal-detail-label">${label}</span>
      <span class="modal-detail-value">${value}</span>
    </div>`
  ).join('');

  // Wire regenerate button for this specific offer
  const regenBtn = document.getElementById('modalRegenerate');
  regenBtn.onclick = () => {
    modal.classList.remove('open');
    window.regenerateOffer(id);
  };

  modal.classList.add('open');
};

window.deleteOffer = async (id) => {
  if (!confirm('Delete this offer letter?')) return;
  await fetch(`/api/offers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (currentOfferId === id) currentOfferId = null;
  fetchOffers();
  fetchSidebarDrafts();
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

  // Save to records automatically
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

    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = `Offer_${payload.empFullName || 'Letter'}.docx`;
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match) filename = match[1];

    const blob = await res.blob();
    const docxBlob = new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(docxBlob, filename);
    } else {
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 150);
      }, 0);
    }
    showAlert('success', 'Downloaded!');
    fetchSidebarDrafts(); // Refresh sidebar after generation
  } catch (e) { showAlert('error', e.message); }
}

async function init() {
  initAuth();
  const user = await checkSession();
  if (user) handleAuthSuccess(user);

  // Step tab navigation
  document.querySelectorAll('.step-tab').forEach(t => t.onclick = () => goTo(+t.dataset.step));
  document.getElementById('generateBtn').onclick = generate;

  // Save draft on form changes + auto-sync to server
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.oninput = () => { saveDraft(); debouncedServerSave(); };
  });

  // Bind CTC handler
  document.getElementById('annualCTC').oninput = () => { onCTCChange(); saveDraft(); debouncedServerSave(); };

  // Sidebar: New Offer Letter
  document.getElementById('newOfferBtn').onclick = resetForm;

  // Sidebar: View All -> switch to history
  document.getElementById('viewAllBtn').onclick = () => switchPage('history');

  // History page: Refresh
  document.getElementById('refreshListBtn').onclick = fetchOffers;

  // History page: Go to Generator from empty state
  const goToGenBtn = document.getElementById('goToGeneratorBtn');
  if (goToGenBtn) goToGenBtn.onclick = () => switchPage('generator');

  // Modal close buttons
  const detailModal = document.getElementById('detailModal');
  document.getElementById('modalClose').onclick = () => detailModal.classList.remove('open');
  document.getElementById('modalDismiss').onclick = () => detailModal.classList.remove('open');
  detailModal.onclick = (e) => { if (e.target === detailModal) detailModal.classList.remove('open'); };

  // Refresh form button (in Review & Generate step)
  document.getElementById('refreshFormBtn').onclick = resetForm;

  window.goTo = goTo;
}

document.addEventListener('DOMContentLoaded', init);
