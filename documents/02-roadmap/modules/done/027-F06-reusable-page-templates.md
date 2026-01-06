# F06: Reusable Page Templates

**Phase:** 7
**Status:** ✅ Done
**Module ID:** 027
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 27. F06 – Reusable Page Templates

**Doel**: App shell en page layouts: navigation, content, headers, footers.

**Status**: ✅ Complete

**Key Features**:
- Base layout components (AppShell, Header, Sidebar, Footer)
- Page templates (Dashboard, List, Detail, Settings, Wizard)
- Navigation patterns (top nav, side nav, breadcrumbs)
- Responsive layouts (mobile, tablet, desktop)
- Slot-based composition (flexible content areas)

**Package**: `@django-core/page-templates`

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Reusable Page Templates
*Path: [kitty-specs/029-reusable-page-templates/spec.md](../../../../kitty-specs/029-reusable-page-templates/spec.md)*

**Feature Branch**: `029-reusable-page-templates`
**Created**: 2025-12-13
**Status**: Draft
**Input**: User description: "Provide reusable, unbranded page templates for common SaaS patterns (dashboard, list-detail, settings, wizard) built on top of the core app shell/layouts and design system."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard Page Structure (Priority: P1)

As a frontend developer, I can use the dashboard template to create a consistent overview page by providing header content, optional filters, and a grid of widget components, so that I don't need to recreate layout structure and state handling for each dashboard-style page.

**Why this priority**: Dashboard is the most common landing page pattern in SaaS applications. Getting this template right establishes the baseline for other templates and validates the composition model with F01/F06.

**Independent Test**: Can be fully tested by rendering a dashboard with dummy widgets in different states (loading, empty, error) and verifying correct layout structure, responsive behavior, and state UI rendering.

**Acceptance Scenarios**:

1. **Given** a dashboard template with header content and 4 widget slots, **When** rendered in loading state, **Then** the page displays header, optional filter bar, and grid container with default loading UI
2. **Given** a dashboard template in empty state, **When** no widgets are provided, **Then** the template shows default empty state UI with override capability via slot
3. **Given** a dashboard with mixed widget content, **When** viewport changes from desktop to tablet to mobile, **Then** grid layout adjusts according to F06 breakpoints without horizontal scroll
4. **Given** a dashboard template, **When** consumer provides custom error state content via slot, **Then** custom content replaces default error UI while maintaining layout structure

---

### User Story 2 - List-Detail Navigation (Priority: P1)

As a frontend developer, I can use the list-detail template to create browse-and-view interfaces by providing a list component and detail component, so that navigation between items follows a consistent pattern across different entity types.

**Why this priority**: List-detail is a foundational CRUD pattern used across most data-driven applications (users, projects, orders, etc.). This validates template composition for navigation flows.

**Independent Test**: Can be tested by rendering a list of dummy items, selecting one, viewing detail, and verifying correct layout transitions, state handling (loading list, loading detail, error states), and accessibility (focus management, keyboard navigation).

**Acceptance Scenarios**:

1. **Given** a list-detail template in loading state, **When** initial data loads, **Then** list area shows default loading UI and detail area is empty or shows placeholder
2. **Given** a list with 3 items rendered, **When** user selects the second item, **Then** detail area updates to show selected item and list maintains selection state
3. **Given** a list-detail view on mobile, **When** user selects an item, **Then** list view is hidden/minimized and detail view takes full width with back navigation
4. **Given** detail area in error state, **When** consumer provides custom error content via slot, **Then** custom error UI renders in detail area while list remains functional
5. **Given** an empty list, **When** template renders, **Then** default empty state UI appears in list area with configurable call-to-action slot

---

### User Story 3 - Multi-Step Wizard Flow (Priority: P2)

As a frontend developer, I can use the wizard template to create multi-step workflows by providing step configuration and content for each step, so that users get consistent step indication, navigation, and progress feedback without rebuilding wizard structure.

**Why this priority**: Wizards are common for onboarding, complex forms, and guided processes. This template validates stateful navigation patterns and confirms the boundary between template structure and consumer logic.

**Independent Test**: Can be tested by rendering a 3-step wizard with dummy content, navigating forward/backward, attempting navigation with disabled buttons, and verifying step indicator updates, focus management, and keyboard navigation.

