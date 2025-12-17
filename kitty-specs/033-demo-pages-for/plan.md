# Implementation Plan: Demo Pages for Modules 001-030
*Path: kitty-specs/033-demo-pages-for/plan.md*

**Branch**: `033-demo-pages-for` | **Date**: 2025-12-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/033-demo-pages-for/spec.md`

## Summary

**Primary Requirement**: Create 24 fully functional demo pages demonstrating all implemented modules (B01-B21, F01-F09) with real backend integration, realistic seed data from module 032, and comprehensive E2E testing.

**Technical Approach**:
- React 18.2 + TypeScript 5.6 pages organized by category (identity/, config/, platform/, frontend/, docs/)
- F06 page templates + F01 design system components (zero custom CSS)
- Chart.js 4.x lazy loaded for credits + observability visualizations
- React Router v6 with URL query params for shareable filtered views
- Collapsible accordion sidebar navigation (active category expanded)
- 30-second polling for observability metrics
- Playwright E2E tests per page (3 roles: viewer, member, admin)
- Real backend API integration (no mocks) consuming B01-B21 endpoints
- Seed data from module 032 (5 orgs, 20 users, 80 projects, 200+ audit events)
- Phased implementation: P1 (identity, config) → P2 (platform, frontend) → P3 (tasks, notifications, docs) → Chart.js integration
- Performance targets: <2s page load, <500ms Chart.js load, <100KB bundle increase

## Technical Context

**Language/Version**: TypeScript 5.6.2 (strict mode)
**Primary Dependencies**:
- React 18.2.0 (UI framework)
- React Router v6 (client-side routing, useSearchParams)
- Chart.js 4.x + react-chartjs-2 5.x (data visualization, lazy loaded)
- Vite 5.4.8 (build tool, code-splitting)
- Frontend packages: F01 (design system), F06 (templates), F03 (context), F07 (theme), F09 (integration patterns)

**Storage**: N/A (frontend-only, consumes backend APIs)
**Testing**: Playwright E2E tests (one test file per page, 3 user roles)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari), Node.js 18+ development environment
**Project Type**: Web application frontend (examples/demo-shell)
**Performance Goals**:
- <2 seconds initial page load (95th percentile, including API calls)
- <500ms Chart.js library load (lazy loaded, code-split)
- <100KB gzipped bundle size increase (Chart.js ~65KB + demo code ~35KB)
- 30-second polling interval for observability metrics

**Constraints**:
- MUST use ONLY F01 components + F06 templates (zero custom CSS beyond theme variables)
- MUST integrate with real backend APIs (B01-B21), NO mocked data
- MUST display seed data from module 032 (5 orgs, 20 users, 80 projects, 200+ events)
- MUST respect B08 permissions (viewer < member < admin role hierarchy)
- MUST support F07 theme system (light/dark mode with persistence via B12)
- MUST lazy load Chart.js (not in initial bundle)

**Scale/Scope**:
- 24 demo pages across 5 navigation categories
- 80 projects, 5 organisations, 20 users, 200+ audit events (seed data volume)
- 42 functional requirements, 17 success criteria
- 24 E2E test files (one per page)

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
- [✅] **Product-Agnostic**: Demo pages showcase platform capabilities, no product-specific business logic
- [✅] **Core Focus**: Feature demonstrates core modules (organisations, projects, audit, credits, observability)
- [✅] **Downstream Extension**: Lives in examples/ folder, clearly marked as demonstration (not core src/)

### II. Architecture and Modularity
- [✅] **Single Responsibility**: Each page has one purpose (demonstrate one module or capability)
- [✅] **Stable APIs**: Consumes existing B01-B21 APIs (no new APIs created)
- [✅] **Minimal Dependencies**: Chart.js is only new dependency, justified for data visualization
- [✅] **No Circular Deps**: Pages consume F01-F09 packages, no circular imports
- [✅] **No Downstream Imports**: Examples folder does not import from product-specific projects

### III. Code Quality and Style (Frontend Adaptation)
- [✅] **TypeScript 5.6+**: Strict mode enabled, 100% type coverage for demo pages
- [✅] **Type Safety**: TypeScript interfaces for all API responses
- [✅] **Prettier Formatting**: All code formatted with Prettier (frontend standard)
- [✅] **ESLint**: ESLint will enforce code quality (React hooks rules, no custom CSS imports)
- [✅] **No Dead Code**: Implementation removes unused imports and components
- [✅] **Readable Code**: Pages remain <300 LOC, complex logic extracted to hooks
- [✅] **Curated Dependencies**: Chart.js justified for data visualization, pinned to 4.x

### IV. Testing Strategy (Frontend Adaptation)
- [✅] **Playwright E2E**: E2E testing framework used (tests/e2e/)
- [✅] **Test Coverage**: One E2E test file per page (24 tests total, 100% page coverage)
- [✅] **Regression Tests**: Future bug fixes will include E2E tests preventing recurrence
- [✅] **Deterministic**: Playwright auto-waiting, retry logic (max 3), seed data validation
- [✅] **Coverage Thresholds**: 100% page coverage (all 24 pages have E2E tests)
- [✅] **Integration Tests**: E2E tests verify full stack (frontend → backend → database)

### V. Security and Privacy (Frontend Adaptation)
- [✅] **Secure Defaults**: F09 API client auto-injects CSRF tokens for POST/PUT/DELETE
- [✅] **No Secrets**: No API keys or secrets in frontend code
- [✅] **Dependency Scanning**: pnpm audit in CI, Chart.js from trusted CDN
- [✅] **Centralized Auth**: Uses F02 auth package, session cookies from B05
- [✅] **No Sensitive Logging**: User IDs only (no emails/passwords in console logs)
- [✅] **XSS Protection**: React auto-escapes, no dangerouslySetInnerHTML

### VI. Performance and Reliability (Frontend Adaptation)
- [✅] **API Optimization**: Backend APIs already optimized (B01-B21), frontend uses pagination for large lists
- [✅] **Pagination**: Project list (80 items) uses 25/page, audit log (200+ items) uses 25/page
- [✅] **Explicit Caching**: HTTP cache headers respected, 60s cache for seed data (static)
- [✅] **Structured Logging**: Console errors include error IDs from F09 error boundaries
- [✅] **Health Checks**: /health page displays backend health status
- [✅] **Metrics Hooks**: Observability page polls B18 metrics every 30 seconds
- [✅] **Graceful Degradation**: F09 error boundaries catch API failures, show fallback UI with retry

### VII. UX and API Design (Frontend Adaptation)
- [✅] **API Consumption**: Consumes existing DRF APIs (B13 OpenAPI specs)
- [✅] **Consistent UI**: F06 templates ensure consistent layout across all 24 pages
- [✅] **URL State**: Query params preserve filters/sort (shareable links, browser back/forward works)
- [✅] **Clear Errors**: F09 error boundaries show user-friendly messages (no stack traces)
- [✅] **Input Validation**: TypeScript interfaces catch type mismatches, invalid query params use defaults

### VIII. Developer Experience and Tooling (Frontend Adaptation)
- [✅] **Easy Setup**: Quickstart.md documents setup (15 minutes), pnpm install + pnpm dev
- [✅] **Mandatory Tools**: Prettier, ESLint, TypeScript, Playwright configured
- [✅] **Pre-commit Hooks**: Husky runs Prettier + ESLint before commit
- [✅] **Type Checking**: TypeScript strict mode, tsc --noEmit in CI
- [✅] **Task Scripts**: pnpm dev, pnpm build, pnpm test:e2e, pnpm analyze
- [✅] **Developer Docs**: quickstart.md, data-model.md, research.md, contracts/README.md

### IX. Branching and Git Workflow
- [✅] **Feature Branch**: Work occurs on `033-demo-pages-for` branch (worktree)
- [✅] **Linked to Spec**: PR will reference spec.md and plan.md
- [✅] **Focused PRs**: Single feature (24 pages), monolithic delivery justified (modules stable)
- [✅] **main Stable**: No direct commits to main, merge via PR review

### X. CI/CD and Quality Gates
- [✅] **CI Checks**: TypeScript type-check, Prettier, ESLint, Playwright E2E in CI
- [✅] **Merge Gates**: All 24 E2E tests must pass, zero console errors, <2s page load
- [✅] **Scripted Deployment**: pnpm build for production, Vite outputs to dist/

### XI. Documentation and Knowledge Sharing
- [✅] **In-Repo Docs**: All docs in kitty-specs/033-demo-pages-for/
- [✅] **Module README**: examples/demo-shell/README.md will be updated with page inventory
- [✅] **Getting Started**: quickstart.md provides 15-minute setup guide
- [✅] **Extension Guide**: quickstart.md explains how to add new pages
- [✅] **Spec Sync**: Clarifications documented in spec.md (Session 2025-12-17)
- [✅] **ADR Required**: 4 ADRs in research.md (navigation, polling, state, file structure)

### XII. Constitution Evolution
- [✅] **No Constitution Changes**: This feature does not require constitution amendments
- [✅] **Template Updates**: No template changes required

### Violations Requiring Justification

None.

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/[###-feature]/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (/spec-kitty.plan command)
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
examples/demo-shell/              # Frontend demo application (module 031 baseline)
├── src/
│   ├── pages/                    # ⭐ NEW: 24 demo pages (this feature)
│   │   ├── identity/             # P1: 6 pages (orgs, projects, permissions, profile)
│   │   │   ├── OrganisationsPage.tsx
│   │   │   ├── OrganisationDetailPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   ├── PermissionsPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── index.ts          # Barrel export
│   │   ├── config/               # P1: 4 pages (audit, flags, credits, prefs)
│   │   │   ├── AuditLogPage.tsx
│   │   │   ├── FeatureFlagsPage.tsx
│   │   │   ├── CreditsPage.tsx
│   │   │   ├── PreferencesPage.tsx
│   │   │   └── index.ts
│   │   ├── platform/             # P2: 6 pages (health, constitution, security, observability, api, dashboard)
│   │   │   ├── HealthCheckPage.tsx
│   │   │   ├── ConstitutionPage.tsx
│   │   │   ├── SecurityPage.tsx
│   │   │   ├── ObservabilityPage.tsx
│   │   │   ├── ApiDocsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── index.ts
│   │   ├── frontend/             # P2: 7 pages (design, auth, context, resources, templates, theme, integration)
│   │   │   ├── DesignSystemPage.tsx
│   │   │   ├── AuthFlowsPage.tsx
│   │   │   ├── ContextSwitcherPage.tsx
│   │   │   ├── ResourceDisplayPage.tsx
│   │   │   ├── TemplatesPage.tsx
│   │   │   ├── ThemePage.tsx
│   │   │   ├── IntegrationPatternsPage.tsx
│   │   │   └── index.ts
│   │   └── docs/                 # P3: 3 pages (deployment, docs, i18n)
│   │       ├── DeploymentPage.tsx
│   │       ├── DocumentationPage.tsx
│   │       ├── I18nDemoPage.tsx
│   │       └── index.ts
│   ├── components/               # Shared components (minimal, e.g., CreditsChart wrapper)
│   ├── hooks/                    # Custom hooks (e.g., useQueryParams, usePolling)
│   ├── routes/                   # React Router v6 route definitions
│   ├── types/                    # TypeScript interfaces (API responses)
│   └── App.tsx                   # Main app with F06 AppShell + sidebar config
├── tests/
│   └── e2e/                      # ⭐ NEW: Playwright E2E tests (one per page)
│       ├── identity/             # 6 test files
│       │   ├── organisations.spec.ts
│       │   ├── organisation-detail.spec.ts
│       │   ├── projects.spec.ts
│       │   ├── project-detail.spec.ts
│       │   ├── permissions.spec.ts
│       │   └── profile.spec.ts
│       ├── config/               # 4 test files
│       │   ├── audit-log.spec.ts
│       │   ├── feature-flags.spec.ts
│       │   ├── credits.spec.ts
│       │   └── preferences.spec.ts
│       ├── platform/             # 6 test files
│       │   ├── health-check.spec.ts
│       │   ├── constitution.spec.ts
│       │   ├── security.spec.ts
│       │   ├── observability.spec.ts
│       │   ├── api-docs.spec.ts
│       │   └── dashboard.spec.ts
│       ├── frontend/             # 7 test files
│       │   ├── design-system.spec.ts
│       │   ├── auth-flows.spec.ts
│       │   ├── context-switcher.spec.ts
│       │   ├── resource-display.spec.ts
│       │   ├── templates.spec.ts
│       │   ├── theme.spec.ts
│       │   └── integration-patterns.spec.ts
│       ├── docs/                 # 3 test files
│       │   ├── deployment.spec.ts
│       │   ├── documentation.spec.ts
│       │   └── i18n-demo.spec.ts
│       └── fixtures/             # Test fixtures (login helpers, etc.)
├── package.json                  # ⭐ UPDATED: Add chart.js + react-chartjs-2
├── vite.config.ts                # Build config (already exists)
└── playwright.config.ts          # E2E test config (already exists)

packages/                         # Frontend packages (F01-F09, already exist, consumed by demo pages)
├── design-system/                # F01: UI primitives
├── auth/                         # F02: Auth flows
├── context-switcher/             # F03: Multi-tenancy context
├── notifications-hub/            # F04: Notifications
├── resource-display/             # F05: List/detail views
├── page-templates/               # F06: AppShell, PageHeader, etc.
├── theme-system/                 # F07: Light/dark mode
└── integration-patterns/         # F09: Error boundaries, API client

src/                              # Backend (B01-B21, already exist, consumed by demo pages)
└── [Django apps: health, constitution, security, i18n, auth, organisations, projects, audit, etc.]
```

