import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader, type BreadcrumbSwitcherOption } from '@django-core/page-templates';

import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';

import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import TeamCreditsTab from './detail/TeamCreditsTab';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';

type Organisation = {
  id: string;
  name: string;
  slug?: string;
};

type Project = {
  id: string;
  name: string;
  slug?: string;
  organisation_id?: string;
  organisation?: { id?: string; slug?: string };
};

type Period = {
  id: string;
  name: string;
  slug?: string;
  project_id?: string | number;
  project?: { id?: string | number };
  parent_period_id?: string | number | null;
  parent_period?: { id?: string | number } | null;
  type?: string;
  data?: any;
  metadata?: any;
};

type OverviewMember = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

const unwrapEnvelope = <T,>(raw: any): T => (raw?.data ?? raw) as T;

const getCsrfToken = (): string => {
  try {
    return (
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] ||
      ''
    );
  } catch {
    return '';
  }
};

const extractList = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  if (Array.isArray(raw?.data?.results)) return raw.data.results;
  return [];
};

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
  return false;
};

const getTeamParentId = (t: any): string => {
  const parent =
    (t as any)?.parent_id ??
    (t as any)?.parent_project_id ??
    (typeof (t as any)?.parent_project === 'object' ? (t as any)?.parent_project?.id : (t as any)?.parent_project) ??
    (typeof (t as any)?.parent === 'object' ? (t as any)?.parent?.id : (t as any)?.parent);
  return parent != null ? String(typeof parent === 'object' ? parent.id : parent) : '';
};

