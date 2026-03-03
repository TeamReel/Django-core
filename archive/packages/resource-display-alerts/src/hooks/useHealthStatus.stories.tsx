import type { Meta, StoryObj } from '@storybook/react';
import { useHealthStatus } from './useHealthStatus';
import { HealthStatus } from '../components/HealthStatus/HealthStatus';
import { Alert } from '@django-core/design-system';
import { http, HttpResponse } from 'msw';
import {
  mockHealthyStatusResponse,
  mockDegradedStatusResponse,
  mockUnhealthyStatusResponse,
  mockUnknownStatusResponse,
} from '../types/contracts/B18-health-status';

/**
 * Demo component that uses the useHealthStatus hook
 */
function HealthStatusDemo({
  endpoint,
  pollInterval,
  enabled,
}: {
  endpoint: string;
  pollInterval?: number;
  enabled?: boolean;
}) {
  const { data, isLoading, error, refetch } = useHealthStatus({
    endpoint,
    pollInterval,
    enabled,
  });

  if (isLoading && !data) {
    return <div>Loading health status data...</div>;
  }

  if (error) {
    return (
      <div>
        <Alert variant="error" title="Error loading health data" {...({} as any)}>
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

  // HealthStatus component uses B18 HealthStatusType directly (no mapping needed)
  // Type: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

  return (
    <div style={{ maxWidth: '600px' }}>
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>
          Overall System Status
        </h3>
        <HealthStatus name="System" status={data.overall} />
        {data.meta && (
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            Last checked: {new Date(data.meta.checkedAt).toLocaleString()}
            {data.meta.checkDuration && ` (${data.meta.checkDuration}ms)`}
          </p>
        )}
      </div>

      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
        Service Health Details
      </h4>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {data.services.map((service) => (
          <div
            key={service.id}
            style={{
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}
          >
            <HealthStatus name={service.name} status={service.status} />
            {service.details && (
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                {service.details}
              </p>
            )}
            {service.metrics && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#888',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '4px',
                }}
              >
                {service.metrics.responseTime !== undefined && (
                  <span>Response: {service.metrics.responseTime}ms</span>
                )}
                {service.metrics.errorRate !== undefined && (
                  <span>Error rate: {service.metrics.errorRate}%</span>
                )}
                {service.metrics.uptime !== undefined && (
                  <span>Uptime: {service.metrics.uptime}%</span>
                )}
                {service.metrics.memoryUsageMB !== undefined && (
                  <span>Memory: {service.metrics.memoryUsageMB}MB</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => refetch()}
        style={{
          marginTop: '16px',
          padding: '8px 16px',
          cursor: 'pointer',
        }}
      >
        Refresh Status
      </button>
    </div>
  );
}

const meta = {
  title: 'Hooks/useHealthStatus',
  component: HealthStatusDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A React hook that polls the B18 health monitoring API for system and service health status. Supports configurable polling intervals, loading states, error handling, and manual refetch.',
      },
    },
    msw: {
      handlers: [
        http.get('/api/health/status', () => {
          return HttpResponse.json(mockHealthyStatusResponse);
        }),
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    endpoint: {
      control: 'text',
      description: 'API endpoint URL for B18 health status data',
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
} satisfies Meta<typeof HealthStatusDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * All services healthy - normal operating conditions
 */
export const AllHealthy: Story = {
  args: {
    endpoint: '/api/health/status',
    pollInterval: 30000,
    enabled: true,
  },
};

/**
 * Degraded state - one or more services experiencing issues
 */
export const Degraded: Story = {
  args: {
    endpoint: '/api/health/status/degraded',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/health/status/degraded', () => {
          return HttpResponse.json(mockDegradedStatusResponse);
        }),
      ],
    },
  },
};

/**
 * Unhealthy state - critical service failure
 */
export const Unhealthy: Story = {
  args: {
    endpoint: '/api/health/status/unhealthy',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/health/status/unhealthy', () => {
          return HttpResponse.json(mockUnhealthyStatusResponse);
        }),
      ],
    },
  },
};

/**
 * Unknown state - health check unable to determine status
 */
export const Unknown: Story = {
  args: {
    endpoint: '/api/health/status/unknown',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/health/status/unknown', () => {
          return HttpResponse.json(mockUnknownStatusResponse);
        }),
      ],
    },
  },
};

/**
 * Error scenario - API returns 503 Service Unavailable
 */
export const ErrorState: Story = {
  args: {
    endpoint: '/api/health/status/error',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/health/status/error', () => {
          return HttpResponse.json(
            { error: 'Service unavailable' },
            { status: 503 }
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
    endpoint: '/api/health/status/network-error',
    pollInterval: 30000,
    enabled: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/health/status/network-error', () => {
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
    endpoint: '/api/health/status',
    pollInterval: 30000,
    enabled: false,
  },
};

/**
 * No polling - fetches data once on mount only
 */
export const NoPolling: Story = {
  args: {
    endpoint: '/api/health/status',
    pollInterval: 0,
    enabled: true,
  },
};

/**
 * Fast polling - updates every 5 seconds (useful for monitoring dashboards)
 */
export const FastPolling: Story = {
  args: {
    endpoint: '/api/health/status',
    pollInterval: 5000,
    enabled: true,
  },
};
