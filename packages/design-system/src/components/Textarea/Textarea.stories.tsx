import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['default', 'error', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    resize: {
      control: 'select',
      options: ['none', 'vertical', 'both'],
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter your description...',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself...',
    helperText: 'Maximum 500 characters',
  },
};

export const WithoutLabel: Story = {
  args: {
    placeholder: 'No label example...',
  },
};

export const WithError: Story = {
  args: {
    label: 'Comments',
    error: 'This field is required',
    placeholder: 'Enter comments...',
  },
};

export const WithSuccess: Story = {
  args: {
    label: 'Feedback',
    success: 'Thank you for your feedback!',
    placeholder: 'Your feedback...',
  },
};

export const Required: Story = {
  args: {
    label: 'Message',
    required: true,
    placeholder: 'Required field...',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    disabled: true,
    placeholder: 'This textarea is disabled...',
  },
};

export const SmallSize: Story = {
  args: {
    label: 'Small Textarea',
    size: 'sm',
    placeholder: 'Small size...',
  },
};

export const MediumSize: Story = {
  args: {
    label: 'Medium Textarea',
    size: 'md',
    placeholder: 'Medium size (default)...',
  },
};

export const LargeSize: Story = {
  args: {
    label: 'Large Textarea',
    size: 'lg',
    placeholder: 'Large size...',
  },
};

export const NoResize: Story = {
  args: {
    label: 'No Resize',
    resize: 'none',
    placeholder: 'Cannot be resized...',
  },
};

export const VerticalResize: Story = {
  args: {
    label: 'Vertical Resize',
    resize: 'vertical',
    placeholder: 'Can be resized vertically (default)...',
  },
};

export const BothResize: Story = {
  args: {
    label: 'Both Resize',
    resize: 'both',
    placeholder: 'Can be resized in both directions...',
  },
};

export const CustomRows: Story = {
  args: {
    label: 'Custom Rows',
    rows: 10,
    placeholder: '10 rows tall...',
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
      <Textarea label="Default State" placeholder="Default..." />
      <Textarea label="Error State" error="This field has an error" placeholder="Error..." />
      <Textarea label="Success State" success="Looks good!" placeholder="Success..." />
      <Textarea label="Disabled State" disabled placeholder="Disabled..." />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
      <Textarea label="Small" size="sm" placeholder="Small size..." />
      <Textarea label="Medium" size="md" placeholder="Medium size..." />
      <Textarea label="Large" size="lg" placeholder="Large size..." />
    </div>
  ),
};

export const AllResizeModes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>
      <Textarea label="No Resize" resize="none" placeholder="Cannot resize..." />
      <Textarea label="Vertical Resize" resize="vertical" placeholder="Resize vertically..." />
      <Textarea label="Both Resize" resize="both" placeholder="Resize both ways..." />
    </div>
  ),
};
