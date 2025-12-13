---
work_package_id: WP03
title: Dashboard Template (User Story 1)
lane: planned
subtasks: [T015, T016, T017, T018, T019, T020, T021]
priority: P1
depends_on: [WP02]
history:
  - date: 2025-12-13
    action: created
    by: spec-kitty.tasks
---

# Work Package: Dashboard Template (User Story 1)

**ID**: WP03 | **Priority**: P1 | **Lane**: Planned | **Depends On**: WP02

## Objective

Implement Dashboard template with header, filter bar, and responsive grid. This is the first P1 template and validates the compound component pattern with F01/F06 integration.

## Subtasks

### T015: Create Dashboard main component
- Implement compound component pattern with TypeScript
- Wire up state props (loading, empty, error, isEmpty)
- Integrate render prop overrides (renderLoading, renderEmpty, renderError)
- Use semantic `<main>` element with aria-label

### T016: Create DashboardHeader sub-component
- Accept title (string | ReactNode), subtitle, actions, breadcrumbs props
- Use semantic `<header>` element
- Layout: title/subtitle on left, actions on right
- Responsive: Stack vertically on mobile if actions overflow

### T017: Create DashboardGrid sub-component
- Integrate F06 Grid component
- Accept responsive columns: `columns={{ mobile: 1, tablet: 2, desktop: 3 }}`
- Accept gap prop: 'sm' | 'md' | 'lg' (maps to F06 spacing)
- Render children with proper grid layout

### T018: Create DashboardFilterBar sub-component
- Semantic `<nav>` with aria-label="Filter options"
- Implement collapsible behavior with useControlledState
- Props: collapsible, defaultCollapsed, collapsed, onCollapsedChange
- Mobile: Show expand/collapse button

### T019: Wire up state management
- Connect loading prop to DefaultLoading component
- Connect isEmpty prop to DefaultEmpty component
- Connect error prop to DefaultError component
- Support render prop overrides for all states

### T020: Write unit tests
- Dashboard.test.tsx: Rendering, state handling, prop validation
- Sub-component tests: DashboardHeader.test.tsx, etc.
- Target: 80%+ coverage

### T021: Create Storybook stories
- stories/Dashboard.stories.tsx with variants:
  - Basic: Simple dashboard with 3 widgets
  - Loading: Dashboard in loading state
  - Empty: Dashboard with no widgets
  - Error: Dashboard with error state
  - Custom Empty: Override empty state with custom content
  - Responsive: Test at mobile/tablet/desktop breakpoints
  - With Filters: Dashboard with collapsible filter bar

## Implementation Notes

**Compound Component Pattern**:
```tsx
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

**State Rendering Priority**:
1. If `loading={true}`: Show DefaultLoading (or renderLoading override)
2. Else if `error`: Show DefaultError (or renderError override)
3. Else if `isEmpty={true}`: Show DefaultEmpty (or renderEmpty override)
4. Else: Render children

## Definition of Done

- [ ] Dashboard renders with all sub-components
- [ ] Grid adapts to mobile/tablet/desktop automatically
- [ ] All 4 states render correctly (loading, empty, error, success)
- [ ] Filter bar collapse works on mobile
- [ ] Storybook has 7+ stories
- [ ] Tests achieve 80%+ coverage
- [ ] TypeScript strict mode passes
- [ ] Semantic HTML and ARIA labels present

## Reviewer Checklist

- [ ] Compound component exports work correctly
- [ ] F06 Grid integration follows best practices
- [ ] State render priority is correct
- [ ] Render prop overrides work as expected
- [ ] Responsive behavior smooth across breakpoints
- [ ] Accessibility tested (keyboard navigation, screen reader)

## Next Steps

After WP03: Can proceed to WP04 (List-Detail) or WP05 (Wizard) in parallel.
