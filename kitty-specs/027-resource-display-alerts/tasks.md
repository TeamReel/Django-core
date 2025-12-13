# Task Breakdown: F05 Resource Display & Alerts

**Feature**: 027-resource-display-alerts
**Package**: `@django-core/resource-alerts`
**Generated**: 2025-12-12
**Total Work Packages**: 7

## Overview

This document breaks down the implementation of F05 Resource Display & Alerts into 7 work packages. Each work package is independently implementable and maps to specific user stories or infrastructure needs.

**Implementation Approach**:
- Start with WP01 (package scaffold) to establish infrastructure
- Proceed with WP02-WP05 (component implementation) in priority order
- Complete with WP06 (documentation) and WP07 (polish/accessibility)
- Each work package has a corresponding detailed prompt in `tasks/planned/`

**Testing Strategy**:
- Unit tests with Vitest + React Testing Library (>90% coverage target)
- Visual regression tests with Chromatic for all Storybook stories
- Accessibility tests with axe-core (zero critical violations)
- Integration tests for key flows (alert dismissal, localStorage persistence)

---

## Work Package Summary

| ID | Title | Priority | User Story | Subtasks | Prompt |
|----|-------|----------|------------|----------|--------|
| WP01 | Package Scaffold & Infrastructure | P0 (Setup) | - | 8 | ✅ [WP01-package-scaffold.md](tasks/done/WP01-package-scaffold.md) |
| WP02 | Alert Component & localStorage Integration | P1 | US2 | 6 | ✅ [WP02-alert-component.md](tasks/done/WP02-alert-component.md) |
| WP03 | Resource Usage Bar Component | P1 | US1 | 5 | ✅ [WP03-resource-usage-bar.md](tasks/done/WP03-resource-usage-bar.md) |
| WP04 | Health Status & Badge Components | P2 | US3 | 6 | [WP04-health-status-badge.md](tasks/planned/WP04-health-status-badge.md) |
| WP05 | Compound ResourceCard & AlertStack | P2 | US5 | 7 | [WP05-compound-components.md](tasks/planned/WP05-compound-components.md) |
| WP06 | Optional Data Hooks & TypeScript Contracts | P2 | - | 5 | [WP06-data-hooks.md](tasks/planned/WP06-data-hooks.md) |
| WP07 | Documentation, Storybook & Accessibility Polish | P3 | US4 | 6 | [WP07-docs-accessibility.md](tasks/planned/WP07-docs-accessibility.md) |

**Total Subtasks**: 43

---

## Setup Phase

### WP01: Package Scaffold & Infrastructure

**Goal**: Establish monorepo package structure, build configuration, and testing infrastructure.

**Priority**: P0 (Must complete first)

**Independent Test**: `pnpm build` succeeds and generates dist/ with type definitions.

**Included Subtasks**:
- [ ] T001: Create package directory structure (`packages/resource-display-alerts/`)
- [ ] T002: Set up package.json with dependencies (React 18, F01, api-client)
- [ ] T003: Configure Vite for library mode with ESM/CJS outputs
- [ ] T004: Set up TypeScript (tsconfig.json with strict mode)
- [ ] T005: Configure Vitest + React Testing Library
- [ ] T006: Set up Storybook configuration (reuse F01 shared config)
- [ ] T007: Create src/index.ts with barrel exports
- [ ] T008: Add package to monorepo workspace (pnpm-workspace.yaml)

**Implementation Sketch**:
1. Create directory: `packages/resource-display-alerts/`
2. Copy/adapt build configs from F01 design system package
3. Install dependencies: react, react-dom (peer), @django-core/design-system, @django-core/api-client
4. Configure Vite library mode with externalized peer dependencies
5. Set up test environment with jsdom + Vitest
6. Verify build produces clean dist/ output with .d.ts files

**Parallel Opportunities**: None (foundational work)

**Dependencies**: None

**Risks**:
- Vite config complexity for library mode - **Mitigation**: Copy proven config from F01
- Peer dependency version conflicts - **Mitigation**: Match F01's React 18.x peer dep range

**Prompt**: See [tasks/planned/WP01-package-scaffold.md](tasks/planned/WP01-package-scaffold.md)

---

## Foundational Phase

### WP02: Alert Component & localStorage Integration

