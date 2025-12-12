import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '../src/components/Alert';

const meta = {
  title: 'Components/Alert (Placeholder)',
  component: Alert,
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Placeholder Alert',
    severity: 'info',
  },
};
