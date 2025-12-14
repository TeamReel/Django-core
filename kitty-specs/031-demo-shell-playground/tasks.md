# Implementation Tasks: Demo Shell & Playground Site (F10)
*Path: kitty-specs/031-demo-shell-playground/tasks.md*

**Feature Branch**: `031-demo-shell-playground`
**Created**: 2025-12-14
**Status**: Planning Complete

## Overview

This document breaks down the Demo Shell implementation into **8 work packages** covering setup, P1 user stories (auth, context, permissions), P2 stories (templates, errors), P3 stories (notifications, status), and deployment. Each work package is independently implementable with clear subtasks, dependencies, and success criteria.

**Total Subtasks**: 47
**Estimated Effort**: 3-5 days (solo developer), 2-3 days (pair)
**MVP Scope**: WP01 + WP02 + WP03 (setup + auth + context = core smoke test)

---

## Subtask Registry

**Legend**:
- `Txxx` = Subtask ID (sequential execution order)
- `[P]` = Parallel-safe (can be done simultaneously with other [P] tasks if different files/concerns)
- `→ Txxx` = Depends on subtask Txxx completing first

### T001–T010: Setup & Infrastructure
- [ ] **T001** [P] Create `examples/demo-shell/` directory structure (src/, tests/, public/)
- [ ] **T002** [P] Initialize `package.json` with pnpm workspace member, scripts (dev, build, test:unit, test:e2e)
- [ ] **T003** [P] Install frontend dependencies: vite, react, react-dom, react-router-dom, @playwright/test, vitest
- [ ] **T004** [P] Install F01-F09 packages: @django-core/{design-system, auth, context-switcher, notifications-hub, resource-display-alerts, page-templates, theme-system}
- [ ] **T005** Create `vite.config.ts` (React plugin, proxy /api → localhost:8000, alias @/ → src/)
- [ ] **T006** Create `tsconfig.json` (strict mode, paths for @/ alias)
- [ ] **T007** Create `index.html` (Vite entry point, root div)
- [ ] **T008** [P] Create seed data script `src/core/management/commands/seed_demo_data.py` (5 users, 2 orgs, 6 projects total = 3 per org [TechCorp: Web Platform/Mobile App/Legacy API; DataLab: ML Pipeline/Data Warehouse/Analytics Dashboard], credits per data-model.md [TechCorp: 1000/5000, DataLab: 250/1000 = low-credit warning], notifications per AS-6.3 [alice: "Welcome", carol: "Low credits"])
- [ ] **T009** [P] Create `.env.example` with API_BASE_URL, VITE_API_URL variables
- [ ] **T010** [P] Create `examples/demo-shell/README.md` (setup instructions, usage, architecture)

### T011–T018: Auth Flow (P1 Story 1)
- [ ] **T011** → T001-T007 | Create `src/main.tsx` (React root, providers setup)
- [ ] **T012** [P] Create `src/App.tsx` (React Router setup, route definitions)
- [ ] **T013** [P] Create `src/lib/api-client.ts` (fetch wrapper with CSRF token handling)
- [ ] **T014** [P] Create `src/hooks/useAuth.ts` (thin wrapper around F02 @django-core/auth)
- [ ] **T015** Create `src/pages/auth/LoginPage.tsx` (login form, F02 AuthProvider integration)
- [ ] **T016** Create `src/pages/DashboardPage.tsx` (authenticated landing, shows username)
- [ ] **T017** [P] Create `src/components/ProtectedRoute.tsx` (route guard, redirects to /login if unauthenticated)
- [ ] **T018** Add routes: `/` → redirect to /dashboard, `/login` → LoginPage, `/dashboard` → DashboardPage (protected)

### T019–T026: Context Switching (P1 Story 2)
- [ ] **T019** → T011-T018 | Create `src/hooks/useContext.ts` (thin wrapper around F03 @django-core/context-switcher)
- [ ] **T020** [P] Create `src/components/layout/TopNavigation.tsx` (user menu, logout button, context switcher slot)
- [ ] **T021** [P] Create `src/components/layout/Sidebar.tsx` (nav links: Dashboard, Organisations, Projects, Settings)
- [ ] **T022** Create `src/components/layout/AppShell.tsx` (compose F06 AppShell with TopNavigation + Sidebar)
- [ ] **T023** Create `src/pages/organisations/OrganisationListPage.tsx` (list orgs user can access, F06 ListLayout)
- [ ] **T024** Create `src/pages/organisations/OrganisationDetailPage.tsx` (org details, members, projects, F06 DetailLayout)
- [ ] **T025** Create `src/pages/projects/ProjectListPage.tsx` (list projects in current org, filter by status)
- [ ] **T026** Create `src/pages/projects/ProjectDetailPage.tsx` (project details, breadcrumbs with org/project context)

