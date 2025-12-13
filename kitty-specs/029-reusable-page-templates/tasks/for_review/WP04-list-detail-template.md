---
work_package_id: WP04
title: List-Detail Template (User Story 2)
lane: "for_review"
subtasks: [T022, T023, T024, T025, T026, T027, T028]
priority: P1
depends_on: [WP02]
agent: "github-copilot"
shell_pid: "7216"
history:
  - date: 2025-12-13
    action: created
    by: spec-kitty.tasks
---

# Work Package: List-Detail Template (User Story 2)

**ID**: WP04 | **Priority**: P1 | **Lane**: Planned | **Depends On**: WP02

## Objective

Implement List-Detail template with selection state and mobile layout switching. Validates controlled/uncontrolled state patterns and responsive layout switching.

## Subtasks

### T022: Create ListDetail main component
- Implement split layout (list | detail)
- Props: splitRatio (default [1, 2]), listMinWidth (default 300px)
- Selection state with useControlledState: defaultSelectedId, selectedId, onSelectedIdChange
- Mobile layout modes: 'overlay' | 'stack'
- Semantic: `<nav>` for list, `<article>` for detail

### T023: Create ListDetailList sub-component
- Props: showSearch, searchPlaceholder, onSearchChange, loading, isEmpty
- Render children (list items)
- Search bar at top (if showSearch)
- Integrate DefaultLoading/DefaultEmpty for states

### T024: Create ListDetailDetail sub-component
- Props: showBackButton (mobile only), onBack, loading
- Render children (detail content)
- Back button appears on mobile when showBackButton={true}
- Integrate DefaultLoading for loading state

### T025: Implement selection state management
- useControlledState for selectedId
- Pass selection to children via context or props
- Support both string and number IDs

### T026: Implement mobile layout switching
- Use useResponsive hook
- Overlay mode: Detail slides over list (full screen), back button shows
- Stack mode: List and detail stack vertically
- Smooth transitions between layouts

### T027: Write unit tests
- ListDetail.test.tsx: Selection state, responsive behavior
- Integration test: tests/integration/list-detail-flow.test.tsx
  - Select item → detail updates
  - Mobile: Select → detail shows, back → list shows
  - Empty list handling

### T028: Create Storybook stories
- Basic: List with 5 items, select to show detail
- Loading: List loading, detail loading separately
- Empty: Empty list with custom action
- Mobile Overlay: Demonstrate overlay mode
- Mobile Stack: Demonstrate stack mode
- With Search: Searchable list

## Key Patterns

**Selection State**:
```tsx
const [selectedId, setSelectedId] = useControlledState(
  props.selectedId,
  props.defaultSelectedId ?? null,
  props.onSelectedIdChange
);
```

**Mobile Layout Detection**:
```tsx
const { isMobile } = useResponsive();
const effectiveLayout = isMobile ? props.mobileLayout : 'side-by-side';
```

## Definition of Done

- [ ] List and detail render side-by-side on desktop
- [ ] Mobile layouts work (overlay and stack modes)
- [ ] Selection state works in controlled/uncontrolled modes
- [ ] Search integration functional
- [ ] Keyboard navigation works (useKeyboardNavigation)
- [ ] Integration test passes
- [ ] 80%+ test coverage
- [ ] Storybook has 6+ stories

## Reviewer Checklist

- [ ] Selection state synchronization correct
- [ ] Mobile layout transitions smooth
- [ ] Back button only shows on mobile when appropriate
- [ ] Keyboard navigation accessible (arrow keys, enter)
- [ ] Focus management correct (list → detail → list)

## Next Steps

After WP04: Can proceed to WP05 (Wizard) or WP06 (Settings) in parallel.

## Activity Log

- 2025-12-13T20:57:33Z – github-copilot – shell_pid=7216 – lane=doing – Started WP04 implementation (List-Detail Template)
- 2025-12-13T21:07:04Z – github-copilot – shell_pid=7216 – lane=for_review – Completed WP04 implementation (List-Detail Template)
