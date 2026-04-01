import React, { useState } from 'react';
import { Card } from '@django-core/design-system';
import Skeleton from '@/components/Skeleton';
import type { DataExplorerStats, ExplorerAppInfo } from '../platformStatsTypes';
import styles from '../PlatformStatsPage.module.css';

interface DataExplorerSectionProps {
  data?: DataExplorerStats;
  isLoading: boolean;
}

type FilterMode = 'all' | 'filled' | 'empty';

function matchesFilter(app: ExplorerAppInfo, mode: FilterMode): boolean {
  if (mode === 'all') return true;
  if (mode === 'filled') return app.fill_indicator !== '🔴';
  return app.fill_indicator === '🔴';
}

export const DataExplorerSection: React.FC<DataExplorerSectionProps> = ({ data, isLoading }) => {
  const [filter, setFilter] = useState<FilterMode>('all');

  if (isLoading) {
    return <Skeleton variant="card" width="100%" height="320px" />;
  }

  if (!data) return null;

  const filteredApps = data.apps.filter((app) => matchesFilter(app, filter));

  return (
    <Card className={styles.chartCard}>
      <div className={styles.explorerHeader}>
        <h3 className={styles.sectionTitle}>Data Explorer</h3>
        <div className={styles.explorerSummary}>
          <span>{data.total_apps} apps</span>
          <span>{data.total_models} models</span>
          <span>{data.total_records.toLocaleString('nl-NL')} records</span>
          <span className={styles.explorerPct}>{data.filled_tables_pct}% gevuld</span>
        </div>
      </div>

      <div className={styles.explorerFilter} role="group" aria-label="Filter tabellen">
        {(['all', 'filled', 'empty'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`${styles.explorerFilterBtn} ${filter === mode ? styles.explorerFilterActive : ''}`}
            onClick={() => setFilter(mode)}
            aria-pressed={filter === mode}
          >
            {mode === 'all' ? 'Alles' : mode === 'filled' ? 'Gevuld' : 'Leeg'}
          </button>
        ))}
      </div>

      <div className={styles.explorerGrid}>
        {filteredApps.map((app) => (
          <div key={app.label} className={styles.explorerApp}>
            <div className={styles.explorerAppHeader}>
              <span className={styles.explorerIndicator}>{app.fill_indicator}</span>
              <span className={styles.explorerAppName}>{app.verbose_name}</span>
              <span className={styles.explorerAppCount}>
                {app.total_records.toLocaleString('nl-NL')}
              </span>
            </div>
            <div className={styles.explorerModels}>
              {app.models.map((model) => (
                <div
                  key={model.name}
                  className={`${styles.explorerModel} ${model.count === 0 ? styles.explorerModelEmpty : ''}`}
                >
                  <span className={styles.explorerModelName}>{model.name}</span>
                  <span className={styles.explorerModelCount}>
                    {model.count.toLocaleString('nl-NL')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredApps.length === 0 && (
          <div className={styles.emptyState}>
            Geen {filter === 'filled' ? 'gevulde' : 'lege'} apps gevonden
          </div>
        )}
      </div>
    </Card>
  );
};
