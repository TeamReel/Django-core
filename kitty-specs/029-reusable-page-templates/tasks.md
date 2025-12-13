# Task Breakdown: Reusable Page Templates
*Path: [kitty-specs/029-reusable-page-templates/tasks.md](kitty-specs/029-reusable-page-templates/tasks.md)*

**Feature**: F08 - Reusable Page Templates (`@django-core/page-templates`)
**Branch**: `029-reusable-page-templates`
**Generated**: 2025-12-13

## Overview

This document breaks down the implementation of F08 Reusable Page Templates into 8 work packages containing 52 atomic subtasks. Each work package is independently implementable and maps to user stories or infrastructure themes.

**Scope**: Build 4 reusable page templates (Dashboard, List-Detail, Wizard, Settings) with centralized state UI, compound component architecture, hybrid controlled/uncontrolled state management, and comprehensive Storybook documentation.

**Estimated Effort**: 8-10 days for experienced React/TypeScript developer

---

## Work Package Summary

| ID | Work Package | Priority | Subtasks | Dependencies |
|----|--------------|----------|----------|--------------|
| WP01 | Infrastructure Setup | P0 | 6 | None |
| WP02 | Common Utilities & State Components | P0 | 8 | WP01 |
| WP03 | Dashboard Template (User Story 1) | P1 | 7 | WP02 |
| WP04 | List-Detail Template (User Story 2) | P1 | 7 | WP02 |
| WP05 | Wizard Template (User Story 3) | P2 | 8 | WP02 |
| WP06 | Settings Template (User Story 4) | P2 | 6 | WP02 |
| WP07 | State Override System (User Story 5) | P3 | 4 | WP03, WP04, WP05, WP06 |
| WP08 | Integration, Examples & Documentation | P3 | 6 | WP03-WP07 |

**Total Subtasks**: 52

---

## Phase 0: Foundation Setup

### WP01: Infrastructure Setup
**Priority**: P0 (Blocking)
**Goal**: Create package structure, build tooling, and testing infrastructure
**Prompt**: [tasks/planned/WP01-infrastructure-setup.md](tasks/planned/WP01-infrastructure-setup.md)

**Success Criteria**:
- Package builds successfully with TypeScript strict mode
- Vitest runs and finds test files
- Storybook starts and displays placeholder story
- ESLint and Prettier configured and passing

**Subtasks**:
- [X] T001: Create `packages/page-templates/` directory structure with src/, tests/, stories/
- [X] T002: Initialize package.json with dependencies (React 18, TypeScript 5, Vite, Vitest, Storybook 8)
- [X] T003: Configure TypeScript (tsconfig.json with strict mode, React JSX)
- [X] T004: Configure Vite build (vite.config.ts for library mode)
- [X] T005: Configure Vitest (vitest.config.ts with React Testing Library)
- [X] T006: Configure Storybook 8 (.storybook/main.ts, preview.ts with F01/F07 theme integration)

**Implementation Notes**:
- Package must be added to monorepo pnpm workspace
- Peer dependencies: `@django-core/design-system`, `@django-core/layouts`, `react`, `react-dom`
- Dev dependencies: All build/test tooling
- Bundle target: ESM + CJS for compatibility

**Risks**:
- Storybook 8 configuration may conflict with existing monorepo Storybook setups
- F01/F06 peer dependency versions must be compatible

**Parallelization**: T001-T006 can be done in sequence (each builds on previous)

---

### WP02: Common Utilities & State Components
**Priority**: P0 (Blocking)
**Goal**: Build shared utilities and centralized default state UI used by all templates
**Prompt**: [tasks/planned/WP02-common-utilities-state.md](tasks/planned/WP02-common-utilities-state.md)

**Success Criteria**:
- `useControlledState` hook works for both controlled and uncontrolled modes
- All 5 default state components render correctly in Storybook
- TypeScript interfaces exported and validated
- 80%+ test coverage for hooks and state components