**Acceptance Scenarios**:

1. **Given** a 3-step wizard initialized on step 1, **When** template renders, **Then** step indicator shows step 1 active, previous button is disabled, next button is enabled, and step 1 content is visible
2. **Given** wizard on step 2, **When** user clicks previous button, **Then** template calls onStepChange callback with step index 1, step indicator updates, and previous step content renders
3. **Given** wizard on final step, **When** user clicks next/finish button, **Then** template calls onStepChange callback with completion indicator and shows configurable completion state or action
4. **Given** wizard with custom step validation, **When** consumer disables next button via prop, **Then** next button is visually disabled and click has no effect
5. **Given** wizard in loading state during step transition, **When** onStepChange is processing, **Then** navigation buttons show loading state and are disabled

---

### User Story 4 - Settings Page Layout (Priority: P2)

As a frontend developer, I can use the settings template to create configuration interfaces by providing section definitions and form content, so that settings pages have consistent organization, navigation, and state handling across different configuration areas.

**Why this priority**: Settings pages are universal in SaaS applications but often become inconsistent as features are added. This template establishes patterns for sectioned configuration interfaces.

**Independent Test**: Can be tested by rendering a settings page with 3 sections, navigating between sections, updating values, and verifying section navigation, layout consistency, and state UI for save/error scenarios.

**Acceptance Scenarios**:

1. **Given** a settings template with 3 sections (Profile, Security, Notifications), **When** template renders, **Then** section navigation is visible, first section is active, and section content area shows active section
2. **Given** settings page with sidebar navigation on desktop, **When** viewport changes to mobile, **Then** section navigation converts to dropdown or tab bar according to F06 responsive patterns
3. **Given** a settings section in error state, **When** save operation fails, **Then** template shows default error UI in section content area with override capability
4. **Given** settings template with unsaved changes indicator, **When** consumer provides dirty state flag, **Then** template displays appropriate visual indicator (e.g., dot on section tab or banner)

---

### User Story 5 - Template State Override (Priority: P3)

As a frontend developer, I can override default state UI (loading, empty, error, permission-denied, offline) for any template by providing custom content via slots or render props, so that I can customize feedback while maintaining structural consistency.

**Why this priority**: While default states ensure consistency, product-specific contexts may require custom messaging, illustrations, or actions. This validates the override mechanism across all templates.

**Independent Test**: Can be tested by rendering each template type with custom state content and verifying that custom content appears in correct layout position while preserving template structure and accessibility.

**Acceptance Scenarios**:

1. **Given** any template with default empty state, **When** consumer provides custom empty state content via slot, **Then** custom content renders in template's content area with correct spacing and layout
2. **Given** multiple state overrides provided (empty and error), **When** template state changes, **Then** appropriate custom content renders for each state transition
3. **Given** partial state override (only error customized), **When** template enters loading state, **Then** default loading UI renders while error state uses custom content
4. **Given** custom state content with actions (e.g., retry button), **When** rendered, **Then** actions are keyboard accessible and maintain focus management within template structure

---

### Edge Cases

- What happens when a dashboard template receives no widgets and no custom empty state? Default empty state UI must render with appropriate spacing
- How does wizard template handle attempts to navigate beyond step bounds (step -1 or step > total)? Template should prevent navigation and log warning in development mode
- What happens when list-detail template renders with empty list and detail is pre-selected? List shows empty state, detail area shows "select an item" placeholder or remains empty based on configuration
- How does settings template handle deep linking to a specific section? Template accepts activeSection prop to initialize on specified section
- What happens when template enters permission-denied state but no custom permission UI is provided? Default permission-denied UI renders with generic message and optional custom action slot
- How do templates handle extremely long content that causes scroll? Each template defines scroll regions (e.g., list scrolls independently of detail, wizard content scrolls but navigation remains fixed)
- What happens when consumer provides invalid step configuration to wizard (duplicate IDs, missing steps)? Template validates configuration and throws development-mode error with clear message

## Requirements *(mandatory)*

### Functional Requirements

#### Dashboard Template

