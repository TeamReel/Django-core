/**
 * ActivityPage — Full activity timeline page (F17)
 *
 * Shows a cursor-paginated timeline of organisation-wide events from the
 * B62 Activity Feed API. Supports filtering by verb category and project.
 * Accessible only to org admins and coaches.
 */

import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { useSetBackNavigation } from '../providers/BackNavigationProvider';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useUserRole } from '../components/PermissionGuards';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  VERB_LABELS,
  VERB_GROUP_LABELS,
  VERB_CATEGORIES,
  type ActivityLogItem,
  type ActivityLogGroup,
  type ActivityVerbValue,
  type VerbCategory,
} from '@/types/api';
import styles from './ActivityPage.module.css';

/* ------------------------------------------------------------------ */
/*  Filter config                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<VerbCategory | 'all', string> = {
  all: 'Alles',
  content: 'Content',
  member: 'Leden',
  match: 'Wedstrijden',
  season: 'Seizoenen',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getVerbIconChar(verb: string): string {
  const map: Record<string, string> = {
    'content.created': '\u{1F4DD}',
    'content.approved': '\u2705',
    'content.rejected': '\u274C',
    'member.added': '\u{1F464}',
    'member.confirmed': '\u2714\uFE0F',
    'match.created': '\u{1F3C6}',
    'match.lineup_set': '\u{1F465}',
    'season.started': '\u{1F3AC}',
    'lineup.published': '\u{1F4E2}',
  };
  return map[verb] ?? '\u{1F4CB}';
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'zojuist';
  if (min < 60) return `${min} min geleden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} uur geleden`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'gisteren';
  if (days < 7) return `${days} dagen geleden`;
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Vandaag';
  if (date.toDateString() === yesterday.toDateString()) return 'Gisteren';
  return date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Group items by calendar day for timeline sections */
function groupByDay(items: ActivityLogItem[]): Array<{ date: string; items: ActivityLogItem[] }> {
  const map = new Map<string, ActivityLogItem[]>();
  for (const item of items) {
    const key = new Date(item.created_at).toDateString();
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  return Array.from(map.entries()).map(([, dayItems]) => ({
    date: dayItems[0].created_at,
    items: dayItems,
  }));
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function ActivityItem({ item }: { item: ActivityLogItem }) {
  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineIcon} aria-hidden="true">
        {getVerbIconChar(item.verb)}
      </div>
      <div className={styles.timelineContent}>
        <div className={styles.timelineText}>
          <span className={styles.actorName}>
            {item.actor_email?.split('@')[0] ?? 'Systeem'}
          </span>
          {' '}
          <span className={styles.verbText}>
            {VERB_LABELS[item.verb as ActivityVerbValue] ?? item.verb}
          </span>
        </div>
        {item.target_type && (
          <div className={styles.targetBadge}>
            {item.target_type}
          </div>
        )}
        <div className={styles.timelineTime}>
          {formatRelativeTime(item.created_at)}
        </div>
      </div>
    </div>
  );
}

function FilterBar({
  activeCategory,
  onChange,
}: {
  activeCategory: VerbCategory | 'all';
  onChange: (cat: VerbCategory | 'all') => void;
}) {
  return (
    <div className={styles.filterBar} role="toolbar" aria-label="Filter activiteiten">
      {(Object.keys(CATEGORY_LABELS) as Array<VerbCategory | 'all'>).map((cat) => (
        <button
          key={cat}
          className={`${styles.filterBtn} ${activeCategory === cat ? styles.filterBtnActive : ''}`}
          onClick={() => onChange(cat)}
          aria-pressed={activeCategory === cat}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ActivityPage() {
  useSetBackNavigation({ label: 'Dashboard', path: '/dashboard' });

  const { isOrgAdmin, isCoach, isLandAdmin, isSystemAdmin } = useUserRole();
  const { context } = useContextSwitcher();
  const orgId = String(context?.organisation?.id || '').trim();

  const canView = isOrgAdmin || isCoach || isLandAdmin || isSystemAdmin;

  const [category, setCategory] = useState<VerbCategory | 'all'>('all');

  // Map category to verb filter
  const verbFilter = category !== 'all'
    ? VERB_CATEGORIES[category][0] // B62 API filters by single verb — use first in category
    : undefined;

  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useActivityFeed({
    organisationId: orgId,
    filters: verbFilter ? { verb: verbFilter } : undefined,
    enabled: canView && !!orgId,
    pageSize: 20,
  });

  // Role gate: redirect non-admin/coach users
  if (!canView) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filter locally by category (if using multi-verb categories)
  const filteredItems = category !== 'all'
    ? items.filter(item => (VERB_CATEGORIES[category] as readonly string[]).includes(item.verb))
    : items;

  const dayGroups = groupByDay(filteredItems);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Activiteit"
        subtitle="Organisatie-brede timeline van recente events"
      />

      <FilterBar activeCategory={category} onChange={setCategory} />

      <div className={styles.timeline}>
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <p>Kon activiteiten niet laden</p>
            <button onClick={refresh} className={styles.retryBtn}>
              Opnieuw proberen
            </button>
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>{'\u{1F4CA}'}</div>
            <p className={styles.emptyTitle}>Nog geen activiteit</p>
            <p className={styles.emptySubtitle}>
              Zodra er events plaatsvinden in je organisatie verschijnen ze hier.
            </p>
          </div>
        )}

        {!loading && dayGroups.map((group) => (
          <section key={group.date} className={styles.dayGroup}>
            <div className={styles.dayHeader}>
              {formatDateHeader(group.date)}
            </div>
            {group.items.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </section>
        ))}

        {hasMore && !loading && (
          <div className={styles.loadMoreContainer}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className={styles.loadMoreBtn}
            >
              {loadingMore ? 'Laden...' : 'Meer laden'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