**Subtasks**:
- [X] T007: Create common TypeScript types (src/types/index.ts: `TemplateLoadingState`, `StateRenderProps`, `ResponsiveProps`, `A11yProps`)
- [X] T008 [P]: Implement `useControlledState` hook with tests (src/hooks/useControlledState.ts)
- [X] T009 [P]: Implement `useResponsive` hook with F06 breakpoint integration (src/hooks/useResponsive.ts)
- [X] T010 [P]: Implement `useKeyboardNavigation` hook for list/settings (src/hooks/useKeyboardNavigation.ts)
- [X] T011 [P]: Create `DefaultLoading` component (src/components/states/DefaultLoading.tsx)
- [X] T012 [P]: Create `DefaultEmpty` component with action slot (src/components/states/DefaultEmpty.tsx)
- [X] T013 [P]: Create `DefaultError` component with retry button (src/components/states/DefaultError.tsx)
- [X] T014 [P]: Create `DefaultPermissionDenied` component (src/components/states/DefaultPermissionDenied.tsx)

**Implementation Notes**:
- All default state components must use ONLY F01 primitives
- Copy should be generic and product-agnostic
- Each state component needs Storybook story in stories/states/DefaultStates.stories.tsx
- `useControlledState` pattern:
  ```tsx
  const [value, setValue] = useControlledState(
    controlledValue,  // undefined if uncontrolled
    defaultValue,
    onChange
  );
  ```

**Risks**:
- F06 breakpoint API may not be stable yet
- Default state copy needs careful wording to stay generic

**Parallelization**: T008-T014 can be done in parallel (independent components/hooks)

---

## Phase 1: Core Templates (P1 User Stories)

### WP03: Dashboard Template (User Story 1)
**Priority**: P1
**Goal**: Implement Dashboard template with header, filter bar, and responsive grid
**Prompt**: [tasks/planned/WP03-dashboard-template.md](tasks/planned/WP03-dashboard-template.md)

**Success Criteria**:
- Dashboard renders with all 4 structural regions (main, header, filter bar, grid)
- Grid adapts to mobile/tablet/desktop breakpoints automatically
- All 4 page states (loading, empty, error, success) render correctly
- Storybook has 5+ stories demonstrating usage patterns
- Unit tests achieve 80%+ coverage

**Subtasks**:
- [X] T015: Create Dashboard main component with compound component pattern (src/components/Dashboard/Dashboard.tsx)
- [X] T016: Create DashboardHeader sub-component (src/components/Dashboard/DashboardHeader.tsx)
- [X] T017: Create DashboardGrid sub-component with F06 Grid integration (src/components/Dashboard/DashboardGrid.tsx)
- [X] T018: Create DashboardFilterBar sub-component with collapsible mobile behavior (src/components/Dashboard/DashboardFilterBar.tsx)
- [X] T019: Wire up state management (loading, empty, error props with render prop overrides)
- [X] T020: Write unit tests for Dashboard components (Dashboard.test.tsx, co-located tests)
- [X] T021: Create Storybook stories (stories/Dashboard.stories.tsx: basic, states, responsive, customization)

**Implementation Notes**:
- Compound component pattern:
  ```tsx
  export const Dashboard: DashboardComponent = (props) => { /* main */ };
  Dashboard.Header = DashboardHeader;
  Dashboard.Grid = DashboardGrid;
  Dashboard.FilterBar = DashboardFilterBar;
  ```
- Grid must use F06 `<Grid>` component with responsive columns
- FilterBar collapsible state uses `useControlledState` hook
- Semantic HTML: `<main>` for Dashboard, `<header>` for DashboardHeader, `<nav>` for FilterBar

**Risks**:
- F06 Grid API may require adjustments for dashboard use case
- Mobile filter bar collapse behavior needs UX validation

**Parallelization**: T016-T018 can be done in parallel after T015

---

### WP04: List-Detail Template (User Story 2)
**Priority**: P1
**Goal**: Implement List-Detail template with selection state and mobile layout switching
**Prompt**: [tasks/planned/WP04-list-detail-template.md](tasks/planned/WP04-list-detail-template.md)

**Success Criteria**:
- List and Detail areas render side-by-side on desktop
- Mobile layout shows list OR detail with navigation between views
- Selection state works in controlled and uncontrolled modes
- Independent state management for list and detail areas
- Keyboard navigation works (arrow keys, enter/space)
- Unit + integration tests achieve 80%+ coverage

