import { API_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { v, fmtDate, fmtTime, showAlert, toWords, fmtINR, escapeHTML } from './utils.js';
import { onCTCChange } from './salary.js';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentStep = 0;
let currentPage = 'generator'; // 'generator' or 'history'

function getHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ── SUPABASE CRUD HELPERS ──
async function dbInsertOffer({ emp_name, designation, annual_ctc, payload }) {
  const { data, error } = await supabase
    .from('offers')
    .insert({ emp_name, designation, annual_ctc, payload })
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

// ── COMPANY LOGO ──
let _companyLogoBase64 = ''; // stores "data:image/png;base64,..." or empty

const MAX_LOGO_SIZE = 500 * 1024; // 500 KB

function initLogoUpload() {
  const area = document.getElementById('logoUploadArea');
  const fileInput = document.getElementById('logoFileInput');
  const placeholder = document.getElementById('logoPlaceholder');
  const preview = document.getElementById('logoPreview');
  const previewImg = document.getElementById('logoPreviewImg');
  const removeBtn = document.getElementById('logoRemoveBtn');
  if (!area || !fileInput) return;

  // Click to upload
  area.addEventListener('click', (e) => {
    if (e.target === removeBtn || removeBtn.contains(e.target)) return;
    fileInput.click();
  });

  // Drag & drop
  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) processLogoFile(file);
  });

  // File input change
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) processLogoFile(file);
    fileInput.value = ''; // reset so same file can be re-selected
  });

  // Remove button
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearLogo();
    saveDraft();
    debouncedServerSave();
  });

  function processLogoFile(file) {
    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showAlert('error', 'Invalid file type. Please upload PNG, JPG, or SVG.');
      return;
    }
    // Validate size
    if (file.size > MAX_LOGO_SIZE) {
      showAlert('error', 'Logo file must be under 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      _companyLogoBase64 = reader.result;
      showLogoPreview(_companyLogoBase64);
      saveDraft();
      debouncedServerSave();
    };
    reader.readAsDataURL(file);
  }
}

function showLogoPreview(dataUrl) {
  const placeholder = document.getElementById('logoPlaceholder');
  const preview = document.getElementById('logoPreview');
  const previewImg = document.getElementById('logoPreviewImg');
  if (!placeholder || !preview || !previewImg) return;
  previewImg.src = dataUrl;
  placeholder.classList.add('hidden');
  preview.classList.remove('hidden');
}

