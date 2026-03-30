# F01: Frontend Design System

**Phase:** 6
**Status:** ✅ Done
**Module ID:** 022
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 22. F01 – Frontend Design System

**Doel**: Shared design tokens, components en guidelines voor consistent UIs.

**Status**: ✅ Complete

**Key Features**:
- Design tokens (colors, typography, spacing, breakpoints)
- vanilla-extract styling (zero-runtime CSS)
- Component library (React + TypeScript)
- Storybook documentation
- Chromatic visual regression tests
- Accessibility compliance (WCAG 2.1 AA)
- Responsive design patterns

**Package**: `@django-core/design-system`

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

﻿# Feature Specification: Frontend Design System Foundation
*Path: [kitty-specs/022-frontend-design-system/spec.md](../../../../kitty-specs/022-frontend-design-system/spec.md)*

**Feature Branch**: `022-frontend-design-system`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "F01-frontend-design-system  An agnostic design system providing design tokens, core UI components, theming and motion/interaction foundations that can be reused across multiple products without embedding product-specific branding."

## Overview

F01-frontend-design-system establishes a reusable, product-agnostic design system that provides:

1. **Design Tokens**  A canonical JSON/TypeScript source defining color, typography, spacing, radius, shadows, z-index, breakpoints, and motion values, with generation pipelines for CSS custom properties and TypeScript types.

2. **Core UI Components (~15)**  A foundational component library built in React/TypeScript: Button, Input, Textarea, Checkbox/Radio, Form primitives, Card, Alert, Typography, Layout primitives (Stack, Grid, Container), Modal/Dialog, Dropdown/Select, Tabs, Tooltip, Badge, and Spinner/Loader.

3. **Theming Infrastructure**  Light and dark theme support with extension hooks for downstream brand themes.

4. **Interaction & Motion Patterns**  Documented focus states, hover, pressed, loading, and transition behaviors for consistent UX.

5. **Documentation & Testing**  Storybook-based component documentation with visual regression testing (Chromatic or similar) for core components, plus unit tests for logic and accessibility.

The design system integrates with B14 Web UI Baseline without imposing product-specific branding and follows B21-style documentation patterns.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build Screens Faster with Standard Components (Priority: P1)

As a **frontend developer**, I want to use pre-built, well-documented UI components so that I can build application screens faster without reimplementing common patterns.

**Why this priority**: This is the core value proposition  developers need working components to build features. Without this, the design system has no utility.

**Independent Test**: Can be fully tested by importing components into a sample page and verifying they render correctly with expected props, styling, and behavior.

**Acceptance Scenarios**:

1. **Given** a developer imports the Button component, **When** they render it with a label and onClick handler, **Then** the button displays correctly with proper styling and responds to clicks.
2. **Given** a developer imports layout primitives (Stack, Grid, Container), **When** they compose a page layout, **Then** the layout renders with correct spacing and responsive behavior.
3. **Given** a developer uses form components (Input, Checkbox, Select), **When** they build a form, **Then** all inputs accept user interaction and expose controlled/uncontrolled patterns.

---

### User Story 2 - Apply Design Tokens for Consistent Styling (Priority: P1)

As a **frontend developer**, I want to access design tokens as CSS variables and TypeScript constants so that I can apply consistent colors, typography, spacing, and motion without hardcoding values.

**Why this priority**: Tokens are the foundation that makes components and themes consistent. This must exist before theming can work.

**Independent Test**: Can be tested by verifying that CSS custom properties are generated from the token source and that TypeScript imports resolve correctly with proper types.

**Acceptance Scenarios**:

1. **Given** the design token source file, **When** the build runs, **Then** CSS custom properties are generated and available in the stylesheet.
2. **Given** a developer imports spacing tokens in TypeScript, **When** they use them in styled-components or inline styles, **Then** the values match the token definitions.
3. **Given** motion tokens are defined, **When** a developer applies them to transitions, **Then** the timing and easing match the documented patterns.

---

### User Story 3 - Switch Between Light and Dark Themes (Priority: P2)

As a **product team**, I want built-in light and dark theme support so that users can choose their preferred appearance without custom styling work.

**Why this priority**: Theme switching is a common user expectation. This enables products to offer appearance preferences immediately.

**Independent Test**: Can be tested by toggling a theme context and verifying that all components update their colors correctly without flicker or layout shift.

**Acceptance Scenarios**:

