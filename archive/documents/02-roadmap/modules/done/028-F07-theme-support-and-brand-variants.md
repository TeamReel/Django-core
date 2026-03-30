# F07: Theme Support & Brand Variants

**Phase:** 7
**Status:** ✅ Done
**Module ID:** 028
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 28. F07 – Theme Support & Brand Variants

**Doel**: Light/dark modes, brand variants, theme persistence.

**Status**: ✅ Complete

**Key Features**:
- Light and dark mode themes
- Brand variant system (color overrides)
- Theme switching UI component
- SSR-compatible (boot script prevents flash)
- Theme persistence (cookie → localStorage → B12)
- WCAG 2.1 AA contrast validation (build-time)
- vanilla-extract theme contracts

**Package**: `@django-core/theme-system`

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Theme Support & Brand Variants
*Path: [kitty-specs/028-theme-support-brand/spec.md](../../../../kitty-specs/028-theme-support-brand/spec.md)*

**Feature Branch**: `028-theme-support-brand`
**Created**: 2025-12-13
**Status**: Draft
**Input**: User description: "F07 provides token-driven theming infrastructure that enables light/dark modes and extensible brand variants on top of F01's design system, ensuring consistent user experiences across products while maintaining accessibility standards."

## Overview

F07 Theme Support establishes a token-driven theming foundation for the Django Core-App frontend, enabling light/dark modes and extensible brand variants while maintaining WCAG 2.1 AA accessibility standards. This infrastructure feature builds upon F01's design system by introducing a semantic token layer that maps to F01 primitives, allowing products to customize their visual identity without forking core components.

The feature provides headless theming infrastructure (ThemeProvider, hooks, semantic tokens) alongside an optional convenience component for theme switching, supporting both client-side and server-side rendering scenarios with no visual "flash" on initial page load.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - End User Theme Selection (Priority: P1)

As an end user, I want to switch between light and dark mode so that the application adapts to my visual preferences and environment (e.g., low-light conditions).

**Why this priority**: Core user experience feature that directly impacts accessibility and user comfort. Users increasingly expect theme control in modern web applications.

**Independent Test**: Can be fully tested by toggling theme in UI (or via system preference) and verifying persistence across page refreshes without requiring any other features to be complete.

**Acceptance Scenarios**:

1. **Given** I am viewing the application with no theme preference set, **When** the application loads, **Then** it applies the light theme by default and respects my system preference if `prefers-color-scheme` is set to dark
2. **Given** I have selected dark mode via the theme toggle, **When** I refresh the page, **Then** dark mode persists without a visible flash of light theme during page load
3. **Given** I am using the application, **When** I toggle between light and dark modes, **Then** the transition is smooth (respects `prefers-reduced-motion`), all text remains readable with proper contrast, and interactive elements remain clearly distinguishable
4. **Given** I have selected a theme preference, **When** I log out and back in, **Then** my theme preference is restored from user settings (if B12 integration is configured)

---

### User Story 2 - Product Team Brand Customization (Priority: P2)

As a product team owner, I want to apply our brand colors and typography to the core UI components without modifying component code, so we can maintain visual brand consistency while using the shared component library.

**Why this priority**: Enables product differentiation while keeping components centralized. Critical for multi-product platform strategy but can be implemented after base light/dark theme infrastructure is working.

**Independent Test**: Can be tested by defining a custom brand token set, registering it with ThemeProvider, and verifying that F01/F05/F06 components automatically adopt the brand colors without code changes.

**Acceptance Scenarios**:

1. **Given** I define a brand variant with custom accent colors, **When** I activate that brand theme, **Then** all primary buttons, links, and accent elements use my brand colors while preserving base light/dark background and text tokens
2. **Given** I need extensive brand customization beyond accent colors, **When** I provide a full token override for my brand, **Then** the theme system applies my complete token set instead of using inheritance from base themes
3. **Given** I have defined a brand theme, **When** developers build new features using F01 components, **Then** those components automatically adopt the brand theme without requiring brand-specific code paths

---

### User Story 3 - Developer Theme Integration (Priority: P2)

As a frontend developer, I want to build new pages and components that automatically respect the active theme without manually passing theme props through every component, so I can focus on feature development rather than theme plumbing.

**Why this priority**: Developer experience feature that reduces friction and ensures consistency. Important for maintaining velocity as the platform grows, but depends on P1 theme infrastructure being complete.

**Independent Test**: Can be tested by creating a new component using semantic theme tokens, rendering it under different theme contexts, and verifying it adapts correctly without theme-specific code.

