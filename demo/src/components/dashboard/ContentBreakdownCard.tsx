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
import { getApiBaseUrl } from '../../utils/apiBase';
import styles from './ContentBreakdownCard.module.css';

function extractItems<T = any>(json: any): T[] {
  if (Array.isArray(json)) return json;
  if (json?.data && Array.isArray(json.data)) return json.data;
  if (json?.results && Array.isArray(json.results)) return json.results;
  return [];
}

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
  const apiBaseUrl = getApiBaseUrl();
  const project = context.project as any;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const projectParam = project ? `&project=${project.id}` : '';

        // Fetch generation requests grouped by template type
        // We'll use the existing API and count by template type
        const res = await fetch(
          `${apiBaseUrl}/api/v1/generative/requests/?status=completed${projectParam}&page_size=200&ordering=-created_at`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
        );

        if (res.ok) {
          const data = await res.json();
          const items = extractItems<any>(data);

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
              cats.push({ label: 'Spelers', icon: <User size={14} />, count: memberCount, color: '#6366f1' });
              cats.push({ label: 'Wedstrijd', icon: <Trophy size={14} />, count: matchCount, color: '#ec4899' });
              cats.push({ label: 'Seizoen', icon: <Calendar size={14} />, count: seasonCount, color: '#f59e0b' });
              if (otherCount > 0) {
                cats.push({ label: 'Overig', icon: <BarChart3 size={14} />, count: otherCount, color: '#22c55e' });
              }
            }
            setCategories(cats);
          }
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBaseUrl, project?.id]);

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
