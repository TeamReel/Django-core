/**
 * useMatchListReadiness — Batch-fetch content readiness for a list of matches.
 *
 * Makes a single API call to `/media/items/?activity__in=id1,id2,...`
 * and returns a Map<matchId, MatchReadinessResult> with accurate
 * readiness percentages for each match.
 *
 * Used by MatchesCard to show real readiness in the match list rows.
 */
import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '@/api';
import { calculateMatchReadiness, type MatchReadinessResult } from '../utils/matchReadiness';
import { queryKeys } from '../utils/queryKeys';
import type { Match } from '../components/dashboard/ActiveMatchCard';

/** Asset type normalization — matches useClosestMatch + useMatchSheet logic */
function normalizeAssetType(raw: string): string {
  let normalized = raw.replace(/_[a-f0-9]{8}$/i, '');
  if (normalized === 'goal_celebration') normalized = 'goal';
  if (normalized === 'match_flyer') normalized = 'flyer';
  return normalized;
}

export type ReadinessMap = Map<string, MatchReadinessResult>;

async function fetchBatchReadiness(matches: Match[]): Promise<ReadinessMap> {
  const ids = matches.map(m => m.id);
  if (ids.length === 0) return new Map();

  const mediaData = await mediaApi.listItems(
    { activityIds: ids, pageSize: 200 },
  );

  // Group media items by activity_id → collect unique normalized subtypes
  const subtypesByMatch = new Map<string, Set<string>>();
  for (const id of ids) {
    subtypesByMatch.set(id, new Set());
  }

  for (const item of mediaData.results) {
    const activityId = item.activity_id;
    const raw = item.extraction_metadata?.asset_type;
    if (activityId && raw) {
      subtypesByMatch.get(activityId)?.add(normalizeAssetType(String(raw)));
    }
  }

  // Calculate readiness per match
  const result: ReadinessMap = new Map();
  for (const match of matches) {
    const subtypes = subtypesByMatch.get(match.id);
    const doneSubtypes = subtypes ? [...subtypes] : [];
    result.set(match.id, calculateMatchReadiness(doneSubtypes, match));
  }

  return result;
}

/**
 * Returns accurate readiness for all given matches in a single batch API call.
 * Cache key includes all match IDs so re-fetches when the list changes.
 */
export function useMatchListReadiness(matches: Match[]) {
  const matchIds = matches.map(m => m.id);

  return useQuery({
    queryKey: queryKeys.media.batchReadiness(matchIds),
    queryFn: () => fetchBatchReadiness(matches),
    enabled: matchIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 min — same as closest match
  });
}
