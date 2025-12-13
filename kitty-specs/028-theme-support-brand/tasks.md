# Work Packages: F07 Theme Support & Brand Variants

**Feature**: 028-theme-support-brand
**Branch**: `028-theme-support-brand`
**Inputs**: Design documents from `kitty-specs/028-theme-support-brand/`

**Prerequisites**:
- ✅ plan.md (architecture, stack decisions)
- ✅ spec.md (32 requirements, 5 user stories)
- ✅ research.md (5 planning decisions with rationale)
- ✅ data-model.md (5 TypeScript entities)
- ✅ contracts/ (ThemeStorage interface, B12 API spec)
- ✅ quickstart.md (<10 minute integration guide)

**Organization**: Fine-grained subtasks (`Txxx`) roll up into work packages (`WPxx`). Each work package is independently deliverable and testable.

**Prompt Files**: Each work package references a matching prompt file in `kitty-specs/028-theme-support-brand/tasks/planned/`. Treat this file as the high-level checklist; keep deep implementation detail inside the prompt files.

**Constitutional Compliance**: All tasks align with Django Core-App Constitution principles (frontend-adapted: TypeScript strict mode, ESLint/Prettier, Vitest, accessibility, type safety).

---

## Subtask Legend

- **[P]** = Can proceed in parallel (different files/components)
- **Txxx** = Subtask ID (sequential execution order)
- **WPxx** = Work Package ID

---

## Work Package WP01: Package Scaffold & Build Infrastructure

**Goal**: Establish @django-core/theme-system package structure, build tooling, and quality gates
**Priority**: P0 (Foundation)
**Independent Test**: Package builds successfully, exports empty index, passes linting/type-checking
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/planned/WP01-package-scaffold.md`

### Included Subtasks
- [x] **T001** Create `packages/theme-system/` directory structure per plan.md
- [x] **T002** [P] Initialize package.json with dependencies (vanilla-extract, React 18, TypeScript 5)
- [x] **T003** [P] Configure TypeScript (strict mode, tsconfig.json)
- [x] **T004** [P] Configure Vite build (vanilla-extract plugin, library mode, CSS output)
- [x] **T005** [P] Setup ESLint + Prettier (inherit from F01/F05 config)
- [x] **T006** [P] Configure Vitest (test setup, React Testing Library, jsdom)
- [x] **T007** Create src/index.ts with empty exports
- [x] **T008** Create README.md stub with package purpose
- [x] **T009** Setup Storybook 8.x configuration
- [x] **T010** Configure Chromatic for visual regression testing
- [x] **T011** Add CI workflow (lint, typecheck, test, build)

### Constitutional Alignment
- **Principle III**: TypeScript strict mode, ESLint, Prettier, curated dependencies
- **Principle VIII**: Easy setup, mandatory tooling, documented
- **Principle X**: CI quality gates (lint, typecheck, test)

### Implementation Notes
- Use pnpm workspace protocol for F01 dependency
- Ensure vanilla-extract Vite plugin configured correctly for CSS output
- ESLint extends from monorepo root config

### Parallel Opportunities
- T002-T006 can proceed in parallel (independent configuration files)
- T009-T010 can proceed after T001-T008 complete

### Dependencies
- None (starting point)

### Risks & Mitigations
- vanilla-extract plugin config issues → Reference F01/F05 working configurations
- Build output format incompatible → Test with consuming package early

**Success Criteria**:
- ✅ `pnpm build` produces dist/ with types and CSS
- ✅ `pnpm test` runs with zero tests passing
- ✅ `pnpm lint` and `pnpm typecheck` pass
- ✅ Package exports { ThemeProvider } (empty stub)

---

## Work Package WP02: Theme Contract & Token Foundations

**Goal**: Define semantic token contract and implement light/dark base themes using F01 primitives
**Priority**: P0 (Foundation)
**Independent Test**: Theme contracts compile to CSS custom properties, light/dark themes validate
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/planned/WP02-theme-contracts.md`

### Included Subtasks
- [ ] **T012** Define ThemeConfiguration and ThemeTokenMap TypeScript types (types/theme.ts)
- [ ] **T013** Create theme contract (themes/contract.css.ts) with semantic token structure
- [ ] **T014** [P] Implement light theme (themes/light.css.ts) mapping to F01 primitives
- [ ] **T015** [P] Implement dark theme (themes/dark.css.ts) mapping to F01 primitives
- [ ] **T016** Create brand inheritance helper utilities (themes/brand-helpers.ts)
- [ ] **T017** Export themeVars for component consumption (src/index.ts)
- [ ] **T018** Write unit tests for brand-helpers.ts (inheritance, merging, type safety)
- [ ] **T019** Add Storybook story demonstrating all tokens in light/dark modes

