import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
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
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Accept terms and conditions',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Subscribe to newsletter',
    helperText: 'Get weekly updates in your inbox',
  },
};

export const WithoutLabel: Story = {
  args: {
    'aria-label': 'Checkbox without label',
  },
};

export const Checked: Story = {
  args: {
    label: 'Already checked',
    checked: true,
    readOnly: true,
  },
};

export const Indeterminate: Story = {
  args: {
    label: 'Indeterminate state',
    indeterminate: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Accept terms',
    error: 'You must accept the terms to continue',
  },
};

export const WithSuccess: Story = {
  args: {
    label: 'Email verified',
    success: 'Your email has been verified',
    checked: true,
    readOnly: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled checkbox',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: 'Disabled and checked',
    disabled: true,
    checked: true,
    readOnly: true,
  },
};

export const SmallSize: Story = {
  args: {
    label: 'Small checkbox',
    size: 'sm',
  },
};

export const MediumSize: Story = {
  args: {
    label: 'Medium checkbox (default)',
    size: 'md',
  },
};

export const LargeSize: Story = {
  args: {
    label: 'Large checkbox',
    size: 'lg',
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Checkbox label="Default state" />
      <Checkbox label="Checked state" checked readOnly />
      <Checkbox label="Indeterminate state" indeterminate />
      <Checkbox label="Error state" error="This field is required" />
      <Checkbox label="Success state" success="Verified!" checked readOnly />
      <Checkbox label="Disabled state" disabled />
      <Checkbox label="Disabled checked" disabled checked readOnly />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Checkbox label="Small" size="sm" />
      <Checkbox label="Medium (default)" size="md" />
      <Checkbox label="Large" size="lg" />
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
      <h3 style={{ margin: 0, marginBottom: '8px' }}>Account Preferences</h3>
      <Checkbox label="Email notifications" helperText="Receive updates via email" />
      <Checkbox label="SMS notifications" helperText="Receive updates via SMS" />
      <Checkbox label="Push notifications" helperText="Receive updates on your device" />
      <Checkbox
        label="Accept terms and conditions"
        error="You must accept to continue"
      />
    </div>
  ),
};

export const SelectAllExample: Story = {
  render: () => {
    const [selectAll, setSelectAll] = React.useState(false);
    const [items, setItems] = React.useState([false, false, false]);

    const handleSelectAll = () => {
      const newState = !selectAll;
      setSelectAll(newState);
      setItems([newState, newState, newState]);
    };

    const handleItemChange = (index: number) => {
      const newItems = [...items];
      newItems[index] = !newItems[index];
      setItems(newItems);
      setSelectAll(newItems.every(item => item));
    };

    const allChecked = items.every(item => item);
    const someChecked = items.some(item => item) && !allChecked;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Checkbox
          label="Select all"
          checked={allChecked}
          indeterminate={someChecked}
          onChange={handleSelectAll}
        />
        <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Checkbox label="Item 1" checked={items[0]} onChange={() => handleItemChange(0)} />
          <Checkbox label="Item 2" checked={items[1]} onChange={() => handleItemChange(1)} />
          <Checkbox label="Item 3" checked={items[2]} onChange={() => handleItemChange(2)} />
        </div>
      </div>
    );
  },
};

// Need to import React for SelectAllExample
import React from 'react';
