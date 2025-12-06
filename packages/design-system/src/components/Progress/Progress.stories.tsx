import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './Progress';
import { useState, useEffect } from 'react';

const meta = {
  title: 'Components/Progress',
  component: Progress,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    showLabel: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 50,
  },
};

export const WithLabel: Story = {
  args: {
    value: 65,
    label: 'Loading data',
    showLabel: true,
  },
};

export const WithPercentage: Story = {
  args: {
    value: 75,
    showLabel: true,
  },
};

export const Small: Story = {
  args: {
    value: 50,
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    value: 50,
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    value: 50,
    size: 'lg',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '400px' }}>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Small</div>
        <Progress value={60} size="sm" />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Medium</div>
        <Progress value={60} size="md" />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Large</div>
        <Progress value={60} size="lg" />
      </div>
    </div>
  ),
};

export const DifferentValues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '400px' }}>
      <Progress value={0} label="Not started" showLabel />
      <Progress value={25} label="Getting started" showLabel />
      <Progress value={50} label="Half way there" showLabel />
      <Progress value={75} label="Almost done" showLabel />
      <Progress value={100} label="Complete" showLabel />
    </div>
  ),
};

export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(timer);
    }, []);

    return (
      <div style={{ width: '400px' }}>
        <Progress value={progress} showLabel />
      </div>
    );
  },
};

export const FileUpload: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      if (progress >= 100) return;

      const timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 100));
      }, 300);

      return () => clearTimeout(timer);
    }, [progress]);

    return (
      <div style={{ width: '400px' }}>
        <Progress value={progress} label="Uploading file.pdf" showLabel size="lg" />
      </div>
    );
  },
};

export const MultipleProgress: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '400px' }}>
      <Progress value={100} label="Installation" showLabel />
      <Progress value={75} label="Configuration" showLabel />
      <Progress value={30} label="Data migration" showLabel />
      <Progress value={0} label="Testing" showLabel />
    </div>
  ),
};

export const CustomMax: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '400px' }}>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '14px' }}>Downloading: 150/500 MB</div>
        <Progress value={150} max={500} size="lg" />
      </div>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '14px' }}>Processing: 7/10 items</div>
        <Progress value={7} max={10} size="lg" />
      </div>
    </div>
  ),
};
