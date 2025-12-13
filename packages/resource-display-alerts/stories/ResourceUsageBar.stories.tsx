import type { Meta, StoryObj } from '@storybook/react';
import { ResourceUsageBar } from '../src/components/ResourceUsageBar';

const meta: Meta<typeof ResourceUsageBar> = {
  title: 'Components/ResourceUsageBar',
  component: ResourceUsageBar,
  parameters: {
    docs: {
      description: {
        component:
          'Progress bar for visualizing resource usage (credits, storage, API calls) with severity-based colors. Displays usage percentage with automatic color coding: green (0-50%), yellow (50-80%), red (80%+).',
      },
    },
  },
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 1500, step: 50 },
      description: 'Current usage value',
    },
    max: {
      control: { type: 'number', min: 100, max: 1000, step: 100 },
      description: 'Maximum value',
    },
    label: {
      control: 'text',
      description: 'Optional label shown above the bar',
    },
    unit: {
      control: 'text',
      description: 'Optional unit for value display (e.g., "credits", "GB")',
    },
    showPercentage: {
      control: 'boolean',
      description: 'Show percentage instead of value/max',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ResourceUsageBar>;

/**
 * Low usage (0-50%) displays green color indicating safe usage level
 */
export const LowUsage: Story = {
  args: {
    value: 300,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

/**
 * Medium usage (50-80%) displays yellow color as a caution indicator
 */
export const MediumUsage: Story = {
  args: {
    value: 650,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

/**
 * High usage (80-100%) displays red color and includes "warning" in ARIA label
 */
export const HighUsage: Story = {
  args: {
    value: 850,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

/**
 * Very high usage (95%+) near the limit, still red
 */
export const VeryHighUsage: Story = {
  args: {
    value: 950,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

/**
 * Over-quota scenario (>100%) - bar caps at 100% width but text shows actual value
 */
export const OverQuota: Story = {
  args: {
    value: 1200,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

/**
 * Percentage display mode instead of value/max
 */
export const PercentageDisplay: Story = {
  args: {
    value: 85,
    max: 100,
    label: 'Storage Usage',
    showPercentage: true,
  },
};

/**
 * Component without label
 */
export const NoLabel: Story = {
  args: {
    value: 750,
    max: 1000,
    unit: 'credits',
  },
};

/**
 * Storage usage example with GB units
 */
export const StorageUsage: Story = {
  args: {
    value: 45,
    max: 100,
    label: 'Storage',
    unit: 'GB',
  },
};

/**
 * Empty state (0% usage)
 */
export const Empty: Story = {
  args: {
    value: 0,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

/**
 * Full usage (100% exactly)
 */
export const Full: Story = {
  args: {
    value: 1000,
    max: 1000,
    label: 'API Credits',
    unit: 'credits',
  },
};

/**
 * Interactive playground for testing different values and configurations
 */
export const Playground: Story = {
  args: {
    value: 500,
    max: 1000,
    label: 'Resource Usage',
    unit: 'units',
    showPercentage: false,
  },
};
