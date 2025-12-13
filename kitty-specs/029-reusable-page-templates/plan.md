# Implementation Plan: Reusable Page Templates
*Path: [kitty-specs/029-reusable-page-templates/plan.md](kitty-specs/029-reusable-page-templates/plan.md)*

**Branch**: `029-reusable-page-templates` | **Date**: 2025-12-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/029-reusable-page-templates/spec.md`

## Summary

Build a library of reusable, unbranded page templates (`@django-core/page-templates`) for common SaaS UI patterns: dashboard, list-detail, settings, and multi-step wizard. Templates provide structure-only scaffolding (no business logic) that composes F01 design system components and F06 layouts, with hybrid controlled/uncontrolled state management, centralized default state UI, and extensive customization through compound components + render props pattern. Goal: enable frontend developers to scaffold consistent, accessible pages in <15 minutes with 90% using defaults.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.x
**Primary Dependencies**:
  - F01 Design System (`@django-core/design-system`) - primitives, tokens, components
  - F06 Layouts & App Shell - responsive layout system, breakpoints
  - F07 Theme System (`@django-core/theme-system`) - semantic theme tokens (optional)
  - React 18.x (peer dependency)
  - Vite 5.x (build tooling)

**Storage**: N/A (frontend-only package, no data persistence)

**Testing**:
  - Vitest + React Testing Library (unit + integration tests)
  - Storybook 8.x + Chromatic (visual regression testing)
  - Target: 80%+ coverage for templates, 100% for navigation logic

**Target Platform**: Modern browsers (evergreen Chrome/Firefox/Safari/Edge), no legacy browser support

**Project Type**: Frontend component library (monorepo package)

**Performance Goals**:
  - Bundle size <15KB gzipped for core package
  - Template rendering <100ms
  - Wizard step transitions <100ms
  - Support 2-10 wizard steps without degradation

**Constraints**:
  - Must compose F01/F06 components (no primitive duplication)
  - Templates remain structure-only (no business logic, data fetching, form validation)
  - Unbranded (no product-specific colors, logos, copy, domain models)
  - WCAG 2.1 AA accessibility compliance required
  - Responsive at 320px (mobile), 768px (tablet), 1024px+ (desktop) breakpoints

**Scale/Scope**:
  - 4 template types: Dashboard, List-Detail, Wizard, Settings
  - Default state UI for 5-6 states: loading, empty, error, permission-denied, partial-data, offline/retry
  - ~15-20 components total (templates + sub-components + state UI)
  - Storybook documentation with 5+ examples per template

**Architecture Decisions from Planning**:

1. **Component Pattern**: Hybrid approach
   - Compound components for structural regions (e.g., `Dashboard.Header`, `Dashboard.Grid`)
   - Render props/slots for state overrides and exceptional extension points

2. **State Management**: Hybrid controlled/uncontrolled
   - Support both modes with `value`/`onChange` pattern (e.g., `stepIndex` + `onStepIndexChange`)
   - Default* variants for uncontrolled mode (e.g., `defaultStepIndex`)
   - Templates expose navigation interfaces but don't own business logic

3. **Default State UI**: Centralized in `@django-core/page-templates/states`
   - Components: DefaultLoading, DefaultEmpty, DefaultError, DefaultPermissionDenied, DefaultOfflineRetry
   - Built from F01 primitives, managed centrally for consistency
   - Each template imports and uses these defaults, consumers can override via render props

4. **Responsive Integration**: Hybrid F06 integration
   - Use F06 responsive layout components (Grid, Stack, Container) for base structure
   - F06 breakpoint tokens only for template-specific tweaks (panel collapse, spacing adjustments, pane ratios)

5. **Testing Strategy**: Hybrid organization
   - Unit tests co-located (`.test.tsx` alongside components)
   - Integration tests in `/tests/integration/` for flows (wizard navigation, list→detail transitions)
   - Visual regression via Storybook stories in `/stories/` for Chromatic

**Package Structure**: `packages/page-templates/`
```
src/
  components/
    Dashboard/
      Dashboard.tsx              # Main compound component
      DashboardHeader.tsx        # Sub-component
      DashboardGrid.tsx          # Sub-component
      DashboardFilterBar.tsx     # Sub-component
      Dashboard.test.tsx         # Co-located unit tests
    ListDetail/
      ListDetailTemplate.tsx
      ListDetailPane.tsx
      ListDetailMobile.tsx
      ListDetailTemplate.test.tsx
    Wizard/
      WizardTemplate.tsx
      WizardStepIndicator.tsx
      WizardNavigation.tsx
      WizardTemplate.test.tsx
    Settings/
      SettingsTemplate.tsx
      SettingsNavigation.tsx
      SettingsSection.tsx
      SettingsTemplate.test.tsx
    states/                      # Centralized default state UI
      DefaultLoading.tsx
      DefaultEmpty.tsx
      DefaultError.tsx
      DefaultPermissionDenied.tsx
      DefaultOfflineRetry.tsx
      index.ts
  types/
    index.ts                     # PageState union, template prop types
  hooks/
    useControlledState.ts        # Utility for controlled/uncontrolled pattern
  index.ts                       # Public API exports
