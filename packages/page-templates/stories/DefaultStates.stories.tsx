import type { Meta, StoryObj } from '@storybook/react';
import {
  DefaultLoading,
  DefaultEmpty,
  DefaultError,
  DefaultPermissionDenied,
} from '../src/components/states';

const meta: Meta = {
  title: 'States/Default States',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Loading: StoryObj<typeof DefaultLoading> = {
  render: () => <DefaultLoading />,
};

export const LoadingWithCustomMessage: StoryObj<typeof DefaultLoading> = {
  render: () => <DefaultLoading message="Loading your dashboard..." />,
};

export const Empty: StoryObj<typeof DefaultEmpty> = {
  render: () => <DefaultEmpty />,
};

export const EmptyWithAction: StoryObj<typeof DefaultEmpty> = {
  render: () => (
    <DefaultEmpty
      title="No widgets yet"
      message="Get started by creating your first widget."
      action={
        <button style={{ padding: '0.5rem 1rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Create Widget
        </button>
      }
    />
  ),
};

export const Error: StoryObj<typeof DefaultError> = {
  render: () => <DefaultError />,
};

export const ErrorWithRetry: StoryObj<typeof DefaultError> = {
  render: () => (
    <DefaultError
      error="Failed to fetch data from the server."
      onRetry={() => alert('Retrying...')}
    />
  ),
};

export const PermissionDenied: StoryObj<typeof DefaultPermissionDenied> = {
  render: () => <DefaultPermissionDenied />,
};

export const PermissionDeniedWithAction: StoryObj<typeof DefaultPermissionDenied> = {
  render: () => (
    <DefaultPermissionDenied
      title="Premium Feature"
      message="This feature is only available to premium users."
      action={
        <button style={{ padding: '0.5rem 1rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Upgrade Now
        </button>
      }
    />
  ),
};
