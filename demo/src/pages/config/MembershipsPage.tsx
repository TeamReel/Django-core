import React, { useEffect, useMemo, useState } from 'react';
import { Card, Alert, Button } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { logger } from '@/utils/logger';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { api } from '@/api';
import styles from './MembershipsPage.module.css';

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
  metadata?: Record<string, unknown>;
};

export const MembershipsPage: React.FC = () => {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  useSetBackNavigation({ label: 'Profile', path: '/profile' });

  const organisations: Record<string, unknown>[] = Array.isArray(user?.organisations) ? user.organisations : [];
  const projects: Record<string, unknown>[] = Array.isArray(user?.projects) ? user.projects : [];

  const clubs = useMemo(() => {
    return projects.filter((p) => !p?.parent && !p?.parent_id && !p?.parentId);
  }, [projects]);

  const teams = useMemo(() => {
    return projects.filter((p) => Boolean(p?.parent || p?.parent_id || p?.parentId));
  }, [projects]);

  const orgIdForSeasons = useMemo(() => {
    const ctxOrgId = String(context.organisation?.id || '').trim();
    if (ctxOrgId) return ctxOrgId;
    const firstOrgId = String(organisations?.[0]?.id || '').trim();
    return firstOrgId;
  }, [context, organisations]);

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

        const { results } = await api.list<Period>('/periods/', {
          params: { organisation_id: orgIdForSeasons, parent_id: 'null' },
          pageSize: 100,
        });
        if (!cancelled) setSeasons(results);
      } catch (e) {
        logger.error('Failed to load seasons', e);
        if (!cancelled) setSeasonsError(e instanceof Error ? e.message : 'Failed to load seasons');
      } finally {
        if (!cancelled) setSeasonsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [orgIdForSeasons]);

  const ensureCompetitionsLoaded = async (seasonId: string) => {
    if (competitionsBySeason[seasonId]) return;
    setLoadingCompetitions((prev) => ({ ...prev, [seasonId]: true }));
    try {
      const { results } = await api.list<Period>(`/periods/${encodeURIComponent(seasonId)}/children/`);
      setCompetitionsBySeason((prev) => ({ ...prev, [seasonId]: results }));
    } finally {
      setLoadingCompetitions((prev) => ({ ...prev, [seasonId]: false }));
    }
  };

  const ensureMatchesLoaded = async (competitionId: string) => {
    if (matchesByCompetition[competitionId]) return;
    setLoadingMatches((prev) => ({ ...prev, [competitionId]: true }));
    try {
      const { results } = await api.list<Activity>('/activities/', {
        params: { period_id: competitionId },
        pageSize: 100,
      });
      setMatchesByCompetition((prev) => ({ ...prev, [competitionId]: results }));
    } finally {
      setLoadingMatches((prev) => ({ ...prev, [competitionId]: false }));
    }
  };

  return (
    <>
      <PageHeader
        title="Memberships"
        subtitle="Where you're a member across federations/clubs/teams"
      />

      <PageContent>
        {!user && (
          <Alert variant="error">Not signed in.</Alert>
        )}

        <div
          className={`grid gap-20 ${styles.cardGrid}`}
        >
          <Card className="p-24">
            <h3 className="text-lg font-semibold mb-2">Federations</h3>
            <div className="text-sm text-gray-600 mb-12">
              Organisations you belong to.
            </div>
            {organisations.length === 0 ? (
              <div className="text-sm text-gray-600">No organisation memberships found.</div>
            ) : (
              <div className="flex-col gap-8">
                {organisations.map((o) => (
                  <div
                    key={String(o?.id ?? o?.slug ?? Math.random())}
                    className={`flex-between rounded-8 border bg-surface ${styles.memberItem}`}
                  >
                    <div className="fw-700">{String(o?.name || o?.title || o?.slug || o?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(o?.role || o?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-24">
            <h3 className="text-lg font-semibold mb-2">Clubs</h3>
            <div className="text-sm text-gray-600 mb-12">
              Clubs you belong to.
            </div>
            {clubs.length === 0 ? (
              <div className="text-sm text-gray-600">No project memberships found.</div>
            ) : (
              <div className="flex-col gap-8">
                {clubs.map((p) => (
                  <div
                    key={String(p?.id ?? p?.slug ?? Math.random())}
                    className={`flex-between rounded-8 border bg-surface ${styles.memberItem}`}
                  >
                    <div className="fw-700">{String(p?.name || p?.title || p?.slug || p?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(p?.role || p?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-24">
            <h3 className="text-lg font-semibold mb-2">Teams</h3>
            <div className="text-sm text-gray-600 mb-12">
              Teams you belong to.
            </div>
            {teams.length === 0 ? (
              <div className="text-sm text-gray-600">No team memberships found.</div>
            ) : (
              <div className="flex-col gap-8">
                {teams.map((p) => (
                  <div
                    key={String(p?.id ?? p?.slug ?? Math.random())}
                    className={`flex-between rounded-8 border bg-surface ${styles.memberItem}`}
                  >
                    <div className="fw-700">{String(p?.name || p?.title || p?.slug || p?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(p?.role || p?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-24">
            <div className={styles.seasonsHeader}>
              <div>
                <h3 className="text-lg font-semibold mb-2">Seasons</h3>
                <div className="text-sm text-gray-600 mb-12">
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
              <div className="flex-col gap-8">
                {seasons.map((season) => {
                  const isOpen = Boolean(openSeasonIds[season.id]);
                  const comps = competitionsBySeason[season.id] || [];
                  const compsLoading = Boolean(loadingCompetitions[season.id]);

                  return (
                    <div key={season.id} className={styles.accordionContainer}>
                      <button
                        onClick={async () => {
                          setOpenSeasonIds((prev) => ({ ...prev, [season.id]: !isOpen }));
                          if (!isOpen) {
                            await ensureCompetitionsLoaded(season.id);
                          }
                        }}
                        className={styles.accordionButton}
                      >
                        <div>
                          <div className="fw-800">{String(season.name || season.id)}</div>
                          <div className="text-xs text-gray-500">
                            {(season.start_date || season.end_date) ? `${season.start_date || '—'} → ${season.end_date || '—'}` : ''}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{isOpen ? 'Hide' : 'Show'}</div>
                      </button>

                      {isOpen && (
                        <div className={styles.accordionPanel}>
                          {compsLoading ? (
                            <div className="text-sm text-gray-600">Loading competitions…</div>
                          ) : comps.length === 0 ? (
                            <div className="text-sm text-gray-600">No competitions found under this season.</div>
                          ) : (
                            <div className="flex-col gap-8">
                              {comps.map((comp) => {
                                const compOpen = Boolean(openCompetitionIds[comp.id]);
                                const matches = matchesByCompetition[comp.id] || [];
                                const matchesLoading = Boolean(loadingMatches[comp.id]);

                                return (
                                  <div key={comp.id} className={styles.accordionContainer}>
                                    <button
                                      onClick={async () => {
                                        setOpenCompetitionIds((prev) => ({ ...prev, [comp.id]: !compOpen }));
                                        if (!compOpen) {
                                          await ensureMatchesLoaded(comp.id);
                                        }
                                      }}
                                      className={styles.accordionButton}
                                    >
                                      <div className="fw-700">{String(comp.name || comp.id)}</div>
                                      <div className="text-xs text-gray-500">{compOpen ? 'Hide matches' : 'Show matches'}</div>
                                    </button>

                                    {compOpen && (
                                      <div className={styles.accordionPanel}>
                                        {matchesLoading ? (
                                          <div className="text-sm text-gray-600">Loading matches…</div>
                                        ) : matches.length === 0 ? (
                                          <div className="text-sm text-gray-600">No matches found.</div>
                                        ) : (
                                          <div className="flex-col gap-6">
                                            {matches.slice(0, 20).map((m) => {
                                              const label = String(m.title || m.name || m.metadata?.title || m.metadata?.name || m.id);
                                              const when = String(m.start_datetime || m.start_date || '').trim();
                                              return (
                                                <div key={m.id} className={`flex-between rounded-8 border bg-surface ${styles.matchItem}`}>
                                                  <div className="fw-600">{label}</div>
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