tests/
  integration/
    wizard-navigation.test.tsx
    list-detail-flow.test.tsx
    settings-navigation.test.tsx
stories/
  Dashboard.stories.tsx          # Basic, states, customization, responsive
  ListDetail.stories.tsx
  Wizard.stories.tsx
  Settings.stories.tsx
  states/
    DefaultStates.stories.tsx    # Visual regression for state components
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
.storybook/
  main.ts
  preview.ts
```

**Naming Conventions**:
- Package: `@django-core/page-templates`
- Exports: `DashboardTemplate`, `ListDetailTemplate`, `WizardTemplate`, `SettingsTemplate`
- Prop types: `DashboardTemplateProps`, `WizardStepConfig`, `SettingsSection`
- State type: `PageState = 'loading' | 'empty' | 'error' | 'permission-denied' | 'partial-data' | 'offline' | 'ready'`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: This is a frontend-only package. Backend-specific checks (Django, DRF, PostgreSQL) are marked N/A.

### I. Purpose and Scope
- [x] ✅ **Product-Agnostic**: Templates contain NO product-specific logic, branding, domain models, or workflows - fully reusable scaffolding
- [x] ✅ **Core Focus**: Aligns with core UI infrastructure concerns (reusable page patterns for downstream products)
- [x] ✅ **Downstream Extension**: Product-specific content comes via props/slots; templates provide documented extension points

**Notes**: Templates are explicitly designed as domain-agnostic structure. All customization happens through composition.

### II. Architecture and Modularity
- [x] ✅ **Single Responsibility**: Package has one purpose - provide reusable page templates
- [x] ✅ **Stable APIs**: TypeScript interfaces for all public APIs, semver for breaking changes
- [x] ✅ **Minimal Dependencies**: Only F01 (primitives), F06 (layouts), F07 (themes), React, and build tools
- [x] ✅ **No Circular Deps**: Clear dependency flow: Templates → F06 → F01 (no reverse imports)
- [x] ✅ **No Downstream Imports**: Package is part of core, consumed by downstream products

**Notes**: Frontend package with clear layering. F01/F06/F07 are peer dependencies in monorepo.

### III. Code Quality and Style (Frontend Adaptation)
- [x] ✅ **TypeScript 5.x+**: Strict mode enabled for all template code
- [x] ✅ **Type Hints**: 100% TypeScript coverage for public APIs (props, slots, callbacks)
- [x] ✅ **Prettier Formatting**: All code formatted with Prettier (frontend equivalent of Black)
- [x] ✅ **ESLint**: ESLint used for linting (frontend equivalent of Ruff)
- [x] ✅ **No Dead Code**: Implementation removes unused code, tree-shaking enabled
- [x] ✅ **Readable Code**: Components remain focused, compound pattern prevents bloat
- [x] ✅ **Curated Dependencies**: Dependencies justified in spec, versions pinned in package.json

**Notes**: Frontend standards applied. TypeScript strict mode = type hints requirement.

### IV. Testing Strategy (Frontend Adaptation)
- [x] ✅ **Vitest + React Testing Library**: Frontend testing framework used (equivalent to pytest + pytest-django)
- [x] ✅ **Test Coverage**: Unit tests for all templates, integration tests for flows, visual regression via Chromatic
- [x] ✅ **Regression Tests**: Bug fixes will include tests preventing recurrence
- [x] ✅ **Deterministic**: Tests use controlled props, no flaky timing dependencies
- [x] ✅ **Coverage Thresholds**: 80%+ for templates, 100% for navigation logic, enforced in CI
- [x] ✅ **Integration Tests**: Wizard navigation, list→detail transitions, settings section switching covered

**Notes**: Comprehensive frontend testing strategy with visual regression component.

### V. Security and Privacy (Frontend Adaptation)
- [x] ✅ **Secure Defaults**: Templates render user content safely via React's default escaping (no dangerouslySetInnerHTML)
- [x] N/A **DEBUG Off**: N/A for frontend package (no server-side DEBUG flag)
- [x] N/A **No Secrets**: N/A for frontend package (templates have no secrets, purely presentational)
- [x] ✅ **Dependency Scanning**: CI will scan npm dependencies for vulnerabilities (npm audit, Snyk)
- [x] N/A **Centralized Auth**: N/A for templates (presentation-only, consumers handle auth)
- [x] ✅ **No Sensitive Logging**: Templates log only structural/navigation events, no user data

**Notes**: Frontend security model applies. XSS protection via React defaults. No data persistence.

### VI. Performance and Reliability (Frontend Adaptation)
- [x] N/A **No N+1 Queries**: N/A for frontend (no database queries, templates accept props)
- [x] N/A **Pagination**: N/A for templates (consumers provide paginated data, templates provide structure)
- [x] N/A **Explicit Caching**: N/A for frontend components (no server-side caching)
- [x] ✅ **Structured Logging**: Console logging for navigation events (development mode warnings for invalid config)
- [x] N/A **Health Checks**: N/A for frontend package (no health endpoints)
- [x] ✅ **Metrics Hooks**: Bundle size monitoring (<15KB gzipped enforced), render performance benchmarks
- [x] ✅ **Graceful Degradation**: Templates render with minimal props, enhance with additional features; state overrides degrade to defaults

**Notes**: Frontend performance model. Bundle size and render performance are key metrics.

### VII. UX and API Design (Frontend Adaptation)
- [x] N/A **DRF Required**: N/A for frontend package (no REST APIs, this is UI component library)
- [x] ✅ **Consistent Responses**: Consistent prop naming across templates (state, onChange patterns)
- [x] ✅ **Versioning Strategy**: Semver for breaking changes, deprecation warnings for API changes
- [x] ✅ **Clear Errors**: TypeScript types provide compile-time errors, runtime validation logs clear messages
- [x] ✅ **Boundary Validation**: PropTypes/TypeScript validate inputs at component boundary

**Notes**: Frontend API design applies. TypeScript provides API contract enforcement.

### VIII. Developer Experience and Tooling (Frontend Adaptation)
- [x] ✅ **Easy Setup**: pnpm install in monorepo root, package auto-discovered
- [x] ✅ **Mandatory Tools**: Prettier, ESLint, TypeScript configured in package.json
- [x] ✅ **Pre-commit Hooks**: Monorepo pre-commit hooks will run formatting/linting (if configured)
- [x] ✅ **Type Checking**: TypeScript strict mode runs cleanly on all template code
- [x] ✅ **Task Scripts**: package.json scripts for build, test, lint, typecheck, storybook
- [x] ✅ **Developer Docs**: Storybook serves as interactive dev docs + README for setup

**Notes**: Frontend tooling applies. Monorepo handles setup, pnpm workspace manages dependencies.

### IX. Branching and Git Workflow
- [x] ✅ **Feature Branch**: Work occurs on `029-reusable-page-templates` feature branch (already created)
- [x] ✅ **Linked to Spec**: PR will reference `kitty-specs/029-reusable-page-templates/spec.md`
- [x] ✅ **Focused PRs**: Feature is scoped - 4 templates + state UI + tests + docs, no scope creep
- [x] ✅ **main Stable**: No direct commits to main, all changes via PR after review

**Notes**: Standard git-flow followed. Feature worktree isolates changes.

### X. CI/CD and Quality Gates
- [x] ✅ **CI Checks**: ESLint, Prettier, TypeScript, Vitest, bundle size check in CI
- [x] ✅ **Merge Gates**: All CI checks + PR review must pass before merge
- [x] ✅ **Scripted Deployment**: Monorepo publish scripts handle npm package publishing (if applicable)

**Notes**: Frontend CI pipeline. Chromatic runs on PR for visual regression review.

### XI. Documentation and Knowledge Sharing
- [x] ✅ **In-Repo Docs**: All docs live in repository (Storybook, README, spec, plan)
- [x] ✅ **Package README**: Package will have README with quick start, API reference, composition guidelines
- [x] ✅ **Getting Started**: Storybook provides interactive getting started examples
- [x] ✅ **Extension Guide**: Storybook stories demonstrate customization patterns (state overrides, slots)
- [x] ✅ **Spec Sync**: Spec remains source of truth, implementation aligns with requirements
- [x] ✅ **ADR Planned**: Potential ADRs noted in spec (template slot API design, state boundary, responsive strategy)

**Notes**: Storybook is primary documentation vehicle. Interactive examples > markdown docs.

### XII. Constitution Evolution
- [x] ✅ **No Constitution Changes**: Feature aligns with existing constitution, no amendments needed
- [x] ✅ **No Template Updates**: No spec-kitty template changes required

**Notes**: Standard feature following established patterns.

### Violations Requiring Justification

**None** - All constitution principles compliant with frontend adaptations applied.

**Constitution Check Status**: ✅ **PASS** (with frontend adaptations noted)

## Project Structure

### Documentation (this feature)

```
kitty-specs/029-reusable-page-templates/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (component API contracts)
├── quickstart.md        # Phase 1 output (developer quick start)
├── contracts/           # Phase 1 output (TypeScript interface definitions)
│   ├── Dashboard.d.ts
│   ├── ListDetail.d.ts
│   ├── Wizard.d.ts
│   ├── Settings.d.ts
│   └── States.d.ts
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Spec quality checklist (already created)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created yet)
```

### Source Code (repository root)

**Structure Decision**: Frontend monorepo package under `packages/page-templates/`

```
packages/
├── page-templates/                    # NEW PACKAGE (this feature)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   ├── DashboardFilterBar.tsx
│   │   │   │   ├── Dashboard.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── ListDetail/
│   │   │   │   ├── ListDetailTemplate.tsx
│   │   │   │   ├── ListDetailPane.tsx
│   │   │   │   ├── ListDetailMobile.tsx
│   │   │   │   ├── ListDetailTemplate.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Wizard/
│   │   │   │   ├── WizardTemplate.tsx
│   │   │   │   ├── WizardStepIndicator.tsx
│   │   │   │   ├── WizardNavigation.tsx
│   │   │   │   ├── WizardTemplate.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Settings/
│   │   │   │   ├── SettingsTemplate.tsx
│   │   │   │   ├── SettingsNavigation.tsx
│   │   │   │   ├── SettingsSection.tsx
│   │   │   │   ├── SettingsTemplate.test.tsx
│   │   │   │   └── index.ts
│   │   │   └── states/
│   │   │       ├── DefaultLoading.tsx
│   │   │       ├── DefaultEmpty.tsx
│   │   │       ├── DefaultError.tsx
│   │   │       ├── DefaultPermissionDenied.tsx
│   │   │       ├── DefaultOfflineRetry.tsx
│   │   │       └── index.ts
│   │   ├── types/
│   │   │   ├── index.ts              # PageState union, all prop types
│   │   │   ├── dashboard.ts
│   │   │   ├── list-detail.ts
│   │   │   ├── wizard.ts
│   │   │   └── settings.ts
│   │   ├── hooks/
│   │   │   ├── useControlledState.ts # Controlled/uncontrolled helper
│   │   │   ├── useControlledState.test.ts
│   │   │   └── index.ts
│   │   └── index.ts                  # Public API exports
│   ├── tests/
│   │   └── integration/
│   │       ├── wizard-navigation.test.tsx
│   │       ├── list-detail-flow.test.tsx
│   │       └── settings-navigation.test.tsx
│   ├── stories/
│   │   ├── Dashboard.stories.tsx
│   │   ├── ListDetail.stories.tsx
│   │   ├── Wizard.stories.tsx
│   │   ├── Settings.stories.tsx
│   │   └── states/
│   │       └── DefaultStates.stories.tsx
│   ├── .storybook/
│   │   ├── main.ts
│   │   └── preview.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── README.md
│   └── CHANGELOG.md
│
├── design-system/                     # F01 (dependency)
├── layouts/                           # F06 (dependency) - location TBD
├── theme-system/                      # F07 (dependency)
└── [other packages...]