**Subtasks**:
- [X] T022: Create ListDetail main component with split layout (src/components/ListDetail/ListDetail.tsx)
- [X] T023: Create ListDetailList sub-component with search support (src/components/ListDetail/ListDetailList.tsx)
- [X] T024: Create ListDetailDetail sub-component with back button (src/components/ListDetail/ListDetailDetail.tsx)
- [X] T025: Implement selection state management with `useControlledState` (selectedId, onSelectedIdChange)
- [X] T026: Implement mobile layout switching (overlay/stack modes) with responsive hooks
- [X] T027: Write unit tests for ListDetail components
- [X] T028: Create Storybook stories + integration test for list→detail→list flow (tests/integration/list-detail-flow.test.tsx)

**Implementation Notes**:
- Split ratio prop: `splitRatio={[1, 2]}` = 33% list, 67% detail
- Mobile layout modes:
  - `overlay`: Detail slides over list (full screen)
  - `stack`: List and detail stack vertically
- Use `useKeyboardNavigation` hook for list item navigation
- Semantic HTML: `<nav>` for list, `<article>` for detail

**Risks**:
- Mobile layout switching may need animation support (out of scope?)
- Selection state synchronization between controlled/uncontrolled modes needs careful testing

**Parallelization**: T023-T024 can be done in parallel after T022

---

## Phase 2: Secondary Templates (P2 User Stories)

### WP05: Wizard Template (User Story 3)
**Priority**: P2
**Goal**: Implement multi-step wizard with step indicator and navigation controls
**Prompt**: [tasks/planned/WP05-wizard-template.md](tasks/planned/WP05-wizard-template.md)

**Success Criteria**:
- Wizard supports 2-10 steps without performance degradation
- Step navigation works forward/backward with validation gates
- Step indicator shows current, completed, and upcoming steps
- Focus management transitions correctly between steps
- Navigation transitions complete in <100ms
- 100% test coverage for navigation logic

**Subtasks**:
- [X] T029: Create Wizard main component with step configuration (src/components/Wizard/Wizard.tsx)
- [X] T030: Create WizardStep sub-component (content container) (src/components/Wizard/WizardStep.tsx)
- [X] T031: Create WizardStepIndicator sub-component with 3 variants (dots, numbers, labels) (src/components/Wizard/WizardStepIndicator.tsx)
- [X] T032: Create WizardNavigation sub-component (prev/next/cancel/finish buttons) (src/components/Wizard/WizardNavigation.tsx)
- [X] T033: Implement step state management with `useControlledState` (stepIndex, onStepIndexChange)
- [X] T034: Implement focus management (focus first interactive element on step change)
- [X] T035: Write unit tests for Wizard components
- [X] T036: Create Storybook stories + integration test for wizard-navigation flow (tests/integration/wizard-navigation.test.tsx)

**Implementation Notes**:
- Step configuration type:
  ```tsx
  interface WizardStepConfig {
    id: string;
    label: string;
    description?: string;
    optional?: boolean;
    validate?: (data: unknown) => boolean | Promise<boolean>;
    icon?: React.ComponentType;
  }
  ```
- Navigation logic validates step bounds (0 <= stepIndex < steps.length)
- Step indicator variants: `dots` (simple), `numbers` (1/2/3), `labels` (full step names)
- Focus management uses `useRef` + `useEffect` to focus on step change

**Risks**:
- Async validation handling may need loading states
- Focus management across different step content types needs testing
- Step indicator layout on mobile may need responsive adjustments

**Parallelization**: T030-T032 can be done in parallel after T029

---

### WP06: Settings Template (User Story 4)
**Priority**: P2
**Goal**: Implement settings template with section navigation and responsive layout
**Prompt**: [tasks/planned/WP06-settings-template.md](tasks/planned/WP06-settings-template.md)

**Success Criteria**:
- Section navigation renders as sidebar on desktop, tabs/dropdown on mobile
- Active section prop enables deep linking
- Section switching works smoothly with keyboard navigation
- Unsaved changes indicator mechanism available (optional)
- 80%+ test coverage

