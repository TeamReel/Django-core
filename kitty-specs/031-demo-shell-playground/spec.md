# Feature Specification: Demo Shell & Playground Site
*Path: kitty-specs/031-demo-shell-playground/spec.md*

**Feature Branch**: `031-demo-shell-playground`
**Created**: 2025-12-14
**Status**: Draft
**Input**: User description: "Create a minimal demo shell application to exercise core flows end-to-end and act as a living integration smoke test."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Authentication Flow (Priority: P1)

As a maintainer, I can verify that the complete authentication flow works correctly after making changes to auth-related modules (B05, F02).

**Why this priority**: Authentication is the entry point for all other flows and the most critical contract to validate. Without working auth, no other demo functionality is testable.

**Independent Test**: Can be fully tested by running `pnpm test:smoke -- auth-flow` locally or in CI, delivering confidence that login, logout, and session management work end-to-end.

**Acceptance Scenarios**:

1. **Given** the demo app is running with seed data, **When** I navigate to `/demo/`, **Then** I am redirected to the login page
2. **Given** I am on the login page with valid credentials, **When** I submit the login form, **Then** I am authenticated and redirected to the demo dashboard showing my username
3. **Given** I am authenticated, **When** I click the logout button, **Then** my session is terminated and I am redirected to the login page
4. **Given** I am on the login page with invalid credentials, **When** I submit the login form, **Then** I see a clear error message and remain on the login page
5. **Given** I am authenticated, **When** I attempt to access a protected demo page, **Then** I can view the page without re-authenticating

---

### User Story 2 - Multi-Tenancy Context Switching (Priority: P1)

As a reviewer, I can validate that organisation and project context switching behaves correctly and that UI reflects the current context accurately.

**Why this priority**: Multi-tenancy is core platform behavior (B06, B07, F03) and must work reliably across all flows. Context switching bugs can leak data across tenants.

**Independent Test**: Can be fully tested by running `pnpm test:smoke -- context-flow` which exercises context switching and verifies UI state updates correctly.

**Acceptance Scenarios**:

1. **Given** I am logged in and have access to multiple organisations, **When** I open the context switcher, **Then** I see a list of all organisations I can access
2. **Given** I select a different organisation, **When** the context switches, **Then** the UI header shows the new organisation name and the project list updates
3. **Given** I am viewing an organisation, **When** I select a project within that organisation, **Then** the current project indicator updates and project-scoped data reflects the new context
4. **Given** I am in a specific organisation/project context, **When** I navigate between demo pages, **Then** the context persists and is visible in the navigation bar
5. **Given** I switch to an organisation where I have limited permissions, **When** the context switches, **Then** I only see projects I have access to and restricted actions are hidden/disabled

---

### User Story 3 - Permissions & Access Control Validation (Priority: P2)

As a maintainer, I can exercise different permission scenarios to verify that ACL enforcement (B08) works correctly across the application.

**Why this priority**: Permission checks are security-critical and must be verified end-to-end. This validates that backend ACL decisions correctly propagate to UI via the permissions package.

**Independent Test**: Can be fully tested by seeding users with different permission levels and running `pnpm test:smoke -- permissions-flow` to verify UI shows/hides elements correctly.

**Acceptance Scenarios**:

1. **Given** I am logged in as a user with limited permissions, **When** I view a demo page with permission-gated actions, **Then** I see only actions I am authorized to perform
2. **Given** I am logged in as an admin, **When** I view the same demo page, **Then** I see all available actions including admin-only operations
3. **Given** I attempt to access a resource without permission, **When** the backend denies access, **Then** I see a clear 403 error page with appropriate messaging
4. **Given** I am viewing a list of resources, **When** the page loads, **Then** I only see resources I have permission to view (no filtered resources cause errors)
5. **Given** I have read-only permissions on a project, **When** I view project details, **Then** edit/delete buttons are disabled or hidden

---

### User Story 4 - List/Detail Page Templates (Priority: P2)

As a developer, I can see working examples of F06 page templates (list, detail, settings) to understand how to compose them in downstream products.

**Why this priority**: Page templates are reusable patterns that need concrete examples. This validates F06 integration and provides reference implementations.

**Independent Test**: Can be manually validated by navigating through demo pages and verifying layouts match F06 specifications. Automated visual regression tests can catch layout breaks.

**Acceptance Scenarios**:

