# Implementation Plan: Demo Shell & Playground Site (F10)
*Path: kitty-specs/031-demo-shell-playground/plan.md*

**Branch**: `031-demo-shell-playground` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `kitty-specs/031-demo-shell-playground/spec.md`

**Planning Decisions** (Interrogation Complete):
- **Frontend Stack**: Vite + React 18 + TypeScript (fast dev server, aligns with F07/F09 patterns)
- **E2E Testing**: Playwright (TypeScript-based, browser-level validation, strong determinism)
- **Staging Deployment**: Docker Compose (extends B19 templates, zero local setup for reviewers)

## Summary

The Demo Shell is a minimal reference application that composes F01-F09 frontend packages and consumes B05-B18 backend APIs to validate core integration contracts end-to-end. It serves as a living smoke test that exercises authentication flows (B05/F02), multi-tenancy context switching (B06/B07/F03), hierarchical permissions (B08), notifications (B16/B17/F04), and basic resource display (B11/F05). The demo uses Vite + React 18 + TypeScript for the frontend, Playwright for E2E smoke tests, and deploys via Docker Compose to staging for zero-setup reviewer access. Total LOC target: <1500 (FR-049), ensuring the demo remains maintainable and focused on core contracts rather than product features.

## Technical Context

**Language/Version**: TypeScript 5.x + Python 3.12+ (frontend SPA + backend Django APIs)
**Primary Dependencies**:
  - Frontend: Vite 5.x, React 18.x, React Router v6, @playwright/test
  - Backend: Django 5.1+, DRF 3.14+ (consumed, not modified)
  - Packages: @django-core/design-system (F01), @django-core/auth (F02), @django-core/context-switcher (F03), @django-core/notifications-hub (F04), @django-core/resource-display-alerts (F05), @django-core/page-templates (F06), @django-core/theme-system (F07)
**Storage**: PostgreSQL (via existing backend; demo seed data script adds minimal fixtures)
**Testing**: Vitest (unit/component), Playwright (E2E smoke tests), pytest (backend seed data validation)
**Target Platform**: Web (modern browsers: Chrome, Firefox, Safari, Edge)
**Project Type**: Single-page application (SPA) consuming REST APIs
**Performance Goals**:
  - Local dev startup <30 seconds (FR-041, S-001)
  - Playwright smoke tests complete in <10 minutes CI time (FR-038, S-002)
  - Production build <5MB gzipped (typical Vite + React bundle)
**Constraints**:
  - Total LOC <1500 (FR-049, S-004) - enforces minimal scope, no custom abstractions
  - Zero core module modifications (FR-052, Gate 31.5) - demo is pure consumer
  - Seed data remains minimal: 5 users, 2 orgs, 3 projects (FR-036, S-005)
**Scale/Scope**:
  - 7 prioritized user stories (P1: auth, context, permissions; P2: templates, errors; P3: notifications, status)
  - ~10 demo pages/routes (login, dashboard, org/project lists, resource views, settings, error states)
  - 1-2 critical E2E smoke journeys (auth flow, context switching + permission check)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows (demo exercises generic auth, multi-tenancy, permissions)
- [x] **Core Focus**: Feature aligns with core concerns (validates F01-F09, B05-B18 integration contracts)
- [x] **Downstream Extension**: Demo serves as reference; products extend via same patterns (FR-052)

### II. Architecture and Modularity
- [x] **Single Responsibility**: Demo has single purpose (living smoke test), seed_demo_data.py has single purpose (fixtures)
- [x] **Stable APIs**: Demo consumes stable B13 APIs; no new public interfaces exposed
- [x] **Minimal Dependencies**: Only Vite, React 18, Playwright, React Router added (standard frontend stack)
- [x] **No Circular Deps**: Demo → F01-F09 → B05-B18 (unidirectional)
- [x] **No Downstream Imports**: Demo lives in examples/, core never imports from it

### III. Code Quality and Style
- [x] **Python 3.12+**: seed_demo_data.py uses Python 3.12+ (matches baseline)
- [x] **Type Hints**: seed_demo_data.py will use type hints; frontend uses TypeScript strict mode
- [x] **Black Formatting**: seed_demo_data.py will be formatted with Black
- [x] **Ruff Linting**: seed_demo_data.py will pass Ruff checks
- [x] **No Dead Code**: <1500 LOC constraint (FR-049) enforces no dead code
- [x] **Readable Code**: Small page components, thin hooks, focused utils (follows F01-F09 patterns)
- [x] **Curated Dependencies**: Vite/React/Playwright justified in planning Q1/Q2, pinned in package.json

