/* ============================================================
   SureSlot — Application Logic (UI v2)
   Inspired by KPSFLEX Dashboard
   ============================================================ */

// ── Constants ──────────────────────────────────────────────
const WEIGHTS = {
  previousDNA: 8,
  recentDNA: 15,
  noConfirmation: 12,
  leadTimeDays: 0.4,
  distanceMiles: 0.6,
  clinicDNARate: 0.5,
  prepRequired: 5,
  newPatient: 5
};

const MAX_SCORE = 525.5;

const TIERS = [
  { key: 'low', label: 'Low Risk', max: 10, color: '#01B574', intervention: 'Standard SMS / Letter', icon: '💬' },
  { key: 'medium', label: 'Medium Risk', max: 25, color: '#FFB547', intervention: 'Early Reminders: SMS & Email', icon: '📧' },
  { key: 'high', label: 'High Risk', max: 50, color: '#EE5D50', intervention: 'Multi-channel + Confirmation', icon: '📞' },
  { key: 'veryhigh', label: 'Very High Risk', max: 100, color: '#DC2626', intervention: 'Direct Phone Follow-up', icon: '🚨' }
];

const NHS_BASELINE = {
  totalDNAs: 16_000_000,
  totalCost: 1_300_000_000,
  costPerDNA: 81.25,
  serviceImpact: 7_400_000     // Local clinical impact
};

// ── State ──────────────────────────────────────────────────
let patients = [];
let patientCounter = 0;

// ── DNA Risk Engine ────────────────────────────────────────
function calculateDNARisk(inputs) {
  const { previousDNA, recentDNA, noConfirmation, leadTimeDays, distanceMiles, clinicDNARate, prepRequired, newPatient } = inputs;
  const rawScore =
    (previousDNA * WEIGHTS.previousDNA) +
    (recentDNA * WEIGHTS.recentDNA) +
    (noConfirmation * WEIGHTS.noConfirmation) +
    (leadTimeDays * WEIGHTS.leadTimeDays) +
    (distanceMiles * WEIGHTS.distanceMiles) +
    (clinicDNARate * WEIGHTS.clinicDNARate) +
    (prepRequired * WEIGHTS.prepRequired) +
    (newPatient * WEIGHTS.newPatient);

  const riskPercentage = Math.min((rawScore / MAX_SCORE) * 100, 100);
  return Math.round(riskPercentage * 10) / 10;
}

function getTier(riskPercent) {
  for (const tier of TIERS) {
    if (riskPercent <= tier.max) return tier;
  }
  return TIERS[TIERS.length - 1];
}

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

  container.innerHTML = visiblePatients.map((p, idx) => `
    <div class="feed-item" data-patient-idx="${idx}" style="cursor:pointer" title="Click to view ${escapeHtml(p.name)}'s data">
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
  `).join('');

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

