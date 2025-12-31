## Current Mode: Repository Analysis & Release Stabilisation (Go-Live Track)

We are currently in a REPOSITORY ANALYSIS + STABILISATION phase for the Django Core-App.
Goal: make the repository “releaseable” so we can bring the demo webapp live with a real database and a real URL.

This is not new feature development. Do not expand scope.

What “done” means in this phase:
- The application boots and core end-to-end flows work in the webapp (frontend + backend + API + auth + context + permissions).
- The repository is internally consistent: tests, factories, fixtures, URLs, and API contracts match the current implementation.
- CI-quality expectation: test suite should be green. If a test is stale, it must be updated or removed with an explicit justification in the PR/commit message (do not ignore or skip silently).
- Prefer minimal, targeted changes. No refactors unless required to fix a concrete failing test or broken runtime behavior.

Source of truth hierarchy:
1) Current implementation + documented go-live constraints (triage/fix summaries)
2) Engineering Constitution quality rules (tests must pass in CI; tests should be intention-revealing)
3) Roadmap/Architecture docs for intended shape (avoid inventing new systems)

How to work (lean):
- Cluster failures, fix the highest-blast-radius root causes first (e.g., factories/fixtures breaking many tests).
- For each fix, state:
  - observed failure (test name + error)
  - the minimal code change (file-level)
  - how to verify (targeted test command or quick manual check)
- Run targeted tests first; run full suite only after major clusters are resolved.

Explicit constraints:
- The “demo-shell” is a real reference webapp. Do not add demo-only hacks in core.
- If behavior is ambiguous, ask before changing public API/contracts.
- Do not add unrelated improvements “while we’re here”.

Priority order for stabilisation (typical):
- Factories/fixtures regressions (User model fields, Organisation.creator NOT NULL, required Notification fields)
- URL slashes/NoReverseMatch mismatches
- Contract mismatches (API envelopes/pagination)
- Cache/test isolation issues (clear cache or unique identifiers where needed)
