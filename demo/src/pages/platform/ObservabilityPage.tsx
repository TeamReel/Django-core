import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Badge,
  Button,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
// Removed usePolling import - using direct useEffect instead
import { ObservabilityCharts } from '../../components/ObservabilityCharts';
import { getApiBaseUrl } from '../../utils/apiBase';
import type { ObservabilityMetrics } from '../../types/chart';
// import AppShell from '../../components/AppShell';

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
  timestamp?: string;
  response_time_p99?: number | null;
  response_time_p95?: number | null;
  response_time_median?: number | null;
  error_rate_4xx?: number | null;
  error_rate_5xx?: number | null;
  active_connections?: number | null;
  database_latency?: number | null;
  cache_hit_ratio?: number | null;
  requests_total?: number | null;
  message?: string;
  available?: boolean;
  error?: boolean;
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

      const apiBaseUrl = getApiBaseUrl();
      console.log('[ObservabilityPage] Fetching metrics from:', `${apiBaseUrl}/api/observability/metrics/`);
      const response = await fetch(`${apiBaseUrl}/api/observability/metrics/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('[ObservabilityPage] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const rawData = await response.json();
      console.log('[ObservabilityPage] Raw API response:', rawData);

      // Handle B13 envelope if present
      const data: BackendObservabilityMetrics = (rawData as any).data || rawData;
      console.log('[ObservabilityPage] Parsed data:', data);
      console.log('[ObservabilityPage] data.available:', data.available);
      console.log('[ObservabilityPage] data.error:', data.error);

      // Check if backend returned an error flag
      if (data.error) {
        throw new Error(data.message || 'Backend metrics error');
      }

      setBackendMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch observability metrics');
      console.error('Observability fetch error:', err);
      setBackendMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update metrics history when new backend data arrives
  useEffect(() => {
    if (backendMetrics && backendMetrics.available) {
      const currentMetrics: ObservabilityMetrics = {
        timestamp: Date.now(),
        responseTime: {
          p50: backendMetrics.response_time_median || 0,
          p95: backendMetrics.response_time_p95 || 0,
          p99: backendMetrics.response_time_p99 || 0,
        },
        errorRate: (backendMetrics.error_rate_4xx || 0) + (backendMetrics.error_rate_5xx || 0),
        activeConnections: backendMetrics.active_connections || 0,
      };

      const newHistory = [...historyRef.current, currentMetrics];
      // Keep only last 20 data points
      const trimmedHistory = newHistory.slice(-20);
      historyRef.current = trimmedHistory;
      setMetricsHistory(trimmedHistory);
    }
  }, [backendMetrics]);

  // Convert backend metrics to chart format for current display
  const currentMetrics: ObservabilityMetrics | null = backendMetrics && backendMetrics.available ? {
    timestamp: Date.now(),
    responseTime: {
      p50: backendMetrics.response_time_median || 0,
      p95: backendMetrics.response_time_p95 || 0,
      p99: backendMetrics.response_time_p99 || 0,
    },
    errorRate: (backendMetrics.error_rate_4xx || 0) + (backendMetrics.error_rate_5xx || 0),
    activeConnections: backendMetrics.active_connections || 0,
  } : null;

  const handleManualRefresh = async () => {
    await fetchMetrics();
  };

  // Determine if we have any usable data
  const hasData = backendMetrics?.available === true;
  const isEmptyState = !loading && !error && backendMetrics && !hasData;

  if (error) {
    return (
      <>
        <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
          <PageHeader
            title="Observability"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Platform' },
              { label: 'Observability' },
            ]}
          />
          <PageContent>
            <Card className="mb-16 p-24 bg-surface border">
              <Alert variant="error" data-testid="observability-error">
                Observability data unavailable (backend error): {error}
              </Alert>
              <div className="mt-16">
                <Button onClick={handleManualRefresh}>
                  Retry
                </Button>
              </div>
            </Card>
          </PageContent>
        </div>
      </>
    );
  }

  const lastUpdated = backendMetrics?.timestamp
    ? new Date(backendMetrics.timestamp).toLocaleTimeString()
    : 'Never';

  return (
    <>
      <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
        <PageHeader
        title="Observability"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Observability' },
        ]}
      />
      <PageContent>
        {/* Loading state - only show on initial load */}
        {loading && !backendMetrics && (
          <Card className="text-center bg-surface border" style={{ padding: '48px 24px' }}>
            <div className="text-muted fs-16">
              Loading observability metrics...
            </div>
          </Card>
        )}

        {/* Empty state - backend available but no metrics configured */}
        {isEmptyState && (
          <Card className="p-24 bg-surface border">
            <div className="mb-16">
              <h3 className="fs-18 fw-600 m-0 mb-8 text-primary">
                Status
              </h3>
              <Alert variant="info">
                No observability metrics configured yet. {backendMetrics?.message}
              </Alert>
            </div>
            <Button onClick={handleManualRefresh} variant="secondary">
              Check Again
            </Button>
          </Card>
        )}

        {/* Data available - show metrics */}
        {hasData && backendMetrics && (
          <>
            <Card data-testid="observability-header" className="mb-24 p-24 bg-surface border">
              <div className="flex-between">
                <div>
                  <h3 className="fs-18 fw-600 mb-4 text-primary">Metrics</h3>
                  <p className="fs-14 text-muted m-0">
                    Last updated: <span style={{ fontFamily: 'monospace', color: 'var(--app-text)' }}>
                      {backendMetrics.timestamp ? new Date(backendMetrics.timestamp).toLocaleTimeString() : 'N/A'}
                    </span>
                  </p>
                  {loading && <p className="fs-14 m-0" style={{ color: 'var(--app-primary)', marginTop: '4px' }}>Updating...</p>}
                  {backendMetrics.message && (
                    <p className="fs-12 text-muted m-0 mt-4">
                      {backendMetrics.message}
                    </p>
                  )}
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
            {/* Charts Section */}
            {metricsHistory.length > 0 && (
              <Card className="mb-24 p-24 bg-surface border" data-testid="observability-charts">
                <h3 className="fs-18 fw-600 mb-16 text-primary">Metrics Visualization</h3>
                <ObservabilityCharts
                  metricsHistory={metricsHistory}
                  currentMetrics={currentMetrics}
                />
              </Card>
            )}

            <Card data-testid="latency-metrics" className="mb-24 p-24 bg-surface border">
              <h3 className="fs-18 fw-600 mb-16 text-primary">Response Latency</h3>
              <div className="grid gap-16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">p99 Latency</div>
                  <div className="fs-24 fw-700 mt-8" style={{ color: 'var(--app-error)' }}>
                    {backendMetrics.response_time_p99 != null ? backendMetrics.response_time_p99.toFixed(0) : 'N/A'}
                    <span className="fs-14 fw-400 text-muted">ms</span>
                  </div>
                </div>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">p95 Latency</div>
                  <div className="fs-24 fw-700 mt-8" style={{ color: '#fd7e14' }}>
                    {backendMetrics.response_time_p95 != null ? backendMetrics.response_time_p95.toFixed(0) : 'N/A'}
                    <span className="fs-14 fw-400 text-muted">ms</span>
                  </div>
                </div>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">Median Latency</div>
                  <div className="fs-24 fw-700 mt-8" style={{ color: 'var(--app-success)' }}>
                    {backendMetrics.response_time_median != null ? backendMetrics.response_time_median.toFixed(0) : 'N/A'}
                    <span className="fs-14 fw-400 text-muted">ms</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card data-testid="error-metrics" className="mb-24 p-24 bg-surface border">
              <h3 className="fs-18 fw-600 mb-16 text-primary">Error Rates</h3>
              <div className="grid gap-16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">4xx Error Rate</div>
                  <div className="flex-row gap-8 mt-8">
                    <div className="fs-24 fw-700" style={{ color: '#ffc107' }}>
                      {backendMetrics.error_rate_4xx != null ? backendMetrics.error_rate_4xx.toFixed(2) : 'N/A'}%
                    </div>
                    {backendMetrics.error_rate_4xx != null && backendMetrics.error_rate_4xx > 5 && (
                      <Badge variant="warning">Elevated</Badge>
                    )}
                  </div>
                </div>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">5xx Error Rate</div>
                  <div className="flex-row gap-8 mt-8">
                    <div className="fs-24 fw-700" style={{ color: 'var(--app-error)' }}>
                      {backendMetrics.error_rate_5xx != null ? backendMetrics.error_rate_5xx.toFixed(2) : 'N/A'}%
                    </div>
                    {backendMetrics.error_rate_5xx != null && backendMetrics.error_rate_5xx > 1 && (
                      <Badge variant="error">Critical</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card data-testid="resource-metrics" className="mb-24 p-24 bg-surface border">
              <h3 className="fs-18 fw-600 mb-16 text-primary">Resources</h3>
              <div className="grid gap-16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">Active Connections</div>
                  <div className="fs-24 fw-700 mt-8" style={{ color: 'var(--app-primary)' }}>
                    {backendMetrics.active_connections != null ? backendMetrics.active_connections : 'N/A'}
                  </div>
                </div>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">Database Latency</div>
                  <div className="fs-24 fw-700 mt-8" style={{ color: 'var(--app-success)' }}>
                    {backendMetrics.database_latency != null ? backendMetrics.database_latency.toFixed(1) : 'N/A'}
                    <span className="fs-14 fw-400 text-muted">ms</span>
                  </div>
                </div>
                <div className="p-16 border rounded-8 bg-surface-2">
                  <div className="fs-14 text-muted">Cache Hit Ratio</div>
                  <div className="fs-24 fw-700 mt-8" style={{ color: '#6f42c1' }}>
                    {backendMetrics.cache_hit_ratio != null ? (backendMetrics.cache_hit_ratio * 100).toFixed(1) : 'N/A'}%
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </PageContent>
      </div>
    </>
  );
};

export default ObservabilityPage;