**Acceptance Scenarios**:

1. **Given** I am building a new component, **When** I use semantic theme tokens (e.g., `background.surface`, `text.primary`) from F07, **Then** my component automatically adapts to light/dark/brand themes without theme-specific logic
2. **Given** I need to access the current theme programmatically, **When** I use the `useTheme()` hook, **Then** I receive the current theme configuration (mode, brand) and can conditionally render or apply logic based on theme state
3. **Given** I am rendering content server-side, **When** I use F07's SSR utilities, **Then** the correct theme is applied during HTML generation based on the user's cookie/session preference

---

### User Story 4 - Accessibility Owner Compliance Validation (Priority: P1)

As an accessibility owner, I want all core themes to meet WCAG 2.1 AA contrast requirements and for custom brand themes to have clear validation guidance, so we ensure the platform remains accessible to users with visual impairments.

**Why this priority**: Legal and ethical requirement for accessibility compliance. Must be part of core infrastructure from the start, not bolted on later. Tied to P1 because base themes must be compliant before any features ship.

**Independent Test**: Can be tested by running contrast validation tooling against core themes in CI and verifying failures when non-compliant token combinations are introduced.

**Acceptance Scenarios**:

1. **Given** the light and dark default themes are defined, **When** CI runs theme validation checks, **Then** all core text/background and text/surface combinations meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text and UI components)
2. **Given** a product team adds a custom brand theme, **When** they run the `validateThemeContrast()` utility in their tests, **Then** they receive specific warnings or errors for any token combinations that fail contrast requirements
3. **Given** I am developing with a custom theme active, **When** the ThemeProvider detects insufficient contrast in development mode, **Then** I see console warnings identifying the problematic token combinations
4. **Given** the application supports theme switching, **When** themes transition, **Then** motion effects respect `prefers-reduced-motion` system setting

---

### User Story 5 - SSR Theme Consistency (Priority: P2)

As a user visiting a server-rendered page, I want to see the correct theme immediately on page load without any visual flash or layout shift, so the experience feels instant and professional.

**Why this priority**: Quality-of-life improvement that significantly impacts perceived performance and polish. Depends on P1 theme infrastructure but can be refined after initial launch.

**Independent Test**: Can be tested by loading a page with theme cookie set, inspecting the initial HTML for correct theme class/variables, and verifying no flash occurs during React hydration.

**Acceptance Scenarios**:

1. **Given** I have previously selected dark mode (stored in cookie), **When** the server renders the page, **Then** the HTML includes dark theme classes/variables before JavaScript loads
2. **Given** I am on a slow network connection, **When** the page loads, **Then** the correct theme is visible even before React hydrates, and no theme switch or flash occurs when hydration completes
3. **Given** no theme preference is stored, **When** the page renders server-side, **Then** the server applies the default theme and optionally respects system preference if detectable from request headers

---

### Edge Cases

- **Theme cookie deleted**: If the theme cookie is deleted or expires but B12 preference exists, system should re-sync cookie from B12 on next load
- **B12 API unavailable**: If B12 preferences API fails or times out, system should fall back gracefully to localStorage, then cookie, then system preference, then default without blocking page render
- **Custom brand theme missing tokens**: If a brand theme provides incomplete token overrides, system should log warnings in development and fall back to base theme tokens for missing values
- **Contrast validation edge cases**: Custom brand colors might meet contrast ratios on light mode but fail on dark mode; validation should check all mode × brand combinations
- **Multiple theme changes during session**: Rapidly switching themes should debounce cookie/API updates to avoid excessive writes
- **Cross-tab synchronization**: Theme changes in one browser tab should be reflected in other tabs via storage events (localStorage sync)
- **SSR vs. client mismatch**: If server-rendered theme doesn't match client-resolved theme (rare), client should smoothly transition on hydration rather than causing layout shift
- **Legacy browser support**: Browsers without CSS custom property support should receive a functional fallback (either base theme with static CSS or graceful degradation)
- **Theme scope boundaries**: Components rendered in portals or shadow DOM should inherit theme context correctly

## Requirements *(mandatory)*

### Functional Requirements

#### Core Theming Infrastructure

