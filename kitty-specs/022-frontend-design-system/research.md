# Research: Frontend Design System Foundation
*Path: [kitty-specs/022-frontend-design-system/research.md](kitty-specs/022-frontend-design-system/research.md)*

**Feature Branch**: `022-frontend-design-system`
**Date**: 2025-12-05

## Research Summary

This document captures the technical decisions and research findings for the F01 Frontend Design System Foundation.

---

## Decision Log

### D1: Package Location Strategy

**Decision**: Workspace package inside Django-core monorepo at `packages/design-system/`

**Rationale**:
- Co-located with Django backend for atomic commits across frontend/backend changes
- Shared tooling and CI infrastructure
- Easier to maintain B14 token integration when both live in same repo
- npm/yarn workspaces enable local linking without publishing

**Alternatives Considered**:
- Separate repository: Rejected due to versioning complexity and PR fragmentation
- Subdirectory in `src/`: Rejected as it would mix Python and Node.js concerns

---

### D2: Styling Approach

**Decision**: vanilla-extract (zero-runtime CSS-in-TypeScript)

**Rationale**:
- Zero runtime overhead — all CSS extracted at build time
- Type-safe token consumption — TypeScript catches typos and invalid values
- Theme contracts map to CSS custom properties — enables B14 interoperability
- Tree-shakeable — unused styles don't ship to production
- Works well with Vite via `@vanilla-extract/vite-plugin`

**Alternatives Considered**:
- CSS Modules: Less type-safety, no built-in theming abstraction
- Emotion/styled-components: Runtime overhead, larger bundle
- Tailwind CSS: Utility-first doesn't align with design token architecture

---

### D3: B14 Integration Strategy

**Decision**: Shared tokens only via CSS custom properties

**Rationale**:
- B14 remains simple server-rendered Django templates
- Visual consistency achieved through shared design tokens (colors, spacing, typography)
- No React hydration complexity in Django templates
- Standalone CSS file exported for B14 consumption
- Clear separation: F01 for React SPAs, B14 for server-rendered pages

**Alternatives Considered**:
- React islands: Added complexity, hydration issues, not needed for B14's use cases
- Parallel systems: Would lead to visual inconsistency over time

---

### D4: Build Tooling

**Decision**: Vite in library mode

**Rationale**:
- Native ESM support with fast HMR for development
- Library mode produces ESM and CJS outputs with proper tree-shaking
- Official vanilla-extract plugin available
- Works seamlessly with Storybook 8 (uses Vite by default)
- Monorepo-friendly with workspace support

**Alternatives Considered**:
- tsup: Simpler but less flexible for complex vanilla-extract builds
- Rollup: More configuration overhead for same result

---

### D5: Visual Regression Testing

**Decision**: Chromatic with Storybook integration

**Rationale**:
- Official Storybook integration — minimal setup
- Cloud-based comparison with PR approval workflow
- Free tier covers core component set
- CI integration: build Storybook → publish to Chromatic → fail on unapproved changes

**Alternatives Considered**:
- Percy: More general-purpose, less Storybook-native
- Playwright visual: Self-hosted complexity, no review UI

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Styling | vanilla-extract | 1.x |
| Build | Vite | 5.x |
| Documentation | Storybook | 8.x |
| Visual Regression | Chromatic | latest |
| Unit Testing | Jest + Testing Library | latest |
| A11y Testing | axe-core | latest |
| Package Manager | pnpm (workspaces) | 8.x |

---

## Best Practices Research

### vanilla-extract Patterns

1. **Token Structure**: Define tokens in `tokens.css.ts` using `createThemeContract` + `createTheme`
2. **Component Styles**: Co-locate `.css.ts` files with components
3. **Theming**: Use `createGlobalTheme` for CSS custom property generation
4. **Responsive**: Use `@media` queries within `style()` calls
5. **Variants**: Use `recipe()` API for component variants (size, color, etc.)

### Storybook 8 Best Practices

1. **CSF3**: Use Component Story Format 3 for stories
2. **Autodocs**: Enable automatic documentation generation
3. **Controls**: Expose all props via argTypes for interactive examples
4. **A11y Addon**: Install `@storybook/addon-a11y` for accessibility panel
5. **Interactions**: Use `@storybook/test` for interaction testing

### Vite Library Mode

1. **Entry Points**: Define multiple entry points for tree-shaking (`index.ts`, `tokens.ts`)
2. **External Deps**: Mark `react`, `react-dom` as external
3. **CSS Extraction**: vanilla-extract plugin handles static CSS extraction
4. **Types**: Generate `.d.ts` files via `vite-plugin-dts`

---

## Open Items (None)

All technical decisions resolved during planning interrogation.
