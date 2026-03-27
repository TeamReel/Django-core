/**
 * ContentCarousel — Horizontal swipe carousel of recent generated content.
 *
 * Shows thumbnails of the latest completed/approved content items.
 * CSS scroll-snap for smooth mobile swiping.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Image, Sparkles } from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { mediaApi } from '../../api/media';
import { queryKeys } from '../../utils/queryKeys';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import type { MediaItem } from '../../types/api';
import styles from './ContentCarousel.module.css';

const MAX_ITEMS = 8;

/** Pick best thumbnail URL for a media item. */
function getThumbnailUrl(item: MediaItem): string | null {
  if (item.thumbnails?.length) {
    const mid = item.thumbnails.find(t => t.size_label === 'medium')
      || item.thumbnails.find(t => t.size_label === 'small')
      || item.thumbnails[0];
    return mid?.url || null;
  }
  return item.file_url ? getAssetUrl(item.file_url) : null;
}

/** Derive a display label from extraction_metadata.asset_type. */
function getTypeLabel(item: MediaItem): string {
  const raw = (item.extraction_metadata?.asset_type as string) || '';
  const labels: Record<string, string> = {
    lineup: 'Lineup',
    lineup_video: 'Lineup video',
    match_flyer: 'Flyer',
    walkon_video: 'Walk-on',
    anthem_video: 'Anthem',
    goal_celebration: 'Goal',
    final_score: 'Uitslag',
    highlight: 'Highlight',
    highlights_reel: 'Highlights',
  };
  return labels[raw.toLowerCase()] || raw.replace(/_/g, ' ') || 'Content';
}

export const ContentCarousel: React.FC = () => {
  const { context } = useContextSwitcher();
  const project = context.project;
  const navigate = useNavigate();

  const { data: items, isLoading } = useQuery({
    queryKey: queryKeys.media.items({ project: project?.id || '' }),
    queryFn: async () => {
      if (!project?.id) return [];
      const res = await mediaApi.listItems(
        { ordering: '-created_at', status: 'completed' },
        { pageSize: MAX_ITEMS, params: { project: project.id } },
      );
      return res.results;
    },
    enabled: !!project?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}><Image size={16} /> Recent content</h3>
        </div>
        <div className={styles.track}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.shimmerSlide} />
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}><Image size={16} /> Recent content</h3>
        </div>
        <div className={styles.emptyState}>
          <Sparkles size={28} className={styles.emptyIcon} />
          <span>Nog geen content — genereer je eerste!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}><Image size={16} /> Recent content</h3>
        <span className={styles.count}>{items.length} items</span>
      </div>
      <div className={styles.track}>
        {items.map(item => {
          const thumbUrl = getThumbnailUrl(item);
          const label = getTypeLabel(item);
          return (
            <button
              key={item.id}
              className={styles.slide}
              onClick={() => navigate(`/media/${item.id}`)}
              aria-label={`${label}: ${item.title || 'Bekijk content'}`}
            >
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={item.title || label}
                  className={styles.thumbImg}
                  loading="lazy"
                />
              ) : (
                <div className={styles.thumbPlaceholder}>
                  <Image size={24} />
                </div>
              )}
              <span className={styles.slideLabel}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
