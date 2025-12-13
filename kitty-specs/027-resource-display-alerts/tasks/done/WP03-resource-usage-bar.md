---
lane: "done"
agent: "claude-reviewer"
shell_pid: "22128"
assignee: "claude"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---
# WP03: Resource Usage Bar Component

---
**work_package_id**: WP03
**status**: done
**priority**: P1 (Core functionality)
**user_story**: US1 - View Resource Usage Near Limits
**subtasks**: [T015, T016, T017, T018, T019, T020]
**dependencies**: WP01 (package scaffold must exist)
**parallel**: Can run in parallel with WP02, WP04 after WP01
**history**:
  - 2025-12-12: Created task prompt from Phase 3 breakdown
  - 2025-12-13: Code review completed by claude-reviewer - APPROVED (100% coverage, all tests passing)

---

## Objective

Implement ResourceUsageBar component that visualizes resource usage (credits, storage, API calls) with severity-based colors. Component should display percentage progress, map usage thresholds to warning levels (low/medium/high), and meet WCAG accessibility requirements with proper ARIA attributes.

## Context

**Feature**: 027-resource-display-alerts (F05 Resource Display & Alerts)
**User Story**: US1 - View Resource Usage Near Limits
**Related Documents**:
- [spec.md](../../spec.md) - See US1 acceptance scenarios (85%/95% thresholds)
- [plan.md](../../plan.md) - See Component Architecture section
- [contracts/B11-billing-credits.ts](../../contracts/B11-billing-credits.ts) - Data shape from backend

**Key Requirements** (from spec.md):
- FR-001: Display resource usage as percentage (value/max * 100)
- FR-002a: Color thresholds: 0-50% (green), 50-80% (yellow), 80-100% (red)
- FR-003: Show optional label and unit (e.g., "API Credits", "850/1000 calls")
- FR-010a: ARIA progressbar role with valuenow/valuemin/valuemax attributes

**Technical Context**:
- F01 provides colorVars tokens for success/warning/error states
- F01 provides spacingVars for consistent padding
- Component should be stateless (data passed via props)

**Success Criteria**:
- Render ResourceUsageBar with value=85, max=100 → yellow warning color
- Display "85%" label or custom format like "850/1000 credits"
- ARIA attributes allow screen readers to announce "85% full"

## Detailed Guidance

### T015: Create ResourceUsageBar Component with Props Interface

**Task**: Define TypeScript props interface and component structure.

**File**: `src/components/ResourceUsageBar/ResourceUsageBar.tsx`

**Props Interface**:
```typescript
export interface ResourceUsageBarProps {
  /**
   * Current usage value (numeric)
   */
  value: number;

  /**
   * Maximum value (denominator for percentage calculation)
   */
  max: number;

  /**
   * Optional label shown above or beside the progress bar
   * @example "API Credits"
   */
  label?: string;

  /**
   * Optional unit for value display
   * @example "credits", "GB", "calls"
   */
  unit?: string;

  /**
   * Whether to show percentage (e.g., "85%") or value/max (e.g., "850/1000")
   * @default false (shows value/max)
   */
  showPercentage?: boolean;

  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Optional ARIA label (overrides default)
   */
  'aria-label'?: string;
}
```

**Component Skeleton**:
```typescript
import React from 'react';
import styles from './ResourceUsageBar.module.css'; // We'll use CSS modules

export const ResourceUsageBar: React.FC<ResourceUsageBarProps> = ({
  value,
  max,
  label,
  unit,
  showPercentage = false,
  className,
  'aria-label': ariaLabel,
}) => {
  // T016: Calculate percentage and severity
  const percentage = (value / max) * 100;
  const severity = getSeverity(percentage);

  // T017: Apply F01 color tokens
  const barColor = getSeverityColor(severity);

  // Format display text
  const displayText = showPercentage
    ? `${Math.round(percentage)}%`
    : `${value}/${max}${unit ? ` ${unit}` : ''}`;

  return (
    <div className={className}>
      {label && <div className={styles.label}>{label}</div>}

      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel || `${label || 'Resource usage'}: ${displayText}`}
        className={styles.container}
      >
        <div
          className={styles.bar}
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      <div className={styles.text}>{displayText}</div>
    </div>
  );
};
```

