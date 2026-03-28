/**
 * useClubOrgDetailData/effects.ts
 * Data loading effects for ClubOrgDetail.
 */

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { getAssetUrl } from '@/hooks/brandProfileConstants';
import { getActiveContext } from '@/utils/activeContext';
import { isSeasonPeriod } from '../orgDetailUtils';
import type { BrandProfile, BrandProfileDetail } from '@/types/api/branding';
import {
  getTeamParentId, mergeUniqueById,
  type Organisation, type Project, type Period, type OverviewMember,
} from '../clubOrgDetailHelpers';
import type { RawMemberApiItem } from './types';
import { routes } from '@/routes';

interface UseClubOrgEffectsParams {
  orgSlugOrId: string;
  clubSlugOrId: string;
  effectiveOrgSlug: string;
  activeTabFromUrl: string;
  orgSlugForDirectoryLists: string;
  clubIdForDirectoryLists: string;
  org: Organisation | null;
  club: Project | null;
  resolvedOrgSlug: string;
  shouldResolveOrg: boolean;
  shouldResolveClub: boolean;
  locationSearch: string;
  refreshKey: number;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  // Setters
  setActiveContextState: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  setResolvedOrgSlug: Dispatch<SetStateAction<string>>;
  setOrg: Dispatch<SetStateAction<Organisation | null>>;
  setClub: Dispatch<SetStateAction<Project | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setOverviewLoading: Dispatch<SetStateAction<boolean>>;
  setOverviewError: Dispatch<SetStateAction<string | null>>;
  setOverviewTeams: Dispatch<SetStateAction<Project[]>>;
  setOverviewSeasons: Dispatch<SetStateAction<Period[]>>;
  setOverviewMembers: Dispatch<SetStateAction<OverviewMember[]>>;
  setOverviewCounts: Dispatch<SetStateAction<{ teams: number; seasons: number; members: number } | null>>;
  setBrandLogoUrl: Dispatch<SetStateAction<string | null>>;
  setBrandProfileId: Dispatch<SetStateAction<string | null>>;
  setOrgClubsForSwitcher: Dispatch<SetStateAction<Project[]>>;
  setOrgClubsForSwitcherLoading: Dispatch<SetStateAction<boolean>>;
}

