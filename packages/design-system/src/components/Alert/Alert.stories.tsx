import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';

const meta = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
    dismissible: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'This is an informational message.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Your changes have been saved successfully.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Your session will expire in 5 minutes.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'An error occurred while processing your request.',
  },
};

export const WithTitle: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'Here are some important details you should know about.',
  },
};

export const Dismissible: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'This alert can be dismissed.',
    dismissible: true,
    onDismiss: () => console.log('Alert dismissed'),
  },
};

export const LongContent: Story = {
  args: {
    variant: 'info',
    title: 'Detailed Information',
    children:
      'This is a longer alert message that contains multiple sentences. It demonstrates how the alert component handles larger amounts of text content. The component should maintain good readability and visual hierarchy even with extended content.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Alert variant="info" title="Info">
        This is an informational message.
      </Alert>
      <Alert variant="success" title="Success">
        Operation completed successfully.
      </Alert>
      <Alert variant="warning" title="Warning">
        Please review before continuing.
      </Alert>
      <Alert variant="error" title="Error">
        Something went wrong.
      </Alert>
    </div>
  ),
};

export const DismissibleVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Alert variant="info" dismissible onDismiss={() => console.log('Info dismissed')}>
        Dismissible info alert
      </Alert>
      <Alert variant="success" dismissible onDismiss={() => console.log('Success dismissed')}>
        Dismissible success alert
      </Alert>
      <Alert variant="warning" dismissible onDismiss={() => console.log('Warning dismissed')}>
        Dismissible warning alert
      </Alert>
      <Alert variant="error" dismissible onDismiss={() => console.log('Error dismissed')}>
        Dismissible error alert
      </Alert>
    </div>
  ),
};