**Validation**: Component renders without TypeScript errors

---

### T016: Implement Percentage Calculation and Severity Mapping

**Task**: Add utility functions for percentage calculation and threshold mapping.

**File**: `src/components/ResourceUsageBar/utils.ts`

**Implementation**:
```typescript
export type Severity = 'low' | 'medium' | 'high';

/**
 * Calculate percentage from value and max
 * @returns Percentage (0-100+, can exceed 100 for over-quota scenarios)
 */
export const calculatePercentage = (value: number, max: number): number => {
  if (max === 0) return 0; // Avoid division by zero
  return (value / max) * 100;
};

/**
 * Map percentage to severity level
 * - 0-50%: low (green)
 * - 50-80%: medium (yellow)
 * - 80-100%+: high (red)
 */
export const getSeverity = (percentage: number): Severity => {
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
};

/**
 * Format display text based on options
 */
export const formatDisplayText = (
  value: number,
  max: number,
  unit?: string,
  showPercentage?: boolean
): string => {
  if (showPercentage) {
    const percentage = calculatePercentage(value, max);
    return `${Math.round(percentage)}%`;
  }

  return `${value}/${max}${unit ? ` ${unit}` : ''}`;
};
```

**Update ResourceUsageBar.tsx** to use these utilities:
```typescript
import { calculatePercentage, getSeverity, formatDisplayText } from './utils';

export const ResourceUsageBar: React.FC<ResourceUsageBarProps> = ({
  value,
  max,
  label,
  unit,
  showPercentage = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const percentage = calculatePercentage(value, max);
  const severity = getSeverity(percentage);
  const displayText = formatDisplayText(value, max, unit, showPercentage);

  // ... rest of component
};
```

**Validation**: Percentage calculation handles edge cases (max=0, value>max)

---

### T017: Style with F01 Tokens

**Task**: Apply F01 design system tokens for colors and spacing.

**File**: `src/components/ResourceUsageBar/ResourceUsageBar.module.css`

**Implementation**:
```css
/* Import F01 tokens */
@import '@django-core/design-system/tokens';

.container {
  position: relative;
  width: 100%;
  height: var(--spacing-6); /* F01 spacing token: 24px */
  background-color: var(--color-neutral-100); /* F01 neutral background */
  border-radius: var(--border-radius-sm); /* F01 border radius */
  overflow: hidden;
}

.bar {
  height: 100%;
  transition: width 0.3s ease, background-color 0.2s ease;
  /* background-color set inline via style prop */
}

.label {
  font-size: var(--font-size-sm); /* F01 typography token */
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
  margin-bottom: var(--spacing-2); /* 8px */
}

.text {
  font-size: var(--font-size-xs); /* F01 typography token */
  color: var(--color-neutral-600);
  margin-top: var(--spacing-1); /* 4px */
  text-align: right;
}

/* Responsive: Stack label and text on small screens */
@media (max-width: 640px) {
  .label,
  .text {
    text-align: left;
  }
}
```

**Add severity color utility** in `utils.ts`:
```typescript
import { colorVars } from '@django-core/design-system/tokens';

/**
 * Get F01 color token for severity level
 */
export const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case 'low':
      return colorVars.palette.success[500]; // Green
    case 'medium':
      return colorVars.palette.warning[500]; // Yellow
    case 'high':
      return colorVars.palette.error[500]; // Red
  }
};
```

**Update component** to use color utility:
```typescript
import { getSeverityColor } from './utils';

// In component render:
const barColor = getSeverityColor(severity);
```

