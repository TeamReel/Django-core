import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/utils/queryKeys';
import type { DataExplorerStats } from '../platformStatsTypes';

async function fetchExplorer(): Promise<DataExplorerStats> {
  return api.get<DataExplorerStats>('/dashboard/explorer/');
}

export function useDashboardExplorer() {
  return useQuery({
    queryKey: queryKeys.platformStats.explorer(),
    queryFn: fetchExplorer,
    refetchInterval: 60_000,
    staleTime: 50_000,
  });
}
