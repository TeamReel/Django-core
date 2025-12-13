---
lane: "doing"
agent: "claude"
shell_pid: "22128"
---
# WP04: Health Status & Badge Components

---
**work_package_id**: WP04
**status**: planned
**priority**: P2 (Maps to User Story 3)
**user_story**: US3 - Visual Status Indicators for System Health
**subtasks**: [T021, T022, T023, T024, T025, T026]
**dependencies**: WP01 (package scaffold must exist)
**parallel**: Can run in parallel with WP02, WP03 after WP01
**history**:
  - 2025-12-12: Created task prompt from Phase 3 breakdown

---

## Objective

Implement HealthStatus component to visualize system health (operational/degraded/unhealthy/unknown) with color-coded indicators. Implement Badge component for count displays (e.g., "3 services down"). Ensure both components use F01 design tokens and meet accessibility standards.

## Context

**Feature**: 027-resource-display-alerts (F05 Resource Display & Alerts)
**User Story**: US3 - Visual Status Indicators for System Health
**Related Documents**:
- [spec.md](../../spec.md) - See US3 acceptance scenarios
- [plan.md](../../plan.md) - See Component Architecture section
- [contracts/B18-health-status.ts](../../contracts/B18-health-status.ts) - ServiceHealth interface

**Key Requirements** (from spec.md):
- FR-008: Display health status with visual indicators (icon + color + label)
- FR-009: Support 4 states: healthy (green), degraded (yellow), unhealthy (red), unknown (gray)
- FR-010b: Include optional "last checked" timestamp
- FR-011: Badge component for count displays (e.g., "5 alerts", "3 services")

**Technical Context**:
- F01 provides colorVars tokens for success/warning/error/neutral states
- Use simple Unicode characters or inline SVG for icons (no icon library dependency)
- Components should be stateless (data passed via props)

**Success Criteria**:
- Render HealthStatus with status="degraded" → yellow icon + "Degraded" label
- Badge shows count with optional color variant
- Both components pass axe-core accessibility checks

## Detailed Guidance

### T021: Create HealthStatus Component with Status Enum

**Task**: Define HealthStatus component with TypeScript props interface.

**File**: `src/components/HealthStatus/HealthStatus.tsx`

**Props Interface**:
```typescript
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthStatusProps {
  /**
   * Service or resource name
   * @example "Database"
   */
  name: string;

  /**
   * Current health status
   */
  status: HealthStatusType;

  /**
   * Optional details or error message
   * @example "High response time (1.2s avg)"
   */
  details?: string;

  /**
   * Optional last checked timestamp
   * @example "2025-12-12T10:30:00Z"
   */
  lastChecked?: string;

  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Size variant
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';
}
```

**Component Skeleton**:
```typescript
import React from 'react';
import styles from './HealthStatus.module.css';

export const HealthStatus: React.FC<HealthStatusProps> = ({
  name,
  status,
  details,
  lastChecked,
  className,
  size = 'medium',
}) => {
  // T022: Map status to color
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  const statusIcon = getStatusIcon(status);

  // T023: Format last checked timestamp
  const formattedTime = lastChecked ? formatRelativeTime(lastChecked) : null;

  return (
    <div className={`${styles.container} ${styles[size]} ${className || ''}`}>
      <div className={styles.header}>
        <span
          className={styles.icon}
          style={{ color: statusColor }}
          role="img"
          aria-label={`${statusLabel} status`}
        >
          {statusIcon}
        </span>
        <span className={styles.name}>{name}</span>
        <span className={styles.status} style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {details && <div className={styles.details}>{details}</div>}

      {formattedTime && (
        <div className={styles.timestamp}>Last checked {formattedTime}</div>
      )}
    </div>
  );
};
```

**Validation**: Component renders without TypeScript errors

---

### T022: Map Status to F01 Color Tokens

**Task**: Create utility functions to map HealthStatusType to F01 color tokens.

**File**: `src/components/HealthStatus/utils.ts`

**Implementation**:
```typescript
import { colorVars } from '@django-core/design-system/tokens';
import type { HealthStatusType } from './HealthStatus';

/**
 * Map health status to F01 color token
 */
export const getStatusColor = (status: HealthStatusType): string => {
  switch (status) {
    case 'healthy':
      return colorVars.palette.success[600]; // Green
    case 'degraded':
      return colorVars.palette.warning[600]; // Yellow/Orange
    case 'unhealthy':
      return colorVars.palette.error[600]; // Red
    case 'unknown':
      return colorVars.palette.neutral[500]; // Gray
  }
};

/**
 * Get human-readable status label
 */
export const getStatusLabel = (status: HealthStatusType): string => {
  switch (status) {
    case 'healthy':
      return 'Operational';
    case 'degraded':
      return 'Degraded';
    case 'unhealthy':
      return 'Down';
    case 'unknown':
      return 'Unknown';
  }
};

/**
 * Get icon character for status (Unicode or emoji)
 */
export const getStatusIcon = (status: HealthStatusType): string => {
  switch (status) {
    case 'healthy':
      return '✓'; // Checkmark
    case 'degraded':
      return '⚠'; // Warning triangle
    case 'unhealthy':
      return '✕'; // X mark
    case 'unknown':
      return '?'; // Question mark
  }
};

/**
 * Format relative time (e.g., "2 minutes ago")
 * @param isoTimestamp ISO 8601 timestamp string
 */
export const formatRelativeTime = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
};
```

