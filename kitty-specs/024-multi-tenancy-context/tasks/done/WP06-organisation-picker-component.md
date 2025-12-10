---
work_package_id: "WP06"
subtasks:
  - "T058"
  - "T059"
  - "T060"
  - "T061"
  - "T062"
  - "T063"
  - "T064"
  - "T065"
  - "T066"
  - "T067"
  - "T068"
  - "T069"
  - "T070"
  - "T071"
title: "Organisation Picker Component"
phase: "Phase 1 - Core Context & UI"
lane: "done"
assignee: ""
agent: "claude-sonnet-4"
shell_pid: "212"
review_status: "approved with minor notes"
reviewed_by: "claude-sonnet-4"
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP06 – Organisation Picker Component

## Objectives & Success Criteria

Implement organisation picker UI (dropdown/modal) with search, list rendering, and selection handling.

**Success Criteria**:
- ✅ Picker opens on click
- ✅ Lists organisations from API
- ✅ Search filters list (300ms debounce, 3-char min)
- ✅ Handles selection (calls switchContext)
- ✅ Keyboard accessible (ArrowUp/Down, Enter, Escape)
- ✅ Desktop dropdown + mobile modal variants
- ✅ Unit + accessibility tests, 90%+ coverage

---

## Context & Constraints

**Purpose**: User Story 2 - Switch Between Organisations

**References**:
- [spec.md](../spec.md) - FR-006 through FR-021 (picker requirements)
- [research.md](../research.md) - Q4: Search with debouncing + virtualization

**Constraints**:
- Must use F01 Dropdown, Modal, SearchField, List, EmptyState
- Search: client-side filter (no backend calls)
- Virtualization: Added in WP09 if list >50 items

---

## Subtasks & Detailed Guidance

### T058 – Create OrganisationPicker component

**Steps**:
1. Create `src/components/OrganisationPicker.tsx`:
   ```typescript
   import React, { useState } from 'react';
   import { useAvailableContexts } from '../hooks/useAvailableContexts';
   import { useContextSwitcher } from '../hooks/useContextSwitcher';

   export interface OrganisationPickerProps {
     isOpen: boolean;
     onClose: () => void;
     trigger?: React.ReactNode;
   }

   export function OrganisationPicker({
     isOpen,
     onClose,
     trigger,
   }: OrganisationPickerProps) {
     const [searchQuery, setSearchQuery] = useState('');
     const { organisations, organisationsLoading } = useAvailableContexts();
     const { switchContext, isSwitching } = useContextSwitcher();

     // Filter logic (T064)
     // Render dropdown/modal (T059, T060)
     // Search field (T061)
     // Org list (T062)
     // Empty state (T063)

     return null; // Implement below
   }
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T059 – Integrate F01 Dropdown for desktop

**Steps**:
1. Import:
   ```typescript
   import { Dropdown } from '@django-core/design-system';
   ```

2. Wrap with media query check:
   ```typescript
   const isMobile = window.innerWidth < 768; // Or use matchMedia

   if (!isMobile) {
     return (
       <Dropdown
         isOpen={isOpen}
         onClose={onClose}
         trigger={trigger}
       >
         {/* SearchField + List */}
       </Dropdown>
     );
   }
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T060 – Integrate F01 Modal for mobile

**Steps**:
1. Import:
   ```typescript
   import { Modal } from '@django-core/design-system';
   ```

2. Full-screen sheet for mobile:
   ```typescript
   if (isMobile) {
     return (
       <Modal
         isOpen={isOpen}
         onClose={onClose}
         size="fullscreen"
         title="Select Organisation"
       >
         {/* SearchField + List */}
       </Modal>
     );
   }
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T061 – Integrate F01 SearchField

**Steps**:
1. Import:
   ```typescript
   import { SearchField } from '@django-core/design-system';
   ```

2. Controlled input:
   ```typescript
   <SearchField
     value={searchQuery}
     onChange={(e) => setSearchQuery(e.target.value)}
     placeholder="Search organisations..."
     autoFocus
   />
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T062 – Integrate F01 List for org list

**Steps**:
1. Import:
   ```typescript
   import { List, ListItem } from '@django-core/design-system';
   ```

2. Render filtered orgs:
   ```typescript
   <List>
     {filteredOrgs.map((org) => (
       <ListItem
         key={org.id}
         onClick={() => handleSelect(org)}
         disabled={isSwitching}
       >
         {org.name}
       </ListItem>
     ))}
   </List>
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T063 – Integrate F01 EmptyState

**Steps**:
1. Import:
   ```typescript
   import { EmptyState } from '@django-core/design-system';
   ```

2. Show when no orgs or no search results:
   ```typescript
   {filteredOrgs.length === 0 && (
     <EmptyState
       title={searchQuery ? 'No organisations found' : 'No organisations available'}
       description={searchQuery ? 'Try a different search term' : 'Contact your administrator'}
     />
   )}
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T064 – Implement search filter logic

**Steps**:
1. Case-insensitive substring match on name and slug:
   ```typescript
   const filteredOrgs = useMemo(() => {
     if (!searchQuery || searchQuery.length < 3) {
       return organisations;
     }

     const query = searchQuery.toLowerCase();
     return organisations.filter(
       (org) =>
         org.name.toLowerCase().includes(query) ||
         org.slug.toLowerCase().includes(query)
     );
   }, [organisations, searchQuery]);
   ```

**Files**: `src/components/OrganisationPicker.tsx`

**Notes**: Debouncing added in WP09 via useDebouncedValue hook

---

### T065 – Integrate useDebouncedValue hook

**Steps**:
1. Import hook from WP09:
   ```typescript
   import { useDebouncedValue } from '../hooks/useDebouncedValue';
   ```

