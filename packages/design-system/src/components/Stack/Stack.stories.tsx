import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from './Stack';

const meta = {
  title: 'Layout/Stack',
  component: Stack,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component for visual demonstration
const Box = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <div
    style={{
      padding: '16px',
      backgroundColor: color,
      borderRadius: '4px',
      color: 'white',
      fontWeight: 'bold',
    }}
  >
    {children}
  </div>
);

export const ColumnDefault: Story = {
  args: {
    children: (
      <>
        <Box color="#3b82f6">Item 1</Box>
        <Box color="#8b5cf6">Item 2</Box>
        <Box color="#ec4899">Item 3</Box>
      </>
    ),
  },
};

export const Row: Story = {
  args: {
    direction: 'row',
    children: (
      <>
        <Box color="#3b82f6">Item 1</Box>
        <Box color="#8b5cf6">Item 2</Box>
        <Box color="#ec4899">Item 3</Box>
      </>
    ),
  },
};

export const SmallGap: Story = {
  args: {
    gap: '2',
    children: (
      <>
        <Box color="#3b82f6">Item 1</Box>
        <Box color="#8b5cf6">Item 2</Box>
        <Box color="#ec4899">Item 3</Box>
      </>
    ),
  },
};

export const LargeGap: Story = {
  args: {
    gap: '8',
    children: (
      <>
        <Box color="#3b82f6">Item 1</Box>
        <Box color="#8b5cf6">Item 2</Box>
        <Box color="#ec4899">Item 3</Box>
      </>
    ),
  },
};

export const CenterAligned: Story = {
  args: {
    align: 'center',
    children: (
      <>
        <Box color="#3b82f6">Short</Box>
        <Box color="#8b5cf6">Medium length item</Box>
        <Box color="#ec4899">Very long content item here</Box>
      </>
    ),
  },
};

export const SpaceBetween: Story = {
  args: {
    direction: 'row',
    justify: 'space-between',
    style: { minHeight: '200px' },
    children: (
      <>
        <Box color="#3b82f6">Start</Box>
        <Box color="#8b5cf6">Middle</Box>
        <Box color="#ec4899">End</Box>
      </>
    ),
  },
};

export const Centered: Story = {
  args: {
    align: 'center',
    justify: 'center',
    style: { minHeight: '200px' },
    children: (
      <>
        <Box color="#3b82f6">Centered content</Box>
      </>
    ),
  },
};

export const RowWithWrap: Story = {
  args: {
    direction: 'row',
    wrap: true,
    gap: '4',
    style: { maxWidth: '400px' },
    children: (
      <>
        <Box color="#3b82f6">Item 1</Box>
        <Box color="#8b5cf6">Item 2</Box>
        <Box color="#ec4899">Item 3</Box>
        <Box color="#f59e0b">Item 4</Box>
        <Box color="#10b981">Item 5</Box>
        <Box color="#06b6d4">Item 6</Box>
      </>
    ),
  },
};

export const VerticalNavigation: Story = {
  args: {
    gap: '2',
    children: (
      <>
        <Box color="#3b82f6">Home</Box>
        <Box color="#8b5cf6">About</Box>
        <Box color="#ec4899">Services</Box>
        <Box color="#f59e0b">Contact</Box>
      </>
    ),
  },
};

export const HorizontalToolbar: Story = {
  args: {
    direction: 'row',
    gap: '2',
    align: 'center',
    children: (
      <>
        <Box color="#3b82f6">Save</Box>
        <Box color="#8b5cf6">Edit</Box>
        <Box color="#ec4899">Delete</Box>
      </>
    ),
  },
};

export const ResponsiveCards: Story = {
  args: {
    direction: 'row',
    wrap: true,
    gap: '6',
    children: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <Box key={i} color={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][i % 4]}>
            Card {i + 1}
          </Box>
        ))}
      </>
    ),
  },
};

export const NestedStacks: Story = {
  args: {
    gap: '6',
    children: (
      <>
        <Box color="#3b82f6">Header</Box>
        <Stack direction="row" gap="4">
          <Box color="#8b5cf6">Sidebar</Box>
          <Stack gap="3">
            <Box color="#ec4899">Content 1</Box>
            <Box color="#f59e0b">Content 2</Box>
            <Box color="#10b981">Content 3</Box>
          </Stack>
        </Stack>
        <Box color="#06b6d4">Footer</Box>
      </>
    ),
  },
};
