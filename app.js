/* ============================================================
   SureSlot — Application Logic (UI v2)
   Inspired by KPSFLEX Dashboard
   ============================================================ */

// ── Constants ──────────────────────────────────────────────
// Clinical constants and logic now handled by persistence.js

const NHS_BASELINE = {
  totalDNAs: 16_000_000,
  totalCost: 1_300_000_000,
  costPerDNA: 81.25,
  serviceImpact: 7_400_000     // Local clinical impact
};

// ── State ──────────────────────────────────────────────────
let patients = [];
let patientCounter = 0;

// Risk Engine functions now handled by persistence.js

// ── Sidebar Navigation ─────────────────────────────────────────
function initNavigation() {
  const links = document.querySelectorAll('.sidebar__link');
  const panels = document.querySelectorAll('.tab-panel');
  const pageTitle = document.getElementById('page-title');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      // Allow normal navigation for links with href (e.g. Patient Intake)
      if (link.getAttribute('href')) return;
      e.preventDefault();

      // Handle scroll-to links (Patient Intake)
      const scrollTarget = link.dataset.scroll;
      if (scrollTarget) {
        // Make sure we're on the dashboard tab first
        links.forEach(l => l.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="dashboard"]').classList.add('active');
        document.getElementById('dashboard').classList.add('active');
        pageTitle.textContent = 'Main Dashboard';

        // Smooth scroll to the form
        setTimeout(() => {
          const target = document.getElementById(scrollTarget);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Highlight the Patient Intake link
        link.classList.add('active');
        return;
      }

      // Handle tab links
      const targetTab = link.dataset.tab;
      if (!targetTab) return;

      links.forEach(l => l.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      link.classList.add('active');
      document.getElementById(targetTab).classList.add('active');

      if (targetTab === 'dashboard') pageTitle.textContent = 'Main Dashboard';
      if (targetTab === 'analytics') pageTitle.textContent = 'Savings Analytics';
    });
  });
}

// ── Dropdown Toggles ──────────────────────────────────────────
function initDropdowns() {
  const pairs = [
    ['btn-notifications', 'dropdown-notifications'],
    ['btn-info', 'dropdown-info'],
    ['btn-profile', 'dropdown-profile']
  ];

  pairs.forEach(([btnId, dropId]) => {
    const btn = document.getElementById(btnId);
    const drop = document.getElementById(dropId);
    if (!btn || !drop) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drop.style.display === 'block';
      // Close all dropdowns first
      document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
      // Toggle the clicked one
      drop.style.display = isOpen ? 'none' : 'block';
    });
  });

  // Click outside closes all dropdowns
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
  });
}

// ── Form Handling ──────────────────────────────────────────
function initForm() {
  const form = document.getElementById('dna-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const inputs = {
      previousDNA: parseInt(document.getElementById('previousDNA').value) || 0,
      recentDNA: parseInt(document.getElementById('recentDNA').value) || 0,
      noConfirmation: parseInt(document.getElementById('noConfirmation').value) || 0,
      leadTimeDays: parseInt(document.getElementById('leadTimeDays').value) || 0,
      distanceMiles: parseFloat(document.getElementById('distanceMiles').value) || 0,
      clinicDNARate: parseFloat(document.getElementById('clinicDNARate').value) || 0,
      prepRequired: document.getElementById('prepRequired').checked ? 1 : 0,
      newPatient: document.getElementById('newPatient').checked ? 1 : 0
    };

    const patientName = document.getElementById('patientName').value.trim() || `Patient ${++patientCounter}`;
    const riskPercent = calculateDNARisk(inputs);
    const tier = getTier(riskPercent);

    const patient = {
      id: Date.now(),
      name: patientName,
      risk: riskPercent,
      tier,
      inputs,
      timestamp: new Date()
    };

    patients.unshift(patient);
    savePatients(patients); // PERSIST
    renderFeed();
    updateStats();
    form.reset();

    // Visual feedback
    const btn = form.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Assessment Complete';
    setTimeout(() => btn.innerHTML = originalText, 2000);
  });
}