### T027–T032: Permissions (P1 Story 3)
- [ ] **T027** → T019-T026 | Check if `@django-core/permissions` package exists; if not, create minimal shim in `src/lib/permissions.ts`
- [ ] **T028** [P] Create `src/hooks/usePermissions.ts` (wrapper around permissions package or shim)
- [ ] **T029** [P] Create `src/components/PermissionGate.tsx` (conditional render based on hasPermission check)
- [ ] **T030** Update `ProjectDetailPage.tsx`: Add Edit/Delete buttons wrapped in `<PermissionGate permission="projects.edit" />`
- [ ] **T031** Create `src/pages/errors/ForbiddenPage.tsx` (403 error page, F01 error state components)
- [ ] **T032** Add route: `/403` → ForbiddenPage, update API error handler to redirect on 403 responses

### T033–T037: Page Templates (P2 Story 4)
- [ ] **T033** → T019-T026 | Create `src/pages/resources/ResourceListPage.tsx` (demo list with filters, F06 ListLayout)
- [ ] **T034** [P] Create `src/pages/resources/ResourceDetailPage.tsx` (demo detail view, F06 DetailLayout)
- [ ] **T035** [P] Create `src/pages/SettingsPage.tsx` (demo settings form, F06 SettingsLayout)
- [ ] **T036** [P] Add routes: `/resources` → ResourceListPage, `/resources/:id` → ResourceDetailPage, `/settings` → SettingsPage
- [ ] **T037** Update `Sidebar.tsx`: Add nav links for Resources and Settings

### T038–T041: Error States (P2 Story 5)
- [ ] **T038** → T031 | Create `src/pages/errors/NotFoundPage.tsx` (404 error page, F01 components)
- [ ] **T039** [P] Create `src/components/ErrorBoundary.tsx` (React error boundary for 500 errors)
- [ ] **T040** [P] Create `src/components/LoadingState.tsx` (loading skeletons using F01 primitives)
- [ ] **T041** Add routes: `/404` → NotFoundPage, catch-all `*` → NotFoundPage; wrap App in ErrorBoundary

### T042–T045: Notifications & Alerts (P3 Story 6)
- [ ] **T042** → T020 | Integrate F04 NotificationInbox in `TopNavigation.tsx` (badge with unread count)
- [ ] **T043** [P] Create `src/hooks/useNotifications.ts` (wrapper around F04 @django-core/notifications-hub)
- [ ] **T044** Update `DashboardPage.tsx`: Show alert banner for low credits using F05 AlertBanner component
- [ ] **T045** Add toast notifications on form submissions (success/error) using `useNotifications().showToast()`

### T046–T049: Status Pages (P3 Story 7)
- [ ] **T046** → T041 | Create `src/pages/status/HealthStatusPage.tsx` (GET /health/, display JSON in readable format)
- [ ] **T047** [P] Create `src/pages/status/PermissionsStatusPage.tsx` (display current permissions matrix from /api/permissions/current/)
- [ ] **T048** [P] Add routes: `/status/health` → HealthStatusPage, `/status/permissions` → PermissionsStatusPage (both protected)
- [ ] **T049** Update `Sidebar.tsx`: Add "Status" submenu with Health and Permissions links (dev mode only)

### T050–T058: E2E Smoke Tests
- [ ] **T050** → T018 | Create `playwright.config.ts` (baseURL, retries=0, trace on failure, Chromium only, webServer config)
- [ ] **T051** [P] Create `tests/e2e/auth-flow.spec.ts` (P1 Story 1: redirect to login, valid login → dashboard, logout → login)
- [ ] **T052** [P] Create `tests/e2e/context-permissions.spec.ts` (P1 Story 2: switch org, select project, verify context in UI)
- [ ] **T053** → T051-T052 | Run `pnpm test:e2e` locally, verify both tests pass
- [ ] **T054** [P] Create `.github/workflows/ci-demo-smoke.yml` (install deps, start backend, start frontend via Playwright webServer, run tests)
- [ ] **T055** [P] Update CI workflow: Upload trace artifacts on failure for debugging
- [ ] **T056** [P] Update CI workflow: Fail build if smoke tests fail (FR-040)
- [ ] **T057** Test CI workflow: Push branch, verify CI runs smoke tests in <10 minutes
- [ ] **T057.5** [P] Add CI duration gate: Fail workflow if E2E tests exceed 10 minutes (S-002 enforcement)
- [ ] **T058** Document CI workflow in `examples/demo-shell/README.md` (how to interpret CI results)

