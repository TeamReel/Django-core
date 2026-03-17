/**
 * ContentBreakdownCard — Content count per content type with progress bars.
 *
 * Shows how much content exists per template type:
 * - Member content (profile photos, in-tenue, etc.)
 * - Match content (flyers, lineups, scores)
 * - Season content (transformations, recaps)
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { BarChart3, ChevronRight, User, Trophy, Calendar } from 'lucide-react';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './ContentBreakdownCard.module.css';

interface CategoryCount {
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

export const ContentBreakdownCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const project = context.project;

  const filters = useMemo(() => {
    const p: Record<string, string> = { status: 'completed', ordering: '-created_at' };
    if (project) p.project = project.id;
    return p;
  }, [project?.id]);

  const { data: genData, isLoading: loading } = useGenerativeRequests(filters);

  const categories = useMemo<CategoryCount[]>(() => {
    const items = genData?.results ?? [];
    if (items.length === 0) return [];

    const counts: Record<string, number> = {};
    for (const item of items) {
      const tplType = (item as any).template?.template_type || (item as any).template_type || 'custom';
      counts[tplType] = (counts[tplType] || 0) + 1;
    }

    const memberCount = counts['member'] || 0;
    const matchCount =
      (counts['pre_match'] || 0) +
      (counts['during_match'] || 0) +
      (counts['post_match'] || 0);
    const seasonCount = counts['season'] || 0;
    const otherCount = counts['custom'] || 0;

    const cats: CategoryCount[] = [];
    if (memberCount > 0 || matchCount > 0 || seasonCount > 0 || otherCount > 0) {
      cats.push({ label: 'Spelers', icon: <User size={14} />, count: memberCount, color: 'var(--color-blue-400)' });
      cats.push({ label: 'Wedstrijd', icon: <Trophy size={14} />, count: matchCount, color: 'var(--color-red-400)' });
      cats.push({ label: 'Seizoen', icon: <Calendar size={14} />, count: seasonCount, color: 'var(--color-amber-400)' });
      if (otherCount > 0) {
        cats.push({ label: 'Overig', icon: <BarChart3 size={14} />, count: otherCount, color: 'var(--color-green-400)' });
      }
    }
    return cats;
  }, [genData]);

  const maxCount = Math.max(1, ...categories.map(c => c.count));
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  if (!loading && categories.length === 0) return null;

  return (
    <>
    <div className={styles.card}>
      <div className={styles.header}>
        <BarChart3 size={16} />
        <span className={styles.title}>Content overzicht</span>
        {totalCount > 0 && (
          <span className={styles.totalBadge}>{totalCount} totaal</span>
        )}
        <button className={styles.seeAll} onClick={() => setSheetOpen(true)}>
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

    {/* ── Content Breakdown Sheet ───────────────────────── */}
    <NavigationSheet
      isOpen={sheetOpen}
      onClose={() => setSheetOpen(false)}
      title="Content overzicht"
      icon={<BarChart3 size={18} />}
    >
      {/* Full breakdown bars */}
      {categories.length > 0 && (
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

      {/* Summary */}
      {totalCount > 0 && (
        <div className={styles.summaryBox}>
          <span className={styles.summaryValue}>{totalCount}</span>
          <div className={styles.summaryLabel}>totaal gegenereerde content</div>
        </div>
      )}

      {/* Navigate to full content page */}
      <button
        onClick={() => { setSheetOpen(false); navigate('/content'); }}
        className={styles.sheetNavButton}
      >
        Bekijk alle content <ChevronRight size={14} />
      </button>
    </NavigationSheet>
    </>
  );
};