1. **Given** I navigate to the demo "Resources" list page, **When** the page loads, **Then** I see a consistent list layout with filters, pagination, and action buttons
2. **Given** I am on a list page, **When** I click on a resource item, **Then** I navigate to a detail page showing full resource information in a consistent layout
3. **Given** I am on a detail page, **When** I click "Back to list", **Then** I return to the list page with my previous filter/sort state preserved
4. **Given** I navigate to a settings-style page, **When** the page loads, **Then** I see a form layout consistent with F06 settings template patterns
5. **Given** I am on any demo page, **When** I resize my browser, **Then** the layout responds gracefully (mobile, tablet, desktop breakpoints)

---

### User Story 5 - Error State Demonstrations (Priority: P3)

As a reviewer, I can see examples of all major error states (loading, empty, 403, 404, 500) to verify error handling patterns are implemented consistently.

**Why this priority**: Error handling is important for user experience but not critical for validating core integrations. Can be validated after core flows work.

**Independent Test**: Can be tested by navigating to specific demo routes that trigger each error state (`/demo/errors/403`, `/demo/errors/404`, etc.) and verifying UI matches design system error components.

**Acceptance Scenarios**:

1. **Given** I navigate to `/demo/errors/403`, **When** the page loads, **Then** I see a branded 403 error page with clear messaging and a link back to the dashboard
2. **Given** I navigate to `/demo/errors/404`, **When** the page loads, **Then** I see a branded 404 error page with helpful navigation options
3. **Given** I navigate to a page that simulates loading, **When** the page is loading, **Then** I see appropriate loading skeletons or spinners consistent with F01 design system
4. **Given** I navigate to a list page with no data, **When** the page loads, **Then** I see an empty state message with optional call-to-action (e.g., "Create your first resource")
5. **Given** a backend error occurs, **When** the error is caught, **Then** I see a generic error boundary with a safe fallback UI and error ID for support

---

### User Story 6 - Notifications & Alerts Integration (Priority: P3)

As a developer, I can see notifications (F04) and alerts (F05) in context to understand how to integrate them in my own flows.

**Why this priority**: Nice-to-have demonstration of notification patterns but not critical for core platform validation. Can be added incrementally.

**Independent Test**: Can be tested by triggering notifications via demo actions (e.g., "Save" button shows success toast) and verifying F04 notification hub displays them correctly.

**Acceptance Scenarios**:

1. **Given** I perform an action that triggers a success notification, **When** the action completes, **Then** I see a success toast in the top-right corner that auto-dismisses after 5 seconds
2. **Given** I perform an action that triggers an error, **When** the error occurs, **Then** I see an error toast with details and the option to dismiss manually
3. **Given** I have unread notifications, **When** I view the notification hub icon, **Then** I see a badge count indicating the number of unread items
4. **Given** I click the notification hub icon, **When** the menu opens, **Then** I see a dropdown list of recent notifications with read/unread status
5. **Given** I navigate to a page with resource warnings (e.g., approaching limits), **When** the page loads, **Then** I see inline alert banners using F05 alert components

---

### User Story 7 - Developer Status Pages (Priority: P3)

As a maintainer, I can access developer-only status pages (`/demo/status/health`, `/demo/status/permissions`) to quickly inspect system state during debugging.

**Why this priority**: Helpful for debugging but not essential for validating core flows. Can be added after P1/P2 stories are complete.

**Independent Test**: Can be tested by navigating to `/demo/status/health` and verifying it shows B18 health check data in a readable format.

**Acceptance Scenarios**:

1. **Given** I navigate to `/demo/status/health`, **When** the page loads, **Then** I see structured health check data (database, cache, tasks) with pass/fail indicators
2. **Given** I navigate to `/demo/status/permissions`, **When** the page loads, **Then** I see my current permissions matrix (global, org, project) in a readable table
3. **Given** I am not authenticated, **When** I attempt to access status pages, **Then** I am redirected to login (these pages require authentication)
4. **Given** I am on a status page, **When** I refresh, **Then** I see updated real-time data reflecting current system state
5. **Given** I am debugging a permission issue, **When** I view the permissions status page, **Then** I can quickly see which permissions I have/lack for the current context

---

### Edge Cases

