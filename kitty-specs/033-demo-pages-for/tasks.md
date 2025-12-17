---
description: "Work packages for 033-demo-pages-for"
---
*Path: [templates/tasks-template.md](templates/tasks-template.md)*

# Work Packages: Demo Pages for Modules 001-030

**Inputs**: [plan.md](kitty-specs/033-demo-pages-for/plan.md), [spec.md](kitty-specs/033-demo-pages-for/spec.md), [research.md](kitty-specs/033-demo-pages-for/research/research.md), [data-model.md](kitty-specs/033-demo-pages-for/research/data-model.md), [contracts/](kitty-specs/033-demo-pages-for/contracts/README.md), [quickstart.md](kitty-specs/033-demo-pages-for/quickstart.md)
**Prerequisites**: Module 031 demo shell + Module 032 seed data running, B01-B21 APIs reachable
**Tests**: E2E required per spec (Playwright, one file per page)

## Subtask Format: `[Txxx] [P?] Description`
- **[P]** indicates the subtask can proceed in parallel (different files/components).
- Paths target `examples/demo-shell/` unless noted.

## Subtasks
- T001 Validate baseline: pnpm install, Module 031/032 running, seed data present (5 orgs, 20 users, 80 projects, 200+ audits)
- T002 Build sidebar/navigation shell with accordion groups (identity, config, platform, frontend, docs), expansion persistence, context switcher + user menu wired to F03/F02
- T003 Scaffold page folders and barrel exports for identity/, config/, platform/, frontend/, docs/ with F06 page template placeholders
- T004 Define React Router v6 routes for all 24 pages with protected/permission wrappers, breadcrumbs, and query-param defaults
- T005 [P] Create shared utilities: `useQueryParams`, `usePolling(30s)`, and types for common API responses (aligned to contracts)
- T006 [P] Implement `OrganisationsPage` (list, sorting/filtering via query params, context-aware data)
- T007 [P] Implement `OrganisationDetailPage` (org summary, projects list, credits snippet)
- T008 [P] Implement `ProjectsPage` (org-scoped list, pagination, filters)
- T009 [P] Implement `ProjectDetailPage` (members, activity feed snapshot)
- T010 [P] Implement `PermissionsPage` (role matrix, viewer/member/admin visibility)
- T011 [P] Implement `ProfilePage` (current user details, last login, roles)
- T012 [P] Implement `AuditLogPage` (filters: type, user, date; table with seed data)
- T013 [P] Implement `FeatureFlagsPage` (toggles, rollout %, org overrides)
- T014 [P] Implement `CreditsPage` base (balances, alerts, transactions table; no charts yet)
- T015 [P] Implement `PreferencesPage` (theme/language/timezone save via B12, immediate UI update)
- T016 [P] Implement `HealthCheckPage` (service status cards, versions)
- T017 [P] Implement `ConstitutionPage` (rules list, violations, categories)
- T018 [P] Implement `SecurityPage` (ASVS scorecard, security events filtered)
- T019 [P] Implement `ObservabilityPage` base (metrics table, 30s polling, no charts yet)
- T020 [P] Implement `ApiDocsPage` (embedded Swagger UI)
- T021 [P] Implement `DashboardPage` (summary cards linking to categories)
- T022 [P] Implement `DesignSystemPage` (F01 components gallery, interactive demos)
- T023 [P] Implement `AuthFlowsPage` (login/signup/reset flows using F02)
- T024 [P] Implement `ContextSwitcherPage` (F03 demo with header propagation)
- T025 [P] Implement `ResourceDisplayPage` (F05 resource meters/examples)
- T026 [P] Implement `TemplatesPage` (F06 layouts: list, detail, dashboard, settings)
- T027 [P] Implement `ThemePage` (F07 toggles, side-by-side light/dark)
- T028 [P] Implement `IntegrationPatternsPage` (F09 error boundaries, API client demo)
- T029 [P] Implement `TasksPage` (B15 tasks list, retry button)
- T030 [P] Implement `NotificationsPage` (B16/B17 list, mark-read, filters)
- T031 [P] Implement `DeploymentPage` (B19 status, containers, health)
- T032 [P] Implement `DocumentationPage` (B21 metadata, module status matrix)
- T033 [P] Implement `I18nDemoPage` (language switch, persistence via B12)
- T034 Add Chart.js + react-chartjs-2 dependencies and lazy-load infrastructure (code-split chunks)
- T035 Integrate Chart.js into `CreditsPage` (30-day usage line chart, theme-aware, lazy loaded)
- T036 Integrate Chart.js into `ObservabilityPage` (response time line, error rate bar, connections gauge, 30s polling)
- T037 [P] Add Playwright shared fixtures for admin/member/viewer auth and context headers
- T038 [P] Write Playwright tests for P1 identity/config pages (organisations/projects/permissions/profile/audit/flags/credits/preferences)
- T039 [P] Write Playwright tests for platform pages (health/constitution/security/observability/api-docs/dashboard)
- T040 [P] Write Playwright tests for frontend showcase pages (design-system/auth/context/resources/templates/theme/integration)
- T041 [P] Write Playwright tests for ops/docs/i18n pages (tasks/notifications/deployment/docs/i18n)
- T042 [P] Write Playwright tests for Chart.js experiences (credits/observability lazy-load assertions)
- T043 Performance + bundle verification (pnpm build/analyze, Chart.js chunk <100KB gzipped, load <2s, chart load <500ms)
- T044 Update documentation: page inventory table in examples/demo-shell README, align quickstart with routes/tests