1. **Given** the application uses the design system, **When** the user or system switches to dark mode, **Then** all components render with dark theme colors.
2. **Given** dark mode is active, **When** a developer inspects CSS variables, **Then** the values reflect dark theme token overrides.
3. **Given** reduced motion is preferred by the user, **When** components animate, **Then** transitions are minimized or disabled.

---

### User Story 4 - Apply a Custom Brand Theme (Priority: P2)

As a **product team**, I want to apply my own brand colors and typography on top of the core design system so that my product has a distinct identity without rewriting components.

**Why this priority**: Downstream products need brand differentiation. This enables reuse across multiple products with different branding.

**Independent Test**: Can be tested by providing a custom theme configuration and verifying that components render with brand colors while maintaining structure and behavior.

**Acceptance Scenarios**:

1. **Given** a product defines a custom brand theme, **When** they wrap the app in a theme provider, **Then** components use the brand colors and typography.
2. **Given** a brand theme extends the base tokens, **When** the theme is applied, **Then** unspecified tokens fall back to the default values.
3. **Given** a brand theme is applied, **When** dark mode is toggled, **Then** the brand theme respects dark mode overrides if defined.

---

### User Story 5 - Verify Accessibility Compliance (Priority: P2)

As an **accessibility reviewer**, I want clear documentation of focus states, contrast ratios, and keyboard navigation so that I can verify the design system meets accessibility standards.

**Why this priority**: Accessibility is a non-negotiable quality attribute. Early investment prevents costly retrofitting.

**Independent Test**: Can be tested by running automated accessibility tools (axe, Lighthouse) against Storybook stories and verifying all components pass WCAG 2.1 AA checks.

**Acceptance Scenarios**:

1. **Given** any interactive component, **When** it receives keyboard focus, **Then** a visible focus indicator appears meeting WCAG contrast requirements.
2. **Given** color combinations in tokens, **When** checked against WCAG contrast standards, **Then** all text/background pairs meet 4.5:1 (normal text) or 3:1 (large text) ratios.
3. **Given** a user navigates with keyboard only, **When** they interact with Modal, Dropdown, or Tabs, **Then** focus is trapped appropriately and escape/enter keys work as expected.

---

### User Story 6 - Integrate Design System into Existing React App (Priority: P3)

As a **downstream app team**, I want to install the design system as a package and integrate it into my existing React setup so that I can adopt components incrementally.

**Why this priority**: Adoption ease determines real-world usage. This enables gradual migration rather than big-bang rewrites.

**Independent Test**: Can be tested by installing the package in a fresh React app and rendering a component without additional configuration.

**Acceptance Scenarios**:

1. **Given** a React application, **When** a developer installs the design system package, **Then** they can import and render components with minimal setup.
2. **Given** an app with existing styles, **When** design system components are added, **Then** they do not conflict with or override unrelated styles.
3. **Given** tree-shaking is enabled, **When** only Button is imported, **Then** unused components are not included in the bundle.

---

### User Story 7 - Understand Relationship to Backend Layout (Priority: P3)

As a **documentation consumer**, I want clear guidance on how F01 relates to B14 Web UI Baseline and B21 example apps so that I understand where to use each.

**Why this priority**: Clear boundaries prevent confusion and misuse. This ensures teams know when to use which system.

**Independent Test**: Can be tested by reviewing documentation and verifying that integration patterns are documented with working examples.

**Acceptance Scenarios**:

1. **Given** a developer reads the F01 documentation, **When** they look for B14 integration, **Then** they find clear guidance on how components work with Django templates.
2. **Given** example apps exist in B21, **When** they reference F01 components, **Then** the usage patterns are consistent with F01 documentation.
3. **Given** a developer is unsure whether to use F01 or B14 for a task, **When** they consult the docs, **Then** a decision guide helps them choose.

---

### User Story 8 - Review Components in Storybook (Priority: P3)

As a **product designer**, I want to browse all components in Storybook with interactive examples so that I can review look-and-feel and motion patterns before development.

**Why this priority**: Designer-developer collaboration improves with shared tooling. Storybook bridges the design-code gap.

**Independent Test**: Can be tested by opening Storybook and verifying all components have stories with controls, variants, and documentation.

**Acceptance Scenarios**:

1. **Given** Storybook is running, **When** a designer browses components, **Then** each component has at least one story demonstrating its default state.
2. **Given** a component has variants (e.g., Button sizes, Alert types), **When** viewing its story, **Then** all variants are demonstrated with controls.
3. **Given** motion patterns are documented, **When** a designer views interactive states, **Then** hover, focus, and loading animations are visible.

---

### Edge Cases

