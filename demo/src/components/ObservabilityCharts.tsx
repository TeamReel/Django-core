import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Skeleton from './Skeleton';
import type { ObservabilityMetrics } from '../types/chart';

interface ObservabilityChartsProps {
  metricsHistory: ObservabilityMetrics[];
  currentMetrics: ObservabilityMetrics | null;
  className?: string;
}

/**
 * Observability charts component using Recharts
 *
 * Renders three charts:
 * 1. Response time trends (line chart)
 * 2. Error rates (bar chart)
 * 3. Active connections (pie/gauge chart)
 */
export const ObservabilityCharts: React.FC<ObservabilityChartsProps> = ({
  metricsHistory,
  currentMetrics,
  className = ''
}) => {
  const responseTimeData = useMemo(() => {
    return metricsHistory.slice(-10).map((m, index) => {
      const now = new Date();
      const minutesAgo = (9 - index) * 0.5;
      const time = new Date(now.getTime() - minutesAgo * 60000);
      return {
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        p50: m.responseTime.p50,
        p95: m.responseTime.p95,
        p99: m.responseTime.p99,
      };
    });
  }, [metricsHistory]);

  const errorRateData = useMemo(() => [
    { name: '4xx Errors', rate: currentMetrics?.errorRate ?? 0 },
    { name: '5xx Errors', rate: (currentMetrics?.errorRate ?? 0) * 0.2 },
  ], [currentMetrics]);

  const connectionsData = useMemo(() => {
    const maxConnections = 1000;
    const active = currentMetrics?.activeConnections ?? 0;
    return [
      { name: 'Active', value: active },
      { name: 'Available', value: maxConnections - active },
    ];
  }, [currentMetrics]);

  const connectionsFill = useMemo(() => {
    const active = currentMetrics?.activeConnections ?? 0;
    const color = active > 800 ? 'var(--color-error-500, #ef4444)' :
                  active > 600 ? 'var(--color-warning-500, #f59e0b)' :
                  'var(--color-accent-500, #3b82f6)';
    return [color, '#e5e7eb'];
  }, [currentMetrics]);

  if (metricsHistory.length === 0 && !currentMetrics) {
    return <Skeleton variant="card" width="100%" height="300px" />;
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Response Time Trends */}
      <div className="lg:col-span-2">
        <h4 className="text-md font-semibold mb-3">Response Time Trends</h4>
        <div className="h-64" data-testid="observability-response-time-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="p99" name="P99" stroke="var(--color-error-500, #ef4444)" dot={false} />
              <Line type="monotone" dataKey="p95" name="P95" stroke="var(--color-warning-500, #f59e0b)" dot={false} />
              <Line type="monotone" dataKey="p50" name="P50 (Median)" stroke="var(--color-success-500, #22c55e)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Connections Gauge */}
      <div>
        <h4 className="text-md font-semibold mb-3">Active Connections</h4>
        <div className="h-64" data-testid="observability-connections-chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={connectionsData}
                dataKey="value"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {connectionsData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={connectionsFill[index]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Rates */}
      <div className="lg:col-span-3">
        <h4 className="text-md font-semibold mb-3">Current Error Rates</h4>
        <div className="h-48" data-testid="observability-error-rate-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={errorRateData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" name="Error Rate (%)">
                <Cell fill="var(--color-warning-500, #f59e0b)" />
                <Cell fill="var(--color-error-500, #ef4444)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
