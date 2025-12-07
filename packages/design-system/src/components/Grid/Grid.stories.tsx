import type { Meta, StoryObj } from '@storybook/react';
import { Grid } from './Grid';

const meta = {
  title: 'Layout/Grid',
  component: Grid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component for visual demonstration
const GridItem = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <div
    style={{
      padding: '16px',
      backgroundColor: color,
      borderRadius: '4px',
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
    }}
  >
    {children}
  </div>
);

export const Default12Columns: Story = {
  args: {
    children: (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <GridItem key={i} color="#3b82f6">
            {i + 1}
          </GridItem>
        ))}
      </>
    ),
  },
};

export const ThreeColumns: Story = {
  args: {
    columns: 3,
    gap: '4',
    children: (
      <>
        <GridItem color="#3b82f6">Item 1</GridItem>
        <GridItem color="#8b5cf6">Item 2</GridItem>
        <GridItem color="#ec4899">Item 3</GridItem>
        <GridItem color="#f59e0b">Item 4</GridItem>
        <GridItem color="#10b981">Item 5</GridItem>
        <GridItem color="#06b6d4">Item 6</GridItem>
      </>
    ),
  },
};

export const FourColumns: Story = {
  args: {
    columns: 4,
    gap: '6',
    children: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <GridItem key={i} color={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][i % 4]}>
            Item {i + 1}
          </GridItem>
        ))}
      </>
    ),
  },
};

export const TwoColumns: Story = {
  args: {
    columns: 2,
    gap: '8',
    children: (
      <>
        <GridItem color="#3b82f6">Left Column</GridItem>
        <GridItem color="#8b5cf6">Right Column</GridItem>
        <GridItem color="#ec4899">Content 1</GridItem>
        <GridItem color="#f59e0b">Content 2</GridItem>
      </>
    ),
  },
};

export const CustomTemplate: Story = {
  args: {
    columns: '200px 1fr 200px',
    gap: '4',
    children: (
      <>
        <GridItem color="#3b82f6">Sidebar</GridItem>
        <GridItem color="#8b5cf6">Main Content (flexible)</GridItem>
        <GridItem color="#ec4899">Sidebar</GridItem>
      </>
    ),
  },
};

export const AutoFitColumns: Story = {
  args: {
    columns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '4',
    children: (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <GridItem key={i} color={['#3b82f6', '#8b5cf6', '#ec4899'][i % 3]}>
            Responsive {i + 1}
          </GridItem>
        ))}
      </>
    ),
  },
};

export const SmallGap: Story = {
  args: {
    columns: 4,
    gap: '2',
    children: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <GridItem key={i} color="#3b82f6">
            {i + 1}
          </GridItem>
        ))}
      </>
    ),
  },
};

export const LargeGap: Story = {
  args: {
    columns: 3,
    gap: '8',
    children: (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <GridItem key={i} color="#8b5cf6">
            {i + 1}
          </GridItem>
        ))}
      </>
    ),
  },
};

export const DifferentRowColumnGaps: Story = {
  args: {
    columns: 3,
    rowGap: '8',
    columnGap: '2',
    children: (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <GridItem key={i} color={['#3b82f6', '#8b5cf6', '#ec4899'][i % 3]}>
            {i + 1}
          </GridItem>
        ))}
      </>
    ),
  },
};

export const CardLayout: Story = {
  args: {
    columns: 3,
    gap: '6',
    children: (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ padding: '24px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Card {i + 1}</h3>
            <p style={{ margin: 0, color: '#6b7280' }}>Card content goes here</p>
          </div>
        ))}
      </>
    ),
  },
};

export const DashboardLayout: Story = {
  args: {
    columns: 'repeat(12, 1fr)',
    gap: '4',
    children: (
      <>
        <div style={{ gridColumn: 'span 12', padding: '16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px' }}>
          Header (Full Width)
        </div>
        <div style={{ gridColumn: 'span 3', padding: '16px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '4px' }}>
          Sidebar
        </div>
        <div style={{ gridColumn: 'span 9', padding: '16px', backgroundColor: '#ec4899', color: 'white', borderRadius: '4px' }}>
          Main Content (9 columns)
        </div>
        <div style={{ gridColumn: 'span 6', padding: '16px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '4px' }}>
          Left Widget
        </div>
        <div style={{ gridColumn: 'span 6', padding: '16px', backgroundColor: '#10b981', color: 'white', borderRadius: '4px' }}>
          Right Widget
        </div>
      </>
    ),
  },
};

export const ImageGallery: Story = {
  args: {
    columns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '3',
    children: (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][i % 4],
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {i + 1}
          </div>
        ))}
      </>
    ),
  },
};
