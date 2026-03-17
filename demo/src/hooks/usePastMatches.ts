/**
 * usePastMatches — Fetch recent past matches for a project.
 *
 * Returns the last N matches (default 5) sorted by start_time descending,
 * filtered to activity_type=match with start_time in the past.
 *
 * Uses TanStack Query with 5min staleTime for caching.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { Match } from '../components/dashboard/ActiveMatchCard';
import { queryKeys } from '../utils/queryKeys';

export interface PastMatchData {
  matches: Match[];
  total: number;
}

async function fetchPastMatches(
  projectId?: string,
  limit = 5,
): Promise<PastMatchData> {
  const now = new Date().toISOString();
  const params: Record<string, string> = {
    activity_type: 'match',
    start_time__lte: now,
    ordering: '-start_time',
  };
  if (projectId) params.project = projectId;

  const data = await api.list<Match>('/activities/', {
    params,
    pageSize: limit,
  });

  return {
    matches: data.results,
    total: data.count ?? data.results.length,
  };
}

/**
 * Returns recent past matches for a project.
 * Uses TanStack Query for caching and deduplication.
 */
export function usePastMatches(projectId?: string, limit = 5) {
  return useQuery({
    queryKey: queryKeys.activities.past({
      project: projectId || '__none__',
      limit: String(limit),
    }),
    queryFn: () => fetchPastMatches(projectId, limit),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
