# F05: Resource Display & Alerts

**Phase:** 7
**Status:** ✅ Done
**Module ID:** 026
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 26. F05 – Resource Display & Alerts

**Doel**: UI patterns voor showing usage, credits, limits en alerts.

**Status**: ✅ Complete

**Key Features**:
- Usage meters and progress bars
- Credit balance displays
- Limit warnings and alerts
- Resource quota visualizations
- Alert components (info, warning, error, success)
- Integration with B11 transactions/credits

**Package**: `@django-core/resource-display`

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Resource Display & Alerts

**Feature Branch**: `027-resource-display-alerts`
**Created**: 2025-12-12
**Status**: Draft
**Input**: User description: "Provide generic UI patterns for displaying key resource states (usage, credits, limits, health) and surfacing alerts and warnings."

## User Scenarios & Testing

### User Story 1 - View Resource Usage Near Limits (Priority: P1)

Users need immediate visibility when approaching important resource limits (credits, API quotas, storage) to avoid service disruption.

**Why this priority**: Core value proposition - prevents users from unexpectedly hitting limits and experiencing service interruptions.

**Independent Test**: Can be fully tested by rendering a usage indicator component with mock data at 85% capacity and verifying visual warning state appears.

**Acceptance Scenarios**:

1. **Given** user has consumed 85% of monthly API quota, **When** they view any page with resource indicators, **Then** they see a warning-level visual indicator showing "850/1000 API calls used"
2. **Given** user has 50 credits remaining out of 1000, **When** they view the credits indicator, **Then** they see a critical-level alert with clear numerical and percentage display
3. **Given** user's storage is at 95% capacity, **When** they view the resource dashboard, **Then** they see a progress bar with critical color coding and specific "950MB / 1GB used" label

---

### User Story 2 - Dismiss and Hide Alerts (Priority: P2)

Users need the ability to acknowledge alerts and optionally hide them to reduce visual clutter after taking action.

**Why this priority**: Improves user experience by allowing users to manage their alert workflow without backend dependency.

**Independent Test**: Can be fully tested by rendering an alert, clicking the dismiss button, and verifying the alert disappears and is stored in browser localStorage.

**Acceptance Scenarios**:

1. **Given** user sees a low-credits alert, **When** they click the dismiss (X) button, **Then** the alert is removed from view for the current session
2. **Given** user sees an alert with "Don't show again" checkbox, **When** they check the box and dismiss, **Then** the alert does not reappear on page reload or future visits
3. **Given** user has previously dismissed an alert with "Don't show again", **When** they clear browser storage, **Then** the alert reappears on next page load
4. **Given** user dismisses multiple alerts, **When** they navigate between pages, **Then** dismissed alerts remain hidden across navigation within the same session

---

### User Story 3 - Visual Status Indicators for System Health (Priority: P2)

Administrators need at-a-glance visibility of system health metrics (API status, background job queues, service availability) to quickly identify issues.

**Why this priority**: Enables proactive monitoring and rapid response to system degradation before users are impacted.

**Independent Test**: Can be fully tested by rendering health status components with mock "degraded" or "down" states and verifying appropriate visual indicators and labels appear.

**Acceptance Scenarios**:

1. **Given** background job queue has 500+ pending jobs, **When** admin views system health dashboard, **Then** they see a warning indicator with "High queue depth: 523 pending jobs"
2. **Given** external API dependency is responding slowly, **When** health check runs, **Then** admin sees a "degraded" status with average response time displayed
3. **Given** all services are operational, **When** admin views health dashboard, **Then** they see green "operational" indicators for all monitored services
4. **Given** a service has been down for 5+ minutes, **When** admin views the dashboard, **Then** they see a critical-level indicator with downtime duration

---

### User Story 4 - Accessible Alert Presentation (Priority: P3)

Users with visual impairments or color blindness need accessible ways to understand resource states and alerts.

**Why this priority**: Ensures compliance with accessibility standards and makes the product usable for all users.

**Independent Test**: Can be fully tested by running automated accessibility tests (axe-core) on alert components and verifying WCAG 2.1 AA compliance.

**Acceptance Scenarios**:

1. **Given** user is navigating with screen reader, **When** alert appears, **Then** alert content and severity level are announced via ARIA live region
2. **Given** user is color-blind, **When** viewing resource usage near limit, **Then** they can identify warning state through icons, patterns, or text labels in addition to color
3. **Given** user navigating via keyboard, **When** alert with action button appears, **Then** they can focus and activate dismiss button using keyboard alone
4. **Given** user has high contrast mode enabled, **When** viewing alerts, **Then** alerts maintain sufficient contrast ratios (4.5:1 minimum for text)

---

### User Story 5 - Reusable Components Across Products (Priority: P3)

Developers building on the platform need consistent, composable alert and resource display components they can integrate into different contexts.

**Why this priority**: Ensures consistency and accelerates development of downstream products using the core platform.

**Independent Test**: Can be fully tested by importing components into a new React application, passing required props, and verifying rendering without errors.

**Acceptance Scenarios**:

