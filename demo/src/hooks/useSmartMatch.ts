/**
 * useSmartMatch — Fetches upcoming matches and partitions them into
 * "highlighted" (< 48h) and "rest" groups for the Smart Match step.
 *
 * Uses the existing useActivities hook filtered to match type.
 * Sorts highlighted by soonest first, rest by upcoming first.
 */
import { useMemo } from 'react';
import { useActivities, type Activity } from './useActivities';

const HOURS_48 = 48 * 60 * 60 * 1000;

export interface SmartMatchResult {
  /** Matches within next 48 hours (sorted: soonest first) */
  highlighted: Activity[];
  /** All other upcoming matches (sorted: soonest first) */
  upcoming: Activity[];
  /** Past matches (sorted: most recent first) — for fallback */
  recent: Activity[];
  /** All matches combined */
  all: Activity[];
  /** Loading state */
  loading: boolean;
  /** Error message, if any */
  error: string | null;
}

export function useSmartMatch(teamProjectId?: string): SmartMatchResult {
  const { activities, loading, error } = useActivities({
    limit: 50,
    project_id: teamProjectId || undefined,
  });

  return useMemo(() => {
    const now = Date.now();
    const cutoff = now + HOURS_48;

    const matches = activities.filter(
      (a) => a.activity_type?.toLowerCase().includes('match'),
    );

    const highlighted: Activity[] = [];
    const upcoming: Activity[] = [];
    const recent: Activity[] = [];

    for (const m of matches) {
      const t = new Date(m.start_time).getTime();
      if (t < now) {
        recent.push(m);
      } else if (t <= cutoff) {
        highlighted.push(m);
      } else {
        upcoming.push(m);
      }
    }

    // Sort highlighted: soonest first
    highlighted.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    // Sort upcoming: soonest first
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    // Sort recent: most recent first
    recent.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return {
      highlighted,
      upcoming,
      recent,
      all: [...highlighted, ...upcoming, ...recent],
      loading,
      error: error ? 'Kon wedstrijden niet laden.' : null,
    };
  }, [activities, loading, error]);
}