// ── Demo Data ──────────────────────────────────────────────
function loadDemo() {
  const demos = [
    { name: 'James Harrison', inputs: { previousDNA: 5, recentDNA: 2, noConfirmation: 1, leadTimeDays: 28, distanceMiles: 15, clinicDNARate: 12, prepRequired: 0, newPatient: 0 } },
    { name: 'Sarah Mitchell', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 7, distanceMiles: 3, clinicDNARate: 5, prepRequired: 0, newPatient: 0 } },
    { name: 'Ahmed Patel', inputs: { previousDNA: 3, recentDNA: 1, noConfirmation: 1, leadTimeDays: 21, distanceMiles: 25, clinicDNARate: 18, prepRequired: 1, newPatient: 1 } },
    { name: 'Emily Chen', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 5, distanceMiles: 2, clinicDNARate: 4, prepRequired: 0, newPatient: 1 } },
    { name: 'David Okonkwo', inputs: { previousDNA: 8, recentDNA: 4, noConfirmation: 1, leadTimeDays: 35, distanceMiles: 30, clinicDNARate: 22, prepRequired: 1, newPatient: 0 } },
    { name: 'Priya Sharma', inputs: { previousDNA: 1, recentDNA: 0, noConfirmation: 0, leadTimeDays: 14, distanceMiles: 8, clinicDNARate: 7, prepRequired: 0, newPatient: 0 } },
    { name: 'Michael O\'Brien', inputs: { previousDNA: 6, recentDNA: 3, noConfirmation: 1, leadTimeDays: 30, distanceMiles: 20, clinicDNARate: 15, prepRequired: 1, newPatient: 0 } },
    { name: 'Fatima Al-Rashid', inputs: { previousDNA: 2, recentDNA: 1, noConfirmation: 0, leadTimeDays: 10, distanceMiles: 12, clinicDNARate: 9, prepRequired: 0, newPatient: 1 } },
    { name: 'Thomas Wright', inputs: { previousDNA: 10, recentDNA: 5, noConfirmation: 1, leadTimeDays: 42, distanceMiles: 35, clinicDNARate: 25, prepRequired: 1, newPatient: 0 } },
    { name: 'Grace Adeyemi', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 3, distanceMiles: 1, clinicDNARate: 3, prepRequired: 0, newPatient: 0 } },
    { name: 'Robert Singh', inputs: { previousDNA: 4, recentDNA: 2, noConfirmation: 1, leadTimeDays: 18, distanceMiles: 14, clinicDNARate: 11, prepRequired: 0, newPatient: 0 } },
    { name: 'Hannah Wilson', inputs: { previousDNA: 1, recentDNA: 1, noConfirmation: 0, leadTimeDays: 8, distanceMiles: 5, clinicDNARate: 6, prepRequired: 1, newPatient: 0 } },
    { name: 'Yusuf Mohammed', inputs: { previousDNA: 7, recentDNA: 3, noConfirmation: 1, leadTimeDays: 25, distanceMiles: 22, clinicDNARate: 20, prepRequired: 1, newPatient: 1 } },
    { name: 'Charlotte Evans', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 6, distanceMiles: 4, clinicDNARate: 5, prepRequired: 0, newPatient: 1 } },
    { name: 'Daniel Kowalski', inputs: { previousDNA: 3, recentDNA: 1, noConfirmation: 0, leadTimeDays: 15, distanceMiles: 10, clinicDNARate: 8, prepRequired: 0, newPatient: 0 } },
    { name: 'Amara Osei', inputs: { previousDNA: 9, recentDNA: 4, noConfirmation: 1, leadTimeDays: 40, distanceMiles: 28, clinicDNARate: 24, prepRequired: 1, newPatient: 0 } },
    { name: 'Oliver Thompson', inputs: { previousDNA: 2, recentDNA: 0, noConfirmation: 0, leadTimeDays: 12, distanceMiles: 7, clinicDNARate: 6, prepRequired: 0, newPatient: 0 } },
    { name: 'Zara Khan', inputs: { previousDNA: 5, recentDNA: 2, noConfirmation: 1, leadTimeDays: 22, distanceMiles: 18, clinicDNARate: 14, prepRequired: 1, newPatient: 1 } },
    { name: 'George Campbell', inputs: { previousDNA: 1, recentDNA: 0, noConfirmation: 0, leadTimeDays: 9, distanceMiles: 6, clinicDNARate: 4, prepRequired: 0, newPatient: 0 } },
    { name: 'Isla MacDonald', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 4, distanceMiles: 2, clinicDNARate: 3, prepRequired: 0, newPatient: 0 } },
    { name: 'Marcus Johnson', inputs: { previousDNA: 6, recentDNA: 3, noConfirmation: 1, leadTimeDays: 32, distanceMiles: 24, clinicDNARate: 19, prepRequired: 0, newPatient: 0 } },
    { name: 'Sophie Brennan', inputs: { previousDNA: 2, recentDNA: 1, noConfirmation: 0, leadTimeDays: 11, distanceMiles: 9, clinicDNARate: 8, prepRequired: 1, newPatient: 0 } },
    { name: 'Raj Gupta', inputs: { previousDNA: 4, recentDNA: 2, noConfirmation: 1, leadTimeDays: 20, distanceMiles: 16, clinicDNARate: 13, prepRequired: 0, newPatient: 1 } },
    { name: 'Chloe Richards', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 14, distanceMiles: 5, clinicDNARate: 6, prepRequired: 0, newPatient: 0 } },
    { name: 'Mohammed Ali', inputs: { previousDNA: 7, recentDNA: 3, noConfirmation: 1, leadTimeDays: 28, distanceMiles: 20, clinicDNARate: 18, prepRequired: 1, newPatient: 0 } },
    { name: 'Jessica Taylor', inputs: { previousDNA: 1, recentDNA: 0, noConfirmation: 0, leadTimeDays: 5, distanceMiles: 2, clinicDNARate: 4, prepRequired: 0, newPatient: 1 } },
    { name: 'Liam Davies', inputs: { previousDNA: 3, recentDNA: 1, noConfirmation: 0, leadTimeDays: 21, distanceMiles: 15, clinicDNARate: 12, prepRequired: 0, newPatient: 0 } },
    { name: 'Mia Thompson', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 2, distanceMiles: 1, clinicDNARate: 3, prepRequired: 1, newPatient: 0 } },
    { name: 'Ethan Brown', inputs: { previousDNA: 5, recentDNA: 2, noConfirmation: 1, leadTimeDays: 30, distanceMiles: 25, clinicDNARate: 20, prepRequired: 0, newPatient: 0 } },
    { name: 'Ava Wilson', inputs: { previousDNA: 2, recentDNA: 1, noConfirmation: 0, leadTimeDays: 10, distanceMiles: 8, clinicDNARate: 7, prepRequired: 0, newPatient: 1 } },
    { name: 'Noah Roberts', inputs: { previousDNA: 9, recentDNA: 4, noConfirmation: 1, leadTimeDays: 45, distanceMiles: 32, clinicDNARate: 26, prepRequired: 1, newPatient: 0 } },
    { name: 'Isabella Walker', inputs: { previousDNA: 1, recentDNA: 0, noConfirmation: 0, leadTimeDays: 7, distanceMiles: 4, clinicDNARate: 5, prepRequired: 0, newPatient: 0 } },
    { name: 'Lucas Hall', inputs: { previousDNA: 4, recentDNA: 2, noConfirmation: 1, leadTimeDays: 15, distanceMiles: 12, clinicDNARate: 10, prepRequired: 1, newPatient: 0 } },
    { name: 'Sophia Lewis', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 4, distanceMiles: 3, clinicDNARate: 4, prepRequired: 0, newPatient: 1 } },
    { name: 'Alexander Young', inputs: { previousDNA: 6, recentDNA: 3, noConfirmation: 0, leadTimeDays: 25, distanceMiles: 18, clinicDNARate: 14, prepRequired: 0, newPatient: 0 } },
    { name: 'Mia King', inputs: { previousDNA: 2, recentDNA: 1, noConfirmation: 1, leadTimeDays: 12, distanceMiles: 6, clinicDNARate: 8, prepRequired: 1, newPatient: 0 } },
    { name: 'Jacob Wright', inputs: { previousDNA: 8, recentDNA: 4, noConfirmation: 1, leadTimeDays: 38, distanceMiles: 28, clinicDNARate: 22, prepRequired: 1, newPatient: 1 } },
    { name: 'Harper Scott', inputs: { previousDNA: 1, recentDNA: 0, noConfirmation: 0, leadTimeDays: 8, distanceMiles: 5, clinicDNARate: 6, prepRequired: 0, newPatient: 0 } },
    { name: 'William Hill', inputs: { previousDNA: 3, recentDNA: 2, noConfirmation: 1, leadTimeDays: 18, distanceMiles: 10, clinicDNARate: 11, prepRequired: 1, newPatient: 0 } },
    { name: 'Evelyn Green', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 6, distanceMiles: 4, clinicDNARate: 5, prepRequired: 0, newPatient: 1 } },
    { name: 'James Adams', inputs: { previousDNA: 5, recentDNA: 2, noConfirmation: 0, leadTimeDays: 22, distanceMiles: 14, clinicDNARate: 12, prepRequired: 0, newPatient: 0 } },
    { name: 'Abigail Baker', inputs: { previousDNA: 2, recentDNA: 1, noConfirmation: 1, leadTimeDays: 13, distanceMiles: 7, clinicDNARate: 8, prepRequired: 1, newPatient: 0 } },
    { name: 'Benjamin Nelson', inputs: { previousDNA: 7, recentDNA: 3, noConfirmation: 1, leadTimeDays: 35, distanceMiles: 22, clinicDNARate: 17, prepRequired: 0, newPatient: 1 } },
    { name: 'Elena Rodriguez', inputs: { previousDNA: 15, recentDNA: 6, noConfirmation: 1, leadTimeDays: 50, distanceMiles: 40, clinicDNARate: 30, prepRequired: 1, newPatient: 0 } },
    { name: 'Kevin O\'Donoghue', inputs: { previousDNA: 12, recentDNA: 8, noConfirmation: 1, leadTimeDays: 45, distanceMiles: 35, clinicDNARate: 28, prepRequired: 1, newPatient: 1 } },
  ];

  demos.forEach(demo => {
    const risk = calculateDNARisk(demo.inputs);
    patients.push({ id: Math.random(), name: demo.name, risk, tier: getTier(risk), inputs: demo.inputs });
  });

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
