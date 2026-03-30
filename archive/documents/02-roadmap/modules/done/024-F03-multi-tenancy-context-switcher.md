# F03: Multi-Tenancy Context Switcher

**Phase:** 6
**Status:** ✅ Done
**Module ID:** 024
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 24. F03 – Multi-Tenancy Context Switcher

**Doel**: UI voor switching tussen organisations en projects (context management).

**Status**: ✅ Complete

**Key Features**:
- Organization/project selector component
- Context persistence (cookie → localStorage → B12)
- Search and filtering (virtualized lists)
- Keyboard shortcuts (Ctrl/Cmd+K)
- Router-agnostic adapter pattern
- Recent context history
- Integration with B06/B07 backend

**Packages**: `@django-core/context-switcher`, `@django-core/api-client`

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Multi-Tenancy Context Switcher
*Path: kitty-specs/024-multi-tenancy-context/spec.md*

**Feature Branch**: `024-multi-tenancy-context`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "F03-multi-tenancy-context-switcher"

## Clarifications

### Session 2025-12-09

- Q: When a user switches organisations and is on a page that exists in both orgs (e.g., `/acme-corp/tasks` → `/beta-inc/tasks`), should the system navigate to the same page path in the new org or always go to default? → A: Navigate to the same page path in the new organisation if authorized; if not authorized, fall back to the org's default/dashboard page
- Q: For the search functionality in org/project pickers (FR-019), should the search filter immediately on every keystroke, require minimum characters, or use debouncing? → A: Require minimum 3 characters with 300ms debounce
- Q: Should the context switcher provide keyboard shortcuts for power users? → A: Yes, provide a single keyboard shortcut to open the context switcher (default Ctrl/Cmd+K), configurable and overridable by host app

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Current Context (Priority: P1)

As an authenticated user with access to at least one organisation, I need to see which organisation (and optionally project/workspace) I am currently working in, displayed clearly in the application header at all times.

**Why this priority**: This is the foundational requirement. Users must never lose sight of their current context to avoid data leaks or confusion. Without this, multi-tenancy is unsafe.

**Independent Test**: Can be fully tested by authenticating a user with access to one organisation, loading any page, and verifying the organisation name is visible in the header. Delivers immediate value: context awareness.

**Acceptance Scenarios**:

1. **Given** I am logged in and have access to one organisation "Acme Corp", **When** I navigate to any page in the app, **Then** I see "Acme Corp" displayed in the header
2. **Given** I am in organisation "Acme Corp" and project "Website Redesign", **When** I view the header, **Then** I see both "Acme Corp" and "Website Redesign" clearly indicated
3. **Given** I am on a mobile device, **When** I view the header, **Then** the current organisation/project name is visible without opening any menus
4. **Given** I am using a screen reader, **When** I navigate to the context indicator, **Then** it announces the current organisation and project name

---

### User Story 2 - Switch Between Organisations (Priority: P1)

As a user with access to multiple organisations, I need to quickly switch from my current organisation to another one I have access to, so I can work across different client accounts or teams without logging out.

**Why this priority**: Core multi-tenancy functionality. Users with multi-org access cannot be productive without this capability.

**Independent Test**: Can be fully tested by creating a user with access to two organisations, clicking the context switcher, selecting the second organisation, and verifying navigation to that org's context. Delivers immediate value: multi-org access.

**Acceptance Scenarios**:

1. **Given** I have access to "Acme Corp" and "Beta Inc", **When** I click the organisation name in the header, **Then** I see a dropdown/panel listing both organisations
2. **Given** I have access to "Acme Corp" and "Beta Inc", **When** I press the keyboard shortcut (Ctrl/Cmd+K), **Then** the organisation picker opens with focus on the search field
3. **Given** the organisation picker is open, **When** I click "Beta Inc", **Then** the app switches to Beta Inc context and the header updates to show "Beta Inc"
4. **Given** I switch from Acme Corp to Beta Inc, **When** the switch completes, **Then** the URL reflects the new organisation context (e.g. `/beta-inc/...` or `?org=beta-inc`)
5. **Given** I am viewing a page specific to Acme Corp (e.g. `/acme-corp/tasks`), **When** I switch to Beta Inc, **Then** I am navigated to the same page path in Beta Inc (`/beta-inc/tasks`) if I have access, otherwise to Beta Inc's default page
6. **Given** I have access to 50+ organisations, **When** I open the organisation picker, **Then** I see a search field to filter the list
7. **Given** I search for "beta", **When** the search field filters the list, **Then** only organisations matching "beta" (case-insensitive) are shown

