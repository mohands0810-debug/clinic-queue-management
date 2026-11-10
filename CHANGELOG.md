# Changelog

All notable changes to the Dhanvantri Clinic Digital Queue Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-11-10 - Phase 6: Reports & Clinic Settings
### Added
- **ReportsTab** (`src/components/doctor/ReportsTab.tsx`) — Clinical analytics dashboard:
  - KPI summary row: Total Registered, Completed, Missed/No-Show, Seniors Served, Avg Consultation time (rolling average from `started_at → completed_at`).
  - Hourly throughput bar chart (pure CSS — no chart library): vertical bars per hour 9AM–9PM computed from `token.created_at`, with count labels above each bar.
  - Status breakdown: colour-coded horizontal percentage bars per status (waiting=blue, called=emerald+pulse, in_progress=emerald, completed=gray, missed=red, cancelled=slate, hold=amber).
  - Registration source breakdown: QR Scan (violet), Phone/Web (sky), Doctor Desk (orange) horizontal bars.
  - CSV export: Downloads `dhanvantri-queue-YYYY-MM-DD.csv` with columns Token#, Patient, Status, Source, Senior, Created, Called, Started, Completed.
- **SettingsTab** (`src/components/doctor/SettingsTab.tsx`) — Live clinic configuration form:
  - 🔒 Doctor-only: helpers see amber access-restricted banner; form is only rendered for `isDoctor === true`.
  - Section 1 — Operating Hours: morning start/end, evening start/end (native `time` inputs in 2×2 grid).
  - Section 2 — Queue Timing: default consultation minutes, buffer time, grace period, senior interleave ratio (all `number` inputs with min/max guards and helper text).
  - Section 3 — Advanced: custom CSS toggle for Simulation Mode (amber warning banner when ON), max daily tokens field.
  - Save writes via `supabase.from('clinic_settings').update(...).eq('id', settings.id)`, shows green success banner (auto-clears after 3s) or red error banner, calls `onSaved()` to trigger parent refetch.
  - `useEffect` re-initialises all form state when `settings` prop changes (handles Realtime updates).
- **DoctorPage** wired up: replaced both placeholder tab bodies with `<ReportsTab>` and `<SettingsTab>` components.

## [0.6.0] - 2026-11-10 - Phase 5: TV Display Board
### Added
- **DisplayPage** (`src/pages/DisplayPage.tsx`) — Full clinic waiting-room TV board rewrite:
  - **Zone 1 — Top Bar**: Clinic name (`text-5xl font-black`) + doctor/address, live `HH:MM:SS` clock via `setInterval` (`text-6xl font-mono text-primary`), doctor status pill (emerald/amber/red/slate with pulsing dot).
  - **Zone 2 — Main Grid (60/40 split)**:
    - *Left — Now Serving Card*: Token number at `text-[16rem]` — fills the card. `animate-pulse` on number when `called`; `animate-bounce` "🔔 PLEASE PROCEED TO DOCTOR'S ROOM" banner. `in_progress` shows "⚕ CONSULTATION IN PROGRESS". Senior golden badge (`✦ SENIOR CITIZEN PRIORITY`). Accessibility need pills (♿ wheelchair, 🔇 hearing, 👁 vision, 🤝 assistance). Empty state "Ready for Next Patient / Doctor will call shortly".
    - *Auto-announcement*: `useRef` tracks last announced token. On new `called` token: plays 440→880 Hz Web Audio chime, then Kannada speech `ಟೋಕನ್ ಸಂಖ್ಯೆ N, ದಯವಿಟ್ಟು ವೈದ್ಯರ ಕೋಣೆಗೆ ಬನ್ನಿ.` followed by English `Token number N, please proceed to the doctor's room.`
    - *Right — Upcoming Queue*: Up to 6 waiting/hold tokens with position badge, `text-4xl` token number, initials, SENIOR and HOLD badges. Dividers between rows.
    - *Right — QR Code*: `QRCodeSVG` size=130, links to `/get-token`. "📱 SCAN TO JOIN QUEUE" with clinic URL.
  - **Zone 3 — Bottom Ticker**: Clinic hours, pulsing green "● LIVE" indicator, KSIT CSE attribution.
  - Standalone dark layout (`bg-slate-950`) — no shared Header component rendered.
  - Supabase Realtime on `tokens` and `clinic_settings` — full refetch on any change.
  - Clock interval cleaned up on unmount.

## [0.5.0] - 2026-11-10 - Phase 4: Patient Side Senior-Friendly Design System
### Added
- **HomePage** (`src/pages/HomePage.tsx`) — Senior-optimised home screen:
  - Dynamic doctor status banner: amber alert box for `break` with delay reason, red for `emergency`, gray for `off_duty`, pulsing green dot when available.
  - Now Serving hero card: token number at `text-7xl md:text-8xl font-black` with `animate-pulse` when `called`.
  - Queue metrics bar with oversized `text-3xl font-extrabold` patient count and wait estimate.
  - Get My Token CTA: `64px` tall full-width primary button with `text-xl md:text-2xl font-extrabold`.
  - Full Supabase Realtime subscriptions on `tokens` and `clinic_settings`.