- **FR-001**: System MUST provide a `ThemeProvider` component that establishes theme context for all descendant components
- **FR-002**: System MUST provide a `useTheme()` hook that returns current theme state (mode, brand) and theme manipulation functions
- **FR-003**: System MUST define semantic theme tokens organized by category: background (canvas, surface, overlay), text (primary, secondary, muted, disabled), border (subtle, default, strong), state (success, warning, error, info), and accent (primary, secondary)
- **FR-004**: System MUST support at minimum two modes: "light" and "dark"
- **FR-005**: System MUST support brand variants that can be applied independently of mode (e.g., `{mode: 'dark', brand: 'brandX'}`)

#### Theme Token Architecture

- **FR-006**: Semantic theme tokens MUST map to F01 primitive tokens (e.g., `text.primary` → `color.gray.900` in light mode, `color.gray.50` in dark mode)
- **FR-007**: Brand variants MUST support hierarchical inheritance by default, overriding only accent/brand-specific tokens while inheriting base mode tokens
- **FR-008**: Brand variants MUST support full token override as an escape hatch for advanced customization scenarios
- **FR-009**: Token resolution MUST merge brand tokens onto mode tokens in a predictable order: base primitives → mode tokens → brand tokens → brand overrides
- **FR-010**: System MUST expose theme tokens as CSS custom properties (e.g., `--theme-background-surface`) for use in component styles

#### Theme Persistence and Resolution

- **FR-011**: System MUST persist theme selection using a cookie (name: `django_core_theme`, path: `/`, SameSite: `Lax`) that contains the serialized theme state (mode + brand)
- **FR-012**: On initial load, system MUST resolve theme preference using this priority order: theme cookie → B12 user/org preference (if available) → system preference (`prefers-color-scheme`) → default theme (light/default)
- **FR-013**: When user changes theme, system MUST update the theme cookie immediately and persist to B12 preferences (if configured) and localStorage as a backup
- **FR-014**: System MUST support reading theme preference from B12 API endpoint `/api/preferences/theme` (if available) and fall back gracefully if endpoint is not implemented
- **FR-015**: System MUST provide a theme initialization utility (inline script or SSR helper) that applies theme class to HTML element before React hydrates, preventing visual flash

#### Optional Theme Toggle Component

- **FR-016**: System MUST provide an optional `<ThemeToggle />` component that renders a button/dropdown to switch between available themes
- **FR-017**: `<ThemeToggle />` component MUST be accessible (keyboard navigable, ARIA labeled, screen reader friendly)
- **FR-018**: `<ThemeToggle />` component MUST respect `prefers-reduced-motion` when transitioning between states
- **FR-019**: `<ThemeToggle />` component MUST support configuration props: `showLabel` (boolean), `position` (button position), `variants` (array of available mode/brand combinations)

#### Accessibility and Contrast Validation

- **FR-020**: All core themes (light/default, dark/default) MUST meet WCAG 2.1 AA contrast ratios: minimum 4.5:1 for normal text on background/surface, minimum 3:1 for large text (18pt+) and UI components
- **FR-021**: System MUST provide a build-time validation script that checks core theme token combinations and fails CI if contrast ratios are insufficient
- **FR-022**: System MUST provide a `validateThemeContrast(theme)` utility function that downstream products can use to validate custom brand themes in their own CI pipelines
- **FR-023**: In development mode, `ThemeProvider` MUST log console warnings when active theme has insufficient contrast for critical token pairs
- **FR-024**: Theme transitions MUST respect `prefers-reduced-motion` system setting by disabling or reducing animation when user has expressed motion sensitivity

#### Integration with F01/F06/F05

- **FR-025**: F07 semantic tokens MUST be consumable by existing F01 design system components without breaking changes
- **FR-026**: System MUST provide migration documentation for gradually updating F01 components from primitive tokens to semantic theme tokens
- **FR-027**: F06 core layouts MUST support an optional theme toggle slot where `<ThemeToggle />` can be inserted
- **FR-028**: F05 resource display components MUST use semantic theme tokens for state colors (success/warning/error) ensuring they adapt to theme changes

#### Documentation and Developer Experience

- **FR-029**: System MUST provide comprehensive documentation covering: theme architecture, token structure, adding new themes, SSR integration, accessibility guidelines, and migration path for existing components
- **FR-030**: System MUST provide Storybook stories demonstrating: all core components in light/dark modes, brand variant examples, theme switching behavior, and accessibility validation
- **FR-031**: System MUST provide TypeScript types for theme configuration, token maps, and hook return values
- **FR-032**: System MUST provide a quickstart guide showing how to integrate F07 into a new application in under 10 minutes

### Key Entities *(include if feature involves data)*

