# F10b: Demo Pages for Modules 001-030

**Phase:** 8
**Status:** ✅ Done
**Module ID:** 033
**Category:** Frontend

## Links
*

## Description
Demo Pages for Modules 001-030 (Phase 8)


## Detailed Specification (from Kitty)

# Feature Specification: Demo Pages for Modules 001-030
*Path: kitty-specs/033-demo-pages-for/spec.md*

**Feature Branch**: `033-demo-pages-for`
**Created**: 2025-12-17
**Status**: Draft
**Input**: User description: "30+ fully functional demo pages demonstrating all implemented modules (B01-B21, F01-F09) with real backend integration"

## Clarifications

### Session 2025-12-17

- Q: How should the sidebar navigation be structured for 24 pages? → A: Collapsible accordion groups (active category expanded, others collapsed)
- Q: What polling interval should the observability dashboard use for metric updates? → A: 30 seconds (balanced)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identity Pages (Organisations & Projects) (Priority: P1)

As a Strategic Product Owner, I can navigate through organisations and projects to see how multi-tenancy works end-to-end with real data from the seed database.

**Why this priority**: Core business objects (organisations, projects) are the foundation of the platform. Stakeholders need to see these working first to build confidence in the multi-tenant architecture.

**Independent Test**: Can be fully tested by navigating to `/organisations` and `/projects` pages after seed data is loaded, verifying that 5 organisations and 80 projects appear with correct filtering and permissions.

**Acceptance Scenarios**:

1. **Given** I am logged in as admin@demo.djangocore.app, **When** I navigate to `/organisations`, **Then** I see a grid of 5 organisations (TechCorp, DataLab, MarketingHub, OpenSource, AI Research) with member counts and credit balances
2. **Given** I am on the organisations list, **When** I click on "DataLab Enterprise", **Then** I see organisation details showing 8 members, 30 projects, and 5000 credits
3. **Given** I am viewing an organisation detail page, **When** I click on a project in the projects list, **Then** I navigate to the project detail page showing team members and activity feed
4. **Given** I am logged in as viewer@demo.djangocore.app, **When** I navigate to `/organisations`, **Then** I see only MarketingHub (my organisation), not all 5 organisations
5. **Given** I am viewing a project detail page as a viewer, **When** the page loads, **Then** edit/delete buttons are hidden or disabled

---

### User Story 2 - Configuration Pages (Audit, Flags, Credits, Preferences) (Priority: P1)

As a developer, I can view audit logs, feature flags, credit dashboards, and user preferences to verify that configuration modules work correctly.

**Why this priority**: Configuration and observability are critical for production systems. These pages demonstrate core platform capabilities (B09-B12) that every product needs.

**Independent Test**: Can be tested independently by navigating to `/audit`, `/features`, `/credits`, `/preferences` and verifying data from seed database appears correctly with appropriate permissions.

**Acceptance Scenarios**:

1. **Given** I navigate to `/audit`, **When** the page loads, **Then** I see a table of 200+ audit events from the last 30 days with filters for event type, user, and date range
2. **Given** I am viewing the audit log, **When** I filter by event type "authentication", **Then** I see only login, logout, and password_reset events
3. **Given** I navigate to `/features` as an admin, **When** the page loads, **Then** I see feature flags with toggle switches and rollout percentages for my organisation
4. **Given** I am viewing the credits dashboard for MarketingHub, **When** the page loads, **Then** I see a low-balance alert (balance = 200 credits) and a usage chart for the last 30 days
5. **Given** I navigate to `/preferences`, **When** I change the theme from light to dark, **Then** the UI immediately updates to dark mode and the preference is persisted

---

### User Story 3 - Platform Status Pages (Health, Constitution, Security, Observability) (Priority: P2)

As a maintainer, I can view platform health, constitution compliance, security scorecard, and observability metrics to monitor system status.

**Why this priority**: Status pages provide operational insights. While important, they're secondary to core business flows (organisations/projects).

**Independent Test**: Can be tested by navigating to `/health`, `/constitution`, `/security`, `/observability` and verifying that system metrics display correctly.

**Acceptance Scenarios**:

