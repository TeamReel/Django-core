# B14: Web-UI Baseline

**Phase:** 4
**Status:** ✅ Done
**Module ID:** 014
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 14. B14 – Web-UI Baseline (Django Templates)

**Doel**: Minimal server-rendered web UI met navigation en layout hooks.

**Status**: ✅ Complete

**Key Features**:
- Base templates (base.html, layout patterns)
- Navigation components
- Context processors (user, org, project)
- Static asset management
- Template inheritance patterns
- Integration hooks for frontend (F01-F07)

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Web UI Baseline
*Path: kitty-specs/014-web-ui-baseline/spec.md*

**Feature Branch**: `014-web-ui-baseline`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Provide a backend-driven web UI baseline with templates, layout structure, and navigation stubs that integrate cleanly with the existing B01–B13 backend foundation and can be used standalone or alongside a future SPA."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Render Server-Side Pages with Shared Layout (Priority: P1)

As a developer building server-side features, I need to render pages using a consistent base template so that all pages share common structure (header, navigation, footer) without duplicating markup.

**Why this priority**: Foundation for all other UI work. Without base templates, every feature would duplicate layout code, creating maintenance burden and inconsistency.

**Independent Test**: Create a new Django view, extend base template, render a simple page. Verify header, navigation, and content area render correctly.

**Acceptance Scenarios**:

1. **Given** a Django view that extends `base.html`, **When** the page is rendered, **Then** the page includes header, navigation area, main content area, and footer with proper semantic HTML structure
2. **Given** a developer wants to override the page title, **When** they set the `title` block in their template, **Then** the browser tab shows the custom title
3. **Given** multiple pages using the base template, **When** navigation structure changes, **Then** all pages reflect the update without individual template modifications

---

### User Story 2 - Navigate Based on Authentication State (Priority: P1)

As a user visiting the application, I need to see navigation items appropriate to my authentication state so that I can access relevant functionality without confusion.

**Why this priority**: Core usability requirement. Users must be able to navigate to login, account settings, and authenticated features based on their session state.

**Independent Test**: Visit site as anonymous user, verify "Login" link visible. Login, verify "Login" replaced with "Account" and "Logout".

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they view any page, **Then** navigation shows "Login" and "Register" links
2. **Given** an authenticated user, **When** they view any page, **Then** navigation shows their email/name, "Account", and "Logout" links
3. **Given** an authenticated user clicks "Logout", **When** the logout completes, **Then** they are redirected to home page and navigation reverts to unauthenticated state

---

### User Story 3 - Display Contextual Flash Messages (Priority: P2)

As a user performing actions (login, save settings, delete item), I need to see confirmation or error messages so that I understand whether my action succeeded or failed.

**Why this priority**: Essential for user feedback, but pages can function without messages (just less user-friendly).

**Independent Test**: Trigger Django messages framework in a view, verify message displays in template with appropriate styling hooks.

**Acceptance Scenarios**:

1. **Given** a view adds a success message via Django messages, **When** the next page renders, **Then** the message displays in the designated message area with success styling hook
2. **Given** a view adds an error message, **When** the page renders, **Then** the message displays with error styling hook
3. **Given** multiple messages are queued, **When** the page renders, **Then** all messages display in order with appropriate styling

---

### User Story 4 - Access Permission-Based Navigation (Priority: P2)

As a user with specific permissions, I need to see navigation items I'm authorized to access so that I'm not confused by links to forbidden areas.

**Why this priority**: Improves UX and reduces unauthorized access attempts, but system functions without it (403 errors provide fallback).

**Independent Test**: Create user without org admin permission, verify "Create Organisation" link hidden. Grant permission, verify link appears.

**Acceptance Scenarios**:

1. **Given** a user without organisation management permissions, **When** they view navigation, **Then** "Organisations" section does not appear
2. **Given** a user with project view permissions, **When** they view navigation, **Then** "Projects" link is visible
3. **Given** a user's permissions are revoked, **When** they reload any page, **Then** navigation updates to hide newly-restricted items

---

### User Story 5 - Reuse Form and List Components (Priority: P3)