1. **Given** developer imports `<ResourceUsageBar />` component, **When** they provide usage data props, **Then** component renders without requiring additional F05-specific context or setup
2. **Given** developer needs to display alerts in a sidebar, **When** they use `<AlertStack />` component, **Then** alerts render correctly within constrained layout without overflow issues
3. **Given** developer needs custom alert styling, **When** they pass F01 design tokens as props, **Then** component respects custom colors while maintaining accessibility
4. **Given** developer integrates components into F06 layout primitives, **When** page resizes, **Then** resource indicators and alerts adapt responsively without breaking layout

### Edge Cases

- What happens when user has no localStorage available (privacy mode, disabled cookies)?
  - System gracefully degrades: alerts can still be dismissed for session, but "don't show again" functionality is disabled with appropriate inline message
- What happens when resource data API returns error or no data?
  - Components handle expected empty/null/undefined data gracefully with loading skeleton or "unavailable" state with clear messaging. Unexpected render-time errors bubble to parent error boundary
- What happens when user has multiple critical alerts (>5) simultaneously?
  - Alert stack limits visible alerts to 5 most recent/critical, with "View all alerts" link to modal or dedicated page
- What happens when resource usage data becomes stale (last updated >5 minutes ago)?
  - Component displays timestamp of last update and visual indicator showing data may be outdated
- What happens when user dismisses alert on one device but views on another?
  - Alert reappears (browser storage is device-specific by design for F05; persistent cross-device sync is B16/B17 responsibility)

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a resource usage progress bar component that accepts current value, maximum value, and displays percentage with configurable warning thresholds (e.g., >80% = warning, >95% = critical)
- **FR-002**: System MUST provide alert/banner components with four severity levels: info, success, warning, critical, each with distinct visual styling following F01 design system
- **FR-002a**: System MUST treat severity as an explicit prop determined by consuming app. Components MUST NOT hardcode auto-escalation logic based on thresholds. Package MAY provide optional helper utilities (e.g., calculateSeverityFromUsage) for convenience, but core components remain product-agnostic
- **FR-003**: System MUST allow alerts to be dismissed via close button, with state persisted in browser localStorage for current domain
- **FR-004**: System MUST provide optional "Don't show again" checkbox for alerts, storing user preference in localStorage with unique alert identifier
- **FR-005**: System MUST provide health status indicator component that accepts status enum (operational, degraded, down, unknown) and displays appropriate icon and label
- **FR-006**: System MUST support stacking multiple alerts with automatic spacing and z-index management
- **FR-006a**: System MUST support two alert positioning modes via props: page-level banner (top of main content area) and inline (within resource panels/sections). Floating toast-style alerts are explicitly out of scope for F05
- **FR-007**: System MUST provide numeric badge component for displaying counts (e.g., "23 pending items") with optional color coding
- **FR-008**: System MUST expose components that integrate with F06 layout primitives without requiring wrapper elements
- **FR-009**: System MUST provide accessible focus management for interactive alert components (dismiss buttons, action links)
- **FR-010**: System MUST announce new alerts to screen readers via ARIA live regions (polite for info/success, assertive for warning/critical)
- **FR-010a**: System MUST support configurable animation behavior via props, with subtle fade-in/fade-out (250ms default, configurable via animationDuration prop, range 0-500ms) as default. All animations MUST respect prefers-reduced-motion CSS media query and disable transitions entirely when users have motion preferences set
- **FR-010b**: System MUST NOT catch or swallow render-time exceptions within components. All unhandled errors MUST bubble up to nearest parent React error boundary (consuming app or shared @django-core/error-handling boundary). Components MUST validate prop data and throw clear errors for invalid inputs rather than rendering broken UI
- **FR-011**: System MUST use F01 design tokens exclusively for all colors, spacing, typography, and shadows
- **FR-012**: System MUST provide TypeScript type definitions for all component props and data shapes
- **FR-013**: System MUST support server-side rendering for all components without client-side JavaScript dependency for initial display
- **FR-014**: System MUST provide data adapter interfaces for consuming B11 (credits/transactions) and B18 (health monitoring) API responses
- **FR-014a**: System MUST keep visual components stateless by default (data passed via props), but MAY provide optional hooks (e.g., useResourceUsage, useHealthStatus) that implement simple polling using @django-core/api-client. WebSocket/SSE real-time updates are explicitly out of scope
- **FR-015**: System MUST include Storybook stories demonstrating all component variants and states

### Key Entities

- **Resource Usage Data**: Represents current consumption against a limit (value: number, max: number, label: string, lastUpdated: timestamp)
- **Alert**: Notification with severity, message, optional action, dismissible state (id: unique string, severity: enum, title: string, message: string, dismissible: boolean, neverShowAgain: boolean)
- **Health Status**: System or service availability state (name: string, status: enum [operational|degraded|down|unknown], details: string, lastChecked: timestamp)
- **Alert Preference**: User's dismissal preferences stored in browser (alertId: string, dismissed: boolean, timestamp: number, neverShowAgain: boolean)

