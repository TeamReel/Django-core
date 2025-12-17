---
lane: "for_review"
agent: "claude"
shell_pid: "31232"
---
# WP03: Docker Profiles & Auto-Seed

## Objective
Provide docker profiles for demo (auto-seed) and demo-lite (manual) with environment templates and entrypoint wiring.

## Inputs
- spec.md, plan.md
- quickstart.md
- WP01 seed command behavior (CLI flags, outputs)

## Tasks Covered
- T012 Docker profiles/env (.env.demo example, compose profiles, entrypoint wiring)
- T016 PostgreSQL pooling readiness (pgbouncer-compatible settings, validation)

## Deliverables
- docker-compose profile `demo` that runs migrations + seed automatically and reaches healthy state <60s
- docker-compose profile `demo-lite` that starts services without auto-seed; documents manual seed step
- .env.demo (or example) showcasing required env vars for demo profile
- Documentation of pgbouncer-compatible connection settings (pooling parameters) and optional compose service stub or notes for integration
- Django DATABASES config with read-replica entry (settings-only template; no physical replica deployed yet)

## Acceptance / Checks
- `docker-compose --profile demo up` seeds automatically and logs summary output
- `docker-compose --profile demo-lite up` starts clean; manual `seed_demo_data` works
- Profiles do not affect non-demo deployments
- Pooling readiness: Settings are documented and a simple connection validation step passes (e.g., `CONN_MAX_AGE`/pool params aligned for pgbouncer)
- Read-replica template present in .env.demo example (settings only; no physical replica expected)

## Constraints
- No schema changes; reuse existing images where possible
- Keep entrypoint scripts idempotent and safe to rerun

## Notes
- Reuse structured outputs from WP01/WP02 for health logging if available.

## Activity Log

- 2025-12-17T12:33:40Z – claude – shell_pid=31232 – lane=doing – Started implementation of Docker profiles and auto-seed
- 2025-12-17T12:37:16Z – claude – shell_pid=31232 – lane=for_review – Implementation complete: Docker profiles (demo/demo-lite), entrypoint script, .env.demo template, comprehensive documentation. Commit: 1cd2f419