- **FR-001**: Dashboard template MUST provide structural regions: page header (with title and actions slot), optional filter bar, and responsive grid container for widget content
- **FR-002**: Dashboard template MUST NOT include widget management features (drag-to-reorder, widget resizing, layout persistence)
- **FR-003**: Dashboard grid container MUST adapt to F06 breakpoints without requiring consumer configuration (e.g., 3-column on desktop, 2-column on tablet, 1-column on mobile)
- **FR-004**: Dashboard template MUST support all standard page states (loading, empty, error, partial-data) with default UI and override capability

#### List-Detail Template

- **FR-005**: List-detail template MUST provide two primary regions: list area and detail area with responsive layout switching
- **FR-006**: List-detail template MUST handle mobile layout by showing list OR detail with navigation between views
- **FR-007**: List-detail template MUST maintain accessibility for keyboard navigation between list items and detail content
- **FR-008**: List-detail template MUST support independent state management for list area and detail area (e.g., list loaded but detail loading)
- **FR-009**: List-detail template MUST provide selection state indication in list area

#### Wizard Template

- **FR-010**: Wizard template MUST provide structural components: step indicator, content area, and navigation controls (previous/next buttons)
- **FR-011**: Wizard template MUST expose step navigation interface with current step index, next/previous handlers, and onStepChange callback
- **FR-012**: Wizard template MUST NOT implement validation logic, form state management, or data persistence
- **FR-013**: Wizard template MUST handle button disabled states based on consumer-provided flags (e.g., nextDisabled, previousDisabled)
- **FR-014**: Wizard template MUST manage focus appropriately during step transitions (focus step content on navigation)
- **FR-015**: Wizard step indicator MUST show current step, completed steps, and upcoming steps with appropriate visual distinction

#### Settings Template

- **FR-016**: Settings template MUST provide section navigation (sidebar on desktop, tabs/dropdown on mobile) and content area for active section
- **FR-017**: Settings template MUST support deep linking via activeSection prop to initialize on specific section
- **FR-018**: Settings template MUST adapt section navigation layout according to F06 responsive breakpoints
- **FR-019**: Settings template MUST provide optional unsaved changes indicator mechanism

#### State Management (All Templates)

- **FR-020**: All templates MUST provide default UI for these page states: loading, empty, error, permission-denied
- **FR-021**: All templates MAY provide optional state UI for: partial-data, offline, retry
- **FR-022**: All templates MUST allow per-state override via slots or render props while maintaining template structure
- **FR-023**: Default state UI MUST be built entirely from F01 design system components
- **FR-024**: Default state UI MUST be centrally managed with minimal, consistent copy and illustrations to encourage downstream overrides only when necessary
- **FR-025**: Templates MUST render semantic HTML landmarks (main, nav, region with aria-labels) for accessibility

#### Composition & Integration

- **FR-026**: All templates MUST compose F01 design system components without duplicating primitives
- **FR-027**: All templates MUST integrate with F06 layout system for responsive behavior and app shell placement
- **FR-028**: Templates MUST provide clear slots/extension points for integrating F03 context switcher, F04 notifications, and F05 resource indicators where applicable
- **FR-029**: Templates MUST remain unbranded (no product-specific colors, logos, copy, or domain logic)
- **FR-030**: Templates MUST support multiple data-loading strategies (server-rendered, client-side, hybrid) without prescribing specific data-fetching mechanisms

#### Documentation & Examples

- **FR-031**: Each template MUST have Storybook stories demonstrating: basic usage, all state variations, slot/override usage, and responsive behavior
- **FR-032**: Each template MUST have documentation describing: available slots/props, expected content structure, accessibility features, and composition guidelines
- **FR-033**: Template package MUST include example implementations with dummy data showing intended usage patterns

#### Testing

- **FR-034**: Each template MUST have structural tests validating: correct layout regions render, responsive behavior at key breakpoints, semantic landmarks present
- **FR-035**: Each template MUST have behavior tests validating: state transitions render correctly, navigation patterns work (wizard steps, list selection), keyboard accessibility
- **FR-036**: Wizard template MUST have tests validating: step navigation (forward/back), disabled state handling, focus management, step indicator updates
- **FR-037**: List-detail template MUST have tests validating: selection state, mobile layout switching, independent area state management

### Key Entities *(not applicable)*

This feature provides UI templates only. No data models or backend entities are involved.

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented through slots, render props, and documentation