- What happens when seed data is not loaded? (Demo should show empty states gracefully or provide a "seed data" button)
- How does the demo handle missing frontend packages? (CI should fail fast if dependencies are not installed)
- What happens when backend services (B06, B07, B08 APIs) are unavailable? (Demo should show error boundaries and not crash)
- How does the demo handle concurrent sessions? (Multiple users should be able to access the demo simultaneously without conflicts)
- What happens when a user's permissions change mid-session? (Demo should reflect new permissions on next page load or context switch)
- How does staging deployment handle secrets? (Demo uses mock/seed credentials, not production secrets)
- What happens when CI smoke tests fail? (Build should fail with clear error messages indicating which journey broke)

## Requirements *(mandatory)*

### Functional Requirements

#### Core Application Structure

- **FR-001**: Demo application MUST be located at `examples/demo-shell/` in the repository (not in `apps/` or `src/` to clearly indicate it is a demo, not core code)
- **FR-002**: Demo MUST reuse all existing packages (F01 design system, F02 auth, F03 context switcher, F06 page templates, F07 theming, F04 notifications, F05 alerts, @django-core/permissions)
- **FR-003**: Demo MUST NOT introduce new core dependencies or breaking changes to existing modules
- **FR-004**: Demo MUST include a README.md with setup instructions, seed data commands, and explanation of demo purpose

#### Authentication & Session Management

- **FR-005**: Demo MUST implement complete login flow using F02 auth components and B05 backend endpoints
- **FR-006**: Demo MUST implement logout functionality that terminates session and redirects to login page
- **FR-007**: Demo MUST protect all non-auth routes behind authentication middleware (redirect unauthenticated users to login)
- **FR-008**: Demo MUST display current user information in the navigation header (name, email, or username)

#### Multi-Tenancy Context

- **FR-009**: Demo MUST implement context switcher using F03 components to allow switching between organisations and projects
- **FR-010**: Demo MUST display current organisation and project context prominently in the UI header
- **FR-011**: Demo MUST persist context selection across page navigations within the demo
- **FR-012**: Demo MUST filter context switcher options based on user permissions (only show accessible organisations/projects)

#### Permissions & Access Control

- **FR-013**: Demo MUST demonstrate permission-gated UI elements using @django-core/permissions package (PermissionGate components)
- **FR-014**: Demo MUST include pages with varying permission requirements (public, authenticated, admin-only) to showcase ACL patterns
- **FR-015**: Demo MUST render 403 error pages using F01 design system when permission is denied
- **FR-016**: Demo MUST call `/api/permissions/current/` endpoint to load user permissions on authentication

#### Page Templates & Layouts

- **FR-017**: Demo MUST include example list page using F06 list template pattern with pagination, filters, and actions
- **FR-018**: Demo MUST include example detail page using F06 detail template pattern showing resource information and related actions
- **FR-019**: Demo MUST include example settings-style page using F06 settings template pattern with form layouts
- **FR-020**: Demo MUST use F06 app shell component for consistent navigation (sidebar, topbar, content area)
- **FR-021**: Demo MUST demonstrate responsive layouts that work on mobile, tablet, and desktop viewports

#### Error States

- **FR-022**: Demo MUST include dedicated error demonstration pages (`/demo/errors/403`, `/demo/errors/404`) using F01 error components
- **FR-023**: Demo MUST show loading states using F01 loading spinners or skeleton screens during data fetching
- **FR-024**: Demo MUST show empty state messages using F01 empty state components when lists have no data
- **FR-025**: Demo MUST implement error boundaries to catch unhandled errors and display safe fallback UI

#### Notifications & Alerts

- **FR-026**: Demo MUST demonstrate toast notifications (success, error, info, warning) using F04 notification components
- **FR-027**: Demo MUST show notification hub icon in header with unread badge count (if F04 provides this component)
- **FR-028**: Demo MUST demonstrate inline alert banners using F05 alert components (e.g., resource usage warnings)

#### Developer Status Pages (Optional)

- **FR-029**: Demo MAY include `/demo/status/health` page showing B18 health check data in developer-friendly format
- **FR-030**: Demo MAY include `/demo/status/permissions` page showing current user's permission matrix for debugging
- **FR-031**: Status pages MUST be authentication-protected (require login to access)

#### Seed Data & Reproducibility

- **FR-032**: Demo MUST include seed fixtures or management command to populate reproducible test data (users, organisations, projects, sample resources)
- **FR-033**: Seed data MUST include users with different permission levels (admin, member, read-only) to test permission scenarios
- **FR-034**: Seed data MUST include at least 2 organisations and 3 projects per organisation to test context switching
- **FR-035**: Seed data MUST be idempotent (can be run multiple times without errors or duplicate data)
- **FR-036**: Demo MUST document seed data credentials in README.md (e.g., `demo_admin@example.com` / `password123`)