export function useClubOrgEffects({
  orgSlugOrId,
  clubSlugOrId,
  effectiveOrgSlug,
  activeTabFromUrl,
  orgSlugForDirectoryLists,
  clubIdForDirectoryLists,
  org,
  club,
  resolvedOrgSlug,
  shouldResolveOrg,
  shouldResolveClub,
  locationSearch,
  refreshKey,
  navigate,
  setActiveContextState,
  setResolvedOrgSlug,
  setOrg,
  setClub,
  setLoading,
  setError,
  setOverviewLoading,
  setOverviewError,
  setOverviewTeams,
  setOverviewSeasons,
  setOverviewMembers,
  setOverviewCounts,
  setBrandLogoUrl,
  setBrandProfileId,
  setOrgClubsForSwitcher,
  setOrgClubsForSwitcherLoading,
}: UseClubOrgEffectsParams) {
  // Load active context
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (error) { logger.debug('Failed to load active context', error); }
    };
    void run();
    return () => { cancelled = true; };
  }, [setActiveContextState]);

  // Load org + club
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!orgSlugOrId || !clubSlugOrId) throw new Error('Missing organisation or club identifier.');
        if (!effectiveOrgSlug) {
          const { results: list } = await api.list<{ id?: string; slug?: string }>('/organisations/', { pageSize: 250 });
          const match = list.find((o) => String(o?.id || '') === String(orgSlugOrId));
          const slug = String(match?.slug || '').trim();
          if (!slug) throw new Error('Organisation not found');
          if (cancelled) return;
          setResolvedOrgSlug(slug);
          return;
        }
        const [loadedOrg, loadedClub] = await Promise.all([
          api.get<Organisation>(`/organisations/${encodeURIComponent(effectiveOrgSlug)}/`),
          api.get<Project>(`/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/`),
        ]);
        if (cancelled) return;
        setOrg(loadedOrg);
        setClub(loadedClub);
      } catch (e) {
        logger.error('Failed to load club', e);
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load club');
        setOrg(null);
        setClub(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [orgSlugOrId, clubSlugOrId, effectiveOrgSlug, refreshKey, setResolvedOrgSlug, setOrg, setClub, setLoading, setError]);

  // Overview tab data
  useEffect(() => {
    let cancelled = false;
    const loadOverview = async () => {
      if (activeTabFromUrl !== 'overview') return;
      const orgSlug = String(orgSlugForDirectoryLists || '').trim();
      const clubId = String(clubIdForDirectoryLists || '').trim();
      if (!orgSlug || !clubId) return;
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        const { results: teamsList } = await api.list<Project>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
          pageSize: 2000,
          params: { include_archived: 'true', parent_project__isnull: 'false' },
        });
        const clubTeams: Project[] = (teamsList || [])
          .filter((t: { id?: string; name?: string; organisation?: Record<string, unknown>; organisation_id?: string; slug?: string }) => String(getTeamParentId(t) || '') === String(clubId))
          .map((t: { id?: string; name?: string; organisation?: Record<string, unknown>; organisation_id?: string; slug?: string }) => ({ id: String(t?.id || '').trim(), name: String(t?.name || 'Team'), slug: t?.slug ? String(t.slug) : undefined, organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined, organisation: t?.organisation }))
          .filter((t: Project) => Boolean(t.id));

        const teamIds = clubTeams.map((t) => String(t.id)).filter(Boolean);
        let mergedSeasons: Period[] = [];
        if (teamIds.length > 0) {
          const chunkSize = 50;
          const chunks: string[][] = [];
          for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));
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

        const { results: membersList } = await api.list<RawMemberApiItem>(`/organisations/${encodeURIComponent(orgSlug)}/members/`, {
          pageSize: 250,
          params: { include_project_memberships: 'true', include_project_membership_details: 'true' },
        });
        const isMemberInClub = (item: RawMemberApiItem): boolean => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const memberships = item?.project_memberships || u?.project_memberships || [];
          if (!Array.isArray(memberships) || memberships.length === 0) return false;
          return memberships.some((m) => {
            const pid = String(m?.project_id ?? m?.project?.id ?? '');
            const parentId = String(m?.project?.parent_id ?? m?.project?.parent_project_id ?? '');
            return pid === String(clubId) || parentId === String(clubId);
          });
        };
        const normalizedMembers: OverviewMember[] = membersList.filter(isMemberInClub).map((item) => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          return { id: String(u?.id ?? item?.id ?? '').trim(), email: u?.email, first_name: u?.first_name, last_name: u?.last_name };
        }).filter((u) => Boolean(u.id));

        if (cancelled) return;
        const sortedTeams = [...clubTeams].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        const sortedSeasons = [...(mergedSeasons as Period[])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        const sortedMembers = [...normalizedMembers].sort((a, b) => {
          const an = `${a?.last_name || ''} ${a?.first_name || ''} ${a?.email || ''}`.trim();
          const bn = `${b?.last_name || ''} ${b?.first_name || ''} ${b?.email || ''}`.trim();
          return an.localeCompare(bn);
        });
        setOverviewTeams(sortedTeams.slice(0, 6));
        setOverviewSeasons(sortedSeasons.slice(0, 6));
        setOverviewMembers(sortedMembers.slice(0, 6));
        setOverviewCounts({ teams: clubTeams.length, seasons: sortedSeasons.length, members: sortedMembers.length });
      } catch (e) {
        logger.error('Overview load error', e);
        if (cancelled) return;
        setOverviewError(e instanceof Error ? e.message : 'Failed to load overview');
        setOverviewTeams([]); setOverviewSeasons([]); setOverviewMembers([]); setOverviewCounts(null);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };
    void loadOverview();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, clubIdForDirectoryLists, orgSlugForDirectoryLists, setOverviewLoading, setOverviewError, setOverviewTeams, setOverviewSeasons, setOverviewMembers, setOverviewCounts]);

  // Brand profile + logo
  useEffect(() => {
    let cancelled = false;
    const loadBrandLogo = async () => {
      if (activeTabFromUrl !== 'identity' && activeTabFromUrl !== 'kits') return;
      const pid = club?.id;
      if (!pid) return;
      try {
        const { results: profileList } = await api.list<BrandProfile>('/branding/profiles/', { params: { project: String(pid) } });
        let profileId: string | null = profileList.length > 0 ? String(profileList[0]?.id || '') : null;
        if (!profileId) return;
        if (!cancelled) setBrandProfileId(profileId);
        const profile = await api.get<BrandProfileDetail>(`/branding/profiles/${profileId}/`);
        const assetList = profile?.assets || [];
        const logoAsset = assetList.find((a) => a.asset_type === 'logo' || String(a.asset_type || '').includes('logo'));
        if (logoAsset?.url && !cancelled) {
          const url = logoAsset.url;
          setBrandLogoUrl(getAssetUrl(url)!);
        }
      } catch (e) { logger.debug('Failed to load brand logo', e); }
    };
    void loadBrandLogo();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, club, setBrandLogoUrl, setBrandProfileId]);

  // Load org clubs for switcher
  useEffect(() => {
    let cancelled = false;
    const loadOrgClubs = async () => {
      const orgSlug = String(orgSlugForDirectoryLists || effectiveOrgSlug || '').trim();
      if (!orgSlug) return;
      setOrgClubsForSwitcherLoading(true);
      try {
        const { results: list } = await api.list<{ id?: string; name?: string; slug?: string }>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
          pageSize: 500,
          params: { include_archived: 'true', parent_project__isnull: 'true' },
        });
        const normalized = mergeUniqueById(
          (list || []).map((p) => ({ id: String(p?.id || '').trim(), name: String(p?.name || 'Club'), slug: p?.slug ? String(p.slug) : undefined })).filter((p) => Boolean(p.id)),
        );
        if (cancelled) return;
        setOrgClubsForSwitcher(normalized);
      } catch { if (cancelled) return; setOrgClubsForSwitcher([]); }
      finally { if (!cancelled) setOrgClubsForSwitcherLoading(false); }
    };
    void loadOrgClubs();
    return () => { cancelled = true; };
  }, [effectiveOrgSlug, orgSlugForDirectoryLists, setOrgClubsForSwitcher, setOrgClubsForSwitcherLoading]);

  // Resolve org UUID -> slug URL
  useEffect(() => {
    if (!shouldResolveOrg) return;
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    if (!slug || slug === orgSlugOrId) return;
    const clubKey = String(club?.slug || clubSlugOrId || '').trim();
    if (!clubKey) return;
    navigate(`${routes.club({ orgId: slug, clubId: clubKey })}${locationSearch || ''}`, { replace: true });
  }, [club, clubSlugOrId, locationSearch, navigate, org?.slug, orgSlugOrId, resolvedOrgSlug, shouldResolveOrg]);

  // Resolve club UUID -> slug URL
  useEffect(() => {
    if (!org || !club) return;
    if (!shouldResolveClub) return;
    const slug = String(club?.slug || '').trim();
    if (!slug || slug === clubSlugOrId) return;
    navigate(`${routes.club({ orgId: String(org?.slug || orgSlugOrId), clubId: slug })}${locationSearch || ''}`, { replace: true });
  }, [club, clubSlugOrId, locationSearch, navigate, org, orgSlugOrId, shouldResolveClub]);
}