**Subtasks**:
- [X] T037: Create Settings main component with section configuration (src/components/Settings/Settings.tsx)
- [X] T038: Create SettingsSection sub-component (content container) (src/components/Settings/SettingsSection.tsx)
- [X] T039: Create SettingsNavigation sub-component with responsive modes (src/components/Settings/SettingsNavigation.tsx)
- [X] T040: Implement section state management with `useControlledState` (activeSection, onActiveSectionChange)
- [X] T041: Write unit tests for Settings components
- [X] T042: Create Storybook stories + integration test for settings-navigation flow (tests/integration/settings-navigation.test.tsx)

**Implementation Notes**:
- Section configuration type:
  ```tsx
  interface SettingsSectionConfig {
    id: string;
    label: string;
    description?: string;
    icon?: React.ComponentType;
    requiredPermission?: string;
  }
  ```
- Navigation responsive modes:
  - Desktop: Sticky sidebar with section list
  - Tablet: Horizontal tabs
  - Mobile: Dropdown selector
- Use `useKeyboardNavigation` hook for section navigation (arrow keys)
- Optional unsaved changes: Accept `isDirty` prop, show visual indicator (dot on section tab)

**Risks**:
- Responsive navigation switching may need smooth transitions
- Permission-based section filtering needs clear documentation

**Parallelization**: T038-T039 can be done in parallel after T037

---

## Phase 3: Cross-Cutting Features

### WP07: State Override System (User Story 5)
**Priority**: P3
**Goal**: Validate and document state override mechanism across all templates
**Prompt**: [tasks/planned/WP07-state-override-system.md](tasks/planned/WP07-state-override-system.md)

**Success Criteria**:
- All 4 templates support overriding all 4 core states (loading, empty, error, permission-denied)
- Render prop pattern is consistent across templates
- Override content renders in correct layout position
- Documentation clearly explains override patterns
- Storybook stories demonstrate overrides for each template

**Subtasks**:
- [X] T043: Validate render prop pattern consistency across all templates (renderLoading, renderEmpty, renderError, renderPermissionDenied)
- [X] T044: Create comprehensive Storybook stories showing state overrides for each template
- [X] T045: Write integration tests for state override behavior (custom content renders correctly)
- [X] T046: Document state override patterns in quickstart.md and Storybook

**Implementation Notes**:
- Render props should return `React.ReactNode` (null, string, element, fragment all valid)
- Override content should replace default state UI completely (no wrapping)
- Layout structure preserved (state content renders in main content area)
- Example pattern:
  ```tsx
  <Dashboard
    loading={isLoading}
    renderLoading={() => <CustomSpinner />}
    renderEmpty={() => <EmptyDashboard onAction={handleCreate} />}
  />
  ```

**Risks**:
- Inconsistent render prop naming discovered late may require refactoring
- Accessibility of custom state content is consumer responsibility (needs documentation)

**Parallelization**: T043-T046 can be done in parallel (different concerns)

---

### WP08: Integration, Examples & Documentation
**Priority**: P3
**Goal**: Create example apps, finalize documentation, and ensure CI/CD integration
**Prompt**: [tasks/planned/WP08-integration-examples-docs.md](tasks/planned/WP08-integration-examples-docs.md)

**Success Criteria**:
- Example app demonstrates all 4 templates with realistic dummy data
- Package README has quick start, API reference, and composition guidelines
- Storybook publishes successfully to Chromatic
- CI pipeline runs all checks (TypeScript, ESLint, Prettier, Vitest, bundle size)
- Bundle size <15KB gzipped verified

**Subtasks**:
- [X] T047: Create example app in examples/page-templates-demo/ with all 4 templates
- [X] T048: Write comprehensive package README.md (quick start, API reference, F01/F06 integration)
- [X] T049: Configure Chromatic for visual regression testing
- [X] T050: Add CI pipeline checks (GitHub Actions or existing CI: TypeScript, ESLint, Vitest, bundle size)
- [X] T051: Validate bundle size <15KB gzipped (analyze with rollup-plugin-visualizer)
- [X] T052: Final documentation review and Storybook polish (consistent story formatting, accessibility notes)