**Structure Decision**: Web application (frontend + backend). This feature adds 24 React pages to the existing `examples/demo-shell/` frontend application (module 031 baseline). Pages are organized by category (identity/, config/, platform/, frontend/, docs/) matching the sidebar navigation structure. Each page has a corresponding Playwright E2E test file in `tests/e2e/`. Backend modules (B01-B21) and frontend packages (F01-F09) are unchanged - demo pages only consume existing APIs and components.

## Implementation Notes

### Phase 0 Outputs ✅

- **research.md**: 4 architecture decisions documented (sidebar navigation, polling interval, state management, file organization)
- **data-model.md**: Entity mapping for 15 backend entities (Organisation, Project, User, AuditEvent, etc.), query param schemas, state management patterns
- **contracts/README.md**: API contracts reference (all APIs exist in B01-B21, OpenAPI specs in B13)
- **quickstart.md**: 15-minute developer setup guide with code examples

### Phase 1 Outputs ✅

- **Planning Questions Answered**:
  1. Sidebar navigation: Collapsible accordion groups (active category expanded, others collapsed)
  2. Observability polling: 30-second interval (balanced for demo)
  3. Page state management: URL query params (useSearchParams for shareable links)
  4. File organization: Grouped by category (identity/, config/, platform/, frontend/, docs/)