---

## Work Package WP01: Navigation & Skeleton (Priority: P0)

**Goal**: Establish navigation shell, routing, and shared utilities so pages have consistent scaffolding.
**Independent Test**: Sidebar accordion works with persistence; routes for all slugs resolve with F06 templates; context switcher and breadcrumbs render without data errors.
**Prompt**: /tasks/done/WP01-navigation-and-skeleton.md

### Included Subtasks
- [x] T001
- [x] T002
- [x] T003
- [x] T004
- [x] T005

### Implementation Sketch
- Validate baseline setup, ensure pnpm deps installed and dev server runs.
- Implement accordion sidebar + top nav wiring (F03 context switcher, F02 user menu), store expansion in localStorage.
- Scaffold page folders and placeholders using F06 templates; add barrel exports per category.
- Define React Router routes with protected/permission wrappers, breadcrumbs, and default query params.
- Add shared utilities (query params helper, polling hook, shared types) consumed by downstream pages.

### Parallel Opportunities
- T002-T005 can proceed in parallel after baseline check; routing (T004) depends on folder scaffold (T003).

### Dependencies
- None; foundation for all other work.

### Risks
- Navigation state drift; mitigate by single source of nav config.
- Breadcrumb mismatches; verify against spec routes.

---

## Work Package WP02: Identity & Config Pages (Priority: P1) MVP

**Goal**: Deliver P1 demo pages showing identity, permissions, audit, flags, credits (no charts yet), and preferences with real data and permissions.
**Independent Test**: Admin can view all identity/config pages with seed data; viewer sees scoped data and hidden admin actions; preferences persist theme/language.
**Prompt**: /tasks/done/WP02-identity-and-config-pages.md

### Included Subtasks
- [x] T006
- [x] T007
- [x] T008
- [x] T009
- [x] T010
- [x] T011
- [x] T012
- [x] T013
- [x] T014
- [x] T015

### Implementation Sketch
- Build list/detail pages for organisations/projects with context headers and query-driven filters.
- Add permissions dashboard and profile view respecting B08 roles.
- Implement audit log and feature flags pages with filters/toggles and org scoping.
- Deliver credits dashboard (alerts, balances, transactions) without charts and preferences form persisting via B12.

### Parallel Opportunities
- Page implementations can proceed in parallel by file/category once routing exists; ensure shared types are used.

### Dependencies
- Requires WP01 scaffolding.

### Risks
- Permission mismatches; validate with viewer/member/admin accounts.
- Seed data assumptions; align with data-model.md counts.

---

## Work Package WP03: Platform Status Pages (Priority: P2)

**Goal**: Build platform status dashboards (health, constitution, security, observability base, api-docs, dashboard) consuming B01-B13/B18 data.
**Independent Test**: Each page loads live backend data without console errors; observability polls every 30s with updated metrics; Swagger UI embeds correctly.
**Prompt**: /tasks/planned/WP03-platform-status-pages.md