- **Theme Configuration**: Represents the active theme state
  - `mode`: String enum ("light" | "dark") - the base color mode
  - `brand`: String enum ("default" | custom brand names) - the brand variant
  - Serialized to/from cookie as JSON (e.g., `{"mode":"dark","brand":"default"}`)

- **Theme Token Map**: Defines the complete set of semantic tokens for a specific theme (mode × brand combination)
  - TypeScript type automatically generated from vanilla-extract theme contract (see data-model.md for complete structure definition)
  - `background`: Object with `canvas`, `surface`, `overlay` properties mapping to F01 color primitives
  - `text`: Object with `primary`, `secondary`, `muted`, `disabled` properties
  - `border`: Object with `subtle`, `default`, `strong` properties
  - `state`: Object with `success`, `warning`, `error`, `info` properties (each with foreground, background, border variants)
  - `accent`: Object with `primary`, `secondary` properties (plus shades like `primaryHover`, `primaryActive`)
  - Each property resolves to an F01 primitive token reference

- **Brand Variant Definition**: Configuration for a custom brand theme
  - `name`: Unique identifier for the brand (e.g., "brandX")
  - `tokens`: Partial or complete token map that overrides base theme tokens
  - `inheritance`: Boolean flag indicating whether to merge with base tokens (default: true) or replace completely (false)
  - Stored as TypeScript/JSON configuration files in product repos or F07 package

- **Theme Preference (B12 Integration)**: User or organization-level theme preference stored in backend
  - `user_id` or `org_id`: Foreign key to User or Organisation model
  - `theme_mode`: String ("light" | "dark" | "auto")
  - `theme_brand`: String (brand variant name, default: "default")
  - Synchronized via B12 preferences API endpoint

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: F07 is pure infrastructure—it defines a theming system and extension points (brand variants, token overrides) without prescribing specific product brands or themes. Products define their own brand token sets using the documented interfaces.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: F07 is a frontend-only package (`@django-core/theme-system`) that depends on F01 primitives but has no Django backend component. It integrates optionally with B12 via existing API client patterns. ThemeProvider/hooks establish clear boundaries; products extend via token configuration files.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (N/A - frontend-only feature)
- [x] Type hints will be used in core modules (TypeScript strict mode for all F07 code)
- [x] Code will be formatted with Black and linted with Ruff (Frontend: Prettier + ESLint following F01 conventions)

**Justification**: F07 follows existing frontend quality standards from F01/F05/F06: TypeScript strict mode, ESLint, Prettier, 100% type coverage for public APIs.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests (Frontend: Vitest + React Testing Library)
- [x] Coverage targets defined (>90% for theme resolution logic, hooks, and token validation utilities; 100% for critical paths like SSR flash prevention)
- [x] Integration tests planned for key flows (theme switching, persistence, SSR hydration, cross-tab sync, B12 integration)

**Justification**: Testing strategy mirrors F05 approach: unit tests for utilities/hooks, integration tests for ThemeProvider + persistence, visual regression tests via Chromatic for Storybook stories, accessibility tests via axe-core.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Justification**: Theme cookie is non-sensitive user preference data (SameSite: Lax, no Secure flag needed for localhost dev). B12 integration uses existing authenticated API client (no new auth mechanism). Theme preference is not PII. No secrets or credentials stored.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (N/A - frontend feature; theme resolution is local computation)
- [x] Pagination implemented for unbounded responses (N/A - no unbounded datasets)
- [x] Structured logging and metrics hooks included (console warnings in dev mode for contrast violations; production errors logged to existing frontend error tracking)
- [x] Graceful degradation strategy defined for failure scenarios (B12 API failure → localStorage → cookie → system preference → default; CSS custom property unsupported → static fallback CSS)

**Justification**: Theme switching uses CSS custom properties for performance (no re-renders of entire component tree). Token resolution is memoized. SSR inline script is minimal (<1KB). B12 API calls are non-blocking with clear fallback chain.

### API Design (Principle VII)
- [x] DRF standards followed (N/A - frontend package; B12 integration uses existing REST endpoints)
- [x] API responses are consistent and documented (Frontend API: ThemeProvider/useTheme hooks have stable TypeScript interfaces)
- [x] Breaking changes use versioning or deprecation paths (Public API is ThemeProvider props + useTheme return type; breaking changes require major version bump per semver)
- [x] Validation occurs at boundary (serializers/forms) (Theme config validated at ThemeProvider mount; token maps validated at build time by validation script)

**Justification**: F07's public API is the React component/hook interface and theme token schema. Both are strictly typed and documented. Changes to token structure or hook signatures follow semver. B12 integration is additive (no backend changes required).

