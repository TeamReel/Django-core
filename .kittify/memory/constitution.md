<!--
SYNC IMPACT REPORT - Django Core-App Constitution v1.3.0
==========================================================
Version Change: 1.2.0 → 1.3.0 (MINOR: New Article XIII added)
Amendment Date: 2026-02-04

CHANGES - NEW ARTICLE XIII (Feature Delivery & Production Integration):

ADDED SECTIONS:
+ Article XIII: Feature Delivery & Production Integration (NEW)
  - Mandatory Delivery Checklist for every feature
  - Production-safe migration requirements (Railway)
  - Seed data requirements (fixtures/factories)
  - Admin registration requirements
  - API testing in Swagger/OpenAPI
  - Demo app integration requirements
  - Manual test file requirements
  - Documentation requirements
  - "Done" definition now includes production integration

RATIONALE:
Every feature MUST be immediately usable in the running web application.
No "loose" modules that need later integration. Incremental value delivery.
Prevents technical debt accumulation from unintegrated features.

PREVIOUS VERSION v1.2.0:
Version Change: 1.1.0 → 1.2.0 (MINOR: Mandatory pytest requirements added)
Amendment Date: 2026-01-06

CHANGES TO ARTICLE IV (Testing Strategy):

STRENGTHENED SECTIONS:
~ Testing Requirements - MANDATORY pytest structure for all modules
  - Every Django app in src/ MUST have tests/ directory with pytest files
  - Minimum coverage requirements enforced:
    * Models: ≥90% line coverage
    * API endpoints: ≥85% line coverage
    * Serializers/Forms: ≥80% line coverage
    * Permissions: ≥90% line coverage
  - Test file naming convention: test_models.py, test_api.py, test_serializers.py, test_permissions.py
  - CI MUST fail if module coverage drops below thresholds

PREVIOUS VERSION v1.1.0:
Version Change: 1.0.0 → 1.1.0 (MINOR: New mandatory requirements added)
Amendment Date: 2026-01-05

CHANGES TO ARTICLE XI (Documentation and Knowledge Sharing):

ADDED SECTIONS:
+ Section 1: Module Documentation Requirements (MANDATORY)
  - Every Django app in src/ MUST have README.md
  - Template provided at .github/templates/MODULE_README.md
  - CI validation enforces compliance
  - Required content: Purpose, Scope, Components, Public Interface, Integration Example, Related Modules, Extension Points

+ Section 2: Extension Guide (MANDATORY)
  - MUST exist at documents/06-workflow/extending-core.md
  - Content: Scaffolding new products, importing core modules, extension patterns, migration guide
  - Linked from documents/06-workflow/index.md

STRENGTHENED SECTIONS:
~ Section 3: ADR Process (Clarified existing SHOULD)
  - ADRs MUST be indexed at documents/03-system/architecture-decisions.md
  - ADR template MUST be provided
  - Process MUST be documented: when to write, numbering, storage (docs/system/adr/)

+ Section 4: Constitution-Spec Kitty Integration (NEW cross-reference)
  - Constitution evolution MUST follow Spec-Kitty flow (reinforces Art. XII)
  - Template updates MUST propagate to spec/plan/tasks templates

INITIAL VERSION v1.0.0:
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

**Module Test Structure** (MANDATORY):
- Every Django app in `src/` MUST have a `tests/` directory containing pytest test files
- Required test files per module (where applicable):
  * `test_models.py` - Model tests (≥90% line coverage required)
  * `test_api.py` - ViewSet/View endpoint tests (≥85% line coverage required)
  * `test_serializers.py` - Serializer/Form validation tests (≥80% line coverage required)
  * `test_permissions.py` - Permission logic tests (≥90% line coverage required)
  * `test_managers.py` - Custom manager/queryset tests (≥85% line coverage required)
- Test file naming MUST follow `test_*.py` pattern for pytest discovery
- Each test file MUST use pytest fixtures and pytest-django decorators
- CI MUST fail if any module drops below coverage thresholds

**Testing Requirements**:
- Every feature MUST include tests before acceptance (blocking requirement)
- Every bug fix MUST include a regression test
- Tests MUST be deterministic and fast (<5s per module, <60s total suite)
- Coverage thresholds MUST be enforced in CI
- Integration tests MUST cover key user flows from spec scenarios
- Existing tests affected by a change MUST be updated to reflect the new expected behaviour before the feature can be accepted

**Rationale**: Comprehensive testing prevents regressions, enables confident
refactoring, and serves as living documentation of expected behavior. Explicit
coverage thresholds ensure quality standards are maintained. Mandatory test
structure prevents "test debt" accumulation and makes test suites discoverable.


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

## XIII. Feature Delivery & Production Integration

**Delivery Checklist** (MANDATORY for every feature):
Every feature MUST complete the following checklist before being marked as "done":

1. **Migrations**: Applied to Railway production database
   - Migrations MUST be production-safe (no destructive operations without review)
   - Use `update_or_create` patterns for seed data, NEVER `DROP TABLE`
   - Test migrations on staging before production

2. **Seed Data**: Fixtures and/or factories created
   - Every module MUST have factory classes for testing (`tests/factories.py`)
   - Demo seed data MUST be included for development environments
   - Seed scripts MUST be idempotent (safe to run multiple times)

3. **Admin Registration**: Django Admin configured
   - All models MUST be registered in `admin.py`
   - List displays, filters, and search fields MUST be configured
   - Inline admins for related models where appropriate

4. **API Testing**: Endpoints tested in Swagger/OpenAPI
   - All endpoints MUST be accessible via `/api/docs/`
   - Request/response examples MUST be documented
   - Error responses MUST be consistent with API standards

5. **Demo App Integration**: Feature visible in running application
   - Backend features MUST be testable via demo frontend (if applicable)
   - New entities MUST appear in navigation or relevant lists
   - CRUD operations MUST be verifiable through the UI

6. **Manual Test File**: Test documentation completed
   - Manual test file MUST exist in `documents/08-testing/manual-tests/`
   - Covers user flows that can't be fully automated
   - Includes setup steps, test scenarios, expected results

7. **Documentation**: README and usage examples updated
   - Module README MUST include integration examples
   - API endpoints MUST have usage examples
   - Any configuration options MUST be documented

**Definition of Done**:
A feature is only "done" when:
- All code is merged to main
- All tests pass in CI
- All Delivery Checklist items are completed
- Feature is live and functional in the Railway deployment
- Feature can be used by end users without additional integration work

**Rationale**: Every module MUST deliver immediate value to the running
application. No "loose" modules that require future integration. This ensures
incremental delivery, prevents technical debt, and maintains a working product
at all times.

---

## Governance

This constitution supersedes all other development practices. All PRs, code
reviews, and architectural decisions MUST verify compliance with these
principles.

Complexity that violates these principles MUST be justified explicitly in
planning documents, with simpler alternatives documented and their rejection
rationale recorded.

**Version**: 1.3.0 | **Ratified**: 2025-11-20 | **Last Amended**: 2026-02-04
