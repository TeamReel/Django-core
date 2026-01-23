# Research Summary

## Decisions and Rationale
- **Seed data scope**: 5 orgs, 20 users, exactly 80 projects; balances realism and deterministic E2E assertions. Source: spec clarifications session 2025-12-17.
- **Audit events volume**: 200-300 events per run using seeded randomness; provides variability without breaking assertions. Source: spec clarifications session 2025-12-17.
- **Transactions window**: Last 30 days; aligned with audit/notifications timestamps for coherent activity timelines. Source: spec clarifications session 2025-12-17.
- **Notifications unread count**: Range 5-10 unread per demo account (seeded); keeps UX realistic while testable. Source: spec clarifications session 2025-12-17.
- **Auto-seed behavior**: Auto-seed enabled for `demo` profile; manual seed for `demo-lite` to keep lightweight startup. Source: planning alignment 2025-12-17.
- **Determinism toggle**: Support `DEMO_RANDOM_SEED` (e.g., 42) for reproducible runs; unset for semi-random defaults. Source: spec clarifications session 2025-12-17.

## Evidence Mapping
- [spec.md](kitty-specs/032-demo-production-database/spec.md) — authoritative requirements and clarifications.
- [plan.md](kitty-specs/032-demo-production-database/plan.md) — captured technical context and constitution alignment.
- research/evidence-log.csv — traceability log (stub).
- research/source-register.csv — sources registry (stub).

## Open Questions / Risks
- None identified at this stage.
