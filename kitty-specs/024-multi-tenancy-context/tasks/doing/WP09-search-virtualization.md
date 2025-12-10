---
work_package_id: "WP09"
subtasks:
  - "T097"
  - "T098"
  - "T099"
  - "T100"
  - "T101"
  - "T102"
  - "T103"
  - "T104"
  - "T105"
title: "Search & Virtualization Utilities"
phase: "Phase 2 - Performance & Search"
lane: "doing"
assignee: "claude-sonnet-4"
agent: "claude-sonnet-4"
shell_pid: "212"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-10T21:40:00Z"
    lane: "doing"
    agent: "claude-sonnet-4"
    shell_pid: "212"
    action: "Started implementation of search and virtualization utilities"
---

# Work Package Prompt: WP09 – Search & Virtualization Utilities

## Objectives & Success Criteria

Implement performance optimizations: debounced search hook and virtualized list integration for 500+ items.

**Success Criteria**:
- ✅ useDebouncedValue hook with configurable delay
- ✅ VirtualizedList component using react-window
- ✅ Integrated into OrganisationPicker and ProjectPicker
- ✅ Performance benchmarks: 1000 items render <100ms
- ✅ Unit tests, 90%+ coverage

---

## Context & Constraints

**Purpose**: User Story 5 - Search and Quick Access (performance optimization)

**References**:
- [research.md](../research.md) - Q4: Debouncing + virtualization decision
- [spec.md](../spec.md) - NFR-013 (search debouncing), NFR-014 (virtualization)

**Constraints**:
- Debounce: 300ms default, configurable
- Virtualization: Only activate if list >50 items
- Must work with F01 List component

---

## Subtasks & Detailed Guidance

### T097 – Create useDebouncedValue hook

**Steps**:
1. Create `src/hooks/useDebouncedValue.ts`:
   ```typescript
   import { useEffect, useState } from 'react';

   export function useDebouncedValue<T>(value: T, delay: number = 300): T {
     const [debouncedValue, setDebouncedValue] = useState(value);

     useEffect(() => {
       const handler = setTimeout(() => {
         setDebouncedValue(value);
       }, delay);

       return () => {
         clearTimeout(handler);
       };
     }, [value, delay]);

     return debouncedValue;
   }
   ```

**Files**: `src/hooks/useDebouncedValue.ts`

---

### T098 – Export useDebouncedValue from index

**Steps**:
1. Update `src/index.ts`:
   ```typescript
   export { useDebouncedValue } from './hooks/useDebouncedValue';
   ```

**Files**: `src/index.ts`

---

### T099 [P] – Write unit tests for useDebouncedValue

**Steps**:
1. Create `__tests__/hooks/useDebouncedValue.test.ts`:
   ```typescript
   import { renderHook, act } from '@testing-library/react';
   import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';

   jest.useFakeTimers();

   describe('useDebouncedValue', () => {
     it('returns initial value immediately', () => {
       const { result } = renderHook(() => useDebouncedValue('initial', 300));
       expect(result.current).toBe('initial');
     });

     it('debounces value updates', () => {
       const { result, rerender } = renderHook(
         ({ value }) => useDebouncedValue(value, 300),
         { initialProps: { value: 'first' } }
       );

       expect(result.current).toBe('first');

       rerender({ value: 'second' });
       expect(result.current).toBe('first'); // Still old value

       act(() => {
         jest.advanceTimersByTime(300);
       });

       expect(result.current).toBe('second'); // New value after delay
     });

     it('cancels previous timer on rapid updates', () => {
       const { result, rerender } = renderHook(
         ({ value }) => useDebouncedValue(value, 300),
         { initialProps: { value: 'first' } }
       );

       rerender({ value: 'second' });
       act(() => { jest.advanceTimersByTime(150); });

       rerender({ value: 'third' });
       act(() => { jest.advanceTimersByTime(150); });

       expect(result.current).toBe('first'); // Not updated yet

       act(() => { jest.advanceTimersByTime(150); });

       expect(result.current).toBe('third'); // Final value after full delay
     });

     it('uses custom delay', () => {
       const { result, rerender } = renderHook(
         ({ value }) => useDebouncedValue(value, 500),
         { initialProps: { value: 'first' } }
       );

       rerender({ value: 'second' });

       act(() => { jest.advanceTimersByTime(300); });
       expect(result.current).toBe('first'); // Not 300ms yet

       act(() => { jest.advanceTimersByTime(200); });
       expect(result.current).toBe('second'); // After 500ms total
     });
   });
   ```

