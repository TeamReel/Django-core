/**
 * Storybook stories for HealthStatus component
 * Demonstrates all status variants, colors, and sizes
 */

import type { Meta, StoryObj } from '@storybook/react';
import { HealthStatus } from '../src/components/HealthStatus';

const meta = {
  title: 'Components/HealthStatus',
  component: HealthStatus,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'Name of the service or system being monitored',
    },
    status: {
      control: 'select',
      options: ['healthy', 'degraded', 'unhealthy', 'unknown'],
      description: 'Current health status',
    },
    details: {
      control: 'text',
      description: 'Optional additional details about the status',
    },
    lastChecked: {
      control: 'text',
      description: 'ISO 8601 timestamp of last health check',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Size variant',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof HealthStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

// Calculate timestamps for stories (5 minutes ago, 1 hour ago, etc.)
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

/**
 * Healthy status - shows a green checkmark icon with "Operational" label
 */
export const Healthy: Story = {
  args: {
    name: 'API Service',
    status: 'healthy',
    lastChecked: fiveMinutesAgo,
  },
};

/**
 * Degraded status - shows a yellow warning icon with "Degraded" label
 */
export const Degraded: Story = {
  args: {
    name: 'Database Connection',
    status: 'degraded',
    details: 'High latency detected (>500ms)',
    lastChecked: oneHourAgo,
  },
};

/**
 * Unhealthy status - shows a red X icon with "Down" label
 */
export const Unhealthy: Story = {
  args: {
    name: 'Cache Service',
    status: 'unhealthy',
    details: 'Connection timeout after 30s',
    lastChecked: fiveMinutesAgo,
  },
};

/**
 * Unknown status - shows a gray question mark icon with "Unknown" label
 */
export const Unknown: Story = {
  args: {
    name: 'External API',
    status: 'unknown',
    details: 'No recent health check data',
    lastChecked: oneDayAgo,
  },
};

/**
 * Small size variant - compact display for dashboard cards
 */
export const SmallSize: Story = {
  args: {
    name: 'Cache',
    status: 'healthy',
    size: 'small',
    lastChecked: fiveMinutesAgo,
  },
};

/**
 * Large size variant - prominent display for status pages
 */
export const LargeSize: Story = {
  args: {
    name: 'Primary Database',
    status: 'healthy',
    size: 'large',
    details: 'All connections healthy, 23ms avg response time',
    lastChecked: fiveMinutesAgo,
  },
};

/**
 * Without timestamp - basic status display without last checked information
 */
export const WithoutTimestamp: Story = {
  args: {
    name: 'Background Worker',
    status: 'healthy',
  },
};

/**
 * Multiple statuses - demonstrates all variants side by side
 */
export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '400px' }}>
      <HealthStatus name="API Service" status="healthy" lastChecked={fiveMinutesAgo} />
      <HealthStatus
        name="Database"
        status="degraded"
        details="High load detected"
        lastChecked={oneHourAgo}
      />
      <HealthStatus
        name="Cache"
        status="unhealthy"
        details="Connection failed"
        lastChecked={fiveMinutesAgo}
      />
      <HealthStatus
        name="External Service"
        status="unknown"
        details="No data available"
        lastChecked={oneDayAgo}
      />
    </div>
  ),
};
