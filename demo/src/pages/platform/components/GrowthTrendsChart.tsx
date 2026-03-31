import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@django-core/design-system';
import Skeleton from '@/components/Skeleton';
import type { GrowthWeek } from '../platformStatsTypes';
import styles from '../PlatformStatsPage.module.css';

interface GrowthTrendsChartProps {
  data?: GrowthWeek[];
  isLoading: boolean;
}

export const GrowthTrendsChart: React.FC<GrowthTrendsChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <Skeleton variant="card" width="100%" height="320px" />;
  }

  if (!data || data.length === 0) {
    return (
      <Card className={styles.chartCard}>
        <h3 className={styles.sectionTitle}>Groeitrends</h3>
        <div className={styles.emptyState}>Nog geen groeidata beschikbaar</div>
      </Card>
    );
  }

  const chartData = data.map((w) => ({
    week: w.week,
    Organisaties: w.organisations,
    Leden: w.members,
    'Content items': w.content_items,
  }));

  return (
    <Card className={styles.chartCard}>
      <h3 className={styles.sectionTitle}>Groeitrends</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="Organisaties"
              stroke="var(--color-accent-500, #3b82f6)"
              fill="var(--color-accent-500, #3b82f6)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Leden"
              stroke="var(--color-green-500, #22c55e)"
              fill="var(--color-green-500, #22c55e)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Content items"
              stroke="var(--color-violet-500, #8b5cf6)"
              fill="var(--color-violet-500, #8b5cf6)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