---

### User Story 3 - Switch Between Projects/Workspaces (Priority: P2)

As a user working within an organisation that uses projects/workspaces, I need to switch between different projects I have access to within the same organisation, so I can work on multiple initiatives without losing context.

**Why this priority**: Essential for organisations using project-based workflows. Lower than P1 because some products may not use projects at all.

**Independent Test**: Can be fully tested by creating an organisation with multiple projects, assigning a user access to both, and verifying project switching updates context and URL. Delivers value: multi-project workflows.

**Acceptance Scenarios**:

1. **Given** I am in organisation "Acme Corp" with access to projects "Website Redesign" and "Mobile App", **When** I click the project name in the header, **Then** I see a dropdown listing both projects
2. **Given** the project picker is open, **When** I select "Mobile App", **Then** the app switches to that project context and the header updates to show "Acme Corp / Mobile App"
3. **Given** I switch projects, **When** the switch completes, **Then** the URL reflects the new project (e.g. `/acme-corp/mobile-app/...`)
4. **Given** I have access to projects in multiple organisations, **When** I switch organisations, **Then** the project picker defaults to the last-visited project in the new organisation (or no project if none previously selected)
5. **Given** I have access to 100+ projects, **When** I open the project picker, **Then** I see a search field and the list is scrollable or virtualized to handle the volume

---

### User Story 4 - Handle URL-Based Context (Priority: P1)

As a user following a deep link or bookmark to a specific organisation/project page, I need the app to load that context directly if I have access, so I can jump straight to the intended content.

**Why this priority**: Deep linking is critical for sharing, bookmarks, and integrations. Without this, multi-tenancy URLs are useless.

**Independent Test**: Can be fully tested by navigating to a URL with org/project segments (e.g. `/acme-corp/website-redesign/tasks`) and verifying the context switcher reflects that context. Delivers value: shareable links.

**Acceptance Scenarios**:

1. **Given** I have access to "Acme Corp" and the URL contains `/acme-corp/...`, **When** the page loads, **Then** the context switcher shows "Acme Corp" as the current organisation
2. **Given** I have access to project "Website Redesign" and the URL contains `/acme-corp/website-redesign/...`, **When** the page loads, **Then** the context switcher shows "Acme Corp / Website Redesign"
3. **Given** I follow a URL with an organisation I do not have access to, **When** the page loads, **Then** the backend returns 403/404 and the app shows a safe "No Access" error (F01-styled) with a link to return to my default context
4. **Given** I follow a URL with a project I lost access to, **When** the page loads, **Then** the app falls back to showing the organisation context only (or a safe error if I lost org access too)
5. **Given** I bookmark a URL in "Acme Corp / Website Redesign", **When** I return to that bookmark weeks later, **Then** the app loads directly into that context if I still have access

---

### User Story 5 - First-Time Context Selection (Priority: P2)

As a new user who just gained access to one or more organisations, I need to be prompted to choose an organisation/project if none is set, so I can start working with a clear understanding of my context.

**Why this priority**: Ensures a smooth onboarding experience for new users or those with no default context. Lower than P1 because most users will have a backend-provided default.

**Independent Test**: Can be fully tested by creating a user with access to multiple orgs, navigating to the app root with no URL context, and verifying a picker screen appears. Delivers value: clear onboarding.

**Acceptance Scenarios**:

1. **Given** I am a new user with access to "Acme Corp" and "Beta Inc", **When** I first log in with no URL context, **Then** I see a dedicated organisation picker screen (F01-styled) asking me to choose an organisation
2. **Given** the picker screen is displayed, **When** I select "Acme Corp", **Then** the app navigates to Acme Corp's default page (e.g. dashboard) and the context switcher shows "Acme Corp"
3. **Given** I have access to only one organisation "Acme Corp", **When** I log in with no URL context, **Then** the app auto-selects "Acme Corp" and navigates to the default page without showing a picker
4. **Given** I have access to zero organisations, **When** I log in, **Then** I see an F01-styled empty state explaining no organisations are available and suggesting I contact an administrator

---

### User Story 6 - Remember Last Context Per Organisation (Priority: P3)