// ── Populate Form with Patient Data ───────────────────────
function populateForm(patient) {
  const inp = patient.inputs;
  document.getElementById('patientName').value = patient.name;
  document.getElementById('previousDNA').value = inp.previousDNA;
  document.getElementById('recentDNA').value = inp.recentDNA;
  document.getElementById('noConfirmation').value = inp.noConfirmation;
  document.getElementById('leadTimeDays').value = inp.leadTimeDays;
  document.getElementById('distanceMiles').value = inp.distanceMiles;
  document.getElementById('clinicDNARate').value = inp.clinicDNARate;
  document.getElementById('prepRequired').checked = inp.prepRequired === 1;
  document.getElementById('newPatient').checked = inp.newPatient === 1;

  // Switch to dashboard, scroll to form
  const panels = document.querySelectorAll('.tab-panel');
  const links = document.querySelectorAll('.sidebar__link');
  links.forEach(l => l.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="dashboard"]').classList.add('active');
  document.getElementById('dashboard').classList.add('active');
  document.getElementById('page-title').textContent = 'Main Dashboard';

  // Highlight Patient Intake link
  const intakeLink = document.querySelector('[data-scroll="dna-form"]');
  if (intakeLink) intakeLink.classList.add('active');

  setTimeout(() => {
    document.getElementById('dna-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Flash the form to indicate data was loaded
    const form = document.getElementById('dna-form');
    form.style.outline = '3px solid var(--primary)';
    form.style.outlineOffset = '8px';
    form.style.transition = 'outline 0.4s ease';
    setTimeout(() => { form.style.outline = 'none'; }, 1500);
  }, 150);
}

// ── Render Feed ────────────────────────────────────────────
function renderFeed() {
  const container = document.getElementById('risk-feed');
  if (!container) return;

  // Only keep the 4 most recent/top patients on live feed as requested
  const visiblePatients = patients.slice(0, 4);

  if (visiblePatients.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-sec); font-weight: 600;">No assessments processed today.</div>`;
    return;
  }

  const now = new Date();

  container.innerHTML = visiblePatients.map((p, idx) => {
    const isNew = p.timestamp && (now - p.timestamp < 60000); // New if added in last 60 seconds
    const newClass = isNew ? 'feed-item--new' : '';
    const newTag = isNew ? '<div class="feed-item__new-tag">NEW</div>' : '';

    return `
      <div class="feed-item ${newClass}" data-patient-idx="${idx}" style="cursor:pointer" title="Click to view ${escapeHtml(p.name)}'s data">
        ${newTag}
        <div class="feed-item__circle risk--${p.tier.key}">${p.risk}%</div>
        <div class="feed-item__info">
          <div class="feed-item__name">${escapeHtml(p.name)}</div>
          <div class="feed-item__meta">
            <span class="feed-item__badge badge--${p.tier.key}">${p.tier.key.toUpperCase()} RISK</span>
            <span style="font-size:0.7rem; color:var(--text-sec); font-weight:700;">• ${p.tier.intervention}</span>
          </div>
        </div>
        <div class="feed-item__action">${p.tier.icon}</div>
      </div>
    `;
  }).join('');

  // Attach click handlers to each feed item
  container.querySelectorAll('.feed-item[data-patient-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.patientIdx);
      if (patients[idx]) populateForm(patients[idx]);
    });
  });
}

// ── Update Dashboard Stats ─────────────────────────────────
function updateStats() {
  const total = patients.length;
  const counts = { low: 0, medium: 0, high: 0, veryhigh: 0 };
  patients.forEach(p => counts[p.tier.key]++);

  // Hero Banner Stats
  document.getElementById('stat-total-hero').textContent = total;
  document.getElementById('stat-high-hero').textContent = counts.high + counts.veryhigh;

  // Stat Cards
  document.getElementById('stat-low').textContent = counts.low;
  document.getElementById('stat-medium').textContent = counts.medium;
  document.getElementById('stat-high').textContent = counts.high;
  document.getElementById('stat-veryhigh').textContent = counts.veryhigh;
}