1. **Given** I navigate to `/health`, **When** the page loads, **Then** I see green status indicators for PostgreSQL, Redis, Django, and Python with version numbers
2. **Given** I navigate to `/constitution`, **When** the page loads, **Then** I see a dashboard showing active rules count, recent violations (if any), and rule categories
3. **Given** I navigate to `/security`, **When** the page loads, **Then** I see ASVS compliance status and recent security events from the audit log
4. **Given** I navigate to `/observability`, **When** the page loads, **Then** I see Chart.js charts showing response times (P99, P95, median), error rates (4xx, 5xx), and active connections
5. **Given** I am viewing the observability dashboard, **When** metrics data updates (30-second polling interval), **Then** charts update without full page reload (data fetched via API)

---

### User Story 4 - Frontend Showcase Pages (Design System, Themes, Templates, Resources) (Priority: P2)

As a frontend developer, I can view showcase pages for F01-F09 modules to understand component usage, theming, templates, and integration patterns.

**Why this priority**: These pages document frontend packages and provide reference implementations. Important for onboarding but not critical for business stakeholder validation.

**Independent Test**: Can be tested by navigating to `/design-system`, `/themes`, `/templates`, `/resources`, `/context`, `/integration` and verifying components render correctly.

**Acceptance Scenarios**:

1. **Given** I navigate to `/design-system`, **When** the page loads, **Then** I see all F01 primitive components (Button, Input, Card, Alert, etc.) with interactive demos
2. **Given** I navigate to `/themes`, **When** I click the theme toggle, **Then** I see side-by-side previews of light and dark modes with all components
3. **Given** I navigate to `/templates`, **When** the page loads, **Then** I see examples of F06 page templates (list, detail, dashboard, form, settings) with responsive layouts
4. **Given** I navigate to `/resources`, **When** the page loads, **Then** I see F05 resource meters for credits (B11 integration), storage (placeholder), and bandwidth (placeholder)
5. **Given** I navigate to `/context`, **When** I switch organisations using the context switcher, **Then** I see API headers update (X-Organisation-ID) and project list reflects new context

---

### User Story 5 - Background Tasks & Notifications Pages (Priority: P3)

As a developer, I can monitor background tasks and view notifications to verify B15 (tasks) and B16/B17 (notifications) integration.

**Why this priority**: Nice-to-have for demonstration purposes. Less critical than core business flows and configuration pages.

**Independent Test**: Can be tested by navigating to `/tasks` and `/notifications`, verifying data displays correctly.

**Acceptance Scenarios**:

1. **Given** I navigate to `/tasks`, **When** the page loads, **Then** I see active tasks count, completed tasks (last 24h), and failed tasks with error messages
2. **Given** I am viewing the tasks page as an admin, **When** I see a failed task, **Then** I can click a "Retry" button to re-queue the task
3. **Given** I navigate to `/notifications`, **When** the page loads, **Then** I see unread notification count badge and a list of in-app notifications with read/unread status
4. **Given** I am viewing notifications, **When** I click "Mark as read", **Then** the notification's read status updates and the unread count decreases
5. **Given** I filter notifications by type, **When** I select "Organisation", **Then** I see only organisation-related notifications (credit alerts, new members)

---

### User Story 6 - Documentation & Deployment Pages (Priority: P3)

As a user, I can access API documentation, technical docs, and deployment status to understand the platform and its operational state.

**Why this priority**: Helpful reference pages but not essential for core demo validation. Can be added last.

**Independent Test**: Can be tested by navigating to `/api-docs`, `/docs`, `/deployment` and verifying links/content display correctly.

**Acceptance Scenarios**:

1. **Given** I navigate to `/api-docs`, **When** the page loads, **Then** I see an embedded Swagger UI showing all B13 API endpoints with authentication examples
2. **Given** I am viewing API docs, **When** I click "Try it out" on the `/api/organisations/` endpoint, **Then** I can execute the request and see a response with 5 organisations
3. **Given** I navigate to `/docs`, **When** the page loads, **Then** I see quick links to MkDocs site, API docs, architecture docs, and a module status matrix (B01-B21 ✅, B22+ 🚧)
4. **Given** I navigate to `/deployment`, **When** the page loads, **Then** I see current environment (dev), Docker container status, and health check results
5. **Given** I am viewing deployment status, **When** all containers are running, **Then** I see green status indicators for backend, frontend, PostgreSQL, and Redis

---

### User Story 7 - Internationalization Demo (Priority: P3)

As a user, I can test language switching to verify B04 internationalization works correctly.

