# Implementation Plan: F07 Theme Support & Brand Variants
*Path: [kitty-specs/028-theme-support-brand/plan.md](kitty-specs/028-theme-support-brand/plan.md)*

**Branch**: `028-theme-support-brand` | **Date**: 2025-12-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/028-theme-support-brand/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

F07 establishes a token-driven theming foundation for the Django Core-App frontend, enabling light/dark modes and extensible brand variants while maintaining WCAG 2.1 AA accessibility standards. The feature provides headless theming infrastructure (ThemeProvider, hooks, semantic tokens) alongside an optional ThemeToggle component, supporting both client-side and server-side rendering with zero visual flash on page load.

**Technical Approach** (validated via planning discovery):
- **Token Architecture**: vanilla-extract `.css.ts` files with theme contracts defining semantic tokens that map to F01 primitives, zero-runtime CSS custom properties
- **Theme Switching**: `data-theme` and `data-brand` attributes on `<html>` element with CSS variable scoping, inline boot script prevents SSR flash
- **Brand System**: Type-safe hierarchical inheritance via theme contract helpers, brands override accent tokens while inheriting base mode foundations
- **Storage**: `ThemeStorage` interface abstraction with cookie (SSR), localStorage (fallback), and optional B12 adapter implementations
- **Accessibility**: Pre-compilation `validateThemeContrast()` TypeScript utility validates WCAG 2.1 AA compliance, integrated into CI for all mode×brand combinations

## Technical Context

**Language/Version**: TypeScript 5.x + React 18.x
**Primary Dependencies**:
- `@vanilla-extract/css` (theme contract system, CSS custom properties)
- `@django-core/design-system` (F01 primitive tokens - critical dependency)
- `@django-core/api-client` (optional, for B12 integration)
- `react` 18.x + `react-dom` (ThemeProvider context)
**Storage**: N/A (frontend-only package; theme preferences stored via cookie + localStorage + optional B12 backend)
**Testing**: Vitest + React Testing Library (unit/integration), Chromatic (visual regression), axe-core (accessibility)
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge last 2 versions) with CSS custom property support
**Project Type**: Frontend package in monorepo (`packages/theme-system/`)
**Performance Goals**:
- Theme switching <100ms (no forced reflows)
- Core bundle <10KB gzipped (tree-shakeable token definitions)
- Zero runtime overhead (CSS custom properties only, no React re-renders)
- Build-time contrast validation <5 seconds
**Constraints**:
- SSR flash prevention (inline boot script must execute before React hydration)
- WCAG 2.1 AA compliance enforced in CI (4.5:1 normal text, 3:1 large text/UI)
- Full TypeScript type safety with strict mode (no `any` in public APIs)
- Zero breaking changes to F01/F05/F06 components during integration
**Scale/Scope**:
- 2 core themes (light/default, dark/default) shipped with F07
- Semantic token categories: background (3), text (4), border (3), state (4×3), accent (2+)
- Support unlimited downstream brand variants via extension pattern
- Integration touchpoints: F01 (critical), F05 (recommended), F06 (recommended), B12 (optional)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [x] **Product-Agnostic**: ✅ Implementation contains NO product-specific logic, pricing, workflows, or UI flows. F07 defines theming infrastructure and extension points only; products define their own brand token sets.
- [x] **Core Focus**: ✅ Feature aligns with core UI infrastructure concerns. Theme system is foundational for all frontend applications.
- [x] **Downstream Extension**: ✅ Product-specific needs handled via `ThemeStorage` interface, brand token configuration files, and documented extension patterns.

### II. Architecture and Modularity
- [x] **Single Responsibility**: ✅ Single frontend package (`@django-core/theme-system`) with clear theming-only scope
- [x] **Stable APIs**: ✅ Public API is ThemeProvider props, useTheme hook, ThemeStorage interface, and theme token contract - all TypeScript typed and documented
- [x] **Minimal Dependencies**: ✅ Only vanilla-extract (core tech), React (peer dep), and optional api-client (for B12). F01 is intentional critical dependency.
- [x] **No Circular Deps**: ✅ Dependency flow: F07 → F01 (primitives). F05/F06 optionally migrate to F07 semantic tokens. No cycles.
- [x] **No Downstream Imports**: ✅ F07 is pure infrastructure. Products import F07, not vice versa.

