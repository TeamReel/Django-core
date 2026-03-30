import React, { lazy, useEffect, useState } from 'react';
import { LazyChartBoundary } from './LazyChartBoundary';
import LoadingState from './LoadingState';
import type { ChartData, ChartOptions, ObservabilityMetrics } from '../types/chart';

// Lazy load Chart.js components
const Line = lazy(async () => {
  const { Chart, registerables } = await import('chart.js');
  const { Line } = await import('react-chartjs-2');

  Chart.register(...registerables);

  return { default: Line };
});

const Bar = lazy(async () => {
  const { Chart, registerables } = await import('chart.js');
  const { Bar } = await import('react-chartjs-2');

  Chart.register(...registerables);

  return { default: Bar };
});

const Doughnut = lazy(async () => {
  const { Chart, registerables } = await import('chart.js');
  const { Doughnut } = await import('react-chartjs-2');

  Chart.register(...registerables);

  return { default: Doughnut };
});

interface ObservabilityChartsProps {
  metricsHistory: ObservabilityMetrics[];
  currentMetrics: ObservabilityMetrics | null;
  className?: string;
}

/**
 * Observability charts component with lazy-loaded Chart.js
 *
 * Renders three charts:
 * 1. Response time trends (line chart)
 * 2. Error rates (bar chart)
 * 3. Active connections (gauge-style doughnut)
 */
export const ObservabilityCharts: React.FC<ObservabilityChartsProps> = ({
  metricsHistory,
  currentMetrics,
  className = ''
}) => {
  const [responseTimeData, setResponseTimeData] = useState<ChartData | null>(null);
  const [errorRateData, setErrorRateData] = useState<ChartData | null>(null);
  const [connectionsData, setConnectionsData] = useState<ChartData | null>(null);
  const [chartOptions, setChartOptions] = useState<{
    line: ChartOptions;
    bar: ChartOptions;
    doughnut: ChartOptions;
  } | null>(null);

  useEffect(() => {
    const generateChartData = () => {
      // Get theme colors
      const style = getComputedStyle(document.documentElement);
      const primaryColor = style.getPropertyValue('--color-accent-500') || '#3b82f6';
      const successColor = style.getPropertyValue('--color-success-500') || '#10b981';
      const warningColor = style.getPropertyValue('--color-warning-500') || '#f59e0b';
      const errorColor = style.getPropertyValue('--color-error-500') || '#ef4444';

      // Prepare time labels from the last 10 data points
      const labels = metricsHistory.slice(-10).map((_, index) => {
        const now = new Date();
        const minutesAgo = (9 - index) * 0.5; // 30-second intervals = 0.5 minutes
        const time = new Date(now.getTime() - minutesAgo * 60000);
        return time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      });

      // Response time line chart data
      const responseTimeChart: ChartData = {
        labels,
        datasets: [
          {
            label: 'P99',
            data: metricsHistory.slice(-10).map(m => m.responseTime.p99),
            borderColor: errorColor,
            backgroundColor: errorColor + '20',
            fill: false,
            tension: 0.3,
          },
          {
            label: 'P95',
            data: metricsHistory.slice(-10).map(m => m.responseTime.p95),
            borderColor: warningColor,
            backgroundColor: warningColor + '20',
            fill: false,
            tension: 0.3,
          },
          {
            label: 'P50 (Median)',
            data: metricsHistory.slice(-10).map(m => m.responseTime.p50),
            borderColor: successColor,
            backgroundColor: successColor + '20',
            fill: false,
            tension: 0.3,
          },
        ],
      };

      // Error rate bar chart data
      const errorChart: ChartData = {
        labels: ['4xx Errors', '5xx Errors'],
        datasets: [
          {
            label: 'Error Rate (%)',
            data: [
              currentMetrics?.errorRate || 0,
              (currentMetrics?.errorRate || 0) * 0.2, // Simulate 5xx being ~20% of total errors
            ],
            backgroundColor: [warningColor, errorColor],
          },
        ],
      };

      // Active connections gauge-style data
      const maxConnections = 1000; // Assume max capacity
      const activeConnections = currentMetrics?.activeConnections || 0;
      const remainingConnections = maxConnections - activeConnections;

      const connectionsChart: ChartData = {
        labels: ['Active', 'Available'],
        datasets: [
          {
            label: 'Connections',
            data: [activeConnections, remainingConnections],
            backgroundColor: [
              activeConnections > maxConnections * 0.8 ? errorColor :
              activeConnections > maxConnections * 0.6 ? warningColor :
              primaryColor,
              '#e5e7eb', // Gray for available
            ],
          },
        ],
      };

      // Chart options
      const lineOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: { display: true },
          },
        },
      };

      const barOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { display: true, grid: { display: false } },
          y: { display: true, beginAtZero: true, grid: { display: true } },
        },
      };

      const doughnutOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      };

      setResponseTimeData(responseTimeChart);
      setErrorRateData(errorChart);
      setConnectionsData(connectionsChart);
      setChartOptions({
        line: lineOptions,
        bar: barOptions,
        doughnut: doughnutOptions,
      });
    };

    if (metricsHistory.length > 0 || currentMetrics) {
      generateChartData();
    }
  }, [metricsHistory, currentMetrics]);

  if (!responseTimeData || !errorRateData || !connectionsData || !chartOptions) {
    return <LoadingState message="Preparing charts..." />;
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Response Time Trends */}
      <div className="lg:col-span-2">
        <h4 className="text-md font-semibold mb-3">Response Time Trends</h4>
        <LazyChartBoundary>
          <div className="h-64" data-testid="observability-response-time-chart">
            <Line data={responseTimeData} options={chartOptions.line} />
          </div>
        </LazyChartBoundary>
      </div>

      {/* Active Connections Gauge */}
      <div>
        <h4 className="text-md font-semibold mb-3">Active Connections</h4>
        <LazyChartBoundary>
          <div className="h-64" data-testid="observability-connections-chart">
            <Doughnut data={connectionsData} options={chartOptions.doughnut} />
          </div>
        </LazyChartBoundary>
      </div>

      {/* Error Rates */}
      <div className="lg:col-span-3">
        <h4 className="text-md font-semibold mb-3">Current Error Rates</h4>
        <LazyChartBoundary>
          <div className="h-48" data-testid="observability-error-rate-chart">
            <Bar data={errorRateData} options={chartOptions.bar} />
          </div>
        </LazyChartBoundary>
      </div>
    </div>
  );
};
