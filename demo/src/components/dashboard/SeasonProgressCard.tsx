/**
 * SeasonProgressCard — Season progress indicator with match + content stats.
 *
 * Shows:
 * - Season progress bar (matches played / total matches)
 * - Quick stats: matches played, content generated, lineups made
 * - Streak counter (consecutive matches with content)
 *
 * Data sources:
 * - Activities API: total matches (past + future) for the project
 * - useGenerativeRequests (shared): completed content count
 * - useUpcomingMatches (shared): upcoming count
 */
import React, { useMemo } from 'react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Trophy, Film, Users, Flame,
} from 'lucide-react';
import { api } from '@/api';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { useUpcomingMatches } from '../../hooks/useUpcomingMatches';
import { queryKeys } from '../../utils/queryKeys';
import styles from './SeasonProgressCard.module.css';

interface MatchCount {
  count: number;
  results: Array<{ id: string }>;
}

export const SeasonProgressCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const project = context.project;

  // Total matches (all time for this project)
  const totalMatchFilters = useMemo(() => {
    const p: Record<string, string> = { activity_type: 'match' };
    if (project) p.project = project.id;
    return p;
  }, [project?.id]);

  const { data: allMatchData } = useQuery({
    queryKey: ['activities', 'season-total', totalMatchFilters],
    queryFn: () => api.list<{ id: string }>('/activities/', { params: totalMatchFilters, pageSize: 1 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!project,
  });

  // Past matches (played)
  const pastMatchFilters = useMemo(() => {
    const now = new Date().toISOString();
    const p: Record<string, string> = {
      activity_type: 'match',
      start_time__lte: now,
    };
    if (project) p.project = project.id;
    return p;
  }, [project?.id]);

  const { data: pastMatchData } = useQuery({
    queryKey: ['activities', 'season-past', pastMatchFilters],
    queryFn: () => api.list<{ id: string }>('/activities/', { params: pastMatchFilters, pageSize: 1 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!project,
  });

  // Completed content
  const genFilters = useMemo(() => {
    const p: Record<string, string> = { status: 'completed' };
    if (project) p.project = project.id;
    return p;
  }, [project?.id]);

  const { data: genData } = useGenerativeRequests(genFilters);

  // Upcoming matches count
  const { data: upcomingData } = useUpcomingMatches(project?.id, 1);

  const totalMatches = allMatchData?.count ?? 0;
  const playedMatches = pastMatchData?.count ?? 0;
  const upcomingCount = upcomingData?.total ?? 0;
  const contentCount = genData?.count ?? genData?.results?.length ?? 0;
  const progressPercent = totalMatches > 0
    ? Math.round((playedMatches / totalMatches) * 100)
    : 0;

  if (!project || totalMatches === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <BarChart3 size={14} className={styles.headerIcon} />
        <span className={styles.title}>Seizoensoverzicht</span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Seizoen ${progressPercent}% gespeeld`}
          />
        </div>
        <span className={styles.progressLabel}>{progressPercent}% gespeeld</span>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <Trophy size={14} className={styles.statIcon} />
          <span className={styles.statValue}>{playedMatches}</span>
          <span className={styles.statLabel}>gespeeld</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <Film size={14} className={styles.statIcon} />
          <span className={styles.statValue}>{contentCount}</span>
          <span className={styles.statLabel}>content</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <Trophy size={14} className={styles.statIcon} />
          <span className={styles.statValue}>{upcomingCount}</span>
          <span className={styles.statLabel}>nog te spelen</span>
        </div>
      </div>
    </div>
  );
};
