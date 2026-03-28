import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

import { api } from '@/api/client';
import type { OverviewMember } from './teamDetailTypes';
import type { OrgMemberItem } from './useTeamTabData.types';

interface UseOverviewMembersParams {
  activeTabFromUrl: string;
  apiBaseUrl: string;
  orgSlugForDirectoryLists: string;
  teamIdForDirectoryLists: string;
}

export interface UseOverviewMembersReturn {
  overviewMembers: OverviewMember[];
  overviewMembersCount: number | null;
  overviewMembersLoading: boolean;
  overviewMembersError: string | null;
}

export function useOverviewMembers({
  activeTabFromUrl,
  apiBaseUrl,
  orgSlugForDirectoryLists,
  teamIdForDirectoryLists,
}: UseOverviewMembersParams): UseOverviewMembersReturn {
  const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
  const [overviewMembersCount, setOverviewMembersCount] = useState<number | null>(null);
  const [overviewMembersLoading, setOverviewMembersLoading] = useState(false);
  const [overviewMembersError, setOverviewMembersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const extractMembersCount = (raw: { meta?: { pagination?: { total?: number } }; data?: { count?: number }; count?: number; [key: string]: unknown }, list: OverviewMember[]): number => {
      const metaTotal = raw?.meta?.pagination?.total;
      if (typeof metaTotal === 'number') return metaTotal;
      const dataCount = raw?.data?.count ?? raw?.count;
      if (typeof dataCount === 'number') return dataCount;
      return Array.isArray(list) ? list.length : 0;
    };

    const loadOverviewMembers = async () => {
      if (activeTabFromUrl !== 'overview') return;
      const orgSlug = String(orgSlugForDirectoryLists || '').trim();
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!orgSlug || !teamId) return;

      setOverviewMembersLoading(true);
      setOverviewMembersError(null);

      try {
        const { results: rawList, count } = await api.list<OrgMemberItem>(
          `/organisations/${encodeURIComponent(orgSlug)}/members/`,
          {
            params: {
              include_project_memberships: 'true',
              include_project_membership_details: 'true',
            },
            pageSize: 250,
          },
        );
        const json = { results: rawList, count };

        const list: OrgMemberItem[] = Array.isArray(rawList) ? rawList : [];

        const isMemberInTeam = (item: OrgMemberItem): boolean => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const memberships = item?.project_memberships || u?.project_memberships || [];
          if (!Array.isArray(memberships) || memberships.length === 0) return false;
          return memberships.some((m) => String(m?.project_id ?? m?.project?.id ?? '') === String(teamId));
        };

        const normalized: OverviewMember[] = list
          .filter(isMemberInTeam)
          .map((item: OrgMemberItem) => {
            const nestedUser = item?.user;
            const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
            return {
              id: String(u?.id ?? item?.id ?? '').trim(),
              email: u?.email as string | undefined,
              first_name: u?.first_name as string | undefined,
              last_name: u?.last_name as string | undefined,
            };
          })
          .filter((u) => Boolean(u.id));

        const sorted = [...normalized].sort((a, b) => {
          const an = `${a?.last_name || ''} ${a?.first_name || ''} ${a?.email || ''}`.trim();
          const bn = `${b?.last_name || ''} ${b?.first_name || ''} ${b?.email || ''}`.trim();
          return an.localeCompare(bn);
        });

        if (cancelled) return;
        setOverviewMembers(sorted.slice(0, 6));
        // Use normalized.length (team-filtered count) instead of raw API count
        // which returns the org-level total (e.g. 2116 instead of 28)
        setOverviewMembersCount(normalized.length);
      } catch (e) {
        logger.error('Failed to load members', e);
        if (cancelled) return;
        setOverviewMembers([]);
        setOverviewMembersCount(null);
        setOverviewMembersError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        if (!cancelled) setOverviewMembersLoading(false);
      }
    };

    void loadOverviewMembers();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, orgSlugForDirectoryLists, teamIdForDirectoryLists]);

  return {
    overviewMembers,
    overviewMembersCount,
    overviewMembersLoading,
    overviewMembersError,
  };
}
