# System Requirements Specification (SRS)

## Document Details
- **Project**: Digital Queue Management System
- **Client**: Dhanvantri Clinic, Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru
- **Lead Physician**: Dr Yogesh
- **Academic Context**: K. S. Institute of Technology (KSIT), Dept. of Computer Science & Engineering, Community Project 25BCP308
- **Document Version**: 1.0.0
- **Status**: Approved for Phase 0 Baseline

---

## 1. Stakeholders

1. **Primary Healthcare Provider (Dr Yogesh)**:
   - Needs full control over consultation pacing, queue ordering, and emergency insertions without administrative friction.
   - Requires zero interruptions during active consultations from patients asking "how much longer?".
2. **Clinic Assistant / Helper**:
   - Manages physical walk-in patients lacking smartphones.
   - Generates printed queue slips, assists seniors with check-in, and monitors patient distress signals.
3. **Outpatient Public (Patients)**:
   - Walk-in and pre-arrival patients seeking medical consultation.
   - Range from digitally fluent youth to non-smartphone seniors (60+ years) who require high-contrast, large-text, multilingual audio guidance.
4. **Caregivers and Family Members**:
   - Family members accompanying or monitoring patients remotely; need transparent waiting-time estimates and turn alerts via WhatsApp or SMS.
5. **Academic Evaluation Committee (KSIT Dept. of CSE)**:
   - Evaluates technical rigor, architectural soundness, real-world utility, adherence to accessibility standards, and community impact under UN Sustainable Development Goals (SDG 3 & 10).

---

## 2. User Roles & Permission Matrix

The system intentionally restricts access to **three roles** across two operational interfaces:

| Role | Interface | Authentication | Access Permissions |
| :--- | :--- | :--- | :--- |
| **Anonymous Patient / Public** | Patient Web (`/`, `/get-token`, `/status`, `/display`) | None (Zero Auth) | Create personal token; read sanitized public queue status; view TV display; trigger personal distress alerts; cancel own token via session secret. Cannot view other patients' names or phone numbers. |
| **Clinic Helper** | Doctor Console (`/doctor`) | Supabase Auth (Email + Password) | Call next patient; start/complete consultations; create walk-in tokens; print physical slips; hold/skip turns; reorder queue; view distress alerts. **Restricted**: Cannot alter clinic configuration settings or system policies. |
| **Doctor (Dr Yogesh)** | Doctor Console (`/doctor`) | Supabase Auth (Email + Password) | Full administrative access: queue operations, clinical break triggers, emergency delay overrides, analytics/reports export (CSV/PDF), clinic operating settings, and demo simulation mode. |

---

## 3. Functional Requirements

### 3.1 Patient Facing Subsystem
- **FR-PAT-01 (Zero-Friction Token Generation)**: Patients can generate a queue token in 3 steps or fewer by providing only a Name, Phone number, and Age bracket.
- **FR-PAT-02 (No-Phone Walk-In Mode)**: Patients without a phone or digital device can check in via the doctor's desk or toggle "No phone" to generate a physical token slip.
- **FR-PAT-03 (Senior & Accessibility Profiling)**: Self-declaration of senior citizen status (60+) and physical accessibility requirements (wheelchair/walker, hearing, vision, needs assistance).
- **FR-PAT-04 (Live Queue Position Tracking)**: Displays current queue position, number of patients ahead, and real-time status (`Waiting`, `Get Ready`, `In Consultation`, `Missed`, `Completed`).
- **FR-PAT-05 ("Come Later" Smart Arrival Guidance)**: Computes a recommended physical arrival timestamp based on queue depth minus a configurable transit buffer.
- **FR-PAT-06 ("I have reached" Check-In)**: Allows remote patients to notify the clinic console upon physically arriving at the Sandhya Theater Complex premises.
- **FR-PAT-07 (Multilingual Voice Readout)**: A dedicated "🔊 Read this to me" action uses browser Text-to-Speech (TTS) to vocalize queue status in Kannada, English, or Hindi.
- **FR-PAT-08 (Emergency Distress Trigger)**: An always-visible "I need help" button instantly alerts the doctor console with the patient's token number.
- **FR-PAT-09 (Family Proxy Tracking)**: Enables up to 3 phone numbers to monitor a single token, with a one-click WhatsApp status link generator.

### 3.2 Waiting-Room TV Board (`/display`)
- **FR-DSP-01 (High-Visibility Display)**: Full-screen, high-contrast display designed to be legible from a distance of at least 10 meters on a standard television monitor.
- **FR-DSP-02 (Now Serving & Upcoming Queue)**: Displays the currently active token number/initials alongside the next 5 queued tokens.
- **FR-DSP-03 (Doctor Status & Delay Banners)**: Instantly presents clinical status banners (e.g., *"Doctor attending emergency case"*, *"Break until 1:30 PM"*).
- **FR-DSP-04 (Audio Chimes & Announcements)**: Emits an attention chime followed by spoken token calls in Kannada and English upon each queue advance.
- **FR-DSP-05 (Self-Service Join QR Code)**: Displays a scannable dynamic QR code allowing waiting-room arrivals to immediately open the token creation page.