### Constitutional Alignment
- **Principle II**: Stable APIs (theme contract), minimal dependencies (F01 only)
- **Principle III**: TypeScript strict mode, 100% type coverage for token maps
- **Principle IV**: Unit tests for brand helpers (>90% coverage target)

### Implementation Notes
- Theme contract defines ALL semantic tokens (background, text, border, state, accent)
- Light/dark themes MUST be complete implementations (no partial tokens)
- Brand helpers use TypeScript generics for type-safe partial overrides
- CSS custom properties emitted as `--theme-{category}-{token}`

### Parallel Opportunities
- T014 and T015 can proceed in parallel (independent theme files)
- T018 can start once T016 complete

### Dependencies
- Requires T001-T011 (package scaffold)
- Requires F01 design-system package with primitive tokens

### Risks & Mitigations
- F01 primitives incomplete → Document missing tokens, use placeholder values
- Theme contract too rigid → Include escape hatch (full override mode)
- Type inference fails → Add explicit type annotations

**Success Criteria**:
- ✅ `themeContract` defines all semantic token categories
- ✅ `lightTheme` and `darkTheme` compile to CSS custom properties
- ✅ `createBrandVariant()` helper provides type-safe partial overrides
- ✅ Storybook shows all token values in both modes
- ✅ TypeScript autocompletes token names

---

## Work Package WP03: ThemeProvider & Core Hooks ✅

**Goal**: Implement React context, useTheme hook, and HTML attribute synchronization
**Priority**: P1 (Core Infrastructure - User Story 1 & 3 foundation)
**Independent Test**: ThemeProvider applies data-theme attribute, useTheme returns state
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/done/WP03-theme-provider.md`
**Status**: ✅ **COMPLETE** - Approved without changes (40/40 tests passing)

### Included Subtasks
- [x] **T020** Create ThemeContext with mode/brand state (components/ThemeProvider.tsx)
- [x] **T021** Implement useTheme hook (hooks/useTheme.ts) with setMode/setBrand
- [x] **T022** Implement HTML attribute synchronization (data-theme, data-brand on <html>)
- [x] **T023** Add system preference detection (prefers-color-scheme media query)
- [x] **T024** Integrate default theme resolution (storage → system → default)
- [x] **T025** Handle reduced-motion preference (prefers-reduced-motion)
- [x] **T026** Write unit tests for useTheme hook (state management, setters)
- [x] **T027** Write integration tests (ThemeProvider → HTML attributes)
- [x] **T028** Add Storybook story for ThemeProvider with theme switching demo

### Constitutional Alignment
- **Principle II**: Single responsibility (ThemeProvider manages state only)
- **Principle III**: TypeScript strict mode, fully typed hooks
- **Principle IV**: Integration tests for theme switching (>90% coverage)
- **Principle VI**: Performance (zero re-renders for components, CSS-only switching)

### Implementation Notes
- ThemeProvider uses React.useContext for state distribution
- HTML attribute updates via direct DOM manipulation (document.documentElement.setAttribute)
- System preference detection via window.matchMedia('(prefers-color-scheme: dark)')
- Reduced motion detection via window.matchMedia('(prefers-reduced-motion: reduce)')

### Parallel Opportunities
- T026 and T027 can proceed in parallel (different test types)
- T028 can proceed once T020-T025 complete

### Dependencies
- Requires WP02 (theme contracts and base themes)
- Requires ThemeStorage interface (implemented in WP04)

### Risks & Mitigations
- SSR hydration mismatch → Defer to WP05 (SSR boot script)
- Re-render performance → Ensure context updates don't force child re-renders
- Browser API unavailable (SSR) → Add typeof window checks

**Success Criteria**:
- ✅ `useTheme()` returns `{ mode, brand, setMode, setBrand }`
- ✅ Setting mode updates `data-theme` attribute on `<html>`
- ✅ System preference auto-detected on mount
- ✅ Reduced motion preference respected
- ✅ Zero React re-renders when theme changes (verify with React DevTools)

---

## Work Package WP04: Storage Adapters & Persistence ✅

**Goal**: Implement ThemeStorage interface with cookie, localStorage, and B12 adapters
**Priority**: P1 (User Story 1 - persistence requirement)
**Independent Test**: Each adapter loads/saves theme, composed storage follows priority chain
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/done/WP04-storage-adapters.md`
**Status**: ✅ **COMPLETE** - Approved by claude-reviewer on 2025-12-13
**Quality**: typecheck ✅, lint ✅, test ✅ (89/89), build ✅

