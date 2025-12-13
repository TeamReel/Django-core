---
work_package_id: WP06
title: Settings Template (User Story 4)
lane: "done"
subtasks: [T037, T038, T039, T040, T041, T042]
priority: P2
depends_on: [WP02]
agent: "github-copilot-reviewer"
shell_pid: "7216"
history:
  - date: 2025-12-13
    action: created
    by: spec-kitty.tasks
---

# Work Package: Settings Template (User Story 4)

**ID**: WP06 | **Priority**: P2 | **Lane**: Planned | **Depends On**: WP02

## Objective

Implement settings template with section navigation and responsive layout (sidebar → tabs → dropdown).

## Subtasks

### T037: Create Settings main component
- Accept sections configuration: `SettingsSectionConfig[]`
- Section state with useControlledState: defaultActiveSection, activeSection, onActiveSectionChange
- Props: sidebarLayout ('sticky' | 'scrollable'), mobileLayout ('tabs' | 'dropdown'), showSectionActions
- Two-column layout: Navigation | Content

### T038: Create SettingsSection sub-component
- Props: sectionId (must match config), children, title, description, showDivider
- Only render if section is active
- Divider between sections optional

### T039: Create SettingsNavigation sub-component
- Responsive modes:
  - Desktop: Sidebar (vertical list)
  - Tablet: Horizontal tabs
  - Mobile: Dropdown selector
- Use useResponsive to detect breakpoint
- Use useKeyboardNavigation for navigation
- Highlight active section
- Support icons if provided in config

### T040: Implement section state management
- useControlledState for activeSection
- Default to first section if none specified
- Validate section IDs exist in configuration
- Deep linking support via activeSection prop

### T041: Write unit tests
- Settings.test.tsx: Section navigation, responsive modes
- Test sidebar/tabs/dropdown switching
- Test keyboard navigation (arrow keys)

### T042: Create integration test
- tests/integration/settings-navigation.test.tsx
- Navigate between sections
- Test responsive layout switching
- Test deep linking (initialize on specific section)

## Section Configuration Type

```typescript
interface SettingsSectionConfig {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number }>;
  requiredPermission?: string;
}
```

## Responsive Navigation Pattern

```typescript
const { isMobile, isTablet, isDesktop } = useResponsive();

let navigationMode: 'sidebar' | 'tabs' | 'dropdown';
if (isMobile) navigationMode = mobileLayout;
else if (isTablet) navigationMode = 'tabs';
else navigationMode = 'sidebar';
```

## Definition of Done

- [ ] Section navigation works (sidebar/tabs/dropdown)
- [ ] Active section prop enables deep linking
- [ ] Responsive layout switching smooth
- [ ] Keyboard navigation works (arrow keys)
- [ ] Optional unsaved changes indicator
- [ ] 80%+ test coverage
- [ ] Integration test passes
- [ ] Storybook has 5+ stories

## Reviewer Checklist

- [ ] Navigation mode switches correctly at breakpoints
- [ ] Keyboard navigation accessible
- [ ] Active section highlighting clear
- [ ] Permission-based section filtering documented
- [ ] Focus management correct when switching sections

## Next Steps

After WP06: All templates complete, proceed to WP07 (State Overrides) and WP08 (Integration).

## Activity Log

- 2025-12-13T21:22:38Z – github-copilot – shell_pid=7216 – lane=doing – Started WP06 implementation (Settings Template)
- 2025-12-13T21:26:55Z – github-copilot – shell_pid=7216 – lane=for_review – Completed WP06 implementation (Settings Template) with all components, 23 unit tests, and 6 Storybook stories. All 99 tests passing.
- 2025-12-13T21:28:03Z – github-copilot-reviewer – shell_pid=7216 – lane=done – Review complete: Approved without changes. All 99 tests passing, 6 Storybook stories created, keyboard navigation excellent, TypeScript strict mode passing, build successful.
