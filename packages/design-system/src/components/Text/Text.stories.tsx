import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

const meta = {
  title: 'Typography/Text',
  component: Text,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is default text (medium size, normal weight, primary color)',
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'xs',
    children: 'This is extra small text',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'This is small text',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'This is medium text (default)',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'This is large text',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    children: 'This is extra large text',
  },
};

export const Weights: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text weight="normal">Normal weight text</Text>
      <Text weight="medium">Medium weight text</Text>
      <Text weight="semibold">Semibold weight text</Text>
      <Text weight="bold">Bold weight text</Text>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text color="primary">Primary color (default)</Text>
      <Text color="secondary">Secondary color</Text>
      <Text color="tertiary">Tertiary color</Text>
      <Text color="error">Error color</Text>
      <Text color="success">Success color</Text>
    </div>
  ),
};

export const AsSpan: Story = {
  args: {
    as: 'span',
    children: 'This renders as a span element',
  },
};

export const AsLabel: Story = {
  args: {
    as: 'label',
    htmlFor: 'example-input',
    children: 'This renders as a label element',
  },
};

export const ErrorBold: Story = {
  args: {
    size: 'lg',
    weight: 'bold',
    color: 'error',
    children: 'Error: Something went wrong!',
  },
};

export const SuccessLarge: Story = {
  args: {
    size: 'lg',
    weight: 'semibold',
    color: 'success',
    children: 'Success! Your changes have been saved.',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Text size="xs">Extra small: The quick brown fox jumps over the lazy dog</Text>
      <Text size="sm">Small: The quick brown fox jumps over the lazy dog</Text>
      <Text size="md">Medium (default): The quick brown fox jumps over the lazy dog</Text>
      <Text size="lg">Large: The quick brown fox jumps over the lazy dog</Text>
      <Text size="xl">Extra large: The quick brown fox jumps over the lazy dog</Text>
    </div>
  ),
};

export const TypographyScale: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Text size="xs" weight="medium" color="secondary" as="div" style={{ marginBottom: '4px' }}>
          OVERLINE TEXT
        </Text>
        <Text size="xl" weight="bold">
          Main Heading
        </Text>
        <Text size="lg" color="secondary" as="div" style={{ marginTop: '8px' }}>
          A subtitle or description that provides additional context
        </Text>
      </div>
      <div>
        <Text>
          This is body text at the default medium size with normal weight. It's used for the main
          content of your application and is designed to be highly readable across different screen
          sizes and devices.
        </Text>
      </div>
      <div>
        <Text size="sm" color="secondary">
          This is small text, often used for captions, footnotes, or supporting information that
          doesn't need as much visual weight as the main content.
        </Text>
      </div>
    </div>
  ),
};
