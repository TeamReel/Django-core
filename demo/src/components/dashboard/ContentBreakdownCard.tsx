/**
 * ContentBreakdownCard — Content count per content type with progress bars.
 *
 * Shows how much content exists per template type:
 * - Member content (profile photos, in-tenue, etc.)
 * - Match content (flyers, lineups, scores)
 * - Season content (transformations, recaps)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { BarChart3, ChevronRight, User, Trophy, Calendar } from 'lucide-react';
import { api } from '@/api';
import styles from './ContentBreakdownCard.module.css';

interface CategoryCount {
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

export const ContentBreakdownCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const project = context.project;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params: Record<string, string> = {
          status: 'completed',
          ordering: '-created_at',
        };
        if (project) params.project = project.id;

        const { results: items } = await api.list<{ template?: { template_type?: string }; template_type?: string }>('/generative/requests/', {
          params,
          pageSize: 200,
        });

          // Count per template type
          const counts: Record<string, number> = {};
          for (const item of items) {
            const tplType = item.template?.template_type || item.template_type || 'custom';
            counts[tplType] = (counts[tplType] || 0) + 1;
          }

          const memberCount = (counts['member'] || 0);
          const matchCount =
            (counts['pre_match'] || 0) +
            (counts['during_match'] || 0) +
            (counts['post_match'] || 0);
          const seasonCount = (counts['season'] || 0);
          const otherCount = (counts['custom'] || 0);

          if (!cancelled) {
            const cats: CategoryCount[] = [];
            if (memberCount > 0 || matchCount > 0 || seasonCount > 0 || otherCount > 0) {
              cats.push({ label: 'Spelers', icon: <User size={14} />, count: memberCount, color: 'var(--color-blue-400)' });
              cats.push({ label: 'Wedstrijd', icon: <Trophy size={14} />, count: matchCount, color: 'var(--color-red-400)' });
              cats.push({ label: 'Seizoen', icon: <Calendar size={14} />, count: seasonCount, color: 'var(--color-amber-400)' });
              if (otherCount > 0) {
                cats.push({ label: 'Overig', icon: <BarChart3 size={14} />, count: otherCount, color: 'var(--color-green-400)' });
              }
            }
            setCategories(cats);
          }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [project?.id]);

  const maxCount = Math.max(1, ...categories.map(c => c.count));
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  if (!loading && categories.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <BarChart3 size={16} />
        <span className={styles.title}>Content overzicht</span>
        {totalCount > 0 && (
          <span className={styles.totalBadge}>{totalCount} totaal</span>
        )}
        <button className={styles.seeAll} onClick={() => navigate('/content')}>
          <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className={styles.barList}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.barRow}>
              <div className={styles.barShimmer} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.barList}>
          {categories.map(cat => (
            <div key={cat.label} className={styles.barRow}>
              <div className={styles.barLabel}>
                <span className={styles.barIcon} style={{ color: cat.color }}>{cat.icon}</span>
                <span className={styles.barText}>{cat.label}</span>
                <span className={styles.barCount}>{cat.count}</span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${Math.max(4, (cat.count / maxCount) * 100)}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
