/**
 * useGenerativeRequests — Shared React Query hook for generation requests.
 *
 * Fetches generative requests with optional filters (status, project, etc.).
 * Uses TanStack Query for caching & automatic deduplication across
 * dashboard cards (ContentBreakdown, ContentOverview, MemberProgress, Assets, SmartActions).
 *
 * staleTime: 1 min — request status can change quickly.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { ListResult } from '@/api/clientTypes';
import type { GenerationRequest } from '@/types/api/generative';
import { queryKeys } from '../utils/queryKeys';

async function fetchGenerativeRequests(
  filters?: Record<string, string>,
): Promise<ListResult<GenerationRequest>> {
  return api.list<GenerationRequest>('/generative/requests/', {
    params: filters,
    pageSize: 500,
  });
}

export function useGenerativeRequests(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.generative.requests(filters),
    queryFn: () => fetchGenerativeRequests(filters),
    staleTime: 1 * 60 * 1000, // 1 min — status changes quickly
  });
}
