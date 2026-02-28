import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader, type BreadcrumbSwitcherOption } from '@django-core/page-templates';

import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';

import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import TeamCreditsTab from './detail/TeamCreditsTab';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import MobileTabBar from '../../components/MobileTabBar';
import { useUserRole } from '../../components/PermissionGuards';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import { AssetsTab } from '../../components/AssetsTab';
import { KitsTab } from '../../components/KitsTab';
import { MemberMediaMatrix } from '../../components/MemberMediaMatrix';
import { AssetCompletionMatrix } from '../../components/AssetCompletionMatrix';

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

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
  return false;
};

const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

const getParentPeriodId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId != null ? String(parentId) : '';
};

const getParentProjectId = (p: any): string => {
  const parent =
    p?.parent_id ??
    p?.parent_project_id ??
    (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project) ??
    (typeof p?.parent === 'object' ? p?.parent?.id : p?.parent) ??
    null;
  return parent != null ? String(typeof parent === 'object' ? parent.id : parent) : '';
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

/**
 * Lazy-loading wrapper for MemberMediaMatrix on the team page.
 * Fetches all project members when mounted (i.e. when media tab is active).
 */
function MediaMatrixLoader({ apiBaseUrl, teamId }: { apiBaseUrl: string; teamId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamId)}/members/?page_size=200`,
          { credentials: 'include' },
        );
        if (!res.ok) throw new Error(`Failed to load members (${res.status})`);
        const json = await res.json();
        const data = json?.data || json;
        const results = data?.results || (Array.isArray(data) ? data : []);
        if (!cancelled) setMembers(results);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [apiBaseUrl, teamId]);

  return (
    <MemberMediaMatrix
      members={members}
      membersLoading={loading}
      membersError={error}
    />
  );
}

export default function TeamOrganisationDetailPage() {
  const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlayer } = useUserRole();

  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const teamSlugOrId = String(projectId || '').trim();

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
  const [team, setTeam] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hierarchySeasons, setHierarchySeasons] = useState<Period[]>([]);
  const [hierarchyCompetitionsBySeasonId, setHierarchyCompetitionsBySeasonId] = useState<Record<string, Period[]>>({});
  const [hierarchyMatchesCountBySeasonId, setHierarchyMatchesCountBySeasonId] = useState<Record<string, number>>({});
  const [hierarchyMatchesCountByCompetitionId, setHierarchyMatchesCountByCompetitionId] = useState<Record<string, number>>({});
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [hierarchySearch, setHierarchySearch] = useState('');

  const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
  const [overviewMembersCount, setOverviewMembersCount] = useState<number | null>(null);
  const [overviewMembersLoading, setOverviewMembersLoading] = useState(false);
  const [overviewMembersError, setOverviewMembersError] = useState<string | null>(null);

  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);

  const [clubTeamsForSwitcher, setClubTeamsForSwitcher] = useState<Project[]>([]);
  const [clubTeamsForSwitcherLoading, setClubTeamsForSwitcherLoading] = useState(false);

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || (isPlayer ? 'hierarchy' : 'overview')).trim().toLowerCase();
    const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
    const allowed = isPlayer
      ? new Set(['hierarchy', 'matches'])
      : new Set([
          'overview',
          'hierarchy',
          'seasons',
          'competitions',
          'matches',
          'members',
          'media',
          'balance',
          'transactions',
          'assets',
          'kits',
        ]);
    return allowed.has(normalized) ? normalized : (isPlayer ? 'hierarchy' : 'overview');
  }, [location.search, isPlayer]);

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
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        console.error('Failed to load active context:', e);
      }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!orgSlugOrId || !clubSlugOrId || !teamSlugOrId) {
          throw new Error('Missing organisation, club, or team identifier.');
        }

        if (!effectiveOrgSlug) {
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

        const [orgRes, clubRes, teamRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/`, { credentials: 'include' }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' },
          ),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(teamSlugOrId)}/`,
            { credentials: 'include' },
          ),
        ]);

        if (!orgRes.ok) throw new Error(`Failed to load organisation (${orgRes.status})`);
        if (!clubRes.ok) throw new Error(`Failed to load club (${clubRes.status})`);
        if (!teamRes.ok) throw new Error(`Failed to load team (${teamRes.status})`);

        const orgJson = await orgRes.json().catch(() => null);
        const clubJson = await clubRes.json().catch(() => null);
        const teamJson = await teamRes.json().catch(() => null);

        const loadedOrg = unwrapEnvelope<Organisation>(orgJson);
        const loadedClub = unwrapEnvelope<Project>(clubJson);
        const loadedTeam = unwrapEnvelope<Project>(teamJson);

        if (cancelled) return;
        setOrg(loadedOrg);
        setClub(loadedClub);
        setTeam(loadedTeam);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load team');
        setOrg(null);
        setClub(null);
        setTeam(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, clubSlugOrId, orgSlugOrId, teamSlugOrId, effectiveOrgSlug]);

  const orgIdForDirectoryLists = useMemo(() => String(org?.id || '').trim(), [org?.id]);
  const clubIdForDirectoryLists = useMemo(() => String(club?.id || '').trim(), [club?.id]);
  const teamIdForDirectoryLists = useMemo(() => String(team?.id || '').trim(), [team?.id]);

  const orgSlugForDirectoryLists = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug;
  }, [org?.slug, resolvedOrgSlug]);

  const orgKeyForRoutes = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug || String(orgSlugOrId || '').trim();
  }, [org?.slug, orgSlugOrId, resolvedOrgSlug]);
  const clubKeyForRoutes = useMemo(() => String(club?.slug || clubSlugOrId || '').trim(), [club?.slug, clubSlugOrId]);
  const teamKeyForRoutes = useMemo(() => String(team?.slug || teamSlugOrId || '').trim(), [team?.slug, teamSlugOrId]);

  const shouldResolveOrg = useMemo(() => looksLikeIdentifier(orgSlugOrId), [orgSlugOrId]);
  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);
  const shouldResolveTeam = useMemo(() => looksLikeIdentifier(teamSlugOrId), [teamSlugOrId]);

  useEffect(() => {
    if (!org || !club || !team) return;

    const resolvedClubSlug = String(club?.slug || '').trim();
    const resolvedTeamSlug = String(team?.slug || '').trim();

    const desiredClubKey = resolvedClubSlug || clubSlugOrId;
    const desiredTeamKey = resolvedTeamSlug || teamSlugOrId;

    const needsRedirect =
      (shouldResolveClub && resolvedClubSlug && resolvedClubSlug !== clubSlugOrId) ||
      (shouldResolveTeam && resolvedTeamSlug && resolvedTeamSlug !== teamSlugOrId);

    if (!needsRedirect) return;

    const orgKey = String(org?.slug || resolvedOrgSlug || orgSlugOrId || '').trim();
    if (!orgKey || !desiredClubKey || !desiredTeamKey) return;

    navigate(
      `/${encodeURIComponent(orgKey)}/${encodeURIComponent(desiredClubKey)}/${encodeURIComponent(desiredTeamKey)}${location.search || ''}`,
      { replace: true },
    );
  }, [club, clubSlugOrId, location.search, navigate, org, orgSlugOrId, shouldResolveClub, shouldResolveTeam, team, teamSlugOrId]);

  useEffect(() => {
    if (!shouldResolveOrg) return;
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    if (!slug) return;
    if (slug === orgSlugOrId) return;
    const clubKey = String(club?.slug || clubSlugOrId || '').trim();
    const teamKey = String(team?.slug || teamSlugOrId || '').trim();
    if (!clubKey || !teamKey) return;
    navigate(`/${encodeURIComponent(slug)}/${encodeURIComponent(clubKey)}/${encodeURIComponent(teamKey)}${location.search || ''}`, {
      replace: true,
    });
  }, [club, clubSlugOrId, location.search, navigate, org?.slug, orgSlugOrId, resolvedOrgSlug, shouldResolveOrg, team, teamSlugOrId]);

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      if (activeTabFromUrl !== 'hierarchy' && activeTabFromUrl !== 'overview') return;
      if (!teamIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Seasons for this team (typed query first; fallback to untyped + competition parent seasons)
        const baseSeasonParams = new URLSearchParams();
        baseSeasonParams.set('page_size', '2000');

        // Some datasets store seasons at club level (project_id=club). Include both.
        const seasonProjectIds = [teamIdForDirectoryLists, clubIdForDirectoryLists].filter(Boolean);
        if (seasonProjectIds.length === 1) {
          baseSeasonParams.set('project_id', seasonProjectIds[0]);
        } else if (seasonProjectIds.length > 1) {
          baseSeasonParams.set('project_id__in', seasonProjectIds.join(','));
        }

        const typedParams = new URLSearchParams(baseSeasonParams);
        typedParams.set('type', 'season');

        const typedUrl = `${apiBaseUrl}/api/v1/periods/?${typedParams.toString()}`;
        const typedList: any[] = await fetchAllPages<any>(typedUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });

        const untypedUrl = `${apiBaseUrl}/api/v1/periods/?${baseSeasonParams.toString()}`;
        const untypedList: any[] = await fetchAllPages<any>(untypedUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });

        // Pull season parents from competitions as a last-resort source of truth.
        const competitionsParams = new URLSearchParams();
        competitionsParams.set('project_id', teamIdForDirectoryLists);
        competitionsParams.set('page_size', '2000');
        competitionsParams.set('type', 'competition');
        const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?${competitionsParams.toString()}`;
        const competitionsList: any[] = await fetchAllPages<any>(
          competitionsUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 },
        );
        const parentSeasonsFromCompetitions = (competitionsList || [])
          .map((c: any) => c?.parent_period)
          .filter((p: any) => p && (p?.id || p?.slug));

        const seasons = mergeUniqueById(
          [...(typedList || []), ...(untypedList || []), ...parentSeasonsFromCompetitions]
            .filter(isSeasonPeriod)
            .filter((p: any) => !getParentPeriodId(p)),
        );
        seasons.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

        if (cancelled) return;
        setHierarchySeasons(seasons);

        // 2) Competitions for this team (fetch all periods for the team and group by season parent id)
        const periodsParams = new URLSearchParams();
        periodsParams.set('project_id', teamIdForDirectoryLists);
        periodsParams.set('page_size', '1000');

        const periodsUrl = `${apiBaseUrl}/api/v1/periods/?${periodsParams.toString()}`;
        const periodsList: any[] = await fetchAllPages<any>(periodsUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });

        const seasonIds = new Set(seasons.map((s) => String(s.id)));
        const competitions = (periodsList || []).filter((p: any) => {
          const parentId = getParentPeriodId(p);
          if (!parentId) return false;
          return seasonIds.has(parentId);
        });

        const bySeason: Record<string, Period[]> = {};
        for (const c of competitions) {
          const parentId = getParentPeriodId(c);
          if (!parentId) continue;
          (bySeason[parentId] ||= []).push(c);
        }

        for (const key of Object.keys(bySeason)) {
          bySeason[key] = mergeUniqueById(bySeason[key]).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        }

        // Build children map for recursive activity counts.
        const childrenMap = new Map<string, any[]>();
        for (const p of periodsList || []) {
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

        const matchesCountByCompetitionId: Record<string, number> = {};
        for (const list of Object.values(bySeason)) {
          for (const c of list || []) {
            const cid = String((c as any)?.id ?? '').trim();
            if (!cid) continue;
            matchesCountByCompetitionId[cid] = getRecursiveActivitiesCount(c);
          }
        }

        const matchesCountBySeasonId: Record<string, number> = {};
        for (const season of seasons) {
          const sid = String((season as any)?.id ?? '').trim();
          if (!sid) continue;
          const comps = bySeason[sid] || [];
          matchesCountBySeasonId[sid] = comps.reduce((sum, c) => {
            const cid = String((c as any)?.id ?? '').trim();
            return sum + (matchesCountByCompetitionId[cid] ?? 0);
          }, 0);
        }

        if (cancelled) return;
        setHierarchyCompetitionsBySeasonId(bySeason);
        setHierarchyMatchesCountByCompetitionId(matchesCountByCompetitionId);
        setHierarchyMatchesCountBySeasonId(matchesCountBySeasonId);
      } catch (e) {
        if (cancelled) return;
        setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setHierarchySeasons([]);
        setHierarchyCompetitionsBySeasonId({});
        setHierarchyMatchesCountBySeasonId({});
        setHierarchyMatchesCountByCompetitionId({});
      } finally {
        if (!cancelled) setHierarchyLoading(false);
      }
    };

    void loadHierarchy();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists]);

  useEffect(() => {
    let cancelled = false;

    const extractMembersCount = (raw: any, list: any[]): number => {
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
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('include_project_memberships', 'true');
        params.set('include_project_membership_details', 'true');

        const url = `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/?${params.toString()}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load members (${res.status})`);
        const json = await res.json().catch(() => null);

        const rawList = json?.data?.data || json?.data?.results || json?.results || json?.data || [];
        const list: any[] = Array.isArray(rawList) ? rawList : [];

        const isMemberInTeam = (item: any): boolean => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const memberships = item?.project_memberships || u?.project_memberships || [];
          if (!Array.isArray(memberships) || memberships.length === 0) return false;
          return memberships.some((m: any) => String(m?.project_id ?? m?.project?.id ?? '') === String(teamId));
        };

        const normalized: OverviewMember[] = list
          .filter(isMemberInTeam)
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

        const sorted = [...normalized].sort((a, b) => {
          const an = `${a?.last_name || ''} ${a?.first_name || ''} ${a?.email || ''}`.trim();
          const bn = `${b?.last_name || ''} ${b?.first_name || ''} ${b?.email || ''}`.trim();
          return an.localeCompare(bn);
        });

        if (cancelled) return;
        setOverviewMembers(sorted.slice(0, 6));
        setOverviewMembersCount(extractMembersCount(json, normalized));
      } catch (e) {
        if (cancelled) return;
        setOverviewMembers([]);
        setOverviewMembersCount(null);
        setOverviewMembersError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        if (!cancelled) setOverviewMembersLoading(false);
      }
    };

    void loadOverviewMembers();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, orgSlugForDirectoryLists, teamIdForDirectoryLists]);

  useEffect(() => {
    let cancelled = false;

    const loadClubTeams = async () => {
      if (!clubIdForDirectoryLists) return;

      setClubTeamsForSwitcherLoading(true);
      setClubTeamsForSwitcher([]);
      try {
        const orgKey = String(org?.slug || resolvedOrgSlug || '').trim();

        const clubIdForFilter = String(getParentProjectId(team) || clubIdForDirectoryLists || '').trim();
        if (!clubIdForFilter) {
          if (!cancelled) setClubTeamsForSwitcher([]);
          return;
        }

        const isTeamUnderThisClub = (t: any): boolean => {
          const parentId = String(getParentProjectId(t) || '').trim();
          if (!parentId) return false;
          return parentId === clubIdForFilter;
        };

        // Strategy:
        // - First try direct parent_project query (often works and is fast).
        // - Also fetch org-wide teams (parent_project__isnull=false) and filter client-side.
        // - Merge both, then strictly filter by parent.
        const directUrl = `${apiBaseUrl}/api/v1/projects/?parent_project=${encodeURIComponent(String(clubIdForDirectoryLists))}&page_size=500&include_archived=true`;
        const orgTeamsUrl = orgKey
          ? `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgKey)}/projects/?page_size=250&include_archived=true&parent_project__isnull=false`
          : `${apiBaseUrl}/api/v1/projects/?page_size=250&include_archived=true&parent_project__isnull=false`;

        const [directResults, orgTeamsResults] = await Promise.all([
          fetchAllPages<any>(directUrl, { credentials: 'include' }, { ttlMs: 60_000, bypass: true, maxItems: 5000 }),
          fetchAllPages<any>(orgTeamsUrl, { credentials: 'include' }, { ttlMs: 60_000, bypass: true, maxItems: 5000 }),
        ]);

        const merged = mergeUniqueById([...(directResults || []), ...(orgTeamsResults || [])]);
        const list = mergeUniqueById(
          (merged || []).filter((t: any) => {
            if (!t?.id) return false;
            if (String(t.id) === String(clubIdForDirectoryLists)) return false;
            return isTeamUnderThisClub(t);
          }),
        );

        if (cancelled) return;
        setClubTeamsForSwitcher(list);
      } catch (e) {
        if (cancelled) return;
        setClubTeamsForSwitcher([]);
      } finally {
        if (!cancelled) setClubTeamsForSwitcherLoading(false);
      }
    };

    void loadClubTeams();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, clubIdForDirectoryLists, org?.slug, resolvedOrgSlug]);

  // ── Load brand profile ID for Kits tab ──
  useEffect(() => {
    if (!team?.id) return;
    let cancelled = false;

    const loadBrandProfile = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/?project=${team.id}`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data || json;
        const results = data?.results || (Array.isArray(data) ? data : []);
        if (results.length > 0 && !cancelled) {
          setBrandProfileId(results[0]?.id || null);
        }
      } catch { /* ignore */ }
    };

    void loadBrandProfile();
    return () => { cancelled = true; };
  }, [apiBaseUrl, team?.id]);

  const backToClubHref = useMemo(() => {
    if (!orgKeyForRoutes || !clubKeyForRoutes) return '/federations';
    return `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}${location.search || ''}`;
  }, [clubKeyForRoutes, location.search, orgKeyForRoutes]);

  const federationClubsHref = useMemo(() => {
    if (!orgKeyForRoutes) return '/federations';
    const params = new URLSearchParams(location.search || '');
    params.set('tab', 'clubs');
    return `/${encodeURIComponent(orgKeyForRoutes)}?${params.toString()}`;
  }, [location.search, orgKeyForRoutes]);

  const teamBreadcrumbOptions: BreadcrumbSwitcherOption[] = useMemo(() => {
    const base = (clubTeamsForSwitcher || []).map((t: any) => ({
      id: String(t.id),
      label: String(t.name || t.slug || t.id),
      slug: String(t.slug || t.id),
    }));

    if (team && !base.some((t) => String(t.id) === String(team.id))) {
      base.push({
        id: String(team.id),
        label: String(team.name || team.slug || team.id),
        slug: String(team.slug || team.id),
      });
    }

    return base;
  }, [clubTeamsForSwitcher, team]);

  const handleTeamSwitch = (option: BreadcrumbSwitcherOption) => {
    if (!orgKeyForRoutes || !clubKeyForRoutes) return;
    navigate(
      `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(
        String(option.slug || option.id),
      )}${location.search || ''}`,
    );
  };

  if (loading) {
    return (
      <div className="p-6 team-detail-page">
        <div>
          <PageHeader title="Team" />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">Loading team details...</div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (error || !org || !club || !team) {
    return (
      <div className="p-6 team-detail-page">
        <div>
          <PageHeader title="Team" />
          <PageContent>
            <Alert variant="error">{error || 'Team not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(backToClubHref)}>
              Back
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="team-detail-page">
        <PageHeader
          title={team.name}
          subtitle={`${(team as any)?.team_type === 'legends' ? 'Legends' : 'Regulier'} Team`}
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: org?.name || 'Federation', onClick: () => navigate(federationClubsHref) },
            { label: club?.name || 'Club', onClick: () => navigate(backToClubHref) },
            {
              label: (
                <BreadcrumbContextSwitcher
                  currentId={String(team.id)}
                  options={teamBreadcrumbOptions}
                  onSelect={handleTeamSwitch}
                  hasDropdown={!clubTeamsForSwitcherLoading && teamBreadcrumbOptions.length > 1}
                  type="project"
                />
              ),
              current: true,
            },
          ]}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {!isPlayer && (
              <select
                value={(team as any)?.team_type || 'regular'}
                onChange={async (e) => {
                  const newType = e.target.value;
                  try {
                    const res = await fetch(
                      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                        credentials: 'include',
                        body: JSON.stringify({ team_type: newType }),
                      },
                    );
                    if (!res.ok) throw new Error('Failed to update team type');
                    setTeam((prev: any) => prev ? { ...prev, team_type: newType } : prev);
                  } catch (err) {
                    console.error('Failed to update team type:', err);
                    alert('Kon team type niet opslaan');
                  }
                }}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '4px 10px',
                  background: (team as any)?.team_type === 'legends' ? '#fffbeb' : 'white',
                  cursor: 'pointer',
                  color: (team as any)?.team_type === 'legends' ? '#d97706' : '#374151',
                }}
              >
                <option value="regular">Regulier</option>
                <option value="legends">Legends</option>
              </select>
              )}
              {(() => {
                const isActive = !!team && String(activeContext?.team?.id ?? '') === String(team.id ?? '');
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={async () => {
                      if (!team || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('team', String(team.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || isActive}
                    title={isActive ? 'This team is already your active context' : 'Set this team as your active context'}
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      cursor: (activatingContext || isActive) ? 'not-allowed' : 'pointer',
                      opacity: (activatingContext || isActive) ? 0.8 : 1,
                      fontWeight: isActive ? 600 : undefined,
                    }}
                  >
                    {isActive ? '✓ Active Context' : 'Make active'}
                  </Button>
                );
              })()}

              <Button variant="secondary" size="sm" onClick={() => navigate(backToClubHref)}>
                Back
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsProjectDetailModalOpen(true)}>
                View
              </Button>
              {!isPlayer && (
              <Button variant="secondary" size="sm" onClick={() => setIsProjectEditModalOpen(true)}>
                Edit
              </Button>
              )}
              {!isPlayer && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!team) return;
                  if (!window.confirm(`Are you sure you want to delete team ${team.name}?`)) return;
                  try {
                    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken(),
                      },
                      credentials: 'include',
                    });
                    if (!res.ok) throw new Error('Failed to delete team');
                    navigate(backToClubHref);
                  } catch (e) {
                    console.error('Delete failed:', e);
                    alert('Failed to delete team');
                  }
                }}
                style={{ color: '#dc2626' }}
              >
                Delete
              </Button>
              )}
            </div>
          }
        />

        {/* Mobile Tab Bar */}
        <MobileTabBar
          tabs={[
            ...(!isPlayer ? [{ id: 'overview', label: 'Overview' }] : []),
            { id: 'hierarchy', label: 'Hierarchy' },
            ...(!isPlayer ? [{ id: 'seasons', label: 'Seasons' }] : []),
            ...(!isPlayer ? [{ id: 'competitions', label: 'Competitions' }] : []),
            { id: 'matches', label: 'Matches' },
            ...(!isPlayer ? [{ id: 'members', label: 'Squad' }] : []),
            ...(!isPlayer ? [{ id: 'media', label: 'Media' }] : []),
            ...(!isPlayer ? [{ id: 'balance', label: 'Balance' }] : []),
            ...(!isPlayer ? [{ id: 'transactions', label: 'Transactions' }] : []),
            ...(!isPlayer ? [{ id: 'assets', label: 'Assets' }] : []),
            ...(!isPlayer ? [{ id: 'kits', label: 'Kits' }] : []),
          ]}
          activeTab={activeTabFromUrl}
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <div className="space-y-6">
              {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}
              {overviewMembersError && <Alert variant="error">{overviewMembersError}</Alert>}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                    <div className="text-sm font-semibold text-gray-900">
                      Seasons{' '}
                      <span className="text-gray-500" style={{ fontWeight: 600 }}>
                        ({hierarchyLoading ? '…' : hierarchySeasons.length})
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('seasons'))}>
                      View all
                    </Button>
                  </div>
                  {hierarchyLoading && hierarchySeasons.length === 0 ? (
                    <div className="text-sm text-gray-500">Loading seasons…</div>
                  ) : hierarchySeasons.length === 0 ? (
                    <div className="text-sm text-gray-500">No seasons found.</div>
                  ) : (
                    <div className="space-y-2">
                      {hierarchySeasons.slice(0, 6).map((s) => {
                        const seasonKey = String((s as any)?.slug || (s as any)?.id || '').trim();
                        const seasonPath =
                          orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
                            ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
                            : '';
                        return seasonPath ? (
                          <button
                            key={String((s as any)?.id)}
                            type="button"
                            className="app-unstyled-button hover:underline"
                            onClick={() => navigate(seasonPath)}
                            style={{ textAlign: 'left', fontWeight: 600, color: '#60a5fa' }}
                          >
                            {String((s as any)?.name || 'Season')}
                          </button>
                        ) : (
                          <div key={String((s as any)?.id)} className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                            {String((s as any)?.name || 'Season')}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                    <div className="text-sm font-semibold text-gray-900">
                      Competitions{' '}
                      <span className="text-gray-500" style={{ fontWeight: 600 }}>
                        (
                        {hierarchyLoading
                          ? '…'
                          : Object.values(hierarchyCompetitionsBySeasonId || {}).reduce((sum, list) => sum + (list?.length || 0), 0)}
                        )
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('competitions'))}>
                      View all
                    </Button>
                  </div>
                  {hierarchyLoading && Object.keys(hierarchyCompetitionsBySeasonId || {}).length === 0 ? (
                    <div className="text-sm text-gray-500">Loading competitions…</div>
                  ) : (() => {
                      const flat: Array<{ season: any; comp: any }> = [];
                      for (const season of hierarchySeasons || []) {
                        const sid = String((season as any)?.id ?? '').trim();
                        const comps = hierarchyCompetitionsBySeasonId[sid] || [];
                        for (const c of comps || []) flat.push({ season, comp: c });
                      }

                      if (flat.length === 0) return <div className="text-sm text-gray-500">No competitions found.</div>;

                      return (
                        <div className="space-y-2">
                          {flat.slice(0, 6).map(({ season, comp }) => {
                            const seasonKey = String((season as any)?.slug || (season as any)?.id || '').trim();
                            const compKey = String((comp as any)?.slug || (comp as any)?.id || '').trim();
                            const compPath =
                              orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey && compKey
                                ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}/${encodeURIComponent(compKey)}`
                                : '';
                            const label = String((comp as any)?.name || 'Competition');
                            return compPath ? (
                              <button
                                key={String((comp as any)?.id)}
                                type="button"
                                className="app-unstyled-button hover:underline"
                                onClick={() => navigate(compPath)}
                                style={{ textAlign: 'left', fontWeight: 600, color: '#60a5fa' }}
                              >
                                {label}
                              </button>
                            ) : (
                              <div key={String((comp as any)?.id)} className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                                {label}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                </Card>

                <Card style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                    <div className="text-sm font-semibold text-gray-900">
                      Members{' '}
                      <span className="text-gray-500" style={{ fontWeight: 600 }}>
                        ({overviewMembersLoading ? '…' : overviewMembersCount ?? '—'})
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('members'))}>
                      View all
                    </Button>
                  </div>
                  {overviewMembersLoading && overviewMembers.length === 0 ? (
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
                            className="app-unstyled-button hover:underline"
                            onClick={() => navigate(`/users/${encodeURIComponent(String(m.id))}`)}
                            style={{ textAlign: 'left', fontWeight: 600, color: '#60a5fa' }}
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
                      Matches{' '}
                      <span className="text-gray-500" style={{ fontWeight: 600 }}>
                        (
                        {hierarchyLoading
                          ? '…'
                          : Object.values(hierarchyMatchesCountBySeasonId || {}).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0)}
                        )
                      </span>
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
                  <h3 className="text-lg font-semibold">Team Details</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Name</div>
                    <div className="text-base text-gray-900 mt-1">{team?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Club</div>
                    <div className="text-base text-gray-900 mt-1">{club?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Federation</div>
                    <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Slug</div>
                    <div className="text-base text-gray-900 mt-1">{String((team as any)?.slug || '—')}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTabFromUrl === 'hierarchy' && teamIdForDirectoryLists && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Hierarchy</div>
                  <div style={{ color: 'var(--app-muted-text)', fontSize: 13 }}>Seasons → competitions</div>
                </div>
                <Input
                  value={hierarchySearch}
                  onChange={(e) => setHierarchySearch((e.target as any).value)}
                  placeholder="Search seasons / competitions…"
                />
              </div>

              {hierarchyError && (
                <div style={{ marginTop: 12 }}>
                  <Alert variant="error">{hierarchyError}</Alert>
                </div>
              )}

              {hierarchyLoading && hierarchySeasons.length === 0 ? (
                <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                  Loading hierarchy...
                </div>
              ) : hierarchySeasons.length === 0 ? (
                <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                  No seasons found.
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

                    const competitionRowStyle: React.CSSProperties = {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 10px',
                      border: '1px solid var(--app-border)',
                      borderRadius: 8,
                      background: 'var(--app-surface)',
                    };

                    const q = String(hierarchySearch || '').trim().toLowerCase();
                    const visibleSeasons = !q
                      ? hierarchySeasons
                      : (hierarchySeasons || []).filter((s) => {
                          const seasonName = String((s as any)?.name || '').toLowerCase();
                          if (seasonName.includes(q)) return true;
                          const comps = hierarchyCompetitionsBySeasonId[String((s as any)?.id)] || [];
                          return (comps || []).some((c) => String((c as any)?.name || '').toLowerCase().includes(q));
                        });

                    return (
                      <>
                        {visibleSeasons.map((season) => {
                    const seasonKey = String((season as any)?.slug || (season as any)?.id || '').trim();
                    const seasonPath =
                      orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
                        ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
                        : '';

                    const competitionsAll = hierarchyCompetitionsBySeasonId[String(season.id)] || [];
                    const competitions = !q
                      ? competitionsAll
                      : (competitionsAll || []).filter((c) => String((c as any)?.name || '').toLowerCase().includes(q));

                    const seasonId = String((season as any)?.id ?? '').trim();
                    const seasonMatches = hierarchyMatchesCountBySeasonId[seasonId] ?? 0;

                    return (
                      <div
                        key={String(season.id)}
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
                            {seasonPath ? (
                              <button
                                type="button"
                                className="app-unstyled-button hover:underline"
                                onClick={() => navigate(seasonPath)}
                                style={{ textAlign: 'left', fontWeight: 800, fontSize: 14, color: '#60a5fa' }}
                              >
                                {String((season as any)?.name || 'Season')}
                              </button>
                            ) : (
                              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--app-text)' }}>
                                {String((season as any)?.name || 'Season')}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span style={pillStyle}>Competitions: {competitionsAll.length}</span>
                            <span style={pillStyle}>Matches: {seasonMatches}</span>
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px' }}>
                          {competitions.length === 0 ? (
                            <div className="text-sm text-gray-500 py-2">No competitions.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {competitions.map((c) => {
                              const competitionKey = String((c as any)?.slug || (c as any)?.id || '').trim();
                              const competitionPath =
                                orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey && competitionKey
                                  ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}/${encodeURIComponent(competitionKey)}`
                                  : '';

                              const competitionId = String((c as any)?.id ?? '').trim();
                              const competitionMatches = hierarchyMatchesCountByCompetitionId[competitionId] ?? (c as any)?.activities_count ?? 0;

                              return (
                                <div key={String((c as any)?.id)} style={competitionRowStyle}>
                                  <div style={{ minWidth: 0 }}>
                                    {competitionPath ? (
                                      <button
                                        type="button"
                                        className="app-unstyled-button hover:underline"
                                        onClick={() => navigate(competitionPath)}
                                        style={{ textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#60a5fa' }}
                                      >
                                        {String((c as any)?.name || 'Competition')}
                                      </button>
                                    ) : (
                                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--app-text)' }}>{String((c as any)?.name || 'Competition')}</div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <span style={pillStyle}>Matches: {competitionMatches}</span>
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

          {activeTabFromUrl === 'seasons' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <SeasonsList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
              preselectedClubSlug={clubKeyForRoutes}
              preselectedTeamSlug={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'competitions' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <CompetitionsList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
              preselectedClubSlug={clubKeyForRoutes}
              preselectedTeamSlug={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'matches' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <MatchesList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
              preselectedClubSlug={clubKeyForRoutes}
              preselectedTeamSlug={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'members' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <UsersList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
            />
          )}

          {activeTabFromUrl === 'balance' && orgIdForDirectoryLists && teamIdForDirectoryLists && (
            <TeamCreditsTab view="balance" projectId={teamIdForDirectoryLists} projectName={team.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'transactions' && orgIdForDirectoryLists && teamIdForDirectoryLists && (
            <TeamCreditsTab view="transactions" projectId={teamIdForDirectoryLists} projectName={team.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'media' && team && org && (
            <div className="space-y-6">
              <AssetCompletionMatrix
                projectId={team.slug || String(team.id)}
                entityName={team.name}
                title="Asset Completion Matrix"
              />

              <Card>
                <div style={{ padding: '16px 16px 0 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 24 }}>👥</span>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Member Media Matrix</h3>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <MediaMatrixLoader
                    apiBaseUrl={apiBaseUrl}
                    teamId={team.slug || String(team.id)}
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTabFromUrl === 'assets' && team && org && (
            <AssetsTab
              level="team"
              organisationId={String(org.id)}
              projectId={String(team.id)}
              parentProjectId={club ? String(club.id) : undefined}
              entityName={team.name}
              sponsorMode={((team as any)?.metadata?.sponsor_mode as 'club' | 'custom') || 'club'}
              onSponsorModeChange={async (mode) => {
                if (!team) return;
                const csrfToken = getCsrfToken();
                const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}) },
                  credentials: 'include',
                  body: JSON.stringify({ metadata: { ...((team as any)?.metadata || {}), sponsor_mode: mode } }),
                });
                if (res.ok) {
                  const raw = await res.json().catch(() => null);
                  const updated: any = (raw?.data ?? raw) as any;
                  setTeam((prev) => ({ ...(prev as any), ...(updated as any) }));
                }
              }}
            />
          )}

          {activeTabFromUrl === 'kits' && team && org && (
            <KitsTab
              projectSlug={team.slug || String(team.id)}
              projectName={team.name}
              brandProfileId={brandProfileId}
              orgId={String(org.id)}
            />
          )}
        </PageContent>
      </div>

      <ProjectDetailModal
        opened={isProjectDetailModalOpen}
        onClose={() => setIsProjectDetailModalOpen(false)}
        project={team}
      />

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => window.location.reload()}
        entityType="team"
        entityId={team?.slug || team?.id || ''}
        entityName={team?.name}
        organisationId={String(org?.id || '')}
        projectId={team?.slug || team?.id}
        initialEntityData={team ? {
          id: String(team.id),
          name: team.name || '',
          slug: team.slug,
          description: (team as any).description,
          is_active: (team as any).is_active ?? true,
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
