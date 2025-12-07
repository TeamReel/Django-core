import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';
import { Button } from '../Button';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { content: 'Tooltip text', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="This is a helpful tooltip">
      <Button>Hover me</Button>
    </Tooltip>
  ),
};

export const LongContent: Story = {
  args: { content: 'Long tooltip content', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="This is a longer tooltip with more detailed information that wraps across multiple lines.">
      <Button>Hover for long tooltip</Button>
    </Tooltip>
  ),
};

export const TopPlacement: Story = {
  args: { content: 'Top tooltip', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="Tooltip on top" placement="top">
      <Button>Top</Button>
    </Tooltip>
  ),
};

export const RightPlacement: Story = {
  args: { content: 'Right tooltip', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="Tooltip on right" placement="right">
      <Button>Right</Button>
    </Tooltip>
  ),
};

export const BottomPlacement: Story = {
  args: { content: 'Bottom tooltip', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="Tooltip on bottom" placement="bottom">
      <Button>Bottom</Button>
    </Tooltip>
  ),
};

export const LeftPlacement: Story = {
  args: { content: 'Left tooltip', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="Tooltip on left" placement="left">
      <Button>Left</Button>
    </Tooltip>
  ),
};

export const WithDelay: Story = {
  args: { content: 'Delayed tooltip', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="This tooltip appears after 1 second" delay={1000}>
      <Button>Hover with delay</Button>
    </Tooltip>
  ),
};

export const OnTextElement: Story = {
  args: { content: 'Text tooltip', children: <span>text</span> },
  render: () => (
    <div>
      <p>
        Hover over{' '}
        <Tooltip content="Additional information">
          <span style={{ textDecoration: 'underline', cursor: 'help' }}>
            this text
          </span>
        </Tooltip>{' '}
        to see a tooltip.
      </p>
    </div>
  ),
};

export const OnIconButton: Story = {
  args: { content: 'Icon tooltip', children: <button>Hover me</button> },
  render: () => (
    <Tooltip content="More information about this action">
      <button
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid #ccc',
          background: 'white',
          cursor: 'pointer',
          fontSize: '18px',
        }}
        aria-label="Info"
      >
        ℹ️
      </button>
    </Tooltip>
  ),
};

export const MultipleTooltips: Story = {
  args: { content: 'Tooltip', children: <button>Hover me</button> },
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Tooltip content="First tooltip" placement="top">
        <Button>First</Button>
      </Tooltip>
      <Tooltip content="Second tooltip" placement="top">
        <Button>Second</Button>
      </Tooltip>
      <Tooltip content="Third tooltip" placement="top">
        <Button>Third</Button>
      </Tooltip>
    </div>
  ),
};

export const AllPlacements: Story = {
  args: { content: 'Tooltip', children: <button>Hover me</button> },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        padding: '2rem',
      }}
    >
      <div style={{ gridColumn: '2' }}>
        <Tooltip content="Top start" placement="top-start">
          <Button>Top Start</Button>
        </Tooltip>
      </div>
      <div style={{ gridColumn: '2' }}>
        <Tooltip content="Top" placement="top">
          <Button>Top</Button>
        </Tooltip>
      </div>
      <div style={{ gridColumn: '2' }}>
        <Tooltip content="Top end" placement="top-end">
          <Button>Top End</Button>
        </Tooltip>
      </div>

      <div style={{ gridColumn: '1', gridRow: '2' }}>
        <Tooltip content="Left" placement="left">
          <Button>Left</Button>
        </Tooltip>
      </div>
      <div style={{ gridColumn: '3', gridRow: '2' }}>
        <Tooltip content="Right" placement="right">
          <Button>Right</Button>
        </Tooltip>
      </div>

      <div style={{ gridColumn: '2', gridRow: '3' }}>
        <Tooltip content="Bottom start" placement="bottom-start">
          <Button>Bottom Start</Button>
        </Tooltip>
      </div>
      <div style={{ gridColumn: '2', gridRow: '3' }}>
        <Tooltip content="Bottom" placement="bottom">
          <Button>Bottom</Button>
        </Tooltip>
      </div>
      <div style={{ gridColumn: '2', gridRow: '3' }}>
        <Tooltip content="Bottom end" placement="bottom-end">
          <Button>Bottom End</Button>
        </Tooltip>
      </div>
    </div>
  ),
};

export const KeyboardAccessible: Story = {
  args: { content: 'Keyboard tooltip', children: <button>Hover me</button> },
  render: () => (
    <div>
      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
        Try using Tab to focus the button. The tooltip will appear on focus.
      </p>
      <Tooltip content="Tooltip appears on focus too">
        <Button>Tab to me</Button>
      </Tooltip>
    </div>
  ),
};