- **GetTokenPage** (`src/pages/GetTokenPage.tsx`) — 3-step registration redesign:
  - Visual step progress bar (3 dots: filled = done, pulsing = current, empty = future).
  - `h-16 text-xl` oversized inputs throughout all steps.
  - Auto-detect Senior Care: amber full-width banner appears instantly when age ≥ 60.
  - Accessibility need cards as large `p-4 rounded-2xl border-2` tap targets with checked highlight (`border-primary bg-primary/5`).
  - Review step with patient summary card, senior badge, consent notice, and 64px emerald Confirm button.
  - Loading spinner + "Joining queue…" state on submit.
- **StatusPage** (`src/pages/StatusPage.tsx`) — Live token tracker redesign:
  - Token hero number at `text-8xl md:text-9xl font-black text-primary`.
  - Full-width fixed-top bouncing emerald flash banner when `status === 'called'`: "🔔 Token #N — YOUR TURN! Please go in."
  - Auto-speak via `speakText()` exactly once when status transitions to `'called'` (via `hasSpokenCalled` ref).
  - Dynamically coloured status pills: waiting=blue, called=emerald+animate-pulse, in_progress=emerald, hold=amber, missed=red, completed=gray.
  - All action buttons ≥ 56px height: "I Have Reached Clinic" (64px emerald), "Read to Me" (56px border), "Share on WhatsApp" (56px green).
- **Bug fixes bundled in this phase**:
  - `DelayBroadcastModal`: Portal now targets `#modal-root` div outside React root, with inline `z-index: 99999` bypassing all CSS stacking contexts including the sticky header's `backdrop-filter`.
  - `index.html`: Added `<div id="modal-root"></div>` as a dedicated portal mount point.
  - `Header.tsx`: Removed `backdrop-blur` / `backdrop-filter` from sticky header (was creating a stacking context trapping `position: fixed` modals).
  - `DoctorPage.tsx`: `handleUpdateDoctorStatus` now uses `.eq('id', settings.id)` instead of `.match({ clinic_name: ... })` for reliable row targeting; `clinic_settings` Realtime subscription now calls `fetchConsoleData()` for a full authoritative refetch.
  - `.env`: Fixed Supabase project URL typo (`hag` → `haq` in project ref `npgnnbquqehaqzhxvhss`).

## [0.4.0] - 2026-11-10 - Phase 3: Doctor Console (Queue Tab)
### Added
- Complete interactive Doctor Console Queue management subsystem (`src/pages/DoctorPage.tsx`):
  - `CurrentPatientCard`: Active consultation room card featuring oversized token number, patient phone and demographics, senior citizen badges, accessibility profiling (wheelchair, hearing, vision), live consultation stopwatch, pace delay warnings, and atomic controls (Start, Complete, Hold Turn, Mark Missed, Next Patient, Cancel).
  - `NextPatientPreview`: Upcoming patient card alerting clinic staff in advance to prepare accessibility accommodations (e.g. wheelchair ramp) and indicating lobby physical presence.
  - `WalkInForm`: Two-click walk-in entry widget for non-smartphone patients with automated senior citizen detection (age 60+).
  - `ThermalPrintSlip`: Silent CSS `@media print` thermal slip template formatted for 58mm/80mm receipt printers with clinic header, huge token number, and dynamic family tracking QR code.
  - `QueueTable`: Searchable waiting line filterable by search query (name/phone/token) and quick pills (`All`, `Seniors 60+`, `In Lobby`), featuring Up/Down reordering with mandatory audit justification logging.
  - `HelpRequestsBanner`: Live pulsating alert bar subscribing to Supabase Realtime for instant patient distress notifications with one-tap resolution.
  - `DelayBroadcastModal`: One-tap preset delay bar allowing Dr Yogesh to broadcast break intervals (*"Tea Break - 15 mins"*, *"Lunch Break until 2 PM"*, *"Emergency Case"*) updating TV and patient phones in <500ms.
  - `DailySummaryCards`: Real-time daily clinical metrics tracking total tokens, active waiting count, completed consultations, seniors served, and average consultation pace.

## [0.3.0] - 2026-11-10 - Phase 2: Auth and Core Queue Logic Backend
### Added
- Complete suite of atomic PostgreSQL stored procedures (`supabase/migrations/20261110000006_rpc_functions.sql`):
  - `create_token`: Concurrency-safe atomic token generation employing date-hashed transactional advisory locks (`pg_advisory_xact_lock`) ensuring duplicate token numbers are mathematically impossible.
  - `call_next`: Queue advance function implementing configurable Senior Fair Interleaving (default 3:1 ratio), prioritizing seniors aged 60+ without starving general patients.
  - `start_consultation`: Atomically moves token to `in_progress` with start timestamp.
  - `complete_consultation`: Atomically marks consultation `completed` and computes duration.
  - `mark_missed`: Triggers 5-minute countdown grace period and logs patient absence.
  - `hold_turn`: Allows doctor to hold a turn for a specified duration when a patient steps out.
  - `reorder_queue`: Updates sequence overrides across token arrays with clinical audit justification.
  - `compute_wait_estimate`: Public calculation of dynamic wait times using rolling average of today's completed consultations and standard deviation range bounds.