**Why this priority**: Demonstrates i18n capability but not critical for MVP. Can be added last.

**Independent Test**: Can be tested by navigating to `/i18n`, changing language, and verifying UI updates.

**Acceptance Scenarios**:

1. **Given** I navigate to `/i18n`, **When** the page loads, **Then** I see current language indicator and a dropdown with EN, NL, FR, DE options
2. **Given** I am on the i18n demo page, **When** I select "Nederlands" from the dropdown, **Then** all UI labels, page titles, and button text update to Dutch
3. **Given** I have switched to Dutch, **When** I navigate to other demo pages, **Then** the language persists across pages
4. **Given** I switch back to English, **When** I refresh the page, **Then** the language preference is loaded from B12 user preferences

---

### Edge Cases

- **What happens when seed data is not loaded?** Demo pages show empty states with clear messages ("No organisations found. Run `python manage.py seed_demo_data` to generate demo data")
- **How do pages handle missing/incomplete data?** Use F06 empty state templates with appropriate messaging and call-to-action buttons
- **What happens when backend API is unavailable?** Pages show error boundaries with fallback UI and error ID for support (via F09 error handling patterns)
- **How do charts handle large datasets?** Chart.js components lazy load and render max 50 data points with pagination/filtering available
- **What happens when a user has no permissions?** Pages respect B08 ACL and show 403 error page with clear messaging when access is denied
- **How do pages perform with slow network?** Show skeleton loaders (F01 design system) while API calls are in progress, timeout after 10 seconds with error message
- **What happens when switching context mid-page?** Current page re-fetches data with new context (org/project ID) via React state updates triggered by F03 context switcher
- **How do E2E tests handle flaky data?** Tests use fixed seed data from module 032, verify counts/names match expectations, retry failed assertions once before failing

## Requirements *(mandatory)*

### Functional Requirements

**Page Coverage (24 pages total)**

- **FR-001**: System MUST provide demo pages for all Core Foundation modules (B01-B04): health check, constitution dashboard, security scorecard, i18n demo
- **FR-002**: System MUST provide demo pages for Identity & Multi-tenancy modules (B05-B08): login, profile, organisations (list + detail), projects (list + detail), permissions dashboard
- **FR-003**: System MUST provide demo pages for Configuration & Audit modules (B09-B12): audit log viewer, feature flags dashboard, credits dashboard, user preferences
- **FR-004**: System MUST provide demo pages for Platform modules (B13-B18): API docs (Swagger UI), main dashboard, background tasks monitor, notifications hub, observability dashboard
- **FR-005**: System MUST provide demo pages for Frontend modules (F01-F07, F09): design system showcase, auth flows, context switcher demo, resource display, page templates showcase, theme demo, integration patterns showcase
- **FR-006**: System MUST provide demo pages for Documentation modules (B19, B21): deployment status, technical documentation browser

**Backend Integration**

- **FR-007**: All demo pages MUST integrate with real backend APIs (B05-B21), NOT use mocked data
- **FR-008**: Demo pages MUST fetch data from seed database (module 032) showing 5 organisations, 20 users, 80 projects, 200+ audit events
- **FR-009**: Demo pages MUST respect B08 permissions (viewer cannot edit, admin sees all actions, member sees org-scoped data)
- **FR-010**: API calls MUST include authentication headers (session cookies via B05) and context headers (X-Organisation-ID, X-Project-ID via F03)
- **FR-011**: Demo pages MUST handle API errors gracefully via F09 error boundaries (show error message, offer retry, log error ID)

**Layout & Design**

- **FR-012**: All demo pages MUST use F06 page templates (AppShell, PageHeader, PageContent, Sidebar, Breadcrumbs)
- **FR-013**: Demo pages MUST use ONLY F01 design system components (NO custom CSS beyond theme variables)
- **FR-014**: Navigation MUST provide sidebar with collapsible accordion groups (Identity, Configuration, Platform, Frontend, Docs), where active category is expanded and others are collapsed by default, with manual toggle capability
- **FR-015**: Navigation MUST show breadcrumbs auto-generated from React Router v6 routes
- **FR-016**: Navigation MUST include F03 context switcher in top nav (organisation/project selector)
- **FR-017**: Navigation MUST include user menu in top right (profile, settings, logout)
- **FR-018**: Demo pages MUST support F07 theme system (light/dark mode toggle, theme persists via B12 preferences)

