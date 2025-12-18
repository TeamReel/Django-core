import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, Radio } from './Radio';

const meta = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
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
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'color',
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const WithHelperText: Story = {
  args: {
    name: 'color',
    helperText: 'Choose your favorite color',
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const WithDefaultValue: Story = {
  args: {
    name: 'color',
    defaultValue: 'blue',
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const WithError: Story = {
  args: {
    name: 'color',
    error: 'Please select a color',
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const WithSuccess: Story = {
  args: {
    name: 'color',
    success: 'Great choice!',
    defaultValue: 'blue',
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const Disabled: Story = {
  args: {
    name: 'color',
    disabled: true,
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const IndividualDisabled: Story = {
  args: {
    name: 'color',
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" disabled />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const SmallSize: Story = {
  args: {
    name: 'color',
    size: 'sm' as const,
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const MediumSize: Story = {
  args: {
    name: 'color',
    size: 'md' as const,
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const LargeSize: Story = {
  args: {
    name: 'color',
    size: 'lg' as const,
    children: [
      <Radio key="red" value="red" label="Red" />,
      <Radio key="blue" value="blue" label="Blue" />,
      <Radio key="green" value="green" label="Green" />,
    ],
  },
  render: (args) => <RadioGroup {...args} />,
};

export const AllStates: Story = {
  args: {},
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <RadioGroup name="color1">
        <Radio value="red" label="Default state" />
        <Radio value="blue" label="Blue" />
      </RadioGroup>

      <RadioGroup name="color2" error="Please select a color">
        <Radio value="red" label="Error state" />
        <Radio value="blue" label="Blue" />
      </RadioGroup>

      <RadioGroup name="color3" success="Good choice!" defaultValue="red">
        <Radio value="red" label="Success state" />
        <Radio value="blue" label="Blue" />
      </RadioGroup>

      <RadioGroup name="color4" disabled>
        <Radio value="red" label="Disabled state" />
        <Radio value="blue" label="Blue" />
      </RadioGroup>
    </div>
  ),
};

export const AllSizes: Story = {
  args: {},
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <RadioGroup name="size1" size="sm">
        <Radio value="a" label="Small" />
        <Radio value="b" label="Option 2" />
      </RadioGroup>

      <RadioGroup name="size2" size="md">
        <Radio value="a" label="Medium (default)" />
        <Radio value="b" label="Option 2" />
      </RadioGroup>

      <RadioGroup name="size3" size="lg">
        <Radio value="a" label="Large" />
        <Radio value="b" label="Option 2" />
      </RadioGroup>
    </div>
  ),
};

export const FormExample: Story = {
  args: {},
  render: () => (
    <div style={{ maxWidth: '400px' }}>
      <h3 style={{ margin: 0, marginBottom: '16px' }}>Shipping Method</h3>

      <RadioGroup name="shipping" defaultValue="standard" helperText="Choose how you want your order delivered">
        <Radio value="standard" label="Standard Shipping (5-7 days)" />
        <Radio value="express" label="Express Shipping (2-3 days)" />
        <Radio value="overnight" label="Overnight Shipping" />
      </RadioGroup>
    </div>
  ),
};

export const ControlledExample: Story = {
  args: {},
  render: () => {
    const [value, setValue] = React.useState('blue');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <RadioGroup name="color" value={value} onChange={setValue}>
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
          <Radio value="green" label="Green" />
        </RadioGroup>

        <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          Selected: <strong>{value}</strong>
        </div>

        <button onClick={() => setValue('green')} style={{ padding: '8px 16px' }}>
          Select Green
        </button>
      </div>
    );
  },
};

// Need to import React for interactive examples
import React from 'react';
