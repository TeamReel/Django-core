/**
 * Storybook stories for ResourceCard compound component
 * Demonstrates Header/Body/Footer composition patterns
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ResourceCard } from '../src/components/ResourceCard';
import { HealthStatus } from '../src/components/HealthStatus';
import { ResourceUsageBar } from '../src/components/ResourceUsageBar';
import { Badge } from '../src/components/Badge';

const meta = {
  title: 'Components/ResourceCard',
  component: ResourceCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'compact', 'bordered'],
      description: 'Visual variant of the card',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof ResourceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default card with shadow and standard spacing
 */
export const Default: Story = {
  render: () => (
    <ResourceCard>
      <ResourceCard.Header>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>API Usage</h3>
      </ResourceCard.Header>
      <ResourceCard.Body>
        <ResourceUsageBar value={850} max={1000} label="Monthly API Calls" unit="calls" />
      </ResourceCard.Body>
      <ResourceCard.Footer>
        <button style={{ padding: '8px 16px', cursor: 'pointer' }}>View Details</button>
      </ResourceCard.Footer>
    </ResourceCard>
  ),
};

/**
 * Compact variant with tighter spacing
 */
export const Compact: Story = {
  render: () => (
    <ResourceCard variant="compact">
      <ResourceCard.Header>
        <h4 style={{ margin: 0, fontSize: '16px' }}>Database Status</h4>
      </ResourceCard.Header>
      <ResourceCard.Body>
        <HealthStatus name="Primary DB" status="healthy" size="small" />
      </ResourceCard.Body>
    </ResourceCard>
  ),
};

/**
 * Bordered variant without shadow
 */
export const Bordered: Story = {
  render: () => (
    <ResourceCard variant="bordered">
      <ResourceCard.Header>
        <span style={{ fontSize: '16px', fontWeight: 500 }}>System Health</span>
        <Badge variant="success">All Systems Operational</Badge>
      </ResourceCard.Header>
      <ResourceCard.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <HealthStatus name="API Service" status="healthy" size="small" />
          <HealthStatus name="Database" status="healthy" size="small" />
          <HealthStatus name="Cache" status="healthy" size="small" />
        </div>
      </ResourceCard.Body>
    </ResourceCard>
  ),
};

/**
 * Header and Body only (no Footer)
 */
export const WithoutFooter: Story = {
  render: () => (
    <ResourceCard>
      <ResourceCard.Header>
        <h3 style={{ margin: 0 }}>Credit Usage</h3>
      </ResourceCard.Header>
      <ResourceCard.Body>
        <ResourceUsageBar value={750} max={1000} label="Credits Used" />
        <p style={{ marginTop: '12px', color: '#666', fontSize: '14px' }}>
          You have 250 credits remaining this month.
        </p>
      </ResourceCard.Body>
    </ResourceCard>
  ),
};

/**
 * Body only (minimal card)
 */
export const BodyOnly: Story = {
  render: () => (
    <ResourceCard variant="compact">
      <ResourceCard.Body>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '36px', color: '#16a34a' }}>
            99.9%
          </h2>
          <p style={{ margin: 0, color: '#666' }}>Uptime This Month</p>
        </div>
      </ResourceCard.Body>
    </ResourceCard>
  ),
};

/**
 * Complex header with title and actions
 */
export const HeaderWithActions: Story = {
  render: () => (
    <ResourceCard>
      <ResourceCard.Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, flex: 1 }}>Server Metrics</h3>
          <Badge variant="info" size="small">Live</Badge>
          <button style={{ padding: '4px 12px', fontSize: '14px', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      </ResourceCard.Header>
      <ResourceCard.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ResourceUsageBar value={60} max={100} label="CPU Usage" unit="%" />
          <ResourceUsageBar value={45} max={100} label="Memory Usage" unit="%" />
          <ResourceUsageBar value={30} max={100} label="Disk Usage" unit="%" />
        </div>
      </ResourceCard.Body>
    </ResourceCard>
  ),
};

/**
 * Multiple action buttons in footer
 */
export const FooterWithMultipleActions: Story = {
  render: () => (
    <ResourceCard>
      <ResourceCard.Header>
        <h3 style={{ margin: 0 }}>Pending Approval</h3>
      </ResourceCard.Header>
      <ResourceCard.Body>
        <p style={{ margin: 0, color: '#666' }}>
          3 users are waiting for access approval to this resource.
        </p>
      </ResourceCard.Body>
      <ResourceCard.Footer>
        <button style={{ padding: '8px 16px', marginRight: '8px' }}>Deny All</button>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Approve All
        </button>
      </ResourceCard.Footer>
    </ResourceCard>
  ),
};

/**
 * All three variants side by side
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      <ResourceCard variant="default">
        <ResourceCard.Header>
          <h4 style={{ margin: 0, fontSize: '16px' }}>Default</h4>
        </ResourceCard.Header>
        <ResourceCard.Body>
          <p style={{ margin: 0 }}>Standard card with shadow</p>
        </ResourceCard.Body>
      </ResourceCard>

      <ResourceCard variant="compact">
        <ResourceCard.Header>
          <h4 style={{ margin: 0, fontSize: '16px' }}>Compact</h4>
        </ResourceCard.Header>
        <ResourceCard.Body>
          <p style={{ margin: 0 }}>Tighter spacing</p>
        </ResourceCard.Body>
      </ResourceCard>

      <ResourceCard variant="bordered">
        <ResourceCard.Header>
          <h4 style={{ margin: 0, fontSize: '16px' }}>Bordered</h4>
        </ResourceCard.Header>
        <ResourceCard.Body>
          <p style={{ margin: 0 }}>Border instead of shadow</p>
        </ResourceCard.Body>
      </ResourceCard>
    </div>
  ),
};

/**
 * Real-world dashboard example
 */
export const DashboardExample: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
      <ResourceCard>
        <ResourceCard.Header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>API Credits</h3>
            <Badge variant="warning">85% Used</Badge>
          </div>
        </ResourceCard.Header>
        <ResourceCard.Body>
          <ResourceUsageBar value={850} max={1000} label="Credits" />
        </ResourceCard.Body>
        <ResourceCard.Footer>
          <button style={{ padding: '8px 16px', cursor: 'pointer' }}>Purchase More</button>
        </ResourceCard.Footer>
      </ResourceCard>

      <ResourceCard>
        <ResourceCard.Header>
          <h3 style={{ margin: 0 }}>System Health</h3>
        </ResourceCard.Header>
        <ResourceCard.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <HealthStatus name="API" status="healthy" size="small" />
            <HealthStatus name="Database" status="degraded" details="High latency" size="small" />
            <HealthStatus name="Cache" status="healthy" size="small" />
          </div>
        </ResourceCard.Body>
        <ResourceCard.Footer>
          <button style={{ padding: '8px 16px', cursor: 'pointer' }}>View Logs</button>
        </ResourceCard.Footer>
      </ResourceCard>
    </div>
  ),
};