**Notes**: Templates are explicitly designed to be domain-agnostic scaffolding. All product-specific content comes through props/slots.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: templates compose F01 primitives and integrate with F06 layouts
- [x] No circular dependencies introduced (templates depend on F01 and F06, not vice versa)
- [x] Extension points are stable and documented through TypeScript interfaces and Storybook

**Notes**: This is a frontend-only package. Clear dependency flow: Templates → F06 → F01.

### Code Quality (Principle III)
- [x] TypeScript 5.x with strict mode will be used for all template code
- [x] Type hints for all public APIs (props, slots, callbacks)
- [x] Code will be formatted with Prettier and linted with ESLint

**Notes**: Follows established frontend conventions from F01/F06/F07.

### Testing (Principle IV)
- [x] Test plan includes Vitest + React Testing Library for component structure and behavior
- [x] Coverage target: 80%+ for template components, 100% for navigation logic (wizard steps)
- [x] Integration tests planned for template composition and state transitions

**Notes**: Visual regression testing via Chromatic for template structure validation.

### Security & Privacy (Principle V)
- [x] Templates render user-provided content safely (no dangerouslySetInnerHTML in template internals)
- [x] No data persistence or storage in templates (stateless structure components)
- [x] XSS protection through React's default escaping

**Notes**: Templates are presentation-only. Security concerns are handled by consuming applications.

### Performance & Reliability (Principle VI)
- [x] No data fetching logic in templates (consumers provide data)
- [x] Responsive layouts use CSS Grid/Flexbox, no runtime layout calculations
- [x] State transitions are synchronous UI updates (no async dependencies)
- [x] Graceful degradation: templates render with minimal props, enhance with additional features

**Notes**: Template bundle size target: <15KB gzipped for core templates package.

### API Design (Principle VII)
- [x] Template props follow consistent naming conventions across all templates
- [x] State prop uses union type for type-safe state handling
- [x] Slots/render props use consistent patterns (e.g., renderEmpty, renderError)
- [x] Breaking changes will use semver major version bumps

**Notes**: Frontend API design applies. Templates export TypeScript types for all public APIs.

### Documentation (Principle XI)
- [x] Storybook documentation for each template with interactive examples
- [x] README with quick start, props reference, and composition guidelines
- [x] Migration guide planned if templates replace existing patterns

**Notes**: Documentation integrated into Storybook as primary reference.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Frontend developers can scaffold a new dashboard, list-detail, settings, or wizard page in under 15 minutes using template examples
- **SC-002**: 90% of downstream pages using templates require zero custom state UI (default states are sufficient)
- **SC-003**: All templates meet WCAG 2.1 AA accessibility standards (semantic landmarks, keyboard navigation, focus management)
- **SC-004**: Template pages render correctly at 320px (mobile), 768px (tablet), and 1024px+ (desktop) breakpoints without horizontal scroll
- **SC-005**: Template bundle size is under 15KB gzipped for core package (dashboard, list-detail, settings, wizard)
- **SC-006**: 80% of template adoption requires no modification to default responsive behavior (F06 integration works out of box)
- **SC-007**: Wizard template supports flows from 2 to 10 steps without performance degradation (<100ms navigation transitions)
- **SC-008**: Each template has Storybook documentation with minimum 5 interactive examples (basic, states, customization, responsive, accessibility)

### Qualitative Outcomes

- **SC-009**: Design review confirms consistent information hierarchy across all template types
- **SC-010**: Frontend team feedback indicates templates reduce decision fatigue during page creation
- **SC-011**: Accessibility audit confirms proper focus management, semantic HTML, and screen reader compatibility
- **SC-012**: Downstream product teams confirm templates integrate cleanly with existing F03/F04/F05 features

## Out of Scope *(mandatory)*

- Complex analytics dashboards with charting libraries, advanced visualizations, or KPI widgets (templates provide grid structure, not dashboard logic)
- Form validation, data persistence, or state management for wizard steps (consumer responsibility)
- CRUD operations or data mutation logic for any template (templates are presentation-only)
- Hard dependency on specific routing library (templates support router-agnostic integration patterns)
- Product-specific workflows, domain models, or business logic embedded in templates
- Template theming beyond what F07 theme system provides (templates use semantic tokens, not custom styling)
- Advanced dashboard features: widget drag-and-drop, user-customizable layouts, widget sizing controls, layout persistence
- Full-featured data tables or list components (list-detail template provides layout, consumers provide list implementation)
- Built-in pagination, filtering, or sorting logic (consumers provide these features, templates provide structure)