### Included Subtasks
- [X] **T029** Define ThemeStorage interface (storage/types.ts)
- [X] **T030** [P] Implement CookieStorage (storage/CookieStorage.ts) - SSR-safe with security flags
- [X] **T031** [P] Implement LocalStorageAdapter (storage/LocalStorageAdapter.ts) - quota handling
- [X] **T032** [P] Implement B12Adapter (storage/B12Adapter.ts) - offline-first pattern
- [X] **T033** Implement ComposedStorage with parallel writes (storage/ComposedStorage.ts)
- [X] **T034** Storage API exports (storage/index.ts + main index.ts)
- [X] **T035** Write CookieStorage tests (10 tests: persistence, config, SSR)
- [X] **T036** Write LocalStorageAdapter tests (12 tests: persistence, errors, SSR)
- [X] **T037** Write B12Adapter tests (12 tests: API ops, offline-first, auth)
- [X] **T038** Write ComposedStorage tests (15 tests: read/write patterns, failures)

### Constitutional Alignment
- **Principle II**: Interface abstraction (products can substitute storage)
- **Principle V**: No secrets (theme is non-sensitive), graceful B12 failure
- **Principle VI**: Graceful degradation (fallback chain), non-blocking errors

### Implementation Notes
- Cookie: `django_core_theme`, `path=/`, `SameSite=Lax`, `max-age=31536000`
- LocalStorage: JSON.stringify/parse with error handling
- B12: Uses existing @django-core/api-client, endpoints: GET/POST `/api/preferences/theme`
- Composed: Load priority cookie→B12→localStorage, save to all in parallel
- Cross-tab: Listen to `storage` events, update theme if key matches

### Parallel Opportunities
- T030, T031, T032 can proceed in parallel (independent adapters)
- T035, T036, T037 can proceed after adapters complete

### Dependencies
- Requires WP03 (ThemeProvider integration point)
- Optional: @django-core/api-client package for B12Storage

### Risks & Mitigations
- Browser API unavailable (SSR) → Add typeof guards, return null gracefully
- B12 API down → Non-blocking, log warning, continue with local storage
- Cookie size limit → Theme config is tiny (<100 bytes), not a risk
- LocalStorage disabled → Catch SecurityError, fall back to in-memory

**Success Criteria**:
- ✅ CookieThemeStorage loads/saves theme across page reloads
- ✅ LocalStorageThemeStorage handles QuotaExceededError gracefully
- ✅ B12ThemeStorage calls correct endpoints, handles 404/401/500
- ✅ ComposedThemeStorage follows documented priority chain
- ✅ Cross-tab sync updates theme within 500ms
- ✅ All adapters pass contract tests (defined in contracts/theme-storage.ts)

---

## Work Package WP05: SSR Support & Flash Prevention