examples/
├── page-templates-demo/               # NEW (example app demonstrating templates)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardExample.tsx
│   │   │   ├── ListDetailExample.tsx
│   │   │   ├── WizardExample.tsx
│   │   │   └── SettingsExample.tsx
│   │   └── App.tsx
│   └── package.json
```

**Key Decisions**:
- **Frontend package**: Lives in `packages/` alongside F01, F06, F07
- **Co-located tests**: Unit tests next to components for discoverability
- **Separate integration tests**: Complex flows in dedicated test directory
- **Storybook in package**: Each package owns its Storybook config for isolation
- **Example app**: Separate demo app in `examples/` to validate real-world usage

## Complexity Tracking

**No violations** - Complexity remains appropriate:
- 4 template types (aligned with spec scope)
- Centralized state UI (reduces duplication)
- Compound components pattern (manages complexity through composition)
- Clear dependency hierarchy (Templates → F06 → F01)

---

# Phase 0: Research & Foundation

**Status**:  **COMPLETE**

**Deliverables**:
-  `research.md` - Architecture decisions documented with rationale
-  `data-model.md` - Complete TypeScript interface contracts
-  `contracts/` - TypeScript .d.ts files (8 files)
-  `quickstart.md` - Developer quick-start guide

All planning unknowns resolved. Architecture patterns established. No blockers identified.

---

# Phase 1: Design & Contracts

**Status**:  **COMPLETE**

**Deliverables**:
-  Component API contracts in `data-model.md`
-  TypeScript .d.ts files in `contracts/` directory
-  Developer quick-start guide with usage examples

All component interfaces defined. Contract validation complete. Ready for Phase 2 task breakdown.

---

# Phase 2: Task Breakdown

**Status**:  **NEXT STEP**

**Next Command**: `/spec-kitty.tasks`

This will generate task breakdown in `tasks.md` with 50-60 atomic tasks organized by:
- Infrastructure setup
- Common utilities
- Template components
- Testing & integration
- Documentation & examples

---

# Summary

**Current Status**: Phases 0 & 1 COMPLETE

**Completed Artifacts**:
1. `research.md` (architecture decisions, risk mitigation)
2. `data-model.md` (TypeScript interface contracts)
3. `contracts/` (8 TypeScript .d.ts files)
4. `quickstart.md` (developer onboarding guide)
5. `plan.md` (this document)

**Next Action**: Run `/spec-kitty.tasks` to generate task breakdown