## Assumptions *(mandatory)*

- F01 design system provides all necessary primitive components for building default state UI (loading spinners, empty state illustrations, error messages, buttons)
- F06 layout system provides responsive breakpoint definitions and app shell integration that templates can compose
- F03 context switcher, F04 notifications, and F05 resource indicators are designed to integrate with page template structure without template-specific coupling
- Downstream applications using templates will primarily use React 18+ (templates are React components)
- TypeScript is available in consuming applications for type-safe template usage
- Storybook is acceptable as primary documentation and example platform
- Consuming applications handle data fetching, state management, and business logic independently of templates
- Default state UI copy and illustrations are intentionally generic (e.g., "No data available", "Loading...") to encourage meaningful overrides
- Templates do not need to support legacy browsers below evergreen Chrome/Firefox/Safari/Edge
- Accessibility requirements are WCAG 2.1 AA (not AAA) for this release
- Performance target of <15KB gzipped is achievable by composing existing F01/F06 components rather than introducing new dependencies

## Dependencies *(mandatory)*

### Internal Dependencies

- **F01 Design System** (CRITICAL): Templates compose F01 primitive components (buttons, cards, headings, spacing tokens, loading indicators, empty state illustrations)
- **F06 Layouts & App Shell** (CRITICAL): Templates integrate with F06 responsive layout system and app shell structure
- **F07 Theme System** (RECOMMENDED): Templates use semantic theme tokens for colors and spacing to ensure theme compatibility
- **F03 Multi-Tenancy Context** (OPTIONAL): Templates provide designated slots for context switcher placement in page headers where applicable
- **F04 Notifications Hub** (OPTIONAL): Templates integrate with notification system for feedback (e.g., wizard completion, settings save)
- **F05 Resource Display & Alerts** (OPTIONAL): Templates may include resource indicators in appropriate regions (dashboard widgets, list items)

### External Dependencies

- **React 18.x+**: Template components are React-based
- **TypeScript 5.x**: All templates are written in TypeScript with strict mode
- **Vite**: Build tooling for template package
- **Vitest + React Testing Library**: Testing framework for component tests
- **Storybook 8.x**: Documentation and interactive examples
- **Chromatic** (OPTIONAL): Visual regression testing for template structure

### Assumptions About Dependencies

- F01 components are stable and provide necessary primitives for state UI (loading, empty, error components)
- F06 layout breakpoints are finalized and won't change frequently
- Templates can safely import from F01 and F06 without causing circular dependencies
- Storybook is already configured for the monorepo and can host template documentation

## Open Questions *(optional)*

None. All clarifications were resolved during discovery:
- Dashboard template is structure-only (no widget management)
- Wizard template includes basic navigation patterns but no validation/persistence
- Templates provide default state UI with override capability (hybrid approach)
- Default state UI is centrally managed and intentionally minimal to encourage meaningful overrides

## Cross-References *(optional)*

### Related Features

- **F01 Design System (022-frontend-design-system)**: Source of all primitive components used in templates
- **F06 Layouts & App Shell**: Foundation for responsive behavior and page structure that templates build upon
- **F07 Theme Support**: Templates consume semantic theme tokens to ensure theme compatibility
- **F03 Multi-Tenancy Context**: Templates provide slots for context switcher in appropriate page regions
- **F04 Notifications Hub**: Templates integrate notification feedback for user actions (saves, completions)
- **F05 Resource Display & Alerts**: Templates may display resource states in dashboard widgets or list items

### Architecture Decision Records (Future)

Potential ADRs to document after implementation:
- **Template Slot API Design**: Rationale for slot vs render prop pattern choices
- **State Management Boundary**: Why templates avoid internal state and rely on consumer-provided state
- **Responsive Layout Strategy**: How templates compose F06 breakpoints vs custom responsive logic
- **Default State UI Centralization**: Trade-offs in providing opinionated defaults vs pure structural shells

## Risks & Mitigations *(optional)*