As a developer building CRUD interfaces, I need reusable template includes for forms and lists so that I maintain consistency without duplicating markup patterns.

**Why this priority**: Quality-of-life improvement for developers. Features can be built without these includes (just more verbose).

**Independent Test**: Include `form_field.html` in a template, pass field object, verify field renders with label, input, and error display.

**Acceptance Scenarios**:

1. **Given** a Django form field, **When** rendered using `form_field.html` include, **Then** the field displays with label, input, help text, and error messages in semantic HTML
2. **Given** a queryset of objects, **When** rendered using `list_table.html` include, **Then** a table displays with headers and rows based on provided configuration
3. **Given** a pagination context, **When** rendered using `pagination.html` include, **Then** page navigation links display with current page highlighted

---

### Edge Cases

- **Empty navigation state**: What happens when a user has no permissions or belongs to no organisations? Navigation should render without errors, showing only public/account links.
- **Long entity names**: How does navigation handle organisation names exceeding 50 characters? Text should truncate with ellipsis, full name in title attribute.
- **Template inheritance conflicts**: What if downstream templates override the same blocks? Base template must provide clear documentation of override-safe blocks (content, title, extra_head, extra_nav_items) vs. internal-only blocks (navigation_inner, header_structure) that should not be overridden.
- **Missing static files**: How does the site render if CSS fails to load? Page must remain functional with semantic HTML, degrading gracefully.
- **Concurrent navigation changes**: What happens if navigation context changes mid-session (permissions revoked)? Context processor must reflect current state on each request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a base HTML template with blocks for title, head, navigation, content, footer, and scripts
- **FR-002**: System MUST provide a context processor that exposes current user, authentication state, and precomputed permission flags (can_view_orgs, can_manage_orgs, can_view_projects) to all templates, plus permission helper for edge case checks
- **FR-003**: System MUST render navigation component items with visibility based on authentication state (logged in vs anonymous)
- **FR-004**: System MUST render navigation component items with visibility based on user permissions from B08 RBAC system
- **FR-005**: System MUST display Django messages (success, error, warning, info) in a designated template area
- **FR-006**: System MUST provide reusable template includes for: form fields, form layouts, list tables, pagination, and messages
- **FR-007**: System MUST use semantic HTML5 elements (header, nav, main, article, section, footer) for accessibility
- **FR-008**: System MUST provide CSS class hooks on all major elements without implementing any styling (styling deferred to downstream products)
- **FR-009**: System MUST integrate with Django static files system for future CSS/JavaScript assets (no assets shipped in this baseline)
- **FR-010**: System MUST provide stub views with mixed functionality: (1) auth views (login, logout, password change/reset) fully integrated with B05 authentication, (2) other views (home/dashboard, organisation list, project list, account settings) as simple read-only stubs that prove navigation component and template wiring
- **FR-011**: System MUST configure URL patterns for all placeholder views with conventional names for `{% url %}` tags
- **FR-012**: System MUST render page titles in format "[Page Name] | [Site Name]" with configurable site name
- **FR-013**: System MUST include CSRF tokens in all forms automatically via base template
- **FR-014**: System MUST provide template block structure with two tiers: (1) safe blocks for downstream override (content, title, extra_head, extra_nav_items), (2) internal blocks reserved for baseline layout stability (navigation_inner, header_structure). Documentation must clearly distinguish override-safe vs. internal-only blocks.
- **FR-015**: System MUST maintain template compatibility with Django 5.1+ template language features

### Key Entities *(include if feature involves data)*

No new data models. This feature renders existing entities from B05 (User), B06 (Organisation), B07 (Project), and B08 (Permission).

