import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

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
      options: ['default', 'primary', 'success', 'warning', 'error'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Error',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    variant: 'primary',
    children: 'Small',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    variant: 'primary',
    children: 'Medium',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge variant="primary" size="sm">
        Small
      </Badge>
      <Badge variant="primary" size="md">
        Medium
      </Badge>
    </div>
  ),
};

export const InlineUsage: Story = {
  render: () => (
    <div style={{ fontSize: '16px', lineHeight: '1.5' }}>
      <p>
        Your account status is <Badge variant="success">Active</Badge> and you have{' '}
        <Badge variant="primary">3</Badge> unread messages.
      </p>
      <p>
        Latest notification: <Badge variant="warning" size="sm">
          Pending
        </Badge>
      </p>
    </div>
  ),
};

export const StatusIndicators: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Server Status:</span>
        <Badge variant="success">Online</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Build Status:</span>
        <Badge variant="error">Failed</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Deploy Status:</span>
        <Badge variant="warning">In Progress</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Test Coverage:</span>
        <Badge variant="primary">96%</Badge>
      </div>
    </div>
  ),
};

export const NotificationBadges: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button style={{ padding: '8px 16px' }}>
          Messages
          <Badge variant="error" size="sm" style={{ marginLeft: '8px' }}>
            5
          </Badge>
        </button>
      </div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button style={{ padding: '8px 16px' }}>
          Notifications
          <Badge variant="primary" size="sm" style={{ marginLeft: '8px' }}>
            12
          </Badge>
        </button>
      </div>
    </div>
  ),
};
