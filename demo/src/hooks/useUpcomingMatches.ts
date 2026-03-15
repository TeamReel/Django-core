/**
 * useUpcomingMatches — Fetch upcoming matches for a project.
 *
 * Returns the next N matches (default 5) sorted by start_time ascending,
 * filtered to activity_type=match with start_time in the future.
 *
 * Uses TanStack Query with 5min staleTime for caching.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { Match } from '../components/dashboard/ActiveMatchCard';
import { queryKeys } from '../utils/queryKeys';

export interface UpcomingMatchData {
  matches: Match[];
  total: number;
}

async function fetchUpcomingMatches(
  projectId?: string,
  limit = 5,
): Promise<UpcomingMatchData> {
  const now = new Date().toISOString();
  const params: Record<string, string> = {
    activity_type: 'match',
    start_time__gte: now,
    ordering: 'start_time',
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
 * Returns upcoming matches for a project.
 * Uses TanStack Query for caching and deduplication.
 */
export function useUpcomingMatches(projectId?: string, limit = 5) {
  return useQuery({
    queryKey: queryKeys.activities.upcoming({
      project: projectId || '__none__',
      limit: String(limit),
    }),
    queryFn: () => fetchUpcomingMatches(projectId, limit),
    staleTime: 5 * 60 * 1000, // 5 min — less urgent than active match
  });
}
