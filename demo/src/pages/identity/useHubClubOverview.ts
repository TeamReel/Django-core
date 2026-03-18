/**
 * useHubClubOverview — Lightweight hook that fetches club overview data
 * (teams, seasons, members, counts) for the Hub Club tab.
 *
 * Reuses the same API logic as useClubOrgDetailData/effects.ts but
 * accepts org/club IDs as props instead of reading from useParams().
 * This avoids the full useClubOrgDetailData machinery and prevents
 * duplicate route-parsing.
 */
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { isSeasonPeriod } from './orgDetailUtils';
import {
  type Project,
  type Period,
  type OverviewMember,
  getTeamParentId,
  mergeUniqueById,
} from './clubOrgDetailHelpers';

interface RawMemberApiItem {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user?: RawMemberApiItem;
  project_memberships?: Array<{
    project_id?: string;
    project?: { id?: string; parent_id?: string; parent_project_id?: string };
  }>;
}

export interface HubClubOverviewData {
  overviewLoading: boolean;
  overviewError: string | null;
  overviewTeams: Project[];
  overviewSeasons: Period[];
  overviewMembers: OverviewMember[];
  overviewCounts: { teams: number; seasons: number; members: number } | null;
  refetchOverview: () => void;
}

interface UseHubClubOverviewProps {
  orgSlug: string;
  clubId: string;
  /** Only fetch when this tab is active (lazy loading). */
  active: boolean;
}

export function useHubClubOverview({
  orgSlug,
  clubId,
  active,
}: UseHubClubOverviewProps): HubClubOverviewData {
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewTeams, setOverviewTeams] = useState<Project[]>([]);
  const [overviewSeasons, setOverviewSeasons] = useState<Period[]>([]);
  const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
  const [overviewCounts, setOverviewCounts] = useState<{
    teams: number;
    seasons: number;
    members: number;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetchOverview = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!active) return;
    const org = String(orgSlug || '').trim();
    const club = String(clubId || '').trim();
    if (!org || !club) return;

    let cancelled = false;
    const load = async () => {
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        // Fetch all teams under this org, then filter by parent = club
        const { results: teamsList } = await api.list<Project>(
          `/organisations/${encodeURIComponent(org)}/projects/`,
          {
            pageSize: 2000,
            params: { include_archived: 'true', parent_project__isnull: 'false' },
          },
        );
        const clubTeams: Project[] = (teamsList || [])
          .filter((t) => String(getTeamParentId(t) || '') === club)
          .map((t) => ({
            id: String(t?.id || '').trim(),
            name: String(t?.name || 'Team'),
            slug: t?.slug ? String(t.slug) : undefined,
            organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined,
            organisation: t?.organisation,
          }))
          .filter((t) => Boolean(t.id));

        // Fetch seasons for all team IDs
        const teamIds = clubTeams.map((t) => String(t.id)).filter(Boolean);
        let mergedSeasons: Period[] = [];
        if (teamIds.length > 0) {
          const chunkSize = 50;
          const chunks: string[][] = [];
          for (let i = 0; i < teamIds.length; i += chunkSize) {
            chunks.push(teamIds.slice(i, i + chunkSize));
          }
          const seasonsChunks = await Promise.all(
            chunks.map(async (chunk) => {
              const { results: typedList } = await api.list<Period>('/periods/', {
                pageSize: 500,
                params: { project_id__in: chunk.join(','), type: 'season' },
              });
              if (typedList.length > 0) return typedList;
              const { results: untypedList } = await api.list<Period>('/periods/', {
                pageSize: 500,
                params: { project_id__in: chunk.join(',') },
              });
              return untypedList.filter(isSeasonPeriod);
            }),
          );
          mergedSeasons = mergeUniqueById(seasonsChunks.flat());
        }

        // Fetch members with project memberships
        const { results: membersList } = await api.list<RawMemberApiItem>(
          `/organisations/${encodeURIComponent(org)}/members/`,
          {
            pageSize: 250,
            params: {
              include_project_memberships: 'true',
              include_project_membership_details: 'true',
            },
          },
        );
        const isMemberInClub = (item: RawMemberApiItem): boolean => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const memberships = item?.project_memberships || u?.project_memberships || [];
          if (!Array.isArray(memberships) || memberships.length === 0) return false;
          return memberships.some((m) => {
            const pid = String(m?.project_id ?? m?.project?.id ?? '');
            const parentId = String(
              m?.project?.parent_id ?? m?.project?.parent_project_id ?? '',
            );
            return pid === club || parentId === club;
          });
        };
        const normalizedMembers: OverviewMember[] = membersList
          .filter(isMemberInClub)
          .map((item) => {
            const nestedUser = item?.user;
            const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
            return {
              id: String(u?.id ?? item?.id ?? '').trim(),
              email: u?.email,
              first_name: u?.first_name,
              last_name: u?.last_name,
            };
          })
          .filter((u) => Boolean(u.id));

        if (cancelled) return;

        const sortedTeams = [...clubTeams].sort((a, b) =>
          String(a?.name || '').localeCompare(String(b?.name || '')),
        );
        const sortedSeasons = [...mergedSeasons].sort((a, b) =>
          String(a?.name || '').localeCompare(String(b?.name || '')),
        );
        const sortedMembers = [...normalizedMembers].sort((a, b) => {
          const an = `${a?.last_name || ''} ${a?.first_name || ''} ${a?.email || ''}`.trim();
          const bn = `${b?.last_name || ''} ${b?.first_name || ''} ${b?.email || ''}`.trim();
          return an.localeCompare(bn);
        });

        setOverviewTeams(sortedTeams.slice(0, 6));
        setOverviewSeasons(sortedSeasons.slice(0, 6));
        setOverviewMembers(sortedMembers.slice(0, 6));
        setOverviewCounts({
          teams: clubTeams.length,
          seasons: sortedSeasons.length,
          members: sortedMembers.length,
        });
      } catch (e) {
        logger.error('Hub club overview load error', e);
        if (cancelled) return;
        setOverviewError(e instanceof Error ? e.message : 'Laden mislukt');
        setOverviewTeams([]);
        setOverviewSeasons([]);
        setOverviewMembers([]);
        setOverviewCounts(null);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [active, orgSlug, clubId, refreshKey]);

  return {
    overviewLoading,
    overviewError,
    overviewTeams,
    overviewSeasons,
    overviewMembers,
    overviewCounts,
    refetchOverview,
  };
}
