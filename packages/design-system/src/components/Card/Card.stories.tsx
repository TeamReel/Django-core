import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['outlined', 'elevated', 'filled'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: 'This is an outlined card with a border.',
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: 'This is an elevated card with a shadow.',
  },
};

export const Filled: Story = {
  args: {
    variant: 'filled',
    children: 'This is a filled card with background color.',
  },
};

export const PaddingNone: Story = {
  args: {
    padding: 'none',
    children: 'This card has no padding.',
  },
};

export const PaddingSmall: Story = {
  args: {
    padding: 'sm',
    children: 'This card has small padding.',
  },
};

export const PaddingMedium: Story = {
  args: {
    padding: 'md',
    children: 'This card has medium padding (default).',
  },
};

export const PaddingLarge: Story = {
  args: {
    padding: 'lg',
    children: 'This card has large padding.',
  },
};

export const WithComplexContent: Story = {
  args: {
    variant: 'outlined',
    padding: 'lg',
    children: (
      <>
        <h3 style={{ marginTop: 0 }}>Card Title</h3>
        <p>
          This card contains more complex content including multiple elements.
          It demonstrates how the Card component can be used as a container for
          structured content.
        </p>
        <button type="button" style={{ marginTop: '1rem' }}>
          Action Button
        </button>
      </>
    ),
  },
};

export const UserProfile: Story = {
  args: {
    variant: 'elevated',
    padding: 'md',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            JD
          </div>
          <div>
            <h4 style={{ margin: 0 }}>John Doe</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              john.doe@example.com
            </p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          Software Engineer with 5 years of experience in React and TypeScript.
        </p>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
      <Card variant="outlined">Outlined variant</Card>
      <Card variant="elevated">Elevated variant</Card>
      <Card variant="filled">Filled variant</Card>
    </div>
  ),
};

export const AllPaddingSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
      <Card padding="none" variant="outlined">
        No padding
      </Card>
      <Card padding="sm" variant="outlined">
        Small padding
      </Card>
      <Card padding="md" variant="outlined">
        Medium padding
      </Card>
      <Card padding="lg" variant="outlined">
        Large padding
      </Card>
    </div>
  ),
};