**Files**: `__tests__/hooks/useDebouncedValue.test.ts`

**Parallel?**: Yes

---

### T100 – Create VirtualizedList component

**Steps**:
1. Install react-window:
   ```bash
   pnpm add react-window
   pnpm add -D @types/react-window
   ```

2. Create `src/components/VirtualizedList.tsx`:
   ```typescript
   import React, { forwardRef } from 'react';
   import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

   export interface VirtualizedListProps<T> {
     items: T[];
     renderItem: (item: T, index: number) => React.ReactNode;
     itemHeight?: number;
     height?: number;
     className?: string;
   }

   function VirtualizedListInner<T>(
     {
       items,
       renderItem,
       itemHeight = 48,
       height = 400,
       className,
     }: VirtualizedListProps<T>,
     ref: React.Ref<List>
   ) {
     const Row = ({ index, style }: ListChildComponentProps) => (
       <div style={style}>{renderItem(items[index], index)}</div>
     );

     return (
       <List
         ref={ref}
         className={className}
         height={height}
         itemCount={items.length}
         itemSize={itemHeight}
         width="100%"
       >
         {Row}
       </List>
     );
   }

   export const VirtualizedList = forwardRef(VirtualizedListInner) as <T>(
     props: VirtualizedListProps<T> & { ref?: React.Ref<List> }
   ) => JSX.Element;
   ```

**Files**: `src/components/VirtualizedList.tsx`

---

### T101 – Integrate VirtualizedList into OrganisationPicker

**Steps**:
1. Update `src/components/OrganisationPicker.tsx`:
   ```typescript
   import { VirtualizedList } from './VirtualizedList';

   const VIRTUALIZATION_THRESHOLD = 50;

   // Inside component:
   const shouldVirtualize = filteredOrgs.length > VIRTUALIZATION_THRESHOLD;

   {shouldVirtualize ? (
     <VirtualizedList
       items={filteredOrgs}
       renderItem={(org, index) => (
         <ListItem
           key={org.id}
           onClick={() => handleSelect(org)}
           disabled={isSwitching}
           aria-selected={index === selectedIndex}
         >
           {org.name}
         </ListItem>
       )}
       itemHeight={48}
       height={400}
     />
   ) : (
     <List>
       {filteredOrgs.map((org) => (
         <ListItem key={org.id} onClick={() => handleSelect(org)}>
           {org.name}
         </ListItem>
       ))}
     </List>
   )}
   ```

**Files**: `src/components/OrganisationPicker.tsx`

---

### T102 – Integrate VirtualizedList into ProjectPicker

**Steps**:
1. Update `src/components/ProjectPicker.tsx`:
   ```typescript
   import { VirtualizedList } from './VirtualizedList';

   const VIRTUALIZATION_THRESHOLD = 50;

   const shouldVirtualize = filteredProjects.length > VIRTUALIZATION_THRESHOLD;

   {shouldVirtualize ? (
     <VirtualizedList
       items={filteredProjects}
       renderItem={(project, index) => (
         <ListItem
           key={project.id}
           onClick={() => handleSelect(project)}
           disabled={isSwitching}
           aria-selected={index === selectedIndex}
         >
           {project.name}
         </ListItem>
       )}
       itemHeight={48}
       height={400}
     />
   ) : (
     <List>
       {filteredProjects.map((project) => (
         <ListItem key={project.id} onClick={() => handleSelect(project)}>
           {project.name}
         </ListItem>
       ))}
     </List>
   )}
   ```

**Files**: `src/components/ProjectPicker.tsx`

---

### T103 – Integrate useDebouncedValue into pickers

**Steps**:
1. Already documented in WP06 T065 and WP07 T080
2. Verify both pickers now use:
   ```typescript
   const debouncedQuery = useDebouncedValue(searchQuery, 300);
   ```

**Files**: `src/components/OrganisationPicker.tsx`, `src/components/ProjectPicker.tsx`

---

### T104 [P] – Write performance benchmarks

