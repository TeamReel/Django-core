/**
 * useClosestMatch — Fetch the match closest to now for a given project.
 *
 * First TanStack Query–powered hook (D4 proof of concept).
 * Fetches recent past + near future matches, picks the one whose
 * start_time is closest to Date.now().
 *
 * Also resolves lineup count (from metadata or participations API)
 * and content count (from media items API) in the same query.
 *
 * @example
 * ```ts
 * const { data, isLoading } = useClosestMatch(project?.id);
 * // data?.match, data?.lineupCount, data?.contentCount
 * ```
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { Match } from '../components/dashboard/ActiveMatchCard';
import { getActiveContext } from '../utils/activeContext';
import { queryKeys } from '../utils/queryKeys';

interface LineupMetadata {
  formation?: string;
  goalkeeper?: unknown[];
  player?: unknown[];
  positions?: unknown[];
}

export interface ClosestMatchData {
  match: Match | null;
  contentCount: number;
  lineupCount: number;
  lineupFormation?: string;
  /** Content subtypes that already have media (e.g. 'flyer', 'lineup', 'goal') */
  contentDoneSubtypes: string[];
}

async function fetchClosestMatch(projectId?: string): Promise<ClosestMatchData> {
  const now = new Date().toISOString();
  const baseParams: Record<string, string> = { activity_type: 'match' };
  if (projectId) baseParams.project = projectId;

  // Fetch both recent past and near future matches in parallel
  const [pastData, futureData] = await Promise.all([
    api.list<Match>('/activities/', {
      params: { ...baseParams, start_time__lte: now, ordering: '-start_time' },
      pageSize: 3,
    }),
    api.list<Match>('/activities/', {
      params: { ...baseParams, start_time__gte: now, ordering: 'start_time' },
      pageSize: 3,
    }),
  ]);

  const all = [...pastData.results, ...futureData.results];
  if (all.length === 0) return { match: null, contentCount: 0, lineupCount: 0, contentDoneSubtypes: [] };

  // ── Match selection priority ──────────────────────────
  // 1. Explicitly active match (set via setActiveContext)
  // 2. Next upcoming match (forward-looking dashboard)
  // 3. Most recent past match (fallback)
  let closest: Match;

  // Check if user has an explicitly active match
  let activeMatchId: string | undefined;
  try {
    const ctx = await getActiveContext();
    activeMatchId = ctx?.match?.id ?? undefined;
  } catch {
    // ignore — active context may not be available
  }

  const activeFromContext = activeMatchId
    ? all.find(m => m.id === activeMatchId)
    : undefined;

  if (activeFromContext) {
    closest = activeFromContext;
  } else if (futureData.results.length > 0) {
    // Prefer next upcoming match
    closest = futureData.results[0];
  } else {
    // Fallback: most recent past match
    closest = pastData.results[0];
  }

  let lineupCount = 0;
  let lineupFormation: string | undefined;
  let contentCount = 0;
  let contentDoneSubtypes: string[] = [];

  // Lineup from metadata (saved as { formation, goalkeeper: [], player: [] })
  const lineupData = (closest.metadata?.lineup as LineupMetadata | undefined);
  const gkCount = Array.isArray(lineupData?.goalkeeper) ? lineupData.goalkeeper.length : 0;
  const plCount = Array.isArray(lineupData?.player) ? lineupData.player.length : 0;
  const metaLineupCount = gkCount + plCount;
  // Also check legacy positions array format
  const positionsCount = Array.isArray(lineupData?.positions) ? lineupData.positions.length : 0;
  if (metaLineupCount > 0) {
    lineupCount = metaLineupCount;
    lineupFormation = lineupData?.formation || (closest.metadata?.formation as string | undefined);
  } else if (positionsCount > 0) {
    lineupCount = positionsCount;
    lineupFormation = lineupData?.formation;
  } else {
    // Fallback: fetch participations count
    try {
      const partData = await api.list<{ id: string }>('/participations/', {
        params: { activity_id: closest.id },
        pageSize: 1,
      });
      lineupCount = partData.count ?? partData.results.length;
    } catch {
      // ignore
    }
  }

  try {
    const mediaData = await api.list<{ id: string; extraction_metadata?: { asset_type?: string } }>('/media/items/', {
      params: { activity: closest.id },
      pageSize: 50,
    });
    contentCount = mediaData.count ?? mediaData.results.length;
    // Collect unique subtypes that have media (for per-phase progress)
    const subtypeSet = new Set<string>();
    for (const item of mediaData.results) {
      const raw = item.extraction_metadata?.asset_type;
      if (raw) {
        let normalized = String(raw).replace(/_[a-f0-9]{8}$/i, '');
        if (normalized === 'goal_celebration') normalized = 'goal';
        if (normalized === 'match_flyer') normalized = 'flyer';
        subtypeSet.add(normalized);
      }
    }
    contentDoneSubtypes = [...subtypeSet];
  } catch {
    // Media items endpoint may fail — ignore
  }

  return { match: closest, contentCount, lineupCount, lineupFormation, contentDoneSubtypes };
}

/**
 * Returns the closest match to now, with lineup and content counts.
 * Uses TanStack Query for caching and deduplication.
 *
 * staleTime is shorter (2 min) than the global default because
 * match-day data should refresh more frequently.
 */
export function useClosestMatch(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.activities.closest(projectId || '__none__'),
    queryFn: () => fetchClosestMatch(projectId),
    staleTime: 2 * 60 * 1000, // 2 min for real-time match data
  });
}