**Goal**: Implement Alert component (wrapping F01's Alert) with localStorage-backed dismissal using `useAlertDismissal` hook.

**Priority**: P1 (Core functionality, maps to User Story 2)

**User Story**: US2 - Dismiss and Hide Alerts

**Independent Test**: Render Alert, click dismiss, verify it disappears and preference is saved to localStorage. Reload page, verify alert stays hidden.

**Included Subtasks**:
- [ ] T009: Re-export F01 Alert component from F05 package
- [ ] T010: Create localStorage utility module (getItem/setItem/removeItem with error handling)
- [ ] T011: Implement useAlertDismissal hook (isDismissed, dismiss, dismissForever, reset)
- [ ] T012: Write unit tests for localStorage utilities (100% coverage)
- [ ] T013: Write integration test for alert dismissal flow
- [ ] T014: Create Storybook stories (dismissible, never show again, localStorage demo)

**Implementation Sketch**:
1. Create `src/components/Alert/index.ts` that re-exports F01's Alert
2. Create `src/utils/localStorage.ts` with type-safe wrappers
3. Implement `src/hooks/useAlertDismissal.ts`:
   - Check localStorage on mount for `django_core_alert_${alertId}`
   - Provide dismiss() and dismissForever() callbacks
   - Handle localStorage unavailable gracefully
4. Write tests with mocked localStorage
5. Create Storybook story showing dismissal + preference persistence

**Parallel Opportunities**: [P] Can be developed in parallel with WP03/WP04 after WP01 completes

**Dependencies**: WP01 (package scaffold must exist)

**Risks**:
- localStorage unavailable in some browsers (private mode) - **Mitigation**: Graceful degradation already in design
- localStorage quota exceeded - **Mitigation**: Small data footprint (<1KB per alert), utility handles QuotaExceededError

**Prompt**: See [tasks/planned/WP02-alert-component.md](tasks/planned/WP02-alert-component.md)

---

## Component Implementation Phase

### WP03: Resource Usage Bar Component

**Goal**: Implement ResourceUsageBar component showing usage percentage with severity-based colors.

**Priority**: P1 (Core functionality, maps to User Story 1)

**User Story**: US1 - View Resource Usage Near Limits

**Independent Test**: Render ResourceUsageBar with value=85, max=100, verify warning-level color and "85%" label displayed.

**Included Subtasks**:
- [ ] T015: Create ResourceUsageBar component with props interface
- [ ] T016: Implement percentage calculation logic (component accepts severity as explicit prop; optional calculateSeverityFromUsage helper utility for convenience)
- [ ] T017: Style with F01 tokens (colors from severity, spacingVars for padding)
- [ ] T018: Add ARIA attributes (aria-valuenow, aria-valuemin, aria-valuemax, role="progressbar")
- [ ] T019: Write unit tests (percentage calc, color mapping, edge cases)
- [ ] T020: Create Storybook stories (low/medium/high usage, edge cases: 0%, 100%, >100%)

**Implementation Sketch**:
1. Create `src/components/ResourceUsageBar/ResourceUsageBar.tsx`
2. Props: value (number), max (number), label (string), unit? (string), showPercentage? (boolean)
3. Calculate percentage: `(value / max) * 100`
4. Map percentage to severity:
   - 0-50%: 'low' → success color (green)
   - 50-80%: 'medium' → warning color (yellow)
   - 80-100%: 'high' → error color (red)
5. Use F01 colorVars.palette.[severity] for progress bar fill
6. Render: label + progress bar + value text (or percentage if showPercentage=true)

**Parallel Opportunities**: [P] Can be developed in parallel with WP02/WP04 after WP01 completes

**Dependencies**: WP01 (package scaffold must exist)

**Risks**:
- Color-only severity may not be accessible - **Mitigation**: US4 requires icons/patterns in addition to color (WP07 will add)

**Prompt**: See [tasks/done/WP03-resource-usage-bar.md](tasks/done/WP03-resource-usage-bar.md) ✅ **DONE**

---

### WP04: Health Status & Badge Components

**Goal**: Implement HealthStatus indicator and Badge components for system health visualization.

**Priority**: P2 (Maps to User Story 3)

**User Story**: US3 - Visual Status Indicators for System Health

**Independent Test**: Render HealthStatus with status="degraded", verify yellow icon and "Degraded" label appear.

**Included Subtasks**:
- [ ] T021: Create HealthStatus component with status enum (healthy/degraded/unhealthy/unknown)
- [ ] T022: Map status to F01 color tokens (success/warning/error/neutral)
- [ ] T023: Add status icons (checkmark, warning, error, question mark)
- [ ] T024: Create Badge component (count display with optional color variant)
- [ ] T025: Write unit tests for both components
- [ ] T026: Create Storybook stories (all health states, badge variants)

**Implementation Sketch**:
1. Create `src/components/HealthStatus/HealthStatus.tsx`
2. Props: name (string), status (enum), details? (string), lastChecked? (string)
3. Status→color mapping:
   - healthy → colorVars.palette.success[500]
   - degraded → colorVars.palette.warning[500]
   - unhealthy → colorVars.palette.error[500]
   - unknown → colorVars.palette.neutral[400]
4. Render: icon (○ with fill color) + name + status label + optional details
5. Create `src/components/Badge/Badge.tsx` for count badges (simpler component)

**Parallel Opportunities**: [P] Can be developed in parallel with WP02/WP03 after WP01 completes

**Dependencies**: WP01 (package scaffold must exist)

**Risks**:
- Icon library dependency - **Mitigation**: Use simple Unicode characters or inline SVG (no icon library needed)

**Prompt**: See [tasks/planned/WP04-health-status-badge.md](tasks/planned/WP04-health-status-badge.md)

---

### WP05: Compound ResourceCard & AlertStack

**Goal**: Implement ResourceCard (compound component with Header/Body/Footer) and AlertStack for managing multiple alerts.

**Priority**: P2 (Maps to User Story 5 - reusable components)

**User Story**: US5 - Reusable Components Across Products

**Independent Test**: Render ResourceCard with Header/Body/Footer children, verify layout structure and compound component context works.

**Included Subtasks**:
- [ ] T027: Create ResourceCard compound component with React.createContext
- [ ] T028: Implement ResourceCard.Header/Body/Footer subcomponents
- [ ] T029: Style with F01 spacing and Card tokens
- [ ] T030: Create AlertStack component (limit to 5 visible, auto-spacing)
- [ ] T031: Implement z-index management for stacked alerts
- [ ] T032: Write unit tests for compound component pattern + AlertStack
- [ ] T033: Create Storybook stories (composition patterns, stacked alerts)

**Implementation Sketch**:
1. Create `src/components/ResourceCard/ResourceCard.tsx`:
   - ResourceCardContext = createContext<{ variant?: 'default' | 'compact' }>()
   - ResourceCard component wraps children in context provider
   - ResourceCard.Header/Body/Footer use context and throw error if used outside parent
2. Create `src/components/AlertStack/AlertStack.tsx`:
   - Props: position ('top-center' | 'inline'), maxVisible (default: 5)
   - Render children with automatic spacing (F01 spacingVars)
   - Limit visible alerts, show "View all" link if >maxVisible
3. Style with CSS Grid for ResourceCard layout

**Parallel Opportunities**: None (requires understanding of other components first)

**Dependencies**: WP02 (Alert component), WP03 (ResourceUsageBar), WP04 (HealthStatus) for composition examples

**Risks**:
- Complex compound component pattern - **Mitigation**: Follow React Context best practices, research.md documents pattern

**Prompt**: See [tasks/planned/WP05-compound-components.md](tasks/planned/WP05-compound-components.md)

---

## Integration Phase

### WP06: Optional Data Hooks & TypeScript Contracts

**Goal**: Implement optional polling hooks (useResourceUsage, useHealthStatus) and finalize TypeScript contracts for B11/B18 integration.

**Priority**: P2 (Optional feature, enhances integration story)

**Independent Test**: Call useResourceUsage with mock API endpoint, verify polling occurs at specified interval and data updates component props.

**Included Subtasks**:
- [ ] T034: Implement useResourceUsage hook (polling with configurable interval, default: 30000ms/30s)
- [ ] T035: Implement useHealthStatus hook (polling with configurable interval, default: 30000ms/30s)
- [ ] T036: Use @django-core/api-client for CSRF-protected fetches
- [ ] T037: Add error handling and loading states to hooks
- [ ] T038: Write unit tests with mocked fetch/timers
- [ ] T039: Create Storybook stories demonstrating hook usage with mock API

**Implementation Sketch**:
1. Create `src/hooks/useResourceUsage.ts`:
   - Props: endpoint (string), pollInterval? (number, default: 30000ms)
   - Use useEffect + setInterval for polling
   - Return: { data: ResourceUsageData | null, isLoading: boolean, error: Error | null }
2. Create `src/hooks/useHealthStatus.ts` (similar pattern)
3. Use @django-core/api-client's fetch wrapper for CSRF handling
4. Add cleanup (clearInterval) on unmount
5. Write tests with fake timers (vi.useFakeTimers)

**Parallel Opportunities**: [P] Can be developed in parallel with WP05/WP07

**Dependencies**: WP01 (package scaffold), contracts already defined in Phase 1

**Risks**:
- Polling may cause performance issues - **Mitigation**: Configurable interval, clear documentation on when to use
- Memory leaks from intervals - **Mitigation**: Proper cleanup in useEffect return

**Prompt**: See [tasks/planned/WP06-data-hooks.md](tasks/planned/WP06-data-hooks.md)

---

## Polish Phase

### WP07: Documentation, Storybook & Accessibility Polish

**Goal**: Complete package README, comprehensive Storybook documentation, and ensure WCAG 2.1 AA compliance.

**Priority**: P3 (Polish, maps to User Story 4)

**User Story**: US4 - Accessible Alert Presentation

**Independent Test**: Run axe-core on all Storybook stories, verify zero critical violations. Test with screen reader, verify ARIA announcements work.

**Included Subtasks**:
- [ ] T040: Write comprehensive package README.md (installation, usage, API reference)
- [ ] T041: Create Storybook "Getting Started" documentation page
- [ ] T042: Add composition pattern stories (ResourceCard with multiple components)
- [ ] T043: Run axe-core accessibility audits on all components
- [ ] T044: Add ARIA labels, live regions, keyboard navigation where missing
- [ ] T045: Verify prefers-reduced-motion CSS works (test animations disable)
- [ ] T046: Create troubleshooting guide (localStorage issues, TypeScript errors)

**Implementation Sketch**:
1. Write README.md covering:
   - Installation instructions
   - Quick start examples
   - Component API reference (all props)
   - TypeScript usage examples
   - Browser support matrix
2. Add Storybook MDX documentation pages:
   - Getting Started (installation + first component)
   - Composition Patterns (ResourceCard + HealthStatus + ResourceUsageBar)
   - B11/B18 Integration (using contracts + normalization utilities)
3. Run axe-core in Storybook addon:
   - Fix any critical/serious violations
   - Document any known minor issues
4. Test with NVDA/VoiceOver screen readers:
   - Verify ARIA live region announcements
   - Verify dismiss button labels

**Parallel Opportunities**: [P] Can be developed in parallel with WP06

**Dependencies**: WP02-WP05 (all components must exist for documentation)

**Risks**:
- Accessibility fixes may require component refactoring - **Mitigation**: Run axe-core early, address issues incrementally

**Prompt**: See [tasks/planned/WP07-docs-accessibility.md](tasks/planned/WP07-docs-accessibility.md)

---

## MVP Scope Recommendation

**Minimum Viable Package** (for initial release):
- WP01: Package Scaffold ✅ (required)
- WP02: Alert Component ✅ (core user story US2)
- WP03: Resource Usage Bar ✅ (core user story US1)

**Rationale**: These 3 work packages deliver the primary value prop (resource usage visualization + dismissible alerts) with full TypeScript support and basic Storybook documentation. Components WP04-WP07 enhance the offering but aren't critical for initial adoption.

**Deferrable to v1.1**:
- WP04: Health Status & Badge (nice-to-have for US3)
- WP05: Compound Components (advanced composition, US5)
- WP06: Optional Data Hooks (convenience feature)
- WP07: Full Documentation (can iterate post-MVP)

---

## Parallelization Strategy

**Phase 1** (after WP01 completes):
- WP02 (Alert) 🔀 WP03 (ResourceUsageBar) 🔀 WP04 (HealthStatus/Badge)
- All can be developed independently, only requiring package scaffold

**Phase 2** (after WP02-WP04 complete):
- WP05 (Compound Components) → depends on WP02/WP03/WP04 for composition
- WP06 (Data Hooks) 🔀 WP07 (Documentation)

**Estimated Timeline** (single developer):
- WP01: 4-6 hours
- WP02-WP04: 6-8 hours each (can parallelize with multiple devs)
- WP05: 8-10 hours
- WP06: 4-6 hours
- WP07: 6-8 hours

**Total**: ~45-60 hours for complete implementation

---

## Completion Checklist

### Pre-Implementation
- [x] All Phases 0-2 complete (research, contracts, agent context)
- [ ] Work package prompts generated (see tasks/planned/)
- [ ] Team assigned to work packages

### Implementation Gates
- [ ] WP01 complete → pnpm build succeeds, tests run
- [ ] WP02-WP04 complete → Core components render + pass tests
- [ ] WP05 complete → Compound components work in Storybook
- [ ] WP06 complete → Hooks fetch data correctly
- [ ] WP07 complete → All accessibility checks pass

### Quality Gates
- [ ] All unit tests pass (>90% coverage)
- [ ] All Chromatic snapshots approved
- [ ] Zero critical axe-core violations
- [ ] Bundle size <20KB gzipped
- [ ] TypeScript compiles with zero errors (strict mode)
- [ ] All ESLint + Prettier checks pass

### Documentation Gates
- [ ] README.md complete with usage examples
- [ ] All Storybook stories published
- [ ] quickstart.md validated against actual package
- [ ] Integration guide for B11/B18 verified

### Deployment
- [ ] Package published to npm (or internal registry)
- [ ] Version tagged in git (e.g., v1.0.0)
- [ ] CHANGELOG.md updated
- [ ] Documentation site updated (if applicable)

---

## Next Steps

1. **Review this task breakdown** with team for feedback
2. **Assign work packages** to developers based on expertise
3. **Start with WP01** (Package Scaffold) to unblock parallel work
4. **Use prompts in `tasks/planned/`** for detailed implementation guidance
5. **Move completed work packages** from `planned/` → `doing/` → `for_review/` → `done/`

**Suggested Command**: Begin implementation with `/spec-kitty.implement WP01` or manually start work on WP01 using the generated prompt.