### T059–T065: Deployment & Polish
- [ ] **T059** → T001-T010 | Create multi-stage `Dockerfile` (Stage 1: Vite build, Stage 2: nginx with build output)
- [ ] **T060** [P] Create `nginx.conf` (serve static files, proxy /api to backend, SPA fallback to index.html)
- [ ] **T061** [P] Create `docker-compose.demo.yml` (local orchestration: backend + demo-shell services)
- [ ] **T062** Update `docker-compose.staging.yml`: Add demo-shell service (build from Dockerfile, depends_on backend, env vars)
- [ ] **T063** Test local Docker deployment: `docker compose -f docker-compose.demo.yml up`, verify demo accessible at localhost:8080
- [ ] **T063.5** [P] Run `cloc examples/demo-shell/src` and verify total LOC <1500 (S-004 validation)
- [ ] **T063.6** [P] Measure local dev startup time: `Measure-Command { pnpm install; pnpm dev }`, verify <30 seconds (FR-041, S-001)
- [ ] **T064** Test staging deployment: Deploy to staging, verify accessible via URL (FR-043)
- [ ] **T065** Update quickstart.md: Add Docker deployment instructions, staging access details

---

## Work Packages

### Phase 1: Setup & Foundational

#### WP01: Project Scaffolding & Seed Data
**Priority**: P0 (Blocker for all other work)
**Goal**: Scaffold demo-shell directory structure, install dependencies, create seed data script
**Independent Test**: Run `python manage.py seed_demo_data`, verify 5 users/2 orgs/6 projects created in DB

**Subtasks**: T001–T010 (10 subtasks)
**Parallel Opportunities**: T001-T004 can run simultaneously (different concerns), T008-T010 independent
**Dependencies**: None (first work package)
**Risks**: Missing F01-F09 packages would block; mitigate by verifying package availability in pnpm workspace first

**Implementation Sketch**:
1. Create `examples/demo-shell/` with standard Vite project structure
2. Initialize `package.json` with workspace member config, add all scripts
3. Install Vite, React, Playwright, Vitest, F01-F09 packages via `pnpm install`
4. Configure Vite (proxy, alias), TypeScript (strict mode)
5. Create seed data script following data-model.md design (idempotent, minimal)
6. Document setup in README.md

