# Changelog

All notable changes to the Dhanvantri Clinic Digital Queue Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