- **Architecture Decisions**:
  - **AD-001**: Collapsible accordion navigation (scalable, modern UX, keyboard accessible)
  - **AD-002**: URL query params for page state (shareable, browser-friendly, zero dependencies)
  - **AD-003**: Category-based file organization (mirrors navigation, scalable to 50+ pages)
  - **AD-004**: 30-second polling for observability (demo-appropriate, industry standard)

### Implementation Order

**Phase 1: P1 Pages (Critical, Week 1)**
- Identity pages: organisations, projects, permissions, profile (6 pages)
- Config pages: audit, flags, credits (no chart), preferences (4 pages)
- E2E tests for all 10 pages
- Validate: 3 user roles (viewer, member, admin), seed data displays correctly

**Phase 2: P2 Pages (Important, Week 2)**
- Platform pages: health, constitution, security, observability (no charts), api-docs, dashboard (6 pages)
- Frontend pages: design-system, auth-flows, context, resources, templates, theme, integration (7 pages)
- E2E tests for all 13 pages
- Validate: F01-F09 showcase works correctly

**Phase 3: P3 Pages (Nice-to-have, Week 3)**
- Docs pages: tasks, notifications, deployment, documentation, i18n (5 pages)
- E2E tests for all 5 pages
- Validate: Background tasks, notifications, i18n work correctly