**Definition of Done**:
- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` starts Vite dev server on localhost:3000
- [ ] `python manage.py seed_demo_data` populates database with exactly 5 users, 2 orgs, 6 projects
- [ ] README.md has clear setup instructions (<5 min local verification)

**Prompt**: `tasks/planned/WP01-project-scaffolding-seed-data.md`

---

#### WP02: Core Authentication Flow (P1 Story 1)
**Priority**: P1 (Critical path)
**Goal**: Implement login/logout flow using F02 @django-core/auth
**Independent Test**: `pnpm test:e2e -- auth-flow` passes (login → dashboard → logout journey)

**Subtasks**: T011–T018 (8 subtasks)
**Parallel Opportunities**: T013-T014 independent, T015-T017 can develop in parallel once T011-T012 done
**Dependencies**: WP01 (needs scaffolding complete)
**Risks**: F02 integration issues; mitigate by following F09 integration guide examples

**Implementation Sketch**:
1. Set up React root with AuthProvider from F02
2. Configure React Router with public/protected routes
3. Create API client with CSRF handling (follows B13 patterns)
4. Build LoginPage with form validation and error handling
5. Build DashboardPage (authenticated landing)
6. Implement ProtectedRoute guard (redirects to /login if unauthenticated)
7. Wire up routes: `/` redirects to /dashboard, `/login` public, `/dashboard` protected

**Definition of Done**:
- [ ] Valid login redirects to /dashboard showing user's first name
- [ ] Invalid login shows error message, stays on /login
- [ ] Logout clears session and redirects to /login
- [ ] Accessing /dashboard when unauthenticated redirects to /login
- [ ] E2E test `auth-flow.spec.ts` passes (covers all 5 acceptance scenarios from P1 Story 1)

**Prompt**: `tasks/planned/WP02-core-authentication-flow.md`

---

### Phase 2: Multi-Tenancy & Permissions (P1)

#### WP03: Context Switching UI (P1 Story 2)
**Priority**: P1 (Critical path)
**Goal**: Implement org/project context switcher using F03 @django-core/context-switcher
**Independent Test**: `pnpm test:e2e -- context-flow` passes (switch org → select project → verify UI updates)

**Subtasks**: T019–T026 (8 subtasks)
**Parallel Opportunities**: T020-T021 (navigation components), T023-T026 (page components) can develop in parallel
**Dependencies**: WP02 (needs auth working to access protected context-aware pages)
**Risks**: Context persistence across routes; mitigate by using React Router state management

**Implementation Sketch**:
1. Wrap App with ContextProvider from F03
2. Create layout components (TopNavigation, Sidebar, AppShell using F06)
3. Integrate ContextSwitcher component in TopNavigation
4. Build org list/detail pages consuming B06 APIs
5. Build project list/detail pages consuming B07 APIs
6. Wire up context-aware routes: `/orgs/:slug`, `/orgs/:slug/projects/:projectSlug`
7. Ensure context switcher updates URL and UI state correctly

**Definition of Done**:
- [ ] Context switcher dropdown shows all orgs user can access
- [ ] Selecting org updates top navigation header and reloads project list
- [ ] Selecting project updates breadcrumbs and persists across page navigation
- [ ] URL reflects current org/project: `/orgs/techcorp/projects/web-platform`
- [ ] E2E test `context-permissions.spec.ts` passes (covers all 5 acceptance scenarios from P1 Story 2)

**Prompt**: `tasks/planned/WP03-context-switching-ui.md`

---

#### WP04: Hierarchical Permissions Integration (P1 Story 3)
**Priority**: P1 (Security-critical)
**Goal**: Integrate B08 permissions checks and show/hide UI elements based on ACL
**Independent Test**: Seed users with different roles, verify admin sees Edit/Delete buttons, member does not

**Subtasks**: T027–T032 (6 subtasks)
**Parallel Opportunities**: T028-T029 (hooks/components) independent, T031 (error page) can develop in parallel with T030
**Dependencies**: WP03 (needs context switcher working to test permission checks in different contexts)
**Risks**: `@django-core/permissions` package may not exist; mitigate with shim (T027)

**Implementation Sketch**:
1. Check if `@django-core/permissions` exists; if not, create minimal shim using B08 `/api/permissions/current/`
2. Create `usePermissions()` hook wrapping permissions package
3. Create `PermissionGate` component for conditional rendering
4. Update ProjectDetailPage: Wrap Edit/Delete buttons in PermissionGate components
5. Build 403 ForbiddenPage using F01 error components
6. Update API error handler to redirect to /403 on 403 responses

**Definition of Done**:
- [ ] Alice (admin) sees Edit and Delete buttons on project detail page
- [ ] Bob (member) does not see Edit/Delete buttons (hidden via PermissionGate)
- [ ] Manually navigating to restricted project (Carol's project as Bob) shows 403 error page
- [ ] 403 page has clear message and link back to dashboard
- [ ] Permission checks respect hierarchical ACL (org-level admin can edit all org projects)

**Prompt**: `tasks/planned/WP04-hierarchical-permissions-integration.md`

---

### Phase 3: Page Templates & Error Handling (P2)

#### WP05: Reusable Page Template Examples (P2 Story 4)
**Priority**: P2 (Reference implementation)
**Goal**: Build example pages using F06 templates (list, detail, settings)
**Independent Test**: Navigate through demo pages, verify layouts match F06 specifications

**Subtasks**: T033–T037 (5 subtasks)
**Parallel Opportunities**: T033-T035 (all page components) can develop in parallel
**Dependencies**: WP03 (needs layout components from context switcher work)
**Risks**: F06 template API changes; mitigate by checking F06 package docs first

**Implementation Sketch**:
1. Create ResourceListPage using F06 ListLayout (filters, pagination placeholders)
2. Create ResourceDetailPage using F06 DetailLayout (mock resource data)
3. Create SettingsPage using F06 SettingsLayout (demo form fields)
4. Wire up routes for new pages
5. Add navigation links in Sidebar

**Definition of Done**:
- [ ] Resource list page shows consistent list layout with F06 components
- [ ] Resource detail page shows consistent detail layout
- [ ] Settings page shows form layout consistent with F06 patterns
- [ ] All pages responsive (mobile, tablet, desktop breakpoints work)
- [ ] Navigation between list ↔ detail works, "Back to list" preserves state

**Prompt**: `tasks/planned/WP05-reusable-page-template-examples.md`

---

#### WP06: Comprehensive Error States (P2 Story 5)
**Priority**: P2 (UX polish)
**Goal**: Implement all error states (loading, empty, 403, 404, 500)
**Independent Test**: Navigate to `/404`, `/403`, trigger loading/empty states, verify UI matches F01 components

**Subtasks**: T038–T041 (4 subtasks)
**Parallel Opportunities**: T038-T040 (all error components) can develop in parallel
**Dependencies**: WP04 (403 page created there, this extends with 404/500)
**Risks**: React error boundary edge cases; mitigate by testing with intentional throw errors

**Implementation Sketch**:
1. Create NotFoundPage using F01 empty state components
2. Create ErrorBoundary component (catches React errors, shows fallback UI)
3. Create LoadingState component (skeletons using F01 primitives)
4. Wire up 404 route (catch-all `*`)
5. Wrap App in ErrorBoundary at top level
6. Use LoadingState in pages during data fetching

**Definition of Done**:
- [ ] Navigating to unknown URL shows 404 page with helpful navigation
- [ ] Triggering React error (intentional throw) shows error boundary with error ID
- [ ] List pages with no data show empty state message
- [ ] Loading states show appropriate skeletons (not blank page)
- [ ] All error pages have link back to dashboard

**Prompt**: `tasks/planned/WP06-comprehensive-error-states.md`

---

### Phase 4: Notifications, Status & Testing (P3)

#### WP07: Notifications & Resource Alerts (P3 Story 6)
**Priority**: P3 (Nice-to-have integrations)
**Goal**: Integrate F04 notifications and F05 resource alerts
**Independent Test**: Trigger notifications via form actions, verify toast appears and inbox updates

**Subtasks**: T042–T045 (4 subtasks)
**Parallel Opportunities**: T042-T043 (notification integration) independent from T044 (alerts)
**Dependencies**: WP02 (needs TopNavigation from WP03), WP05 (needs DashboardPage from WP02)
**Risks**: Notification state synchronization; mitigate by using F04 provider correctly

**Implementation Sketch**:
1. Add NotificationInbox to TopNavigation (badge with unread count)
2. Create `useNotifications()` hook wrapper around F04
3. Update DashboardPage: Show low-credit alert for DataLab org using F05 AlertBanner
4. Add toast notifications on form submissions (success/error toasts)

**Definition of Done**:
- [ ] Notification inbox icon shows unread badge (seed data creates 2 unread)
- [ ] Clicking inbox opens dropdown with notification list
- [ ] Success toast appears after mock form submission (e.g., "Settings saved!")
- [ ] Low-credit alert banner appears on DataLab dashboard (balance < 30%)
- [ ] Alert banner uses F05 AlertBanner component with warning type

**Prompt**: `tasks/planned/WP07-notifications-resource-alerts.md`

---

#### WP08: Developer Status Pages & E2E Tests (P3 Story 7 + Smoke Tests)
**Priority**: P3 (Dev tools + validation)
**Goal**: Build status pages for debugging, create E2E smoke tests, set up CI
**Independent Test**: CI smoke tests pass in <10 minutes (S-002)

**Subtasks**: T046–T058 (13 subtasks)
**Parallel Opportunities**: T046-T049 (status pages) independent from T050-T058 (tests/CI)
**Dependencies**: WP02-WP04 (needs core flows working for E2E tests to validate)
**Risks**: CI time exceeds 10 minutes; mitigate with caching strategies from research.md

**Implementation Sketch**:
1. Create HealthStatusPage (GET /health/, display JSON)
2. Create PermissionsStatusPage (display permissions matrix from /api/permissions/current/)
3. Wire up status routes (protected, dev mode only)
4. Configure Playwright (deterministic settings: retries=0, trace on failure)
5. Write auth-flow E2E test (P1 Story 1 scenarios)
6. Write context-permissions E2E test (P1 Story 2 scenarios)
7. Create CI workflow (install, start services, run tests, upload traces)
8. Optimize CI time (pnpm cache, Docker BuildKit)

**Definition of Done**:
- [ ] `/status/health` shows health check data from B18
- [ ] `/status/permissions` shows current user's permissions matrix
- [ ] `pnpm test:e2e` runs locally and both tests pass
- [ ] CI workflow runs on PR, completes in <10 minutes
- [ ] CI uploads trace artifacts on test failure for debugging
- [ ] CI fails build if smoke tests fail (enforces FR-040)

**Prompt**: `tasks/planned/WP08-status-pages-e2e-tests.md`

---

### Phase 5: Deployment & Finalization

#### WP09: Docker Deployment & Documentation
**Priority**: P2 (Required for staging, S-003)
**Goal**: Create Docker images, docker-compose configs, deploy to staging
**Independent Test**: `docker compose up` locally, access demo at localhost:8080

**Subtasks**: T059–T065 (7 subtasks)
**Parallel Opportunities**: T059-T061 (Docker files) can develop together, T063-T064 (testing) sequential
**Dependencies**: WP02-WP08 (all features implemented before deployment)
**Risks**: Staging URL/SSL unknown (research.md Unknown 2); resolve in T064 by checking existing staging setup

**Implementation Sketch**:
1. Create multi-stage Dockerfile (Vite build → nginx)
2. Create nginx.conf (serve static, proxy /api, SPA fallback)
3. Create docker-compose.demo.yml (local full-stack orchestration)
4. Update docker-compose.staging.yml (add demo-shell service)
5. Test local Docker deployment
6. Deploy to staging, verify reviewer access without local setup
7. Update quickstart.md and README.md with deployment instructions

**Definition of Done**:
- [ ] `docker compose -f docker-compose.demo.yml up` starts full stack locally
- [ ] Demo accessible at `http://localhost:8080`, all features work
- [ ] Staging deployment accessible via stable URL (e.g., `https://demo-staging.example.com`)
- [ ] Reviewers can access staging without local setup (FR-043)
- [ ] quickstart.md documents both local and Docker deployment paths

