# F04: Notifications Hub UI

**Phase:** 6
**Status:** ✅ Done
**Module ID:** 025
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 25. F04 – Notifications Hub UI

**Doel**: Frontend voor notification center: unread count, notification list, actions.

**Status**: ✅ Complete

**Key Features**:
- Notification bell component (unread count badge)
- Notification list panel (dropdown/sidebar)
- Mark as read/unread actions
- Notification filtering (by type, date)
- Real-time updates (polling, future: WebSocket via B23)
- Integration with B16/B17 backend

**Package**: `@django-core/notifications-ui`

---

**Fase 6 Compleet**: 4 modules (F01-F04)
**Outcome**: Shared design system, auth flows, context switching and notification UI
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Notifications Hub UI
*Path: [kitty-specs/025-notifications-hub-ui/spec.md](../../../../kitty-specs/025-notifications-hub-ui/spec.md)*

**Feature Branch**: `025-notifications-hub-ui`
**Created**: 2025-12-11
**Status**: Draft
**Input**: User description: "F04-notifications-hub-ui"

## Clarifications

### Session 2025-12-11

- Q: Where should toast notifications be positioned on screen? → A: Configurable per deployment with sensible defaults. Default desktop: top-right corner, stack vertically with newest at top, spacing follows F01 tokens. Default mobile: top-center or near-top, full/near-full width below app header, does not cover navigation. Configuration via `toastPosition?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'` option on NotificationsHub provider/config. Z-index and accessibility consistent regardless of position.

- Q: What minimum browser versions should the notification hub support? → A: Match F01 design system targets. F04 inherits the same browser and device support matrix as F01 (modern evergreen browsers, last 2 major versions). No separate browser policy. Relies on same polyfills and build targets as F01. Single source of truth for browser compatibility maintained in F01.

- Q: When a user marks a notification as read but the API call fails, what should happen? → A: Optimistically update UI, revert on failure with error toast. Immediately update UI state (notification item + unread counter) for responsiveness. Fire API request in background. On success: keep updated state. On failure: revert to previous state, show error toast (F01 pattern) indicating change could not be saved, log error for observability.

- Q: Should the system track and expose notification delivery metrics (e.g., time-to-display, read rates) for monitoring? → A: Only track error/failure events for troubleshooting. Emit observability signals for errors (fetch failures, mark-as-read failures, real-time connection errors) via platform observability hooks. Focus on troubleshooting, not product analytics. No built-in metrics for time-to-display, read rates, or engagement analytics (handled by B16/B17 if needed).

- Q: When the inbox first loads, should it display a loading skeleton/placeholder or an empty state while fetching notifications? → A: Loading skeleton matching notification list structure. Show 3-5 skeleton rows matching notification shape (avatar/icon area, title line, body line, timestamp). Use F01 skeleton/shimmer components. Replace with actual list on load, or empty state if no notifications exist. Reduces perceived loading time compared to spinner.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Toast Notifications (Priority: P1)

A user is actively working in the application when an important event occurs (background job completes, access level changes, project invitation received). The user sees a non-blocking toast notification appear briefly with the event details, can dismiss it or click it to view more context, and the notification remains available in the inbox for later review.

**Why this priority**: Toast notifications provide immediate feedback for time-sensitive events without disrupting the user's current task. This is the primary value proposition of a notification system - keeping users informed in real-time.

**Independent Test**: Can be fully tested by triggering a backend notification event (via B16/B17 API) and verifying a toast appears with correct severity styling, auto-dismisses after the configured duration, and clicking it marks the notification as read while opening the relevant context.

**Acceptance Scenarios**:

1. **Given** a user is authenticated and viewing any page, **When** a notification event occurs (INFO severity), **Then** a toast appears with INFO styling, displays the notification message, includes a close button, and auto-dismisses after 4-6 seconds
2. **Given** a toast notification is displayed, **When** the user clicks the close button, **Then** the toast disappears immediately and the notification remains unread in the inbox
3. **Given** a toast notification is displayed, **When** the user clicks the toast body (not the close button), **Then** the notification is marked as read, the toast dismisses, and the user is navigated to the relevant context (or the inbox focuses on that notification)
4. **Given** a WARNING severity notification occurs, **When** the toast appears, **Then** it uses WARNING visual styling and auto-dismisses after 8-10 seconds
5. **Given** an ERROR severity notification occurs, **When** the toast appears, **Then** it uses ERROR visual styling, includes a close button, and does NOT auto-dismiss until manually closed or an action is taken
6. **Given** a notification includes an action button (e.g., "View Details"), **When** the toast appears, **Then** the action button is displayed and clicking it performs the configured action (navigate, focus inbox item) and marks the notification as read
7. **Given** a user is not authenticated, **When** a notification event occurs, **Then** no toast is displayed

---

### User Story 2 - Inbox Notification Management (Priority: P1)

A user wants to review all recent notifications, see which ones are unread, filter by type or status, and mark notifications as read/unread to keep track of what has been handled. The user opens the notifications inbox (either as a panel or full-page view), browses the list, uses filters to narrow down results, and marks items as read individually or in bulk.

**Why this priority**: The inbox provides persistent access to notification history and management capabilities. Users need this to review missed notifications, organize their notification workflow, and maintain awareness of system events.

**Independent Test**: Can be fully tested by seeding multiple notifications via B16/B17 API with different types and read states, opening the inbox UI, verifying the list displays correctly with pagination, applying filters (type, read/unread), marking items as read, and confirming state persistence.

**Acceptance Scenarios**:

