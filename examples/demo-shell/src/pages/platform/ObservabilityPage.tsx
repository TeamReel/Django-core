import React, { useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Badge,
  Button,
  Alert,
} from '@django-core/design-system';
import { usePolling } from '../../hooks/usePolling';

/**
 * T019 - Observability Page
 *
 * Purpose: Display real-time observability metrics with polling
 * - Fetches /api/observability/metrics every 30 seconds
 * - Shows latency percentiles (p99, p95, median)
 * - Displays error rates and active connections
 * - Manual refresh button
 */

interface ObservabilityMetrics {
  timestamp: string;
  response_time_p99?: number;
  response_time_p95?: number;
  response_time_median?: number;
  error_rate_4xx?: number;
  error_rate_5xx?: number;
  active_connections?: number;
  database_latency?: number;
  cache_hit_ratio?: number;
}

export const ObservabilityPage: React.FC = () => {
  const [manualRefresh, setManualRefresh] = useState(0);

  const { data: metrics, loading, error, refetch } = usePolling<ObservabilityMetrics>(
    '/api/observability/metrics/',
    {
      interval: 30000,
      key: 'observability-metrics',
      dependencies: [manualRefresh],
    }
  );

  const handleManualRefresh = async () => {
    setManualRefresh(prev => prev + 1);
    await refetch();
  };

  if (error) {
    return (
      <div>
        <PageHeader
          title="Observability"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Platform' },
            { label: 'Observability' },
          ]}
        />
        <PageContent>
          <Alert type="error" data-testid="observability-error">
            {error}
          </Alert>
        </PageContent>
      </div>
    );
  }

  const lastUpdated = metrics?.timestamp
    ? new Date(metrics.timestamp).toLocaleTimeString()
    : 'Never';

  return (
    <div>
      <PageHeader
        title="Observability"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Observability' },
        ]}
      />
      <PageContent>
        <Card data-testid="observability-header" className="mb-4">
          <div className="p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold mb-1">Metrics</h3>
              <p className="text-sm text-gray-600">
                Last updated: <span className="font-mono text-gray-700">{lastUpdated}</span>
              </p>
              {loading && <p className="text-sm text-blue-600 mt-1">Updating...</p>}
            </div>
            <Button
              onClick={handleManualRefresh}
              disabled={loading}
              data-testid="refresh-button"
            >
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>
        </Card>

        {metrics && (
          <>
            <Card data-testid="latency-metrics" className="mb-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Response Latency</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">p99 Latency</div>
                    <div className="text-2xl font-bold text-red-600 mt-2">
                      {metrics.response_time_p99?.toFixed(0) || 'N/A'}
                      <span className="text-sm font-normal text-gray-600">ms</span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">p95 Latency</div>
                    <div className="text-2xl font-bold text-orange-600 mt-2">
                      {metrics.response_time_p95?.toFixed(0) || 'N/A'}
                      <span className="text-sm font-normal text-gray-600">ms</span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">Median Latency</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">
                      {metrics.response_time_median?.toFixed(0) || 'N/A'}
                      <span className="text-sm font-normal text-gray-600">ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card data-testid="error-metrics" className="mb-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Error Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">4xx Error Rate</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-2xl font-bold text-yellow-600">
                        {metrics.error_rate_4xx?.toFixed(2) || 'N/A'}%
                      </div>
                      {metrics.error_rate_4xx && metrics.error_rate_4xx > 5 && (
                        <Badge type="warning">Elevated</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">5xx Error Rate</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-2xl font-bold text-red-600">
                        {metrics.error_rate_5xx?.toFixed(2) || 'N/A'}%
                      </div>
                      {metrics.error_rate_5xx && metrics.error_rate_5xx > 1 && (
                        <Badge type="error">Critical</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card data-testid="resource-metrics" className="mb-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">Active Connections</div>
                    <div className="text-2xl font-bold text-blue-600 mt-2">
                      {metrics.active_connections || 'N/A'}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">Database Latency</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">
                      {metrics.database_latency?.toFixed(1) || 'N/A'}
                      <span className="text-sm font-normal text-gray-600">ms</span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">Cache Hit Ratio</div>
                    <div className="text-2xl font-bold text-purple-600 mt-2">
                      {metrics.cache_hit_ratio?.toFixed(1) || 'N/A'}%
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}

        {loading && !metrics && (
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading observability metrics...
            </div>
          </Card>
        )}
      </PageContent>
    </div>
  );
};

export default ObservabilityPage;
