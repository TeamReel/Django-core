/**
 * RecentContentCard — Shows latest generated content with thumbnails.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Image, ChevronRight, Film, FileImage, Clock } from 'lucide-react';
import { api } from '@/api';
import styles from './RecentContentCard.module.css';

interface MediaItem {
  id: string;
  title: string;
  mime_type: string;
  file_url?: string;
  thumbnails?: Array<{ url?: string; size_label?: string }>;
  storage_path?: string;
  created_at: string;
  activity_id?: string;
}

export const RecentContentCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const project = context.project;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params: Record<string, string> = { ordering: '-created_at' };
        if (project) params.project = project.id;
        const { results } = await api.list<MediaItem>('/media/items/', {
          params,
          pageSize: 6,
        });
        if (!cancelled) setItems(results);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [project?.id]);

  const getThumbUrl = (item: MediaItem): string | null => {
    // Try thumbnails array first (smallest first for performance)
    if (item.thumbnails?.length) {
      const thumb = item.thumbnails.find(t => t.size_label === 'small') || item.thumbnails[0];
      if (thumb?.url) return thumb.url;
    }
    // Fallback to file_url for images
    if (item.mime_type?.startsWith('image/') && item.file_url) return item.file_url;
    return null;
  };

  const isVideo = (item: MediaItem) => item.mime_type?.startsWith('video/');

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 3600_000) return `${Math.max(1, Math.round(diff / 60_000))}m geleden`;
    if (diff < 86400_000) return `${Math.round(diff / 3600_000)}u geleden`;
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <Image size={16} />
          <span className={styles.title}>Laatste content</span>
        </div>
        <div className={styles.thumbGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.thumbShimmer} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Image size={16} />
        <span className={styles.title}>Laatste content</span>
        <button className={styles.seeAll} onClick={() => navigate('/content')}>
          Alles <ChevronRight size={12} />
        </button>
      </div>

      <div className={styles.thumbGrid}>
        {items.map(item => {
          const thumbUrl = getThumbUrl(item);
          return (
            <div
              key={item.id}
              className={styles.thumbItem}
              onClick={() => navigate(`/content/${item.id}`)}
            >
              <div className={styles.thumbBox}>
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={item.title}
                    className={styles.thumbImg}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.thumbPlaceholder}>
                    {isVideo(item) ? <Film size={20} /> : <FileImage size={20} />}
                  </div>
                )}
                {isVideo(item) && <span className={styles.videoBadge}><Film size={10} /></span>}
              </div>
              <div className={styles.thumbMeta}>
                <span className={styles.thumbTitle}>{item.title}</span>
                <span className={styles.thumbTime}>
                  <Clock size={10} /> {formatDate(item.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
