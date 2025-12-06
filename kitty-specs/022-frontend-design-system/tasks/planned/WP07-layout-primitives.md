---
work_package_id: "WP07"
subtasks:
  - "T080"
  - "T081"
  - "T082"
  - "T083"
  - "T084"
  - "T085"
  - "T086"
  - "T087"
  - "T088"
  - "T089"
  - "T090"
  - "T091"
title: "Layout Primitives"
phase: "Phase 1 - Components"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-05T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP07-layout-primitives.md](kitty-specs/022-frontend-design-system/tasks/planned/WP07-layout-primitives.md)*

# Work Package Prompt: WP07 – Layout Primitives

## ⚠️ IMPORTANT: Review Feedback Status

- **Has review feedback?**: Check the `review_status` field above.

---

## Review Feedback

*[This section is empty initially.]*

---

## Objectives & Success Criteria

### Objectives
1. Implement Stack component for vertical/horizontal layouts
2. Implement Grid component for grid-based layouts
3. Implement Container component for max-width content
4. Support responsive behavior at all breakpoints
5. Use spacing tokens consistently

### Success Criteria
- [ ] Stack handles vertical and horizontal directions with gap
- [ ] Grid supports column configuration and responsive breakpoints
- [ ] Container centers content with max-width constraints
- [ ] All components use spacing tokens for gaps/padding
- [ ] Logical properties used for RTL support
- [ ] Storybook stories demonstrate responsive behavior

---

## Context & Constraints

### Reference Documents
- Contracts: `kitty-specs/022-frontend-design-system/contracts/components.md`
- Spec: `kitty-specs/022-frontend-design-system/spec.md` (FR-012)

### Technical Constraints
- Use CSS Flexbox for Stack
- Use CSS Grid for Grid
- Use logical properties (inline/block) for RTL compatibility
- Gap values from spacing tokens

---

## Subtasks & Detailed Guidance

### Subtask T080 – Create Stack.tsx
- **Purpose**: Flexbox-based layout component
- **Steps**:
  1. Create `packages/design-system/src/components/Stack/Stack.tsx`
  2. Support `direction` (row, column)
  3. Support `gap` using spacing scale
  4. Support `align` and `justify` props
  5. Support `wrap` prop for wrapping behavior
- **Files**:
  - `packages/design-system/src/components/Stack/Stack.tsx`
  - `packages/design-system/src/components/Stack/index.ts`

```typescript
import React, { forwardRef, type HTMLAttributes, type CSSProperties } from 'react';
import { stack } from './Stack.css';
import { themeVars } from '../../tokens/theme.css';

type SpacingKey = keyof typeof themeVars.spacing;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: SpacingKey;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: boolean;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ direction = 'column', gap = '4', align, justify, wrap, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${stack({ direction, wrap })} ${className ?? ''}`}
        style={{
          gap: themeVars.spacing[gap],
          alignItems: align,
          justifyContent: justify,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';
```

### Subtask T081 – Create Stack.css.ts [P]
```typescript
import { recipe } from '@vanilla-extract/recipes';

export const stack = recipe({
  base: {
    display: 'flex',
  },
  variants: {
    direction: {
      row: { flexDirection: 'row' },
      column: { flexDirection: 'column' },
    },
    wrap: {
      true: { flexWrap: 'wrap' },
    },
  },
  defaultVariants: {
    direction: 'column',
  },
});
```

### Subtask T082 – Create Stack.test.tsx [P]
### Subtask T083 – Create Stack.stories.tsx [P]

---

### Subtask T084 – Create Grid.tsx
- **Purpose**: CSS Grid-based layout component
- **Steps**:
  1. Create `packages/design-system/src/components/Grid/Grid.tsx`
  2. Support `columns` prop (number or template string)
  3. Support `gap` and `rowGap`/`columnGap` separately
  4. Support responsive column configuration
- **Files**:
  - `packages/design-system/src/components/Grid/Grid.tsx`
  - `packages/design-system/src/components/Grid/index.ts`

```typescript
import React, { forwardRef, type HTMLAttributes } from 'react';
import { grid } from './Grid.css';
import { themeVars } from '../../tokens/theme.css';

type SpacingKey = keyof typeof themeVars.spacing;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: number | string;
  gap?: SpacingKey;
  rowGap?: SpacingKey;
  columnGap?: SpacingKey;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ columns = 12, gap = '4', rowGap, columnGap, className, style, children, ...props }, ref) => {
    const gridTemplateColumns = typeof columns === 'number' 
      ? `repeat(${columns}, 1fr)` 
      : columns;

    return (
      <div
        ref={ref}
        className={`${grid} ${className ?? ''}`}
        style={{
          gridTemplateColumns,
          gap: themeVars.spacing[gap],
          rowGap: rowGap ? themeVars.spacing[rowGap] : undefined,
          columnGap: columnGap ? themeVars.spacing[columnGap] : undefined,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
```

### Subtask T085 – Create Grid.css.ts [P]
```typescript
import { style } from '@vanilla-extract/css';

export const grid = style({
  display: 'grid',
});
```

### Subtask T086 – Create Grid.test.tsx [P]
### Subtask T087 – Create Grid.stories.tsx [P]

---

### Subtask T088 – Create Container.tsx
- **Purpose**: Max-width content container
- **Steps**:
  1. Create `packages/design-system/src/components/Container/Container.tsx`
  2. Support `maxWidth` variants (sm, md, lg, xl, full)
  3. Support `padding` prop
  4. Center horizontally by default
- **Files**:
  - `packages/design-system/src/components/Container/Container.tsx`
  - `packages/design-system/src/components/Container/index.ts`

```typescript
import React, { forwardRef, type HTMLAttributes } from 'react';
import { container, type ContainerMaxWidth } from './Container.css';
import { themeVars } from '../../tokens/theme.css';

type SpacingKey = keyof typeof themeVars.spacing;

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: ContainerMaxWidth;
  padding?: SpacingKey;
  centered?: boolean;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ maxWidth = 'lg', padding = '4', centered = true, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${container({ maxWidth, centered })} ${className ?? ''}`}
        style={{
          paddingInline: themeVars.spacing[padding],
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';
```

### Subtask T089 – Create Container.css.ts [P]
```typescript
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';

export const container = recipe({
  base: {
    width: '100%',
  },
  variants: {
    maxWidth: {
      sm: { maxWidth: '640px' },
      md: { maxWidth: '768px' },
      lg: { maxWidth: '1024px' },
      xl: { maxWidth: '1280px' },
      full: { maxWidth: '100%' },
    },
    centered: {
      true: { marginInline: 'auto' },
    },
  },
  defaultVariants: {
    maxWidth: 'lg',
    centered: true,
  },
});

export type ContainerMaxWidth = NonNullable<RecipeVariants<typeof container>>['maxWidth'];
```

### Subtask T090 – Create Container.test.tsx [P]
### Subtask T091 – Create Container.stories.tsx [P]

---

## Test Strategy

```bash
pnpm --filter design-system test -- --testPathPattern="Stack|Grid|Container"
pnpm --filter design-system storybook
```

---

## Definition of Done Checklist

- [ ] Stack component with direction, gap, align, justify
- [ ] Grid component with columns and gap
- [ ] Container component with maxWidth and padding
- [ ] Spacing tokens used for all gaps/padding
- [ ] Logical properties for RTL support
- [ ] Storybook stories
- [ ] Unit tests pass
- [ ] `tasks.md` updated with WP07 status

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