1. **Given** a user has notifications in the system, **When** they open the notifications inbox, **Then** a loading skeleton (3-5 rows matching notification structure) is displayed while fetching, then replaced with actual notifications in reverse chronological order with clear visual distinction between read and unread items
2. **Given** the inbox is open with many notifications, **When** the user scrolls to the bottom, **Then** more notifications are loaded via pagination or lazy loading without full page refresh
3. **Given** the inbox is open, **When** the user applies a filter (e.g., "Unread only"), **Then** the list updates to show only matching notifications
4. **Given** the inbox displays notifications, **When** the user clicks a single notification item, **Then** it is marked as read, expands to show full details (or navigates to context), and the unread badge count updates
5. **Given** multiple unread notifications exist, **When** the user clicks "Mark all as read", **Then** all visible notifications are marked as read and the unread badge shows 0
6. **Given** a notification is marked as read, **When** the user clicks "Mark as unread", **Then** the notification returns to unread state and the badge count increments
7. **Given** the inbox is open, **When** no notifications exist for the current context, **Then** an empty state message is displayed (replacing the loading skeleton) with appropriate guidance
7. **Given** the inbox is open, **When** no notifications exist for the current context, **Then** an empty state message is displayed with appropriate guidance

---

### User Story 3 - Unread Badge Indicators (Priority: P2)

A user sees a badge/counter in the application shell (header icon, side navigation) showing the number of unread notifications for their current organisation/project context. The badge updates in real-time as notifications arrive or are marked as read, and clicking the badge opens the notifications inbox.

**Why this priority**: Persistent visibility of unread counts keeps users aware of pending notifications without requiring them to constantly check the inbox. The badge serves as the primary entry point to the notification system.

**Independent Test**: Can be fully tested by rendering the badge component in F06 layouts, triggering notifications to verify the count updates, marking notifications as read to verify count decrements, and clicking the badge to confirm it opens the inbox.

**Acceptance Scenarios**:

1. **Given** a user has unread notifications, **When** they view any page with the app shell, **Then** a badge displays the unread count next to the notifications icon
2. **Given** the badge shows a count, **When** a new notification arrives, **Then** the count increments immediately (via real-time update or next polling interval)
3. **Given** the badge shows a count, **When** the user marks a notification as read, **Then** the count decrements immediately
4. **Given** no unread notifications exist, **When** the badge is rendered, **Then** it displays "0" or is hidden entirely (configurable behavior)
5. **Given** the badge is displayed, **When** the user clicks it, **Then** the notifications inbox opens (as a panel or navigation to inbox page)
6. **Given** the badge displays a count, **When** the user is not authenticated, **Then** the badge is hidden or shows 0

---

### User Story 4 - Multi-Tenancy Context Switching (Priority: P2)

A user working across multiple organisations/projects uses the F03 context switcher to change their active organisation or project. When the context changes, the notifications hub updates to show only notifications relevant to the new context, the unread badge reflects the new context's count, and any open toast notifications are cleared or updated appropriately.

**Why this priority**: Proper context scoping ensures users see only relevant notifications and prevents confusion from notifications bleeding across tenants. This is critical for multi-tenant applications.

**Independent Test**: Can be fully tested by authenticating as a user with access to multiple organisations/projects, triggering notifications in different contexts, switching contexts via F03, and verifying the inbox list and badge counts update correctly.

**Acceptance Scenarios**:

1. **Given** a user is viewing Organisation A with 3 unread notifications, **When** they switch to Organisation B (which has 1 unread notification), **Then** the inbox updates to show only Organisation B's notifications and the badge shows "1"
2. **Given** a user has the inbox open for Organisation A, **When** they switch to Project X within that organisation, **Then** the inbox filters to show only notifications scoped to Project X
3. **Given** toast notifications are displayed for Organisation A, **When** the user switches to Organisation B, **Then** the toasts are cleared and new toasts for Organisation B appear if applicable
4. **Given** the user switches context, **When** the backend API returns 401/403 for the new context, **Then** an error message is displayed and the notification hub shows an empty state with appropriate guidance

---

### User Story 5 - Graceful Degradation (Priority: P3)

A user is working in an environment where real-time notification updates are unavailable (WebSocket connection fails, network instability, real-time feature disabled). The notifications hub falls back to periodic polling or manual refresh, continues to display notifications correctly, and provides clear feedback about the connection status without breaking the UI.

**Why this priority**: Reliability and resilience are important but not as critical as core notification display and management. Users can still receive notifications via polling, just with a delay.

**Independent Test**: Can be fully tested by disabling the real-time connection (or simulating connection failure), triggering notifications, and verifying the hub falls back to polling, continues to fetch and display notifications, and does not crash or show broken UI.

**Acceptance Scenarios**:

1. **Given** real-time updates are enabled, **When** the WebSocket connection fails, **Then** the hub switches to polling mode and displays a subtle indicator that real-time updates are unavailable
2. **Given** the hub is in polling mode, **When** new notifications arrive, **Then** they appear in the inbox and update the badge after the next poll interval (e.g., 30 seconds)
3. **Given** real-time updates are disabled by configuration, **When** the hub initializes, **Then** it starts in polling mode and fetches notifications at regular intervals
4. **Given** the hub is in polling mode, **When** the user manually refreshes the inbox, **Then** a fresh fetch is triggered immediately
5. **Given** polling fails due to network error, **When** the error occurs, **Then** an error message is displayed and the hub retries after a backoff interval

---

### User Story 6 - Notification Action Integration (Priority: P3)

A notification includes a primary action (e.g., "Open Project", "View Report", "Accept Invitation") that navigates the user to a specific page or triggers a workflow. The user clicks the action button in a toast or inbox item, the action is executed (navigation or API call), and the notification is marked as read.

**Why this priority**: Action buttons enhance notification utility by providing direct links to relevant contexts, but the core notification display and management functionality can work without them.

**Independent Test**: Can be fully tested by configuring a notification type with an action button, triggering that notification, clicking the action button, and verifying navigation occurs and the notification is marked as read.

**Acceptance Scenarios**:

