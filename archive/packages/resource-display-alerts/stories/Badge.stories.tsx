/**
 * Storybook stories for Badge component
 * Demonstrates all color variants and sizes
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../src/components/Badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'error', 'info'],
      description: 'Color variant for the badge',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Size variant',
    },
    children: {
      control: 'text',
      description: 'Badge content (text, number, icon)',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default badge - neutral variant with medium size
 */
export const Default: Story = {
  args: {
    children: 'Default',
  },
};

/**
 * Success badge - green background for positive statuses
 */
export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Active',
  },
};

/**
 * Warning badge - yellow/orange background for warnings
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Pending',
  },
};

/**
 * Error badge - red background for errors or failures
 */
export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Failed',
  },
};

/**
 * Info badge - blue background for informational statuses
 */
export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Beta',
  },
};

/**
 * Small size - compact badge for inline use
 */
export const SmallSize: Story = {
  args: {
    variant: 'success',
    size: 'small',
    children: 'NEW',
  },
};

/**
 * Large size - prominent badge for emphasis
 */
export const LargeSize: Story = {
  args: {
    variant: 'warning',
    size: 'large',
    children: 'Important',
  },
};

/**
 * Number badges - displaying counts
 */
export const Numbers: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge variant="neutral">1</Badge>
      <Badge variant="info">5</Badge>
      <Badge variant="success">23</Badge>
      <Badge variant="warning">99</Badge>
      <Badge variant="error">99+</Badge>
    </div>
  ),
};

/**
 * All variants - demonstrates all color options
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

/**
 * All sizes - demonstrates size variants
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge variant="info" size="small">
        Small
      </Badge>
      <Badge variant="info" size="medium">
        Medium
      </Badge>
      <Badge variant="info" size="large">
        Large
      </Badge>
    </div>
  ),
};

/**
 * In context - shows badges used within text
 */
export const InContext: Story = {
  render: () => (
    <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
      <p>
        API Service <Badge variant="success">Healthy</Badge>
      </p>
      <p>
        Database <Badge variant="warning">Degraded</Badge>
      </p>
      <p>
        Cache <Badge variant="error">Down</Badge>
      </p>
      <p>
        You have <Badge variant="info">3</Badge> unread notifications
      </p>
    </div>
  ),
};

/**
 * Status combinations - realistic usage examples
 */
export const StatusExamples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Build Status:</span>
        <Badge variant="success">Passing</Badge>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Test Coverage:</span>
        <Badge variant="success">91.37%</Badge>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>API Rate Limit:</span>
        <Badge variant="warning">850/1000</Badge>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Failed Jobs:</span>
        <Badge variant="error">5</Badge>
      </div>
    </div>
  ),
};
