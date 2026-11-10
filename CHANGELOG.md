# Changelog

All notable changes to the Dhanvantri Clinic Digital Queue Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

