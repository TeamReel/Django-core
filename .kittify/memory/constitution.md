<!--
SYNC IMPACT REPORT - Django Core-App Constitution v1.0.0
==========================================================
Version Change: NEW → 1.0.0 (Initial ratification)
Ratification Date: 2025-11-20

PRINCIPLES ESTABLISHED:
- I. Purpose and Scope (Product-agnostic core constraint)
- II. Architecture and Modularity (Layering and extension rules)
- III. Code Quality and Style (Python 3.12+, Black, Ruff, type hints)
- IV. Testing Strategy (pytest-django, deterministic, coverage gates)
- V. Security and Privacy (Secure defaults, no secrets in code)
- VI. Performance and Reliability (Query optimization, pagination, graceful degradation)
- VII. UX and API Design (DRF, versioning, consistent responses)
- VIII. Developer Experience and Tooling (Easy setup, mandatory tooling)
- IX. Branching and Git Workflow (main stable, feature branches, PR requirements)
- X. CI/CD and Quality Gates (Linting, formatting, mypy, pytest gates)
- XI. Documentation and Knowledge Sharing (In-repo docs, ADRs)
- XII. Constitution Evolution (Deliberate changes via Spec Kitty flow)

TEMPLATES UPDATED:
✅ spec-template.md - Added constitution alignment validation
✅ plan-template.md - Added comprehensive Constitution Check gate
✅ tasks-template.md - Added principle-driven task categories

FOLLOW-UP ACTIONS:
- None (all templates synchronized)

COMMIT MESSAGE SUGGESTION:
docs: ratify Django Core-App constitution v1.0.0

Establishes 12 core principles governing architecture, quality, testing,
security, performance, and workflow for the django-core-app. All Spec Kitty
templates updated to enforce constitutional compliance.
-->

# Django Core-App Constitution

## I. Purpose and Scope

This constitution governs how the django-core-app is designed, implemented,
tested and operated. It applies to all contributors, maintainers and integrators
working in this repository.

The Core-App focuses on the reusable, product-agnostic core: accounts,
organisations, projects, settings, audit logging and observability.

**Product-Agnostic Constraint**: Product-specific logic MUST live in separate,
downstream projects that extend this core; it MUST NOT be added directly to the
Core-App.

**Rationale**: Maintaining a clean boundary between generic infrastructure and
product-specific features ensures the core remains reusable, testable, and
evolvable without coupling to any single product's lifecycle.

---

## II. Architecture and Modularity

The Core-App remains strictly product-agnostic; no feature may embed
product-specific rules, pricing, workflows or UI flows.

**Layering Rules**:
- Clear layering MUST be respected
- Each Django app MUST have a single responsibility and a stable public API
- Dependencies MUST be minimal and explicit; circular dependencies are forbidden
- Extension points MUST be documented and stable
- Direct imports from downstream products into the core are forbidden

**Rationale**: Well-defined boundaries and stable interfaces allow downstream
projects to extend the core safely without breaking changes propagating
unpredictably.

---

## III. Code Quality and Style

**Baseline Standards**:
- Python 3.12+ is the baseline
- Core modules MUST use type hints
- Black is the single formatting source of truth
- Ruff is the primary linter
- Dead code is not allowed
- Functions/classes MUST be small and readable
- Dependencies MUST be curated and pinned deliberately

**Rationale**: Consistent style, strong typing, and minimal dependencies reduce
cognitive load, improve maintainability, and make onboarding faster.

---

## IV. Testing Strategy

**Mandatory Framework**: pytest + pytest-django

**Testing Rules**:
- Every feature MUST include appropriate tests
- Every bug fix MUST include a regression test
- Tests MUST be deterministic and fast
- Coverage thresholds MUST be enforced and increased over time
- Integration tests MUST cover key flows
- Existing tests affected by a change MUST be updated to reflect the new expected behaviour before the feature can be accepted

**Rationale**: Comprehensive testing prevents regressions, enables confident
refactoring, and serves as living documentation of expected behavior.


---