As a user who frequently switches between organisations and their projects, I want the app to remember which project I was last viewing in each organisation, so I can resume work quickly without re-navigating.

**Why this priority**: Quality-of-life improvement that reduces friction for power users. Not essential for core functionality.

**Independent Test**: Can be fully tested by switching from "Acme Corp / Website Redesign" to "Beta Inc", then back to "Acme Corp", and verifying it returns to "Website Redesign". Delivers value: faster context restoration.

**Acceptance Scenarios**:

1. **Given** I am in "Acme Corp / Website Redesign", **When** I switch to "Beta Inc", **Then** the system remembers "Website Redesign" was my last project in Acme Corp
2. **Given** I later switch back to "Acme Corp", **When** the organisation loads, **Then** the context switcher automatically selects "Website Redesign" as the active project
3. **Given** I have never visited a project in "Beta Inc", **When** I switch to Beta Inc for the first time, **Then** no project is pre-selected (or a backend default is used if available)
4. **Given** the backend provides a "current context" API, **When** I log in, **Then** the frontend defers to the backend's last context rather than client-side memory

---

### Edge Cases

- **What happens when a user's organisation access is revoked while they are actively using the app?**
  - The next API call in that org context returns 403/404
  - The context switcher detects the error and navigates to a safe fallback (e.g. org picker or first available org)
  - User sees an F01-styled error message explaining their access changed

- **What happens when a user has access to 500+ organisations?**
  - The organisation picker uses virtualized scrolling or pagination to render only visible items
  - Search field is mandatory and filters the list in real-time
  - Recent/pinned organisations are shown at the top (if backend supports this metadata)

- **What happens when the backend API to fetch organisations/projects fails?**
  - The context switcher shows an F01-styled error state
  - If a current context is already loaded (from URL or previous state), keep showing it but disable switching
  - Provide a "retry" action

- **What happens when a user attempts to switch context with unsaved changes in a form?**
  - The context switcher calls the host app's `onBeforeContextChange` callback (if provided)
  - The host app can return `false` or show a confirmation modal
  - If the host returns `true` or no callback is provided, the switch proceeds immediately

- **What happens when the URL context does not match the backend's authorized list?**
  - The backend returns 403/404 for that org/project
  - The app falls back to the backend-provided "current" context or shows the org picker
  - User sees a clear error message (e.g. "You no longer have access to this organisation")

- **What happens on mobile when the organisation/project names are very long?**
  - The context indicator truncates long names with ellipsis
  - Tapping it opens a full-screen sheet showing the full name and picker UI
  - The full name is always visible in the expanded picker

- **What happens when a user bookmarks a URL with a temporary or deleted project?**
  - The backend returns 404 for that project
  - The app falls back to the organisation context (if user still has org access)
  - User sees a message: "This project no longer exists" with a link to the org dashboard

## Requirements *(mandatory)*

### Functional Requirements

**Context Display & Awareness**

- **FR-001**: The system MUST display the current organisation name in the application header at all times when a context is selected
- **FR-002**: The system MUST display the current project/workspace name (if applicable) alongside the organisation name when a project context is active
- **FR-003**: The context indicator MUST be visible on mobile viewports without requiring menu navigation
- **FR-004**: The context indicator MUST be accessible via keyboard navigation and announce context to screen readers
- **FR-004a**: The context switcher MUST provide a configurable keyboard shortcut (default: Ctrl/Cmd+K) to open the organisation/project picker
- **FR-004b**: The keyboard shortcut MUST be overridable or disable-able by the host application to prevent conflicts with other global shortcuts
- **FR-005**: The context indicator MUST truncate long organisation/project names with ellipsis and show the full name on hover or in the expanded picker

**Context Switching**

- **FR-006**: Users MUST be able to open an organisation picker by clicking/tapping the current organisation name
- **FR-007**: The organisation picker MUST list only organisations the user is authorized to access (as provided by the backend via B13 APIs)
- **FR-008**: Users MUST be able to switch to a different organisation by selecting it from the picker
- **FR-009**: When a user switches organisations, the system MUST update the URL to reflect the new organisation context (via routing integration)
- **FR-010**: When a user switches organisations, the system MUST attempt to navigate to the same page path in the new organisation (preserving page context); if the user is not authorized to access that resource in the new org, the system MUST fall back to a safe default page for that organisation (e.g. dashboard or home)
- **FR-011**: Users MUST be able to open a project/workspace picker (if the organisation uses projects) by clicking/tapping the current project name
- **FR-012**: The project picker MUST list only projects/workspaces the user is authorized to access within the current organisation
- **FR-013**: Users MUST be able to switch to a different project by selecting it from the picker
- **FR-014**: When a user switches projects, the system MUST update the URL to reflect the new project context
- **FR-015**: Context switches MUST be immediate by default (no confirmation dialog)
- **FR-016**: The system MUST expose an `onBeforeContextChange` callback hook that allows host applications to implement custom confirmation logic (e.g. for unsaved changes)

