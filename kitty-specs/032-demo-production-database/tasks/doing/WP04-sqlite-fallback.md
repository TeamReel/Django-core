---
lane: "doing"
agent: "claude"
shell_pid: "31232"
---
# WP04: SQLite Fallback Compatibility

## Objective
Ensure demo seed/validate/reset commands operate correctly on SQLite fallback (DEMO_DATABASE=sqlite) without schema changes.

## Inputs
- spec.md, plan.md
- WP01 seed data helpers (must be ORM-only)
- WP02 command behaviors

## Tasks Covered
- T013 SQLite fallback compatibility (switching, smoke tests)

## Deliverables
- Configuration/guardrails to run seed/validate/reset against SQLite (dev/CI smoke)
- Adjustments to commands/helpers to avoid PostgreSQL-specific features
- Simple smoke script or doc note for running on SQLite

## Acceptance / Checks
- `DEMO_DATABASE=sqlite python manage.py migrate && python manage.py seed_demo_data` succeeds
- `validate_demo_data` and `reset_demo_data` succeed on SQLite with same counts

## Constraints
- No schema changes; keep code paths portable across PostgreSQL/SQLite

## Notes
- Coordinate with WP02 to reuse validation/reset without branching logic.

## Activity Log

- 2025-12-17T13:00:34Z – claude – shell_pid=31232 – lane=doing – Started SQLite fallback implementation