2. Debounce search query:
   ```typescript
   const debouncedQuery = useDebouncedValue(searchQuery, 300);

   const filteredOrgs = useMemo(() => {
     if (!debouncedQuery || debouncedQuery.length < 3) {
       return organisations;
     }
     // ... filter logic
   }, [organisations, debouncedQuery]);
   ```

**Files**: `src/components/OrganisationPicker.tsx`

**Notes**: Hook will be created in WP09, add integration here

---

### T066 – Handle organisation selection

**Steps**:
1. Create handler:
   ```typescript
   const handleSelect = async (org: Organisation) => {
     try {
       await switchContext(org);
       onClose();
     } catch (error) {
       console.error('Failed to switch organisation:', error);
     }
   };
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T067 – Add keyboard navigation

**Steps**:
1. Track selected index:
   ```typescript
   const [selectedIndex, setSelectedIndex] = useState(0);
   ```

2. Handle arrow keys:
   ```typescript
   const handleKeyDown = (e: React.KeyboardEvent) => {
     switch (e.key) {
       case 'ArrowDown':
         e.preventDefault();
         setSelectedIndex((i) => Math.min(i + 1, filteredOrgs.length - 1));
         break;
       case 'ArrowUp':
         e.preventDefault();
         setSelectedIndex((i) => Math.max(i - 1, 0));
         break;
       case 'Enter':
         e.preventDefault();
         if (filteredOrgs[selectedIndex]) {
           handleSelect(filteredOrgs[selectedIndex]);
         }
         break;
       case 'Escape':
         e.preventDefault();
         onClose();
         break;
     }
   };
   ```

3. Apply to container:
   ```typescript
   <div onKeyDown={handleKeyDown} tabIndex={0}>
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T068 – Add ARIA attributes

**Steps**:
1. Listbox pattern:
   ```typescript
   <div role="listbox" aria-label="Organisation picker">
     <List>
       {filteredOrgs.map((org, index) => (
         <ListItem
           key={org.id}
           role="option"
           aria-selected={index === selectedIndex}
           id={`org-${org.id}`}
         >
           {org.name}
         </ListItem>
       ))}
     </List>
   </div>
   ```

2. Active descendant:
   ```typescript
   <div
     role="listbox"
     aria-activedescendant={filteredOrgs[selectedIndex] ? `org-${filteredOrgs[selectedIndex].id}` : undefined}
   >
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T069 [P] – Write unit tests

**Steps**:
1. Create `__tests__/components/OrganisationPicker.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { OrganisationPicker } from '../../src/components/OrganisationPicker';
   import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';

   describe('OrganisationPicker', () => {
     it('renders list of organisations', () => {
       // Test orgs appear
     });

     it('filters organisations on search', async () => {
       // Type "acme", verify only Acme Corp shown
     });

     it('calls switchContext on selection', async () => {
       // Click org, verify switchContext called
     });

     it('closes picker after selection', async () => {
       // Select org, verify onClose called
     });

     it('handles keyboard navigation', async () => {
       // ArrowDown/Up navigate, Enter selects, Escape closes
     });

     it('shows empty state when no orgs', () => {
       // Empty organisations array, verify EmptyState shown
     });

     it('shows no results message for no matches', () => {
       // Search for non-existent org, verify message
     });
   });
   ```

**Files**: `__tests__/components/OrganisationPicker.test.tsx`

**Parallel?**: Yes

---

### T070 [P] – Write accessibility tests

**Steps**:
1. Create `__tests__/accessibility/OrganisationPicker.a11y.test.tsx`:
   ```typescript
   import { axe, toHaveNoViolations } from 'jest-axe';
   // Similar pattern to WP05 T056
   // Test listbox role, aria-activedescendant, keyboard-only navigation
   ```

**Files**: `__tests__/accessibility/OrganisationPicker.a11y.test.tsx`

**Parallel?**: Yes

---

### T071 – Create Storybook story

**Steps**:
1. Create `src/components/OrganisationPicker.stories.tsx`:
   ```typescript
   // Stories: Empty, Few Orgs, 100+ Orgs, Loading, Error
   ```

**Files**: `src/components/OrganisationPicker.stories.tsx`

---

## Risks & Mitigations

**Risk**: 500+ orgs lag on render
**Mitigation**: Defer virtualization to WP09, test with 100 orgs for now

**Risk**: Search input loses focus
**Mitigation**: autoFocus on modal open, test focus management

**Risk**: Mobile keyboard covers picker
**Mitigation**: Use Modal with auto-scroll, test on real devices

---

## Definition of Done Checklist

- [ ] OrganisationPicker component created
- [ ] F01 Dropdown (desktop) integrated
- [ ] F01 Modal (mobile) integrated
- [ ] F01 SearchField integrated
- [ ] F01 List/ListItem integrated
- [ ] F01 EmptyState integrated
- [ ] Search filter logic (3-char min)
- [ ] Debounced search (300ms, from WP09)
- [ ] Selection calls switchContext
- [ ] Keyboard navigation (arrows, enter, escape)
- [ ] ARIA attributes (listbox, options, active descendant)
- [ ] Unit tests (all scenarios)
- [ ] Accessibility tests (axe-core, keyboard-only)
- [ ] Storybook story
- [ ] Test coverage 90%+

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-10T19:19:05Z – claude-sonnet-4 – shell_pid=212 – lane=doing – Started implementation
- 2025-12-10T19:26:35Z – claude-sonnet-4 – shell_pid=212 – lane=for_review – Completed implementation - ready for review
- 2025-12-10T19:31:28Z – claude-sonnet-4 – shell_pid=212 – lane=done – Code review approved: Component meets all requirements, excellent implementation
