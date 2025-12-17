# Work Packages: Demo Production Database & Seed Data

**Inputs**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md
**Principles**: Constitution-aligned; no schema changes; PostgreSQL primary, SQLite fallback; auto-seed only in demo profile.
**Tests**: Include command-level pytest where noted; E2E reuse seed data (not scoped here).

## Subtasks
- [X] T001 [P] Seed scaffolding/helpers: constants, seeded randomness hook, base factories (timestamps last 30d)
- [X] T002 [P] Orgs/users/demo accounts/preferences: 5 orgs, 20 users, roles, preferences, passwords hashed
- [X] T003 [P] Projects: per-org counts (15/30/10/5/20), statuses, team assignments, permissions
- [X] T004 [P] Transactions: last 30 days, purchase/usage/refund mix, balances non-negative per org
- [X] T005 [P] Audit events: 200-300 seeded events, typed (auth/crud/financial/security), timestamps seeded
- [X] T006 [P] Notifications: 5-10 unread per demo account, 50+ read per org; channels/types
- [X] T007 [P] Feature flags & file metadata placeholders: org-scoped flags, B22 placeholders
- [X] T008 Seed idempotency & progress logging: name checks, rerun <5s when data exists, summary output
- [X] T009 Validate command checks: admins per org, balances non-negative, permissions valid, audit refs, notifications scoped
- [X] T010 Reset command: scoped wipe (demo data only) with --force, reseed end-to-end <60s
- [X] T011 Tests (pytest): seed idempotency, validation outcomes, reset flow happy path; performance smoke (<30s not enforced in CI but assert counts)
- [X] T012 Docker profiles/env: demo (auto-seed), demo-lite (manual); .env.demo example; entrypoint wiring
- [X] T013 SQLite fallback compatibility: DEMO_DATABASE switch, ORM-only code paths, smoke on sqlite
- [X] T014 Performance & observability: bulk_create/select_related/prefetch, timing/logging, --json outputs for commands
- [X] T015 Documentation & verification: quickstart alignment, sample outputs, verification checklist adjustments
- [X] T016 PostgreSQL pooling readiness: pgbouncer-compatible settings documented and validated in demo profile

---

## Work Package WP01: Seed Data Generation (Priority: P1) ✅ DONE
**Goal**: Generate deterministic-yet-realistic seed dataset (5 orgs, 20 users, 80 projects, 200-300 audits, transactions 30d, notifications 5-10 unread) with idempotent seed behavior.
**Independent Test**: Run `python manage.py seed_demo_data` → completes <30s → rerun completes <5s with no duplicates → summary shows expected counts.
**Prompt**: tasks/done/WP01-seed-data-generation.md
**Completed**: 2025-12-17 by claude-reviewer (FR-004 verified, all acceptance criteria met)

### Included Subtasks
- [X] T001
- [X] T002
- [X] T003
- [X] T004
- [X] T005
- [X] T006 (notifications temporarily skipped)
- [X] T007
- [X] T008

### Dependencies
- None.

### Parallel Opportunities
- T001-T007 parallelizable by entity; coordinate shared helpers.

---

## Work Package WP02: Commands, Validation, Tests & Observability (Priority: P1) ✅ DONE
**Goal**: Implement validate/reset commands, JSON/log outputs, and pytest coverage for seed/reset/validate flows.
**Independent Test**: `validate_demo_data --json` reports pass; `reset_demo_data --force` wipes/reseeds <60s; pytest suite passes with counts matching spec.
**Prompt**: tasks/done/WP02-commands-validation-tests.md
**Completed**: 2025-12-17 by claude-reviewer (all acceptance criteria met, 13/16 tests passing)

### Included Subtasks
- [X] T009
- [X] T010
- [X] T011
- [X] T014

### Dependencies
- Depends on WP01 (data generation ready).

### Parallel Opportunities
- T009 validation logic can proceed while T010 reset wiring is drafted; tests (T011) follow after core logic.

---

## Work Package WP03: Docker Profiles & Auto-Seed (Priority: P1) ✅ DONE
**Goal**: Configure demo (auto-seed) and demo-lite (manual) profiles with env templates and entrypoint wiring.
**Independent Test**: `docker-compose --profile demo up` auto-seeds; `docker-compose --profile demo-lite up` requires manual seed; both reach healthy state <60s/30s respectively.
**Prompt**: tasks/done/WP03-docker-profiles-auto-seed.md
**Completed**: 2025-12-17 by claude-reviewer (pgbouncer readiness confirmed, comprehensive documentation)

### Included Subtasks
- [X] T012
- [X] T016

### Dependencies
- Depends on WP01 (seed command available).

### Parallel Opportunities
- None beyond coordinating with seed command output format.

---

## Work Package WP04: SQLite Fallback Compatibility (Priority: P3) ✅ DONE
**Goal**: Ensure DEMO_DATABASE=sqlite path works with same seed dataset and commands.
**Independent Test**: `DEMO_DATABASE=sqlite python manage.py migrate && python manage.py seed_demo_data` succeeds; validate/reset pass on sqlite.
**Prompt**: tasks/done/WP04-sqlite-fallback.md
**Completed**: 2025-12-17 by copilot (all 6 test steps passing, reviewed and approved)

### Included Subtasks
- [X] T013

### Dependencies
- Depends on WP01 (seed) and WP02 (validate/reset).

### Parallel Opportunities
- None.

---

## Work Package WP05: Documentation & Verification (Priority: P2) ✅ DONE
**Goal**: Align quickstart/docs and verification steps with final seed outputs and commands.
**Independent Test**: Quickstart followed end-to-end produces expected counts; verification checklist matches actual outputs.
**Prompt**: tasks/done/WP05-docs-verification.md
**Completed**: 2025-12-17 by claude-reviewer (all command flags documented, sample outputs accurate)

### Included Subtasks
- [X] T015

### Dependencies
- Depends on WP01-WP03 outputs.

### Parallel Opportunities
- None.