**Search & Large List Handling**

- **FR-017**: The organisation picker MUST include a search field when the user has access to more than 10 organisations
- **FR-018**: The project picker MUST include a search field when the organisation has more than 10 projects
- **FR-019**: Search fields MUST filter the list in real-time as the user types (case-insensitive substring match) with a 300ms debounce and minimum 3 characters before filtering begins
- **FR-020**: Organisation and project pickers MUST handle lists of 500+ items using virtualized scrolling or pagination to maintain performance
- **FR-021**: The organisation picker MUST display recently used or pinned organisations at the top of the list (if backend provides this metadata)

**URL-Based Context & Deep Linking**

- **FR-022**: When a user navigates to a URL containing organisation context (e.g. `/acme-corp/...` or `?org=acme-corp`), the system MUST load that organisation as the active context
- **FR-023**: When a user navigates to a URL containing project context (e.g. `/acme-corp/website-redesign/...`), the system MUST load both organisation and project as the active context
- **FR-024**: When the URL specifies a context the user does not have access to, the system MUST handle the backend 403/404 response gracefully and fall back to a safe default context or show an F01-styled "No Access" error
- **FR-025**: When the URL specifies a context that no longer exists (deleted org/project), the system MUST fall back to the next available context or show an error with a return link
- **FR-026**: The system MUST prefer URL-based context over all other context sources (localStorage, backend default, etc.)

**Initial Context Selection**

- **FR-027**: When a user first logs in with no URL context and the backend provides a "current" or "default" organisation, the system MUST auto-select that organisation
- **FR-028**: When a user first logs in with no URL context and has access to exactly one organisation, the system MUST auto-select that organisation and navigate to its default page
- **FR-029**: When a user first logs in with no URL context and has access to multiple organisations with no backend default, the system MUST display a dedicated organisation picker screen (F01-styled) blocking access to tenant-scoped content until a selection is made
- **FR-030**: When a user has access to zero organisations, the system MUST display an F01-styled empty state explaining no organisations are available and suggesting they contact an administrator
- **FR-031**: The system MUST NOT fabricate or guess a context if none is available

**Context Memory & Restoration**

- **FR-032**: The system SHOULD remember the last-visited project for each organisation on a per-user basis
- **FR-033**: When a user switches back to an organisation, the system SHOULD restore the last-visited project in that organisation (if the user still has access)
- **FR-034**: The system MUST defer to backend-provided "current context" data over client-side memory (localStorage) when both are available
- **FR-035**: Context memory MUST NOT override URL-based context or backend authorization decisions

**Backend Integration**

- **FR-036**: The system MUST fetch the list of accessible organisations from the backend via a B13 API endpoint (e.g. `/api/organisations/`)
- **FR-037**: The system MUST fetch the list of accessible projects for an organisation from the backend via a B13 API endpoint (e.g. `/api/organisations/{id}/projects/`)
- **FR-038**: The system MUST fetch the user's "current" or "default" context from the backend if such an endpoint is provided (e.g. `/api/context/current/`)
- **FR-039**: The system MUST treat all backend responses as the single source of truth for authorization; the frontend MUST NOT perform client-side access control checks
- **FR-040**: When backend API calls fail (network error, 500, etc.), the system MUST display an F01-styled error state and provide a retry action
- **FR-041**: When backend API calls return 401 (unauthorized), the system MUST redirect the user to the login page
- **FR-042**: When backend API calls return 403/404 for a specific org/project, the system MUST fall back to a safe context and show a user-friendly error message

**Design System & Layout Integration**