### Documentation (Principle XI)
- [x] Feature documentation plan included (comprehensive docs: architecture overview, quickstart guide, token reference, brand customization guide, SSR integration, accessibility guidelines, Storybook stories for all components/themes)
- [x] Extension guide updates identified if applicable (migration guide for updating F01 components to use semantic tokens; brand creation guide for product teams)
- [x] ADR planned if major architectural decision involved (ADR needed for: semantic token layer architecture, cookie-based SSR strategy, hierarchical brand inheritance model)

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between light and dark themes and have their preference persist across sessions without visible theme "flash" on page load (measured by visual regression tests and user testing)
- **SC-002**: Product teams can define and apply a custom brand theme using only token configuration files (no code changes) in under 30 minutes following documentation
- **SC-003**: All core themes (light/default, dark/default) meet WCAG 2.1 AA contrast requirements as validated by automated tooling in CI with 100% pass rate
- **SC-004**: Theme switching introduces no measurable performance degradation (page render time remains under 100ms, no forced reflows)
- **SC-005**: Frontend developers can integrate F07 into a new application shell (F06) in under 10 minutes following the quickstart guide
- **SC-006**: 100% of F01 design system components render correctly (no visual breakage, proper contrast) in both light and dark modes as verified by Chromatic visual regression tests
- **SC-007**: Theme preference synchronization (cookie + localStorage + B12) works reliably across browser tabs with changes reflected within 500ms
- **SC-008**: Custom brand themes can be validated for accessibility using the provided `validateThemeContrast()` utility, with clear actionable feedback for any violations

## Assumptions

1. **F01 Design System Maturity**: Assumes F01 already provides a stable set of primitive color tokens (gray scale, semantic colors, state colors) that can serve as the foundation for theme mapping. If F01 tokens are incomplete or unstable, F07 may need to define additional primitives or coordinate breaking changes with F01.

2. **B12 Preferences API Availability**: Assumes B12 user/org preferences feature includes a generic key-value preference storage API (e.g., `/api/preferences/{key}`) that F07 can use for theme persistence. If B12 has no preference storage, F07 falls back to localStorage + cookie only.

3. **SSR Rendering Context**: Assumes the Django Core-App uses a hybrid rendering approach where initial HTML is server-rendered (Django templates or similar) and React hydrates on the client. SSR utilities will be designed for this context. If the app is purely client-side rendered (SPA), the SSR flash-prevention features may be unnecessary but still provided as optional utilities.

4. **Browser Support Baseline**: Assumes modern evergreen browsers (Chrome, Firefox, Safari, Edge last 2 versions) with CSS custom property support. Legacy browser fallback (IE11, older mobile browsers) is documented but not primary target; products needing legacy support must provide their own static CSS fallbacks.

5. **Design Token Format**: Assumes F01 uses a structured token format (likely vanilla-extract or similar CSS-in-JS tool given F05/F06 precedent) that F07 can programmatically consume and transform into CSS custom properties. If F01 uses a different format, F07 may need a token adapter layer.

6. **Theme Toggle Placement**: Assumes F06 core layouts provide a standard slot/region for placing the optional `<ThemeToggle />` component (e.g., in app header or settings panel). If F06 has no standard placement, documentation will guide products on where to integrate the toggle.

7. **Minimal Brand Variants Initially**: Assumes F07 ships with only the "default" brand variant (no custom brands in the core package). Products define their own brand tokens in their downstream repos. This keeps F07 product-agnostic but requires clear documentation on brand creation.

8. **No Runtime Theme Authoring UI**: Assumes theme customization happens at build/config time (TypeScript files, JSON configs) rather than via a runtime visual editor. A future feature could add a theme authoring tool, but it's out of scope for F07.

9. **Accessibility Validation Scope**: Assumes contrast validation tooling checks a predefined set of critical token pairings (text on background, text on surface, UI components on background) rather than exhaustively checking all possible combinations. Edge case combinations are product team responsibility.

10. **Cross-Tab Synchronization Mechanism**: Assumes browser `storage` events (localStorage changes) are the primary mechanism for cross-tab theme sync, supplemented by cookie checks on focus/visibility change. This works for modern browsers but may not sync instantly in all scenarios (acceptable trade-off for simplicity).

## Dependencies

- **F01 Design System (critical)**: F07 depends on F01 primitive tokens as the foundation for semantic theme tokens. F01 must be stable before F07 can be fully implemented. If F01 tokens change structure, F07 must adapt.