#### CI Smoke Tests

- **FR-037**: Demo MUST include 1-2 deterministic CI smoke test journeys that exercise critical paths (e.g., `test_auth_flow`, `test_context_switch_flow`)
- **FR-038**: Smoke tests MUST run in CI using pytest + playwright (or similar) for end-to-end journey validation
- **FR-039**: Smoke tests MUST use seed data for reproducibility (no reliance on external state)
- **FR-040**: Smoke tests MUST fail the build if core contracts are broken (e.g., auth flow fails, context switching breaks)

#### Deployment Environments

- **FR-041**: Demo MUST be runnable locally via `pnpm dev` or similar command (documented in README)
- **FR-042**: Demo MUST be deployable to staging environment using existing B19 deployment templates (Docker, docker-compose)
- **FR-043**: Staging demo MUST be explicitly marked "DEMO ONLY - NOT FOR PRODUCTION" in UI header
- **FR-044**: Staging demo MUST use basic authentication or IP whitelisting to restrict access (documented in deployment config)
- **FR-045**: Demo MUST use environment variables for configuration (backend URL, seed data toggle) to support local, staging, and CI environments

#### Integration & Dependencies

- **FR-046**: Demo MUST consume backend APIs via B13 API baseline (DRF endpoints for organisations, projects, users, permissions)
- **FR-047**: Demo MUST integrate with B16/B17 notifications backend if available (or gracefully degrade if not present)
- **FR-048**: Demo MUST work with B18 observability endpoints for health checks if available
- **FR-049**: Demo MUST NOT hardcode backend URLs (use environment variables or build-time configuration)

#### Maintenance & Discipline

- **FR-050**: Demo MUST remain minimal (max 5-7 unique page types: login, dashboard, list, detail, settings, errors, optional status)
- **FR-051**: Demo MUST NOT implement domain-specific features or dashboards (stays generic/infrastructure-focused)
- **FR-052**: Demo MUST NOT introduce breaking changes to core packages just to satisfy demo requirements
- **FR-053**: Demo MUST be updated when core packages (F01-F09, B05-B18) change in breaking ways (documented in CHANGELOG.md)

### Key Entities *(include if feature involves data)*

**Note**: Demo does not introduce new data models. It consumes existing entities from core modules:

- **User** (from B05): Represents authenticated users with credentials, profiles, and permissions
- **Organisation** (from B06): Multi-tenant organisation entities that users belong to
- **Project** (from B07): Workspace entities scoped to organisations that users work within
- **Permission** (from B08): ACL permissions that gate actions and resources
- **Notification** (from B16/B17): System notifications sent to users via various channels
- **SeedResource** (demo-specific, optional): Simple sample entity to demonstrate list/detail pages (can be a minimal model like "DemoResource" with title, description, owner, status for demonstration purposes only)

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products (demo patterns are reference implementations)
- [x] Extension points are clearly documented (demo shows how to integrate core packages without prescribing product-specific flows)

**Justification**: Demo is intentionally generic and infrastructure-focused, showcasing core platform capabilities (auth, context, permissions, page templates) without implementing domain-specific business logic.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering (demo is separate from core in `examples/demo-shell/`, not in `apps/` or `src/`)
- [x] No circular dependencies introduced (demo depends on core packages F01-F09, B05-B18, but core never depends on demo)
- [x] Extension points are stable and documented (demo references stable public APIs from core packages)

**Justification**: Demo is explicitly isolated as an example application that consumes core modules without modifying them. It serves as both smoke test and reference implementation.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (backend seed data scripts and optional Django views follow core standards)
- [x] Type hints will be used in backend demo code (management commands, seed data loaders)
- [x] Code will be formatted with Black and linted with Ruff (demo follows same CI checks as core)
- [x] Frontend code will follow TypeScript 5.x strict mode and ESLint rules from F01-F09 packages

**Justification**: Demo must meet same quality standards as core to serve as reference implementation. Downstream teams should be able to copy demo patterns with confidence.

### Testing (Principle IV)
- [x] Test plan includes pytest + playwright for smoke tests (1-2 critical journeys in CI)
- [x] Coverage targets defined (smoke tests must cover auth flow, context switching, permission validation)
- [x] Integration tests planned (end-to-end journeys validate frontend-backend contracts)
- [x] Frontend unit tests for demo-specific components (minimal, focused on demo logic only)