**Implementation Notes**:
- Example app should use Next.js or Vite for realistic SPA environment
- Example app demonstrates:
  - All 4 templates
  - State overrides
  - Controlled vs uncontrolled usage
  - F01/F06/F07 integration
- Bundle size check:
  - Measure gzipped core package (dashboard, list-detail, wizard, settings, states)
  - Exclude dev dependencies and Storybook from bundle
- Chromatic setup:
  - Capture all Storybook stories
  - Threshold: 0.5% visual diff tolerance

**Risks**:
- Bundle size may exceed 15KB if F01/F06 dependencies are large (tree-shaking critical)
- Chromatic setup may require billing/account configuration

**Parallelization**: T047-T051 can be done in parallel after all templates complete

---

## MVP Scope Recommendation

**Minimum Viable Product (WP01 + WP02 + WP03)**:
- Infrastructure setup (WP01)
- Common utilities and state components (WP02)
- Dashboard template only (WP03)

This demonstrates:
- ✅ Build tooling and package structure
- ✅ Compound component pattern
- ✅ State management (default + overrides)
- ✅ F01/F06 integration
- ✅ Responsive behavior
- ✅ Storybook documentation

Can be delivered in 2-3 days and validates all core architectural decisions before building remaining templates.

---

## Parallelization Opportunities

**After WP01 (Infrastructure) completes**:
- WP02 subtasks T008-T014 (all hooks and state components)

**After WP02 (Common Utilities) completes**:
- WP03, WP04, WP05, WP06 (all templates can be built in parallel)
- Each template's sub-components can be built in parallel after main component

**After WP03-WP06 (Templates) complete**:
- WP07 and WP08 can run in parallel

**File-level parallelization** (marked with `[P]`):
- All state components (T011-T014)
- All hooks (T008-T010)
- Sub-components within each template after main component

---

## Dependencies Graph

```
WP01 (Infrastructure)
  ↓
WP02 (Common Utilities)
  ↓
  ├─→ WP03 (Dashboard)
  ├─→ WP04 (List-Detail)
  ├─→ WP05 (Wizard)
  └─→ WP06 (Settings)
       ↓
       ├─→ WP07 (State Overrides)
       └─→ WP08 (Integration & Docs)
```

**Critical Path**: WP01 → WP02 → WP03 → WP07 → WP08 (5 work packages, ~5-6 days)

---

## Next Steps

1. **Review this task breakdown** with team for scope validation
2. **Start with MVP** (WP01 + WP02 + WP03) to validate architecture
3. **Execute work packages** using individual prompt files:
   - Move prompt from `tasks/planned/` to `tasks/doing/` when starting
   - Use `/spec-kitty.implement` to execute work package
   - Move to `tasks/for_review/` when complete
   - Move to `tasks/done/` after review approval
4. **Track progress** by checking off subtasks in this file

**Suggested next command**: `/spec-kitty.implement WP01` (start with infrastructure setup)

---

## Prompt File Manifest

All work package prompts located in `tasks/planned/`:

1. ✅ [WP01-infrastructure-setup.md](tasks/planned/WP01-infrastructure-setup.md)
2. ✅ [WP02-common-utilities-state.md](tasks/planned/WP02-common-utilities-state.md)
3. ✅ [WP03-dashboard-template.md](tasks/planned/WP03-dashboard-template.md)
4. ✅ [WP04-list-detail-template.md](tasks/planned/WP04-list-detail-template.md)
5. ✅ [WP05-wizard-template.md](tasks/planned/WP05-wizard-template.md)
6. ✅ [WP06-settings-template.md](tasks/planned/WP06-settings-template.md)
7. ✅ [WP07-state-override-system.md](tasks/planned/WP07-state-override-system.md)
8. ✅ [WP08-integration-examples-docs.md](tasks/planned/WP08-integration-examples-docs.md)

Each prompt file contains detailed implementation guidance, test strategy, definition of done, and reviewer checklist for that work package.
