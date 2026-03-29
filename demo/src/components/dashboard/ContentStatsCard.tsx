import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Image, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { MediaItem } from '@/types/api/media';
import { useAppSelection } from '../../hooks/useAppSelection';
import { queryKeys } from '../../utils/queryKeys';
import styles from './DashboardSummaries.module.css';

export const ContentStatsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;

  const mediaFilters = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const p: Record<string, string> = { created_at__gte: weekAgo };
    if (projectId) p.project = projectId;
    return p;
  }, [projectId]);

  const { data: mediaData } = useQuery({
    queryKey: queryKeys.media.items(mediaFilters),
    queryFn: () => api.list<MediaItem>('/media/items/', { params: mediaFilters, pageSize: 1 }),
    staleTime: 2 * 60 * 1000,
  });

  const count = mediaData ? (mediaData.count ?? mediaData.results.length) : null;

  return (
    <div
      className={styles.summaryCard}
      onClick={() => navigate('/content')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/content'); } }}
      role="button"
      tabIndex={0}
    >
      <div className={`${styles.cardIcon} ${styles.iconRed}`}>
        <Image size={18} />
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardValue}>{count ?? '—'}</div>
        <div className={styles.cardLabel}>Content (7d)</div>
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </div>
  );
};
