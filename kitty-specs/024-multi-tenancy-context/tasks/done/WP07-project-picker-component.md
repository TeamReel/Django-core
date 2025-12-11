---
work_package_id: "WP07"
subtasks:
  - "T072"
  - "T073"
  - "T074"
  - "T075"
  - "T076"
  - "T077"
  - "T078"
  - "T079"
  - "T080"
  - "T081"
  - "T082"
  - "T083"
  - "T084"
  - "T085"
title: "Project Picker Component"
phase: "Phase 1 - Core Context & UI"
lane: "done"
assignee: "copilot"
agent: "claude-sonnet-4"
shell_pid: "212"
review_status: "approved"
reviewed_by: "claude-sonnet-4"
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP07 – Project Picker Component

## Objectives & Success Criteria

Implement project picker UI (dropdown/modal) filtered by selected organisation, with search, list rendering, and selection.

**Success Criteria**:
- ✅ Picker opens on click
- ✅ Lists projects for current org only
- ✅ Search filters list (300ms debounce, 3-char min)
- ✅ Handles selection (calls switchContext)
- ✅ Keyboard accessible
- ✅ Desktop dropdown + mobile modal variants
- ✅ Unit + accessibility tests, 90%+ coverage

---

## Context & Constraints

**Purpose**: User Story 3 - Switch Between Projects

**References**:
- [spec.md](../spec.md) - FR-022 through FR-036 (project picker requirements)
- [data-model.md](../data-model.md) - Project type

**Constraints**:
- Must filter projects by context.organisation.id
- Show "No projects" if org has none
- Same F01 components as WP06

---

## Subtasks & Detailed Guidance

### T072 – Create ProjectPicker component

**Steps**:
1. Create `src/components/ProjectPicker.tsx`:
   ```typescript
   import React, { useState, useMemo } from 'react';
   import { useAvailableContexts } from '../hooks/useAvailableContexts';
   import { useContextSwitcher } from '../hooks/useContextSwitcher';
   import { useCurrentContext } from '../hooks/useCurrentContext';

   export interface ProjectPickerProps {
     isOpen: boolean;
     onClose: () => void;
     trigger?: React.ReactNode;
   }

   export function ProjectPicker({
     isOpen,
     onClose,
     trigger,
   }: ProjectPickerProps) {
     const [searchQuery, setSearchQuery] = useState('');
     const { context } = useCurrentContext();
     const { projects, projectsLoading } = useAvailableContexts();
     const { switchContext, isSwitching } = useContextSwitcher();

     // Filter by org (T078)
     // Search filter (T079)
     // Render dropdown/modal (T073, T074)
     // Search field (T075)
     // Project list (T076)
     // Empty state (T077)

     return null;
   }
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T073 – Integrate F01 Dropdown for desktop

**Steps**:
1. Same pattern as WP06 T059:
   ```typescript
   import { Dropdown } from '@django-core/design-system';

   if (!isMobile) {
     return (
       <Dropdown isOpen={isOpen} onClose={onClose} trigger={trigger}>
         {/* Content */}
       </Dropdown>
     );
   }
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T074 – Integrate F01 Modal for mobile

**Steps**:
1. Same pattern as WP06 T060:
   ```typescript
   import { Modal } from '@django-core/design-system';

   if (isMobile) {
     return (
       <Modal isOpen={isOpen} onClose={onClose} size="fullscreen" title="Select Project">
         {/* Content */}
       </Modal>
     );
   }
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T075 – Integrate F01 SearchField

**Steps**:
1. Same as WP06 T061:
   ```typescript
   <SearchField
     value={searchQuery}
     onChange={(e) => setSearchQuery(e.target.value)}
     placeholder="Search projects..."
     autoFocus
   />
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T076 – Integrate F01 List for project list

**Steps**:
1. Render filtered projects:
   ```typescript
   <List>
     {filteredProjects.map((project) => (
       <ListItem
         key={project.id}
         onClick={() => handleSelect(project)}
         disabled={isSwitching}
       >
         {project.name}
       </ListItem>
     ))}
   </List>
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T077 – Integrate F01 EmptyState

**Steps**:
1. Show when no projects or no search results:
   ```typescript
   {filteredProjects.length === 0 && (
     <EmptyState
       title={searchQuery ? 'No projects found' : 'No projects in this organisation'}
       description={searchQuery ? 'Try a different search term' : 'Create a project to get started'}
     />
   )}
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T078 – Filter projects by current organisation

**Steps**:
1. Only show projects for current org:
   ```typescript
   const projectsForCurrentOrg = useMemo(() => {
     if (!context.organisation) {
       return [];
     }

     return projects.filter((p) => p.organisationId === context.organisation!.id);
   }, [projects, context.organisation]);
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T079 – Implement search filter logic

**Steps**:
1. Case-insensitive substring match on name and slug:
   ```typescript
   const filteredProjects = useMemo(() => {
     if (!searchQuery || searchQuery.length < 3) {
       return projectsForCurrentOrg;
     }

     const query = searchQuery.toLowerCase();
     return projectsForCurrentOrg.filter(
       (project) =>
         project.name.toLowerCase().includes(query) ||
         project.slug.toLowerCase().includes(query)
     );
   }, [projectsForCurrentOrg, searchQuery]);
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T080 – Integrate useDebouncedValue hook

