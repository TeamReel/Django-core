import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    label: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const CustomLabel: Story = {
  args: {
    label: 'Processing your request',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="sm" />
        <div style={{ marginTop: '8px', fontSize: '12px' }}>Small</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="md" />
        <div style={{ marginTop: '8px', fontSize: '12px' }}>Medium</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="lg" />
        <div style={{ marginTop: '8px', fontSize: '12px' }}>Large</div>
      </div>
    </div>
  ),
};

export const InlineUsage: Story = {
  render: () => (
    <div style={{ fontSize: '16px', lineHeight: '1.5' }}>
      <p>
        Loading <Spinner size="sm" label="Loading" /> please wait...
      </p>
      <p style={{ marginTop: '16px' }}>
        Processing your request <Spinner size="sm" label="Processing" />
      </p>
    </div>
  ),
};

export const ButtonWithSpinner: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          cursor: 'not-allowed',
          opacity: 0.7,
        }}
        disabled
      >
        <Spinner size="sm" />
        Loading...
      </button>
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          cursor: 'not-allowed',
          opacity: 0.7,
        }}
        disabled
      >
        <Spinner size="md" />
        Processing
      </button>
    </div>
  ),
};

export const CenteredLoading: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '48px',
      }}
    >
      <Spinner size="lg" />
      <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading your content...</div>
    </div>
  ),
};

export const FullPageLoading: Story = {
  render: () => (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
      }}
    >
      <Spinner size="lg" label="Loading application" />
      <div style={{ fontSize: '18px', fontWeight: 500, color: '#374151' }}>
        Loading application...
      </div>
    </div>
  ),
};

export const LoadingStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <Spinner size="sm" label="Connecting" />
        <span>Connecting to server...</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <Spinner size="sm" label="Uploading" />
        <span>Uploading files...</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <Spinner size="sm" label="Processing" />
        <span>Processing data...</span>
      </div>
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div style={{ textAlign: 'center' }}>
      <Spinner size="lg" />
      <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280', maxWidth: '300px' }}>
        This spinner respects the <code>prefers-reduced-motion</code> setting. When enabled, the
        animation is disabled for accessibility.
      </div>
    </div>
  ),
};
