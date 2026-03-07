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

// ── Render Feed ────────────────────────────────────────────
function renderFeed() {
  const container = document.getElementById('risk-feed');
  if (!container) return;

  if (patients.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-sec); font-weight: 600;">No assessments processed today.</div>`;
    return;
  }

  container.innerHTML = patients.map(p => `
    <div class="feed-item">
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

// ── Demo Data ──────────────────────────────────────────────
function loadDemo() {
  const demos = [
    { name: 'James Harrison', inputs: { previousDNA: 5, recentDNA: 2, noConfirmation: 1, leadTimeDays: 28, distanceMiles: 15, clinicDNARate: 12, prepRequired: 0, newPatient: 0 } },
    { name: 'Sarah Mitchell', inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 7, distanceMiles: 3, clinicDNARate: 5, prepRequired: 0, newPatient: 0 } },
    { name: 'Ahmed Patel', inputs: { previousDNA: 3, recentDNA: 1, noConfirmation: 1, leadTimeDays: 21, distanceMiles: 25, clinicDNARate: 18, prepRequired: 1, newPatient: 1 } },
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
  initForm();
  initSavingsCalculator();
  loadDemo();
});