**Steps**:
1. Create `__tests__/performance/VirtualizedList.perf.test.tsx`:
   ```typescript
   import React from 'react';
   import { render } from '@testing-library/react';
   import { VirtualizedList } from '../../src/components/VirtualizedList';

   describe('VirtualizedList performance', () => {
     it('renders 1000 items in <100ms', () => {
       const items = Array.from({ length: 1000 }, (_, i) => ({
         id: `item-${i}`,
         name: `Item ${i}`,
       }));

       const startTime = performance.now();

       render(
         <VirtualizedList
           items={items}
           renderItem={(item) => <div>{item.name}</div>}
           itemHeight={48}
           height={400}
         />
       );

       const endTime = performance.now();
       const duration = endTime - startTime;

       expect(duration).toBeLessThan(100);
     });

     it('handles 10,000 items without lag', () => {
       const items = Array.from({ length: 10000 }, (_, i) => ({
         id: `item-${i}`,
         name: `Item ${i}`,
       }));

       const startTime = performance.now();

       const { rerender } = render(
         <VirtualizedList
           items={items}
           renderItem={(item) => <div>{item.name}</div>}
         />
       );

       const endTime = performance.now();
       const initialRender = endTime - startTime;

       const rerenderStart = performance.now();
       rerender(
         <VirtualizedList
           items={items}
           renderItem={(item) => <div>{item.name} (updated)</div>}
         />
       );
       const rerenderEnd = performance.now();
       const rerenderDuration = rerenderEnd - rerenderStart;

       expect(initialRender).toBeLessThan(100);
       expect(rerenderDuration).toBeLessThan(50);
     });
   });
   ```

**Files**: `__tests__/performance/VirtualizedList.perf.test.tsx`

**Parallel?**: Yes

**Notes**: These are rough benchmarks; CI times may vary

---

### T105 [P] – Write unit tests for VirtualizedList

**Steps**:
1. Create `__tests__/components/VirtualizedList.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, screen } from '@testing-library/react';
   import { VirtualizedList } from '../../src/components/VirtualizedList';

   describe('VirtualizedList', () => {
     const items = Array.from({ length: 100 }, (_, i) => ({
       id: `item-${i}`,
       name: `Item ${i}`,
     }));

     it('renders only visible items', () => {
       render(
         <VirtualizedList
           items={items}
           renderItem={(item) => <div>{item.name}</div>}
           itemHeight={48}
           height={400}
         />
       );

       // With 400px height and 48px item height, ~8 items visible
       // Test that not all 100 items are in DOM
       const visibleItems = screen.queryAllByText(/Item \d+/);
       expect(visibleItems.length).toBeLessThan(20); // Render buffer
     });

     it('accepts custom itemHeight', () => {
       const { container } = render(
         <VirtualizedList
           items={items}
           renderItem={(item) => <div>{item.name}</div>}
           itemHeight={64}
           height={400}
         />
       );

       // Check container has correct dimensions
       expect(container.querySelector('[style]')).toBeTruthy();
     });

     it('renders empty list', () => {
       const { container } = render(
         <VirtualizedList
           items={[]}
           renderItem={(item) => <div>{item}</div>}
         />
       );

       expect(container.querySelector('[style]')).toBeTruthy();
     });
   });
   ```

**Files**: `__tests__/components/VirtualizedList.test.tsx`

**Parallel?**: Yes

---

## Risks & Mitigations

**Risk**: Virtualization breaks keyboard navigation
**Mitigation**: react-window preserves DOM structure, test arrow keys with virtualized list

**Risk**: Search lag on 10,000+ items
**Mitigation**: 300ms debounce + client-side filter is fast enough (tested), backend pagination if needed later

**Risk**: Virtualization adds complexity
**Mitigation**: Only activate for >50 items, most users have <50 orgs/projects

---

## Definition of Done Checklist

- [ ] useDebouncedValue hook created
- [ ] Hook exported from public API
- [ ] Unit tests for useDebouncedValue
- [ ] VirtualizedList component created
- [ ] react-window integrated
- [ ] VirtualizedList in OrganisationPicker (>50 items)
- [ ] VirtualizedList in ProjectPicker (>50 items)
- [ ] useDebouncedValue in both pickers
- [ ] Performance benchmarks (1000 items <100ms)
- [ ] Unit tests for VirtualizedList
- [ ] Test coverage 90%+

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