- **FR-043**: The context switcher MUST be built entirely using F01 design system components (Button, Dropdown, List, SearchField, Avatar/Badge, Typography, layout primitives)
- **FR-044**: The context switcher MUST use F01 design tokens for spacing, colors, typography, and elevation
- **FR-045**: The context switcher MUST compose cleanly into F06 layout components (Header, AppShell, Sidebar) without custom styling overrides
- **FR-046**: The context switcher component MUST remain layout-agnostic: it MUST be renderable in a header, sidebar, or standalone context
- **FR-047**: The context switcher MUST support responsive behavior: on mobile, the picker MUST open as a full-screen sheet or modal rather than a dropdown
- **FR-048**: The context switcher MUST meet WCAG 2.1 AA accessibility standards: keyboard navigable, screen reader friendly, sufficient color contrast

**Error Handling & Resilience**

- **FR-049**: When a user's access to an organisation is revoked while actively using the app, the next API call MUST return 403/404 and the system MUST navigate to a safe fallback with a clear error message
- **FR-050**: When the backend returns stale or invalid context data, the system MUST re-fetch the latest context and update the UI
- **FR-051**: When a user attempts to switch context and the backend is unavailable, the system MUST keep the current context visible but disable switching, showing an error banner with a retry action

### Key Entities *(include if feature involves data)*

**Organisation**
- Represents a tenant/client/account in the multi-tenancy system
- Key attributes: ID, name, display name, slug (for URL routing), avatar/logo (optional), metadata (e.g. is_pinned, last_visited_at)
- Relationships: An organisation has many projects/workspaces; a user has many organisations (via B08 role assignments)

**Project/Workspace**
- Represents a sub-context within an organisation (optional, depending on product usage)
- Key attributes: ID, name, display name, slug (for URL routing), organisation ID (parent), metadata (e.g. is_archived, last_visited_at)
- Relationships: A project belongs to one organisation; a user has many projects (via B08 role assignments scoped to projects)

**User Context**
- Represents the user's current active organisation and project selection
- Key attributes: user ID, current organisation ID, current project ID (nullable), last updated timestamp
- Relationships: Links a user to their active organisation and project at any given time
- Note: This may be stored server-side (B06/B07) or client-side (localStorage) depending on backend support

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
  - The context switcher is brand-agnostic and makes no assumptions about downstream product needs
  - All UI text is generic ("Organisation", "Project") with no domain-specific terminology
- [x] All functionality is reusable across multiple downstream products
  - Any product using B06/B07 organisations and projects can integrate this switcher
  - No hard-coded business rules or product-specific flows
- [x] Extension points are clearly documented if product-specific behavior is needed
  - `onBeforeContextChange` callback allows products to plug in unsaved-changes confirmation
  - Component props allow custom labels, icons, and routing integration

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
  - Frontend package is self-contained with no backend logic
  - Backend integration via documented B13 API contracts only
  - No direct database queries or Django ORM dependencies in frontend code
- [x] No circular dependencies introduced
  - Depends on F01 (design system) and integrates with F06 (layouts) as one-way dependencies
  - Backend dependency on B06/B07/B08/B13 is via API contracts only
- [x] Extension points are stable and documented
  - Component API (props, callbacks, events) is clearly defined
  - Routing integration is adapter-based to support different router implementations

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (N/A for frontend-only feature)
- [x] Type hints will be used in core modules
  - TypeScript will be used for all React components and utilities
  - All props, state, and API response types will be strictly typed
- [x] Code will be formatted with Black and linted with Ruff (N/A for frontend)
  - Frontend code will use Prettier for formatting and ESLint for linting
  - Will follow F01's established linting rules

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests (N/A for frontend-only feature)
- [x] Coverage targets defined
  - Unit tests: 90%+ coverage for all React components and utilities
  - Integration tests: Key user flows (P1 stories) must have end-to-end tests using MSW for API mocking
  - Accessibility tests: All interactive elements must pass axe-core audits
- [x] Integration tests planned for key flows
  - Context switching (org-to-org, project-to-project)
  - URL-based context loading and fallbacks
  - Large list handling (search, virtualization)
  - Error scenarios (403/404, network failures)

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
  - All API calls use F02's CSRF-protected fetch wrapper
  - No client-side storage of sensitive organisation/project data beyond IDs and display names
- [x] No secrets in code; env vars/secret managers documented
  - API endpoints will be configured via environment variables or runtime config
- [x] Authentication/authorization handled through centralized mechanisms
  - All authorization decisions deferred to backend (B08)
  - Frontend never assumes access; always checks backend responses
