/**
 * useProjectMembers — Shared React Query hook for project members.
 *
 * Fetches all members for a given organisation + project combination.
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
  orgSlug: string,
  projectSlug: string,
): Promise<ListResult<ProjectMembership>> {
  return api.list<ProjectMembership>(
    `/organisations/${orgSlug}/projects/${projectSlug}/members/`,
    { pageSize: 200 },
  );
}

export function useProjectMembers(orgSlug?: string, projectSlug?: string) {
  return useQuery({
    queryKey: queryKeys.members.byProject(orgSlug ?? '', projectSlug ?? ''),
    queryFn: () => fetchProjectMembers(orgSlug!, projectSlug!),
    enabled: !!orgSlug && !!projectSlug,
    staleTime: 10 * 60 * 1000, // 10 min — semi-static
  });
}
