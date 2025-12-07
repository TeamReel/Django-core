---
work_package_id: "WP06"
subtasks:
  - "T072"
  - "T073"
  - "T074"
  - "T075"
  - "T076"
  - "T077"
  - "T078"
  - "T079"
title: "Typography Components"
phase: "Phase 1 - Components"
lane: "doing"
assignee: "github-copilot"
agent: "github-copilot"
shell_pid: "17604"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-05T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-06T18:15:00Z"
    lane: "doing"
    agent: "github-copilot"
    shell_pid: "17604"
    action: "Started implementation: Typography components (Heading, Text)"
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP06-typography-components.md](kitty-specs/022-frontend-design-system/tasks/planned/WP06-typography-components.md)*

# Work Package Prompt: WP06 – Typography Components

## ⚠️ IMPORTANT: Review Feedback Status

- **Has review feedback?**: Check the `review_status` field above.
- **Mark as acknowledged**: Update `review_status: acknowledged` when addressing feedback.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

### Objectives
1. Implement Heading component with semantic levels (h1-h6)
2. Implement Text component with size/weight/color variants
3. Support polymorphic `as` prop for flexible rendering
4. Consume typography tokens consistently

### Success Criteria
- [ ] Heading renders correct h1-h6 elements based on level
- [ ] Text supports polymorphic rendering (p, span, label, etc.)
- [ ] Both components use typography tokens
- [ ] Storybook stories demonstrate all variants
- [ ] Unit tests verify correct element rendering

---

## Context & Constraints

### Reference Documents
- Contracts: `kitty-specs/022-frontend-design-system/contracts/components.md`
- Spec: `kitty-specs/022-frontend-design-system/spec.md` (FR-011)

### Technical Constraints
- Use semantic HTML elements (h1-h6, p, span)
- Support `as` prop for element override
- All styles from typography tokens

---

## Subtasks & Detailed Guidance

### Subtask T072 – Create Heading.tsx
- **Purpose**: Semantic heading component
- **Steps**:
  1. Create `packages/design-system/src/components/Heading/Heading.tsx`
  2. Support `level` prop (1-6) for semantic heading level
  3. Support `as` prop to override rendered element
  4. Apply appropriate font sizes based on level
- **Files**:
  - `packages/design-system/src/components/Heading/Heading.tsx`
  - `packages/design-system/src/components/Heading/index.ts`

```typescript
import React, { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { heading, type HeadingLevel } from './Heading.css';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: ElementType;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 1, as, className, children, ...props }, ref) => {
    const Component = as || (`h${level}` as ElementType);

    return (
      <Component
        ref={ref}
        className={`${heading({ level })} ${className ?? ''}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = 'Heading';
```

### Subtask T073 – Create Heading.css.ts [P]
```typescript
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const heading = recipe({
  base: {
    fontFamily: themeVars.typography.fontFamily.sans,
    fontWeight: themeVars.typography.fontWeight.bold,
    lineHeight: themeVars.typography.lineHeight.tight,
    color: themeVars.color.text.primary,
    margin: 0,
  },
  variants: {
    level: {
      1: { fontSize: themeVars.typography.fontSize['4xl'] },
      2: { fontSize: themeVars.typography.fontSize['3xl'] },
      3: { fontSize: themeVars.typography.fontSize['2xl'] },
      4: { fontSize: themeVars.typography.fontSize.xl },
      5: { fontSize: themeVars.typography.fontSize.lg },
      6: { fontSize: themeVars.typography.fontSize.md },
    },
  },
  defaultVariants: {
    level: 1,
  },
});

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
```

### Subtask T074 – Create Heading.test.tsx [P]
```typescript
import { render, screen } from '@testing-library/react';
import { Heading } from './Heading';

describe('Heading', () => {
  it('renders h1 by default', () => {
    render(<Heading>Title</Heading>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders correct heading level', () => {
    render(<Heading level={3}>Title</Heading>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('supports as prop for custom element', () => {
    render(<Heading as="span">Title</Heading>);
    expect(screen.getByText('Title').tagName).toBe('SPAN');
  });
});
```

### Subtask T075 – Create Heading.stories.tsx [P]

---

### Subtask T076 – Create Text.tsx
- **Purpose**: General text component with variants
- **Steps**:
  1. Create `packages/design-system/src/components/Text/Text.tsx`
  2. Support size variants (xs, sm, md, lg, xl)
  3. Support weight variants (normal, medium, semibold, bold)
  4. Support color variants (primary, secondary, tertiary, error, success)
  5. Support polymorphic `as` prop
- **Files**:
  - `packages/design-system/src/components/Text/Text.tsx`
  - `packages/design-system/src/components/Text/index.ts`

```typescript
import React, { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { text, type TextSize, type TextWeight, type TextColor } from './Text.css';

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  as?: ElementType;
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ size = 'md', weight = 'normal', color = 'primary', as: Component = 'p', className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={`${text({ size, weight, color })} ${className ?? ''}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';
```

### Subtask T077 – Create Text.css.ts [P]
```typescript
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const text = recipe({
  base: {
    fontFamily: themeVars.typography.fontFamily.sans,
    lineHeight: themeVars.typography.lineHeight.normal,
    margin: 0,
  },
  variants: {
    size: {
      xs: { fontSize: themeVars.typography.fontSize.xs },
      sm: { fontSize: themeVars.typography.fontSize.sm },
      md: { fontSize: themeVars.typography.fontSize.md },
      lg: { fontSize: themeVars.typography.fontSize.lg },
      xl: { fontSize: themeVars.typography.fontSize.xl },
    },
    weight: {
      normal: { fontWeight: themeVars.typography.fontWeight.normal },
      medium: { fontWeight: themeVars.typography.fontWeight.medium },
      semibold: { fontWeight: themeVars.typography.fontWeight.semibold },
      bold: { fontWeight: themeVars.typography.fontWeight.bold },
    },
    color: {
      primary: { color: themeVars.color.text.primary },
      secondary: { color: themeVars.color.text.secondary },
      tertiary: { color: themeVars.color.text.tertiary },
      error: { color: themeVars.color.text.error },
      success: { color: themeVars.color.text.success },
    },
  },
  defaultVariants: {
    size: 'md',
    weight: 'normal',
    color: 'primary',
  },
});

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'error' | 'success';
```

### Subtask T078 – Create Text.test.tsx [P]
### Subtask T079 – Create Text.stories.tsx [P]

---

## Test Strategy

```bash
pnpm --filter design-system test -- --testPathPattern="Heading|Text"
pnpm --filter design-system storybook
```

---

## Definition of Done Checklist

- [ ] Heading component with all 6 levels
- [ ] Text component with size/weight/color variants
- [ ] Both support polymorphic `as` prop
- [ ] All typography tokens used correctly
- [ ] Storybook stories for all variants
- [ ] Unit tests pass
- [ ] `tasks.md` updated with WP06 status

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