**Data Visualization**

- **FR-019**: Credits dashboard (B11) MUST display Chart.js line chart showing usage over last 30 days
- **FR-020**: Observability dashboard (B18) MUST display Chart.js charts for response times (line chart), error rates (bar chart), active connections (gauge), with automatic 30-second polling for metric updates
- **FR-021**: Chart components MUST lazy load (only load Chart.js when chart page is visited)
- **FR-022**: Charts MUST be responsive and support light/dark theme variants

**Routing & Navigation**

- **FR-023**: Demo pages MUST use React Router v6 for client-side routing
- **FR-024**: Routes MUST support nested paths (e.g., `/organisations/:id`, `/organisations/:id/projects/:projectId`)
- **FR-025**: Routes MUST implement protected route wrapper (redirect to login if not authenticated via B05)
- **FR-026**: Routes MUST implement permission-based rendering (admin-only pages check B08 permissions before render)
- **FR-027**: Route navigation MUST preserve F03 context (org/project ID persists across pages)

**Testing**

- **FR-028**: Each demo page MUST have a Playwright E2E test file in `examples/demo-shell/tests/e2e/`
- **FR-029**: E2E tests MUST verify page loads without errors (no console errors, status code 200)
- **FR-030**: E2E tests MUST verify seed data appears correctly (verify counts, names, values from seed database)
- **FR-031**: E2E tests MUST verify permissions work correctly (viewer cannot see edit buttons, admin sees all actions)
- **FR-032**: E2E tests MUST run in CI on pull requests (blocking CI gate)

**Performance**

- **FR-033**: Demo pages MUST achieve <2 second initial page load (including API calls)
- **FR-034**: Chart components MUST lazy load (not included in initial bundle, loaded on-demand)
- **FR-035**: F06 templates MUST prevent duplicate renders (React.memo, useMemo for expensive computations)
- **FR-036**: Demo pages SHOULD use F09 API client caching (respects HTTP Cache-Control headers for GET requests)

**Data Requirements**

- **FR-037**: Demo pages MUST show realistic seed data from module 032 (no Lorem Ipsum, no placeholder text)
- **FR-038**: Organisation pages MUST display all 5 seed organisations (TechCorp, DataLab, MarketingHub, OpenSource, AI Research) with correct counts
- **FR-039**: Project pages MUST display projects filtered by selected organisation context (TechCorp shows 15 projects, DataLab shows 30)
- **FR-040**: Audit log MUST display 200+ audit events with realistic event types (login, logout, project_created, credits_purchased, etc.)
- **FR-041**: Notifications MUST display 5-10 unread notifications per demo account with various types (system, org, project)
- **FR-042**: Credits dashboard MUST show low-balance alert for MarketingHub (200 credits < 500 threshold)

### Success Criteria *(mandatory)*

**User Experience & Usability**

- **SC-001**: Strategic Product Owner can navigate to any of 24 demo pages within 3 clicks from main dashboard
- **SC-002**: 100% of demo pages load successfully with realistic seed data (no Lorem Ipsum placeholders)
- **SC-003**: All demo pages respect user permissions (viewer cannot edit, admin sees full feature set)
- **SC-004**: Page layouts are consistent across all 24 pages (same header, sidebar, breadcrumbs via F06 templates)

**Integration & Functionality**

- **SC-005**: All 24 demo pages integrate with real backend APIs (0 mocked responses)
- **SC-006**: Context switching updates data correctly (switching from TechCorp to DataLab shows different projects)
- **SC-007**: Theme switching works across all pages (toggle dark mode updates all components immediately)
- **SC-008**: Authentication flow prevents unauthorized access (unauthenticated users redirect to login)

**Performance**

- **SC-009**: 95% of demo pages load in under 2 seconds (measured from navigation to interactive)
- **SC-010**: Chart-heavy pages (credits, observability) load Chart.js library in under 500ms
- **SC-011**: Total bundle size increase is under 100KB gzipped (65KB Chart.js + 35KB demo page code)

**Testing & Quality**

- **SC-012**: All 24 demo pages have passing Playwright E2E tests (100% test coverage)
- **SC-013**: E2E test suite runs in under 5 minutes in CI pipeline
- **SC-014**: Zero console errors or warnings on any demo page during normal operation