**Steps**:
1. Same as WP06 T065:
   ```typescript
   import { useDebouncedValue } from '../hooks/useDebouncedValue';

   const debouncedQuery = useDebouncedValue(searchQuery, 300);

   const filteredProjects = useMemo(() => {
     if (!debouncedQuery || debouncedQuery.length < 3) {
       return projectsForCurrentOrg;
     }
     // ... filter logic
   }, [projectsForCurrentOrg, debouncedQuery]);
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T081 – Handle project selection

**Steps**:
1. Create handler:
   ```typescript
   const handleSelect = async (project: Project) => {
     if (!context.organisation) {
       console.error('No organisation selected');
       return;
     }

     try {
       await switchContext(context.organisation, project);
       onClose();
     } catch (error) {
       console.error('Failed to switch project:', error);
     }
   };
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T082 – Add keyboard navigation

**Steps**:
1. Same pattern as WP06 T067:
   ```typescript
   const [selectedIndex, setSelectedIndex] = useState(0);

   const handleKeyDown = (e: React.KeyboardEvent) => {
     switch (e.key) {
       case 'ArrowDown':
         e.preventDefault();
         setSelectedIndex((i) => Math.min(i + 1, filteredProjects.length - 1));
         break;
       case 'ArrowUp':
         e.preventDefault();
         setSelectedIndex((i) => Math.max(i - 1, 0));
         break;
       case 'Enter':
         e.preventDefault();
         if (filteredProjects[selectedIndex]) {
           handleSelect(filteredProjects[selectedIndex]);
         }
         break;
       case 'Escape':
         e.preventDefault();
         onClose();
         break;
     }
   };
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T083 – Add ARIA attributes

**Steps**:
1. Same listbox pattern as WP06 T068:
   ```typescript
   <div
     role="listbox"
     aria-label="Project picker"
     aria-activedescendant={filteredProjects[selectedIndex] ? `project-${filteredProjects[selectedIndex].id}` : undefined}
   >
     <List>
       {filteredProjects.map((project, index) => (
         <ListItem
           key={project.id}
           role="option"
           aria-selected={index === selectedIndex}
           id={`project-${project.id}`}
         >
           {project.name}
         </ListItem>
       ))}
     </List>
   </div>
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T084 [P] – Write unit tests

**Steps**:
1. Create `__tests__/components/ProjectPicker.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, screen, fireEvent } from '@testing-library/react';
   import { ProjectPicker } from '../../src/components/ProjectPicker';
   import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';

   describe('ProjectPicker', () => {
     it('renders projects for current organisation', () => {
       // Set org to Acme, verify only Acme projects shown
     });

     it('filters projects on search', async () => {
       // Type "web", verify only "Web App" shown
     });

     it('calls switchContext on selection', async () => {
       // Click project, verify switchContext(org, project) called
     });

     it('closes picker after selection', async () => {
       // Select project, verify onClose called
     });

     it('handles keyboard navigation', async () => {
       // ArrowDown/Up navigate, Enter selects, Escape closes
     });

     it('shows empty state when org has no projects', () => {
       // Org with no projects, verify EmptyState
     });

     it('shows no results message for no matches', () => {
       // Search for non-existent project, verify message
     });

     it('disables picker when no org selected', () => {
       // context.organisation = null, verify empty or disabled
     });
   });
   ```

**Files**: `__tests__/components/ProjectPicker.test.tsx`

**Parallel?**: Yes

---

### T085 [P] – Write accessibility tests

**Steps**:
1. Create `__tests__/accessibility/ProjectPicker.a11y.test.tsx`:
   ```typescript
   import { axe, toHaveNoViolations } from 'jest-axe';
   // Same pattern as WP06 T070
   // Test listbox role, aria-activedescendant, keyboard-only navigation
   ```

**Files**: `__tests__/accessibility/ProjectPicker.a11y.test.tsx`

**Parallel?**: Yes

---

## Risks & Mitigations

**Risk**: User tries to select project before org
**Mitigation**: Disable ProjectPicker if !context.organisation, show tooltip

**Risk**: Org change clears project selection
**Mitigation**: WP03 ContextSwitcherProvider handles this (reset project on org change)

**Risk**: 500+ projects lag
**Mitigation**: Defer virtualization to WP09

---

## Definition of Done Checklist

- [ ] ProjectPicker component created
- [ ] F01 Dropdown (desktop) integrated
- [ ] F01 Modal (mobile) integrated
- [ ] F01 SearchField integrated
- [ ] F01 List/ListItem integrated
- [ ] F01 EmptyState integrated
- [ ] Filter by current organisation
- [ ] Search filter logic (3-char min)
- [ ] Debounced search (300ms, from WP09)
- [ ] Selection calls switchContext(org, project)
- [ ] Keyboard navigation
- [ ] ARIA attributes
- [ ] Unit tests (all scenarios)
- [ ] Accessibility tests
- [ ] Test coverage 90%+

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-10T19:33:36Z – claude-sonnet-4 – shell_pid=212 – lane=doing – Started implementation
- 2025-12-10T19:36:59Z – claude-sonnet-4 – shell_pid=212 – lane=for_review – Completed implementation - ready for review
- 2025-12-10T19:40:38Z – claude-sonnet-4 – shell_pid=212 – lane=done – Code review approved: Excellent implementation with proper org filtering
