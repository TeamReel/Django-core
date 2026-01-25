import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader, type BreadcrumbSwitcherOption } from '@django-core/page-templates';

import { fetchAllPages } from '../../utils/fetchAllPages';

import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import TeamCreditsTab from './detail/TeamCreditsTab';

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

export default function TeamOrganisationDetailPage() {
  const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

  const [clubTeamsForSwitcher, setClubTeamsForSwitcher] = useState<Project[]>([]);
  const [clubTeamsForSwitcherLoading, setClubTeamsForSwitcherLoading] = useState(false);

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
    const allowed = new Set([
      'overview',
      'hierarchy',
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
      if (activeTabFromUrl !== 'hierarchy') return;
      if (!teamIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Seasons for this team (typed query first; fallback to untyped + competition parent seasons)
        const baseSeasonParams = new URLSearchParams();
        baseSeasonParams.set('page_size', '1000');
        baseSeasonParams.set('parent_id', 'null');

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
        const untypedList: any[] = typedList.length
          ? []
          : await fetchAllPages<any>(untypedUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });

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

        const seasonsRaw = typedList.length ? typedList : untypedList;
        const seasons = mergeUniqueById(
          [...(seasonsRaw || []), ...parentSeasonsFromCompetitions]
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
          subtitle="Team overview"
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
              <Button variant="secondary" size="sm" onClick={() => navigate(backToClubHref)}>
                Back
              </Button>
            </div>
          }
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => navigate(makeTabHref('seasons'))}>
                  <div className="text-sm font-medium text-gray-500">Seasons</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => navigate(makeTabHref('competitions'))}>
                  <div className="text-sm font-medium text-gray-500">Competitions</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => navigate(makeTabHref('members'))}>
                  <div className="text-sm font-medium text-gray-500">Members</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => navigate(makeTabHref('matches'))}>
                  <div className="text-sm font-medium text-gray-500">Active Matches</div>
                  <div className="text-2xl font-bold mt-1">—</div>
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
                                className="app-unstyled-button text-blue-600 hover:underline"
                                onClick={() => navigate(seasonPath)}
                                style={{ textAlign: 'left', fontWeight: 800, fontSize: 14 }}
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
                                        className="app-unstyled-button text-blue-600 hover:underline"
                                        onClick={() => navigate(competitionPath)}
                                        style={{ textAlign: 'left', fontWeight: 700, fontSize: 13 }}
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
            />
          )}

          {activeTabFromUrl === 'competitions' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <CompetitionsList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
            />
          )}

          {activeTabFromUrl === 'matches' && orgSlugForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <MatchesList
              preselectedOrgId={orgSlugForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
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
        </PageContent>
      </div>
    </>
  );
}
