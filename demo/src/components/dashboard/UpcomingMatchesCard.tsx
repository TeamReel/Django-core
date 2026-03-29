import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Calendar, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useAppSelection } from '../../hooks/useAppSelection';
import { queryKeys } from '../../utils/queryKeys';
import { routes } from '../../routes';
import styles from './DashboardSummaries.module.css';

interface CompactMatch {
  id: string;
  title: string;
  slug?: string;
  start_time: string;
  opponent_project?: { name: string };
  project: { name: string };
}

export const UpcomingMatchesCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;

  const matchFilters = useMemo(() => {
    const now = new Date().toISOString();
    const p: Record<string, string> = {
      activity_type: 'match',
      start_time__gte: now,
      ordering: 'start_time',
    };
    if (projectId) p.project = projectId;
    return p;
  }, [projectId]);

  const { data: matchData } = useQuery({
    queryKey: queryKeys.activities.upcoming(matchFilters),
    queryFn: () => api.list<CompactMatch>('/activities/', { params: matchFilters, pageSize: 3 }),
    staleTime: 5 * 60 * 1000,
  });

  const matches = matchData?.results ?? [];

  return (
    <div className={`${styles.summaryCard} ${styles.tallCard}`}>
      <div className={styles.tallHeader}>
        <Calendar size={16} />
        <span className={styles.tallTitle}>Wedstrijden</span>
        <button
          className={styles.seeAll}
          onClick={() => navigate('/matches')}
        >
          Alles <ChevronRight size={12} />
        </button>
      </div>

      {matches.length === 0 ? (
        <div className={styles.emptyMini}>Geen komende wedstrijden</div>
      ) : (
        <div className={styles.matchList}>
          {matches.map((m) => {
            const d = new Date(m.start_time);
            const opp = m.opponent_project?.name || '—';
            return (
              <div
                key={m.id}
                className={styles.matchItem}
                onClick={() => navigate(routes.matchById({ matchId: m.slug || m.id }))}
              >
                <div className={styles.matchDate}>
                  <span className={styles.matchDay}>{d.getDate()}</span>
                  <span className={styles.matchMonth}>
                    {d.toLocaleDateString('nl-NL', { month: 'short' })}
                  </span>
                </div>
                <div className={styles.matchInfo}>
                  <span className={styles.matchOpponent}>vs {opp}</span>
                  <span className={styles.matchTime}>
                    {d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
