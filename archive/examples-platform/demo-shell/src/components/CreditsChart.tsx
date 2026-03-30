import React, { lazy, Suspense, useEffect, useState } from 'react';
import LoadingState from './LoadingState';
import { LazyChartBoundary } from './LazyChartBoundary';
import type { ChartData, ChartOptions, CreditsTransaction } from '../types/chart';

// Lazy load Chart.js components to keep them out of the main bundle
const Line = lazy(async () => {
  const { Chart, registerables } = await import('chart.js');
  const { Line } = await import('react-chartjs-2');

  Chart.register(...registerables);

  return { default: Line };
});

interface CreditsChartProps {
  transactions: CreditsTransaction[];
  className?: string;
}

/**
 * Credits usage chart component with lazy-loaded Chart.js
 *
 * Visualizes 30-day credit usage trends using a line chart.
 * Respects F07 theme colors and is code-split from main bundle.
 */
export const CreditsChart: React.FC<CreditsChartProps> = ({
  transactions,
  className = ''
}) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartOptions, setChartOptions] = useState<ChartOptions | null>(null);

  useEffect(() => {
    const generateChartData = () => {
      // Generate last 30 days of data
      const days = 30;
      const today = new Date();
      const labels: string[] = [];
      const dailyUsage: number[] = [];

      // Create date labels for last 30 days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }

      // Calculate daily usage from transactions
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (days - 1 - i));

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayUsage = transactions
          .filter(tx => {
            const txDate = new Date(tx.date);
            return tx.type === 'usage' &&
                   txDate >= dayStart &&
                   txDate <= dayEnd;
          })
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        dailyUsage.push(dayUsage);
      }

      // Get theme colors
      const style = getComputedStyle(document.documentElement);
      const primaryColor = style.getPropertyValue('--color-accent-500') || '#3b82f6';
      const backgroundColor = primaryColor + '20'; // Add transparency

      const data: ChartData = {
        labels,
        datasets: [
          {
            label: 'Daily Credit Usage',
            data: dailyUsage,
            borderColor: primaryColor,
            backgroundColor: backgroundColor,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: primaryColor,
            pointBorderColor: '#ffffff',
          },
        ],
      };

      const options: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: false,
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              display: true,
            },
          },
        },
      };

      setChartData(data);
      setChartOptions(options);
    };

    generateChartData();
  }, [transactions]);

  if (!chartData || !chartOptions) {
    return <LoadingState message="Preparing chart..." />;
  }

  return (
    <LazyChartBoundary>
      <div
        className={`h-64 ${className}`}
        data-testid="credits-chart-container"
      >
        <Line data={chartData} options={chartOptions} />
      </div>
    </LazyChartBoundary>
  );
};
