# Research: Reusable Page Templates
*Path: [kitty-specs/029-reusable-page-templates/research.md](kitty-specs/029-reusable-page-templates/research.md)*

**Feature**: F08 - Reusable Page Templates
**Phase**: Phase 0 - Outline & Research
**Date**: 2025-12-13

## Research Overview

This document consolidates research findings from planning interrogation, resolving technical unknowns and establishing architectural patterns for the page templates implementation.

## Planning Decisions Ratified

### 1. Component Architecture Pattern

**Decision**: Hybrid compound components + render props

**Rationale**:
- **Compound components** for structural regions provide consistent API and discoverability
  - Example: `<Dashboard>`, `<Dashboard.Header>`, `<Dashboard.Grid>`, `<Dashboard.FilterBar>`
  - Benefits: IntelliSense completion, clear hierarchy, encapsulated styling
- **Render props** for state overrides maintain flexibility without explosion of sub-components
  - Example: `renderEmpty={() => <CustomEmptyState />}`
  - Benefits: Consumer controls rendering, no template bloat, type-safe via TypeScript

**Alternatives Considered**:
- **Pure compound components**: Too many exports (Dashboard.LoadingState, Dashboard.EmptyState, etc.)
- **Pure slot props**: Less discoverable, no structural enforcement
- **Pure render props**: Verbose for basic usage, steeper learning curve

**Implementation Notes**:
- Each template exports main component + structural sub-components
- State overrides use `render*` pattern: `renderLoading`, `renderEmpty`, `renderError`, `renderPermissionDenied`
- TypeScript interfaces enforce correct prop shape

---

### 2. State Management Strategy

**Decision**: Hybrid controlled/uncontrolled with `value`/`onChange` pattern

**Rationale**:
- **Flexibility**: Supports both use cases without forcing consumer choice
  - Uncontrolled: `<Wizard defaultStepIndex={0} onStepChange={handleChange} />` (template manages state)
  - Controlled: `<Wizard stepIndex={currentStep} onStepIndexChange={setCurrentStep} />` (consumer manages state)
- **Familiar pattern**: Matches React form inputs (`defaultValue`/`value`/`onChange`)
- **Gradual adoption**: Start uncontrolled, migrate to controlled when needed

**Alternatives Considered**:
- **Fully controlled only**: Forces boilerplate for simple cases
- **Fully uncontrolled only**: Limits consumer control for complex scenarios (e.g., URL-driven wizard state)
- **Imperative ref API**: Non-idiomatic React, harder to test

**Implementation Notes**:
- Each stateful template prop pair: `default*` + `*` + `on*Change`
  - Wizard: `defaultStepIndex`, `stepIndex`, `onStepIndexChange`
  - ListDetail: `defaultSelectedId`, `selectedId`, `onSelectedIdChange`
  - Settings: `defaultActiveSection`, `activeSection`, `onActiveSectionChange`
- Internal hook: `useControlledState(value, defaultValue, onChange)` handles logic
- TypeScript union types enforce valid combinations

---

### 3. Default State UI Organization

**Decision**: Centralized in `@django-core/page-templates/states`

**Rationale**:
- **Single source of truth**: Copy and illustrations managed in one location (FR-024)
- **Consistency**: All templates use same default states = unified UX
- **Easy updates**: Change once, propagates to all templates
- **Package cohesion**: State UI is part of templates package, not external dependency

**Alternatives Considered**:
- **Embedded in each template**: Duplication, inconsistent updates
- **Part of F01**: Overloads design system with page-level concerns
- **Template-specific variants**: Breaks consistency goal

**Implementation Notes**:
```typescript
// packages/page-templates/src/components/states/
export { DefaultLoading } from './DefaultLoading';
export { DefaultEmpty } from './DefaultEmpty';
export { DefaultError } from './DefaultError';
export { DefaultPermissionDenied } from './DefaultPermissionDenied';
export { DefaultOfflineRetry } from './DefaultOfflineRetry';

// Each default state composes F01 primitives
// Example: DefaultEmpty uses F01 <EmptyStateIllustration>, <Heading>, <Text>, <Button>
```

