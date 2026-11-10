# Development Phase Roadmap & Progress Tracker

## Document Details
- **Project**: Digital Queue Management System
- **Clinic**: Dhanvantri Clinic (Dr Yogesh)
- **Institution**: K. S. Institute of Technology, Dept. of CSE (25BCP308)
- **Document Version**: 1.0.0

---

## Phase Execution Checklist

- [x] **PHASE 0: DOCUMENTATION FIRST, THEN PUSH TO GITHUB**
  - [x] Create project repository structure and `.gitignore`, `.env.example`, `LICENSE`.
  - [x] Author comprehensive primary documentation:
    - [x] `README.md`: Problem statement, architecture, tech stack, and setup instructions.
    - [x] `docs/01-requirements.md`: Stakeholders, roles, functional & non-functional requirements.
    - [x] `docs/02-architecture.md`: System topology, Mermaid diagrams, real-time sync model.
    - [x] `docs/03-database-design.md`: ER diagram, table schemas, RLS policies, RPC signatures.
    - [x] `docs/04-ui-ux-guidelines.md`: Senior-friendly design standards, contrast, multilingual audio, wireframes.
    - [x] `docs/05-features-and-logic.md`: 11 unique features, wait-time math, senior interleaving, grace period.
    - [x] `docs/06-api-and-realtime.md`: Stored procedures, edge functions, and Realtime channels.
    - [x] `docs/07-test-plan.md`: Quality assurance matrix with 16 verification scenarios.
    - [x] `docs/08-phase-plan.md`: Milestone roadmap tracking checklist.
    - [x] `docs/09-user-guides.md`: Non-technical quick start guides for Doctor and Patients (English & Kannada).
    - [x] `docs/10-project-report-notes.md`: Academic review notes (KSIT CSE 25BCP308, SDGs 3 & 10).
    - [x] `CHANGELOG.md`: Initial changelog entries.
  - [x] Initialize Git repository, connect to remote GitHub repository, commit ("phase-0: project documentation"), and push to `main`.
  - [x] Verify commit hash and await user approval before proceeding to Phase 1.

- [x] **PHASE 1: PROJECT SETUP AND DATABASE**
  - [x] Scaffold React 18 + Vite + TypeScript application with Tailwind CSS and shadcn/ui.
  - [x] Configure client routing (`/`, `/get-token`, `/status`, `/display`, `/doctor`).
  - [x] Wire react-i18next with English, Kannada (`ಕನ್ನಡ`), and Hindi (`हिन्दी`) localization dictionaries.
  - [x] Write all Supabase PostgreSQL migrations (`supabase/migrations/`):
    - [x] Tables, indexes, unique constraints, and foreign keys (`20261110000001_initial_schema.sql`).
    - [x] Sanitized `public_queue` database view (`20261110000002_safe_public_view.sql`).
    - [x] Comprehensive Row Level Security (RLS) policies (`20261110000003_rls_policies.sql`).
    - [x] Initial seed data: Dr Yogesh profile instructions, 12 sample tokens, 3 senior profiles (`20261110000004_seed_data.sql`).
  - [x] Execute SQL tests validating RLS boundaries (`20261110000005_test_rls.sql`).
  - [x] Document step-by-step Supabase connection & migration instructions (`docs/11-supabase-setup-guide.md`).
  - [x] Verify production compilation (TypeScript + Vite build: 162.76 kB gzipped).
  - [x] Update documentation, commit, and push.

- [ ] **PHASE 2: AUTH AND CORE QUEUE LOGIC (BACKEND)**
  - [ ] Implement Supabase Auth login flow for Doctor and Helper roles with route guards.
  - [ ] Implement PostgreSQL RPC functions:
    - [ ] `create_token` (concurrency-safe atomic token generation)
    - [ ] `call_next`
    - [ ] `start_consultation`
    - [ ] `complete_consultation`
    - [ ] `mark_missed`
    - [ ] `hold_turn`
    - [ ] `reorder_queue`
    - [ ] `compute_wait_estimate`
  - [ ] Configure automatic audit log triggers.
  - [ ] Execute concurrency unit test verifying duplicate token prevention.
  - [ ] Update documentation, commit, and push.