- Automated PostgreSQL audit triggers (`supabase/migrations/20261110000007_audit_triggers.sql`) logging every token state transition and clinic settings update.
- Automated SQL unit tests and concurrency verification (`supabase/migrations/20261110000008_test_core_rpc.sql`) validating sequential numbering, grace period activation, and audit records.
- Typed client API layer (`src/lib/queue-api.ts`) connecting frontend actions to atomic RPC procedures.
- Supabase Authentication context (`src/context/AuthContext.tsx`) with role resolution (`doctor` vs `helper`) and settings route guards.

## [0.2.0] - 2026-11-10 - Phase 1: Project Setup and Database Migrations
### Added
- Application scaffolding with React 18, Vite 6, TypeScript 5.7, Tailwind CSS 3.4, and shadcn/ui foundation.
- Full client-side routing across all five clinic screens:
  - `/`: Patient Home screen with live serving badge, clinic status, and oversized touch actions.
  - `/get-token`: 3-step senior-friendly token creation flow with accessibility profiling.
  - `/status`: Real-time token status, queue position, arrival guidance, and WhatsApp caregiver proxy link.
  - `/display`: Full-screen 10-meter waiting-room TV display with QR join code, Kannada/English audio chimes, and speech synthesis.
  - `/doctor`: Doctor & helper console scaffold with Queue, Reports, and Settings tabs.
- Tri-lingual localization system (`react-i18next`) supporting English, Kannada (`ಕನ್ನಡ`), and Hindi (`हिन्दी`).
- Senior Accessibility context (`AccessibilityContext`) providing `A-` / `A+` scalable typography (20–28px) and WCAG AAA high-contrast toggle.
- Comprehensive Supabase PostgreSQL database migrations (`supabase/migrations/`):
  - `20261110000001_initial_schema.sql`: Core relational tables (`clinic_settings`, `staff_profiles`, `patients`, `tokens`, `token_watchers`, `help_requests`, `audit_log`) and performance indexes.
  - `20261110000002_safe_public_view.sql`: Sanitized `public_queue` database view exposing patient initials only and zero phone numbers.
  - `20261110000003_rls_policies.sql`: Complete Row Level Security policies enforcing staff authorization and anonymous privacy boundaries.
  - `20261110000004_seed_data.sql`: Seed data for Dr Yogesh's clinic, 3 senior citizen profiles, 6 general patients, and 12 sample tokens across all realistic queue states.
  - `20261110000005_test_rls.sql`: Automated SQL test assertions verifying RLS isolation, unique token constraints, and name masking.
- `docs/11-supabase-setup-guide.md`: Step-by-step connection guide for provisioning the free-tier Supabase project, executing migrations, testing RLS, creating Dr Yogesh's account, and enabling Realtime replication.

## [0.1.0] - 2026-11-10 - Phase 0: Project Documentation
### Added
- Complete project specification and architecture documentation:
  - `README.md`: Project summary, setup, tech stack, architecture overview, and project context.
  - `docs/01-requirements.md`: Stakeholder mapping, functional and non-functional requirements (WCAG AA, low-bandwidth, privacy).
  - `docs/02-architecture.md`: Full end-to-end architecture with Mermaid diagrams, real-time sync, and notification subsystem.
  - `docs/03-database-design.md`: PostgreSQL schema, ER diagram, RLS policies, indexing strategy, and RPC signatures.
  - `docs/04-ui-ux-guidelines.md`: Senior-friendly design system (high-contrast, large touch targets, multilingual typography, voice guidance).
  - `docs/05-features-and-logic.md`: Algorithmic specifications for wait-time estimation, senior priority fair queueing, missed-turn grace period, and delay detection.
  - `docs/06-api-and-realtime.md`: API reference for Supabase RPC functions, Edge Functions, and Realtime event channels.
  - `docs/07-test-plan.md`: Comprehensive test matrix covering 15+ end-to-end scenarios with verification criteria.
  - `docs/08-phase-plan.md`: Phased roadmap tracking phases 0 through 7.
  - `docs/09-user-guides.md`: Non-technical quick start guides for Dr Yogesh / helper and patients in English and Kannada.
  - `docs/10-project-report-notes.md`: Academic review notes for KSIT Dept. of CSE Community Project 25BCP308 (SDGs 3 and 10 alignment).
- Initial repository configuration (`.gitignore`, `.env.example`, `LICENSE`, `docs/assets/`).