### 3.3 Doctor Console Subsystem (`/doctor`)
- **FR-DOC-01 (Queue Progression Controls)**: Single-click atomic actions: *Call Next*, *Start Consultation*, *Complete*, *Mark Missed*, *Hold Turn*, *Skip*, *Cancel*.
- **FR-DOC-02 (Walk-In Quick Entry & Slip Printing)**: Generates a walk-in token and automatically triggers browser print dialog for 58mm/80mm thermal receipt slips.
- **FR-DOC-03 (Visual Queue Management & Drag-and-Drop)**: Renders the active waiting line with senior badges and accessibility indicators, permitting manual queue reordering with mandatory audit logging.
- **FR-DOC-04 (Delay & Break Broadcaster)**: One-tap delay presets (*"Emergency Case"*, *"Running 15 mins late"*, *"Lunch Break"*) that recompute waiting estimations across all devices.
- **FR-DOC-05 (Distress Alert Monitor)**: Real-time visual and auditory banner displaying patient "I need help" distress submissions with one-tap acknowledgment.
- **FR-DOC-06 (Operational Reports & Analytics)**: Generates charts for patient throughput, average wait times, consultation variance, peak visit hours, and missed appointments with CSV/PDF export.
- **FR-DOC-07 (Clinic Settings Configuration)**: Doctor-controlled operational parameters: operating hours, default consultation duration, maximum daily token cap, grace period duration, and senior interleaving ratio.
- **FR-DOC-08 (Demo / Presentation Simulation Mode)**: Allows Dr Yogesh or project evaluators to simulate automated queue progression and walk-in arrivals for demonstration.

---

## 4. Non-Functional Requirements

### 4.1 Accessibility & Senior-Friendly Usability
- **NFR-ACC-01 (Contrast Standards)**: Default palette achieves WCAG 2.1 AA compliance (minimum 4.5:1 contrast for normal text, 3:1 for large text). One-tap high-contrast mode guarantees WCAG AAA compliance (minimum 7:1 contrast).
- **NFR-ACC-02 (Touch Targets & Sizing)**: All primary interactive controls measure at least 56px in height and width with minimum 16px touch target separation.
- **NFR-ACC-03 (Adjustable Typography)**: Base font size is 20px, scalable up to 28px via an always-present on-screen text size toggle (`A+` / `A-`).
- **NFR-ACC-04 (Multi-Sensory Alerts)**: System turn alerts do not rely solely on color; they combine high-contrast visual badges, text labels, device vibration patterns, and audio speech.
- **NFR-ACC-05 (Cognitive Load)**: No screen presents more than one primary user action. Form inputs are forgiving and never time out or wipe user data.

### 4.2 Performance & Network Resilience
- **NFR-PER-01 (Initial Load Time)**: First Contentful Paint (FCP) under 1.5 seconds on simulated low-tier 3G mobile networks.
- **NFR-PER-02 (Bundle Budget)**: Total JavaScript production bundle size under 250 KB (gzipped), ensuring rapid execution on low-memory Android devices.
- **NFR-PER-03 (Real-Time Latency)**: State synchronization across doctor console, patient devices, and TV display completes in less than 500ms via WebSocket connections.
- **NFR-PER-04 (Network Reconnection)**: Automatic exponential backoff reconnection with an unobtrusive on-screen *"Reconnecting..."* status and offline display of the last confirmed queue state.

### 4.3 Privacy & Data Protection
- **NFR-SEC-01 (Safe Public Exposure)**: Public endpoints and database views NEVER expose full names, phone numbers, or age details. Public views only expose token number, status, and patient initials.
- **NFR-SEC-02 (No Medical Record Storage)**: The system strictly stores queue management metadata. No symptoms, medical history, diagnosis, or prescription records are ever collected or stored.
- **NFR-SEC-03 (Row Level Security)**: PostgreSQL RLS policies strictly enforce role-based access. Anonymous clients cannot query the raw `patients` table or view foreign tokens.

---

## 5. Assumptions and Constraints

1. **Single-Doctor Outpatient Model**: The initial deployment serves Dr Yogesh's single-consulting-room clinic. The database schema maintains a nullable `doctor_id` foreign key to facilitate future multi-doctor scaling without structural redesign.
2. **Infrastructure Budget**: The system operates completely within the free tier thresholds of Supabase (database, auth, real-time) and Netlify/Vercel (static edge hosting).
3. **Hardware Constraints**:
   - The clinic waiting room uses an existing commercial smart TV or HDMI mini-PC running a standard Chromium-based browser at 1080p resolution.
   - The doctor's desk uses a laptop or tablet running Google Chrome / Edge with a standard ESC/POS thermal receipt printer or standard office printer.
4. **Third-Party Messaging Limits**: SMS and WhatsApp notifications via MSG91/Twilio require active API balance. When API keys are unconfigured, the application gracefully falls back to Web Push, device vibration, and audio chimes at zero cost.