### III. Code Quality and Style
- [x] **Python 3.12+**: N/A (frontend-only feature)
- [x] **Type Hints**: ✅ TypeScript strict mode for all F07 code, 100% type coverage for public APIs, no `any` types
- [x] **Black Formatting**: N/A (Prettier for frontend following F01/F05/F06 conventions)
- [x] **Ruff Linting**: N/A (ESLint for frontend following existing config)
- [x] **No Dead Code**: ✅ Implementation will include only necessary exports, tree-shakeable token definitions
- [x] **Readable Code**: ✅ Functions/hooks small and focused, clear separation: storage/validation/components/tokens
- [x] **Curated Dependencies**: ✅ vanilla-extract justified (zero-runtime theming standard), all deps pinned in package.json

### IV. Testing Strategy
- [x] **pytest + pytest-django**: N/A (Vitest + React Testing Library for frontend)
- [x] **Test Coverage**: ✅ >90% coverage target for theme resolution, hooks, storage adapters, validation utilities; 100% for critical SSR flash prevention
- [x] **Regression Tests**: ✅ All bug fixes will include tests
- [x] **Deterministic**: ✅ No time-based or network-dependent tests; B12 integration mocked
- [x] **Coverage Thresholds**: ✅ Defined: >90% overall, 100% for ThemeProvider/useTheme/storage/validation, visual regression via Chromatic
- [x] **Integration Tests**: ✅ Theme switching flow, persistence (cookie+localStorage+B12), SSR hydration, contrast validation, cross-tab sync

### V. Security and Privacy
- [x] **Secure Defaults**: ✅ Theme cookie uses SameSite=Lax; no Secure flag needed (non-sensitive data); B12 calls use existing CSRF-protected api-client
- [x] **DEBUG Off**: N/A (frontend package; no debug flags)
- [x] **No Secrets**: ✅ No secrets; theme preference is non-sensitive user preference data
- [x] **Dependency Scanning**: ✅ CI scans all npm dependencies (follows monorepo policy)
- [x] **Centralized Auth**: ✅ B12 integration uses existing authenticated api-client (no new auth)
- [x] **No Sensitive Logging**: ✅ Only logs theme state (mode/brand) and contrast warnings - no PII

### VI. Performance and Reliability
- [x] **No N+1 Queries**: N/A (frontend feature; no database queries)
- [x] **Pagination**: N/A (no unbounded datasets)
- [x] **Explicit Caching**: ✅ Theme resolution memoized in React context; token definitions are static CSS
- [x] **Structured Logging**: ✅ Console warnings in dev mode for contrast violations; production errors to existing frontend error tracking
- [x] **Health Checks**: N/A (frontend package)
- [x] **Metrics Hooks**: ✅ Could emit theme switch events to existing analytics (optional integration point)
- [x] **Graceful Degradation**: ✅ Explicit fallback chain: cookie→B12→localStorage→system→default; B12 API failure non-blocking; CSS custom property unsupported→static fallback

### VII. UX and API Design
- [x] **DRF Required**: N/A (frontend package; B12 integration uses existing REST endpoints)
- [x] **Consistent Responses**: ✅ Frontend API (ThemeProvider/useTheme) has consistent TypeScript interfaces
- [x] **Versioning Strategy**: ✅ Public API follows semver; breaking changes require major version bump with deprecation warnings
- [x] **Clear Errors**: ✅ Validation errors from contrast checks include specific token pairs; runtime errors safe (no token leaks)
- [x] **Boundary Validation**: ✅ Theme config validated at ThemeProvider mount; token maps validated at build time by CI script

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: ✅ Quickstart guide targets <10 minute integration; Storybook stories for instant preview
- [x] **Mandatory Tools**: ✅ TypeScript, ESLint, Prettier configured (frontend equivalents of Black/Ruff)
- [x] **Pre-commit Hooks**: ✅ Hooks run TypeScript compilation, ESLint, Prettier (matches CI)
- [x] **Type Checking**: ✅ TypeScript strict mode; tsc runs cleanly on all F07 code
- [x] **Task Scripts**: ✅ pnpm scripts: build, test, lint, validate-themes (contrast check)
- [x] **Developer Docs**: ✅ Comprehensive docs planned: architecture, token structure, brand creation, SSR integration, accessibility

### IX. Branching and Git Workflow
- [x] **Feature Branch**: ✅ Work on `028-theme-support-brand` branch in dedicated worktree
- [x] **Linked to Spec**: ✅ PR will reference `kitty-specs/028-theme-support-brand/spec.md`
- [x] **Focused PRs**: ✅ Feature decomposed into work packages; each WP is focused PR
- [x] **main Stable**: ✅ No direct commits; all changes via PR with CI gates

