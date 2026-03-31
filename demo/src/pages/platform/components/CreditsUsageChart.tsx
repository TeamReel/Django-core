import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '@django-core/design-system';
import Skeleton from '@/components/Skeleton';
import type { DashboardCredits } from '../platformStatsTypes';
import styles from '../PlatformStatsPage.module.css';

interface CreditsUsageChartProps {
  data?: DashboardCredits;
  isLoading: boolean;
}

export const CreditsUsageChart: React.FC<CreditsUsageChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <Skeleton variant="card" width="100%" height="320px" />;
  }

  if (!data) return null;

  const usagePercent = data.total_allocated > 0
    ? ((data.total_used / data.total_allocated) * 100).toFixed(1)
    : '0';

  return (
    <Card className={styles.chartCard}>
      <div className={styles.creditsSummaryRow}>
        <h3 className={styles.sectionTitle}>Credits Verbruik</h3>
        <div className={styles.creditsBadges}>
          <span className={styles.creditsAllocated}>
            {data.total_allocated.toLocaleString('nl-NL')} toegekend
          </span>
          <span className={styles.creditsUsed}>
            {data.total_used.toLocaleString('nl-NL')} gebruikt ({usagePercent}%)
          </span>
        </div>
      </div>

      {data.usage_by_day && data.usage_by_day.length > 0 ? (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.usage_by_day}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="used"
                name="Verbruik"
                stroke="var(--color-amber-500, #f59e0b)"
                fill="var(--color-amber-500, #f59e0b)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={styles.emptyState}>Nog geen dagelijks verbruik beschikbaar</div>
      )}

      {data.top_orgs && data.top_orgs.length > 0 && (
        <div className={styles.topOrgsTable}>
          <h4 className={styles.miniChartTitle}>Top organisaties</h4>
          <table className={styles.statsTable}>
            <thead>
              <tr>
                <th>Organisatie</th>
                <th>Gebruikt</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.top_orgs.map((org) => (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>{org.used.toLocaleString('nl-NL')}</td>
                  <td>{org.balance.toLocaleString('nl-NL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