**Justification**: Demo serves as living integration test surface. Smoke tests validate core contracts continuously. Demo components themselves need minimal unit testing since they primarily compose existing packages.

### Security & Privacy (Principle V)
- [x] Secure defaults maintained (demo uses same B03 security baseline as core)
- [x] No secrets in code (demo uses environment variables for backend URL, seed credentials documented in README)
- [x] Authentication/authorization handled through centralized mechanisms (B05 auth, B08 ACL, F02 auth UI)
- [x] No sensitive data will be logged (demo follows redaction-by-default principle from Constitution Gate 31.5)
- [x] Staging deployment is access-controlled (basic auth or IP whitelist, documented in deployment README)

**Justification**: Demo must model secure patterns. Seed credentials are clearly fake (`demo_admin@example.com`) and only work in demo context, never production.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (demo consumes optimized core APIs; backend seed data scripts use bulk operations)
- [x] Pagination implemented (demo list pages use F06 paginated list templates consuming B13 paginated APIs)
- [x] Structured logging follows B18 patterns (demo logs use same structured format as core)
- [x] Graceful degradation strategy defined (demo shows error boundaries, handles missing backend services with clear error messages)

**Justification**: Demo validates that core APIs perform well. If demo encounters N+1 queries, it indicates a core API issue that should be fixed in the underlying module, not worked around in the demo.

### API Design (Principle VII)
- [x] DRF standards followed (demo consumes B13 API baseline, does not introduce new backend APIs unless minimal demo-specific endpoints needed for seed resources)
- [x] API responses are consistent (demo validates that core APIs return predictable formats documented in F09 integration guides)
- [x] No breaking changes introduced (demo adapts to core API changes, not vice versa)
- [x] Validation occurs at boundary (demo delegates validation to core backend; frontend shows validation errors from backend responses)

**Justification**: Demo is primarily a consumer of core APIs. Any demo-specific backend endpoints (e.g., for optional `DemoResource` entity) follow same DRF patterns as core modules.

### Demo Shell Discipline (Constitution Gate 31.5)
- [x] Demo app stays minimal (max 5-7 page types, no feature creep)
- [x] Demo acts as CI smoke test (1-2 deterministic journeys validate core contracts)
- [x] Demo tests core contracts without modifying them (integration surface, not extension point)
- [x] Demo is explicitly marked as non-production (staging header, access controls, seed data only)

**Justification**: This feature directly implements the "Demo shell discipline" principle added in Constitution Gate 31.5 (module 31.5). Demo validates that Core v1 modules integrate correctly without becoming a product.

### Documentation (Principle XI)
- [x] Feature documentation plan included (demo README.md with setup, seed data, smoke tests, deployment)
- [x] F09 integration guide updates identified (demo serves as concrete example referenced in integration guides)
- [x] No ADR needed (demo is straightforward reference implementation, no major architectural decisions)

**Justification**: Demo's primary documentation value is as living example code. README explains how to run it, but the code itself documents integration patterns.

**Violations Requiring Justification**: None. Demo aligns with all constitution principles and directly implements Constitution Gate 31.5 "Demo shell discipline" requirement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Maintainers can verify core integration health in under 5 minutes by running the demo locally (`pnpm dev`) and clicking through the primary user journey (login → context switch → list page)

- **SC-002**: CI smoke tests catch contract breaks within 10 minutes of PR submission (smoke tests run automatically on every commit to feature branches)

- **SC-003**: Reviewers can validate integration behavior during `/spec-kitty.review` and `/spec-kitty.accept` phases by accessing the staging demo URL and exercising acceptance scenarios without local setup

- **SC-004**: Downstream developers can copy demo patterns to build their first authenticated, multi-tenant page in under 30 minutes using demo code as reference (measured by time from clone to working page)

- **SC-005**: Demo successfully exercises all P1 user stories (auth flow, context switching, permissions) with 100% pass rate in CI smoke tests (deterministic, no flaky tests)

- **SC-006**: Demo serves as living documentation that stays synchronized with core packages - when core packages change, demo breaks clearly (indicating contract break) or updates within same PR (indicating backward-compatible change)

- **SC-007**: Demo remains minimal with fewer than 1500 lines of frontend code (excluding dependencies) and demonstrates all core integration patterns without feature creep (measured by `cloc examples/demo-shell/src`)

