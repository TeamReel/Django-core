import React, { useState, useEffect, useRef } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Badge,
  Button,
  Alert,
} from '@django-core/design-system';
// Removed usePolling import - using direct useEffect instead
import { ObservabilityCharts } from '../../components/ObservabilityCharts';
import type { ObservabilityMetrics } from '../../types/chart';
import AppShell from '../../components/AppShell';

/**
 * T019 - Observability Page
 *
 * Purpose: Display real-time observability metrics with polling
 * - Fetches /api/observability/metrics every 30 seconds
 * - Shows latency percentiles (p99, p95, median)
 * - Displays error rates and active connections
 * - Manual refresh button
 */

interface BackendObservabilityMetrics {
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
  const [metricsHistory, setMetricsHistory] = useState<ObservabilityMetrics[]>([]);
  const historyRef = useRef<ObservabilityMetrics[]>([]);

  const [backendMetrics, setBackendMetrics] = useState<BackendObservabilityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/observability/metrics/', {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data: BackendObservabilityMetrics = await response.json();
        setBackendMetrics(data);
      } else if (response.status === 404) {
        // Demo mode: Use mock observability data
        const demoMetrics: BackendObservabilityMetrics = {
          timestamp: new Date().toISOString(),
          response_time_p99: 450 + Math.random() * 100,
          response_time_p95: 250 + Math.random() * 50,
          response_time_median: 120 + Math.random() * 30,
          error_rate_4xx: Math.random() * 5,
          error_rate_5xx: Math.random() * 2,
          active_connections: 15 + Math.floor(Math.random() * 10),
          database_latency: 25 + Math.random() * 15,
          cache_hit_ratio: 0.85 + Math.random() * 0.1
        };
        setBackendMetrics(demoMetrics);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch observability metrics');
      console.error('Observability fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [manualRefresh]);

  const refetch = async () => {
    await fetchMetrics();
  };

  // Convert backend metrics to chart format
  const currentMetrics: ObservabilityMetrics | null = backendMetrics ? {
    timestamp: Date.now(),
    responseTime: {
      p50: backendMetrics.response_time_median || 0,
      p95: backendMetrics.response_time_p95 || 0,
      p99: backendMetrics.response_time_p99 || 0,
    },
    errorRate: (backendMetrics.error_rate_4xx || 0) + (backendMetrics.error_rate_5xx || 0),
    activeConnections: backendMetrics.active_connections || 0,
  } : null;

  // Update metrics history when new data arrives
  useEffect(() => {
    if (currentMetrics) {
      const newHistory = [...historyRef.current, currentMetrics];
      // Keep only last 20 data points
      const trimmedHistory = newHistory.slice(-20);
      historyRef.current = trimmedHistory;
      setMetricsHistory(trimmedHistory);
    }
  }, [currentMetrics]);

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

  const lastUpdated = backendMetrics?.timestamp
    ? new Date(backendMetrics.timestamp).toLocaleTimeString()
    : 'Never';

  return (
    <AppShell>
      <div>
        <PageHeader
        title="Observability"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Observability' },
        ]}
      />
      <PageContent>        <Alert type="info" className="mb-4">
          <strong>Demo Mode:</strong> This page shows mock observability data with simulated real-time updates. API endpoints are not yet implemented.
        </Alert>        <Card data-testid="observability-header" className="mb-4">
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

        {backendMetrics && (
          <>
            {/* Charts Section */}
            <Card className="mb-6" data-testid="observability-charts">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Metrics Visualization</h3>
                <ObservabilityCharts
                  metricsHistory={metricsHistory}
                  currentMetrics={currentMetrics}
                />
              </div>
            </Card>

            <Card data-testid="latency-metrics" className="mb-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Response Latency</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">p99 Latency</div>
                    <div className="text-2xl font-bold text-red-600 mt-2">
                      {backendMetrics.response_time_p99?.toFixed(0) || 'N/A'}
                      <span className="text-sm font-normal text-gray-600">ms</span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">p95 Latency</div>
                    <div className="text-2xl font-bold text-orange-600 mt-2">
                      {backendMetrics.response_time_p95?.toFixed(0) || 'N/A'}
                      <span className="text-sm font-normal text-gray-600">ms</span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">Median Latency</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">
                      {backendMetrics.response_time_median?.toFixed(0) || 'N/A'}
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
                        {backendMetrics.error_rate_4xx?.toFixed(2) || 'N/A'}%
                      </div>
                      {backendMetrics.error_rate_4xx && backendMetrics.error_rate_4xx > 5 && (
                        <Badge type="warning">Elevated</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">5xx Error Rate</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-2xl font-bold text-red-600">
                        {backendMetrics.error_rate_5xx?.toFixed(2) || 'N/A'}%
                      </div>
                      {backendMetrics.error_rate_5xx && backendMetrics.error_rate_5xx > 1 && (
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
                      {backendMetrics.active_connections || 'N/A'}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">Database Latency</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">
                      {backendMetrics.database_latency?.toFixed(1) || 'N/A'}
                      <span className="text-sm font-normal text-gray-600">ms</span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm text-gray-600">Cache Hit Ratio</div>
                    <div className="text-2xl font-bold text-purple-600 mt-2">
                      {backendMetrics.cache_hit_ratio?.toFixed(1) || 'N/A'}%
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}

        {loading && !backendMetrics && (
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading observability metrics...
            </div>
          </Card>
        )}
      </PageContent>
      </div>
    </AppShell>
  );
};

export default ObservabilityPage;