**Design Decisions**:
- Use Unicode characters for icons (✓, ⚠, ✕, ?) to avoid icon library dependency
- Map to colorVars[600] shade for sufficient contrast on light backgrounds
- Relative time format for "last checked" (more user-friendly than absolute timestamp)

**Validation**: Utilities return correct values for all status types

---

### T023: Add Status Icons and Labels

**Task**: Implement icon rendering with accessible ARIA labels.

**Already implemented in T021/T022**, but ensure:

**Accessibility Requirements**:
- Icon has `role="img"` and `aria-label` describing status
- Color is not sole indicator (label text also shows status)
- Icon size adjusts based on `size` prop (small/medium/large)

**CSS for icon sizing** (`HealthStatus.module.css`):
```css
.icon {
  font-size: 1.25rem; /* Default medium size */
  font-weight: bold;
  margin-right: var(--spacing-2);
  line-height: 1;
}

.small .icon {
  font-size: 1rem;
}

.large .icon {
  font-size: 1.5rem;
}
```

**Validation**: Screen reader announces "Operational status" for healthy state

---

### T024: Create Badge Component

**Task**: Implement Badge component for count displays.

**File**: `src/components/Badge/Badge.tsx`

**Props Interface**:
```typescript
export interface BadgeProps {
  /**
   * Badge content (usually a number or short text)
   */
  children: React.ReactNode;

  /**
   * Color variant (maps to F01 color tokens)
   * @default "neutral"
   */
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info';

  /**
   * Size variant
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Optional className for custom styling
   */
  className?: string;
}
```

**Implementation**:
```typescript
import React from 'react';
import { colorVars } from '@django-core/design-system/tokens';
import styles from './Badge.module.css';

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'medium',
  className,
}) => {
  const backgroundColor = getBadgeBackgroundColor(variant);
  const textColor = getBadgeTextColor(variant);

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${className || ''}`}
      style={{ backgroundColor, color: textColor }}
    >
      {children}
    </span>
  );
};

/**
 * Get background color for badge variant
 */
const getBadgeBackgroundColor = (variant: BadgeProps['variant']): string => {
  switch (variant) {
    case 'success':
      return colorVars.palette.success[100]; // Light green
    case 'warning':
      return colorVars.palette.warning[100]; // Light yellow
    case 'error':
      return colorVars.palette.error[100]; // Light red
    case 'info':
      return colorVars.palette.info[100]; // Light blue
    case 'neutral':
    default:
      return colorVars.palette.neutral[200]; // Light gray
  }
};

/**
 * Get text color for badge variant (dark shade for contrast)
 */
const getBadgeTextColor = (variant: BadgeProps['variant']): string => {
  switch (variant) {
    case 'success':
      return colorVars.palette.success[800];
    case 'warning':
      return colorVars.palette.warning[800];
    case 'error':
      return colorVars.palette.error[800];
    case 'info':
      return colorVars.palette.info[800];
    case 'neutral':
    default:
      return colorVars.palette.neutral[800];
  }
};
```

**CSS** (`Badge.module.css`):
```css
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-1) var(--spacing-2); /* 4px 8px */
  border-radius: var(--border-radius-full); /* Pill shape */
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  white-space: nowrap;
}

.small {
  padding: var(--spacing-0-5) var(--spacing-1-5); /* 2px 6px */
  font-size: var(--font-size-xxs);
}