**Validation**: Component uses only F01 tokens (no hardcoded colors/spacing)

---

### T018: Add ARIA Attributes

**Task**: Ensure component meets WCAG 2.1 AA accessibility requirements.

**Already implemented in T015** (role="progressbar", aria-valuenow, etc.), but verify:

**Accessibility Checklist**:
- [ ] `role="progressbar"` on container element
- [ ] `aria-valuenow={value}` (current value)
- [ ] `aria-valuemin={0}` (minimum value)
- [ ] `aria-valuemax={max}` (maximum value)
- [ ] `aria-label` describes resource (e.g., "API Credits: 850/1000")
- [ ] Color is not the only indicator (text label also shows value)

**Enhanced ARIA label**:
```typescript
const ariaLabelText = ariaLabel || (() => {
  const severityText = severity === 'high' ? 'warning: high usage' : '';
  return `${label || 'Resource usage'}: ${displayText} ${severityText}`.trim();
})();

// Use in component:
aria-label={ariaLabelText}
```

**Validation**: Screen reader announces "API Credits: 850/1000 credits, warning: high usage"

---

### T019: Write Unit Tests

**Task**: Comprehensive unit tests for component and utilities.

**File**: `tests/components/ResourceUsageBar.test.tsx`

**Test Cases**:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResourceUsageBar } from '../../src/components/ResourceUsageBar';
import { calculatePercentage, getSeverity, formatDisplayText } from '../../src/components/ResourceUsageBar/utils';

