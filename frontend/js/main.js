import { API_URL } from './config.js';
import { v, fmtDate, fmtTime, showAlert, toWords, fmtINR, escapeHTML } from './utils.js';
import { onCTCChange } from './salary.js';
import { login, signup, logout, checkSession, getAccessToken, onAuthStateChange, supabase } from './auth.js';

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
    loginTab.setAttribute('aria-selected', 'true');
    signupTab.classList.remove('active');
    signupTab.setAttribute('aria-selected', 'false');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    authError.classList.add('hidden');
  };

  signupTab.onclick = () => {
    signupTab.classList.add('active');
    signupTab.setAttribute('aria-selected', 'true');
    loginTab.classList.remove('active');
    loginTab.setAttribute('aria-selected', 'false');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    authError.classList.add('hidden');
  };

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmit');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const user = await login(v('loginEmail'), v('loginPass'));
      if (user) handleAuthSuccess(user);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Confirm password match
    if (v('signupPass') !== v('signupPassConfirm')) {
      const errEl = document.getElementById('authError');
      if (errEl) { errEl.textContent = 'Passwords do not match'; errEl.classList.remove('hidden'); }
      return;
    }
    const btn = document.getElementById('signupSubmit');
    btn.disabled = true;
    btn.textContent = 'Creating account…';
    try {
      const data = await signup(v('signupEmail'), v('signupPass'), v('signupName'));
      if (data) {
        showAlert('success', 'Signup successful! Please check your email and then login.');
        loginTab.click();
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

  document.getElementById('logoutBtn').onclick = logout;
}

function handleAuthSuccess(user) {
  currentUser = user;
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');

  // Set user email in sidebar
  const emailDisplay = document.getElementById('userEmailDisplay');
  const email = user.email || user.user_metadata?.full_name || '';
  if (emailDisplay) emailDisplay.textContent = email;

  // Set avatar initial
  const avatar = document.getElementById('userAvatar');
  if (avatar && email) avatar.textContent = email.charAt(0).toUpperCase();

  loadDraft();
  fetchSidebarDrafts();
  loadCompanyProfiles();
}

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

// ── SUPABASE CRUD HELPERS ──
async function dbInsertOffer({ emp_name, designation, annual_ctc, payload }) {
  const { data, error } = await supabase
    .from('offers')
    .insert({ user_id: currentUser.id, emp_name, designation, annual_ctc, payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateOffer(id, updates) {
  const { data, error } = await supabase
    .from('offers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbGetOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function dbGetOfferById(id) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function dbDeleteOffer(id) {
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Upsert helper: insert if no id, update if id exists
async function dbSaveOffer({ id, emp_name, designation, annual_ctc, payload }) {
  if (id) {
    return await dbUpdateOffer(id, { emp_name, designation, annual_ctc, payload });
  } else {
    return await dbInsertOffer({ emp_name, designation, annual_ctc, payload });
  }
}

// ── COMPANY PROFILE CRUD ──
const COMPANY_PROFILE_FIELDS = ['orgName', 'entityType', 'cin', 'officeAddress', 'signatoryName', 'signatoryDesig', 'firstAid'];

async function dbGetCompanyProfiles() {
  const { data, error } = await supabase
    .from('company_profiles')
    .select('*')
    .order('profile_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function dbGetCompanyProfileById(id) {
  const { data, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function dbInsertCompanyProfile(profile) {
  const { data, error } = await supabase
    .from('company_profiles')
    .insert({ user_id: currentUser.id, ...profile })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDeleteCompanyProfile(id) {
  const { error } = await supabase
    .from('company_profiles')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function loadCompanyProfiles() {
  const select = document.getElementById('companyProfileSelect');
  if (!select) return;
  // Show loading state
  select.innerHTML = '<option value="">Loading profiles\u2026</option>';
  select.disabled = true;
  try {
    const profiles = await dbGetCompanyProfiles();
    // Keep the first "-- Select --" option, replace the rest
    select.innerHTML = '<option value="">-- Select a saved profile --</option>' +
      profiles.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.profile_name)}</option>`).join('');
    select.disabled = false;
  } catch (e) {
    console.error('Failed to load company profiles:', e);
    select.innerHTML = '<option value="">Failed to load profiles</option>';
    select.disabled = false;
  }
}

function applyCompanyProfile(profile) {
  const fieldMap = {
    orgName: profile.org_name,
    entityType: profile.entity_type,
    cin: profile.cin,
    officeAddress: profile.office_address,
    signatoryName: profile.signatory_name,
    signatoryDesig: profile.signatory_desig,
    firstAid: profile.first_aid,
  };
  for (const [fieldId, value] of Object.entries(fieldMap)) {
    const el = document.getElementById(fieldId);
    if (el && value !== undefined) el.value = value;
  }
  saveDraft();
  debouncedServerSave();
}

function getCompanyProfileFromForm() {
  return {
    org_name: v('orgName') || '',
    entity_type: v('entityType') || 'Company',
    cin: v('cin') || '',
    office_address: v('officeAddress') || '',
    signatory_name: v('signatoryName') || '',
    signatory_desig: v('signatoryDesig') || '',
    first_aid: v('firstAid') || 'HR Room',
  };
}

// ── PAGE NAVIGATION ──
// _skipHashPush prevents infinite loops when restoring state from popstate
let _skipHashPush = false;

function switchPage(page) {
  currentPage = page;
  const generatorPage = document.getElementById('generatorPage');
  const historyPage = document.getElementById('historyPage');

  if (page === 'generator') {
    generatorPage.classList.remove('hidden');
    historyPage.classList.add('hidden');
    if (!_skipHashPush) updateHash();
  } else {
    generatorPage.classList.add('hidden');
    historyPage.classList.remove('hidden');
    if (!_skipHashPush) location.hash = '#history';
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
    t.setAttribute('aria-selected', i === n ? 'true' : 'false');
    if (i === n) t.classList.add('active');
    if (i < n)  t.classList.add('done');
  });

  const progress = document.getElementById('progressBar');
  if (progress) progress.setAttribute('data-step', n);

  if (n === 5) buildReview();
  const contentArea = document.querySelector('.content-area');
  if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });

  if (!_skipHashPush && currentPage === 'generator') updateHash();
}

// ── HASH ROUTING ──
function updateHash() {
  const hash = `#generator/${currentStep}`;
  if (location.hash !== hash) location.hash = hash;
}

function restoreFromHash() {
  const hash = location.hash;
  if (!hash) return;

  _skipHashPush = true;
  if (hash === '#history') {
    switchPage('history');
  } else if (hash.startsWith('#generator')) {
    const parts = hash.split('/');
    const step = parseInt(parts[1]);
    switchPage('generator');
    goTo(isNaN(step) ? 0 : Math.min(Math.max(step, 0), 5));
  }
  _skipHashPush = false;
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
        <h4>${escapeHTML(s.title)}</h4>
        ${s.rows.map(([k,val]) => `<div class="rv-row"><span>${escapeHTML(k)}</span><strong>${escapeHTML(val) || '\u2014'}</strong></div>`).join('')}
      </div>
    `).join('');
  }
}

// Map field IDs to their step number for auto-navigation
const FIELD_STEP_MAP = {
  orgName: 0, entityType: 0, cin: 0, officeAddress: 0, signatoryName: 0, signatoryDesig: 0, firstAid: 0,
  salutation: 1, empFullName: 1, empAddress: 1, designation: 1, employeeId: 1, reportingManager: 1, attendanceSystem: 1,
  annualCTC: 2,
  offerDate: 3, offerValidity: 3, joiningDate: 3, probationPeriod: 3, workDayFrom: 3, workDayTo: 3, workStart: 3, workEnd: 3, breakDuration: 3,
  monthlyLeave: 4, carryForward: 4, noticePeriod: 4, abscondDays: 4,
};

// Required fields with labels for error messages
const REQUIRED_FIELDS = [
  { id: 'orgName', label: 'Organization Name' },
  { id: 'officeAddress', label: 'Office Address' },
  { id: 'signatoryName', label: 'Signatory Name' },
  { id: 'signatoryDesig', label: 'Signatory Designation' },
  { id: 'empFullName', label: 'Employee Name' },
  { id: 'designation', label: 'Designation' },
  { id: 'annualCTC', label: 'Annual CTC' },
  { id: 'offerDate', label: 'Offer Date' },
  { id: 'offerValidity', label: 'Offer Validity Date' },
  { id: 'joiningDate', label: 'Joining Date' },
];

function clearFieldErrors() {
  document.querySelectorAll('.field.error').forEach(f => f.classList.remove('error'));
  document.querySelectorAll('.field-error-msg').forEach(m => m.remove());
}

function markFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const fieldWrap = el.closest('.field');
  if (!fieldWrap) return;
  fieldWrap.classList.add('error');
  // Add error message below field if not already present
  if (!fieldWrap.querySelector('.field-error-msg')) {
    const errEl = document.createElement('div');
    errEl.className = 'field-error-msg';
    errEl.textContent = msg;
    fieldWrap.appendChild(errEl);
  }
}

function validate() {
  clearFieldErrors();
  const errors = [];
  for (const { id, label } of REQUIRED_FIELDS) {
    if (!v(id)) {
      errors.push({ id, label });
      markFieldError(id, `${label} is required`);
    }
  }

  // CTC must be a positive number
  const ctcVal = parseInt(v('annualCTC')) || 0;
  if (ctcVal <= 0 && !errors.find(e => e.id === 'annualCTC')) {
    errors.push({ id: 'annualCTC', label: 'Annual CTC' });
    markFieldError('annualCTC', 'Annual CTC must be greater than zero');
  }

  // Cross-field date validation
  const offerDate = v('offerDate');
  const offerValidity = v('offerValidity');
  const joiningDate = v('joiningDate');
  if (offerDate && offerValidity && offerDate >= offerValidity) {
    errors.push({ id: 'offerValidity', label: 'Offer Validity Date' });
    markFieldError('offerValidity', 'Offer validity must be after the offer date');
  }
  if (offerDate && joiningDate && offerDate > joiningDate) {
    errors.push({ id: 'joiningDate', label: 'Joining Date' });
    markFieldError('joiningDate', 'Joining date must not be before the offer date');
  }

  if (errors.length === 0) return null;

  // Navigate to the step of the first error
  const firstErrorStep = FIELD_STEP_MAP[errors[0].id];
  if (firstErrorStep !== undefined && firstErrorStep !== currentStep) {
    goTo(firstErrorStep);
  }

  // Focus the first error field after a brief delay (to allow step transition)
  setTimeout(() => {
    const el = document.getElementById(errors[0].id);
    if (el) el.focus();
  }, 100);

  const fieldList = errors.map(e => e.label).join(', ');
  return `Please fill required fields: ${fieldList}`;
}

// ── PERSISTENCE & HISTORY ──
let currentOfferId = null;

function saveDraft() {
  const draft = { currentStep, currentOfferId, data: {} };
  // Only collect form-card inputs — excludes auth fields (loginPass, signupPass, etc.)
  document.querySelectorAll('.form-card input, .form-card select, .form-card textarea').forEach(el => {
    if (el.id) draft.data[el.id] = el.value;
  });
  const key = currentUser ? `oneasy_draft_${currentUser.id}` : 'oneasy_draft';
  localStorage.setItem(key, JSON.stringify(draft));
}

function loadDraft() {
  const key = currentUser ? `oneasy_draft_${currentUser.id}` : 'oneasy_draft';
  const saved = localStorage.getItem(key);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    const { currentStep: step, data } = parsed;
    // Restore currentOfferId if persisted
    if (parsed.currentOfferId) currentOfferId = parsed.currentOfferId;
    Object.keys(data).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = data[id];
    });
    onCTCChange();
    goTo(step || 0);
  } catch (e) {
    console.error('Failed to load draft:', e);
  }
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
  fetchSidebarDrafts();
}

// Debounced server save — creates or updates the DB record as user types
let _serverSaveTimer = null;
// Debounced sidebar refresh — avoids refetching on every auto-save keystroke
let _sidebarRefreshTimer = null;
function debouncedSidebarRefresh() {
  clearTimeout(_sidebarRefreshTimer);
  _sidebarRefreshTimer = setTimeout(() => fetchSidebarDrafts(), 3000);
}
function debouncedServerSave() {
  clearTimeout(_serverSaveTimer);
  _serverSaveTimer = setTimeout(async () => {
    const payload = getPayload();
    const empName = payload.empFullName || 'Untitled';

    // Skip auto-save if user hasn't entered any meaningful data yet
    if (!currentOfferId && empName === 'Untitled' && !payload.orgName && !payload.designation) return;

    try {
      const saved = await dbSaveOffer({
        id: currentOfferId,
        emp_name: empName,
        designation: payload.designation || '',
        annual_ctc: payload.annualCTC || 0,
        payload
      });
      // Capture the new ID on first insert
      if (!currentOfferId) {
        currentOfferId = saved.id;
        saveDraft(); // Persist the new ID to localStorage
      }
      debouncedSidebarRefresh();
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, 800);
}

// ── SIDEBAR DRAFTS ──
async function fetchSidebarDrafts() {
  const container = document.getElementById('sidebarDrafts');
  if (!container) return;

  // Show loading state
  container.innerHTML = '<div class="sidebar-empty sidebar-loading">Loading drafts\u2026</div>';

  try {
    const data = await dbGetOffers();

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="sidebar-empty">No drafts yet. Create your first offer letter above.</div>';
      return;
    }

    const recent = data.slice(0, 5);
    container.innerHTML = recent.map(o => {
      const name = escapeHTML(o.emp_name || 'Untitled');
      const designation = escapeHTML(o.designation || o.payload?.designation || '');
      const date = escapeHTML(formatCardDate(o.created_at));
      const isActive = o.id === currentOfferId ? ' active' : '';
      const safeId = escapeHTML(o.id);
      return `
        <div class="sidebar-draft-item${isActive}" data-id="${safeId}">
          <div class="sidebar-draft-header">
            <div class="sidebar-draft-info">
              <div class="sidebar-draft-name">${name}</div>
              ${designation ? `<div class="sidebar-draft-designation">${designation}</div>` : ''}
              <div class="sidebar-draft-meta">${date}</div>
            </div>
            <div class="sidebar-draft-actions">
              <button class="sidebar-draft-action sidebar-action-generate" data-id="${safeId}" title="Generate Doc">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </button>
              <button class="sidebar-draft-action sidebar-action-edit" data-id="${safeId}" data-name="${name}" title="Rename">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
              <button class="sidebar-draft-action sidebar-action-delete" data-id="${safeId}" title="Delete">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click item body to load into form for editing (step 0)
    container.querySelectorAll('.sidebar-draft-item').forEach(item => {
      item.onclick = (e) => {
        if (e.target.closest('.sidebar-draft-actions')) return;
        editOffer(item.dataset.id);
      };
    });

    // Generate Doc buttons — load offer and trigger generation
    container.querySelectorAll('.sidebar-action-generate').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await regenerateOffer(id);
        generate();
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
            await dbUpdateOffer(id, { emp_name: newName });
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
        deleteOffer(btn.dataset.id);
      };
    });
  } catch (e) {
    console.error('Failed to fetch sidebar drafts:', e);
    container.innerHTML = '<div class="sidebar-empty">Unable to load recent drafts.</div>';
  }
}

async function saveToRecords() {
  const err = validate();
  if (err) return showAlert('error', err);

  const payload = getPayload();
  try {
    const saved = await dbSaveOffer({
      id: currentOfferId,
      emp_name: payload.empFullName,
      designation: payload.designation,
      annual_ctc: payload.annualCTC,
      payload
    });
    currentOfferId = saved.id;
    showAlert('success', 'Offer saved.');
  } catch (e) {
    showAlert('error', e.message);
  }
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

  // Show loading state
  emptyEl.classList.add('hidden');
  gridEl.classList.remove('hidden');
  gridEl.innerHTML = '<div class="sidebar-empty sidebar-loading history-grid-status">Loading offer history\u2026</div>';

  try {
    const data = await dbGetOffers();

    if (!data || data.length === 0) {
      gridEl.innerHTML = '';
      gridEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      return;
    }

    gridEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');

    gridEl.innerHTML = data.map(o => {
      const p = o.payload || {};
      const orgName = escapeHTML(p.orgName || 'N/A');
      const designation = escapeHTML(o.designation || p.designation || 'N/A');
      const ctc = o.annual_ctc || p.annualCTC || 0;
      const joiningDate = escapeHTML(p.joiningDate || 'N/A');
      const empName = escapeHTML(o.emp_name || 'Unknown');
      const safeId = escapeHTML(o.id);
      const hasDoc = !!o.doc_url;

      return `
        <div class="offer-card" data-offer-id="${safeId}">
          <h3 class="offer-card-name">${empName}</h3>
          <div class="offer-card-date">Generated on ${escapeHTML(formatCardDate(o.created_at))}</div>
          ${hasDoc ? '<div class="offer-card-badge">Document saved</div>' : ''}
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
              <span class="offer-detail-value">${escapeHTML(fmtINR(ctc))}</span>
            </div>
            <div class="offer-detail-row">
              <span class="offer-detail-label">Joining</span>
              <span class="offer-detail-value">${joiningDate}</span>
            </div>
          </div>
          <div class="offer-card-actions">
            ${hasDoc ? '<button class="btn-card btn-download-offer" data-action="download">Download</button>' : ''}
            <button class="btn-card btn-regenerate" data-action="regenerate">Re-generate</button>
            <button class="btn-card btn-edit-offer" data-action="edit">Edit</button>
            <button class="btn-card btn-duplicate-offer" data-action="duplicate">Duplicate</button>
            <button class="btn-card btn-view-stored" data-action="view">View Details</button>
            <button class="btn-card btn-delete-offer" data-action="delete">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind card action buttons via true event delegation on grid container
    // (single listener, works regardless of timing / re-renders)
    gridEl.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const card = btn.closest('.offer-card');
      if (!card) return;
      const id = card.dataset.offerId;
      const action = btn.dataset.action;
      if (action === 'download')   downloadStoredDoc(id);
      if (action === 'regenerate') regenerateOffer(id);
      if (action === 'edit')       editOffer(id);
      if (action === 'duplicate')  duplicateOffer(id);
      if (action === 'view')       viewStored(id);
      if (action === 'delete')     deleteOffer(id);
    };
  } catch (e) {
    console.error('fetchOffers error:', e);
    gridEl.innerHTML = '<div class="history-grid-error">Failed to load history. Check console for details.</div>';
  }
}

// Re-generate: load offer into form and switch to generator (Review step)
async function regenerateOffer(id) {
  try {
    const o = await dbGetOfferById(id);
    if (!o) return;
    currentOfferId = o.id;
    Object.keys(o.payload).forEach(key => {
      const el = document.getElementById(key);
      if (el) el.value = o.payload[key];
    });
    onCTCChange();
    switchPage('generator');
    goTo(5);
  } catch (e) {
    console.error('Failed to load offer:', e);
  }
}

// Edit: load offer into form at step 0 for full editing
async function editOffer(id) {
  try {
    const o = await dbGetOfferById(id);
    if (!o) return;
    currentOfferId = o.id;
    Object.keys(o.payload).forEach(key => {
      const el = document.getElementById(key);
      if (el) el.value = o.payload[key];
    });
    onCTCChange();
    switchPage('generator');
    goTo(0);
    fetchSidebarDrafts();
  } catch (e) {
    console.error('Failed to load offer for editing:', e);
  }
}

// Duplicate: copy an offer's payload into a new offer and open for editing
async function duplicateOffer(id) {
  try {
    const o = await dbGetOfferById(id);
    if (!o) return;

    // Create a new offer record with copied data
    const payload = { ...(o.payload || {}) };
    const newName = `${o.emp_name || 'Untitled'} (Copy)`;

    const saved = await dbInsertOffer({
      emp_name: newName,
      designation: o.designation || payload.designation || '',
      annual_ctc: o.annual_ctc || payload.annualCTC || 0,
      payload,
    });

    // Load the new offer into the form
    currentOfferId = saved.id;
    Object.keys(payload).forEach(key => {
      const el = document.getElementById(key);
      if (el) el.value = payload[key];
    });

    // Update the employee name field to include "(Copy)"
    const nameEl = document.getElementById('empFullName');
    if (nameEl && nameEl.value === o.emp_name) {
      nameEl.value = newName;
    }

    onCTCChange();
    const wasOnHistory = currentPage === 'history';
    switchPage('generator');
    goTo(0);
    saveDraft();
    fetchSidebarDrafts();
    if (wasOnHistory) fetchOffers();
    showAlert('success', `Duplicated offer for "${o.emp_name || 'Untitled'}". Edit and generate.`);
  } catch (e) {
    console.error('Failed to duplicate offer:', e);
    showAlert('error', 'Failed to duplicate offer.');
  }
}

// View Stored: show offer details in modal
async function viewStored(id) {
  try {
    const o = await dbGetOfferById(id);
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

    document.getElementById('modalTitle').textContent = o.emp_name || 'Offer Details';
    document.getElementById('modalBody').innerHTML = details.map(([label, value]) =>
      `<div class="modal-detail-row">
        <span class="modal-detail-label">${escapeHTML(label)}</span>
        <span class="modal-detail-value">${escapeHTML(value)}</span>
      </div>`
    ).join('');

    const regenBtn = document.getElementById('modalRegenerate');
    regenBtn.onclick = () => {
      closeModal();
      regenerateOffer(id);
    };

    const editBtn = document.getElementById('modalEdit');
    editBtn.onclick = () => {
      closeModal();
      editOffer(id);
    };

    const deleteBtn = document.getElementById('modalDelete');
    deleteBtn.onclick = () => {
      closeModal();
      deleteOffer(id);
    };

    const duplicateBtn = document.getElementById('modalDuplicate');
    duplicateBtn.onclick = () => {
      closeModal();
      duplicateOffer(id);
    };

    // Show/hide download button based on doc availability
    const modalDownloadBtn = document.getElementById('modalDownload');
    if (o.doc_url) {
      modalDownloadBtn.classList.remove('hidden');
      modalDownloadBtn.onclick = () => {
        downloadStoredDoc(id);
      };
    } else {
      modalDownloadBtn.classList.add('hidden');
    }

    openModal();
  } catch (e) {
    console.error('Failed to load offer details:', e);
  }
}

async function deleteOffer(id) {
  if (!confirm('Delete this offer letter?')) return;
  try {
    await dbDeleteOffer(id);
    if (currentOfferId === id) currentOfferId = null;
    fetchOffers();
    fetchSidebarDrafts();
  } catch (e) {
    console.error('Failed to delete offer:', e);
  }
}

// Download stored doc from Supabase Storage
async function downloadStoredDoc(id) {
  try {
    const o = await dbGetOfferById(id);
    if (!o || !o.doc_url) {
      showAlert('error', 'No document found. Please re-generate it first.');
      return;
    }

    const { data: blob, error } = await supabase.storage
      .from('offer-docs')
      .download(o.doc_url);

    if (error) throw error;

    const filename = o.doc_url.split('/').pop() || `Offer_${o.emp_name}.docx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.classList.add('hidden');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  } catch (e) {
    console.error('Download failed:', e);
    showAlert('error', 'Failed to download document. Try re-generating.');
  }
}

function getPayload() {
  const p = {};
  // Only collect form-card inputs — excludes auth fields (loginPass, signupPass, etc.)
  document.querySelectorAll('.form-card input, .form-card select, .form-card textarea').forEach(el => {
    if (el.id) p[el.id] = el.value;
  });
  p.annualCTC = parseInt(v('annualCTC')) || 0;
  return p;
}

async function generate() {
  const err = validate();
  if (err) return showAlert('error', err);

  // Show spinner and disable generate button to prevent duplicate submissions
  const spinnerWrap = document.getElementById('spinnerWrap');
  const generateBtn = document.getElementById('generateBtn');
  if (spinnerWrap) spinnerWrap.classList.remove('hidden');
  if (generateBtn) generateBtn.disabled = true;

  // Hide PDF button from previous generation
  const printPdfBtn = document.getElementById('printPdfBtn');
  const pdfHint = document.getElementById('pdfHint');
  if (printPdfBtn) printPdfBtn.classList.add('hidden');
  if (pdfHint) pdfHint.classList.add('hidden');

  const payload = getPayload();
  const empName = payload.empFullName || 'Untitled';

  // Save to records automatically using direct Supabase call
  try {
    const saved = await dbSaveOffer({
      id: currentOfferId,
      emp_name: empName,
      designation: payload.designation,
      annual_ctc: payload.annualCTC,
      payload
    });
    currentOfferId = saved.id;
    // Immediately refresh sidebar so the offer appears under the employee name
    await fetchSidebarDrafts();
  } catch (e) {
    console.error('Save failed:', e);
  }

  // Generate the DOCX document and store in Supabase Storage
  try {
    // Include _offerId so backend can upload to Storage under the correct path
    const generatePayload = { ...payload, _offerId: currentOfferId };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(generatePayload)
    });
    if (!res.ok) {
      // Parse the backend's structured error response
      let errMsg = 'Generation failed';
      try {
        const errBody = await res.json();
        if (errBody.details && Array.isArray(errBody.details)) {
          errMsg = errBody.details.join('; ');
        } else if (errBody.error) {
          errMsg = errBody.error;
        }
      } catch (_) { /* response wasn't JSON — use generic message */ }
      throw new Error(errMsg);
    }

    // Backend already updates doc_url in the DB after uploading to Storage.
    // No need for a duplicate frontend update.

    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = `Offer_${empName}.docx`;
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match) filename = match[1];

    const blob = await res.blob();
    const docxBlob = new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const url = URL.createObjectURL(docxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.classList.add('hidden');
    document.body.appendChild(a);
    setTimeout(() => {
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    }, 0);
    showAlert('success', 'Downloaded & saved to cloud!');

    // Show "Save as PDF" button after successful generation
    const printPdfBtn = document.getElementById('printPdfBtn');
    const pdfHint = document.getElementById('pdfHint');
    if (printPdfBtn) printPdfBtn.classList.remove('hidden');
    if (pdfHint) pdfHint.classList.remove('hidden');

    fetchSidebarDrafts(); // Refresh sidebar after generation
    if (currentPage === 'history') fetchOffers();
  } catch (e) {
    showAlert('error', e.message);
  } finally {
    // Always hide spinner and re-enable button
    if (spinnerWrap) spinnerWrap.classList.add('hidden');
    if (generateBtn) generateBtn.disabled = false;
  }
}

// ── PRINT / PDF VIEW ──
function openPrintView(d) {
  const orgName = escapeHTML(d.orgName || '');
  const empName = escapeHTML(d.empFullName || '');
  const designation = escapeHTML(d.designation || '');
  const ctc = d.annualCTC || 0;
  const ctcFormatted = fmtINR(ctc);
  const ctcWords = toWords(ctc);
  const offerDate = fmtDate(d.offerDate);
  const joiningDate = fmtDate(d.joiningDate);
  const offerValidity = fmtDate(d.offerValidity);
  const workDays = `${escapeHTML(d.workDayFrom || 'Monday')} to ${escapeHTML(d.workDayTo || 'Saturday')}`;
  const workTime = `${fmtTime(d.workStart)} to ${fmtTime(d.workEnd)} IST`;
  const salute = escapeHTML(d.salutation || 'Mr.');
  const firstName = escapeHTML((d.empFullName || '').split(' ')[0]);

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Offer Letter - ${empName}</title>
<style>
  @media print {
    @page { margin: 2cm; size: A4; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; max-width: 210mm; margin: 0 auto; padding: 2cm; }
  h1 { text-align: center; font-size: 16pt; margin-bottom: 1.5em; text-decoration: underline; }
  h2 { text-align: center; font-size: 14pt; margin: 2em 0 0.5em; text-decoration: underline; }
  .label-value { margin-bottom: 0.3em; }
  .label { font-weight: bold; }
  .clause { margin: 1em 0 0.5em; font-weight: bold; }
  .indent { margin-left: 2em; }
  .sig-block { margin-top: 3em; }
  .print-bar { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; color: #fff; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; z-index: 9999; font-family: sans-serif; font-size: 14px; }
  .print-bar button { background: #fff; color: #0f172a; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; }
  .print-bar button:hover { background: #e2e8f0; }
  .print-body { margin-top: 40px; }
</style>
</head><body>
<div class="print-bar no-print">
  <span>Print preview - Use Ctrl+P or click the button to save as PDF</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>
<div class="print-body">

<h1>OFFER LETTER</h1>
<div class="label-value"><span class="label">Date:</span> ${offerDate}</div>
<p>To,<br><strong>${empName}</strong><br>${escapeHTML(d.empAddress || '')}</p>
<p><span class="label">Subject:</span> Offer of Employment as ${designation}</p>
<p>Dear ${salute} ${firstName},</p>

<p class="clause">1. Offer of Employment</p>
<p class="indent">On behalf of <strong>${orgName}</strong>, we are pleased to offer you the position of <strong>${designation}</strong> in our organization.</p>

<p class="clause">2. Compensation</p>
<p class="indent">Your annual compensation will be <strong>INR ${ctcFormatted}</strong> (${ctcWords} Only). The detailed breakdown is provided in Annexure A.</p>

<p class="clause">3. Date of Joining</p>
<p class="indent">Your proposed date of joining is <strong>${joiningDate}</strong>.</p>

<p class="clause">4. Working Hours</p>
<p class="indent">Working days: <strong>${workDays}</strong>, from <strong>${workTime}</strong>.</p>

<p class="clause">5. Validity of Offer</p>
<p class="indent">This offer is valid until <strong>${offerValidity}</strong>.</p>

<div class="sig-block">
<p>Yours sincerely,</p>
<p><strong>For ${orgName}</strong></p>
<br>
<p>________________________________</p>
<p><strong>${escapeHTML(d.signatoryName || '')}</strong><br>${escapeHTML(d.signatoryDesig || '')}</p>
</div>

</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    showAlert('error', 'Pop-up blocked. Please allow pop-ups for this site.');
  }
}

let _modalTriggerEl = null; // element that opened the modal, to return focus
const detailModal = document.getElementById('detailModal');

function openModal() {
  _modalTriggerEl = document.activeElement;
  detailModal.classList.add('open');
  // Move focus into the modal after animation settles
  requestAnimationFrame(() => {
    const closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.focus();
  });
}

function closeModal() {
  detailModal.classList.remove('open');
  // Return focus to the element that triggered the modal
  if (_modalTriggerEl && typeof _modalTriggerEl.focus === 'function') {
    _modalTriggerEl.focus();
    _modalTriggerEl = null;
  }
}

async function init() {
  initAuth();
  const user = await checkSession();
  if (user) handleAuthSuccess(user);

  // Listen for session changes (expiry, sign out from another tab)
  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      // Session expired or user signed out — show auth overlay
      currentUser = null;
      document.getElementById('appShell').classList.add('hidden');
      document.getElementById('authOverlay').classList.remove('hidden');
      showAlert('error', 'Your session has expired. Please sign in again.');
    } else if (event === 'SIGNED_IN' && session?.user && !currentUser) {
      // Signed in from another tab or after token refresh
      handleAuthSuccess(session.user);
    }
  });

  // Step tab navigation
  document.querySelectorAll('.step-tab').forEach(t => t.onclick = () => goTo(+t.dataset.step));

  // Navigation buttons (data-goto attribute replaces inline onclick handlers)
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => goTo(+btn.dataset.goto));
  });

  document.getElementById('generateBtn').onclick = generate;

  // "Save as PDF" button: opens a print-friendly view for browser print-to-PDF
  document.getElementById('printPdfBtn').onclick = () => {
    const payload = getPayload();
    openPrintView(payload);
  };

  // Save draft on form changes + auto-sync to server + clear field errors
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.oninput = () => {
      // Clear error state on this field when user types
      const fieldWrap = el.closest('.field');
      if (fieldWrap && fieldWrap.classList.contains('error')) {
        fieldWrap.classList.remove('error');
        const errMsg = fieldWrap.querySelector('.field-error-msg');
        if (errMsg) errMsg.remove();
      }
      saveDraft();
      debouncedServerSave();
    };
  });

  // Bind CTC handler — use addEventListener so the generic oninput (error-clearing + draft save) is preserved
  document.getElementById('annualCTC').addEventListener('input', () => { onCTCChange(); });

  // Sidebar: New Offer Letter
  document.getElementById('newOfferBtn').onclick = resetForm;

  // Sidebar: View All -> switch to history
  document.getElementById('viewAllBtn').onclick = () => switchPage('history');

  // History page: Refresh
  document.getElementById('refreshListBtn').onclick = fetchOffers;

  // History page: Go to Generator from empty state
  const goToGenBtn = document.getElementById('goToGeneratorBtn');
  if (goToGenBtn) goToGenBtn.onclick = () => switchPage('generator');

  // ── MODAL EVENT BINDINGS ──
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalDismiss').onclick = closeModal;
  detailModal.onclick = (e) => { if (e.target === detailModal) closeModal(); };

  // Focus trap: keep Tab cycling within the modal when open
  detailModal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const modalEl = detailModal.querySelector('.modal');
    if (!modalEl) return;
    const focusable = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Escape key closes the modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('open')) {
      closeModal();
    }
  });

  // Refresh form button (in Review & Generate step)
  document.getElementById('refreshFormBtn').onclick = resetForm;

  // ── COMPANY PROFILE HANDLERS ──
  const profileSelect = document.getElementById('companyProfileSelect');
  const deleteProfileBtn = document.getElementById('deleteProfileBtn');

  if (profileSelect) {
    profileSelect.onchange = async () => {
      const selectedId = profileSelect.value;
      if (!selectedId) {
        if (deleteProfileBtn) deleteProfileBtn.classList.add('hidden');
        return;
      }
      try {
        const profile = await dbGetCompanyProfileById(selectedId);
        if (profile) {
          applyCompanyProfile(profile);
          showAlert('success', `Loaded profile "${profile.profile_name}".`);
        }
        if (deleteProfileBtn) deleteProfileBtn.classList.remove('hidden');
      } catch (e) {
        showAlert('error', 'Failed to load profile.');
      }
    };
  }

  document.getElementById('saveProfileBtn').onclick = async () => {
    const orgName = v('orgName');
    if (!orgName) {
      showAlert('error', 'Enter an Organization Name before saving a profile.');
      return;
    }
    const profileName = prompt('Profile name:', orgName);
    if (!profileName) return;

    try {
      await dbInsertCompanyProfile({
        profile_name: profileName.trim(),
        ...getCompanyProfileFromForm(),
      });
      await loadCompanyProfiles();
      showAlert('success', `Profile "${profileName.trim()}" saved.`);
    } catch (e) {
      showAlert('error', 'Failed to save profile: ' + e.message);
    }
  };

  if (deleteProfileBtn) {
    deleteProfileBtn.onclick = async () => {
      const selectedId = profileSelect?.value;
      if (!selectedId) return;
      if (!confirm('Delete this company profile?')) return;
      try {
        await dbDeleteCompanyProfile(selectedId);
        await loadCompanyProfiles();
        if (deleteProfileBtn) deleteProfileBtn.classList.add('hidden');
        showAlert('success', 'Profile deleted.');
      } catch (e) {
        showAlert('error', 'Failed to delete profile.');
      }
    };
  }

  // Mobile hamburger menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const sidebar = document.querySelector('.sidebar');

  function toggleMobileMenu() {
    const isOpen = sidebar.classList.contains('mobile-open');
    sidebar.classList.toggle('mobile-open', !isOpen);
    mobileMenuBtn.classList.toggle('open', !isOpen);
    mobileOverlay.classList.toggle('open', !isOpen);
  }

  function closeMobileMenu() {
    sidebar.classList.remove('mobile-open');
    mobileMenuBtn.classList.remove('open');
    mobileOverlay.classList.remove('open');
  }

  if (mobileMenuBtn) mobileMenuBtn.onclick = toggleMobileMenu;
  if (mobileOverlay) mobileOverlay.onclick = closeMobileMenu;

  // Close mobile menu when a sidebar action is taken
  const newBtn = document.getElementById('newOfferBtn');
  const allBtn = document.getElementById('viewAllBtn');
  if (newBtn) {
    const originalHandler = newBtn.onclick;
    newBtn.onclick = () => { closeMobileMenu(); if (originalHandler) originalHandler(); };
  }
  if (allBtn) {
    const originalHandler = allBtn.onclick;
    allBtn.onclick = () => { closeMobileMenu(); if (originalHandler) originalHandler(); };
  }

  // Hash-based routing: restore state from URL hash and listen for back/forward
  window.addEventListener('hashchange', restoreFromHash);
  if (location.hash) {
    restoreFromHash();
  } else {
    // Set initial hash
    location.hash = '#generator/0';
  }
}

document.addEventListener('DOMContentLoaded', init);
