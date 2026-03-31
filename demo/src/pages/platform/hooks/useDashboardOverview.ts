import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/utils/queryKeys';
import type { DashboardOverview, DateRange } from '../platformStatsTypes';

async function fetchOverview(range?: DateRange): Promise<DashboardOverview> {
  const params: Record<string, string> = {};
  if (range) params.range = range;
  return api.get<DashboardOverview>('/dashboard/overview/', { params });
}

export function useDashboardOverview(range?: DateRange) {
  return useQuery({
    queryKey: queryKeys.platformStats.overview(range),
    queryFn: () => fetchOverview(range),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
