import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Skeleton from './Skeleton';
import type { CreditsTransaction } from '../types/chart';

interface CreditsChartProps {
  transactions: CreditsTransaction[];
  className?: string;
}

/**
 * Credits usage chart component using Recharts
 *
 * Visualizes 30-day credit usage trends using an area chart.
 * Respects F07 theme colors.
 */
export const CreditsChart: React.FC<CreditsChartProps> = ({
  transactions,
  className = ''
}) => {
  const chartData = useMemo(() => {
    const days = 30;
    const today = new Date();
    const data: Array<{ date: string; usage: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayUsage = transactions
        .filter(tx => {
          const txDate = new Date(tx.date);
          return tx.type === 'usage' && txDate >= dayStart && txDate <= dayEnd;
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        usage: dayUsage,
      });
    }

    return data;
  }, [transactions]);

  if (chartData.length === 0) {
    return <Skeleton variant="card" width="100%" height="256px" />;
  }

  return (
    <div
      className={`h-64 ${className}`}
      data-testid="credits-chart-container"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="usage"
            name="Daily Credit Usage"
            stroke="var(--color-accent-500, #3b82f6)"
            fill="var(--color-accent-500, #3b82f6)"
            fillOpacity={0.12}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