- [ ] **PHASE 3: DOCTOR CONSOLE (QUEUE TAB)**
  - [ ] Build Doctor Console Queue view on live Supabase data.
  - [ ] Implement active patient consultation card and next patient preview.
  - [ ] Build atomic control buttons: Call Next, Start, Complete, Missed, Hold, Skip, Cancel.
  - [ ] Implement Walk-In Patient form with instant 58mm/80mm thermal slip printing.
  - [ ] Build drag-and-drop queue reordering with mandatory reason logging.
  - [ ] Build live distress help requests banner and one-tap delay/break broadcast tools.
  - [ ] Update documentation, commit, and push.

- [ ] **PHASE 4: PATIENT SIDE WITH SENIOR-FRIENDLY DESIGN SYSTEM**
  - [ ] Implement Patient Home (`/`) with clinic status, now serving badge, and oversized actions.
  - [ ] Build 3-step token creation flow (`/get-token`) with accessibility options.
  - [ ] Build Live Status page (`/status`) with real-time position, "Come Later" guidance, and distress alert.
  - [ ] Implement tri-lingual switcher (English, Kannada, Hindi).
  - [ ] Implement text size scaling (`A-` / `A+`) and high-contrast AAA toggle.
  - [ ] Integrate Web Speech synthesis for "🔊 Read this to me" and microphone voice entry.
  - [ ] Audit against WCAG 2.1 AA/AAA compliance and verify low-bandwidth responsiveness.
  - [ ] Update documentation, commit, and push.

- [ ] **PHASE 5: SMART FEATURES AND SERVER-SIDE AUTOMATION**
  - [ ] Implement dynamic wait-time estimation range with rolling average and standard deviation.
  - [ ] Build "Come Later" guidance calculation and "I have reached" lobby check-in.
  - [ ] Implement Fair Senior Care interleaving algorithm.
  - [ ] Implement Family/Caregiver proxy tracking with WhatsApp share generator.
  - [ ] Deploy Supabase Edge Functions / cron jobs for 5-minute grace-period expiry and auto re-slotting.
  - [ ] Deploy automated consultation delay detection service.
  - [ ] Implement multi-tier notification service (Web Audio, Vibrate, MSG91 SMS, Twilio WhatsApp).
  - [ ] Update documentation, commit, and push.

- [ ] **PHASE 6: TV BOARD, REPORTS AND SETTINGS**
  - [ ] Build waiting-room TV display (`/display`) with 10-meter readability, chime, and Kannada/English voice announcements.
  - [ ] Implement dynamic waiting-room join QR code.
  - [ ] Build Reports Tab in Doctor Console with Recharts analytics and CSV/PDF export.
  - [ ] Build "Best Time to Visit" historic congestion forecast.
  - [ ] Build Settings Tab with clinic operating hours, consultation targets, and interactive Simulation Mode.
  - [ ] Update documentation, commit, and push.

- [ ] **PHASE 7: TESTING, HARDENING AND DEPLOYMENT**
  - [ ] Execute full 16-case test plan from `docs/07-test-plan.md` and document Pass/Fail status.
  - [ ] Implement rate limiting on token creation.
  - [ ] Configure global error boundaries and health-check monitoring endpoint.
  - [ ] Configure Progressive Web App (PWA) manifest and service worker for offline resilience.
  - [ ] Execute Lighthouse audit (Performance, Accessibility, PWA).
  - [ ] Deploy production frontend to Vercel/Netlify connected to production Supabase backend.
  - [ ] Capture live production screenshots and embed into `README.md`.
  - [ ] Finalize documentation, update CHANGELOG, tag release `v1.0.0`, commit, and push.