**Copy Strategy**:
- Generic, product-agnostic messages (e.g., "No data available", "Something went wrong")
- Consumer overrides for specific context (e.g., "No projects yet. Create your first project.")

---

### 4. Responsive Behavior Integration

**Decision**: Hybrid - F06 components for structure + F06 tokens for tweaks

**Rationale**:
- **Leverage F06 layouts**: Grid, Stack, Container handle responsive breakpoints automatically
- **Minimal custom responsive logic**: Only template-specific behaviors need custom breakpoints
  - Example: ListDetail side-by-side → stacked on mobile
  - Example: Settings sidebar → dropdown on tablet
- **Maintainability**: F06 breakpoint changes automatically propagate

**Alternatives Considered**:
- **F06 tokens only**: Reimplements responsive layout logic in templates
- **F06 components only**: Can't handle template-specific collapse patterns
- **Custom breakpoints**: Diverges from F06, creates inconsistency

**Implementation Notes**:
```typescript
// Primary: Use F06 components
import { Grid, Stack, Container } from '@django-core/layouts';

<Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
  {/* Dashboard widgets */}
</Grid>

// Secondary: Use F06 tokens for tweaks
import { breakpoints } from '@django-core/layouts/tokens';

const styles = {
  listDetailContainer: {
    display: 'flex',
    flexDirection: 'row',
    [`@media (max-width: ${breakpoints.tablet})`]: {
      flexDirection: 'column', // Template-specific mobile behavior
    },
  },
};
```

**Key Breakpoints** (from F06):
- Mobile: <768px
- Tablet: 768px - 1023px
- Desktop: ≥1024px

---

### 5. Testing Organization

**Decision**: Hybrid - co-located unit tests + separate integration tests + Storybook for visual

**Rationale**:
- **Co-located unit tests**: Component-level tests next to source for discoverability
  - Example: `Dashboard.test.tsx` tests `Dashboard.tsx` rendering, props, basic interactions
- **Separate integration tests**: Multi-component flows warrant dedicated test files
  - Example: `tests/integration/wizard-navigation.test.tsx` tests step transitions, validation gates, focus management
- **Storybook as visual regression**: Chromatic captures template structure changes
  - Example: `Dashboard.stories.tsx` has stories for each state, responsive breakpoints

**Alternatives Considered**:
- **All tests co-located**: Integration tests bloat component files
- **All tests separate**: Harder to find unit tests for specific components
- **Feature-based folders**: Duplicates component folder structure unnecessarily

**Implementation Notes**:
```
src/components/Dashboard/
  Dashboard.tsx
  Dashboard.test.tsx          # Unit: props, rendering, state handling
  DashboardHeader.tsx
  DashboardHeader.test.tsx

tests/integration/
  wizard-navigation.test.tsx  # Integration: multi-step flow
  list-detail-flow.test.tsx   # Integration: list→detail→list

stories/
  Dashboard.stories.tsx       # Visual: all variants for Chromatic
```

**Coverage Targets**:
- Unit: 80%+ line coverage
- Integration: All P1/P2 user stories covered
- Visual: 5+ stories per template (basic, states, responsive, customization, accessibility)

---

## Technical Research Findings

### React 18 Patterns

**Compound Components in React 18**:
```typescript
// Modern pattern with TypeScript
type DashboardComponent = React.FC<DashboardProps> & {
  Header: typeof DashboardHeader;
  Grid: typeof DashboardGrid;
  FilterBar: typeof DashboardFilterBar;
};

export const Dashboard: DashboardComponent = (props) => {
  // Main component logic
};

Dashboard.Header = DashboardHeader;
Dashboard.Grid = DashboardGrid;
Dashboard.FilterBar = DashboardFilterBar;
```

**Controlled/Uncontrolled Hook**:
```typescript
// Reusable pattern for all templates
function useControlledState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange: ((value: T) => void) | undefined
): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;

  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback((newValue: T) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  }, [isControlled, onChange]);

  return [value, setValue];
}
```

### Accessibility Patterns

**Semantic Landmarks** (FR-025):
```tsx
<main aria-label="Dashboard">
  <header>
    <h1>{title}</h1>
  </header>
  <nav aria-label="Filter options">
    {/* Filter bar */}
  </nav>
  <section aria-label="Dashboard content">
    {/* Grid */}
  </section>
</main>
```

