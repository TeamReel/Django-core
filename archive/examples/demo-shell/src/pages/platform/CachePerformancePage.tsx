import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * T015-T019: Cache Performance Dashboard
 *
 * Purpose: Visualize Redis cache performance and provide admin controls
 * - Real-time stats (hits, misses, hit ratio, memory, keys)
 * - Historical charts (last 7 days)
 * - Admin actions (clear cache, run benchmark)
 *
 * API Endpoints:
 * - GET /api/v1/system/cache/metrics (realtime + history)
 * - POST /api/v1/system/cache/clear
 * - POST /api/v1/system/cache/benchmark
 */

interface RealtimeMetrics {
  hits: number;
  misses: number;
  hit_ratio: number;
  memory_used_bytes: number;
  total_keys: number;
}

interface HistoricalDataPoint {
  timestamp: string;
  hit_ratio: number;
  memory_used_bytes: number;
}

interface CacheMetricsResponse {
  realtime: RealtimeMetrics;
  history: HistoricalDataPoint[];
}

interface BenchmarkResult {
  uncached_duration_ms: number;
  cached_duration_ms: number;
  speedup_factor: number;
}

export const CachePerformancePage: React.FC = () => {
  const [metrics, setMetrics] = useState<CacheMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/v1/system/cache/metrics/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('[CachePerformancePage] Full response:', responseData);

      // Unwrap the standard API response wrapper
      const data = responseData.data || responseData;
      console.log('[CachePerformancePage] Unwrapped data:', data);
      console.log('[CachePerformancePage] data.realtime:', data.realtime);

      // Validate response structure
      if (!data.realtime) {
        console.error('[CachePerformancePage] Invalid API response:', data);
        throw new Error('Invalid API response: missing realtime metrics');
      }

      setMetrics(data);
    } catch (err) {
      console.error('[CachePerformancePage] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setActionLoading('clear');
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/v1/system/cache/clear/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.status}`);
      }

      const responseData = await response.json();
      const result = responseData.data || responseData;
      alert(`Cache cleared successfully! ${result.cleared_keys} keys removed.`);

      // Refresh metrics
      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunBenchmark = async () => {
    try {
      setActionLoading('benchmark');
      setError(null);
      setBenchmarkResult(null);

      const response = await fetch(`${apiBaseUrl}/api/v1/system/cache/benchmark/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to run benchmark: ${response.status}`);
      }

      const responseData = await response.json();
      const result = responseData.data || responseData;
      setBenchmarkResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run benchmark');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Poll every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Helper function to get CSRF token from cookies
  const getCsrfToken = (): string => {
    const name = 'csrftoken';
    let cookieValue = '';
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  return (
    <AppShell>
      <PageHeader
        title="Cache Performance"
        subtitle="Monitor Redis cache performance and manage cache operations. Note: Real-time stats show Redis native operations only. Use benchmark to verify caching works."
        actions={
          <Button variant="secondary" onClick={fetchMetrics} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <PageContent>
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {metrics && metrics.realtime && metrics.realtime.hits === 0 && metrics.realtime.misses === 0 && (
          <Alert variant="info" title="Cache Statistics">
            Real-time stats are currently 0. This happens after Redis restart or when using Django cache (not native Redis commands).
            <strong> Use the "Run Benchmark" button below to verify caching works.</strong> Historical data will appear after 10 minutes when Celery collects metrics.
          </Alert>
        )}

        {loading && !metrics && (
          <Card>
            <div className="p-8 text-center text-gray-500">Loading metrics...</div>
          </Card>
        )}

        {metrics && metrics.realtime && (
          <>
            {/* T016: Cache Stats (Gauges) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Hit Ratio</div>
                  <div className="text-2xl font-bold">
                    {formatPercentage(metrics.realtime.hit_ratio)}
                  </div>
                  <Badge
                    variant={metrics.realtime.hit_ratio >= 0.8 ? 'success' : 'warning'}
                    className="mt-2"
                  >
                    {metrics.realtime.hit_ratio >= 0.8 ? 'Good' : 'Low'}
                  </Badge>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Cache Hits</div>
                  <div className="text-2xl font-bold">
                    {metrics.realtime.hits.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Since restart</div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Cache Misses</div>
                  <div className="text-2xl font-bold">
                    {metrics.realtime.misses.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Since restart</div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Memory Used</div>
                  <div className="text-2xl font-bold">
                    {formatBytes(metrics.realtime.memory_used_bytes)}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Redis memory</div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Total Keys</div>
                  <div className="text-2xl font-bold">
                    {metrics.realtime.total_keys.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Cached items</div>
                </div>
              </Card>
            </div>

            {/* T017: Cache History Chart (Recharts Implementation) */}
            <Card className="mb-6">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Performance History (Last 7 Days)</h2>
                {metrics.history && metrics.history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={metrics.history.map((point) => ({
                        timestamp: new Date(point.timestamp).toLocaleTimeString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        hit_ratio: point.hit_ratio,
                        memory_mb: point.memory_used_bytes / (1024 * 1024),
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        yAxisId="left"
                        domain={[0, 1]}
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                        label={{ value: 'Hit Ratio', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${value.toFixed(0)} MB`}
                        label={{ value: 'Memory (MB)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'hit_ratio') {
                            return [`${(value * 100).toFixed(1)}%`, 'Hit Ratio'];
                          }
                          return [`${value.toFixed(2)} MB`, 'Memory'];
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="hit_ratio"
                        stroke="#10b981"
                        name="Hit Ratio"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="memory_mb"
                        stroke="#3b82f6"
                        name="Memory (MB)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No historical data available yet.
                    <div className="text-sm mt-2">
                      Data is collected every 10 minutes by Celery Beat.
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* T018: Cache Actions */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Cache Management</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Clear Cache</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Remove all cached keys from Redis. Use with caution in production.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleClearCache}
                      disabled={actionLoading === 'clear'}
                    >
                      {actionLoading === 'clear' ? 'Clearing...' : 'Clear All Cache'}
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Run Benchmark</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Test cache performance by comparing cached vs uncached query speed.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleRunBenchmark}
                      disabled={actionLoading === 'benchmark'}
                    >
                      {actionLoading === 'benchmark' ? 'Running...' : 'Run Benchmark'}
                    </Button>
                  </div>
                </div>

                {benchmarkResult && (
                  <Alert variant="success" title="Benchmark Results" className="mt-4">
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Uncached:</strong> {benchmarkResult.uncached_duration_ms.toFixed(2)} ms
                      </div>
                      <div>
                        <strong>Cached:</strong> {benchmarkResult.cached_duration_ms.toFixed(2)} ms
                      </div>
                      <div>
                        <strong>Speedup:</strong>{' '}
                        <span className="text-green-600 font-bold">
                          {benchmarkResult.speedup_factor.toFixed(1)}x faster
                        </span>
                      </div>
                    </div>
                  </Alert>
                )}
              </div>
            </Card>
          </>
        )}
      </PageContent>
    </AppShell>
  );
};

export default CachePerformancePage;