**Documentation & Onboarding**

- **SC-015**: Developer can find example implementation for any F01-F09 module within 2 clicks (via design system showcase, theme demo, etc.)
- **SC-016**: API documentation page (Swagger UI) allows interactive testing of all B13 endpoints
- **SC-017**: Module status matrix (in /docs page) accurately shows B01-B21 as complete, B22+ as planned

## Constitution Alignment *(mandatory)*

**Principle P02 (Simplicity First)**: Demo pages use ONLY F01 components and F06 templates (zero custom CSS). No premature abstractions - each page is a straightforward composition of existing primitives.

**Principle P05 (No Premature Scale)**: Monolithic delivery (all 24 pages in one feature) is appropriate because modules 001-030 are complete and stable. No phasing, no micro-optimization, no custom build pipeline beyond Vite defaults.

**Principle P07 (Self-Healing Infrastructure)**: Demo pages expose health check (B01), observability dashboard (B18), and audit log viewer (B09), demonstrating how Strategic Product Owner can monitor production system health.

**Principle P09 (Code is Narrative)**: Each demo page is named after its module (e.g., `OrganisationsPage`, `CreditsPage`), imports are explicit, no magic routing strings. File structure mirrors navigation structure.

**Principle P10 (Feature Teams Own)**: Demo pages live in `examples/demo-shell/src/pages/` (not core src/), clearly marked as examples, owned by F10 Demo Foundation feature team
- [ ] Authentication/authorization handled through centralized mechanisms
- [ ] No sensitive data will be logged

### Performance & Reliability (Principle VI)
- [ ] No N+1 queries (query optimization plan documented if applicable)
- [ ] Pagination implemented for unbounded responses
- [ ] Structured logging and metrics hooks included
- [ ] Graceful degradation strategy defined for failure scenarios

## Assumptions *(mandatory)*

**Infrastructure Assumptions**:
- Seed database (module 032) is populated with 5 organisations, 20 users, 80 projects, 200+ audit events
- Backend APIs (B01-B21) are functional and return expected data structures
- PostgreSQL and Redis are running locally for development
- Development environment has Node.js 18+ and pnpm 8+

**Module Assumptions**:
- Frontend packages (F01-F09) are published to pnpm workspace and available for import
- Backend modules (B01-B21) provide REST APIs matching OpenAPI specs in B13
- B08 authorization middleware correctly enforces permissions (viewer/member/admin roles)
- F03 context switcher correctly propagates X-Organisation-ID and X-Project-ID headers
- F07 theme system correctly injects data-theme attribute on <html> element

**Integration Assumptions**:
- Chart.js 4.x is compatible with React 18.2 (no known compatibility issues)
- react-chartjs-2 wrapper correctly passes TypeScript types
- Playwright can authenticate via session cookies (no CSRF issues in test environment)
- Vite code-splitting correctly lazy-loads Chart.js on-demand

**Performance Assumptions**:
- Module 031 (Demo Shell) has <1 second initial load (baseline before adding pages)
- Backend APIs respond in <200ms for typical queries (list 50 orgs, fetch single project)
- Chart.js rendering takes <100ms for typical data sets (30-day credits chart = 30 data points)

**Routing Assumptions**:
- React Router v6 is configured in module 031 with authentication wrapper
- Protected routes redirect to `/login` if session is invalid
- Navigation history works correctly (back button returns to previous page)

**Development Environment Assumptions**:
- Developers have access to Swagger UI for API exploration
- CI pipeline has capacity to run 24 E2E tests (5 minutes budget)
- No breaking changes to F01-F09 or B01-B21 during feature development

## Out of Scope *(mandatory)*

**Future Modules**:
- Modules B22-B28 (Fase 9-11) are NOT implemented yet, so no demo pages for webhooks, API keys, rate limiting, billing, multi-language content, public API, SSO
- Module F08 (placeholder) is not a real feature, so no demo page

**CRUD Operations**:
- Demo pages are primarily READ-ONLY (display data from seed database)
- No create/update/delete operations (e.g., cannot create new organisation from UI)
- Exception: User preferences (B12) allows theme toggle, but this is configuration not CRUD

**Advanced Features**:
- No real-time WebSocket updates (background tasks monitor uses polling, not WebSockets)
- No advanced search/filtering beyond basic list filtering
- No bulk operations (export CSV, batch delete)
- No inline editing (all data is read-only display)

