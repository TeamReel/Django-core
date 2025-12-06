---
work_package_id: "WP05"
subtasks:
  - "T056"
  - "T057"
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
title: "Feedback Components"
phase: "Phase 1 - Components"
lane: "for_review"
assignee: ""
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
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP05-feedback-components.md](kitty-specs/022-frontend-design-system/tasks/planned/WP05-feedback-components.md)*

# Work Package Prompt: WP05 – Feedback Components

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

### Objectives
1. Implement Card component for content grouping
2. Implement Alert component with semantic variants (info, success, warning, error)
3. Implement Badge component for status indicators
4. Implement Spinner component for loading states
5. Ensure proper ARIA roles for accessibility

### Success Criteria
- [ ] All 4 feedback components implemented
- [ ] Alert uses proper ARIA roles (`role="alert"` or `role="status"`)
- [ ] Spinner respects `prefers-reduced-motion`
- [ ] All components pass accessibility checks
- [ ] Storybook stories cover all variants
- [ ] Unit tests achieve 80% coverage

---

## Context & Constraints

### Reference Documents
- Contracts: `kitty-specs/022-frontend-design-system/contracts/components.md`
- Spec: `kitty-specs/022-frontend-design-system/spec.md` (FR-010)

### Technical Constraints
- Alert must use semantic ARIA roles
- Spinner animation must stop when reduced motion is preferred
- Badge should support inline rendering

---

## Subtasks & Detailed Guidance

### Subtask T056 – Create Card.tsx
- **Purpose**: Container component for grouping related content
- **Steps**:
  1. Create `packages/design-system/src/components/Card/Card.tsx`
  2. Support padding variants (none, sm, md, lg)
  3. Support visual variants (outlined, elevated, filled)
  4. Forward ref and spread HTML attributes
- **Files**:
  - `packages/design-system/src/components/Card/Card.tsx`
  - `packages/design-system/src/components/Card/index.ts`
- **Parallel?**: No (establishes pattern)

```typescript
import React, { forwardRef, type HTMLAttributes } from 'react';
import { card, type CardVariant, type CardPadding } from './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'outlined', padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${card({ variant, padding })} ${className ?? ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
```

### Subtask T057 – Create Card.css.ts [P]
```typescript
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const card = recipe({
  base: {
    borderRadius: themeVars.radius.lg,
    backgroundColor: themeVars.color.background.primary,
  },
  variants: {
    variant: {
      outlined: {
        border: `1px solid ${themeVars.color.border.primary}`,
      },
      elevated: {
        boxShadow: themeVars.shadow.md,
      },
      filled: {
        backgroundColor: themeVars.color.background.secondary,
      },
    },
    padding: {
      none: { padding: 0 },
      sm: { padding: themeVars.spacing['3'] },
      md: { padding: themeVars.spacing['4'] },
      lg: { padding: themeVars.spacing['6'] },
    },
  },
  defaultVariants: {
    variant: 'outlined',
    padding: 'md',
  },
});

export type CardVariant = NonNullable<RecipeVariants<typeof card>>['variant'];
export type CardPadding = NonNullable<RecipeVariants<typeof card>>['padding'];
```

### Subtask T058 – Create Card.test.tsx [P]
### Subtask T059 – Create Card.stories.tsx [P]

---

### Subtask T060 – Create Alert.tsx
- **Purpose**: Display important messages with semantic meaning
- **Steps**:
  1. Create `packages/design-system/src/components/Alert/Alert.tsx`
  2. Support variants: info, success, warning, error
  3. Use `role="alert"` for important messages, `role="status"` for informational
  4. Support optional title and dismissible prop
  5. Include appropriate icons for each variant
- **Files**:
  - `packages/design-system/src/components/Alert/Alert.tsx`
  - `packages/design-system/src/components/Alert/index.ts`

```typescript
import React, { forwardRef, type HTMLAttributes } from 'react';
import { alert, alertIcon, alertContent, type AlertVariant } from './Alert.css';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, dismissible, onDismiss, className, children, ...props }, ref) => {
    const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

    return (
      <div
        ref={ref}
        role={role}
        aria-live={role === 'alert' ? 'assertive' : 'polite'}
        className={`${alert({ variant })} ${className ?? ''}`}
        {...props}
      >
        <span className={alertIcon({ variant })} aria-hidden="true">
          {/* Icon based on variant */}
        </span>
        <div className={alertContent}>
          {title && <strong>{title}</strong>}
          {children}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
```