function clearLogo() {
  _companyLogoBase64 = '';
  const placeholder = document.getElementById('logoPlaceholder');
  const preview = document.getElementById('logoPreview');
  const previewImg = document.getElementById('logoPreviewImg');
  if (placeholder) placeholder.classList.remove('hidden');
  if (preview) preview.classList.add('hidden');
  if (previewImg) previewImg.src = '';
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
    { title: 'Company', rows: [['Name', v('orgName')], ['Signatory', v('signatoryName')]], logo: _companyLogoBase64 },
    { title: 'Employee', rows: [['Name', v('empFullName')], ['Designation', v('designation')]] },
    { title: 'Compensation', rows: [['Annual CTC', fmtINR(ctc)]] },
  ];
  const grid = document.getElementById('reviewGrid');
  if (grid) {
    grid.innerHTML = sections.map(s => `
      <div class="rv-card">
        <h4>${escapeHTML(s.title)}</h4>
        ${s.logo ? `<div class="rv-row"><span>Logo</span><img src="${s.logo}" alt="Logo" class="rv-logo-thumb"/></div>` : ''}
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
  offerDate: 3, offerValidity: 3, joiningDate: 3, probationPeriod: 3, customProbationValue: 3, workDayFrom: 3, workDayTo: 3, workStart: 3, workEnd: 3, breakDuration: 3,
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

  // Custom probation must have a value
  const probSel = document.getElementById('probationPeriod');
  if (probSel && probSel.value === 'custom') {
    const customVal = parseInt(v('customProbationValue')) || 0;
    if (customVal < 1) {
      errors.push({ id: 'customProbationValue', label: 'Custom Probation Period' });
      markFieldError('customProbationValue', 'Enter a valid probation period number');
    }
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
  // Only collect form-card inputs
  document.querySelectorAll('.form-card input, .form-card select, .form-card textarea').forEach(el => {
    if (el.id) draft.data[el.id] = el.value;
  });
  // Persist company logo (base64)
  if (_companyLogoBase64) draft.companyLogo = _companyLogoBase64;
  localStorage.setItem('oneasy_draft', JSON.stringify(draft));
}

function loadDraft() {
  const saved = localStorage.getItem('oneasy_draft');
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
    // Restore company logo
    if (parsed.companyLogo) {
      _companyLogoBase64 = parsed.companyLogo;
      showLogoPreview(_companyLogoBase64);
    }
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
  if (probation) {
    probation.value = '6 (six) months';
    delete probation.dataset.customComposed;
  }
  // Reset custom probation fields
  const customProbWrap = document.getElementById('customProbationWrap');
  if (customProbWrap) customProbWrap.classList.add('hidden');
  const customProbVal = document.getElementById('customProbationValue');
  if (customProbVal) { customProbVal.value = ''; customProbVal.required = false; }
  const customProbUnit = document.getElementById('customProbationUnit');
  if (customProbUnit) customProbUnit.value = 'months';
  const wdf = document.getElementById('workDayFrom');
  if (wdf) wdf.value = 'Monday';
  const wdt = document.getElementById('workDayTo');
  if (wdt) wdt.value = 'Saturday';

  // Reset company logo
  clearLogo();

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

/* ── Custom Probation Period ── */
function initCustomProbation() {
  const sel = document.getElementById('probationPeriod');
  const wrap = document.getElementById('customProbationWrap');
  const numInput = document.getElementById('customProbationValue');
  const unitSel = document.getElementById('customProbationUnit');
  if (!sel || !wrap || !numInput || !unitSel) return;

  function toggleCustom() {
    if (sel.value === 'custom') {
      wrap.classList.remove('hidden');
      numInput.required = true;
    } else {
      wrap.classList.add('hidden');
      numInput.required = false;
    }
  }

  function composeCustomValue() {
    if (sel.value !== 'custom') return;
    const n = parseInt(numInput.value);
    if (!n || n < 1) return;
    const unit = unitSel.value; // 'days' or 'months'
    // Build the document-ready string, e.g. "45 (forty-five) days"
    const words = numberToWords(n);
    sel.dataset.customComposed = `${n} (${words}) ${unit}`;
  }

  sel.addEventListener('change', () => { toggleCustom(); composeCustomValue(); saveDraft(); });
  numInput.addEventListener('input', () => { composeCustomValue(); saveDraft(); });
  unitSel.addEventListener('change', () => { composeCustomValue(); saveDraft(); });

  // Run once on load in case draft restored 'custom'
  toggleCustom();
  composeCustomValue();
}

/** Convert a positive integer to English words (supports up to 9999). */
function numberToWords(n) {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '');
  return numberToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
}

function getPayload() {
  const p = {};
  // Collect form-card inputs
  document.querySelectorAll('.form-card input, .form-card select, .form-card textarea').forEach(el => {
    if (el.id) p[el.id] = el.value;
  });
  p.annualCTC = parseInt(v('annualCTC')) || 0;
  // Resolve custom probation period
  const probSel = document.getElementById('probationPeriod');
  if (probSel && probSel.value === 'custom' && probSel.dataset.customComposed) {
    p.probationPeriod = probSel.dataset.customComposed;
  }
  // Include company logo if uploaded
  if (_companyLogoBase64) {
    p.companyLogo = _companyLogoBase64;
  }
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
      headers: getHeaders(),
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
  // Load dashboard directly
  loadDraft();
  fetchSidebarDrafts();

  // Step tab navigation
  document.querySelectorAll('.step-tab').forEach(t => t.onclick = () => goTo(+t.dataset.step));

  // Navigation buttons (data-goto attribute replaces inline onclick handlers)
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => goTo(+btn.dataset.goto));
  });

  document.getElementById('generateBtn').onclick = generate;

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

  // Custom Probation Period handler
  initCustomProbation();

  // Company Logo upload handler
  initLogoUpload();

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