**Hosted Demo**:
- Publicly accessible demo (demo.djangocore.app) is future enhancement (not in scope for feature 033)
- Demo pages run locally via `pnpm dev` only

**Additional Testing**:
- No visual regression testing (Chromatic is not configured for demo-shell)
- No load testing (performance validation is manual)
- No accessibility testing beyond basic keyboard navigation
- No cross-browser compatibility testing beyond Chrome (Playwright default)

**Advanced Visualizations**:
- No D3.js custom visualizations (Chart.js only)
- No animated charts or transitions
- No drill-down interactions (charts are display-only)

## Dependencies *(mandatory)*

### Internal (Other Modules)

- **Module 031 (F10 Demo Shell)**: Base application with routing, authentication, layout infrastructure [✅ COMPLETE]
- **Module 032 (F10b-Database)**: Seed data with 5 orgs, 20 users, 80 projects, 200+ audit events [✅ COMPLETE]
- **B01-B04 (Core Foundation)**: Health, constitution, security, i18n APIs [✅ COMPLETE]
- **B05 (Authentication)**: Session-based auth, login/logout endpoints [✅ COMPLETE]
- **B06 (Organisations)**: Org list/detail, membership APIs [✅ COMPLETE]
- **B07 (Projects)**: Project list/detail, org-scoped queries [✅ COMPLETE]
- **B08 (Authorization)**: Permission checks, role-based access [✅ COMPLETE]
- **B09-B12 (Configuration & Audit)**: Audit log, feature flags, credits, preferences APIs [✅ COMPLETE]
- **B13-B18 (Platform)**: API docs, dashboard data, background tasks, notifications, observability metrics [✅ COMPLETE]
- **B19, B21 (Documentation)**: Deployment status, docs metadata [✅ COMPLETE]
- **F01 (Design System)**: UI components (Button, Table, Card, Badge, Input, etc.) [✅ COMPLETE]
- **F02 (Auth UI)**: Login/signup forms, auth flows [✅ COMPLETE]
- **F03 (Context Switcher)**: Org/project selector, context propagation [✅ COMPLETE]
- **F04 (Notifications Hub)**: Notification display components [✅ COMPLETE]
- **F05 (Resource Display)**: List views, detail views, empty states [✅ COMPLETE]
- **F06 (Page Templates)**: AppShell, PageHeader, PageContent, Sidebar, Breadcrumbs [✅ COMPLETE]
- **F07 (Theme System)**: Light/dark mode, theme toggle [✅ COMPLETE]
- **F09 (Integration Patterns)**: Error boundaries, API client utilities [✅ COMPLETE]

### External (Third-party)

- **React 18.2.0**: UI framework (already in module 031)
- **TypeScript 5.6.2**: Type system (already in module 031)
- **React Router v6**: Client-side routing (already in module 031)
- **Chart.js 4.x**: Canvas-based charting library (~60KB gzipped) [NEW DEPENDENCY]
- **react-chartjs-2 5.x**: React wrapper for Chart.js (~5KB gzipped) [NEW DEPENDENCY]
- **Vite 5.4.8**: Build tool with code-splitting support (already in module 031)
- **Playwright**: E2E testing framework (already in module 031)

### Optional Dependencies

- **date-fns** (or similar): Date formatting for audit log timestamps (if not already in F05)
- **react-window** (or @tanstack/react-virtual): List virtualization if org/project lists exceed 100 items

## Risks & Mitigations *(mandatory)*

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **RISK-001**: Performance degrades with 24 pages loaded | Medium | Medium | Use Vite code-splitting (lazy load pages with React.lazy), ensure Chart.js lazy loads only when needed |
| **RISK-002**: Chart.js bundle size exceeds 100KB | Low | Low | Chart.js is ~60KB + react-chartjs-2 is ~5KB = 65KB total (acceptable); tree-shake unused Chart.js components |
| **RISK-003**: E2E tests flaky in CI | High | Medium | Use Playwright auto-waiting, isolate test data per test, add retry logic (max 3 retries), run tests serially not parallel |
| **RISK-004**: Backend API data format changes | Medium | Low | Use TypeScript interfaces to catch type mismatches, add runtime validation with Zod or similar, fail fast with clear errors |
| **RISK-005**: Permission checks incorrect (viewer sees admin actions) | High | Low | Add E2E tests for all 3 roles (viewer, member, admin), verify button visibility and API rejection, ensure B08 enforces at backend |
| **RISK-006**: Seed data generation fails | Medium | Low | Validate seed command in CI (ensure 032 migration runs successfully), provide fallback fixture data if seed command errors |