### Included Subtasks
- [ ] T016
- [ ] T017
- [ ] T018
- [ ] T019
- [ ] T020
- [ ] T021

### Implementation Sketch
- Implement cards/tables for health, constitution, security events using F01/F06.
- Build observability base page with polling stub and metrics tables (charts added later).
- Embed Swagger UI for API docs and create dashboard summary landing.

### Parallel Opportunities
- T016-T018 parallel; T019 can proceed after polling hook exists; T020 independent once routing exists.

### Dependencies
- Depends on WP01 (routing/utilities). Observability charts depend later on WP06.

### Risks
- Swagger embed CORS issues; verify dev server settings.
- Polling leaks; ensure cleanup in useEffect.

---

## Work Package WP04: Frontend Showcase (Priority: P2)

**Goal**: Demonstrate F01-F09 packages with interactive examples and consistent templates.
**Independent Test**: Each showcase page renders components/examples without custom CSS; theme toggles and integration patterns display expected behaviors.
**Prompt**: /tasks/planned/WP04-frontend-showcase.md

### Included Subtasks
- [ ] T022
- [ ] T023
- [ ] T024
- [ ] T025
- [ ] T026
- [ ] T027
- [ ] T028

### Implementation Sketch
- Build gallery pages for design system, auth flows, context switcher demo, resource meters, templates, theme previews, and integration patterns.
- Use existing package exports only; avoid bespoke styling.

### Parallel Opportunities
- All subtasks parallel once routing and shared utilities are available.

### Dependencies
- Depends on WP01 scaffolding; can start in parallel with WP03 after WP02 is underway.

### Risks
- Demo drift from package APIs; cross-check against package READMEs.

---

## Work Package WP05: Ops, Notifications, Docs, i18n (Priority: P3)

**Goal**: Deliver remaining pages covering background tasks, notifications, deployment status, documentation browser, and i18n demo.
**Independent Test**: Tasks/notifications render live data and actions; deployment/docs pages load metadata; language switch persists across navigation.
**Prompt**: /tasks/planned/WP05-ops-notifications-docs-i18n.md

### Included Subtasks
- [ ] T029
- [ ] T030
- [ ] T031
- [ ] T032
- [ ] T033

### Implementation Sketch
- Build tasks monitor with retry action; notifications list with mark-read and filtering.
- Deployment status page surfaces B19 health; docs page links MkDocs/API status matrix; i18n page drives language switch via B12 and F07.

### Parallel Opportunities
- T029-T033 parallel after routing; align i18n with preferences from WP02.

### Dependencies
- Depends on WP01; leverages data/entities from WP02.

### Risks
- Action endpoints (retry/mark-read) may need CSRF handling; reuse F09 client.

---

## Work Package WP06: Charting Integration (Priority: P3)

**Goal**: Add Chart.js visualizations to credits and observability pages with lazy loading and theme awareness.
**Independent Test**: Chart.js chunk loads on-demand (<500ms), credits and observability charts render correct data, bundle increase <100KB.
**Prompt**: /tasks/planned/WP06-charting-integration.md

### Included Subtasks
- [ ] T034
- [ ] T035
- [ ] T036

### Implementation Sketch
- Add chart dependencies, configure Vite code-splitting, lazy load chart components.
- Integrate charts into credits and observability pages with 30s polling + theme-aware styling.

### Parallel Opportunities
- T034 precedes chart integrations; T035 and T036 can proceed after deps land.

### Dependencies
- Depends on WP02 (credits base) and WP03 (observability base).

### Risks
- Bundle bloat; verify analyzer output and tree-shaking.
- Theme contrast; validate light/dark palettes.

---

## Work Package WP07: E2E, Performance, Docs (Priority: P1)

**Goal**: Provide complete Playwright coverage, performance checks, and documentation updates.
**Independent Test**: All Playwright suites pass for admin/member/viewer; build/analyze meets performance targets; README inventory updated.
**Prompt**: /tasks/planned/WP07-e2e-and-performance.md

### Included Subtasks
- [ ] T037
- [ ] T038
- [ ] T039
- [ ] T040
- [ ] T041
- [ ] T042
- [ ] T043
- [ ] T044