## V. Security and Privacy

**Secure Defaults**:
- CSRF protection enabled
- Secure cookies configured
- Strict ALLOWED_HOSTS enforcement
- HTTPS required in non-dev environments
- DEBUG MUST be off outside local dev

**Secret Management**:
- Secrets MUST NOT be committed; use env vars / secret managers
- Dependencies MUST be scanned in CI
- Authentication/authorization MUST be centralized and auditable
- Sensitive data MUST NOT be logged

**Rationale**: Security by default prevents common vulnerabilities. Centralized
auth and audit trails support compliance and incident response.

---

## VI. Performance and Reliability

**Performance Requirements**:
- Queries MUST be efficient; N+1 queries are not allowed
- APIs MUST use pagination and avoid unbounded responses
- Caching MAY be used but MUST be explicit

**Reliability Requirements**:
- Structured logging and health checks are mandatory
- Metrics hooks MUST exist
- Failures MUST degrade gracefully

**Rationale**: Efficient queries and pagination protect database resources at
scale. Observability enables rapid troubleshooting. Graceful degradation
maintains user experience during partial failures.

---

## VII. UX and API Design

**API Standards**:
- Django REST Framework (DRF) is required
- API responses MUST be consistent and documented
- Breaking changes MUST use versioning or deprecation paths
- Error messages MUST be clear and safe (no sensitive data leaks)
- Validation MUST happen close to the boundary (serializers/forms)

**Rationale**: Consistent APIs reduce integration friction. Clear error messages
improve developer experience. Boundary validation prevents invalid data from
propagating into business logic.

---

## VIII. Developer Experience and Tooling

**Setup Standards**:
- Local environment MUST be easy to set up
- Black, Ruff, mypy and pytest are mandatory tools
- Pre-commit hooks SHOULD match CI
- Type checking MUST run cleanly for core modules
- Common tasks SHOULD be scripted (make/task runner)
- Developer-facing docs MUST exist

**Rationale**: Low friction setup accelerates onboarding. Consistent tooling
across local and CI environments catches issues early. Scripts reduce cognitive
load for common operations.

---

## IX. Branching and Git Workflow

**Branch Management**:
- `main` is stable
- All work MUST occur on branches
- Feature branches MUST use `feature/NNN-name` format
- PRs MUST be reviewed and linked to specs
- PRs MUST remain focused and small

**Rationale**: Stable main enables continuous deployment. Small, focused PRs are
easier to review and reduce merge conflicts.

---

## X. CI/CD and Quality Gates

**CI Requirements**:
- CI MUST run linting, formatting checks, mypy, pytest
- Merging is only allowed when all CI checks pass
- Emergency merges MUST follow an explicit process
- Deployments MUST be scripted and repeatable

**Rationale**: Automated quality gates prevent broken code from reaching
production. Repeatable deployments reduce human error.

---

## XI. Documentation and Knowledge Sharing

**Documentation Standards**:
- Docs MUST live in the same repo
- Each core app MUST have a README
- A "getting started" and "how to extend" guide MUST exist
- Specs MUST remain in sync with implementation
- Major architectural decisions SHOULD use ADRs (Architecture Decision Records)

**Rationale**: Co-located docs stay fresh. ADRs preserve context for future
maintainers. Extension guides accelerate downstream integration.

---

## XII. Constitution Evolution

**Amendment Process**:
- Changes MUST be deliberate and follow a Spec Kitty flow
- Template updates MUST be propagated
- Backward-incompatible changes MUST include migration guidance

**Rationale**: Deliberate evolution prevents constitution drift. Consistent
processes ensure all stakeholders understand and adopt changes.

---

## Governance

This constitution supersedes all other development practices. All PRs, code
reviews, and architectural decisions MUST verify compliance with these
principles.

Complexity that violates these principles MUST be justified explicitly in
planning documents, with simpler alternatives documented and their rejection
rationale recorded.

**Version**: 1.0.0 | **Ratified**: 2025-11-20 | **Last Amended**: 2025-11-20