**Phase 4: Chart.js Integration (Week 3)**
- Add Chart.js to /credits page (usage line chart, 30-day data)
- Add Chart.js to /observability page (response times, error rates, connections)
- Verify lazy loading (Chart.js not in initial bundle)
- Validate: <500ms Chart.js load, <100KB bundle increase

### Key Dependencies

**Internal** (All ✅ COMPLETE):
- Module 031 (F10 Demo Shell): Base app with routing, auth, layout
- Module 032 (F10b-Database): Seed data (5 orgs, 20 users, 80 projects, 200+ events)
- B01-B21: All backend APIs functional
- F01-F09: All frontend packages published

**External** (New):
- chart.js@^4.4.0 (~60KB gzipped)
- react-chartjs-2@^5.2.0 (~5KB gzipped)

### Performance Validation

Before PR merge:
- ✅ Run `pnpm build` and verify bundle size increase <100KB gzipped
- ✅ Run `pnpm analyze` and verify Chart.js is code-split (separate chunk)
- ✅ Measure page load times (Chrome DevTools Performance tab): 95% <2s
- ✅ Run all 24 E2E tests in CI: <5 minutes total runtime
- ✅ Zero console errors during normal operation

### Next Phase

✅ **Phase 0-1 Complete**: Research, data model, contracts, quickstart generated

⏭️ **Phase 2**: Run `/spec-kitty.tasks` to create implementation task breakdown
