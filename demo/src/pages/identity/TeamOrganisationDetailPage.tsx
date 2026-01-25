import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader, type BreadcrumbSwitcherOption } from '@django-core/page-templates';

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

const isSeasonPeriod = (p: any): boolean => {
  const parentId = getParentPeriodId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;

  const name = String(p?.name || '').toLowerCase();
  if (name.startsWith('season') || name.startsWith('seizoen')) return true;

  const seasonKey = p?.data?.season ?? p?.metadata?.season;
  if (seasonKey) return true;

  return false;
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

  const [org, setOrg] = useState<Organisation | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [team, setTeam] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hierarchySeasons, setHierarchySeasons] = useState<Period[]>([]);
  const [hierarchyCompetitionsBySeasonId, setHierarchyCompetitionsBySeasonId] = useState<Record<string, Period[]>>({});
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);

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

        const [orgRes, clubRes, teamRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, { credentials: 'include' }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' },
          ),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(teamSlugOrId)}/`,
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
  }, [apiBaseUrl, clubSlugOrId, orgSlugOrId, teamSlugOrId]);

  const orgIdForDirectoryLists = useMemo(() => String(org?.id || '').trim(), [org?.id]);
  const clubIdForDirectoryLists = useMemo(() => String(club?.id || '').trim(), [club?.id]);
  const teamIdForDirectoryLists = useMemo(() => String(team?.id || '').trim(), [team?.id]);

  const orgKeyForRoutes = useMemo(() => String(org?.slug || orgSlugOrId || '').trim(), [org?.slug, orgSlugOrId]);
  const clubKeyForRoutes = useMemo(() => String(club?.slug || clubSlugOrId || '').trim(), [club?.slug, clubSlugOrId]);
  const teamKeyForRoutes = useMemo(() => String(team?.slug || teamSlugOrId || '').trim(), [team?.slug, teamSlugOrId]);

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

    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey || !desiredClubKey || !desiredTeamKey) return;

    navigate(
      `/${encodeURIComponent(orgKey)}/${encodeURIComponent(desiredClubKey)}/${encodeURIComponent(desiredTeamKey)}${location.search || ''}`,
      { replace: true },
    );
  }, [club, clubSlugOrId, location.search, navigate, org, orgSlugOrId, shouldResolveClub, shouldResolveTeam, team, teamSlugOrId]);

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      if (activeTabFromUrl !== 'hierarchy') return;
      if (!teamIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Seasons for this team
        const seasonParams = new URLSearchParams();
        seasonParams.set('project_id', teamIdForDirectoryLists);
        seasonParams.set('type', 'season');
        seasonParams.set('page_size', '500');

        const seasonsRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${seasonParams.toString()}`, { credentials: 'include' });
        if (!seasonsRes.ok) throw new Error(`Failed to load seasons (${seasonsRes.status})`);
        const seasonsJson = await seasonsRes.json().catch(() => null);
        const seasonsRaw = unwrapEnvelope<any>(seasonsJson);
        const seasonsList: any[] = Array.isArray(seasonsRaw?.results)
          ? seasonsRaw.results
          : Array.isArray(seasonsRaw)
            ? seasonsRaw
            : [];

        const seasons = mergeUniqueById(
          (seasonsList || [])
            .filter(isSeasonPeriod)
            .filter((p: any) => getParentPeriodId(p) == null),
        );
        seasons.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

        if (cancelled) return;
        setHierarchySeasons(seasons);

        // 2) Competitions for this team (fetch all periods for the team and group by season parent id)
        const periodsParams = new URLSearchParams();
        periodsParams.set('project_id', teamIdForDirectoryLists);
        periodsParams.set('page_size', '1000');

        const periodsRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${periodsParams.toString()}`, { credentials: 'include' });
        if (!periodsRes.ok) throw new Error(`Failed to load competitions (${periodsRes.status})`);
        const periodsJson = await periodsRes.json().catch(() => null);
        const periodsRaw = unwrapEnvelope<any>(periodsJson);
        const periodsList: any[] = Array.isArray(periodsRaw?.results)
          ? periodsRaw.results
          : Array.isArray(periodsRaw)
            ? periodsRaw
            : [];

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

        if (cancelled) return;
        setHierarchyCompetitionsBySeasonId(bySeason);
      } catch (e) {
        if (cancelled) return;
        setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setHierarchySeasons([]);
        setHierarchyCompetitionsBySeasonId({});
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
      try {
        const orgKey = String(org?.slug || orgSlugOrId || '').trim();
        const url = orgKey
          ? `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgKey)}/projects/?page_size=500&include_archived=true&parent_project=${encodeURIComponent(clubIdForDirectoryLists)}`
          : `${apiBaseUrl}/api/v1/projects/?parent_project=${encodeURIComponent(clubIdForDirectoryLists)}&page_size=250`;

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load club teams (${res.status})`);
        const json = await res.json().catch(() => null);
        const raw = unwrapEnvelope<any>(json);
        const results: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
        const list = mergeUniqueById(
          (results || []).filter((t: any) => {
            const parentId =
              (t as any)?.parent_id ??
              (t as any)?.parent_project_id ??
              (t as any)?.parent_project?.id ??
              (typeof (t as any)?.parent_project === 'object' ? (t as any)?.parent_project?.id : (t as any)?.parent_project) ??
              null;
            if (parentId == null) return false;
            return String(typeof parentId === 'object' ? parentId.id : parentId) === String(clubIdForDirectoryLists);
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
  }, [apiBaseUrl, clubIdForDirectoryLists]);

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
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('seasons'))}>
                  <div className="text-sm font-medium text-gray-500">Seasons</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('competitions'))}>
                  <div className="text-sm font-medium text-gray-500">Competitions</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('members'))}>
                  <div className="text-sm font-medium text-gray-500">Members</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('matches'))}>
                  <div className="text-sm font-medium text-gray-500">Matches</div>
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
                </div>
              </Card>
            </div>
          )}

          {activeTabFromUrl === 'hierarchy' && teamIdForDirectoryLists && (
            <div className="space-y-4">
              {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}

              {hierarchyLoading ? (
                <Card>
                  <div className="text-sm text-gray-500" style={{ padding: 16 }}>
                    Loading hierarchy...
                  </div>
                </Card>
              ) : hierarchySeasons.length === 0 ? (
                <Card>
                  <div className="text-sm text-gray-500" style={{ padding: 16 }}>
                    No seasons found.
                  </div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {hierarchySeasons.map((season) => {
                    const seasonKey = String((season as any)?.slug || (season as any)?.id || '').trim();
                    const seasonPath =
                      orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
                        ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
                        : '';

                    const competitions = hierarchyCompetitionsBySeasonId[String(season.id)] || [];

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
                            <div style={{ color: 'var(--app-muted-text)', fontSize: 12 }}>Season</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span
                              style={{
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
                              }}
                            >
                              Competitions: {competitions.length}
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px' }}>
                          {competitions.length === 0 ? (
                            <div className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
                              No competitions.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {competitions.map((c) => {
                                const competitionKey = String((c as any)?.slug || (c as any)?.id || '').trim();
                                const competitionPath =
                                  orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey && competitionKey
                                    ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}/${encodeURIComponent(competitionKey)}`
                                    : '';

                                return competitionPath ? (
                                  <button
                                    key={String((c as any)?.id)}
                                    type="button"
                                    className="app-unstyled-button"
                                    onClick={() => navigate(competitionPath)}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 999,
                                      border: '1px solid var(--app-border)',
                                      background: 'var(--app-surface-2)',
                                      fontSize: 12,
                                      color: 'var(--app-text)',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {String((c as any)?.name || 'Competition')}
                                  </button>
                                ) : (
                                  <span
                                    key={String((c as any)?.id)}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 999,
                                      border: '1px solid var(--app-border)',
                                      background: 'var(--app-surface-2)',
                                      fontSize: 12,
                                      color: 'var(--app-text)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {String((c as any)?.name || 'Competition')}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTabFromUrl === 'seasons' && orgIdForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <SeasonsList
              preselectedOrgId={orgIdForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
            />
          )}

          {activeTabFromUrl === 'competitions' && orgIdForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <CompetitionsList
              preselectedOrgId={orgIdForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
            />
          )}

          {activeTabFromUrl === 'matches' && orgIdForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <MatchesList
              preselectedOrgId={orgIdForDirectoryLists}
              preselectedClubId={clubIdForDirectoryLists}
              preselectedTeamId={teamIdForDirectoryLists}
            />
          )}

          {activeTabFromUrl === 'members' && orgIdForDirectoryLists && clubIdForDirectoryLists && teamIdForDirectoryLists && (
            <UsersList
              preselectedOrgId={orgIdForDirectoryLists}
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