**Template Context Objects**:
- **Current User**: Authenticated user instance from request, accessed via `request.user`
- **Navigation State**: Authentication status, permission flags, used to conditionally render nav items
- **Flash Messages**: Django messages framework message list for user feedback
- **Page Metadata**: Title, breadcrumbs, additional head content passed from individual views

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: Base templates and navigation are pure infrastructure. No product logic. Downstream products can override templates, add branding, and extend navigation without modifying core files.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: Templates live in a dedicated `web_ui` app. Context processors integrate with existing apps (accounts, organisations, projects, permissions) via stable public APIs. No circular imports.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Justification**: Context processors, view functions, and template tag libraries will use type hints. All Python code follows project standards.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Test Coverage**:
- Template rendering tests (verify blocks, context variables)
- Context processor tests (verify correct data in template context)
- Navigation visibility tests (permission-based display)
- View tests (status codes, template selection)
- Integration tests (full page render with authentication states)

**Target**: 80%+ coverage for B14-related Python code (context processors, views, template tags) and templates

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Security Measures**:
- CSRF tokens automatically included in base form template
- Navigation respects B08 permission checks (no unauthorized links)
- User email/name displayed in nav must not expose sensitive PII
- Login/logout views integrate with B05 authentication, not reimplemented

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Performance Considerations**:
- Context processor must not trigger N+1 queries (use select_related/prefetch_related if fetching related data)
- Navigation rendering must use precomputed permission flags (can_view_orgs, can_manage_orgs, can_view_projects) computed once per request, avoiding per-item permission checks
- Template includes must accept pre-computed data, not trigger database queries
- Pagination include accepts pagination object, does not query database

**Degradation**:
- If CSS fails to load, semantic HTML ensures page remains usable
- If context processor fails, templates must handle missing context gracefully (use default filter, conditional checks)

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Note**: This feature does not expose REST APIs. It renders server-side HTML. API design principles apply to view code structure (clean separation of concerns, input validation via forms).

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Documentation**:
- Template extension guide: how to override blocks, add custom navigation, extend base templates
- Context processor documentation: available context variables, how to extend
- Component guide: how to use form_field, list_table, pagination includes
- Styling guide: CSS class hooks, how to add custom styles without modifying base templates

**ADR**: None required. Standard Django template patterns, no novel architectural decisions.

**Violations Requiring Justification**: None

## Clarifications

### Session 2025-11-30

- **Q: Which static files organization strategy should we use?** → **A: (C) No CSS/JS files initially - only provide HTML structure with class hooks (defer styling completely)**
- **Q: How should the context processor handle permission data?** → **A: (C) Hybrid: precompute flags for navigation (can_view_orgs, can_manage_orgs, can_view_projects), provide permission helper for edge cases. Precompute a small set of booleans once per request for navigation visibility, and also expose a lightweight helper or the user object so templates can still call permission checks explicitly for less common cases.**
- **Q: Which blocks should be overridable by downstream templates?** → **A: (C) Two-tier system - "safe" blocks (content, title, extra_head, extra_nav_items) overridable, "internal" blocks (navigation_inner, header_structure) reserved. Downstream products can override high-level blocks but baseline keeps internal structure blocks reserved for layout stability.**
- **Q: What level of functionality should placeholder views provide?** → **A: (C) Mixed - auth views functional (integrate B05 for login/logout/password change), other views (orgs/projects) are stubs returning simple read-only lists. Login/logout should work end-to-end so baseline is usable. Organisation/project views can be simple listings that prove navigation and template wiring without full business logic.**

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can create a new server-side page by extending `base.html` and filling content block in under 5 minutes
- **SC-002**: Navigation updates (add/remove links) propagate to all pages automatically without touching individual view templates
- **SC-003**: 100% of pages render with valid semantic HTML5 structure (verified via automated validator)
- **SC-004**: Template rendering performance: pages with base template render in under 50ms (server-side, excluding network, measured in standard development/CI environment)
- **SC-005**: Zero template rendering errors in production for 30 days after deployment
- **SC-006**: Downstream products can override base templates and add custom branding without modifying core template files
- **SC-007**: Navigation visibility correctly reflects user permissions: users see only links they are authorized to access (0 unauthorized link displays)
- **SC-008**: Flash messages display correctly for 100% of user actions that trigger Django messages
- **SC-009**: Reusable template includes (form_field, list_table) reduce template code duplication by 60% compared to inline markup
- **SC-010**: Template context processor adds less than 5ms overhead to request processing (measured in standard development/CI environment)