- [x] No sensitive data will be logged
  - Only organisation/project IDs and names (non-sensitive) are logged for debugging
  - User IDs are logged only in aggregate (no PII)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
  - Backend APIs (B13) must return paginated or batched responses for org/project lists
  - Frontend will batch context fetches where possible (e.g. fetch org + projects in parallel)
- [x] Pagination implemented for unbounded responses
  - Organisation and project pickers will use virtualized scrolling for 100+ items
  - Search will be debounced (300ms) to avoid excessive API calls
- [x] Structured logging and metrics hooks included
  - Context switches will emit client-side analytics events (org/project change, switch duration)
  - API errors (403/404/500) will be logged with context for debugging
- [x] Graceful degradation strategy defined for failure scenarios
  - If org/project list fetch fails, keep current context visible and show error banner
  - If context switch fails, roll back to previous context and notify user
  - If backend is unreachable, disable switching but keep UI functional

### API Design (Principle VII)
- [x] DRF standards followed (N/A for frontend-only feature; backend APIs assumed compliant)
- [x] API responses are consistent and documented
  - Frontend expects B13-compliant JSON responses with standardized error envelopes
  - API contracts for `/api/organisations/`, `/api/organisations/{id}/projects/`, `/api/context/current/` are documented
- [x] Breaking changes use versioning or deprecation paths
  - Component API follows semantic versioning; breaking changes will be communicated via deprecation warnings
- [x] Validation occurs at boundary (serializers/forms)
  - All backend validation is trusted; frontend performs basic client-side checks (e.g. non-empty search terms) for UX only

### Documentation (Principle XI)
- [x] Feature documentation plan included
  - Integration guide: How to add the context switcher to F06 layouts
  - API contract guide: Required backend endpoints and response formats
  - Customization guide: How to use `onBeforeContextChange` and custom labels
  - Accessibility guide: Keyboard shortcuts and screen reader behavior
- [x] Extension guide updates identified if applicable
  - F01 design system docs: Add Context Switcher component examples
  - F06 layout docs: Add header integration example with context switcher
- [x] ADR planned if major architectural decision involved
  - ADR will document decision to make routing integration adapter-based (rather than hard-coding React Router)
  - ADR will document decision to defer to backend for "current context" rather than maintaining client-side state machine

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify their current organisation and project context within 1 second of page load
  - Measured by: Context indicator visible in header without scrolling or interaction

- **SC-002**: Users can switch between organisations in under 5 seconds (from click to new context loaded)
  - Measured by: Time from opening picker to new org dashboard displayed
  - Target: 95th percentile under 5 seconds

- **SC-003**: Users with access to 100+ organisations can find and switch to a specific organisation in under 10 seconds using search
  - Measured by: Time from opening picker to selecting org via search
  - Target: 90% of users complete search-based selection in under 10 seconds

- **SC-004**: 100% of URL-based deep links to valid org/project contexts load correctly on first attempt
  - Measured by: Ratio of successful deep link navigations to total deep link attempts
  - Target: Zero fallback to picker for valid URLs with authorized access

- **SC-005**: Zero data leaks or context confusion incidents reported by users
  - Measured by: User-reported incidents of seeing data from wrong org/project
  - Target: Zero incidents in production
  - Validation: All context switches must update URL and trigger full page/data reload

- **SC-006**: Context switcher handles network failures gracefully without breaking the app
  - Measured by: Error recovery tests (org list fetch fails, context switch API fails)
  - Target: 100% of network errors result in safe error state with retry action, no crashes

- **SC-007**: Context switcher meets WCAG 2.1 AA accessibility standards
  - Measured by: Automated axe-core audits + manual keyboard/screen reader testing
  - Target: Zero critical accessibility violations, all interactive elements keyboard-navigable

- **SC-008**: Context switcher integrates into F06 header layout with zero custom CSS overrides
  - Measured by: Code review confirming all styling uses F01 tokens and components
  - Target: 100% of styles come from F01 design system

- **SC-009**: 90% of users successfully switch context on their first attempt without confusion or errors
  - Measured by: Analytics tracking successful vs. abandoned context switches
  - Target: <10% of users open picker and close without switching (excluding intentional browsing)

- **SC-010**: Context memory restores last-visited project with 95% accuracy when switching back to an organisation
  - Measured by: Ratio of correct project restorations to total org switches
  - Target: 95% of users land in expected project when returning to an org