- **SC-008**: Demo staging deployment is accessible to reviewers with clear "DEMO ONLY" branding and basic access controls (no production data, seed credentials documented)

## Assumptions

### Technical Assumptions

- **A-001**: All core frontend packages (F01-F09) are implemented and stable with documented public APIs
  - **Rationale**: Demo consumes these packages; if any are incomplete, demo implementation will be blocked
  - **Impact if wrong**: Demo scope reduces to only showcase completed packages; P2/P3 stories may be deferred

- **A-002**: Backend core modules (B05, B06, B07, B08, B13, B16, B17, B18) expose stable REST APIs
  - **Rationale**: Demo relies on backend APIs for auth, context, permissions, notifications, health checks
  - **Impact if wrong**: Demo may need temporary mock backends or API adapters until real backends are ready

- **A-003**: B19 deployment templates support Docker + docker-compose workflows
  - **Rationale**: Demo staging deployment will reuse B19 patterns
  - **Impact if wrong**: Demo team creates minimal deployment scripts for staging, documents in demo README

- **A-004**: Playwright (or similar E2E testing tool) is acceptable for CI smoke tests
  - **Rationale**: Playwright provides reliable, deterministic browser automation for journey testing
  - **Impact if wrong**: Use alternative (Cypress, Selenium) or pure HTTP-based integration tests if browser automation is too flaky

### Data & Seed Assumptions

- **A-005**: Seed data can safely use hardcoded fake credentials (`demo_admin@example.com` / `password123`)
  - **Rationale**: Demo is explicitly non-production; seed credentials are documented and clearly fake
  - **Impact if wrong**: Use randomly generated credentials in seed script, document in README per run

- **A-006**: Demo can create minimal `DemoResource` model (title, description, owner, status) for list/detail page examples
  - **Rationale**: Core modules don't provide generic "resource" entities; demo needs something to display in F06 templates
  - **Impact if wrong**: Demo uses Organisation/Project entities directly for list/detail examples (less ideal but workable)

- **A-007**: Seed data fixtures are sufficient for reproducibility (no external data dependencies)
  - **Rationale**: Demo must work offline in CI without network dependencies
  - **Impact if wrong**: CI setup includes seeding from SQLite dump or JSON fixtures committed to repo

### Deployment & Access Assumptions

- **A-008**: Staging environment supports basic authentication or IP whitelisting for access control
  - **Rationale**: Demo staging should be semi-public for reviewers but not fully open
  - **Impact if wrong**: Use Django login (seed admin credentials) as access gate, document in deployment README

- **A-009**: Staging deployment URL will be provided to reviewers during `/spec-kitty.review` and `/spec-kitty.accept` phases
  - **Rationale**: Reviewers need easy access without local setup
  - **Impact if wrong**: Reviewers run demo locally; staging deployment becomes optional nice-to-have

- **A-010**: Demo does not require production-like scaling (can run on single container/node)
  - **Rationale**: Demo is for validation, not load testing; single instance is sufficient
  - **Impact if wrong**: No impact expected; demo is not designed for scale

### Integration Assumptions

- **A-011**: F09 integration guides will reference demo code as concrete examples
  - **Rationale**: Demo provides living documentation of integration patterns described in F09
  - **Impact if wrong**: Demo remains useful as smoke test even if F09 doesn't reference it

- **A-012**: Constitution Gate 31.5 principles are finalized and demo can reference them
  - **Rationale**: Demo directly implements "Demo shell discipline" principle from Gate 31.5
  - **Impact if wrong**: Demo proceeds with current understanding; adjusts if constitution changes during implementation

- **A-013**: Demo will be included in repository-wide sanity checks (B40, B41, B42 gate modules)
  - **Rationale**: Demo smoke tests validate that core platform remains integrated during hardening sprints
  - **Impact if wrong**: Demo runs independently; gate modules manually include demo checks in their scopes

### Maintenance Assumptions

- **A-014**: Demo will be updated within the same PR when core packages introduce breaking changes
  - **Rationale**: Keeps demo synchronized with core; breaks indicate contract violations
  - **Impact if wrong**: Demo breaks accumulate; periodic "catch-up" PRs needed to restore demo

- **A-015**: Demo scope remains intentionally minimal throughout project lifetime (no feature creep)
  - **Rationale**: Constitution Gate 31.5 "Demo shell discipline" mandates minimal scope
  - **Impact if wrong**: Demo becomes a product; violates constitution and undermines its purpose as validation surface