**Prompt**: `tasks/planned/WP09-docker-deployment-documentation.md`

---

## Parallelization Strategy

**High-Level Parallel Tracks** (after WP01 complete):
- **Track A**: WP02 (Auth) → WP03 (Context) → WP04 (Permissions) [Critical path, sequential]
- **Track B**: WP05 (Templates) can start after WP03 (needs layout components)
- **Track C**: WP06 (Error states) can start after WP04 (extends 403 page)
- **Track D**: WP07 (Notifications) can start after WP03 (needs TopNavigation)
- **Track E**: WP08 (Status + Tests) can start after WP04 (needs core flows for E2E validation)
- **Track F**: WP09 (Deployment) waits for all features (WP02-WP08)

**Within Work Packages**:
- WP01: T001-T004 (structure, deps) || T008-T010 (seed script, docs)
- WP02: T013-T014 (API, hooks) || T015-T017 (page components)
- WP03: T020-T021 (navigation) || T023-T026 (pages)
- WP04: T028-T029 (permissions primitives) || T031 (403 page)
- WP05: T033-T035 (all page examples)
- WP06: T038-T040 (all error components)
- WP07: T042-T043 (notifications) || T044 (alerts)
- WP08: T046-T049 (status pages) || T050-T058 (tests/CI setup)

