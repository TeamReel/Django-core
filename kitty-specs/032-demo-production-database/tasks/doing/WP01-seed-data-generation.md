---
lane: "doing"
agent: "claude"
shell_pid: "31232"
---
# WP01: Seed Data Generation

## Objective
Build deterministic, realistic seed data for demo mode: 5 orgs, 20 users, 80 projects, 200-300 audit events, transactions over last 30 days, notifications (5-10 unread per demo account), feature flags placeholders. Seed must be idempotent and complete in <30s initial run, <5s rerun when data exists.

## Inputs
- spec.md, plan.md, research.md, data-model.md
- contracts/management-commands.md
- quickstart.md

## Tasks Covered
- T001 Seed scaffolding/helpers (constants, seeded randomness, base factories)
- T002 Orgs/users/demo accounts/preferences
- T003 Projects with statuses and assignments
- T004 Transactions (purchase/usage/refund) with non-negative balances
- T005 Audit events (typed, timestamped)
- T006 Notifications (unread/read mix, channels)
- T007 Feature flags & file metadata placeholders
- T008 Seed idempotency & progress logging

## Deliverables
- Implement `seed_demo_data` management command (core logic/data generation) with summary output and deterministic seed option (DEMO_RANDOM_SEED)
- Reusable helpers/factories supporting PostgreSQL primary, SQLite fallback (ORM-only)
- Seeded data meeting counts and constraints defined in spec/plan

## Acceptance / Checks
- Running `python manage.py seed_demo_data` creates dataset matching counts and constraints; rerun is idempotent (<5s) with no duplicates
- Summary output shows counts per entity; optional `--json` or structured log hook ready for WP02 consumption
- Seed data timestamps within last 30 days; balances non-negative; roles/permissions consistent with contracts
- Role distribution enforced: exactly 3 superusers, 10 org admins, and 7 members/viewers reported in summary
- Realistic naming enforced: no lorem ipsum; names sourced from curated lists; acceptance validated in summary sample

## Constraints
- No schema changes; Django/DRF stack; PostgreSQL primary, SQLite fallback
- Use bulk operations and prefetch/select_related to stay performant
- Keep seed safe for repeated execution in demo profile only

## Notes
- Coordinate exposed outputs/summary fields with WP02 for validation and tests.

## Activity Log

- 2025-12-17T10:58:59Z – claude – shell_pid=31232 – lane=doing – Started seed data generation implementation