### X. CI/CD and Quality Gates
- [x] **CI Checks**: ✅ TypeScript compilation, ESLint, Prettier, Vitest, validateThemeContrast (CI script), Chromatic visual regression
- [x] **Merge Gates**: ✅ All CI checks must pass; core themes must pass WCAG 2.1 AA contrast validation
- [x] **Scripted Deployment**: ✅ pnpm build generates publishable package; follows monorepo deployment pattern

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: ✅ Documentation in `packages/theme-system/README.md` + Storybook MDX + `docs/` directory
- [x] **App README**: ✅ Package README planned with: architecture overview, quickstart, API reference, migration guide
- [x] **Getting Started**: ✅ Quickstart guide targets <10 minute integration (FR-032)
- [x] **Extension Guide**: ✅ Brand creation guide, F01 component migration guide, custom ThemeStorage implementation guide
- [x] **Spec Sync**: ✅ Implementation updates spec.md with any clarifications discovered during build
- [x] **ADR Required**: ✅ ADR planned for: semantic token layer architecture, cookie-based SSR strategy, hierarchical brand inheritance model (noted in spec)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: ✅ No constitution amendments required
- [x] **Template Updates**: ✅ No template changes required; F07 is additive infrastructure feature

### Violations Requiring Justification

*No violations present*

**Constitution Check Status**: ✅ PASS - All constitutional requirements met. F07 is product-agnostic infrastructure with clear extension points, follows frontend quality standards (TypeScript strict, ESLint, testing), and includes comprehensive accessibility validation.

## Project Structure

### Documentation (this feature)

```
kitty-specs/[###-feature]/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (/spec-kitty.plan command)
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

**Structure Decision**: Frontend monorepo package following F01/F05/F06 pattern. F07 is a standalone package under `packages/theme-system/` with no backend component.

```
packages/
└── theme-system/
    ├── src/
    │   ├── index.ts                      # Public API exports
    │   ├── components/
    │   │   ├── ThemeProvider.tsx         # React context provider
    │   │   ├── ThemeToggle.tsx           # Optional UI component
    │   │   └── index.ts
    │   ├── hooks/
    │   │   ├── useTheme.ts               # Primary hook for theme state
    │   │   ├── useThemeStorage.ts        # Storage adapter hook
    │   │   └── index.ts
    │   ├── themes/
    │   │   ├── contract.css.ts           # Theme contract definition (semantic token schema)
    │   │   ├── light.css.ts              # Light mode theme (F01 primitive mappings)
    │   │   ├── dark.css.ts               # Dark mode theme (F01 primitive mappings)
    │   │   ├── brand-helpers.ts          # Type-safe brand inheritance utilities
    │   │   └── index.ts
    │   ├── storage/
    │   │   ├── ThemeStorage.ts           # Interface definition
    │   │   ├── CookieStorage.ts          # SSR-friendly cookie adapter
    │   │   ├── LocalStorage.ts           # Client fallback adapter
    │   │   ├── B12Storage.ts             # Optional B12 API adapter
    │   │   ├── ComposedStorage.ts        # Default multi-layer storage
    │   │   └── index.ts
    │   ├── validation/
    │   │   ├── validateContrast.ts       # WCAG 2.1 contrast validation
    │   │   ├── wcag-utils.ts             # Color math utilities
    │   │   └── index.ts
    │   ├── ssr/
    │   │   ├── boot-script.ts            # Inline script for SSR flash prevention
    │   │   ├── getServerTheme.ts         # Server-side theme resolution
    │   │   └── index.ts
    │   └── types/
    │       ├── theme.ts                  # Theme configuration types
    │       ├── tokens.ts                 # Token map types
    │       └── index.ts
    ├── tests/
    │   ├── unit/
    │   │   ├── hooks.test.tsx            # useTheme, useThemeStorage tests
    │   │   ├── storage.test.ts           # All storage adapter tests
    │   │   ├── validation.test.ts        # Contrast validation tests
    │   │   └── brand-helpers.test.ts     # Brand inheritance tests
    │   ├── integration/
    │   │   ├── theme-switching.test.tsx  # Full switching flow
    │   │   ├── persistence.test.tsx      # Cookie+localStorage+B12 sync
    │   │   ├── ssr-hydration.test.tsx    # SSR flash prevention
    │   │   └── cross-tab.test.tsx        # Cross-tab synchronization
    │   └── visual/
    │       └── chromatic.stories.tsx     # Visual regression stories
    ├── scripts/
    │   └── validate-themes.ts            # CI script: validates all mode×brand combinations
    ├── .storybook/                       # Storybook configuration
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts                    # Build configuration
    └── README.md                         # Package documentation
```

## Complexity Tracking

*No violations - not applicable*
