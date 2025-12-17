# WP02: Commands, Validation, Tests & Observability

## Objective
Implement validate and reset commands plus test coverage and logging/JSON outputs for seed/reset flows.

## Inputs
- spec.md, plan.md
- contracts/management-commands.md
- outputs from WP01 (seed command structure, summary fields)

## Tasks Covered
- T009 Validation command checks (admins, balances, permissions, audit refs, notifications scoped)
- T010 Reset command (scoped wipe + reseed with --force; <60s end-to-end)
- T011 Pytest coverage for seed/validate/reset (idempotency, counts, outcomes)
- T014 Performance & observability (bulk operations, timing/logging, --json outputs)

## Deliverables
- `validate_demo_data` management command with human-readable and `--json` output
- `reset_demo_data` management command invoking validation/seed as needed; supports `--force`, optional `--no-seed`
- Logging/structured outputs reused by tests; timing metrics and database size (e.g., `db_size_mb`) surfaced in logs/JSON
- Pytest suite covering happy paths, idempotency, validation failures, reset flow (counts asserted per spec)

## Acceptance / Checks
- `python manage.py validate_demo_data --json` returns pass with counts, timings, and `db_size_mb`; fails meaningfully on issues
- `python manage.py reset_demo_data --force` wipes only demo data and reseeds within target time; idempotent
- Pytest suite passes and enforces expected counts; uses deterministic seed

## Constraints
- No schema changes; ORM-only; works on PostgreSQL and SQLite
- Do not break non-demo environments; scope resets strictly to demo-tagged data

## Notes
- Align output schema with WP01 summary fields to avoid duplication.
