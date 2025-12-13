import type { Meta, StoryObj } from '@storybook/react';
import { useResourceUsage } from './useResourceUsage';
import { ResourceUsageBar } from '../components/ResourceUsageBar/ResourceUsageBar';
import { Alert } from '@django-core/design-system';
import { http, HttpResponse } from 'msw';
import {
  mockCreditUsageResponse,
  mockCriticalCreditUsage,
  mockLowCreditUsage,
} from '../types/contracts/B11-billing-credits';

/**
 * Demo component that uses the useResourceUsage hook
 */
function ResourceUsageDemo({
  endpoint,
  pollInterval,
  enabled,
}: {
  endpoint: string;
  pollInterval?: number;
  enabled?: boolean;
}) {
  const { data, isLoading, error, refetch } = useResourceUsage({
    endpoint,
    pollInterval,
    enabled,
  });

  if (isLoading && !data) {
    return <div>Loading credit usage data...</div>;
  }

  if (error) {
    return (
      <div>
        <Alert variant="error" title="Error loading credit data" {...({} as any)}>
          {error.message}
        </Alert>
        <button
          onClick={() => refetch()}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <ResourceUsageBar
        value={data.credits.used}
        max={data.credits.limit}
        label="API Credits"
        showPercentage={true}
      />
      <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>Remaining:</strong> {data.credits.remaining} credits
        </p>
        <p>
          <strong>Resets at:</strong> {new Date(data.credits.resetAt).toLocaleString()}
        </p>
        {data.meta && (
          <p>
            <strong>Last updated:</strong>{' '}
            {new Date(data.meta.generatedAt).toLocaleString()}
          </p>
        )}
      </div>
      <button
        onClick={() => refetch()}
        style={{
          marginTop: '16px',
          padding: '8px 16px',
          cursor: 'pointer',
        }}
      >
        Refresh Data
      </button>
    </div>
  );
}

const meta = {
  title: 'Hooks/useResourceUsage',
  component: ResourceUsageDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A React hook that polls the B11 billing API for credit usage data. Supports configurable polling intervals, loading states, error handling, and manual refetch.',
      },
    },
    msw: {
      handlers: [
        http.get('/api/billing/usage', () => {
          return HttpResponse.json(mockCreditUsageResponse);
        }),
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    endpoint: {
      control: 'text',
      description: 'API endpoint URL for B11 billing data',
    },
    pollInterval: {
      control: { type: 'number', min: 0, max: 60000, step: 1000 },
      description: 'Polling interval in milliseconds (0 = no polling)',
    },
    enabled: {
      control: 'boolean',
      description: 'Enable/disable data fetching',
    },
  },
} satisfies Meta<typeof ResourceUsageDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Normal usage scenario with moderate credit consumption (85%)
 */
export const Default: Story = {
  args: {
    endpoint: '/api/billing/usage',
    pollInterval: 30000,
    enabled: true,
  },
};

/**
 * Critical usage scenario - credits nearly exhausted (95%)
 */
export const CriticalUsage: Story = {
  args: {
    endpoint: '/api/billing/usage/critical',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/billing/usage/critical', () => {
          return HttpResponse.json(mockCriticalCreditUsage);
        }),
      ],
    },
  },
};

/**
 * Low usage scenario - plenty of credits remaining (20%)
 */
export const LowUsage: Story = {
  args: {
    endpoint: '/api/billing/usage/low',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/billing/usage/low', () => {
          return HttpResponse.json(mockLowCreditUsage);
        }),
      ],
    },
  },
};

/**
 * Error scenario - API returns 500 error
 */
export const ErrorState: Story = {
  args: {
    endpoint: '/api/billing/usage/error',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/billing/usage/error', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        }),
      ],
    },
  },
};

/**
 * Network error scenario - request fails
 */
export const NetworkError: Story = {
  args: {
    endpoint: '/api/billing/usage/network-error',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/billing/usage/network-error', () => {
          return HttpResponse.error();
        }),
      ],
    },
  },
};

/**
 * Disabled state - hook does not fetch data
 */
export const Disabled: Story = {
  args: {
    endpoint: '/api/billing/usage',
    pollInterval: 30000,
    enabled: false,
  },
};

/**
 * No polling - fetches data once on mount only
 */
export const NoPolling: Story = {
  args: {
    endpoint: '/api/billing/usage',
    pollInterval: 0,
    enabled: true,
  },
};

/**
 * Fast polling - updates every 5 seconds (useful for demos)
 */
export const FastPolling: Story = {
  args: {
    endpoint: '/api/billing/usage',
    pollInterval: 5000,
    enabled: true,
  },
};