- What happens when a theme provides invalid or missing token values?  System falls back to default tokens and logs a warning.
- How does the system handle right-to-left (RTL) languages?  Layout primitives support logical properties (start/end vs left/right); full RTL is documented but optional for F01.
- What happens when a component is used outside a theme provider?  Components render with default light theme; a console warning encourages proper provider usage.
- How are focus states handled on touch devices?  Touch devices skip hover states; focus-visible is used to show focus only on keyboard navigation.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Design Tokens

- **FR-001**: System MUST define design tokens in a canonical TypeScript source file using vanilla-extract, covering: colors (semantic + palette), typography (font family, sizes, weights, line heights), spacing scale, border radius, shadows, z-index layers, breakpoints, and motion (duration, easing).
- **FR-002**: System MUST generate static CSS with CSS custom properties from vanilla-extract theme contracts, producing zero-runtime stylesheets.
- **FR-003**: System MUST expose tokens as type-safe TypeScript values that can be consumed directly in vanilla-extract styles.
- **FR-004**: System MUST support token overrides for theming via vanilla-extract theme contracts without modifying the source definitions.

#### Theming

- **FR-005**: System MUST provide a theme provider component that applies vanilla-extract theme contracts via CSS custom properties, enabling interoperability with plain CSS.
- **FR-006**: System MUST include built-in light and dark themes as vanilla-extract theme variants with complete token coverage.
- **FR-007**: System MUST allow downstream products to define custom brand themes by extending vanilla-extract theme contracts.
- **FR-008**: System MUST respect user's `prefers-color-scheme` preference when no explicit theme is set.
- **FR-009**: System MUST respect user's `prefers-reduced-motion` preference and reduce or disable animations accordingly.

#### Core Components

- **FR-010**: System MUST provide the following core components: Button, Input, Textarea, Checkbox, Radio, Card, Alert. Form validation patterns MUST be documented but are NOT implemented as a component (validation is application responsibility).
- **FR-011**: System MUST provide typography components: Text, Heading (with semantic levels).
- **FR-012**: System MUST provide layout primitives: Stack (vertical/horizontal), Grid, Container.
- **FR-013**: System MUST provide interaction components: Modal/Dialog, Dropdown/Select, Tabs, Tooltip, Badge, Spinner/Loader.
- **FR-014**: All components MUST accept standard HTML attributes and forward refs appropriately.
- **FR-015**: All components MUST be keyboard accessible and include appropriate ARIA attributes.
- **FR-016**: All interactive components MUST display visible focus indicators meeting WCAG 2.1 AA requirements.

#### Interaction & Motion

- **FR-017**: System MUST document interaction states (default, hover, focus, active, disabled, loading) for each interactive component.
- **FR-018**: System MUST define motion tokens for transitions (duration-fast, duration-normal, duration-slow, easing curves).
- **FR-019**: Components MUST use motion tokens consistently for state transitions and micro-interactions.

#### Documentation & Testing

- **FR-020**: System MUST include Storybook configuration with stories for all components.
- **FR-021**: System MUST include unit tests for component logic and accessibility (using jest, testing-library, and axe-core).
- **FR-022**: System MUST include visual regression tests for core components (Button, Input, Card, Alert, Modal) using Chromatic or similar.
- **FR-023**: System MUST include Markdown documentation following B21 patterns with usage examples, props tables, and integration guides.

#### Integration

- **FR-024**: System MUST be structured as a workspace package at `packages/design-system/` within the Django-core monorepo, installable via npm/yarn workspace linking for downstream React applications.
- **FR-025**: System MUST support tree-shaking so unused components are excluded from production bundles.
- **FR-026**: System MUST export a standalone CSS file containing all design tokens as CSS custom properties, consumable by B14 Web UI Baseline Django templates without requiring React.
- **FR-027**: System MUST document how B14 templates can use F01 token variables (colors, spacing, typography) for visual consistency with React-based UIs.

### Key Entities

- **Token**: A design decision (color, spacing, etc.) with a name, value, and category. Tokens are the source of truth for all styling.
- **Theme**: A named collection of token overrides (e.g., "light", "dark", "brand-acme"). Themes extend the base token set.
- **Component**: A reusable UI building block with defined props, states, and accessibility behavior. Components consume tokens for styling.
- **Story**: A Storybook artifact demonstrating a component's states and variants. Stories serve as living documentation.

---

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

*Note*: The design system explicitly excludes product branding. Brand themes are applied downstream, not embedded.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