## Constitution Alignment

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: F05 provides generic, composable UI components with no domain-specific business logic. All components accept data via props, making them product-agnostic. Downstream products pass in their specific data and thresholds.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: F05 is a pure frontend package depending only on F01 (design system). It has no backend components and no dependency on B11/B18 - it only defines TypeScript interfaces for consuming their data.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Justification**: N/A for frontend-only feature. TypeScript strict mode will be enforced for type safety. Prettier for formatting, ESLint for linting.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Justification**: Frontend testing with Vitest. Target: >90% coverage for component logic, 100% coverage for localStorage utilities. Visual regression tests via Chromatic for all Storybook stories.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Justification**: Frontend components do not handle authentication. No API calls made directly - components only display data passed via props. LocalStorage usage limited to non-sensitive dismissal preferences.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Justification**: Components are lightweight (<5KB gzipped per component). Alert stack limits to 5 visible alerts to prevent DOM bloat. All components gracefully handle missing/null data with skeleton or empty states.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Justification**: N/A for frontend-only feature. Component prop interfaces follow React best practices and are versioned with semantic versioning.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Justification**: Storybook serves as interactive documentation. README includes usage examples for each component. Integration guide documents how to connect B11/B18 data sources.

**Violations Requiring Justification**: None

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can integrate any F05 component into a new page in under 10 minutes using only Storybook documentation and TypeScript autocomplete
- **SC-002**: All alert and resource display components achieve WCAG 2.1 AA compliance with no critical axe-core violations
- **SC-003**: Component bundle size remains under 20KB gzipped for the entire F05 package
- **SC-004**: Alert dismissal preferences persist correctly in browser storage with 100% success rate across all supported browsers (Chrome, Firefox, Safari, Edge)
- **SC-005**: 95% of users can identify resource warning states through non-color visual cues alone (icons, patterns, text labels)
- **SC-006**: Resource usage indicators re-render without visible flicker when data updates every 30 seconds
- **SC-007**: Alert stack handles 10+ simultaneous alerts without UI degradation or performance impact
- **SC-008**: Screen readers announce new critical alerts within 1 second of appearance
- **SC-009**: All components render correctly on mobile viewports (320px width minimum) without horizontal scroll
- **SC-010**: 100% of Storybook stories pass automated visual regression tests in Chromatic

## Assumptions

- F01 design system provides color tokens for success, warning, critical, info states with WCAG AA compliant contrast ratios
- F06 layout primitives (Stack, Grid, Container) are available and stable for composing F05 components
- Downstream products are responsible for fetching resource usage data from B11/B18 and passing to F05 components via props
- Browser localStorage is available in >95% of target user environments (graceful degradation for remaining 5%)
- TypeScript 5.x and React 18.x are the target frontend technologies
- Component library will be published as `@django-core/resource-alerts` npm package
- Vitest and React Testing Library are standard testing tools
- Chromatic is available for visual regression testing (already established in F01)

## Clarifications

### Session 2025-12-12

- Q: Where should alerts be positioned on the page? → A: Multiple modes, but constrained. F05 should support a small set of positions controlled by props: page-level banners (top of main content) and inline alerts inside resource panels/sections. Floating toast-style alerts at bottom-right are out of scope for F05 and should remain the responsibility of the existing notifications hub (F04).
- Q: How should resource usage data be refreshed/updated in the components? → A: Hybrid. F05 visual components should be stateless by default and receive resource data via props, but the package may provide optional hooks (e.g. useResourceUsage) that implement simple polling based on @django-core/api-client and B11/B18 endpoints. WebSocket/SSE real-time updates are out of scope for F05.
- Q: How should alerts animate when appearing or being dismissed? → A: Configurable via prop, with a subtle fade-in/fade-out (around 200–300ms) as the default. All animations must respect prefers-reduced-motion and disable transitions for users who prefer no motion.
- Q: What should happen if a component encounters an unhandled error during rendering (e.g., malformed data, JavaScript exception)? → A: Errors should bubble up to the nearest parent error boundary so the consuming app (or shared @django-core/error-handling boundary) can handle them. F05 components must not swallow render-time exceptions or hide them silently; fallback UI should be provided by the caller via an error boundary where needed.
- Q: Should alert severity levels automatically escalate based on resource usage thresholds, or should severity always be explicitly passed by the consuming app? → A: Explicit only. F05 components should treat severity as an explicit prop (info|success|warning|critical etc.) determined by the consuming app. F05 may provide small helper utilities for mapping usage percentage to severity, but the core visual components must not hardcode auto-escalation logic so they remain product-agnostic.

## Dependencies

- **F01 (Design System)**: Required for all design tokens, colors, typography, spacing
- **F06 (Layout Primitives)**: Optional but recommended for composing components in pages
- **B11 (Transactions/Credits)**: Provides data for credits and usage indicators (F05 defines TypeScript interface for B11 response shape)
- **B18 (Health Monitoring)**: Provides data for system health status indicators (F05 defines TypeScript interface for B18 response shape)
- **React 18.x**: Peer dependency
- **TypeScript 5.x**: Development dependency
