import React from 'react';
import { Card } from '@django-core/design-system';
import Skeleton from '@/components/Skeleton';
import type { PlatformCounts, GrowthWeek } from '../platformStatsTypes';
import styles from '../PlatformStatsPage.module.css';

interface StatsOverviewSectionProps {
  platform?: PlatformCounts;
  growth?: GrowthWeek[];
  isLoading: boolean;
}

interface KpiCardProps {
  label: string;
  value: number;
  delta?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, delta }) => (
  <Card className={styles.kpiCard}>
    <div className={styles.kpiLabel}>{label}</div>
    <div className={styles.kpiValue}>{value.toLocaleString('nl-NL')}</div>
    {delta !== undefined && delta !== 0 && (
      <div className={delta > 0 ? styles.kpiDeltaPositive : styles.kpiDeltaNegative}>
        {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
      </div>
    )}
  </Card>
);

export const StatsOverviewSection: React.FC<StatsOverviewSectionProps> = ({
  platform,
  growth,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className={styles.kpiGrid}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="card" width="100%" height="96px" />
        ))}
      </div>
    );
  }

  if (!platform) return null;

  const latestWeek = growth?.[growth.length - 1];

  return (
    <div className={styles.kpiGrid}>
      <KpiCard
        label="Organisaties"
        value={platform.organisations}
        delta={latestWeek?.delta_organisations}
      />
      <KpiCard
        label="Projecten"
        value={platform.projects}
      />
      <KpiCard
        label="Leden"
        value={platform.members}
        delta={latestWeek?.delta_members}
      />
      <KpiCard
        label="Gebruikers"
        value={platform.users}
      />
      <KpiCard
        label="Bestanden"
        value={platform.file_assets}
      />
    </div>
  );
};
