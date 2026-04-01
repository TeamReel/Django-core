import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { StatsOverviewSection } from './components/StatsOverviewSection';
import { GrowthTrendsChart } from './components/GrowthTrendsChart';
import { PipelineStatusSection } from './components/PipelineStatusSection';
import { CreditsUsageChart } from './components/CreditsUsageChart';
import { StaleJobsAlert } from './components/StaleJobsAlert';
import { DataExplorerSection } from './components/DataExplorerSection';
import { useDashboardOverview } from './hooks/useDashboardOverview';
import { useDashboardPipelines } from './hooks/useDashboardPipelines';
import { useDashboardCredits } from './hooks/useDashboardCredits';
import { useDashboardExplorer } from './hooks/useDashboardExplorer';
import type { DateRange } from './platformStatsTypes';
import styles from './PlatformStatsPage.module.css';

const VALID_RANGES = new Set<DateRange>(['7d', '30d', '90d', 'season']);

function parseRange(raw: string | null): DateRange {
  if (raw && VALID_RANGES.has(raw as DateRange)) return raw as DateRange;
  return '30d';
}

export const PlatformStatsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const range = parseRange(searchParams.get('range'));

  const overview = useDashboardOverview(range);
  const pipelines = useDashboardPipelines(range);
  const credits = useDashboardCredits(range);
  const explorer = useDashboardExplorer();

  const lastUpdated = useMemo(() => {
    const latest = [overview.dataUpdatedAt, pipelines.dataUpdatedAt, credits.dataUpdatedAt]
      .filter(Boolean)
      .sort()
      .pop();
    return latest ? new Date(latest).toLocaleTimeString('nl-NL') : null;
  }, [overview.dataUpdatedAt, pipelines.dataUpdatedAt, credits.dataUpdatedAt]);

  const hasAnyError = overview.isError || pipelines.isError || credits.isError;

  return (
    <div className={styles.pageWrapper}>
      <PageHeader
        title="Platform Stats"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Stats' },
        ]}
      />
      <PageContent>
        {/* Last updated indicator */}
        {lastUpdated && (
          <div className={styles.headerRow}>
            <span className={styles.lastUpdated}>
              Laatst bijgewerkt: {lastUpdated}
            </span>
          </div>
        )}

        {/* Global error fallback */}
        {hasAnyError && (
          <Alert variant="error" className={styles.errorSection}>
            Een of meer secties konden niet geladen worden. Data wordt elke 30 seconden opnieuw opgehaald.
          </Alert>
        )}

        {/* Stale jobs alert */}
        <StaleJobsAlert jobs={pipelines.data?.video?.stale_jobs} />

        {/* KPI overview */}
        <StatsOverviewSection
          platform={overview.data?.platform}
          growth={overview.data?.growth}
          isLoading={overview.isLoading}
        />

        {/* Growth trends chart */}
        <GrowthTrendsChart
          data={overview.data?.growth}
          isLoading={overview.isLoading}
        />

        {/* Pipeline status */}
        <PipelineStatusSection
          ai={pipelines.data?.ai}
          content={pipelines.data?.content}
          video={pipelines.data?.video}
          isLoading={pipelines.isLoading}
        />

        {/* Credits usage */}
        <CreditsUsageChart
          data={credits.data}
          isLoading={credits.isLoading}
        />

        {/* Data Explorer — table fill rates */}
        <DataExplorerSection
          data={explorer.data}
          isLoading={explorer.isLoading}
        />
      </PageContent>
    </div>
  );
};

export default PlatformStatsPage;