describe('ResourceUsageBar', () => {
  describe('rendering', () => {
    it('renders with basic props', () => {
      render(<ResourceUsageBar value={50} max={100} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays label when provided', () => {
      render(<ResourceUsageBar value={50} max={100} label="API Credits" />);
      expect(screen.getByText('API Credits')).toBeInTheDocument();
    });

    it('shows value/max by default', () => {
      render(<ResourceUsageBar value={850} max={1000} unit="credits" />);
      expect(screen.getByText('850/1000 credits')).toBeInTheDocument();
    });

    it('shows percentage when showPercentage=true', () => {
      render(<ResourceUsageBar value={85} max={100} showPercentage />);
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('ARIA attributes', () => {
    it('has correct progressbar role', () => {
      render(<ResourceUsageBar value={50} max={100} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('includes severity in aria-label when high', () => {
      render(<ResourceUsageBar value={90} max={100} label="Credits" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', expect.stringContaining('warning'));
    });
  });

  describe('severity colors', () => {
    it('applies low severity color (green) for <50%', () => {
      const { container } = render(<ResourceUsageBar value={30} max={100} />);
      const bar = container.querySelector('.bar');
      expect(bar).toHaveStyle({ backgroundColor: expect.stringContaining('success') });
    });

    it('applies medium severity color (yellow) for 50-80%', () => {
      const { container } = render(<ResourceUsageBar value={65} max={100} />);
      const bar = container.querySelector('.bar');
      expect(bar).toHaveStyle({ backgroundColor: expect.stringContaining('warning') });
    });

    it('applies high severity color (red) for >=80%', () => {
      const { container } = render(<ResourceUsageBar value={90} max={100} />);
      const bar = container.querySelector('.bar');
      expect(bar).toHaveStyle({ backgroundColor: expect.stringContaining('error') });
    });
  });

  describe('edge cases', () => {
    it('handles value > max (over-quota)', () => {
      render(<ResourceUsageBar value={120} max={100} showPercentage />);
      expect(screen.getByText('120%')).toBeInTheDocument();
      // Bar width should cap at 100%
      const { container } = render(<ResourceUsageBar value={120} max={100} />);
      const bar = container.querySelector('.bar');
      expect(bar).toHaveStyle({ width: '100%' });
    });

    it('handles max=0 without crashing', () => {
      render(<ResourceUsageBar value={0} max={0} />);
      expect(screen.getByText('0/0')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      render(<ResourceUsageBar value={-10} max={100} showPercentage />);
      expect(screen.getByText('-10%')).toBeInTheDocument();
    });
  });
});

describe('ResourceUsageBar utilities', () => {
  describe('calculatePercentage', () => {
    it('calculates correct percentage', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(850, 1000)).toBe(85);
    });

    it('handles over-quota', () => {
      expect(calculatePercentage(120, 100)).toBe(120);
    });

    it('handles max=0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });
  });

  describe('getSeverity', () => {
    it('returns low for <50%', () => {
      expect(getSeverity(0)).toBe('low');
      expect(getSeverity(49.9)).toBe('low');
    });

    it('returns medium for 50-80%', () => {
      expect(getSeverity(50)).toBe('medium');
      expect(getSeverity(79.9)).toBe('medium');
    });

    it('returns high for >=80%', () => {
      expect(getSeverity(80)).toBe('high');
      expect(getSeverity(100)).toBe('high');
      expect(getSeverity(120)).toBe('high');
    });
  });

  describe('formatDisplayText', () => {
    it('formats value/max with unit', () => {
      expect(formatDisplayText(850, 1000, 'credits')).toBe('850/1000 credits');
    });

    it('formats percentage', () => {
      expect(formatDisplayText(85, 100, undefined, true)).toBe('85%');
    });

    it('handles no unit', () => {
      expect(formatDisplayText(50, 100)).toBe('50/100');
    });
  });
});
```

**Coverage Target**: >90%

**Validation**: Run `pnpm test:coverage`, verify thresholds met

---

### T020: Create Storybook Stories

**Task**: Create comprehensive Storybook stories for all usage scenarios.

**File**: `stories/ResourceUsageBar.stories.tsx`

**Stories**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ResourceUsageBar } from '../src/components/ResourceUsageBar';

const meta: Meta<typeof ResourceUsageBar> = {
  title: 'Components/ResourceUsageBar',
  component: ResourceUsageBar,
  parameters: {
    docs: {
      description: {
        component: 'Progress bar for visualizing resource usage with severity-based colors.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 150, step: 5 } },
    max: { control: { type: 'number', min: 0, max: 1000, step: 100 } },
    showPercentage: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ResourceUsageBar>;

// Low usage (green)
export const LowUsage: Story = {
  args: {
    value: 300,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

// Medium usage (yellow)
export const MediumUsage: Story = {
  args: {
    value: 650,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

// High usage (red) - triggers warning
export const HighUsage: Story = {
  args: {
    value: 850,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

// Very high usage (red) - near limit
export const VeryHighUsage: Story = {
  args: {
    value: 950,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

// Over quota
export const OverQuota: Story = {
  args: {
    value: 1200,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

// Percentage display
export const PercentageDisplay: Story = {
  args: {
    value: 85,
    max: 100,
    label: 'Storage Usage',
    showPercentage: true,
  },
};

// No label
export const NoLabel: Story = {
  args: {
    value: 750,
    max: 1000,
  },
};

// Different units
export const StorageUsage: Story = {
  args: {
    value: 45,
    max: 100,
    label: 'Storage',
    unit: 'GB',
  },
};

// Edge case: Empty
export const Empty: Story = {
  args: {
    value: 0,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

// Edge case: Full
export const Full: Story = {
  args: {
    value: 1000,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

// Interactive playground
export const Playground: Story = {
  args: {
    value: 500,
    max: 1000,
    label: 'Resource Usage',
    unit: 'units',
    showPercentage: false,
  },
};
```

**Chromatic Configuration**:
Add to `.storybook/main.ts`:
```typescript
  viteFinal: async (config) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          '@django-core/design-system/tokens': path.resolve(__dirname, '../node_modules/@django-core/design-system/dist/tokens'),
        },
      },
    };
  },
```

**Validation**: Run `pnpm storybook`, verify all 11 stories render with correct colors

---

## Test Strategy

### Unit Tests (T019)
- **Component tests**: 15+ test cases covering rendering, ARIA, severity colors, edge cases
- **Utility tests**: 10+ test cases for calculatePercentage, getSeverity, formatDisplayText
- **Coverage target**: >90%
- **Edge cases**: value>max, max=0, negative values

### Visual Tests (T020)
- **Storybook stories**: 11 stories showing all severity levels and edge cases
- **Chromatic**: Visual regression snapshots for all stories
- **Manual testing**: Adjust value slider in Playground story, verify color changes

### Accessibility Tests
- **axe-core**: Run in Storybook addon, verify zero violations
- **Screen reader**: Test with NVDA/VoiceOver, verify progressbar announcement

## Definition of Done

**Must Complete**:
- [ ] ResourceUsageBar component implemented (T015)
- [ ] Percentage calculation and severity mapping (T016)
- [ ] F01 tokens applied for colors and spacing (T017)
- [ ] ARIA attributes for progressbar role (T018)
- [ ] Unit tests (>90% coverage) (T019)
- [ ] Storybook stories (11 stories) (T020)
- [ ] All tests passing (`pnpm test`)
- [ ] Storybook launches without errors (`pnpm storybook`)

**Quality Gates**:
- [ ] Color is not sole indicator (text label shows value)
- [ ] Component handles edge cases without crashing (max=0, value>max)
- [ ] TypeScript compiles with zero errors
- [ ] ESLint/Prettier checks pass
- [ ] No hardcoded colors or spacing (only F01 tokens)

**Documentation**:
- [ ] Component props have JSDoc comments
- [ ] Storybook stories have descriptions
- [ ] Edge cases documented in README

## Risks & Mitigation

**Risk 1**: Color-only severity may fail WCAG color contrast
- **Likelihood**: Low (F01 tokens are WCAG AA compliant)
- **Impact**: High (accessibility violation)
- **Mitigation**: F01 color tokens already tested for contrast, verify with axe-core

**Risk 2**: Over-quota scenarios (value>max) may confuse users
- **Likelihood**: Medium (possible in billing context)
- **Impact**: Medium (UI shows >100%, may look broken)
- **Mitigation**: Cap bar width at 100%, show text as "1200/1000" to indicate over-quota

**Risk 3**: Animation performance on low-end devices
- **Likelihood**: Low
- **Impact**: Low (minor jank)
- **Mitigation**: Use CSS transition (GPU-accelerated), test on mobile

## Reviewer Guidance

**Pre-Review Checklist**:
1. Verify all 6 subtasks marked complete
2. Run `pnpm test:coverage`, check coverage report
3. Run `pnpm storybook`, test Playground story interactively

**Critical Review Points**:
- [ ] Component uses only F01 tokens (no hardcoded values in CSS)
- [ ] ARIA attributes correctly implement progressbar role
- [ ] Severity thresholds match spec.md (50%, 80%)
- [ ] Edge cases handled: max=0, value>max, negative values
- [ ] Unit tests cover all severity levels

**Acceptance Test**:
1. Open Storybook
2. Navigate to HighUsage story (850/1000)
3. Verify bar is red (error color)
4. Verify text shows "850/1000 credits"
5. Open browser DevTools → Accessibility tree
6. Verify progressbar role with correct aria-valuenow/min/max

**Estimated Review Time**: 45 minutes

---

**Next Work Package**: WP04 (Health Status & Badge) can proceed in parallel.

## Activity Log

- 2025-12-12T21:51:19Z – claude – shell_pid=22128 – lane=doing – Started implementation
- 2025-12-12T21:57:15Z – claude – shell_pid=22128 – lane=for_review – All subtasks complete
- 2025-12-13T07:27:47Z – claude-reviewer – shell_pid=22128 – lane=done – Code review complete: APPROVED - 100% coverage, all tests passing, excellent implementation