**Pair Programming Opportunities**:
- WP02 + WP03: Auth + Context (2 engineers, 1 day each = 2 days parallel vs 4 days sequential)
- WP05 + WP06 + WP07: Templates + Errors + Notifications (can all develop in parallel after WP03)

---

## Dependencies Graph

```
WP01 (Setup) ────┬─→ WP02 (Auth) ──→ WP03 (Context) ──→ WP04 (Permissions) ──→ WP08 (Tests) ──┐
                 │                         ├─→ WP05 (Templates) ────────────────────────────→ │
                 │                         └─→ WP07 (Notifications) ──────────────────────────→ │
                 │                                                                              │
                 └───────────────────────────────→ WP06 (Error States) ──────────────────────→ │
                                                                                                 │
                                                                                                 └─→ WP09 (Deployment)
```

**Critical Path**: WP01 → WP02 → WP03 → WP04 → WP08 → WP09 (6 work packages, ~3-4 days)

**Optional Extensions** (P3 stories, can defer post-MVP):
- WP07 (Notifications & Alerts) - nice-to-have UI polish
- WP08 status pages (health, permissions) - dev tools, not end-user facing

---

## MVP Definition

**Minimum Viable Product** = WP01 + WP02 + WP03 + E2E test from WP08
- ✅ Setup complete (can run demo locally)
- ✅ Auth flow works (login, logout, protected routes)
- ✅ Context switching works (org/project selector, UI updates)
- ✅ 1 E2E smoke test passes (validates core contracts)

