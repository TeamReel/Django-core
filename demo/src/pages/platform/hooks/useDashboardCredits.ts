import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/utils/queryKeys';
import type { DashboardCredits, DateRange } from '../platformStatsTypes';

async function fetchCredits(range?: DateRange): Promise<DashboardCredits> {
  const params: Record<string, string> = {};
  if (range) params.range = range;
  return api.get<DashboardCredits>('/dashboard/credits/', { params });
}

export function useDashboardCredits(range?: DateRange) {
  return useQuery({
    queryKey: queryKeys.platformStats.credits(range),
    queryFn: () => fetchCredits(range),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