### Implementation Sketch
- Add shared fixtures for auth/context; write grouped test suites per page category plus chart-specific checks.
- Run build/analyze for bundle/perf gates; update README/quickstart with route inventory and test commands.

### Parallel Opportunities
- Test writing can run in parallel across categories after pages exist; performance checks follow code completion.

### Dependencies
- Depends on page implementations (WP02-WP06); fixtures can start after routing/auth ready.

### Risks
- Flaky tests; use auto-wait and fixed seed data.
- Perf measurements sensitive to local env; document methodology.

---

## Dependency & Execution Summary
- Sequence: WP01 foundation -> WP02 (MVP) -> WP03/04 in parallel -> WP05 -> WP06 -> WP07.
- Parallelization: After WP01, WP02 starts; WP03 and WP04 can run in parallel; WP05 after WP02; WP06 after WP02/WP03; WP07 tests in parallel with WP04/05 once pages stable.
- MVP Scope: WP01 + WP02 deliver MVP stakeholder demo (identity/config flows with live data).

## Subtask Index (Reference)

| Subtask ID | Summary | Work Package | Priority | Parallel? |
|------------|---------|--------------|----------|-----------|
| T001 | Validate baseline env and deps | WP01 | P0 | No |
| T002 | Navigation shell with accordion + context/user menus | WP01 | P0 | No |
| T003 | Scaffold page folders and barrels | WP01 | P0 | No |
| T004 | Define routes with protections and breadcrumbs | WP01 | P0 | No |
| T005 | Shared hooks (query params, polling) and types | WP01 | P0 | Yes |
| T006 | Organisations list page | WP02 | P1 | Yes |
| T007 | Organisation detail page | WP02 | P1 | Yes |
| T008 | Projects list page | WP02 | P1 | Yes |
| T009 | Project detail page | WP02 | P1 | Yes |
| T010 | Permissions dashboard | WP02 | P1 | Yes |
| T011 | Profile page | WP02 | P1 | Yes |
| T012 | Audit log page | WP02 | P1 | Yes |
| T013 | Feature flags page | WP02 | P1 | Yes |
| T014 | Credits page (base) | WP02 | P1 | Yes |
| T015 | Preferences page | WP02 | P1 | Yes |
| T016 | Health check page | WP03 | P2 | Yes |
| T017 | Constitution page | WP03 | P2 | Yes |
| T018 | Security page | WP03 | P2 | Yes |
| T019 | Observability page (base, polling) | WP03 | P2 | Yes |
| T020 | API docs page | WP03 | P2 | Yes |
| T021 | Dashboard landing | WP03 | P2 | Yes |
| T022 | Design system showcase | WP04 | P2 | Yes |
| T023 | Auth flows showcase | WP04 | P2 | Yes |
| T024 | Context switcher demo | WP04 | P2 | Yes |
| T025 | Resource display demo | WP04 | P2 | Yes |
| T026 | Templates showcase | WP04 | P2 | Yes |
| T027 | Theme showcase | WP04 | P2 | Yes |
| T028 | Integration patterns demo | WP04 | P2 | Yes |
| T029 | Tasks monitor page | WP05 | P3 | Yes |
| T030 | Notifications page | WP05 | P3 | Yes |
| T031 | Deployment status page | WP05 | P3 | Yes |
| T032 | Documentation browser | WP05 | P3 | Yes |
| T033 | I18n demo page | WP05 | P3 | Yes |
| T034 | Add Chart.js deps + lazy-load infra | WP06 | P3 | No |
| T035 | Credits chart integration | WP06 | P3 | No |
| T036 | Observability charts integration | WP06 | P3 | No |
| T037 | Playwright fixtures (roles/context) | WP07 | P1 | Yes |
| T038 | E2E tests for P1 pages | WP07 | P1 | Yes |
| T039 | E2E tests for platform pages | WP07 | P1 | Yes |
| T040 | E2E tests for frontend showcase | WP07 | P1 | Yes |
| T041 | E2E tests for ops/docs/i18n | WP07 | P1 | Yes |
| T042 | E2E tests for charts | WP07 | P1 | Yes |
| T043 | Performance + bundle verification | WP07 | P1 | No |
| T044 | README/quickstart doc updates | WP07 | P1 | Yes |