.large {
  padding: var(--spacing-1-5) var(--spacing-3); /* 6px 12px */
  font-size: var(--font-size-sm);
}
```

**Validation**: Badge renders with correct color for each variant

---

### T025: Write Unit Tests

**Task**: Comprehensive unit tests for HealthStatus and Badge components.

**File**: `tests/components/HealthStatus.test.tsx`

**Test Cases**:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthStatus } from '../../src/components/HealthStatus';
import { getStatusColor, getStatusLabel, getStatusIcon, formatRelativeTime } from '../../src/components/HealthStatus/utils';

describe('HealthStatus', () => {
  describe('rendering', () => {
    it('renders with basic props', () => {
      render(<HealthStatus name="Database" status="healthy" />);
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Operational')).toBeInTheDocument();
    });

    it('displays details when provided', () => {
      render(
        <HealthStatus
          name="API"
          status="degraded"
          details="High response time (1.2s avg)"
        />
      );
      expect(screen.getByText('High response time (1.2s avg)')).toBeInTheDocument();
    });

    it('displays formatted last checked time', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      render(
        <HealthStatus name="Cache" status="healthy" lastChecked={fiveMinutesAgo} />
      );
      expect(screen.getByText(/Last checked 5 minutes ago/)).toBeInTheDocument();
    });
  });

  describe('status variants', () => {
    it('renders healthy status with green color', () => {
      const { container } = render(<HealthStatus name="DB" status="healthy" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('✓');
      expect(icon).toHaveAttribute('aria-label', 'Operational status');
    });

    it('renders degraded status with yellow color', () => {
      const { container } = render(<HealthStatus name="DB" status="degraded" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('⚠');
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });

    it('renders unhealthy status with red color', () => {
      const { container } = render(<HealthStatus name="DB" status="unhealthy" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('✕');
      expect(screen.getByText('Down')).toBeInTheDocument();
    });

    it('renders unknown status with gray color', () => {
      const { container } = render(<HealthStatus name="DB" status="unknown" />);
      const icon = container.querySelector('[role="img"]');
      expect(icon).toHaveTextContent('?');
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('applies small size class', () => {
      const { container } = render(<HealthStatus name="DB" status="healthy" size="small" />);
      expect(container.firstChild).toHaveClass('small');
    });

    it('applies large size class', () => {
      const { container } = render(<HealthStatus name="DB" status="healthy" size="large" />);
      expect(container.firstChild).toHaveClass('large');
    });
  });
});

describe('HealthStatus utilities', () => {
  describe('getStatusColor', () => {
    it('returns success color for healthy', () => {
      expect(getStatusColor('healthy')).toContain('success');
    });

    it('returns warning color for degraded', () => {
      expect(getStatusColor('degraded')).toContain('warning');
    });

    it('returns error color for unhealthy', () => {
      expect(getStatusColor('unhealthy')).toContain('error');
    });

    it('returns neutral color for unknown', () => {
      expect(getStatusColor('unknown')).toContain('neutral');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats seconds ago', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString();
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('30 seconds ago');
    });

    it('formats minutes ago', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('formats hours ago', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('formats days ago', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });
  });
});
```

**File**: `tests/components/Badge.test.tsx`

**Test Cases**:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../src/components/Badge';

