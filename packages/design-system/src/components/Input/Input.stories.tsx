import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
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
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    helperText: "We'll never share your email with anyone else.",
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    error: 'Please enter a valid email address',
  },
};

export const WithSuccess: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    success: 'Email is valid!',
  },
};

export const Required: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    required: true,
    helperText: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    disabled: true,
    value: 'disabled@example.com',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    helperText: 'Must be at least 8 characters',
  },
};

export const SmallSize: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    size: 'sm',
  },
};

export const MediumSize: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    size: 'md',
  },
};

export const LargeSize: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    size: 'lg',
  },
};

export const WithoutLabel: Story = {
  args: {
    placeholder: 'Search...',
    'aria-label': 'Search',
  },
};

export const Number: Story = {
  args: {
    label: 'Age',
    type: 'number',
    placeholder: 'Enter your age',
    min: 0,
    max: 120,
  },
};

export const Email: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'user@example.com',
    helperText: 'Enter a valid email address',
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Input label="Default" placeholder="Default state" />
      <Input label="Error" placeholder="Error state" error="This field has an error" />
      <Input label="Success" placeholder="Success state" success="Looks good!" />
      <Input label="Disabled" placeholder="Disabled state" disabled />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Input label="Small" placeholder="Small size" size="sm" />
      <Input label="Medium" placeholder="Medium size" size="md" />
      <Input label="Large" placeholder="Large size" size="lg" />
    </div>
  ),
};
