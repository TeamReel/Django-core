import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/utils/queryKeys';
import type { DashboardPipelines, DateRange } from '../platformStatsTypes';

async function fetchPipelines(range?: DateRange): Promise<DashboardPipelines> {
  const params: Record<string, string> = {};
  if (range) params.range = range;
  return api.get<DashboardPipelines>('/dashboard/pipelines/', { params });
}

export function useDashboardPipelines(range?: DateRange) {
  return useQuery({
    queryKey: queryKeys.platformStats.pipelines(range),
    queryFn: () => fetchPipelines(range),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