### Risk 1: Template Rigidity
**Description**: Templates may become too opinionated or rigid, limiting downstream customization
**Impact**: Medium - Could reduce adoption if templates don't fit diverse use cases
**Mitigation**:
- Design templates with multiple extension points (slots for every major region)
- Provide examples showing various customization approaches in Storybook
- Gather early feedback from 2-3 downstream product teams during implementation

### Risk 2: F01/F06 Instability
**Description**: If F01 or F06 APIs change frequently, templates require constant updates
**Impact**: Medium - Maintenance burden and potential breakage for consumers
**Mitigation**:
- Coordinate with F01/F06 maintainers to ensure stable APIs before templates release
- Use semantic versioning strictly - only update for breaking changes
- Document template version compatibility with F01/F06 versions

### Risk 3: Performance Overhead
**Description**: Deeply nested template composition could impact bundle size or runtime performance
**Impact**: Low - Templates are lightweight wrappers around F01 components
**Mitigation**:
- Set and monitor bundle size budget (<15KB gzipped)
- Use code splitting if individual templates are large
- Benchmark template rendering performance (target <100ms for any template render)

### Risk 4: Accessibility Gaps
**Description**: Templates may introduce accessibility issues if not properly tested across patterns
**Impact**: High - Could block adoption for products with accessibility requirements
**Mitigation**:
- Include accessibility requirements in FR-025 (semantic landmarks, keyboard nav, focus management)
- Test with screen readers (NVDA, VoiceOver) during implementation
- Run automated accessibility tests (axe-core) in CI pipeline
- Include accessibility audit as part of SC-011 success criteria

### Risk 5: Documentation Insufficiency
**Description**: If template usage isn't clearly documented, developers may misuse or avoid templates
**Impact**: Medium - Reduces adoption and leads to inconsistent implementations
**Mitigation**:
- Prioritize Storybook documentation with extensive examples (FR-031, FR-032)
- Include "how to customize" guide for each state override mechanism
- Record short video walkthroughs for complex patterns (wizard, list-detail navigation)
- Gather documentation feedback during early adopter phase

## Notes *(optional)*

### Implementation Priorities

1. **Phase 1 - Foundation**: Implement dashboard and list-detail templates first (P1 user stories) to validate composition model with F01/F06 and establish state management patterns
2. **Phase 2 - Stateful Patterns**: Add wizard and settings templates (P2 user stories) to validate navigation and section management
3. **Phase 3 - Refinement**: Complete state override mechanism across all templates (P3 user story) and finalize documentation

### Design Principles

Templates follow these core design principles:
- **Structure over logic**: Templates provide layout and composition, not behavior or data management
- **Composition over configuration**: Templates compose F01 primitives rather than exposing configuration APIs for every layout detail
- **Sensible defaults, easy overrides**: Default state UI handles 80% of cases, slots enable the remaining 20%
- **Accessibility by default**: Semantic HTML, keyboard navigation, and focus management built into every template
- **Responsive without effort**: F06 integration means templates "just work" across breakpoints

### Naming Conventions

Template package and exports:
- Package name: `@django-core/page-templates`
- Template exports: `DashboardTemplate`, `ListDetailTemplate`, `WizardTemplate`, `SettingsTemplate`
- Prop types: `DashboardTemplateProps`, `WizardStepConfig`, etc.
- State type: `PageState` (union of 'loading' | 'empty' | 'error' | 'permission-denied' | 'partial-data' | 'offline' | 'ready')

### Future Enhancements (Post-MVP)

Potential additions after initial release:
- Additional templates: profile page, onboarding flow, search results page
- Enhanced wizard: progress persistence, step validation helpers (still consumer-managed but with utility functions)
- Dashboard enhancements: basic widget grid layout helpers (still no drag-and-drop, but responsive grid utilities)
- Template composition guide: patterns for nesting templates (e.g., wizard where each step is a list-detail view)
- Internationalization: ensure templates work with RTL layouts and multi-language content

### Success Metrics Collection

Post-release, track these metrics to validate success criteria:
- Time-to-first-page: Measure how long it takes developers to create their first template-based page
- Override frequency: Track how often each state is overridden vs using defaults (target: <10% override rate)
- Template adoption rate: Percentage of new pages using templates vs custom layout (target: >60% after 3 months)
- Support tickets: Monitor template-related questions and issues (target: <5 tickets per month after stabilization)
- Bundle size: Track template package size in production builds (enforce <15KB gzipped in CI)
