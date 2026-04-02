/**
 * useSquadReadiness — React Query hook for per-member asset readiness.
 *
 * Fetches squad readiness data for a project, showing which members
 * have the required assets (fullbody, closeup, intro) for video generation.
 */
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/api';
import type { SquadReadinessResponse } from '@/types/api';
import { queryKeys } from '../utils/queryKeys';

export function useSquadReadiness(projectId?: string, kitType?: string) {
  return useQuery({
    queryKey: queryKeys.members.squadReadiness(projectId ?? '', kitType),
    queryFn: () => projectsApi.squadReadiness(projectId!, kitType),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