### Subtask T061 – Create Alert.css.ts [P]
### Subtask T062 – Create Alert.test.tsx [P]
### Subtask T063 – Create Alert.stories.tsx [P]

---

### Subtask T064 – Create Badge.tsx
- **Purpose**: Small status indicator component
- **Steps**:
  1. Create `packages/design-system/src/components/Badge/Badge.tsx`
  2. Support variants: default, primary, success, warning, error
  3. Support sizes: sm, md
  4. Render inline for use within text
- **Files**:
  - `packages/design-system/src/components/Badge/Badge.tsx`

```typescript
import React, { forwardRef, type HTMLAttributes } from 'react';
import { badge, type BadgeVariant, type BadgeSize } from './Badge.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`${badge({ variant, size })} ${className ?? ''}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
```

### Subtask T065 – Create Badge.css.ts [P]
### Subtask T066 – Create Badge.test.tsx [P]
### Subtask T067 – Create Badge.stories.tsx [P]

---

### Subtask T068 – Create Spinner.tsx
- **Purpose**: Loading indicator component
- **Steps**:
  1. Create `packages/design-system/src/components/Spinner/Spinner.tsx`
  2. Support sizes: sm, md, lg
  3. Include proper aria-label for screen readers
  4. Respect `prefers-reduced-motion` preference
- **Files**:
  - `packages/design-system/src/components/Spinner/Spinner.tsx`

```typescript
import React, { forwardRef, type HTMLAttributes } from 'react';
import { spinner, type SpinnerSize } from './Spinner.css';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  label?: string;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', label = 'Loading', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        className={`${spinner({ size })} ${className ?? ''}`}
        {...props}
      >
        <span className="visually-hidden">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
```

### Subtask T069 – Create Spinner.css.ts [P]
- **Key Requirement**: Animation must respect `prefers-reduced-motion`

```typescript
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { keyframes, style } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const spinner = recipe({
  base: {
    display: 'inline-block',
    borderRadius: '50%',
    border: '2px solid transparent',
    borderTopColor: themeVars.color.interactive.primary,
    animation: `${spin} 0.75s linear infinite`,
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        animation: 'none',
        borderTopColor: 'transparent',
        borderRightColor: themeVars.color.interactive.primary,
        borderBottomColor: themeVars.color.interactive.primary,
        borderLeftColor: themeVars.color.interactive.primary,
      },
    },
  },
  variants: {
    size: {
      sm: { width: '16px', height: '16px' },
      md: { width: '24px', height: '24px' },
      lg: { width: '32px', height: '32px' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type SpinnerSize = NonNullable<RecipeVariants<typeof spinner>>['size'];
```

### Subtask T070 – Create Spinner.test.tsx [P]
### Subtask T071 – Create Spinner.stories.tsx [P]

---

## Test Strategy

### Verification Commands
```bash
pnpm --filter design-system test -- --testPathPattern="Card|Alert|Badge|Spinner"
pnpm --filter design-system storybook
```

### Accessibility Testing
- Alert: Verify `role="alert"` for error/warning, `role="status"` for info/success
- Spinner: Verify accessible name via `aria-label`
- Badge: Verify content is accessible

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Alert ARIA role confusion | Document when to use alert vs status |
| Spinner animation distracting | Test with reduced motion preference |

---

## Definition of Done Checklist

- [ ] Card component implemented with variants
- [ ] Alert component with proper ARIA roles
- [ ] Badge component with inline rendering
- [ ] Spinner component respecting reduced motion
- [ ] All components pass accessibility tests
- [ ] Storybook stories for all variants
- [ ] Unit tests achieve 80% coverage
- [ ] `tasks.md` updated with WP05 status

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-06T15:03:35Z – github-copilot – shell_pid=17604 – lane=doing – Moved to doing
- 2025-12-06T15:40:39Z – github-copilot – shell_pid=17604 – lane=for_review – Moved to for_review
