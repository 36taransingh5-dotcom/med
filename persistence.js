/* ============================================================
   SureSlot — Centralized Logic & Persistence
   Handles DNA Risk Engine, Tiers, and localStorage
   ============================================================ */

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
    { key: 'low', label: 'Low Risk', max: 10, color: '#01B574', bg: 'rgba(1, 181, 116, 0.1)', intervention: 'Standard SMS / Letter', icon: '💬' },
    { key: 'medium', label: 'Medium Risk', max: 25, color: '#FFB547', bg: 'rgba(255, 181, 71, 0.1)', intervention: 'Early Reminders: SMS & Email', icon: '📧' },
    { key: 'high', label: 'High Risk', max: 50, color: '#EE5D50', bg: 'rgba(238, 93, 80, 0.1)', intervention: 'Multi-channel + Confirmation', icon: '📞' },
    { key: 'veryhigh', label: 'Very High Risk', max: 100, color: '#DC2626', bg: 'rgba(220, 38, 38, 0.1)', intervention: 'Direct Phone Follow-up', icon: '🚨' }
];

const STORAGE_KEY = 'sureslot_patients';

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

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Data Persistence ────────────────────────────────────────
function getPatients() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Re-hydrate dates if needed
            return parsed.map(p => ({
                ...p,
                timestamp: p.timestamp ? new Date(p.timestamp) : null
            }));
        } catch (e) {
            console.error('Failed to parse stored patients', e);
        }
    }

    // Fallback to default demos
    const demos = [
        { name: 'James Harrison', inputs: { previousDNA: 5, recentDNA: 2, noConfirmation: 1, leadTimeDays: 28, distanceMiles: 15, clinicDNARate: 12, prepRequired: 0, newPatient: 0 } },
        { name: 'Marcus Thorne', inputs: { previousDNA: 12, recentDNA: 4, noConfirmation: 1, leadTimeDays: 30, distanceMiles: 20, clinicDNARate: 18, prepRequired: 1, newPatient: 0 } },
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

    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 10);

    const initialPatients = demos.map((demo, idx) => {
        const risk = calculateDNARisk(demo.inputs);
        return {
            id: "SLT-" + (idx + 1).toString().padStart(4, '0'),
            name: demo.name,
            risk,
            tier: getTier(risk),
            inputs: demo.inputs,
            timestamp: pastDate
        };
    });

    savePatients(initialPatients);
    return initialPatients;
}

function savePatients(patients) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
}