describe('Badge', () => {
  it('renders children content', () => {
    render(<Badge>5</Badge>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('applies neutral variant by default', () => {
    const { container } = render(<Badge>3</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveStyle({ backgroundColor: expect.stringContaining('neutral') });
  });

  it('applies success variant color', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveStyle({ backgroundColor: expect.stringContaining('success') });
  });

  it('applies warning variant color', () => {
    const { container } = render(<Badge variant="warning">3</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveStyle({ backgroundColor: expect.stringContaining('warning') });
  });

  it('applies error variant color', () => {
    const { container } = render(<Badge variant="error">5</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveStyle({ backgroundColor: expect.stringContaining('error') });
  });

  it('renders small size', () => {
    const { container } = render(<Badge size="small">1</Badge>);
    expect(container.firstChild).toHaveClass('small');
  });

  it('renders large size', () => {
    const { container } = render(<Badge size="large">99+</Badge>);
    expect(container.firstChild).toHaveClass('large');
  });
});
```

**Coverage Target**: >90%

**Validation**: Run `pnpm test:coverage`, verify thresholds met

---

### T026: Create Storybook Stories

**Task**: Create comprehensive Storybook stories for both components.

**File**: `stories/HealthStatus.stories.tsx`

**Stories**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { HealthStatus } from '../src/components/HealthStatus';

const meta: Meta<typeof HealthStatus> = {
  title: 'Components/HealthStatus',
  component: HealthStatus,
  parameters: {
    docs: {
      description: {
        component: 'Displays system health status with color-coded indicators.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof HealthStatus>;

export const Healthy: Story = {
  args: {
    name: 'Database',
    status: 'healthy',
  },
};

export const Degraded: Story = {
  args: {
    name: 'API Server',
    status: 'degraded',
    details: 'High response time (1.2s avg)',
  },
};

export const Unhealthy: Story = {
  args: {
    name: 'Cache Service',
    status: 'unhealthy',
    details: 'Connection refused',
  },
};

export const Unknown: Story = {
  args: {
    name: 'Background Worker',
    status: 'unknown',
  },
};

export const WithLastChecked: Story = {
  args: {
    name: 'Database',
    status: 'healthy',
    lastChecked: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
};

export const SmallSize: Story = {
  args: {
    name: 'API',
    status: 'healthy',
    size: 'small',
  },
};

export const LargeSize: Story = {
  args: {
    name: 'Database',
    status: 'degraded',
    size: 'large',
    details: 'High load detected',
  },
};
```

**File**: `stories/Badge.stories.tsx`

**Stories**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../src/components/Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: {
        component: 'Badge for displaying counts or status labels.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Neutral: Story = {
  args: {
    children: '5',
    variant: 'neutral',
  },
};

export const Success: Story = {
  args: {
    children: 'OK',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: '3',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    children: 'Down',
    variant: 'error',
  },
};

export const Info: Story = {
  args: {
    children: 'New',
    variant: 'info',
  },
};

export const Small: Story = {
  args: {
    children: '1',
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    children: '99+',
    size: 'large',
  },
};
```

**Validation**: Run `pnpm storybook`, verify all stories render correctly

---

## Test Strategy

### Unit Tests (T025)
- **HealthStatus tests**: 15+ test cases covering rendering, status variants, size variants
- **Badge tests**: 10+ test cases covering variants and sizes
- **Utility tests**: 10+ test cases for status mapping and time formatting
- **Coverage target**: >90%

### Visual Tests (T026)
- **Storybook stories**: 14 stories (7 HealthStatus + 7 Badge)
- **Chromatic**: Visual regression snapshots for all stories
- **Manual testing**: Verify all 4 health states have distinct colors

### Accessibility Tests
- **axe-core**: Run in Storybook addon, verify zero violations
- **Color contrast**: Verify icon colors meet WCAG AA (4.5:1 for text)
- **Screen reader**: Test with NVDA/VoiceOver, verify icon aria-label is announced

## Definition of Done

**Must Complete**:
- [ ] HealthStatus component implemented (T021)
- [ ] Status mapped to F01 color tokens (T022)
- [ ] Status icons and labels added (T023)
- [ ] Badge component implemented (T024)
- [ ] Unit tests for both components (>90% coverage) (T025)
- [ ] Storybook stories (14 stories total) (T026)
- [ ] All tests passing (`pnpm test`)
- [ ] Storybook launches without errors (`pnpm storybook`)

**Quality Gates**:
- [ ] Color is not sole indicator (text labels show status)
- [ ] Icon characters render correctly across browsers
- [ ] TypeScript compiles with zero errors
- [ ] ESLint/Prettier checks pass
- [ ] No hardcoded colors (only F01 tokens)

**Documentation**:
- [ ] Component props have JSDoc comments
- [ ] Storybook stories have descriptions
- [ ] B18 integration example in README

## Risks & Mitigation

**Risk 1**: Unicode icon characters may render differently across browsers/fonts
- **Likelihood**: Medium
- **Impact**: Low (visual inconsistency, not broken)
- **Mitigation**: Test on major browsers (Chrome, Firefox, Safari), consider inline SVG as fallback

**Risk 2**: Relative time formatting may confuse users (e.g., "5 minutes ago" vs absolute timestamp)
- **Likelihood**: Low
- **Impact**: Low (preference issue)
- **Mitigation**: Make it optional prop, document in Storybook

**Risk 3**: Badge text color may not meet contrast requirements on all variant backgrounds
- **Likelihood**: Low (F01 tokens designed for accessibility)
- **Impact**: High (WCAG violation)
- **Mitigation**: Use F01 color[800] for text on color[100] backgrounds, verify with axe-core

## Reviewer Guidance

**Pre-Review Checklist**:
1. Verify all 6 subtasks marked complete
2. Run `pnpm test:coverage`, check coverage report
3. Run `pnpm storybook`, test all 14 stories

**Critical Review Points**:
- [ ] HealthStatus uses only F01 color tokens
- [ ] Icon aria-label correctly describes status
- [ ] Badge color combinations meet WCAG AA contrast
- [ ] formatRelativeTime handles edge cases (future dates, invalid dates)
- [ ] All 4 health states have distinct visual appearance

**Acceptance Test**:
1. Open Storybook
2. Navigate to HealthStatus → Degraded story
3. Verify yellow/orange icon and "Degraded" label
4. Open browser DevTools → Inspect icon element
5. Verify role="img" and aria-label="Degraded status"

**Estimated Review Time**: 40 minutes

---

**Next Work Package**: WP05 (Compound Components) requires WP02-WP04 to be complete.

## Activity Log

- 2025-12-13T07:30:23Z – claude – shell_pid=22128 – lane=doing – Started implementation
