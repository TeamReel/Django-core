/**
 * GalleryMatchTimeline utilities
 */
import type { ContentItem } from '../contentLibraryTypes';
import type { MatchGroup } from './types';

export function groupContentByMatch(items: ContentItem[]): MatchGroup[] {
  const groups = new Map<string, MatchGroup>();

  for (const item of items) {
    const meta = item.extraction_metadata || {};
    // Resolve activity ID: API returns activity_id (top-level), fallback to extraction_metadata, then legacy item.activity
    const activityId =
      item.activity_id
      || (meta.activity_id as string)
      || (typeof item.activity === 'object' ? item.activity?.id : (item.activity as string))
      || '__other__';

    const activityTitle = (meta.activity_title as string)
      || (typeof item.activity === 'object' ? item.activity?.title : '')
      || '';

    if (!groups.has(activityId)) {
      groups.set(activityId, {
        activityId,
        title: activityTitle || (activityId === '__other__' ? 'Overige content' : `Match ${activityId.slice(0, 8)}`),
        date: (meta.activity_date as string) || item.created_at || '',
        opponent: (meta.opponent as string) || '',
        homeAway: (meta.home_away as string) || '',
        scoreHome: meta.score_home as number | undefined,
        scoreAway: meta.score_away as number | undefined,
        items: [],
      });
    }

    groups.get(activityId)!.items.push(item);
  }

  // Sort groups: most recent first, __other__ at the end
  const sorted = [...groups.values()].sort((a, b) => {
    if (a.activityId === '__other__') return 1;
    if (b.activityId === '__other__') return -1;
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateB - dateA;
  });

  return sorted;
}

export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

export function formatMatchDate(dateStr: string): { day: string; month: string; full: string } {
  if (!dateStr) return { day: '—', month: '', full: '' };
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString('nl-NL', { month: 'short' }).toUpperCase(),
    full: d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}