// ── Savings Calculator ─────────────────────────────────────
function initSavingsCalculator() {
  const slider = document.getElementById('reduction-slider');
  const sliderVal = document.getElementById('slider-val');
  if (!slider) return;

  function update() {
    const val = parseInt(slider.value);
    sliderVal.textContent = `${val}%`;

    const dnasPrevented = Math.round(NHS_BASELINE.totalDNAs * (val / 100));
    const moneySaved = dnasPrevented * NHS_BASELINE.costPerDNA;

    document.getElementById('savings-money').textContent = formatCurrency(moneySaved);
    document.getElementById('savings-appts').textContent = formatNumber(dnasPrevented);
  }

  slider.addEventListener('input', update);
  update();
}

// ── Helpers ────────────────────────────────────────────────
function formatCurrency(v) {
  if (v >= 1e9) return `£${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `£${(v / 1e6).toFixed(1)}M`;
  return `£${v.toLocaleString()}`;
}

function formatNumber(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Search ─────────────────────────────────────────────────
function initSearch() {
  const searchInput = document.querySelector('.topbar__search');
  if (!searchInput) return;

  // Create search results dropdown
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  searchInput.parentNode.insertBefore(wrap, searchInput);
  wrap.appendChild(searchInput);

  const results = document.createElement('div');
  results.className = 'search-results';
  results.style.cssText = 'display:none; position:absolute; top:calc(100% + 8px); left:0; right:0; background:var(--bg-card); border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.12); border:1px solid #E0E5F2; z-index:600; max-height:280px; overflow-y:auto; padding:6px 0;';
  wrap.appendChild(results);

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) { results.style.display = 'none'; return; }

    const matches = patients.filter(p => p.name.toLowerCase().includes(query));
    if (matches.length === 0) {
      results.innerHTML = '<div style="padding:14px 20px; color:var(--text-sec); font-weight:600; font-size:0.9rem;">No patients found</div>';
    } else {
      results.innerHTML = matches.map((p, i) => `
        <div class="search-result-item" data-match-idx="${i}" style="padding:12px 20px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:background 0.15s;">
          <div style="width:36px; height:36px; border-radius:50%; background:${p.tier.color}20; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; color:${p.tier.color};">${p.risk}%</div>
          <div>
            <div style="font-weight:700; font-size:0.9rem; color:var(--text-main);">${escapeHtml(p.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-sec); font-weight:600;">${p.tier.label} • ${p.tier.intervention}</div>
          </div>
        </div>
      `).join('');
    }
    results.style.display = 'block';

    // Attach click handlers — navigate to intake page
    results.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        const matchIdx = parseInt(el.dataset.matchIdx);
        if (matches[matchIdx]) {
          window.location.href = `intake.html?search=${encodeURIComponent(matches[matchIdx].name)}`;
        }
      });
      el.addEventListener('mouseenter', () => el.style.background = '#F4F7FE');
      el.addEventListener('mouseleave', () => el.style.background = 'transparent');
    });
  });

  // Enter key selects first match — navigate to intake page
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim().toLowerCase();
      const match = patients.find(p => p.name.toLowerCase().includes(query));
      if (match) {
        window.location.href = `intake.html?search=${encodeURIComponent(match.name)}`;
      }
    }
  });

  // Close results on outside click
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) results.style.display = 'none';
  });
}

// ── Data Initialization ────────────────────────────────────
function loadDemo() {
  patients = getPatients();
  renderFeed();
  updateStats();
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initDropdowns();
  initSearch();
  initForm();
  initSavingsCalculator();
  loadDemo();
});