*Note*: This is a frontend package, but follows modular principles with tokens  themes  components layering.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (N/A for frontend, but build scripts follow conventions)
- [x] Type hints will be used in core modules (TypeScript strict mode)
- [x] Code will be formatted with Black and linted with Ruff (ESLint/Prettier for frontend)

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests (Jest + Testing Library for frontend)
- [x] Coverage targets defined (80% coverage for component logic)
- [x] Integration tests planned for key flows (Storybook interaction tests)

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained (N/A for frontend-only)
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms (N/A  UI only)
- [x] No sensitive data will be logged

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (N/A for frontend)
- [x] Pagination implemented for unbounded responses (N/A)
- [x] Structured logging and metrics hooks included (console warnings for dev mode)
- [x] Graceful degradation strategy defined for failure scenarios (fallback to default tokens)

### API Design (Principle VII)
- [x] DRF standards followed (N/A  component API follows React conventions)
- [x] API responses are consistent and documented (component props are typed and documented)
- [x] Breaking changes use versioning or deprecation paths (semantic versioning for package)
- [x] Validation occurs at boundary (serializers/forms) (prop validation via TypeScript + runtime checks)

### Documentation (Principle XI)
- [x] Feature documentation plan included (Storybook + Markdown docs)
- [x] Extension guide updates identified if applicable (theming guide, B14 integration guide)
- [x] ADR planned if major architectural decision involved (token format decision, framework choice)

**Violations Requiring Justification**: None  this is a frontend feature that follows adapted versions of backend principles.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can render any core component with correct styling in under 5 minutes after package installation.
- **SC-002**: All 15 core components pass automated accessibility checks (axe-core) with zero critical violations.
- **SC-003**: Light and dark themes switch without visible flicker or layout shift.
- **SC-004**: Downstream products can apply a custom brand theme by configuring fewer than 20 token overrides.
- **SC-005**: Visual regression tests catch unintended styling changes with 95% accuracy (no false negatives on intentional changes after baseline update).
- **SC-006**: Storybook documentation covers 100% of components with at least one interactive example each.
- **SC-007**: Tree-shaking reduces bundle size by at least 60% when only 3 components are imported (compared to importing the full library).
- **SC-008**: 80% of component logic is covered by unit tests.

---

## Assumptions

1. **React/TypeScript as reference implementation**: While concepts are framework-agnostic, the initial implementation targets React 18+ with TypeScript 5+.
2. **Modern browser support**: Components target browsers supporting CSS custom properties, CSS Grid, and ES2020+ (no IE11).
3. **No SSR complexity in F01**: Server-side rendering compatibility is desirable but not a primary requirement for F01.
4. **Storybook 7+ or 8+**: Visual regression uses Storybook's modern architecture.
5. **Chromatic or equivalent**: Visual regression service assumed; alternative (Percy, Playwright visual) acceptable.

---

## Out of Scope

- Data tables, charts, rich text editors, file uploaders, complex form builders
- Product-specific branding or marketing visuals
- Full visual regression coverage for every future component (core only for F01)
- Design tool integrations (Figma plugins, Style Dictionary exports) — optional enhancement, not required
- Server-side rendering optimization
- Internationalization of component labels (components accept children/labels; i18n is app responsibility)
- React islands or hydration into Django templates — B14 integration is via shared CSS tokens only

---

## Clarifications

### Session 2025-12-05

- Q: Where should the F01 design system package be located? → A: Workspace package inside Django-core monorepo (`packages/design-system/`)
- Q: What styling approach should F01 components use? → A: vanilla-extract (zero-runtime CSS-in-TS with type-safe tokens, theme contracts mapped to CSS custom properties)
- Q: How should F01 components integrate with B14 Django templates? → A: Shared tokens only — B14 consumes F01 CSS custom properties for visual consistency, no React islands

---

## Open Questions for Planning Phase

1. ~~**Monorepo structure**: Should the design system live in a separate repository or as a workspace package within Django-core?~~ → Resolved: `packages/design-system/` in monorepo
2. ~~**CSS-in-JS vs CSS Modules**: Final decision on styling approach (styled-components, Emotion, vanilla-extract, or CSS Modules)?~~ → Resolved: vanilla-extract (zero-runtime, type-safe)
3. **Build tooling**: Vite, tsup, or Rollup for package bundling?
4. **Chromatic pricing/alternatives**: Confirm visual regression service and CI integration approach.
5. ~~**B14 integration depth**: How tightly should F01 components integrate with Django template rendering (Django Components, Jinja2, or React islands)?~~ → Resolved: Shared tokens only (CSS custom properties), no React islands