export default function ClubOrganisationDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

  // API lookup for organisations uses slug (not UUID). If we land on a UUID URL,
  // resolve it via the organisations list (which contains both id + slug).
  const [resolvedOrgSlug, setResolvedOrgSlug] = useState<string>('');
  const effectiveOrgSlug = useMemo(() => {
    const explicit = String(resolvedOrgSlug || '').trim();
    if (explicit) return explicit;
    const raw = String(orgSlugOrId || '').trim();
    return looksLikeIdentifier(raw) ? '' : raw;
  }, [orgSlugOrId, resolvedOrgSlug]);

  const [org, setOrg] = useState<Organisation | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hierarchyTeams, setHierarchyTeams] = useState<Project[]>([]);
  const [hierarchySeasonsByTeamId, setHierarchySeasonsByTeamId] = useState<Record<string, Period[]>>({});
  const [hierarchyCompetitionsCountByTeamId, setHierarchyCompetitionsCountByTeamId] = useState<Record<string, number>>({});
  const [hierarchyMatchesCountByTeamId, setHierarchyMatchesCountByTeamId] = useState<Record<string, number>>({});
  const [hierarchyCompetitionsCountBySeasonId, setHierarchyCompetitionsCountBySeasonId] = useState<Record<string, number>>({});
  const [hierarchyMatchesCountBySeasonId, setHierarchyMatchesCountBySeasonId] = useState<Record<string, number>>({});
  const [hierarchyMembersCountByTeamId, setHierarchyMembersCountByTeamId] = useState<Record<string, number>>({});
  const [hierarchyMembersCountForClub, setHierarchyMembersCountForClub] = useState<number | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);

  const [hierarchySearch, setHierarchySearch] = useState('');

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewTeams, setOverviewTeams] = useState<Project[]>([]);
  const [overviewSeasons, setOverviewSeasons] = useState<Period[]>([]);
  const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
  const [overviewCounts, setOverviewCounts] = useState<{ teams: number; seasons: number; members: number } | null>(null);

  const visibleHierarchyTeams = useMemo(() => {
    const q = String(hierarchySearch || '').trim().toLowerCase();
    if (!q) return hierarchyTeams;
    return (hierarchyTeams || []).filter((t) => String(t?.name || '').toLowerCase().includes(q));
  }, [hierarchyTeams, hierarchySearch]);

  const hierarchyTotals = useMemo(() => {
    const teams = visibleHierarchyTeams || [];
    const teamsCount = teams.length;

    const seasonsCount = teams.reduce((sum, t) => {
      const list = hierarchySeasonsByTeamId[String((t as any)?.id || '')] || [];
      return sum + list.length;
    }, 0);

    const competitionsCount = teams.reduce((sum, t) => {
      return sum + (hierarchyCompetitionsCountByTeamId[String((t as any)?.id || '')] ?? 0);
    }, 0);

    const matchesCount = teams.reduce((sum, t) => {
      return sum + (hierarchyMatchesCountByTeamId[String((t as any)?.id || '')] ?? 0);
    }, 0);

    const membersCountFallback = teams.reduce((sum, t) => {
      return sum + (hierarchyMembersCountByTeamId[String((t as any)?.id || '')] ?? 0);
    }, 0);

    const membersCount = typeof hierarchyMembersCountForClub === 'number' ? hierarchyMembersCountForClub : membersCountFallback;

    return {
      teamsCount,
      seasonsCount,
      competitionsCount,
      matchesCount,
      membersCount,
    };
  }, [
    visibleHierarchyTeams,
    hierarchySeasonsByTeamId,
    hierarchyCompetitionsCountByTeamId,
    hierarchyMatchesCountByTeamId,
    hierarchyMembersCountByTeamId,
    hierarchyMembersCountForClub,
  ]);

  const [orgClubsForSwitcher, setOrgClubsForSwitcher] = useState<Project[]>([]);
  const [orgClubsForSwitcherLoading, setOrgClubsForSwitcherLoading] = useState(false);

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    // Back-compat: older club detail pages used `people`/`users`.
    const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
    const allowed = new Set([
      'overview',
      'hierarchy',
      'teams',
      'seasons',
      'competitions',
      'matches',
      'members',
      'balance',
      'transactions',
    ]);
    return allowed.has(normalized) ? normalized : 'overview';
  }, [location.search]);

  const makeTabHref = (tabId: string): string => {
    const params = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    const normalized = t === 'people' || t === 'users' ? 'members' : t;
    if (!normalized || normalized === 'overview') params.delete('tab');
    else params.set('tab', normalized);
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  // Load active context
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) {
          setActiveContextState(context);
        }
      } catch (error) {
        console.error('Failed to load active context:', error);
      }
    };
    void loadActiveContext();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!orgSlugOrId || !clubSlugOrId) {
          throw new Error('Missing organisation or club identifier.');
        }

        if (!effectiveOrgSlug) {
          // Resolve UUID -> slug.
          const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=250`, { credentials: 'include' });
          if (!res.ok) throw new Error(`Failed to resolve organisation (${res.status})`);
          const json = await res.json().catch(() => null);
          const raw = unwrapEnvelope<any>(json);
          const list: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
          const match = list.find((o: any) => String(o?.id || '') === String(orgSlugOrId));
          const slug = String(match?.slug || '').trim();
          if (!slug) throw new Error('Organisation not found');
          if (cancelled) return;
          setResolvedOrgSlug(slug);
          return;
        }

        const [orgRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/`, {
            credentials: 'include',
          }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' },
          ),
        ]);

        if (!orgRes.ok) throw new Error(`Failed to load organisation (${orgRes.status})`);
        if (!clubRes.ok) throw new Error(`Failed to load club (${clubRes.status})`);

        const orgJson = await orgRes.json().catch(() => null);
        const clubJson = await clubRes.json().catch(() => null);

        const loadedOrg = unwrapEnvelope<Organisation>(orgJson);
        const loadedClub = unwrapEnvelope<Project>(clubJson);

        if (cancelled) return;
        setOrg(loadedOrg);
        setClub(loadedClub);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load club');
        setOrg(null);
        setClub(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, orgSlugOrId, clubSlugOrId, effectiveOrgSlug]);

  const orgIdForDirectoryLists = useMemo(() => {
    const id = String(org?.id || '').trim();
    return id;
  }, [org?.id]);

  // Directory lists (and most API routes) must use org slug.
  const orgSlugForDirectoryLists = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug;
  }, [org?.slug, resolvedOrgSlug]);

  const clubIdForDirectoryLists = useMemo(() => {
    const id = String(club?.id || '').trim();
    return id;
  }, [club?.id]);

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
        // 1) Teams (under this club)
        const teamsRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
          { credentials: 'include' },
        );
        if (!teamsRes.ok) throw new Error(`Failed to load teams (${teamsRes.status})`);
        const teamsJson = await teamsRes.json().catch(() => null);
        const teamsRaw = unwrapEnvelope<any>(teamsJson);
        const teamsList: any[] = Array.isArray(teamsRaw?.results) ? teamsRaw.results : Array.isArray(teamsRaw) ? teamsRaw : [];
        const clubTeams: Project[] = (teamsList || [])
          .filter((t: any) => String(getTeamParentId(t) || '') === String(clubId))
          .map((t: any) => ({
            id: String(t?.id || '').trim(),
            name: String(t?.name || 'Team'),
            slug: t?.slug ? String(t.slug) : undefined,
            organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined,
            organisation: t?.organisation,
          }))
          .filter((t) => Boolean(t.id));

        // 2) Seasons (across those teams)
        const teamIds = clubTeams.map((t) => String(t.id)).filter(Boolean);
        let mergedSeasons: any[] = [];
        if (teamIds.length > 0) {
          const chunkSize = 50;
          const chunks: string[][] = [];
          for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));

          const seasonsChunks = await Promise.all(
            chunks.map(async (chunk) => {
              const params = new URLSearchParams();
              params.set('project_id__in', chunk.join(','));
              params.set('page_size', '500');

              const typed = new URLSearchParams(params);
              typed.set('type', 'season');

              const typedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${typed.toString()}`, { credentials: 'include' });
              if (!typedRes.ok) throw new Error(`Failed to load seasons (${typedRes.status})`);
              const typedJson = await typedRes.json().catch(() => null);
              const typedRaw = unwrapEnvelope<any>(typedJson);
              const typedList: any[] = extractList(typedRaw);
              if (typedList.length > 0) return typedList;

              const untypedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
              if (!untypedRes.ok) throw new Error(`Failed to load seasons (${untypedRes.status})`);
              const untypedJson = await untypedRes.json().catch(() => null);
              const untypedRaw = unwrapEnvelope<any>(untypedJson);
              const untypedList: any[] = extractList(untypedRaw);
              return untypedList.filter(isSeasonPeriod);
            }),
          );

          mergedSeasons = mergeUniqueById(seasonsChunks.flat() as any[]);
        }

        // 3) Members (org members filtered by club/team memberships)
        const memberParams = new URLSearchParams();
        memberParams.set('page_size', '250');
        memberParams.set('include_project_memberships', 'true');
        memberParams.set('include_project_membership_details', 'true');
        const membersRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/?${memberParams.toString()}`,
          { credentials: 'include' },
        );
        if (!membersRes.ok) throw new Error(`Failed to load members (${membersRes.status})`);
        const membersJson = await membersRes.json().catch(() => null);
        const membersRawList =
          membersJson?.data?.data || membersJson?.data?.results || membersJson?.results || membersJson?.data || [];
        const membersList: any[] = Array.isArray(membersRawList) ? membersRawList : [];

        const isMemberInClub = (item: any): boolean => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const memberships = item?.project_memberships || u?.project_memberships || [];
          if (!Array.isArray(memberships) || memberships.length === 0) return false;
          return memberships.some((m: any) => {
            const projectId = String(m?.project_id ?? m?.project?.id ?? '');
            const parentId = String(m?.project?.parent_id ?? m?.project?.parent_project_id ?? '');
            return projectId === String(clubId) || parentId === String(clubId);
          });
        };

        const normalizedMembers: OverviewMember[] = membersList
          .filter(isMemberInClub)
          .map((item: any) => {
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
        if (cancelled) return;
        setOverviewError(e instanceof Error ? e.message : 'Failed to load overview');
        setOverviewTeams([]);
        setOverviewSeasons([]);
        setOverviewMembers([]);
        setOverviewCounts(null);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists, orgSlugForDirectoryLists]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (activeTabFromUrl !== 'hierarchy') return;
      const clubId = String(clubIdForDirectoryLists || '').trim();
      if (!clubId) return;

      try {
        const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(clubId)}/members/?page_size=1`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load club members');
        const json = await res.json().catch(() => null);
        const count = extractCount(json);
        if (!cancelled) setHierarchyMembersCountForClub(count);
      } catch {
        if (!cancelled) setHierarchyMembersCountForClub(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists]);

  const orgKeyForRoutes = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug || String(orgSlugOrId || '').trim();
  }, [org?.slug, orgSlugOrId, resolvedOrgSlug]);
  const clubKeyForRoutes = useMemo(() => String(club?.slug || clubSlugOrId || '').trim(), [club?.slug, clubSlugOrId]);

  const getOrganisationId = (p: any): string => {
    const oid = p?.organisation_id || p?.organisation?.id;
    return oid != null ? String(oid) : '';
  };

  const getParentPeriodId = (p: any): string => {
    const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
    return parentId != null ? String(parentId) : '';
  };

  const getPeriodType = (p: any): string => {
    const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
    return String(t || '').toLowerCase();
  };

  const isSeasonPeriod = (p: any): boolean => {
    // TeamReel hierarchy: Season is a root Period (no parent_period).
    // Do NOT infer by name; rely on parent/type.
    const parentId = getParentPeriodId(p);
    if (parentId) return false;

    const type = getPeriodType(p);
    if (type === 'season') return true;

    // Guard against misconfigured root competitions.
    if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;

    return true;
  };

  const isCompetitionPeriod = (p: any): boolean => {
    const parentId = getParentPeriodId(p);
    if (parentId) return true;
    const type = getPeriodType(p);
    return ['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type);
  };

  const extractCount = (raw: any): number => {
    const envelope = raw?.data ?? raw;
    const countRaw = envelope?.count ?? raw?.count;
    if (typeof countRaw === 'number') return countRaw;
    const list = extractList(envelope);
    return Array.isArray(list) ? list.length : 0;
  };

  const mergeUniqueById = <T extends { id: any }>(items: T[]): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items || []) {
      const key = String((item as any)?.id ?? '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  };

  useEffect(() => {
    let cancelled = false;

    const loadOrgClubs = async () => {
      const orgSlug = String(orgSlugForDirectoryLists || effectiveOrgSlug || '').trim();
      if (!orgSlug) return;
      setOrgClubsForSwitcherLoading(true);

      try {
        const params = new URLSearchParams();
        params.set('page_size', '500');
        params.set('include_archived', 'true');
        params.set('parent_project__isnull', 'true');
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?${params.toString()}`,
          { credentials: 'include' },
        );
        if (!res.ok) throw new Error(`Failed to load clubs (${res.status})`);
        const json = await res.json().catch(() => null);
        const raw = unwrapEnvelope<any>(json);
        const list: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
        const normalized = mergeUniqueById(
          (list || [])
            .map((p: any) => ({
              id: String(p?.id || '').trim(),
              name: String(p?.name || 'Club'),
              slug: p?.slug ? String(p.slug) : undefined,
            }))
            .filter((p: any) => Boolean(p.id)),
        );
        if (cancelled) return;
        setOrgClubsForSwitcher(normalized);
      } catch {
        if (cancelled) return;
        setOrgClubsForSwitcher([]);
      } finally {
        if (!cancelled) setOrgClubsForSwitcherLoading(false);
      }
    };

    void loadOrgClubs();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, effectiveOrgSlug, orgSlugForDirectoryLists]);

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      if (activeTabFromUrl !== 'hierarchy') return;
      if (!orgSlugForDirectoryLists || !clubIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Fetch all teams for this federation and filter to this club.
        // We do this (instead of relying on `parent_project=...`) because the API response shape
        // differs between endpoints and older servers may ignore unknown query params.
        const teamsRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForDirectoryLists)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
          { credentials: 'include' },
        );

        if (!teamsRes.ok) throw new Error(`Failed to load teams (${teamsRes.status})`);
        const teamsJson = await teamsRes.json().catch(() => null);
        const teamsRaw = unwrapEnvelope<any>(teamsJson);
        const teamsList: any[] = Array.isArray(teamsRaw?.results) ? teamsRaw.results : Array.isArray(teamsRaw) ? teamsRaw : [];

        const filteredTeams = teamsList
          .filter((t: any) => {
            const parent =
              (t as any)?.parent_id ??
              (t as any)?.parent_project_id ??
              (typeof (t as any)?.parent_project === 'object' ? (t as any)?.parent_project?.id : (t as any)?.parent_project) ??
              (typeof (t as any)?.parent === 'object' ? (t as any)?.parent?.id : (t as any)?.parent);
            if (parent == null) return false;
            return String(typeof parent === 'object' ? parent.id : parent) === String(clubIdForDirectoryLists);
          })
          .map((t: any) => ({
            id: String(t?.id || '').trim(),
            name: String(t?.name || 'Team'),
            slug: t?.slug ? String(t.slug) : undefined,
            organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined,
            organisation: t?.organisation,
          }))
          .filter((t: any) => Boolean(t.id));

        if (cancelled) return;
        setHierarchyTeams(filteredTeams);

        // 2) Fetch seasons for those teams (batched)
        const teamIds = filteredTeams.map((t: any) => String(t.id)).filter(Boolean);
        if (!teamIds.length) {
          setHierarchySeasonsByTeamId({});
          return;
        }

        const chunkSize = 50;
        const chunks: string[][] = [];
        for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));

        const seasonsChunks = await Promise.all(
          chunks.map(async (chunk) => {
            const params = new URLSearchParams();
            params.set('project_id__in', chunk.join(','));
            params.set('page_size', '500');

            // First try: strict typed seasons.
            const typed = new URLSearchParams(params);
            typed.set('type', 'season');
            const typedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${typed.toString()}`, { credentials: 'include' });
            if (!typedRes.ok) throw new Error(`Failed to load seasons (${typedRes.status})`);
            const typedJson = await typedRes.json().catch(() => null);
            const typedRaw = unwrapEnvelope<any>(typedJson);
            const typedList: any[] = extractList(typedRaw);
            if (typedList.length > 0) return typedList;

            // Fallback: some data stores season type in metadata/data or naming, not in `type`.
            const untypedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
            if (!untypedRes.ok) throw new Error(`Failed to load seasons (${untypedRes.status})`);
            const untypedJson = await untypedRes.json().catch(() => null);
            const untypedRaw = unwrapEnvelope<any>(untypedJson);
            const untypedList: any[] = extractList(untypedRaw);
            return untypedList.filter(isSeasonPeriod);
          }),
        );

        const mergedSeasons = mergeUniqueById(seasonsChunks.flat() as any[]);

        const byTeam: Record<string, Period[]> = {};
        for (const season of mergedSeasons) {
          const pid = season?.project_id ?? season?.project?.id ?? '';
          const teamId = pid != null ? String(pid) : '';
          if (!teamId) continue;
          (byTeam[teamId] ||= []).push(season);
        }

        // Stable sort by name (best-effort)
        for (const key of Object.keys(byTeam)) {
          byTeam[key] = [...byTeam[key]].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        }

        if (cancelled) return;
        setHierarchySeasonsByTeamId(byTeam);

        // 3) Fetch all periods for those teams to compute competitions + matches counts.
        try {
          const periodsChunks = await Promise.all(
            chunks.map(async (chunk) => {
              const params = new URLSearchParams();
              params.set('project_id__in', chunk.join(','));
              params.set('page_size', '250');
              const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
              return await fetchAllPages<any>(url, { credentials: 'include' }, { bypass: true, maxItems: 5000 });
            }),
          );

          const allPeriods: any[] = periodsChunks.flat();

          const childrenMap = new Map<string, any[]>();
          for (const p of allPeriods || []) {
            const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
            if (!parentId) continue;
            const key = String(parentId);
            const arr = childrenMap.get(key) || [];
            arr.push(p);
            childrenMap.set(key, arr);
          }

          const getRecursiveActivitiesCount = (p: any): number => {
            let count = (p?.activities_count ?? 0);
            const children = childrenMap.get(String(p?.id));
            if (children) {
              for (const child of children) {
                count += getRecursiveActivitiesCount(child);
              }
            }
            return count;
          };

          const competitionsCountByTeamId: Record<string, number> = {};
          const matchesCountByTeamId: Record<string, number> = {};

          const competitionsCountBySeasonId: Record<string, number> = {};
          const matchesCountBySeasonId: Record<string, number> = {};

          for (const p of allPeriods || []) {
            if (!isCompetitionPeriod(p)) continue;
            const teamIdRaw = p?.project_id ?? p?.project?.id ?? null;
            const teamId = teamIdRaw != null ? String(teamIdRaw) : '';
            if (!teamId) continue;

            competitionsCountByTeamId[teamId] = (competitionsCountByTeamId[teamId] || 0) + 1;
            matchesCountByTeamId[teamId] = (matchesCountByTeamId[teamId] || 0) + getRecursiveActivitiesCount(p);
          }

          // Per-season counts: competitions + matches under each season
          for (const season of mergedSeasons || []) {
            const seasonId = String((season as any)?.id ?? '').trim();
            if (!seasonId) continue;
            const children = childrenMap.get(seasonId) || [];
            const competitions = (children || []).filter((c) => isCompetitionPeriod(c));
            competitionsCountBySeasonId[seasonId] = competitions.length;
            matchesCountBySeasonId[seasonId] = competitions.reduce((sum, c) => sum + getRecursiveActivitiesCount(c), 0);
          }

          if (!cancelled) {
            setHierarchyCompetitionsCountByTeamId(competitionsCountByTeamId);
            setHierarchyMatchesCountByTeamId(matchesCountByTeamId);
            setHierarchyCompetitionsCountBySeasonId(competitionsCountBySeasonId);
            setHierarchyMatchesCountBySeasonId(matchesCountBySeasonId);
          }
        } catch {
          if (!cancelled) {
            setHierarchyCompetitionsCountByTeamId({});
            setHierarchyMatchesCountByTeamId({});
            setHierarchyCompetitionsCountBySeasonId({});
            setHierarchyMatchesCountBySeasonId({});
          }
        }

        // 4) Fetch member counts per team (best-effort)
        try {
          const membersCountByTeamId: Record<string, number> = {};
          const concurrency = 8;
          for (let i = 0; i < filteredTeams.length; i += concurrency) {
            const batch = filteredTeams.slice(i, i + concurrency);
            const results = await Promise.all(
              batch.map(async (t) => {
                const tid = String(t?.id || '').trim();
                if (!tid) return null;
                const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(tid)}/members/?page_size=1`;
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) return { teamId: tid, count: 0 };
                const json = await res.json().catch(() => null);
                return { teamId: tid, count: extractCount(json) };
              }),
            );

            for (const r of results) {
              if (!r) continue;
              membersCountByTeamId[r.teamId] = r.count;
            }
          }

          if (!cancelled) setHierarchyMembersCountByTeamId(membersCountByTeamId);
        } catch {
          if (!cancelled) setHierarchyMembersCountByTeamId({});
        }
      } catch (e) {
        if (cancelled) return;
        setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setHierarchyTeams([]);
        setHierarchySeasonsByTeamId({});
        setHierarchyCompetitionsCountByTeamId({});
        setHierarchyMatchesCountByTeamId({});
        setHierarchyCompetitionsCountBySeasonId({});
        setHierarchyMatchesCountBySeasonId({});
        setHierarchyMembersCountByTeamId({});
      } finally {
        if (!cancelled) setHierarchyLoading(false);
      }
    };

    void loadHierarchy();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists, orgSlugForDirectoryLists]);

  type ActionTone = 'neutral' | 'primary' | 'warning' | 'danger';
  const actionButtonStyle = (tone: ActionTone): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: 'var(--app-surface)',
      cursor: 'pointer',
      fontSize: '12px',
      lineHeight: 1.2,
    };
    if (tone === 'primary') {
      return { ...base, border: '1px solid var(--app-link)', color: 'var(--app-link)' };
    }
    if (tone === 'warning') {
      return { ...base, border: '1px solid var(--app-warning)', color: 'var(--app-warning)' };
    }
    if (tone === 'danger') {
      return { ...base, border: '1px solid var(--app-error)', color: 'var(--app-error)' };
    }
    return { ...base, border: '1px solid var(--app-border)', color: 'var(--app-muted-text)' };
  };

  // If we arrived via org UUID, replace with org slug for stable routing.
  const shouldResolveOrg = useMemo(() => looksLikeIdentifier(orgSlugOrId), [orgSlugOrId]);

  useEffect(() => {
    if (!shouldResolveOrg) return;
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    if (!slug) return;
    if (slug === orgSlugOrId) return;

    const clubKey = String(club?.slug || clubSlugOrId || '').trim();
    if (!clubKey) return;

    navigate(`/${encodeURIComponent(slug)}/${encodeURIComponent(clubKey)}${location.search || ''}`, { replace: true });
  }, [club, clubSlugOrId, location.search, navigate, org?.slug, orgSlugOrId, resolvedOrgSlug, shouldResolveOrg]);

  const backToOrgHref = useMemo(() => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return '/federations';

    // Mirror federation layout: go back to org page, clubs tab.
    const params = new URLSearchParams(location.search || '');
    params.set('tab', 'clubs');
    return `/${encodeURIComponent(orgKey)}?${params.toString()}`;
  }, [location.search, org?.slug, orgSlugOrId]);

  const clubBreadcrumbOptions: BreadcrumbSwitcherOption[] = useMemo(() => {
    const base = (orgClubsForSwitcher || []).map((c: any) => ({
      id: String(c.id),
      label: String(c.name || c.slug || c.id),
      slug: String(c.slug || c.id),
    }));

    if (club && !base.some((c) => String(c.id) === String(club.id))) {
      base.push({
        id: String(club.id),
        label: String(club.name || club.slug || club.id),
        slug: String(club.slug || club.id),
      });
    }
    return base;
  }, [club, orgClubsForSwitcher]);

  const handleClubSwitch = (option: BreadcrumbSwitcherOption) => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return;
    navigate(`/${encodeURIComponent(orgKey)}/${encodeURIComponent(String(option.slug || option.id))}${location.search || ''}`);
  };

  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);

  useEffect(() => {
    if (!org || !club) return;
    if (!shouldResolveClub) return;
    const slug = String(club?.slug || '').trim();
    if (!slug) return;
    if (slug === clubSlugOrId) return;

    navigate(
      `/${encodeURIComponent(String(org?.slug || orgSlugOrId))}/${encodeURIComponent(slug)}${location.search || ''}`,
      { replace: true },
    );
  }, [club, clubSlugOrId, location.search, navigate, org, orgSlugOrId, shouldResolveClub]);

  if (loading) {
    return (
      <div className="p-6 club-detail-page">
        <div>
          <PageHeader title="Club" />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">Loading club details...</div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (error || !org || !club) {
    return (
      <div className="p-6 club-detail-page">
        <div>
          <PageHeader title="Club" />
          <PageContent>
            <Alert variant="error">{error || 'Club not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(backToOrgHref)}>
              Back
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  // If we're still on a numeric/UUID route, the redirect useEffect will replace the URL.

  const clubDefaultLocation = String((club as any)?.metadata?.identity?.default_location || '').trim();

  return (
    <>
      <div className="club-detail-page">
        <PageHeader
          title={club.name}
          subtitle={clubDefaultLocation ? `Club overview • Location: ${clubDefaultLocation}` : 'Club overview • Location: —'}
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: org?.name || 'Federation', onClick: () => navigate(backToOrgHref) },
            {
              label: (
                <BreadcrumbContextSwitcher
                  currentId={String(club.id)}
                  options={clubBreadcrumbOptions}
                  onSelect={handleClubSwitch}
                  hasDropdown={!orgClubsForSwitcherLoading && clubBreadcrumbOptions.length > 1}
                  type="project"
                />
              ),
              current: true,
            },
          ]}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(() => {
                const isActive = club && activeContext?.club && (
                  String(activeContext.club.id) === String(club.id) ||
                  activeContext.club.slug === club.slug
                );
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={async () => {
                      if (!club || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('club', String(club.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                        console.log('[ClubOrganisationDetailPage] Active context updated:', context);
                      } catch (error) {
                        console.error('Failed to set active context:', error);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || isActive}
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      fontWeight: isActive ? 600 : undefined,
                      opacity: activatingContext || isActive ? 0.8 : 1,
                    }}
                  >
                    {isActive ? '✓ Active Context' : 'Make active'}
                  </Button>
                );
              })()}
              <Button variant="secondary" size="sm" onClick={() => navigate(backToOrgHref)}>
                Back
              </Button>
            </div>
          }
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <div className="space-y-6">
              {overviewError && <Alert variant="error">{overviewError}</Alert>}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                              <IdentitySettingsCard
                                title="Club settings"
                                description="Used to prefill match creation (logo + default location)."
                                values={{
                                  logoUrl: String((club as any)?.metadata?.identity?.logo_url || ''),
                                  defaultLocation: String((club as any)?.metadata?.identity?.default_location || ''),
                                }}
                                canEdit={Boolean(club)}
                                onSave={async (next) => {
                                  if (!club) throw new Error('Club not loaded');
                                  const csrfToken = getCsrfToken();

                                  const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(club.id))}/`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      metadata: {
                                        ...((club as any)?.metadata || {}),
                                        identity: {
                                          ...(((club as any)?.metadata || {})?.identity || {}),
                                          logo_url: String(next.logoUrl || '').trim() || null,
                                          default_location: String(next.defaultLocation || '').trim() || null,
                                        },
                                      },
                                    }),
                                  });

                                  if (!res.ok) {
                                    const detail = await res.text().catch(() => '');
                                    throw new Error(detail || `Failed to save club settings (${res.status})`);
                                  }

                                  const raw = await res.json().catch(() => null);
                                  const updated = unwrapEnvelope<any>(raw);
                                  setClub((prev) => ({ ...(prev as any), ...(updated as any) }));
                                }}
                              />
                <Card style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                    <div className="text-sm font-semibold text-gray-900">
                      Teams{' '}
                      <span className="text-gray-500" style={{ fontWeight: 600 }}>
                        ({overviewLoading ? '…' : overviewCounts ? overviewCounts.teams : '—'})
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('teams'))}>
                      View all
                    </Button>
                  </div>
                  {overviewLoading && overviewTeams.length === 0 ? (
                    <div className="text-sm text-gray-500">Loading teams…</div>
                  ) : overviewTeams.length === 0 ? (
                    <div className="text-sm text-gray-500">No teams found.</div>
                  ) : (
                    <div className="space-y-2">
                      {overviewTeams.map((t) => {
                        const teamKey = String(t?.slug || t?.id || '').trim();
                        const teamPath =
                          orgKeyForRoutes && clubKeyForRoutes && teamKey
                            ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKey)}`
                            : '';

                        return (
                          <div key={String(t.id)} className="flex items-center justify-between" style={{ gap: 12 }}>
                            {teamPath ? (
                              <button
                                type="button"
                                className="app-unstyled-button text-blue-600 hover:underline"
                                onClick={() => navigate(teamPath)}
                                style={{ textAlign: 'left', fontWeight: 600, minWidth: 0 }}
                              >
                                {t.name}
                              </button>
                            ) : (
                              <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                                {t.name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                    <div className="text-sm font-semibold text-gray-900">
                      Seasons{' '}
                      <span className="text-gray-500" style={{ fontWeight: 600 }}>
                        ({overviewLoading ? '…' : overviewCounts ? overviewCounts.seasons : '—'})
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('seasons'))}>
                      View all
                    </Button>
                  </div>
                  {overviewLoading && overviewSeasons.length === 0 ? (
                    <div className="text-sm text-gray-500">Loading seasons…</div>
                  ) : overviewSeasons.length === 0 ? (
                    <div className="text-sm text-gray-500">No seasons found.</div>
                  ) : (
                    <div className="space-y-2">
                      {overviewSeasons.map((s) => (
                        <div key={String((s as any)?.id)} className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                          {String((s as any)?.name || 'Season')}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                    <div className="text-sm font-semibold text-gray-900">
                      Members{' '}
                      <span className="text-gray-500" style={{ fontWeight: 600 }}>
                        ({overviewLoading ? '…' : overviewCounts ? overviewCounts.members : '—'})
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('members'))}>
                      View all
                    </Button>
                  </div>
                  {overviewLoading && overviewMembers.length === 0 ? (
                    <div className="text-sm text-gray-500">Loading members…</div>
                  ) : overviewMembers.length === 0 ? (
                    <div className="text-sm text-gray-500">No members found.</div>
                  ) : (
                    <div className="space-y-2">
                      {overviewMembers.map((m) => {
                        const label =
                          `${String(m?.first_name || '').trim()} ${String(m?.last_name || '').trim()}`.trim() ||
                          String(m?.email || '').trim() ||
                          `User ${m.id}`;
                        return (
                          <button
                            key={String(m.id)}
                            type="button"
                            className="app-unstyled-button text-blue-600 hover:underline"
                            onClick={() => navigate(`/users/${encodeURIComponent(String(m.id))}`)}
                            style={{ textAlign: 'left', fontWeight: 600 }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                    <div className="text-sm font-semibold text-gray-900">
                      Matches <span className="text-gray-500" style={{ fontWeight: 600 }}>(—)</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('matches'))}>
                      View all
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">Open the Matches tab to view fixtures and results.</div>
                </Card>
              </div>

              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Club Details</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Name</div>
                    <div className="text-base text-gray-900 mt-1">{club?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Federation</div>
                    <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Slug</div>
                    <div className="text-base text-gray-900 mt-1">{String((club as any)?.slug || '—')}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTabFromUrl === 'hierarchy' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Hierarchy</div>
                  <div style={{ color: 'var(--app-muted-text)', fontSize: 13 }}>Teams → seasons</div>
                </div>
                <Input
                  value={hierarchySearch}
                  onChange={(e) => setHierarchySearch((e.target as any).value)}
                  placeholder="Search teams / seasons…"
                />
              </div>

              {hierarchyError && (
                <div style={{ marginTop: 12 }}>
                  <Alert variant="error">{hierarchyError}</Alert>
                </div>
              )}

              {hierarchyLoading && hierarchyTeams.length === 0 ? (
                <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                  Loading hierarchy...
                </div>
              ) : hierarchyTeams.length === 0 ? (
                <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                  No teams found.
                </div>
              ) : visibleHierarchyTeams.length === 0 ? (
                <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                  No teams found.
                </div>
              ) : (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(() => {
                    const pillStyle: React.CSSProperties = {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--app-border)',
                      background: 'var(--app-surface-2)',
                      fontSize: 12,
                      color: 'var(--app-muted-text)',
                      fontWeight: 600,
                    };

                    const seasonRowStyle: React.CSSProperties = {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 10px',
                      border: '1px solid var(--app-border)',
                      borderRadius: 8,
                      background: 'var(--app-surface)',
                    };

                    return (
                      <>
                        <div
                          style={{
                            border: '1px solid var(--app-border)',
                            borderRadius: 10,
                            background: 'var(--app-surface)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderBottom: '1px solid var(--app-border)',
                              background: 'var(--app-surface-2)',
                              gap: 12,
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--app-text)' }}>{club?.name || 'Club'}</div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span style={pillStyle}>Teams: {hierarchyTotals.teamsCount}</span>
                              <span style={pillStyle}>Members: {hierarchyTotals.membersCount}</span>
                              <span style={pillStyle}>Seasons: {hierarchyTotals.seasonsCount}</span>
                              <span style={pillStyle}>Competitions: {hierarchyTotals.competitionsCount}</span>
                              <span style={pillStyle}>Matches: {hierarchyTotals.matchesCount}</span>
                            </div>
                          </div>
                        </div>

                        {visibleHierarchyTeams.map((team) => {
                          const teamKey = String(team?.slug || team?.id || '').trim();
                          const teamPath =
                            orgKeyForRoutes && clubKeyForRoutes && teamKey
                              ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKey)}`
                              : '';

                          const seasonsAll = hierarchySeasonsByTeamId[String(team.id)] || [];
                          const q = String(hierarchySearch || '').trim().toLowerCase();
                          const seasons = !q
                            ? seasonsAll
                            : seasonsAll.filter((s) => String((s as any)?.name || '').toLowerCase().includes(q));

                          const membersCount = hierarchyMembersCountByTeamId[String(team.id)] ?? 0;
                          const competitionsCount = hierarchyCompetitionsCountByTeamId[String(team.id)] ?? 0;
                          const matchesCount = hierarchyMatchesCountByTeamId[String(team.id)] ?? 0;

                          return (
                            <div
                              key={team.id}
                              style={{
                                border: '1px solid var(--app-border)',
                                borderRadius: 10,
                                background: 'var(--app-surface)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '10px 12px',
                                  borderBottom: '1px solid var(--app-border)',
                                  background: 'var(--app-surface-2)',
                                  gap: 12,
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                  {teamPath ? (
                                    <button
                                      type="button"
                                      className="app-unstyled-button text-blue-600 hover:underline"
                                      onClick={() => navigate(teamPath)}
                                      style={{ textAlign: 'left', fontWeight: 800, fontSize: 14 }}
                                    >
                                      {team.name}
                                    </button>
                                  ) : (
                                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--app-text)' }}>{team.name}</div>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span style={pillStyle}>Members: {membersCount}</span>
                                  <span style={pillStyle}>Seasons: {seasonsAll.length}</span>
                                  <span style={pillStyle}>Competitions: {competitionsCount}</span>
                                  <span style={pillStyle}>Matches: {matchesCount}</span>
                                  {teamPath ? (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={() => navigate(teamPath)}
                                      style={actionButtonStyle('primary')}
                                    >
                                      View Team
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              <div style={{ padding: '10px 12px' }}>
                                {seasons.length === 0 ? (
                                  <div className="text-sm text-gray-500 py-2">No seasons.</div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {seasons.map((s) => {
                                      const seasonKey = String((s as any)?.slug || (s as any)?.id || '').trim();
                                      const seasonPath =
                                        teamPath && seasonKey
                                          ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKey)}/${encodeURIComponent(seasonKey)}`
                                          : '';

                                      const seasonId = String((s as any)?.id ?? '').trim();
                                      const seasonCompetitions = hierarchyCompetitionsCountBySeasonId[seasonId] ?? 0;
                                      const seasonMatches = hierarchyMatchesCountBySeasonId[seasonId] ?? 0;

                                      return (
                                        <div key={String((s as any)?.id)} style={seasonRowStyle}>
                                          <div style={{ minWidth: 0 }}>
                                            {seasonPath ? (
                                              <button
                                                type="button"
                                                className="app-unstyled-button text-blue-600 hover:underline"
                                                onClick={() => navigate(seasonPath)}
                                                style={{ textAlign: 'left', fontWeight: 700, fontSize: 13 }}
                                              >
                                                {String((s as any)?.name || 'Season')}
                                              </button>
                                            ) : (
                                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--app-text)' }}>
                                                {String((s as any)?.name || 'Season')}
                                              </div>
                                            )}
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <span style={pillStyle}>Competitions: {seasonCompetitions}</span>
                                            <span style={pillStyle}>Matches: {seasonMatches}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}
            </Card>
          )}

          {activeTabFromUrl === 'teams' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <TeamsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'seasons' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <SeasonsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'competitions' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <CompetitionsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'matches' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <MatchesList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'members' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <UsersList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'balance' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamCreditsTab view="balance" projectId={clubIdForDirectoryLists} projectName={club.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'transactions' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamCreditsTab view="transactions" projectId={clubIdForDirectoryLists} projectName={club.name} organisationId={orgIdForDirectoryLists} />
          )}
        </PageContent>
      </div>
    </>
  );
}
