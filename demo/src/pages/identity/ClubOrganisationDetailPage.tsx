import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';

import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';

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

export default function ClubOrganisationDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

  const [org, setOrg] = useState<Organisation | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hierarchyTeams, setHierarchyTeams] = useState<Project[]>([]);
  const [hierarchySeasonsByTeamId, setHierarchySeasonsByTeamId] = useState<Record<string, Period[]>>({});
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    // Back-compat: older club detail pages used `people`/`users`.
    const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
    const allowed = new Set(['overview', 'hierarchy', 'teams', 'seasons', 'competitions', 'matches', 'members']);
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
        if (!orgSlugOrId || !clubSlugOrId) {
          throw new Error('Missing organisation or club identifier.');
        }

        const [orgRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, {
            credentials: 'include',
          }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
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
  }, [apiBaseUrl, orgSlugOrId, clubSlugOrId]);

  const orgIdForDirectoryLists = useMemo(() => {
    const id = String(org?.id || '').trim();
    return id;
  }, [org?.id]);

  const clubIdForDirectoryLists = useMemo(() => {
    const id = String(club?.id || '').trim();
    return id;
  }, [club?.id]);

  const orgKeyForRoutes = useMemo(() => String(org?.slug || orgSlugOrId || '').trim(), [org?.slug, orgSlugOrId]);
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
    // Must be a root period.
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

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      if (activeTabFromUrl !== 'hierarchy') return;
      if (!orgIdForDirectoryLists || !clubIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Fetch teams under this club (direct children)
        const teamsRes = await fetch(
          `${apiBaseUrl}/api/v1/projects/?parent_project=${encodeURIComponent(clubIdForDirectoryLists)}&page_size=250`,
          { credentials: 'include' },
        );

        if (!teamsRes.ok) throw new Error(`Failed to load teams (${teamsRes.status})`);
        const teamsJson = await teamsRes.json().catch(() => null);
        const teamsRaw = unwrapEnvelope<any>(teamsJson);
        const teamsList: any[] = Array.isArray(teamsRaw?.results) ? teamsRaw.results : Array.isArray(teamsRaw) ? teamsRaw : [];

        const filteredTeams = teamsList
          .filter((t: any) => {
            const oid = getOrganisationId(t);
            return !oid || oid === String(orgIdForDirectoryLists);
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
            params.set('type', 'season');
            params.set('parent_id', 'null');
            params.set('page_size', '500');
            const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
            if (!res.ok) throw new Error(`Failed to load seasons (${res.status})`);
            const json = await res.json().catch(() => null);
            const raw = unwrapEnvelope<any>(json);
            if (Array.isArray(raw?.results)) return raw.results;
            if (Array.isArray(raw)) return raw;
            return [];
          }),
        );

        const mergedSeasons = mergeUniqueById((seasonsChunks.flat() as any[]).filter(isSeasonPeriod));

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
      } catch (e) {
        if (cancelled) return;
        setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setHierarchyTeams([]);
        setHierarchySeasonsByTeamId({});
      } finally {
        if (!cancelled) setHierarchyLoading(false);
      }
    };

    void loadHierarchy();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists, orgIdForDirectoryLists]);

  const backToOrgHref = useMemo(() => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return '/federations';

    // Mirror federation layout: go back to org page, clubs tab.
    const params = new URLSearchParams(location.search || '');
    params.set('tab', 'clubs');
    return `/${encodeURIComponent(orgKey)}?${params.toString()}`;
  }, [location.search, org?.slug, orgSlugOrId]);

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

  return (
    <>
      <div className="club-detail-page">
        <PageHeader
          title={club.name}
          subtitle="Club overview"
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate(backToOrgHref)}>
                Back
              </Button>
            </div>
          }
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('teams'))}>
                  <div className="text-sm font-medium text-gray-500">Teams</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                </Card>
                <Card style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(makeTabHref('seasons'))}>
                  <div className="text-sm font-medium text-gray-500">Seasons</div>
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
                </div>
              </Card>
            </div>
          )}

          {activeTabFromUrl === 'hierarchy' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <div className="space-y-4">
              {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}

              {hierarchyLoading ? (
                <Card>
                  <div className="text-sm text-gray-500" style={{ padding: 16 }}>
                    Loading hierarchy...
                  </div>
                </Card>
              ) : hierarchyTeams.length === 0 ? (
                <Card>
                  <div className="text-sm text-gray-500" style={{ padding: 16 }}>
                    No teams found.
                  </div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {hierarchyTeams.map((team) => {
                    const teamKey = String(team?.slug || team?.id || '').trim();
                    const teamPath =
                      orgKeyForRoutes && clubKeyForRoutes && teamKey
                        ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKey)}`
                        : '';

                    const seasons = hierarchySeasonsByTeamId[String(team.id)] || [];
                    const seasonPillStyle: React.CSSProperties = {
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
                            <div style={{ color: 'var(--app-muted-text)', fontSize: 12 }}>Team</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span style={seasonPillStyle}>Seasons: {seasons.length}</span>
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px' }}>
                          {seasons.length === 0 ? (
                            <div className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
                              No seasons.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {seasons.map((s) => {
                                const seasonKey = String((s as any)?.slug || (s as any)?.id || '').trim();
                                const seasonPath =
                                  teamPath && seasonKey
                                    ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKey)}/${encodeURIComponent(seasonKey)}`
                                    : '';
                                return seasonPath ? (
                                  <button
                                    key={String(s.id)}
                                    type="button"
                                    className="app-unstyled-button"
                                    onClick={() => navigate(seasonPath)}
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
                                    {String((s as any)?.name || 'Season')}
                                  </button>
                                ) : (
                                  <span
                                    key={String(s.id)}
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
                                    {String((s as any)?.name || 'Season')}
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

          {activeTabFromUrl === 'teams' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'seasons' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <SeasonsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'competitions' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <CompetitionsList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'matches' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <MatchesList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'members' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <UsersList preselectedOrgId={orgIdForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}
        </PageContent>
      </div>
    </>
  );
}