### IV. Testing Strategy
- [x] **pytest + pytest-django**: seed_demo_data.py tested with pytest (validates fixtures created correctly)
- [x] **Test Coverage**: Vitest for frontend units, Playwright for E2E (FR-038: 1-2 critical journeys)
- [x] **Regression Tests**: E2E tests prevent auth/context/permission regressions (FR-040: fail build if contracts break)
- [x] **Deterministic**: Playwright config: retries disabled, fixed timeouts, tracing enabled (FR-040)
- [x] **Coverage Thresholds**: Not enforced for demo (living smoke test, not production code)
- [x] **Integration Tests**: Playwright E2E tests are full-stack integration tests (browser → frontend → backend APIs)

### V. Security and Privacy
- [x] **Secure Defaults**: Demo inherits B03 security baseline (CSRF, secure cookies, ALLOWED_HOSTS from backend)
- [x] **DEBUG Off**: Demo frontend build: production mode; backend: existing staging/prod configs (B19)
- [x] **No Secrets**: Demo uses backend API tokens (inherited), no new secrets
- [x] **Dependency Scanning**: CI scans pnpm dependencies (Dependabot/Snyk via existing CI)
- [x] **Centralized Auth**: Demo uses B05/F02 auth flows exclusively (FR-005-008)
- [x] **No Sensitive Logging**: Demo logs navigation/errors only, no PII (follows F02/F03 patterns)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Demo consumes existing optimized APIs (B13 baseline handles query optimization)
- [x] **Pagination**: Demo uses backend pagination (B13 APIs already paginate org/project lists)
- [x] **Explicit Caching**: No demo-specific caching; relies on browser cache + backend Redis (B06/B07)
- [x] **Structured Logging**: Demo uses console.log for dev, backend B18 observability for prod
- [x] **Health Checks**: Demo served via nginx (health = HTTP 200 on /); backend has B18 health endpoints
- [x] **Metrics Hooks**: No demo-specific metrics; CI tracks Playwright test duration (FR-038: <10 min)
- [x] **Graceful Degradation**: Demo shows error pages (403/404, P2 stories) and loading states (F01 components)

### VII. UX and API Design
- [x] **DRF Required**: Demo consumes existing DRF APIs (B13 baseline), no new APIs added
- [x] **Consistent Responses**: Demo relies on B13 standardized responses (pagination, errors)
- [x] **Versioning Strategy**: Demo uses current stable API version (no versioning needed, consumer-only)
- [x] **Clear Errors**: Demo surfaces B13 error messages via F04 notifications and F01 error states
- [x] **Boundary Validation**: Demo uses F02 form validation (client-side), backend enforces via B13 serializers

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: quickstart.md (Phase 1) documents `pnpm install && pnpm dev` (FR-041: <5 min, S-001)
- [x] **Mandatory Tools**: Frontend: ESLint + TypeScript, Backend: Black/Ruff/mypy (seed_demo_data.py)
- [x] **Pre-commit Hooks**: Existing repo hooks cover TypeScript/Python linting
- [x] **Type Checking**: TypeScript strict mode for demo, mypy for seed_demo_data.py
- [x] **Task Scripts**: package.json scripts: dev, build, test:unit, test:e2e (FR-038)
- [x] **Developer Docs**: README.md + quickstart.md cover local setup, seed data, smoke tests

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work on `031-demo-shell-playground` branch (already created)
- [x] **Linked to Spec**: PR references kitty-specs/031-demo-shell-playground/spec.md
- [x] **Focused PRs**: Single feature (demo shell), scoped to examples/ + seed script + Docker Compose update
- [x] **main Stable**: All work via PR to main after CI passes

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Existing CI + new `.github/workflows/ci-demo-smoke.yml` for Playwright (FR-038)
- [x] **Merge Gates**: PR requires: existing CI (Black/Ruff/mypy/pytest) + Playwright smoke tests pass (FR-040)
- [x] **Scripted Deployment**: docker-compose.staging.yml deploys demo-shell service (FR-042), documented in quickstart.md

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: All docs in kitty-specs/031-demo-shell-playground/ + examples/demo-shell/README.md
- [x] **App README**: examples/demo-shell/README.md covers purpose, setup, usage (FR-044)
- [x] **Getting Started**: quickstart.md (Phase 1) provides 5-minute local verification path (S-001)
- [x] **Extension Guide**: Demo serves as "how to compose F01-F09" reference (A-007, FR-052)
- [x] **Spec Sync**: Implementation follows spec.md exactly (53 FRs, 8 success criteria)
- [x] **ADR Required**: Planning decisions documented in plan.md (Vite/Playwright/Docker Compose choices)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: Demo complies with Gate 31.5 "Demo shell discipline" (no amendments needed)
- [x] **Template Updates**: No template changes (demo is example code, not core infrastructure)

