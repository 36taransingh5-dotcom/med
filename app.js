/* ============================================================
   SureSlot — Application Logic
   Predictive Capacity Optimization Engine for the NHS
   ============================================================ */

// ── Constants ──────────────────────────────────────────────
const WEIGHTS = {
  previousDNA:    8,
  recentDNA:     15,
  noConfirmation:12,
  leadTimeDays:   0.4,
  distanceMiles:  0.6
};

const MAX_SCORE = 525.5;

const TIERS = [
  { key: 'low',      label: 'Low Risk',      max: 10,  color: '#10B981', intervention: 'Standard SMS',       icon: '💬', iconClass: 'sms' },
  { key: 'medium',   label: 'Medium Risk',    max: 25,  color: '#F59E0B', intervention: 'Email + SMS',        icon: '📧', iconClass: 'email' },
  { key: 'high',     label: 'High Risk',      max: 50,  color: '#EF4444', intervention: 'Direct Phone Call',  icon: '📞', iconClass: 'phone' },
  { key: 'veryhigh', label: 'Very High Risk',  max: 100, color: '#DC2626', intervention: 'Urgent Follow-Up',  icon: '🚨', iconClass: 'urgent' }
];

// NHS Baseline data
const NHS_BASELINE = {
  totalDNAs:       8_000_000,   // ~8 million DNAs per year
  totalCost:       1_300_000_000, // £1.3 billion annual cost
  costPerDNA:      162.50         // Average cost per DNA
};

// ── State ──────────────────────────────────────────────────
let patients = [];
let patientCounter = 0;

// ── DNA Risk Stratification Engine ─────────────────────────
function calculateDNARisk(inputs) {
  const {
    previousDNA,
    recentDNA,
    noConfirmation,
    leadTimeDays,
    distanceMiles
  } = inputs;

  const rawScore =
    (previousDNA    * WEIGHTS.previousDNA)    +
    (recentDNA      * WEIGHTS.recentDNA)      +
    (noConfirmation * WEIGHTS.noConfirmation) +
    (leadTimeDays   * WEIGHTS.leadTimeDays)   +
    (distanceMiles  * WEIGHTS.distanceMiles);

  const riskPercentage = Math.min((rawScore / MAX_SCORE) * 100, 100);
  return Math.round(riskPercentage * 10) / 10; // one decimal
}

function getTier(riskPercent) {
  for (const tier of TIERS) {
    if (riskPercent <= tier.max) return tier;
  }
  return TIERS[TIERS.length - 1];
}

// ── Tab Navigation ─────────────────────────────────────────
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels  = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ── Patient Intake Form ────────────────────────────────────
function initForm() {
  const form = document.getElementById('intake-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const inputs = {
      previousDNA:    parseInt(document.getElementById('previousDNA').value) || 0,
      recentDNA:      parseInt(document.getElementById('recentDNA').value) || 0,
      noConfirmation: parseInt(document.getElementById('noConfirmation').value) || 0,
      leadTimeDays:   parseInt(document.getElementById('leadTimeDays').value) || 0,
      distanceMiles:  parseFloat(document.getElementById('distanceMiles').value) || 0
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

    // Focus the feed
    document.querySelector('.feed').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// ── Render Live Risk Feed ──────────────────────────────────
function renderFeed() {
  const container = document.getElementById('risk-feed');

  if (patients.length === 0) {
    container.innerHTML = `
      <div class="feed__empty">
        <div class="feed__empty-icon">📋</div>
        <div class="feed__empty-text">No patients assessed yet</div>
        <div class="feed__empty-sub">Submit the intake form to begin risk stratification</div>
      </div>`;
    return;
  }

  container.innerHTML = patients.map((p, i) => `
    <div class="feed-item" style="animation-delay: ${i * 0.05}s">
      <div class="feed-item__risk-ring feed-item__risk-ring--${p.tier.key}">
        ${p.risk}%
      </div>
      <div class="feed-item__info">
        <div class="feed-item__name">${escapeHtml(p.name)}</div>
        <span class="feed-item__tier-label tier--${p.tier.key}">${p.tier.label}</span>
      </div>
      <div class="feed-item__intervention">
        <div class="intervention-icon intervention-icon--${p.tier.iconClass}">
          ${p.tier.icon}
        </div>
        <span class="intervention-label">${p.tier.intervention}</span>
      </div>
    </div>
  `).join('');
}

// ── Stats Bar ──────────────────────────────────────────────
function updateStats() {
  const total = patients.length;
  const counts = { low: 0, medium: 0, high: 0, veryhigh: 0 };
  patients.forEach(p => counts[p.tier.key]++);

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-low').textContent     = counts.low;
  document.getElementById('stat-medhigh').textContent = counts.medium + counts.high;
  document.getElementById('stat-veryhigh').textContent = counts.veryhigh;
}

// ── Savings Calculator ─────────────────────────────────────
function initSavingsCalculator() {
  const slider = document.getElementById('dna-reduction');
  const display = document.getElementById('reduction-display');

  function update() {
    const reduction = parseInt(slider.value);
    display.innerHTML = `${reduction}<span>%</span>`;

    const dnasPrevented = Math.round(NHS_BASELINE.totalDNAs * (reduction / 100));
    const moneySaved    = dnasPrevented * NHS_BASELINE.costPerDNA;
    const newDNARate    = ((100 - reduction) / 100 * 7.8).toFixed(1); // baseline ~7.8% DNA rate
    const capacityGain  = ((reduction / 30) * 12).toFixed(0); // rough % capacity gain

    document.getElementById('savings-money').textContent   = formatCurrency(moneySaved);
    document.getElementById('savings-appts').textContent   = formatNumber(dnasPrevented);
    document.getElementById('savings-rate').textContent    = `${newDNARate}%`;
    document.getElementById('savings-capacity').textContent = `+${capacityGain}%`;
  }

  slider.addEventListener('input', update);
  update(); // initial render
}

// ── Formatters ─────────────────────────────────────────────
function formatCurrency(value) {
  if (value >= 1_000_000_000) return `£${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `£${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000)         return `£${(value / 1_000).toFixed(0)}K`;
  return `£${value.toFixed(0)}`;
}

function formatNumber(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Populate Demo Data ─────────────────────────────────────
function loadDemoPatients() {
  const demos = [
    { name: 'James Harrison',   inputs: { previousDNA: 5, recentDNA: 2, noConfirmation: 1, leadTimeDays: 28, distanceMiles: 15 } },
    { name: 'Sarah Mitchell',   inputs: { previousDNA: 0, recentDNA: 0, noConfirmation: 0, leadTimeDays: 7,  distanceMiles: 3  } },
    { name: 'Ahmed Patel',      inputs: { previousDNA: 3, recentDNA: 1, noConfirmation: 1, leadTimeDays: 21, distanceMiles: 25 } },
    { name: 'Emily Roberts',    inputs: { previousDNA: 8, recentDNA: 4, noConfirmation: 1, leadTimeDays: 42, distanceMiles: 35 } },
    { name: 'David Chen',       inputs: { previousDNA: 1, recentDNA: 0, noConfirmation: 1, leadTimeDays: 14, distanceMiles: 8  } },
  ];

  demos.forEach(demo => {
    const riskPercent = calculateDNARisk(demo.inputs);
    const tier = getTier(riskPercent);
    patients.push({
      id: Date.now() + Math.random(),
      name: demo.name,
      risk: riskPercent,
      tier,
      inputs: demo.inputs,
      timestamp: new Date()
    });
  });

  renderFeed();
  updateStats();
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initForm();
  initSavingsCalculator();
  loadDemoPatients();
});
