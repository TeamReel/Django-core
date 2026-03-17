/**
 * useProjectMembers — Shared React Query hook for project members.
 *
 * Fetches all members for a given project by ID.
 * Uses TanStack Query for caching & automatic deduplication across
 * dashboard cards (SquadReadiness, MemberContentProgress, Assets, SmartActions).
 *
 * staleTime: 10 min — member list rarely changes within a session.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { ListResult } from '@/api/clientTypes';
import type { ProjectMembership } from '@/types/api/project';
import { queryKeys } from '../utils/queryKeys';

async function fetchProjectMembers(
  projectId: string,
): Promise<ListResult<ProjectMembership>> {
  return api.list<ProjectMembership>(
    `/projects/${encodeURIComponent(projectId)}/members/`,
    { pageSize: 200 },
  );
}

export function useProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.members.byProject(projectId ?? ''),
    queryFn: () => fetchProjectMembers(projectId!),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 min — semi-static
  });
}
