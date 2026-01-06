# ENGINEERING_CONSTITUTION.md

## Purpose

This document defines the engineering principles and quality standards for the Django Core-App.
It acts as the „constitution” enforced by human reviewers and the Constitutional Enforcement Engine.

---

## 1. Code Quality and Style

- Python code:
  - type hints required for public functions and methods
  - follow PEP 8 + project-specific conventions
  - small, focused modules and functions
- Django:
  - fat models avoided; business logic in services/use-case layers where appropriate
  - migrations kept clean and reviewed
- Frontend:
  - component-based design
  - clear separation of layout, logic and styling

---

## 2. Testing

- All non-trivial code paths must be covered by tests.
- Test types:
  - unit tests for core logic
  - integration tests for critical flows (auth, org/project context, notifications)
- Minimal expectations:
  - new features include tests
  - test suite must pass in CI
- Style:
  - tests should be readable and intention-revealing
  - prefer pytest-style tests with fixtures over heavy class hierarchies

---

## 3. Security

- Secure by default:
  - Django security settings (HTTPS-only, secure cookies, CSRF, headers) enabled by default
  - no secrets in repository
- Authentication and authorization:
  - all sensitive views/APIs must be authenticated
  - authorization must be explicit and auditable
- CI security:
  - dependency scanning
  - static analysis where possible
- Data protection:
  - minimise sensitive data storage
  - log redaction by default for secrets and PII

---

## 4. Performance

- Prefer simple, predictable algorithms over premature micro-optimisations.
- Database:
  - avoid N+1 queries (use `select_related/prefetch_related` where needed)
  - indexes for frequently queried fields
- API:
  - sensible pagination defaults
  - avoid heavy synchronous work in requests (delegate to background tasks)

---

## 5. UX and Accessibility

- Default UI must be:
  - clear and predictable
  - keyboard-accessible where possible
  - with sufficient color contrast
- Error messages:
  - actionable and concise
- No product-specific branding in the Core-App.

---

## 6. Documentation

- Every feature (Bxx/Fxx) must be traceable to:
  - a Spec Kitty spec (`/spec-kitty.specify`)
  - a plan and tasks where relevant
- Developer-facing docs:
  - kept in Markdown
  - stored next to related code or in `docs/`
- Changelogs:
  - summarise user-visible or integrator-visible changes per release.

---

## 7. Branching Strategy and CI/CD

- Default branch: `main`
- Feature branches:
  - named after feature IDs, e.g. `feature/B05-core-accounts`
- Pull requests:
  - linked to Spec Kitty feature and tasks
  - require CI to pass before merge
- Merge strategy:
  - squash merge preferred (clean history)
  - automated tagging and changelog update where configured

---

## 8. AI Usage and Review

- AI-generated code:
  - must be reviewed by a human or a dedicated review agent (`/spec-kitty.review`)
  - must satisfy tests, linting and type checking
- Specs and prompts:
  - clear, scoped and refer to feature IDs
- AI is an assistant, not an authority:
  - final responsibility remains with the human maintainer.

---

## 9. Governance and Enforcement

- This constitution:
  - is the reference for the Constitutional Enforcement Engine (B02)
  - may evolve, but changes must be explicit and documented.
- Violations:
  - can be advisory (warning) or strict (block merge)
  - severity defined per rule in the enforcement engine configuration.

---
