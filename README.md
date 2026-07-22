# SureSlot

SureSlot is a client-side dashboard for predicting patient no-show ("Did Not Attend" / DNA) risk in a clinical setting. Staff enter details about an upcoming appointment (attendance history, lead time, distance, confirmation status, etc.) and the app scores the patient's likelihood of missing the appointment, assigns a risk tier, and suggests an intervention (SMS, email, multi-channel outreach, or a direct phone call). It also includes a savings calculator that models the potential cost/appointment savings from reducing DNA rates.

The entire application is static HTML, CSS, and vanilla JavaScript — there is no backend; patient data is generated as demo data and persisted in the browser's `localStorage`.

## Key features

- **DNA risk engine** — scores a patient from 0–100% based on a weighted combination of previous DNAs, recent DNAs, missed confirmations, appointment lead time, travel distance, clinic-level DNA rate, prep requirements, and new-patient status (`persistence.js`).
- **Risk tiers & interventions** — patients are bucketed into Low / Medium / High / Very High risk, each mapped to a recommended intervention (standard SMS/letter, early reminders, multi-channel + confirmation, or direct phone follow-up).
- **Live dashboard** — a risk feed showing the most recent assessments, summary stat cards, and a "new" indicator for recently added patients.
- **Patient Intake page** (`intake.html`) — a searchable, filterable grid of all patients, filterable by risk tier.
- **Patient Intake form** — a form for entering a new patient's data, which calculates risk on submit and re-populates when an existing patient is selected.
- **Savings calculator** — a slider-driven estimate of appointments prevented and money saved at a given DNA-reduction percentage, based on NHS baseline figures.
- **Global search** — search patients by name from the top bar, with results linking into the intake page.
- **Local persistence** — patient records (starting from a bundled set of ~45 demo patients) are stored in and re-read from `localStorage` so data survives page reloads.

## Tech stack

- HTML5 / CSS3 (no CSS framework)
- Vanilla JavaScript (no build step, no framework, no bundler)
- Browser `localStorage` for persistence
- Google Fonts (DM Sans) loaded via CDN link

## Project structure

```
.
├── index.html        # Main dashboard (risk feed, stats, intake form, savings calculator)
├── intake.html        # Patient Intake page (searchable/filterable patient grid)
├── app.js              # UI logic: navigation, dropdowns, form handling, search, feed rendering
├── persistence.js      # Risk engine (weights/tiers), demo data, localStorage read/write
├── styles.css           # All application styling
└── logo.png             # SureSlot logo asset
```

## Setup / installation

No dependencies or build step are required — this is a static site.

```bash
git clone https://github.com/36taransingh5-dotcom/med.git
cd med
```

## Usage / running locally

Open `index.html` directly in a browser, or serve the directory with any static file server, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

On first load, `persistence.js` seeds `localStorage` with a set of demo patients; subsequent visits read from `localStorage`. To reset to the demo data, clear the `sureslot_patients` key from `localStorage` (or clear site data) in your browser's dev tools.