- **F06 Core Layouts (recommended)**: F06 should provide a standard slot for placing `<ThemeToggle />` component to ensure consistent UX across products. Not blocking, but lack of integration means products implement toggle placement inconsistently.

- **F05 Resource Display (integration)**: F05 should migrate from hard-coded state colors to semantic theme tokens (e.g., `state.success` instead of direct color references) to ensure alerts/badges adapt to themes. Not blocking for F07 launch but important for complete theme coverage.

- **B12 User/Org Preferences (optional)**: If B12 provides a preferences API, F07 can persist theme selection server-side. If B12 is not available or lacks preference storage, F07 falls back to client-side storage (cookie + localStorage) with no loss of functionality.

- **@django-core/api-client (optional)**: F07 may use the shared API client package (if it exists from F02/F03/F05) for making B12 preference API calls. If no shared client, F07 implements lightweight fetch wrapper with CSRF handling internally.

## Open Questions

*None remaining after discovery. All critical decisions confirmed during specification process.*

## Out of Scope

The following are explicitly NOT included in F07 and may be addressed in future features:

1. **Visual Theme Editor UI**: No runtime tool for authoring or previewing themes. Theme creation is code/config-based.
2. **Per-Component Micro-Theming**: No mechanism for individual components to define their own theme overrides beyond standard variants. Theming operates at the global token level.
3. **Product-Specific Brand Presets**: F07 does not ship with brand themes for specific products (e.g., "TeamReel Blue", "ClientX Purple"). Products define their own brands.
4. **Automatic Dark Mode Image Variants**: No automatic switching of images/illustrations between light and dark optimized versions. Products handle image variants manually.
5. **Theme Marketplace or Sharing**: No infrastructure for users to share or download community-created themes.
6. **Advanced Animation/Transition Customization**: Theme switching uses a standard fade transition. Products cannot customize transition timing/effects per theme.
7. **Theme-Based Feature Flags**: No mechanism to show/hide features based on active theme (use F08 feature flags if this is needed).
8. **Theme Analytics/Telemetry**: No built-in tracking of theme usage or switches. Products can add tracking using existing analytics infrastructure.
9. **Print Stylesheet Theming**: Assumes print styles use default (light) theme. No print-specific theme optimization.
10. **Email Template Theming**: F07 is frontend-only; it does not extend to backend-generated email templates or PDFs.

## Notes

- **ADR Required**: This feature introduces significant architectural decisions (semantic token layer, cookie-based SSR strategy, hierarchical inheritance) that should be documented in an Architecture Decision Record (ADR) during the planning phase.

- **F01 Migration Strategy**: Existing F01 components currently reference primitive tokens directly. F07 should provide a gradual migration path where components can adopt semantic tokens incrementally without breaking existing consumers. Consider a compatibility layer or runtime token aliasing during transition period.

- **Token Naming Conventions**: Semantic token names should follow a clear, hierarchical convention (e.g., `background.surface`, `text.primary`) that scales as new token categories are added. Consider adopting a standard naming scheme (e.g., System UI, Styled System, Radix Themes) for consistency with industry practices.

- **Theme Validation Performance**: Build-time contrast validation should be fast enough to run on every commit (target: <5 seconds). If validation becomes slow with many brand variants, consider caching or incremental validation strategies.

- **B12 API Contract**: Document the expected B12 preferences API contract clearly (endpoint path, request/response schema, error handling) so backend team knows what to implement if they add preference storage later.

- **Storybook Theme Addon**: Consider integrating with Storybook's built-in theme switching addon (if using Storybook 7+) to provide a native theme selector in the Storybook UI toolbar rather than requiring users to interact with story content.

- **TypeScript Strictness**: All F07 code should use TypeScript strict mode with no `any` types in public APIs. Theme configuration types should be fully inferred (products get autocomplete for token names).

- **Bundle Size Target**: Keep F07 core package (ThemeProvider + hooks + utilities) under 10KB gzipped. Theme token definitions are tree-shakeable CSS/JSON and don't count toward core bundle.

- **Backward Compatibility**: Once F07 reaches stable 1.0, any changes to the public API (ThemeProvider props, useTheme return type, token schema) must follow semantic versioning with deprecation warnings for breaking changes.

- **Future Enhancement - Theme Scheduling**: Consider future feature to auto-switch themes based on time of day (e.g., light mode 6am-6pm, dark mode 6pm-6am). Not in scope for F07 but architecture should not preclude it.