**Goal**: Implement inline boot script and server-side theme resolution for zero-flash page loads
**Priority**: P2 (User Story 5 - SSR requirement)
**Independent Test**: Server-rendered page shows correct theme before React hydrates
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/planned/WP05-ssr-support.md`

### Included Subtasks
- [ ] **T039** Create getServerTheme() utility (ssr/getServerTheme.ts) for cookie reading
- [ ] **T040** Implement inline boot script (ssr/boot-script.ts) for pre-hydration theme
- [ ] **T041** Add BootScript React component for <head> injection
- [ ] **T042** Document Next.js integration pattern (app/layout.tsx)
- [ ] **T043** Document Remix integration pattern (root.tsx)
- [ ] **T044** Write tests for boot script (JSDOM, simulate SSR environment)
- [ ] **T045** Write integration tests (verify no flash during hydration)
- [ ] **T046** Add Storybook story simulating SSR scenario

### Constitutional Alignment
- **Principle VI**: Performance (zero visual flash, instant theme on first paint)
- **Principle VIII**: Developer experience (clear integration docs for SSR frameworks)
- **Principle XI**: Documentation (SSR patterns for Next.js, Remix)

### Implementation Notes
- Boot script must execute synchronously before any CSS loads
- Script size critical (<1KB minified) - no dependencies
- Cookie parsing must match CookieThemeStorage format exactly
- Fallback: cookie → system preference → 'light' default
- Script sets data-theme/data-brand attributes on <html> immediately

### Parallel Opportunities
- T042 and T043 can proceed in parallel (independent framework docs)
- T044, T045, T046 can proceed after T039-T041 complete

### Dependencies
- Requires WP04 (cookie format definition from CookieThemeStorage)
- Requires WP03 (ThemeProvider hydration behavior)

### Risks & Mitigations
- Script execution order → Document clear <head> placement instructions
- Cookie parsing mismatch → Share parsing logic, add validation tests
- SSR framework differences → Provide patterns for top 3 frameworks
- Hydration mismatch warning → Ensure ThemeProvider reads from HTML attributes

**Success Criteria**:
- ✅ Boot script <1KB minified
- ✅ Correct theme visible before React loads (verify with network throttling)
- ✅ No React hydration warnings
- ✅ Zero visual flash measured in Lighthouse
- ✅ Works in Next.js app router, Remix, and plain SSR

---

## Work Package WP06: ThemeToggle Component & Accessibility

**Goal**: Build optional ThemeToggle UI component with full accessibility support
**Priority**: P1 (User Story 1 - theme selection UI)
**Independent Test**: ThemeToggle renders, switches themes, meets WCAG 2.1 AA, keyboard accessible
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/planned/WP06-theme-toggle.md`

### Included Subtasks
- [ ] **T047** Create ThemeToggle component (components/ThemeToggle.tsx)
- [ ] **T048** Implement accessibility (ARIA labels, keyboard navigation, focus management)
- [ ] **T049** Add reduced-motion transitions
- [ ] **T050** Support configuration props (showLabel, position, variants)
- [ ] **T051** Style using F01 components (Button from design-system)
- [ ] **T052** Write unit tests (user interactions, accessibility)
- [ ] **T053** Write accessibility tests (axe-core integration)
- [ ] **T054** Add Storybook stories (all configurations, keyboard demo)
- [ ] **T055** Run Chromatic visual regression tests

### Constitutional Alignment
- **Principle IV**: Accessibility tests with axe-core (WCAG 2.1 AA)
- **Principle VI**: Respects prefers-reduced-motion
- **Principle VII**: Consistent with F01 design system patterns

### Implementation Notes
- Use F01 Button component as base (ensures consistency)
- ARIA: `role="button"`, `aria-label="Switch to {opposite} mode"`, `aria-pressed`
- Keyboard: Enter/Space to toggle, Tab for focus navigation
- Reduced motion: Disable transitions when prefers-reduced-motion: reduce
- Optional configurations: showLabel (boolean), position ('inline' | 'fixed'), variants (array of mode/brand combos)
- **Note**: Consider creating ADRs (T072-T074) after WP05 completes to document decisions while context is fresh, rather than deferring to WP08

### Parallel Opportunities
- T052 and T053 can proceed in parallel (different test types)
- T054 and T055 sequential (Chromatic runs on Storybook)

### Dependencies
- Requires WP03 (useTheme hook)
- Requires F01 design-system for Button component

### Risks & Mitigations
- F01 Button API changes → Pin F01 version, document peer dependency
- Accessibility edge cases → Comprehensive testing with screen readers
- Position prop conflicts with app layout → Document CSS requirements

**Success Criteria**:
- ✅ ThemeToggle switches theme on click/Enter/Space
- ✅ axe-core reports zero violations
- ✅ Keyboard navigable (Tab focus, Enter/Space activates)
- ✅ Screen reader announces current mode and action
- ✅ Transitions disabled when prefers-reduced-motion
- ✅ Chromatic visual regression tests pass

---

## Work Package WP07: Contrast Validation & CI Integration