1. **Given** a notification includes a navigation action, **When** the user clicks the action button in a toast, **Then** the user is navigated to the target URL and the notification is marked as read
2. **Given** a notification includes a navigation action, **When** the user clicks the action button in the inbox, **Then** the user is navigated to the target URL and the notification is marked as read
3. **Given** a notification includes an API action, **When** the user clicks the action button, **Then** the API call is made, success/error feedback is shown, and the notification is marked as read on success
4. **Given** a notification has no configured action, **When** the toast or inbox item is rendered, **Then** no action button is displayed

---

### Edge Cases

- What happens when a user has hundreds or thousands of notifications? (Pagination, lazy loading, server-side filtering)
- How does the system handle notification events arriving while the inbox is open? (Real-time updates insert new items at top, or batch updates on next fetch)
- What happens when a notification payload is malformed or missing required fields? (Graceful fallback to generic notification display, log error)
- How does the hub handle rapid-fire notification events (e.g., 10 notifications in 1 second)? (Toast queueing/stacking, rate limiting display)
- What happens when a user marks a notification as read while it's being displayed as a toast? (Toast dismisses, state sync)
- What happens when mark-as-read API call fails? (Optimistic UI update reverted, error toast displayed, previous state restored, error logged)
- How does the system handle notification types that don't have a configured mapping? (Fallback to generic INFO display, log warning)
- What happens when a user is offline and notifications are queued by the backend? (Next fetch retrieves all queued notifications, display in order)
- How does the hub handle authentication expiration while displaying notifications? (401 error triggers re-authentication flow, notifications cleared)
- What happens when a notification references a deleted or inaccessible resource? (Display notification with context-unavailable message, allow marking as read)
- How does the system handle timezone differences for notification timestamps? (Display in user's local timezone, configurable via F02 user preferences if available)

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- What happens when a user has hundreds or thousands of notifications? (Pagination, lazy loading, server-side filtering)
- How does the system handle notification events arriving while the inbox is open? (Real-time updates insert new items at top, or batch updates on next fetch)
- What happens when a notification payload is malformed or missing required fields? (Graceful fallback to generic notification display, log error)
- How does the hub handle rapid-fire notification events (e.g., 10 notifications in 1 second)? (Toast queueing/stacking, rate limiting display)
- What happens when a user marks a notification as read while it's being displayed as a toast? (Toast dismisses, state sync)
- How does the system handle notification types that don't have a configured mapping? (Fallback to generic INFO display, log warning)
- What happens when a user is offline and notifications are queued by the backend? (Next fetch retrieves all queued notifications, display in order)
- How does the hub handle authentication expiration while displaying notifications? (401 error triggers re-authentication flow, notifications cleared)
- What happens when a notification references a deleted or inaccessible resource? (Display notification with context-unavailable message, allow marking as read)
- How does the system handle timezone differences for notification timestamps? (Display in user's local timezone, configurable via F02 user preferences if available)

## Requirements *(mandatory)*

### Functional Requirements

**Core Display & Interaction**

- **FR-001**: System MUST display toast/snackbar notifications when events occur, using visual variants (INFO, SUCCESS, WARNING, ERROR) from F01 design system components
- **FR-001a**: System MUST support configurable toast positioning via `toastPosition` configuration option with values: 'top-right', 'top-center', 'bottom-right', 'bottom-center'
- **FR-001b**: System MUST use 'top-right' as default toast position on desktop viewports, stacking vertically with newest toast at top, using F01 spacing tokens
- **FR-001c**: System MUST use 'top-center' as default toast position on mobile viewports, with full/near-full width below app header, ensuring navigation controls remain accessible
- **FR-002**: System MUST support dismissing toast notifications via manual close button or automatic timeout based on severity level
- **FR-003**: System MUST allow users to click toast notifications to navigate to relevant context or focus the notification in the inbox
- **FR-004**: System MUST provide an inbox view displaying all notifications in reverse chronological order with clear read/unread visual distinction
- **FR-004a**: System MUST display loading skeleton (3-5 rows matching notification list structure) during initial inbox load, using F01 skeleton/shimmer components
- **FR-004b**: System MUST replace loading skeleton with actual notification list when data loads, or with F01-styled empty state if no notifications exist
- **FR-005**: System MUST support pagination or lazy loading for inbox notification lists when total count exceeds a threshold (e.g., 50 items)
- **FR-006**: System MUST display an unread badge/counter in the application shell (header, side nav) showing the count of unread notifications
- **FR-007**: System MUST update the unread badge count immediately when notifications are marked as read or new notifications arrive

**State Management**

- **FR-008**: System MUST mark notifications as read when a user clicks the toast body or opens the notification in the inbox
- **FR-009**: System MUST allow users to manually mark individual notifications as read or unread from the inbox
- **FR-009a**: System MUST use optimistic UI updates when marking notifications as read/unread (update UI immediately, revert on API failure)
- **FR-009b**: System MUST display error toast and revert state when mark-as-read/unread API call fails, logging error for observability
- **FR-010**: System MUST provide a "Mark all as read" action for all visible notifications in the current context
- **FR-011**: System MUST persist notification read/unread state via B13 API calls to B16/B17 backend services
- **FR-012**: System MUST sync notification state across multiple browser tabs/windows for the same user session

**Filtering & Search**

- **FR-013**: System MUST support filtering notifications by read/unread status in the inbox
- **FR-014**: System MUST support filtering notifications by type/category in the inbox
- **FR-015**: System MUST apply debounced client-side filtering for responsive user experience (300ms debounce)
- **FR-016**: System MUST support server-side filtering via B13 API query parameters when available

**Context & Authorization**

- **FR-017**: System MUST scope all notification queries to the current authenticated user from F02 AuthProvider
- **FR-018**: System MUST scope all notification queries to the current organisation/project context from F03 ContextSwitcherProvider
- **FR-019**: System MUST update the inbox and badge when the user switches organisation or project context via F03
- **FR-020**: System MUST handle 401/403/404 responses from B13 API gracefully with F01-styled error messages or empty states
- **FR-021**: System MUST clear or hide notifications when a user logs out or authentication expires

**Real-Time & Polling**

- **FR-022**: System MUST support optional real-time notification updates via WebSocket, SSE, or similar mechanism
- **FR-023**: System MUST fall back to periodic polling (default 30-second interval, configurable) when real-time is unavailable or disabled
- **FR-024**: System MUST not crash or break UI when real-time connection fails; MUST switch to polling mode gracefully
- **FR-025**: System MUST provide a manual refresh action in the inbox to fetch latest notifications on-demand

**Notification Mapping & Configuration**

- **FR-026**: System MUST provide a notification type mapping layer that maps backend notification types (from B16/B17) to frontend display patterns (toast variant, auto-dismiss timeout, action buttons)
- **FR-027**: System MUST use severity levels from backend payloads (INFO, SUCCESS, WARNING, ERROR, CRITICAL) to determine toast behavior (auto-dismiss timing, visual styling)
- **FR-028**: System MUST support configurable action buttons on notifications that trigger navigation or API calls when clicked
- **FR-029**: System MUST provide default fallback behavior for notification types without explicit mappings (display as INFO toast and generic inbox item)

**Accessibility**

- **FR-030**: System MUST announce toast notifications to screen readers using ARIA live regions without stealing focus
- **FR-031**: System MUST support full keyboard navigation for inbox (arrow keys to navigate list, Enter to open, Space to mark read/unread)
- **FR-032**: System MUST expose unread badge counts via accessible labels (e.g., "3 unread notifications")
- **FR-033**: System MUST provide focus management when opening/closing the inbox panel or modal

**Integration & Compatibility**

- **FR-034**: System MUST be router-agnostic and support mounting in both SPA frameworks (React Router, Next.js router) and Django template contexts
- **FR-035**: System MUST integrate with F06 layout components for badge placement (header, side navigation)
- **FR-036**: System MUST use only F01 design system components and tokens for all UI elements (no custom CSS)
- **FR-037**: System MUST consume authentication context from F02 (current user, session) and multi-tenancy context from F03 (active org/project)

**Error Handling & Resilience**

- **FR-038**: System MUST handle network errors during notification fetch with retry logic (exponential backoff, max 3 retries)
- **FR-039**: System MUST display user-friendly error messages when notification operations fail (fetch, mark as read, actions)
- **FR-040**: System MUST log errors to console or monitoring system without exposing sensitive information to users
- **FR-040a**: System MUST emit observability signals for error/failure events (notification fetch failures, mark-as-read failures, real-time connection errors) via platform observability hooks for troubleshooting
- **FR-041**: System MUST continue functioning (degraded mode) when backend API is temporarily unavailable

### Key Entities *(include if feature involves data)*

- **Notification**: Represents a single notification event with attributes including ID, type/category, severity level, title, message body, timestamp, read/unread status, organisation/project scope, optional action configuration (button label, target URL or API endpoint), and optional metadata (related resource IDs, user references)

- **NotificationTypeMapping**: Configuration mapping backend notification types to frontend display patterns, including toast variant (INFO/SUCCESS/WARNING/ERROR), auto-dismiss duration, whether to show action button, action button label and target, and whether to show in inbox

- **UnreadCount**: Aggregated count of unread notifications scoped to current user and organisation/project context, updated in real-time or via polling

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Notes**: F04 is a pure infrastructure component providing notification display and management capabilities. The notification type mapping layer allows downstream products to define product-specific notification types and behaviors without modifying F04 core logic.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Notes**: F04 is a frontend package (`@django-core/notifications-hub`) that depends on F01 (design system), F02 (auth), F03 (multi-tenancy), and consumes B13 API (which fronts B16/B17). The notification type mapping layer provides a stable extension point.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (N/A for frontend-only package)
- [x] Type hints will be used in core modules (TypeScript strict mode)
- [x] Code will be formatted with Black and linted with Ruff (N/A for frontend; Prettier + ESLint will be used)

**Notes**: Frontend package will use TypeScript with strict mode, ESLint, and Prettier for code quality.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests (N/A for frontend; Jest + React Testing Library will be used)
- [x] Coverage targets defined (aim for 85%+ coverage)
- [x] Integration tests planned for key flows

**Notes**: Unit tests for components, hooks, and utilities. Integration tests for full notification flows (toast display, inbox management, context switching). E2E tests for real-time and polling scenarios.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Notes**: F04 relies on F02 for authentication and B13 for authorization. All API calls include CSRF tokens from `@django-core/api-client`. Notification payloads may contain sensitive data; ensure no notification content is logged client-side.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Notes**: Inbox uses pagination/lazy loading. Real-time updates degrade to polling. Error boundaries prevent notification failures from crashing the app. Toast queueing prevents performance issues from rapid-fire notifications. Observability focused on error/failure events (fetch failures, state update failures, connection errors) for troubleshooting, not engagement analytics.

### API Design (Principle VII)
- [x] DRF standards followed (N/A for frontend; consumes B13 APIs)
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Notes**: F04 consumes B13 APIs provided by B16/B17. The notification type mapping layer validates payloads and provides fallback behavior for malformed data.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Notes**: Documentation will include usage guide for mounting the notification hub in F06 layouts, notification type mapping configuration guide, and integration guide for connecting to B16/B17 via B13 APIs.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see toast notifications within 1 second of the triggering event (for real-time mode) or within 30 seconds (for polling mode)
- **SC-002**: Users can mark a notification as read and see the unread badge update within 500ms (excluding network latency)
- **SC-003**: The inbox supports loading and displaying up to 1000 notifications without UI lag or jank (smooth scrolling, pagination)
- **SC-004**: Toast notifications for INFO/SUCCESS severity auto-dismiss after 4-6 seconds without manual intervention
- **SC-005**: Toast notifications for ERROR/CRITICAL severity remain visible until manually dismissed or an action is taken
- **SC-006**: The notification hub continues functioning in polling mode when real-time connection is unavailable, with no UI crashes or errors visible to users
- **SC-007**: Users can filter the inbox by read/unread status or notification type and see results update within 300ms (client-side filtering) or 1 second (server-side filtering)
- **SC-008**: When switching organisation or project context via F03, the inbox and badge update to show only relevant notifications within 1 second
- **SC-009**: All notification UI components are fully keyboard-accessible and screen reader announcements are clear and non-intrusive
- **SC-010**: 85%+ of notification-related code is covered by automated tests (unit + integration)
- **SC-011**: Users can complete the full workflow (receive toast, view inbox, mark as read) using only F01 design system components with no custom CSS required
- **SC-012**: The notification hub gracefully handles API errors (4xx, 5xx) and displays user-friendly error messages without breaking the UI

## Assumptions *(optional)*

- **A-001**: B16/B17 backend services provide REST APIs via B13 for listing notifications, marking as read, and bulk operations (mark all as read)
- **A-002**: Backend notification payloads include standard fields: id, type, severity, title, message, timestamp, read status, organisation/project scope
- **A-003**: Real-time updates are provided via WebSocket or SSE, but the exact protocol will be documented by backend teams; F04 will provide an adapter interface
- **A-004**: F06 layouts provide designated areas (header, side nav) for mounting the notification badge component
- **A-005**: F01 design system includes Toast/Snackbar, Badge, List, Icon, Button, and Modal/Panel components suitable for notification UI
- **A-006**: Notification action buttons target either internal routes (handled by router) or API endpoints (handled by API client)
- **A-007**: Notification timestamps are provided in UTC ISO 8601 format; frontend will convert to user's local timezone
- **A-008**: The system will not implement push notifications to mobile devices or browser notifications API; those are out of scope for F04
- **A-009**: Default polling interval is 30 seconds; this is configurable via environment variable or runtime configuration
- **A-010**: The notification type mapping layer is defined in a separate configuration file or module, allowing products to extend mappings without modifying core F04 code

## Open Questions *(optional)*

- **Q-001**: Should the inbox be implemented as a slide-out panel (similar to F03 organisation/project picker) or a full-page route, or should both be supported?
  - **Impact**: Affects routing integration and F06 layout placement
  - **Default assumption**: Slide-out panel for quick access, with optional full-page route for power users

- **Q-002**: Should toast notifications stack vertically (multiple toasts visible simultaneously) or queue (one at a time)?
  - **Impact**: Affects toast container implementation and UX for rapid-fire notifications
  - **Default assumption**: Stack up to 3 toasts, queue additional toasts and display sequentially

- **Q-003**: Should the system support notification grouping (e.g., "5 new comments on Project X" instead of 5 individual toasts)?
  - **Impact**: Requires additional backend support and frontend grouping logic
  - **Default assumption**: V1 does not support grouping; each notification is displayed individually

- **Q-004**: Should the unread badge show exact count (e.g., "23") or cap at a threshold (e.g., "9+", "99+")?
  - **Impact**: Affects badge rendering and accessibility labels
  - **Default assumption**: Show exact count up to 99, then display "99+"

## Dependencies *(optional)*

### Internal Dependencies

- **F01 (Design System)**: Provides all UI components (Toast, Badge, List, Button, Icon, Modal/Panel) and design tokens
- **F02 (Authentication)**: Provides current user context, session management, and CSRF token handling via `@django-core/api-client`
- **F03 (Multi-Tenancy Context)**: Provides current organisation/project context for scoping notification queries
- **F06 (Layouts)**: Provides app shell areas for mounting notification badge and inbox panel
- **B13 (API Foundation)**: Provides REST API baseline for consuming B16/B17 notification services
- **B16/B17 (Notification Services)**: Provides backend notification generation, persistence, and delivery

### External Dependencies (New)

- **react-window** or **@tanstack/react-virtual**: For virtualized list rendering in inbox (large notification counts)
- **date-fns** or **dayjs**: For date/time formatting and timezone conversion
- **(Optional) WebSocket client library**: For real-time notification updates (e.g., native WebSocket API or socket.io-client)

## Out of Scope *(optional)*

- **User preference management UI**: Per-channel, per-type notification toggles, delivery schedules, digest settings (future enhancement)
- **Email/SMS/Push notification delivery**: External channel delivery is handled by B16/B17; F04 only displays in-app notifications
- **Advanced analytics/reporting**: Notification engagement metrics, delivery reports, A/B testing of notification formats
- **Workflow automation**: Complex routing rules, escalation logic, approval workflows based on notifications
- **Notification composition/authoring UI**: Tools for admins to create custom notification templates or test notifications
- **Deep notification history search**: Full-text search across notification content, advanced date range filters (V1 provides basic type/status filtering only)
- **Browser push notifications API**: Integration with browser notification permission prompts and push API
- **Mobile app push notifications**: Integration with APNs/FCM for native mobile push (separate feature)

## Notes *(optional)*

- **Toast Positioning Configuration**: Toast position is configurable via `toastPosition` option on NotificationsHub provider/config, supporting 'top-right', 'top-center', 'bottom-right', 'bottom-center'. Desktop default: 'top-right' with vertical stack (newest at top), spacing follows F01 tokens. Mobile default: 'top-center' with full/near-full width below app header, ensuring navigation remains accessible. Z-index and accessibility behavior consistent regardless of position.`n`n- **Toast Queueing Strategy**: When multiple notifications arrive simultaneously (>3), the system will display up to 3 toasts at once in a vertical stack. Additional toasts are queued and displayed sequentially as earlier toasts dismiss. Toasts are ordered by severity (ERROR > WARNING > INFO/SUCCESS) within the queue.

- **Notification Type Mapping Example**:
  ```typescript
  const notificationMappings = {
    'task.completed': {
      severity: 'SUCCESS',
      toastDuration: 5000,
      showInInbox: true,
      action: { label: 'View Task', type: 'navigate', target: '/tasks/{taskId}' }
    },
    'access.revoked': {
      severity: 'WARNING',
      toastDuration: 10000,
      showInInbox: true,
      action: { label: 'Review Access', type: 'navigate', target: '/settings/access' }
    },
    'system.error': {
      severity: 'ERROR',
      toastDuration: null, // Manual dismiss only
      showInInbox: true,
      action: { label: 'View Details', type: 'navigate', target: '/inbox/{notificationId}' }
    }
  };
  ```

- **Real-Time Adapter Interface**: The system will define a `RealtimeAdapter` interface to abstract WebSocket/SSE implementation details. This allows swapping real-time mechanisms without changing core notification logic. Example methods: `connect()`, `disconnect()`, `subscribe(channel)`, `on(event, handler)`.

- **Accessibility Considerations**: Toast announcements will use `role="status"` for INFO/SUCCESS and `role="alert"` for WARNING/ERROR to ensure appropriate urgency in screen reader announcements. The inbox will use `aria-live="polite"` for real-time updates and provide clear focus management when opening/closing panels.

- **Performance Optimizations**: The inbox list will use virtual scrolling (react-window or similar) to render only visible items, reducing DOM nodes for large notification counts. API requests will include pagination parameters (`page`, `page_size`) and filtering parameters (`status=unread`, `type=task.completed`) to reduce payload size.

- **State Synchronization**: Notification read/unread state will be synchronized across browser tabs using `localStorage` events or BroadcastChannel API. When a user marks a notification as read in one tab, the badge and inbox in other tabs update automatically.

- **Optimistic UI Updates**: Mark-as-read/unread operations use optimistic updates for responsiveness. UI state (notification item + badge counter) updates immediately, API request fires in background. On success, state persists. On failure, state reverts to previous values, error toast displayed (F01 pattern), and error logged for observability without blocking other hub functionality.

- **Error Boundary Strategy**: The notification hub will be wrapped in a React Error Boundary to prevent notification-related errors from crashing the entire application. Errors are logged to monitoring systems and users see a fallback UI ("Notifications temporarily unavailable") instead of a broken page.

- **Observability Strategy**: F04 focuses on error/failure observability for troubleshooting. Emits signals for notification fetch failures, mark-as-read/unread failures, and real-time connection errors via platform observability hooks. Does not track engagement analytics (time-to-display, read rates, click-through) which are handled by B16/B17 if needed.

- **Loading States**: Inbox initial load displays loading skeleton (3-5 rows matching notification structure with avatar/icon, title, body, timestamp areas) using F01 skeleton/shimmer components. Skeleton replaced with actual list on successful load or F01-styled empty state if no notifications exist. Reduces perceived loading time and sets layout expectations.

- **Browser Compatibility**: F04 inherits browser and device support from F01 design system (modern evergreen browsers, last 2 major versions of Chrome/Firefox/Safari/Edge). No separate browser policy or legacy code paths. Relies on F01's polyfills and build configuration for consistent compatibility across the platform.


## Assumptions *(optional)*

- **A-001**: B16/B17 backend services provide REST APIs via B13 for listing notifications, marking as read, and bulk operations (mark all as read)
- **A-002**: Backend notification payloads include standard fields: id, type, severity, title, message, timestamp, read status, organisation/project scope
- **A-003**: Real-time updates are provided via WebSocket or SSE, but the exact protocol will be documented by backend teams; F04 will provide an adapter interface
- **A-004**: F06 layouts provide designated areas (header, side nav) for mounting the notification badge component
- **A-005**: F01 design system includes Toast/Snackbar, Badge, List, Icon, Button, and Modal/Panel components suitable for notification UI
- **A-006**: Notification action buttons target either internal routes (handled by router) or API endpoints (handled by API client)
- **A-007**: Notification timestamps are provided in UTC ISO 8601 format; frontend will convert to user's local timezone
- **A-008**: The system will not implement push notifications to mobile devices or browser notifications API; those are out of scope for F04
- **A-009**: Default polling interval is 30 seconds; this is configurable via environment variable or runtime configuration
- **A-010**: The notification type mapping layer is defined in a separate configuration file or module, allowing products to extend mappings without modifying core F04 code

## Open Questions *(optional)*

- **Q-001**: Should the inbox be implemented as a slide-out panel (similar to F03 organisation/project picker) or a full-page route, or should both be supported?
  - **Impact**: Affects routing integration and F06 layout placement
  - **Default assumption**: Slide-out panel for quick access, with optional full-page route for power users

- **Q-002**: Should toast notifications stack vertically (multiple toasts visible simultaneously) or queue (one at a time)?
  - **Impact**: Affects toast container implementation and UX for rapid-fire notifications
  - **Default assumption**: Stack up to 3 toasts, queue additional toasts and display sequentially

- **Q-003**: Should the system support notification grouping (e.g., "5 new comments on Project X" instead of 5 individual toasts)?
  - **Impact**: Requires additional backend support and frontend grouping logic
  - **Default assumption**: V1 does not support grouping; each notification is displayed individually

- **Q-004**: Should the unread badge show exact count (e.g., "23") or cap at a threshold (e.g., "9+", "99+")?
  - **Impact**: Affects badge rendering and accessibility labels
  - **Default assumption**: Show exact count up to 99, then display "99+"

## Dependencies *(optional)*

### Internal Dependencies

- **F01 (Design System)**: Provides all UI components (Toast, Badge, List, Button, Icon, Modal/Panel) and design tokens
- **F02 (Authentication)**: Provides current user context, session management, and CSRF token handling via `@django-core/api-client`
- **F03 (Multi-Tenancy Context)**: Provides current organisation/project context for scoping notification queries
- **F06 (Layouts)**: Provides app shell areas for mounting notification badge and inbox panel
- **B13 (API Foundation)**: Provides REST API baseline for consuming B16/B17 notification services
- **B16/B17 (Notification Services)**: Provides backend notification generation, persistence, and delivery

### External Dependencies (New)

- **react-window** or **@tanstack/react-virtual**: For virtualized list rendering in inbox (large notification counts)
- **date-fns** or **dayjs**: For date/time formatting and timezone conversion
- **(Optional) WebSocket client library**: For real-time notification updates (e.g., native WebSocket API or socket.io-client)

## Out of Scope *(optional)*

- **User preference management UI**: Per-channel, per-type notification toggles, delivery schedules, digest settings (future enhancement)
- **Email/SMS/Push notification delivery**: External channel delivery is handled by B16/B17; F04 only displays in-app notifications
- **Advanced analytics/reporting**: Notification engagement metrics, delivery reports, A/B testing of notification formats
- **Workflow automation**: Complex routing rules, escalation logic, approval workflows based on notifications
- **Notification composition/authoring UI**: Tools for admins to create custom notification templates or test notifications
- **Deep notification history search**: Full-text search across notification content, advanced date range filters (V1 provides basic type/status filtering only)
- **Browser push notifications API**: Integration with browser notification permission prompts and push API
- **Mobile app push notifications**: Integration with APNs/FCM for native mobile push (separate feature)

## Notes *(optional)*

- **Toast Positioning Configuration**: Toast position is configurable via `toastPosition` option on NotificationsHub provider/config, supporting 'top-right', 'top-center', 'bottom-right', 'bottom-center'. Desktop default: 'top-right' with vertical stack (newest at top), spacing follows F01 tokens. Mobile default: 'top-center' with full/near-full width below app header, ensuring navigation remains accessible. Z-index and accessibility behavior consistent regardless of position.`n`n- **Toast Queueing Strategy**: When multiple notifications arrive simultaneously (>3), the system will display up to 3 toasts at once in a vertical stack. Additional toasts are queued and displayed sequentially as earlier toasts dismiss. Toasts are ordered by severity (ERROR > WARNING > INFO/SUCCESS) within the queue.

- **Notification Type Mapping Example**:
  ```typescript
  const notificationMappings = {
    'task.completed': {
      severity: 'SUCCESS',
      toastDuration: 5000,
      showInInbox: true,
      action: { label: 'View Task', type: 'navigate', target: '/tasks/{taskId}' }
    },
    'access.revoked': {
      severity: 'WARNING',
      toastDuration: 10000,
      showInInbox: true,
      action: { label: 'Review Access', type: 'navigate', target: '/settings/access' }
    },
    'system.error': {
      severity: 'ERROR',
      toastDuration: null, // Manual dismiss only
      showInInbox: true,
      action: { label: 'View Details', type: 'navigate', target: '/inbox/{notificationId}' }
    }
  };
  ```

- **Real-Time Adapter Interface**: The system will define a `RealtimeAdapter` interface to abstract WebSocket/SSE implementation details. This allows swapping real-time mechanisms without changing core notification logic. Example methods: `connect()`, `disconnect()`, `subscribe(channel)`, `on(event, handler)`.

- **Accessibility Considerations**: Toast announcements will use `role="status"` for INFO/SUCCESS and `role="alert"` for WARNING/ERROR to ensure appropriate urgency in screen reader announcements. The inbox will use `aria-live="polite"` for real-time updates and provide clear focus management when opening/closing panels.

- **Performance Optimizations**: The inbox list will use virtual scrolling (react-window or similar) to render only visible items, reducing DOM nodes for large notification counts. API requests will include pagination parameters (`page`, `page_size`) and filtering parameters (`status=unread`, `type=task.completed`) to reduce payload size.

- **State Synchronization**: Notification read/unread state will be synchronized across browser tabs using `localStorage` events or BroadcastChannel API. When a user marks a notification as read in one tab, the badge and inbox in other tabs update automatically.

- **Error Boundary Strategy**: The notification hub will be wrapped in a React Error Boundary to prevent notification-related errors from crashing the entire application. Errors are logged to monitoring systems and users see a fallback UI ("Notifications temporarily unavailable") instead of a broken page.

## Open Questions *(optional)*

- **Q-001**: Should the inbox be implemented as a slide-out panel (similar to F03 organisation/project picker) or a full-page route, or should both be supported?
  - **Impact**: Affects routing integration and F06 layout placement
  - **Default assumption**: Slide-out panel for quick access, with optional full-page route for power users

- **Q-002**: Should toast notifications stack vertically (multiple toasts visible simultaneously) or queue (one at a time)?
  - **Impact**: Affects toast container implementation and UX for rapid-fire notifications
  - **Default assumption**: Stack up to 3 toasts, queue additional toasts and display sequentially

- **Q-003**: Should the system support notification grouping (e.g., "5 new comments on Project X" instead of 5 individual toasts)?
  - **Impact**: Requires additional backend support and frontend grouping logic
  - **Default assumption**: V1 does not support grouping; each notification is displayed individually

- **Q-004**: Should the unread badge show exact count (e.g., "23") or cap at a threshold (e.g., "9+", "99+")?
  - **Impact**: Affects badge rendering and accessibility labels
  - **Default assumption**: Show exact count up to 99, then display "99+"

## Dependencies *(optional)*

### Internal Dependencies

- **F01 (Design System)**: Provides all UI components (Toast, Badge, List, Button, Icon, Modal/Panel) and design tokens
- **F02 (Authentication)**: Provides current user context, session management, and CSRF token handling via `@django-core/api-client`
- **F03 (Multi-Tenancy Context)**: Provides current organisation/project context for scoping notification queries
- **F06 (Layouts)**: Provides app shell areas for mounting notification badge and inbox panel
- **B13 (API Foundation)**: Provides REST API baseline for consuming B16/B17 notification services
- **B16/B17 (Notification Services)**: Provides backend notification generation, persistence, and delivery

### External Dependencies (New)

- **react-window** or **@tanstack/react-virtual**: For virtualized list rendering in inbox (large notification counts)
- **date-fns** or **dayjs**: For date/time formatting and timezone conversion
- **(Optional) WebSocket client library**: For real-time notification updates (e.g., native WebSocket API or socket.io-client)

 
 
 

## Open Questions *(optional)*

- **Q-001**: Should the inbox be implemented as a slide-out panel (similar to F03 organisation/project picker) or a full-page route, or should both be supported?
  - **Impact**: Affects routing integration and F06 layout placement
  - **Default assumption**: Slide-out panel for quick access, with optional full-page route for power users

- **Q-002**: Should toast notifications stack vertically (multiple toasts visible simultaneously) or queue (one at a time)?
  - **Impact**: Affects toast container implementation and UX for rapid-fire notifications
  - **Default assumption**: Stack up to 3 toasts, queue additional toasts and display sequentially

- **Q-003**: Should the system support notification grouping (e.g., "5 new comments on Project X" instead of 5 individual toasts)?
  - **Impact**: Requires additional backend support and frontend grouping logic
  - **Default assumption**: V1 does not support grouping; each notification is displayed individually

- **Q-004**: Should the unread badge show exact count (e.g., "23") or cap at a threshold (e.g., "9+", "99+")?
  - **Impact**: Affects badge rendering and accessibility labels
  - **Default assumption**: Show exact count up to 99, then display "99+"

## Dependencies *(optional)*

### Internal Dependencies

- **F01 (Design System)**: Provides all UI components (Toast, Badge, List, Button, Icon, Modal/Panel) and design tokens
- **F02 (Authentication)**: Provides current user context, session management, and CSRF token handling via `@django-core/api-client`
- **F03 (Multi-Tenancy Context)**: Provides current organisation/project context for scoping notification queries
- **F06 (Layouts)**: Provides app shell areas for mounting notification badge and inbox panel
- **B13 (API Foundation)**: Provides REST API baseline for consuming B16/B17 notification services
- **B16/B17 (Notification Services)**: Provides backend notification generation, persistence, and delivery

### External Dependencies (New)

- **react-window** or **@tanstack/react-virtual**: For virtualized list rendering in inbox (large notification counts)
- **date-fns** or **dayjs**: For date/time formatting and timezone conversion
- **(Optional) WebSocket client library**: For real-time notification updates (e.g., native WebSocket API or socket.io-client)

## Out of Scope *(optional)*

- **User preference management UI**: Per-channel, per-type notification toggles, delivery schedules, digest settings (future enhancement)
- **Email/SMS/Push notification delivery**: External channel delivery is handled by B16/B17; F04 only displays in-app notifications
- **Advanced analytics/reporting**: Notification engagement metrics, delivery reports, A/B testing of notification formats
- **Workflow automation**: Complex routing rules, escalation logic, approval workflows based on notifications
- **Notification composition/authoring UI**: Tools for admins to create custom notification templates or test notifications
- **Deep notification history search**: Full-text search across notification content, advanced date range filters (V1 provides basic type/status filtering only)
- **Browser push notifications API**: Integration with browser notification permission prompts and push API
- **Mobile app push notifications**: Integration with APNs/FCM for native mobile push (separate feature)

## Notes *(optional)*

- **Toast Positioning Configuration**: Toast position is configurable via `toastPosition` option on NotificationsHub provider/config, supporting 'top-right', 'top-center', 'bottom-right', 'bottom-center'. Desktop default: 'top-right' with vertical stack (newest at top), spacing follows F01 tokens. Mobile default: 'top-center' with full/near-full width below app header, ensuring navigation remains accessible. Z-index and accessibility behavior consistent regardless of position.`n`n- **Toast Queueing Strategy**: When multiple notifications arrive simultaneously (>3), the system will display up to 3 toasts at once in a vertical stack. Additional toasts are queued and displayed sequentially as earlier toasts dismiss. Toasts are ordered by severity (ERROR > WARNING > INFO/SUCCESS) within the queue.

- **Notification Type Mapping Example**:
  ```typescript
  const notificationMappings = {
    'task.completed': {
      severity: 'SUCCESS',
      toastDuration: 5000,
      showInInbox: true,
      action: { label: 'View Task', type: 'navigate', target: '/tasks/{taskId}' }
    },
    'access.revoked': {
      severity: 'WARNING',
      toastDuration: 10000,
      showInInbox: true,
      action: { label: 'Review Access', type: 'navigate', target: '/settings/access' }
    },
    'system.error': {
      severity: 'ERROR',
      toastDuration: null, // Manual dismiss only
      showInInbox: true,
      action: { label: 'View Details', type: 'navigate', target: '/inbox/{notificationId}' }
    }
  };
  ```

- **Real-Time Adapter Interface**: The system will define a `RealtimeAdapter` interface to abstract WebSocket/SSE implementation details. This allows swapping real-time mechanisms without changing core notification logic. Example methods: `connect()`, `disconnect()`, `subscribe(channel)`, `on(event, handler)`.

- **Accessibility Considerations**: Toast announcements will use `role="status"` for INFO/SUCCESS and `role="alert"` for WARNING/ERROR to ensure appropriate urgency in screen reader announcements. The inbox will use `aria-live="polite"` for real-time updates and provide clear focus management when opening/closing panels.

- **Performance Optimizations**: The inbox list will use virtual scrolling (react-window or similar) to render only visible items, reducing DOM nodes for large notification counts. API requests will include pagination parameters (`page`, `page_size`) and filtering parameters (`status=unread`, `type=task.completed`) to reduce payload size.

- **State Synchronization**: Notification read/unread state will be synchronized across browser tabs using `localStorage` events or BroadcastChannel API. When a user marks a notification as read in one tab, the badge and inbox in other tabs update automatically.

- **Error Boundary Strategy**: The notification hub will be wrapped in a React Error Boundary to prevent notification-related errors from crashing the entire application. Errors are logged to monitoring systems and users see a fallback UI ("Notifications temporarily unavailable") instead of a broken page.