## Technical Notes *(optional)*

**Architecture Decisions**:
- Chart.js chosen over D3.js for simplicity (declarative API, no manual DOM manipulation)
- Chart.js chosen over Recharts for bundle size (~65KB vs ~90KB) and Canvas performance (better for large datasets)
- Lazy loading strategy: `React.lazy(() => import('./pages/CreditsPage'))` for all pages with charts
- No custom CSS beyond F01 theme variables (enforced by ESLint rule: no `.css` imports in demo pages)
- Monolithic delivery (all 24 pages in one PR) acceptable because foundation (031, 032) is complete
- No API mocking - all demo pages integrate with real backend (ensures accurate demonstration)

**Implementation Order**:
1. **Phase 1 (P1 pages)**: Identity + Configuration pages first (organisations, projects, permissions, audit, flags, credits, preferences) - critical for understanding multi-tenancy
2. **Phase 2 (P2 pages)**: Platform + Frontend showcase pages (health, constitution, security, observability, design system, themes, templates) - demonstrates platform capabilities
3. **Phase 3 (P3 pages)**: Background tasks, notifications, docs (demonstrates asynchronous operations, i18n)
4. **Phase 4 (Charts)**: Add Chart.js integration to credits + observability pages after base pages work

**Testing Strategy**:
- E2E tests ONLY (no unit tests for demo pages - they are simple component composition)
- Per-page test file: `tests/e2e/pages/organisations.spec.ts` tests `/organisations` route
- Test 3 user roles: viewer (limited), member (org-scoped), admin (full access)
- Test data from seed database: verify counts match expected (5 orgs, 20 users, etc.)
- Test permissions: verify viewer cannot see "Delete" button, admin can

**Performance Monitoring**:
- Use Vite bundle analyzer to track bundle size per page
- Measure Time to Interactive (TTI) with Chrome DevTools Performance tab
- Target: 95th percentile page load <2 seconds (from navigation to interactive)
- Monitor Chart.js loading time separately (should be <500ms after code-split chunk loads)

**Accessibility**:
- Basic keyboard navigation (Tab, Enter, Escape) for all interactive elements
- Focus management when navigating between pages
- ARIA labels on navigation links
- No WCAG compliance required (demo pages are internal, not production-facing)

**Browser Support**:
- Primary: Chrome latest (Playwright default)
- Secondary: Firefox, Safari (manual testing only, no CI coverage)
- No IE11 support (React 18 requires modern browsers)

## Acceptance Criteria *(mandatory)*

For this feature to be considered complete:

- [ ] All 24 demo pages implemented with routes defined in React Router v6
- [ ] All demo pages use F06 templates (AppShell, PageHeader) and F01 components (zero custom CSS)
- [ ] All demo pages integrate with real backend APIs (B01-B21), no mocked responses
- [ ] All demo pages display seed data correctly (5 orgs, 20 users, 80 projects visible where appropriate)
- [ ] Navigation sidebar groups pages by category (Identity, Configuration, Platform, Frontend, Docs)
- [ ] F03 context switcher works on all pages (switching org updates data, context persists across navigation)
- [ ] F07 theme toggle works on all pages (toggle dark mode updates all components immediately)
- [ ] B08 permission checks enforced (viewer cannot see edit/delete buttons, admin sees all actions)
- [ ] Chart.js lazy loads on credits + observability pages (Chart.js not in initial bundle)
- [ ] All 24 demo pages have E2E tests in `tests/e2e/pages/` (100% coverage)
- [ ] E2E tests pass in CI (no flaky tests, max 3 retries, <5 minute run time)
- [ ] Performance targets met (95% of pages load <2 seconds, Chart.js loads <500ms)
- [x] Zero console errors or warnings during normal operation (no React key warnings, no API 404s)
- [x] README updated with page inventory (table showing page name, route, module, description)
- [x] No clarification markers remain in spec (all decisions made)
- [ ] Code review approved by F10 Demo Foundation team
- [ ] PR merged to main branch