**Goal**: Implement WCAG 2.1 AA contrast validation with CI enforcement for core themes
**Priority**: P1 (User Story 4 - accessibility compliance)
**Independent Test**: Validation script detects contrast failures, CI fails for non-compliant themes
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/planned/WP07-contrast-validation.md`

### Included Subtasks
- [ ] **T056** Implement WCAG contrast calculation (validation/wcag-utils.ts)
- [ ] **T057** Create validateThemeContrast() function (validation/validateContrast.ts)
- [ ] **T058** Define semantic token pair rules (which combinations to check)
- [ ] **T059** Implement CI validation script (scripts/validate-themes.ts)
- [ ] **T060** Add development-mode console warnings in ThemeProvider
- [ ] **T061** Write unit tests for contrast calculations (edge cases, color formats)
- [ ] **T062** Write integration tests (validate light/dark themes pass)
- [ ] **T063** Add CI workflow step for theme validation
- [ ] **T064** Document validation utility usage for products in README

### Constitutional Alignment
- **Principle IV**: Comprehensive testing (contrast edge cases)
- **Principle V**: Accessibility as security (legal/ethical requirement)
- **Principle X**: CI enforcement (merge gate for core themes)
- **Principle XI**: Documentation (how products validate custom brands)

### Implementation Notes
- WCAG formula: (lighter + 0.05) / (darker + 0.05)
- Ratios: 4.5:1 for normal text, 3:1 for large text (18pt+) and UI components
- Semantic pairs to check: text.primary/background.canvas, text.primary/background.surface, state.error.fg/background.surface, etc.
- CI script validates ALL mode×brand combinations
- Dev mode warnings: log violations to console.warn (non-blocking)
- Export validateThemeContrast for product use

### Parallel Opportunities
- T061 and T062 can proceed in parallel (different test scopes)
- T063 and T064 can proceed after T056-T060 complete

### Dependencies
- Requires WP02 (theme definitions to validate)
- Requires WP03 (ThemeProvider for dev warnings integration)

### Risks & Mitigations
- Color format edge cases (rgb, hsl, hex) → Support all CSS color formats
- False positives → Allow configurable rules per token category
- CI performance → Target <5 seconds, cache parsed tokens
- Custom brand failures → Clear error messages with suggested fixes

**Success Criteria**:
- ✅ `validateThemeContrast(lightTheme)` returns pass for all core pairs
- ✅ `validateThemeContrast(darkTheme)` returns pass for all core pairs
- ✅ Script detects intentionally broken theme (test fixture)
- ✅ CI fails when core theme has contrast violation
- ✅ Dev mode logs specific failing token pairs
- ✅ Validation completes in <5 seconds

---

## Work Package WP08: Documentation & Examples

**Goal**: Comprehensive documentation, Storybook stories, and example implementations
**Priority**: P2 (Developer experience - User Story 3 support)
**Independent Test**: Developer follows quickstart in <10 minutes, examples run successfully
**Prompt**: `kitty-specs/028-theme-support-brand/tasks/planned/WP08-documentation.md`

### Included Subtasks
- [ ] **T065** Write comprehensive README.md (architecture, API, quickstart)
- [ ] **T066** [P] Create Storybook MDX pages (token reference, brand creation guide)
- [ ] **T067** [P] Create example: basic integration (packages/theme-system/examples/basic/)
- [ ] **T068** [P] Create example: custom brand theme (examples/custom-brand/)
- [ ] **T069** [P] Create example: SSR integration (examples/ssr-next/)
- [ ] **T070** Document F01 component migration guide (primitives → semantic tokens)
- [ ] **T071** Document B12 integration setup (backend requirements)
- [ ] **T072** Create ADR for semantic token layer architecture decision
- [ ] **T073** Create ADR for cookie-based SSR strategy
- [ ] **T074** Create ADR for hierarchical brand inheritance model
- [ ] **T075** Add troubleshooting section to README (common issues, fixes)
- [ ] **T076** Record demo video for Storybook (theme switching, brand customization)

### Constitutional Alignment
- **Principle VIII**: Developer experience (easy setup, clear examples)
- **Principle XI**: Documentation in-repo, ADRs for major decisions
- **Principle III**: Extension guides for proper usage patterns

### Implementation Notes
- README sections: Overview, Quickstart (<10 min), API Reference, Migration Guide, Troubleshooting
- Storybook MDX: Token reference table, Brand creation walkthrough, SSR integration steps
- Examples must be runnable (`pnpm install && pnpm dev`)
- ADRs capture: Problem, Decision, Rationale, Alternatives Considered, Consequences
- Migration guide: Before/After code snippets for F01 components
- **Recommended**: If ADRs (T072-T074) were created after WP05, review and finalize them here; otherwise create them fresh with full implementation context

### Parallel Opportunities
- T066, T067, T068, T069 can proceed in parallel (independent docs/examples)
- T072, T073, T074 can proceed in parallel (independent ADRs)
- T075 and T076 can proceed after core features complete

### Dependencies
- Requires WP01-WP07 (all features implemented)
- References quickstart.md from planning phase

### Risks & Mitigations
- Documentation drift → Link examples in CI tests
- Examples break with updates → Include in CI test suite
- Quickstart >10 minutes → User test with fresh developer

**Success Criteria**:
- ✅ README.md is comprehensive (covers all public APIs)
- ✅ Quickstart verified by new developer in <10 minutes
- ✅ All examples run successfully
- ✅ 3 ADRs document major architecture decisions
- ✅ Migration guide has clear before/after examples
- ✅ Troubleshooting covers 5+ common issues

---

## Summary

### Work Package Overview

| WP | Title | Priority | Subtasks | Est. Effort |
|----|-------|----------|----------|-------------|
| WP01 | Package Scaffold & Build Infrastructure | P0 | T001-T011 (11) | 1-2 days |
| WP02 | Theme Contract & Token Foundations | P0 | T012-T019 (8) | 2-3 days |
| WP03 | ThemeProvider & Core Hooks | P1 | T020-T028 (9) | 2-3 days |
| WP04 | Storage Adapters & Persistence | P1 | T029-T038 (10) | 2-3 days |
| WP05 | SSR Support & Flash Prevention | P2 | T039-T046 (8) | 1-2 days |
| WP06 | ThemeToggle Component & Accessibility | P1 | T047-T055 (9) | 2-3 days |
| WP07 | Contrast Validation & CI Integration | P1 | T056-T064 (9) | 2-3 days |
| WP08 | Documentation & Examples | P2 | T065-T076 (12) | 2-3 days |

**Total**: 8 work packages, 76 subtasks, ~14-22 days effort

### Parallelization Opportunities

- **WP01**: T002-T006 (configuration files), T009-T010 (Storybook/Chromatic)
- **WP02**: T014-T015 (light/dark themes)
- **WP04**: T030-T032 (storage adapters)
- **WP08**: T066-T069 (docs/examples), T072-T074 (ADRs)

### Critical Path

```
WP01 → WP02 → WP03 → WP04 → WP05
                 ↓      ↓
                WP06   WP07
                 ↓      ↓
                   WP08
