import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Button, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { DateRangeSelector } from './components/DateRangeSelector';
import { StatsOverviewSection } from './components/StatsOverviewSection';
import { GrowthTrendsChart } from './components/GrowthTrendsChart';
import { PipelineStatusSection } from './components/PipelineStatusSection';
import { CreditsUsageChart } from './components/CreditsUsageChart';
import { StaleJobsAlert } from './components/StaleJobsAlert';
import { useDashboardOverview } from './hooks/useDashboardOverview';
import { useDashboardPipelines } from './hooks/useDashboardPipelines';
import { useDashboardCredits } from './hooks/useDashboardCredits';
import type { DateRange } from './platformStatsTypes';
import styles from './PlatformStatsPage.module.css';

const VALID_RANGES = new Set<DateRange>(['7d', '30d', '90d', 'season']);

function parseRange(raw: string | null): DateRange {
  if (raw && VALID_RANGES.has(raw as DateRange)) return raw as DateRange;
  return '30d';
}

export const PlatformStatsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = parseRange(searchParams.get('range'));

  const handleRangeChange = useCallback(
    (newRange: DateRange) => {
      setSearchParams({ range: newRange }, { replace: true });
    },
    [setSearchParams],
  );

  const overview = useDashboardOverview(range);
  const pipelines = useDashboardPipelines(range);
  const credits = useDashboardCredits(range);

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
        {/* Header: date range + last updated */}
        <div className={styles.headerRow}>
          <DateRangeSelector value={range} onChange={handleRangeChange} />
          {lastUpdated && (
            <span className={styles.lastUpdated}>
              Laatst bijgewerkt: {lastUpdated}
            </span>
          )}
        </div>

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
      </PageContent>
    </div>
  );
};

export default PlatformStatsPage;
