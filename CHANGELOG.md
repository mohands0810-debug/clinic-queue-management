# Changelog

All notable changes to the Dhanvantri Clinic Digital Queue Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