**Focus Management** (Wizard):
```typescript
useEffect(() => {
  // Focus first interactive element in new step
  const firstInput = stepContentRef.current?.querySelector('input, button, a, textarea, select');
  firstInput?.focus();
}, [currentStep]);
```

**Keyboard Navigation** (ListDetail):
- Arrow keys: Navigate list items
- Enter/Space: Select item
- Escape: Return to list (mobile)
- Tab: Standard focus order

### Performance Optimization

**Bundle Size** (<15KB target):
- Tree-shaking: Named exports only, no default exports
- Code splitting: Lazy load stories, not production components
- Dependency audit: No lodash, moment, heavy libraries

**Render Performance** (<100ms target):
- Memoization: `React.memo` for expensive sub-components
- Callback stability: `useCallback` for onChange handlers
- No inline objects: Extract styles, avoid `style={{ ... }}` in render

### Storybook + Chromatic Integration

**Story Structure**:
```typescript
// Dashboard.stories.tsx
export default {
  title: 'Templates/Dashboard',
  component: Dashboard,
  parameters: {
    layout: 'fullscreen', // Templates need full viewport
    chromatic: {
      viewports: [320, 768, 1024], // Mobile, tablet, desktop
    },
  },
};

export const Basic = () => <Dashboard>{/* ... */}</Dashboard>;
export const Loading = () => <Dashboard state="loading" />;
export const Empty = () => <Dashboard state="empty" />;
export const CustomEmptyState = () => (
  <Dashboard
    state="empty"
    renderEmpty={() => <CustomEmpty />}
  />
);
```

**Chromatic Config**:
- Capture: All stories
- Thresholds: 0.5% visual diff tolerance
- Baselines: Update on merge to main
- Review: Required for all PR visual changes

---

## Best Practices from F01/F06/F07

### From F01 Design System
- **Token-based styling**: Use semantic tokens, not hard-coded values
- **Component composition**: Build complex from simple primitives
- **Prop consistency**: Naming conventions (size: sm/md/lg, variant: primary/secondary)

### From F06 Layouts
- **Responsive by default**: All layouts adapt to breakpoints
- **Container abstraction**: Use `<Container>` for max-width + padding
- **Grid systems**: CSS Grid over Flexbox for 2D layouts

### From F07 Theme System
- **Theme-aware**: Use `themeVars.color.*` not `primitives.color.*`
- **Dark mode support**: Test templates in both light and dark themes
- **CSS custom properties**: Leverage runtime theming

---

## Risk Mitigation Research

### Risk: F01/F06 API Instability
**Mitigation**:
- Lock peer dependency versions in package.json
- Document compatible version ranges
- Subscribe to F01/F06 changelog notifications

### Risk: Template Rigidity
**Mitigation**:
- Early adopter program: 2-3 downstream teams test templates during implementation
- Feedback loop: Weekly check-ins during Phase 3 (tasks execution)
- Escape hatches: Always provide render prop override for locked-down regions

### Risk: Accessibility Gaps
**Mitigation**:
- Automated testing: axe-core in Vitest tests
- Manual testing: Screen reader validation (NVDA on Windows, VoiceOver on Mac)
- External audit: Schedule accessibility review before release

---

## Implementation Readiness

**All planning unknowns resolved**: ✅
- Architecture pattern: Hybrid compound + render props
- State management: Controlled/uncontrolled with hooks
- Default states: Centralized in /states
- Responsive: F06 components + tokens for tweaks
- Testing: Hybrid organization (co-located + integration + visual)

**Dependencies confirmed**:
- F01: Stable API, compatible versions identified
- F06: Responsive system documented, breakpoints finalized
- F07: Theme integration straightforward

**No blockers**: Ready to proceed to Phase 1 (Design & Contracts)

---

## Next Steps

1. **Phase 1**: Create data-model.md (component API contracts)
2. **Phase 1**: Generate TypeScript interfaces in contracts/
3. **Phase 1**: Write quickstart.md (developer onboarding)
4. **Phase 2**: Break into tasks (/spec-kitty.tasks)
5. **Phase 3**: Execute implementation

**Research Status**: ✅ **COMPLETE**