```

**MVP Scope** (User Story 1 - Basic theme switching):
- WP01: Package scaffold
- WP02: Theme contracts (light/dark only)
- WP03: ThemeProvider + useTheme
- WP04: Cookie + localStorage adapters (skip B12)
- WP06: ThemeToggle component (basic version)

**Estimated MVP**: ~8-12 days

### Dependencies

**External**:
- F01 (@django-core/design-system) - primitive tokens (critical)
- @django-core/api-client - B12 integration (optional)
- React 18.x, vanilla-extract, Vitest (peer dependencies)

**Internal**:
- WP02 requires WP01
- WP03-WP07 require WP02
- WP04-WP06 can proceed in parallel after WP03
- WP08 requires all features complete

### Acceptance Criteria

**F07 is complete when**:
- ✅ All 8 work packages delivered
- ✅ Core themes (light/default, dark/default) pass WCAG 2.1 AA validation in CI
- ✅ ThemeProvider + useTheme documented and tested (>90% coverage)
- ✅ Storage adapters pass contract tests
- ✅ SSR boot script prevents visual flash
- ✅ ThemeToggle component accessible (axe-core zero violations)
- ✅ Quickstart guide verified <10 minutes
- ✅ All Chromatic visual regression tests pass
- ✅ CI enforces: lint, typecheck, test, contrast validation
- ✅ 3 ADRs document major architecture decisions

### Risk Register

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| F01 primitives incomplete | High | Document gaps, use placeholders | WP02 |
| vanilla-extract build issues | Medium | Reference F01/F05 configs | WP01 |
| SSR framework diversity | Medium | Provide patterns for top 3 | WP05 |
| B12 API unavailable | Low | Non-blocking, graceful fallback | WP04 |
| Contrast validation false positives | Medium | Configurable rules, clear errors | WP07 |
| Documentation drift | Medium | Link examples in CI tests | WP08 |

### Next Steps

1. **Review this plan** with stakeholders
2. **Generate work package prompts**: Run task generation to create detailed WP01-WP08 prompt files in `kitty-specs/028-theme-support-brand/tasks/planned/`
3. **Start MVP implementation**: Begin with WP01 (scaffold)
4. **Iterate**: Move work packages through `planned → doing → for_review → done` lanes

---

**Generated**: 2025-12-13
**Feature**: 028-theme-support-brand
**Branch**: `028-theme-support-brand`
**Next Command**: Generate work package prompts (automated by tasks workflow)
