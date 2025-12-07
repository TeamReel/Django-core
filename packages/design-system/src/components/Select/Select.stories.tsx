import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Select, type SelectOptionType } from './Select';

const meta = {
  title: 'Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const fruitOptions: SelectOptionType[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
];

const countryOptions: SelectOptionType[] = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'cn', label: 'China' },
];

function SelectWrapper(args: React.ComponentProps<typeof Select>) {
  const [value, setValue] = useState<string | undefined>(args.value);

  return (
    <div style={{ width: '300px' }}>
      <Select {...args} value={value} onChange={setValue} />
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <SelectWrapper
      options={fruitOptions}
      placeholder="Select a fruit"
      onChange={() => {}}
    />
  ),
};

export const WithSelectedValue: Story = {
  render: () => (
    <SelectWrapper
      options={fruitOptions}
      value="banana"
      onChange={() => {}}
    />
  ),
};

export const ManyOptions: Story = {
  render: () => (
    <SelectWrapper
      options={countryOptions}
      placeholder="Select a country"
      onChange={() => {}}
    />
  ),
};

export const WithDisabledOptions: Story = {
  render: () => (
    <SelectWrapper
      options={[
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2 (Disabled)', disabled: true },
        { value: '3', label: 'Option 3' },
        { value: '4', label: 'Option 4 (Disabled)', disabled: true },
        { value: '5', label: 'Option 5' },
      ]}
      placeholder="Select an option"
      onChange={() => {}}
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <SelectWrapper
      options={fruitOptions}
      value="apple"
      disabled
      onChange={() => {}}
    />
  ),
};

export const CustomPlaceholder: Story = {
  render: () => (
    <SelectWrapper
      options={fruitOptions}
      placeholder="🍎 Pick your favorite fruit"
      onChange={() => {}}
    />
  ),
};

export const KeyboardNavigation: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
        Try keyboard navigation:
        <br />• Click to open
        <br />• ↑/↓ to navigate
        <br />• Home/End for first/last
        <br />• Enter to select
        <br />• Escape to close
      </p>
      <SelectWrapper
        options={fruitOptions}
        placeholder="Use keyboard to navigate"
        onChange={() => {}}
      />
    </div>
  ),
};

export const InForm: Story = {
  render: () => {
    const [formData, setFormData] = useState({ fruit: '', country: '' });

    return (
      <form
        style={{ width: '400px' }}
        onSubmit={(e) => {
          e.preventDefault();
          alert(JSON.stringify(formData, null, 2));
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="fruit-select"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
          >
            Favorite Fruit
          </label>
          <Select
            options={fruitOptions}
            value={formData.fruit}
            onChange={(value) => setFormData({ ...formData, fruit: value })}
            placeholder="Select a fruit"
            aria-label="Favorite fruit"
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="country-select"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
          >
            Country
          </label>
          <Select
            options={countryOptions}
            value={formData.country}
            onChange={(value) => setFormData({ ...formData, country: value })}
            placeholder="Select a country"
            aria-label="Country"
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Submit
        </button>
      </form>
    );
  },
};
