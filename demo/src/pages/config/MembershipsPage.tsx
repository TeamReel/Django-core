import React, { useEffect, useMemo, useState } from 'react';
import { Card, Alert, Button } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';

type Period = {
  id: string;
  name?: string;
  start_date?: string;
  end_date?: string;
};

type Activity = {
  id: string;
  name?: string;
  title?: string;
  start_datetime?: string;
  start_date?: string;
  metadata?: any;
};

const unwrap = <T,>(raw: any): T => (raw?.data ?? raw) as T;

const extractList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const MembershipsPage: React.FC = () => {
  const { user } = useAuth();
  const { context } = useContextSwitcher();

  const organisations: any[] = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
  const projects: any[] = Array.isArray((user as any)?.projects) ? (user as any).projects : [];

  const clubs = useMemo(() => {
    return projects.filter((p) => !p?.parent && !p?.parent_id && !p?.parentId);
  }, [projects]);

  const teams = useMemo(() => {
    return projects.filter((p) => Boolean(p?.parent || p?.parent_id || p?.parentId));
  }, [projects]);

  const orgIdForSeasons = useMemo(() => {
    const ctxOrgId = String((context as any)?.organisation?.id || '').trim();
    if (ctxOrgId) return ctxOrgId;
    const firstOrgId = String(organisations?.[0]?.id || '').trim();
    return firstOrgId;
  }, [context, organisations]);

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL || '', []);

  const [seasons, setSeasons] = useState<Period[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);

  const [openSeasonIds, setOpenSeasonIds] = useState<Record<string, boolean>>({});
  const [openCompetitionIds, setOpenCompetitionIds] = useState<Record<string, boolean>>({});
  const [competitionsBySeason, setCompetitionsBySeason] = useState<Record<string, Period[]>>({});
  const [matchesByCompetition, setMatchesByCompetition] = useState<Record<string, Activity[]>>({});
  const [loadingCompetitions, setLoadingCompetitions] = useState<Record<string, boolean>>({});
  const [loadingMatches, setLoadingMatches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!orgIdForSeasons) return;

    let cancelled = false;
    const run = async () => {
      try {
        setSeasonsLoading(true);
        setSeasonsError(null);

        const params = new URLSearchParams();
        params.set('organisation_id', orgIdForSeasons);
        params.set('parent_id', 'null');
        params.set('page_size', '100');
        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Failed to load seasons (${res.status})`);
        const raw = await res.json();
        const data = unwrap<any>(raw);
        const list = extractList(data);
        if (!cancelled) setSeasons(list as Period[]);
      } catch (e) {
        if (!cancelled) setSeasonsError(e instanceof Error ? e.message : 'Failed to load seasons');
      } finally {
        if (!cancelled) setSeasonsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, orgIdForSeasons]);

  const ensureCompetitionsLoaded = async (seasonId: string) => {
    if (competitionsBySeason[seasonId]) return;
    setLoadingCompetitions((prev) => ({ ...prev, [seasonId]: true }));
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonId)}/children/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load competitions (${res.status})`);
      const raw = await res.json();
      const data = unwrap<any>(raw);
      const list = extractList(data);
      setCompetitionsBySeason((prev) => ({ ...prev, [seasonId]: list as Period[] }));
    } finally {
      setLoadingCompetitions((prev) => ({ ...prev, [seasonId]: false }));
    }
  };

  const ensureMatchesLoaded = async (competitionId: string) => {
    if (matchesByCompetition[competitionId]) return;
    setLoadingMatches((prev) => ({ ...prev, [competitionId]: true }));
    try {
      const params = new URLSearchParams();
      params.set('period_id', competitionId);
      params.set('page_size', '100');
      const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load matches (${res.status})`);
      const raw = await res.json();
      const data = unwrap<any>(raw);
      const list = extractList(data);
      setMatchesByCompetition((prev) => ({ ...prev, [competitionId]: list as Activity[] }));
    } finally {
      setLoadingMatches((prev) => ({ ...prev, [competitionId]: false }));
    }
  };

  return (
    <>
      <PageHeader
        title="Memberships"
        subtitle="Where you’re a member across federations/clubs/teams"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Preferences' },
          { label: 'Memberships' },
        ]}
      />

      <PageContent>
        {!user && (
          <Alert variant="error">Not signed in.</Alert>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <Card>
            <h3 className="text-lg font-semibold mb-2">Federations</h3>
            <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
              Organisations you belong to.
            </div>
            {organisations.length === 0 ? (
              <div className="text-sm text-gray-600">No organisation memberships found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {organisations.map((o) => (
                  <div
                    key={String(o?.id ?? o?.slug ?? Math.random())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      border: '1px solid var(--app-border)',
                      borderRadius: 8,
                      background: 'var(--app-surface)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{String(o?.name || o?.title || o?.slug || o?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(o?.role || o?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-2">Clubs</h3>
            <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
              Clubs you belong to.
            </div>
            {clubs.length === 0 ? (
              <div className="text-sm text-gray-600">No project memberships found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clubs.map((p) => (
                  <div
                    key={String(p?.id ?? p?.slug ?? Math.random())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      border: '1px solid var(--app-border)',
                      borderRadius: 8,
                      background: 'var(--app-surface)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{String(p?.name || p?.title || p?.slug || p?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(p?.role || p?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-2">Teams</h3>
            <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
              Teams you belong to.
            </div>
            {teams.length === 0 ? (
              <div className="text-sm text-gray-600">No team memberships found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teams.map((p) => (
                  <div
                    key={String(p?.id ?? p?.slug ?? Math.random())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      border: '1px solid var(--app-border)',
                      borderRadius: 8,
                      background: 'var(--app-surface)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{String(p?.name || p?.title || p?.slug || p?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(p?.role || p?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <h3 className="text-lg font-semibold mb-2">Seasons</h3>
                <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
                  Seasons in your active federation (trapsgewijs: Seasons → Competitions → Matches).
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // simple reload
                  setCompetitionsBySeason({});
                  setMatchesByCompetition({});
                  setOpenSeasonIds({});
                  setOpenCompetitionIds({});
                }}
              >
                Reset
              </Button>
            </div>

            {!orgIdForSeasons ? (
              <Alert variant="info">Select a federation (active context) to view seasons.</Alert>
            ) : seasonsError ? (
              <Alert variant="error">{seasonsError}</Alert>
            ) : seasonsLoading ? (
              <div className="text-sm text-gray-600">Loading seasons…</div>
            ) : seasons.length === 0 ? (
              <div className="text-sm text-gray-600">No seasons found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {seasons.map((season) => {
                  const isOpen = Boolean(openSeasonIds[season.id]);
                  const comps = competitionsBySeason[season.id] || [];
                  const compsLoading = Boolean(loadingCompetitions[season.id]);

                  return (
                    <div key={season.id} style={{ border: '1px solid var(--app-border)', borderRadius: 10, overflow: 'hidden' }}>
                      <button
                        onClick={async () => {
                          setOpenSeasonIds((prev) => ({ ...prev, [season.id]: !isOpen }));
                          if (!isOpen) {
                            await ensureCompetitionsLoaded(season.id);
                          }
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          background: 'var(--app-surface)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800 }}>{String(season.name || season.id)}</div>
                          <div className="text-xs text-gray-500">
                            {(season.start_date || season.end_date) ? `${season.start_date || '—'} → ${season.end_date || '—'}` : ''}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{isOpen ? 'Hide' : 'Show'}</div>
                      </button>

                      {isOpen && (
                        <div style={{ padding: '10px 12px', background: 'var(--app-surface-1)' }}>
                          {compsLoading ? (
                            <div className="text-sm text-gray-600">Loading competitions…</div>
                          ) : comps.length === 0 ? (
                            <div className="text-sm text-gray-600">No competitions found under this season.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {comps.map((comp) => {
                                const compOpen = Boolean(openCompetitionIds[comp.id]);
                                const matches = matchesByCompetition[comp.id] || [];
                                const matchesLoading = Boolean(loadingMatches[comp.id]);

                                return (
                                  <div key={comp.id} style={{ border: '1px solid var(--app-border)', borderRadius: 10, overflow: 'hidden' }}>
                                    <button
                                      onClick={async () => {
                                        setOpenCompetitionIds((prev) => ({ ...prev, [comp.id]: !compOpen }));
                                        if (!compOpen) {
                                          await ensureMatchesLoaded(comp.id);
                                        }
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '10px 12px',
                                        background: 'var(--app-surface)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                      }}
                                    >
                                      <div style={{ fontWeight: 700 }}>{String(comp.name || comp.id)}</div>
                                      <div className="text-xs text-gray-500">{compOpen ? 'Hide matches' : 'Show matches'}</div>
                                    </button>

                                    {compOpen && (
                                      <div style={{ padding: '10px 12px', background: 'var(--app-surface-1)' }}>
                                        {matchesLoading ? (
                                          <div className="text-sm text-gray-600">Loading matches…</div>
                                        ) : matches.length === 0 ? (
                                          <div className="text-sm text-gray-600">No matches found.</div>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {matches.slice(0, 20).map((m) => {
                                              const label = String(m.title || m.name || m.metadata?.title || m.metadata?.name || m.id);
                                              const when = String(m.start_datetime || m.start_date || '').trim();
                                              return (
                                                <div key={m.id} style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  padding: '8px 10px',
                                                  border: '1px solid var(--app-border)',
                                                  borderRadius: 8,
                                                  background: 'var(--app-surface)',
                                                }}>
                                                  <div style={{ fontWeight: 600 }}>{label}</div>
                                                  <div className="text-xs text-gray-500">{when ? when : '—'}</div>
                                                </div>
                                              );
                                            })}
                                            {matches.length > 20 && (
                                              <div className="text-xs text-gray-500">Showing first 20 matches…</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </PageContent>
    </>
  );
};

export default MembershipsPage;