**Delivers**: Proof that F02 (auth) + F03 (context) + B05/B06/B07 APIs integrate correctly. Reviewers can log in, switch contexts, see data scoped to org/project.

**Excludes from MVP**:
- Permissions (WP04) - defer if B08 `/api/permissions/current/` not ready
- Page templates (WP05) - nice-to-have reference examples
- Error states (WP06) - UX polish
- Notifications (WP07) - P3 priority
- Status pages (WP08 partial) - dev tools

**MVP Timeline**: 2 days (solo), 1.5 days (pair) for WP01-WP03 + basic E2E test

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `@django-core/permissions` not available | Medium | High (blocks WP04) | T027: Check package exists, create shim if missing (research.md Unknown 1) |
| F01-F09 package API changes | Low | Medium | Review F09 integration guide first, follow documented patterns |
| CI time exceeds 10 minutes | Medium | Medium (fails S-002) | Apply caching (pnpm, Docker), single browser, measure early (T057) |
| Staging URL/SSL unknown | High | Low (docs only) | Check existing `docker-compose.staging.yml` in T064 |
| Seed data script conflicts | Low | Low | Use `get_or_create()` for idempotency (T008) |
| Context state persistence issues | Medium | Medium | Use React Router state management, test thoroughly in E2E |

---

## Success Criteria Validation

| Criteria | Work Package | Validation Method |
|----------|--------------|-------------------|
| **S-001**: <5 min local verification | WP01 | Timed quickstart.md walkthrough (seed → login → context) |
| **S-002**: <10 min CI feedback | WP08 | Measure CI workflow duration, optimize if needed |
| **S-003**: Staging accessible | WP09 | Reviewers verify URL access without local setup |
| **S-004**: <1500 LOC | WP09 | Run `cloc examples/demo-shell/src`, verify count |
| **S-005**: Minimal seed data | WP01 | DB query: `SELECT COUNT(*) FROM users/orgs/projects` |
| **S-006**: Zero core modifications | WP09 | `git diff main..031 -- src/` (should be empty) |
| **S-007**: All P1 stories pass | WP08 | E2E tests green: auth-flow, context-permissions |
| **S-008**: Staging 2-day uptime | WP09 | Staging health check after 48h deployment |

---

## Implementation Order Recommendation

**Solo Developer** (3-5 days):
1. Day 1 Morning: WP01 (Setup)
2. Day 1 Afternoon: WP02 (Auth)
3. Day 2 Morning: WP03 (Context)
4. Day 2 Afternoon: WP04 (Permissions)
5. Day 3 Morning: WP05 (Templates) + WP06 (Errors)
6. Day 3 Afternoon: WP07 (Notifications) + WP08 (Tests)
7. Day 4: WP09 (Deployment), polish, documentation

**Pair Programming** (2-3 days):
1. Day 1 Morning: WP01 (Setup, together)
2. Day 1 Afternoon: Engineer A → WP02 (Auth), Engineer B → WP06 (Error states skeleton)
3. Day 2 Morning: Engineer A → WP03 (Context), Engineer B → WP05 (Templates)
4. Day 2 Afternoon: Both → WP04 (Permissions, complex)
5. Day 3 Morning: Engineer A → WP07 (Notifications), Engineer B → WP08 (Tests)
6. Day 3 Afternoon: Both → WP09 (Deployment), polish

---

## Next Steps

1. **Start with WP01**: Scaffold structure, install deps, create seed script
2. **Validate MVP**: After WP01-WP03, run E2E test (auth + context flows)
3. **Iterate on P1**: Complete WP04 (permissions) for full P1 story coverage
4. **Add P2/P3**: Implement WP05-WP08 for complete feature set
5. **Deploy**: WP09 for staging access and reviewer validation

**Command to start implementation**:
```
/spec-kitty.implement WP01
```

This will load the prompt for Work Package 1 (Project Scaffolding & Seed Data) and guide you through the first work package implementation.