### Violations Requiring Justification

*No violations present*

**Constitution Check Status**: ✅ PASS

**Rationale**: Demo is pure consumer of F01-F09 and B05-B18 with zero core modifications (FR-052, Gate 31.5). Lives in examples/, uses standard frontend stack (Vite/React/Playwright), adds only minimal seed data script. All constitution principles upheld.

## Project Structure

### Documentation (this feature)

```
kitty-specs/031-demo-shell-playground/
├── plan.md              # This file (planning decisions + structure)
├── research.md          # Phase 0: Tech stack rationale, best practices
├── data-model.md        # Phase 1: User/Org/Project/Permission (consumed), DemoResource (optional)
├── quickstart.md        # Phase 1: Local setup, seed data, smoke tests
├── contracts/           # Phase 1: Consumed API contracts (B13 baseline)
│   ├── auth.yaml       # B05: /auth/login, /auth/logout, /auth/me/
│   ├── organisations.yaml  # B06: /api/organisations/, /api/organisations/{id}/members/
│   ├── projects.yaml       # B07: /api/projects/, /api/projects/{id}/
│   ├── permissions.yaml    # B08: /api/permissions/current/
│   └── notifications.yaml  # B16/B17: /api/notifications/, /api/notifications/{id}/mark-read/
└── tasks.md             # Phase 2: Work packages (NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

**Structure Decision**: Web application (SPA frontend + backend seed data script). Demo lives in `examples/` as a reference implementation, not in core `src/`.

```
examples/demo-shell/                    # Demo application root
├── src/                                # React 18 + TypeScript source
│   ├── main.tsx                       # Vite entry point
│   ├── App.tsx                        # Root component with router
│   ├── routes/                        # React Router v6 route definitions
│   ├── pages/                         # Page components (Login, Dashboard, OrgList, etc.)
│   │   ├── auth/                      # Login, Logout
│   │   ├── dashboard/                 # Dashboard (P1)
│   │   ├── organisations/             # Org list/detail (P1)
│   │   ├── projects/                  # Project list/detail (P1)
│   │   ├── resources/                 # Resource views (P2)
│   │   ├── settings/                  # Settings page (P2)
│   │   └── errors/                    # 403/404 pages (P2)
│   ├── components/                    # Demo-specific compositions (minimal)
│   ├── hooks/                         # useAuth, useContext (thin wrappers around F02/F03)
│   └── lib/                           # API client setup, utils
├── tests/
│   ├── unit/                          # Vitest unit tests (page logic, utils)
│   └── e2e/                           # Playwright smoke tests
│       ├── auth-flow.spec.ts         # P1: Login → Logout journey
│       └── context-permissions.spec.ts # P1: Org switch → Project → Permission check
├── public/                            # Static assets
├── index.html                         # Vite HTML template
├── vite.config.ts                     # Vite configuration
├── playwright.config.ts               # Playwright E2E setup
├── package.json                       # pnpm workspace member
├── tsconfig.json                      # TypeScript strict mode
├── Dockerfile                         # Multi-stage build (Vite → nginx)
├── docker-compose.demo.yml            # Local orchestration
└── README.md                          # Demo-specific setup/usage

src/core/management/commands/
└── seed_demo_data.py                  # Django management command (creates 5 users, 2 orgs, 3 projects)

docker-compose.staging.yml             # Updated to include demo-shell service

.github/workflows/
└── ci-demo-smoke.yml                  # CI workflow for Playwright smoke tests
```

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
