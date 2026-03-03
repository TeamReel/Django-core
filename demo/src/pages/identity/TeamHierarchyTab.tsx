import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Input } from '@django-core/design-system';

import { type Period } from './teamDetailTypes';

interface TeamHierarchyTabProps {
  hierarchySeasons: Period[];
  hierarchyCompetitionsBySeasonId: Record<string, Period[]>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyMatchesCountByCompetitionId: Record<string, number>;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  teamKeyForRoutes: string;
}

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

export function TeamHierarchyTab({
  hierarchySeasons,
  hierarchyCompetitionsBySeasonId,
  hierarchyMatchesCountBySeasonId,
  hierarchyMatchesCountByCompetitionId,
  hierarchyLoading,
  hierarchyError,
  hierarchySearch,
  setHierarchySearch,
  orgKeyForRoutes,
  clubKeyForRoutes,
  teamKeyForRoutes,
}: TeamHierarchyTabProps) {
  const navigate = useNavigate();

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
    <Card>
      <div className="flex-between gap-12">
        <div>
          <div className="fs-16 fw-700">Hierarchy</div>
          <div className="text-muted fs-13">Seasons → competitions</div>
        </div>
        <Input
          value={hierarchySearch}
          onChange={(e) => setHierarchySearch((e.target as any).value)}
          placeholder="Search seasons / competitions…"
        />
      </div>

      {hierarchyError && (
        <div className="mt-12">
          <Alert variant="error">{hierarchyError}</Alert>
        </div>
      )}

      {hierarchyLoading && hierarchySeasons.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 mt-12">
          Loading hierarchy...
        </div>
      ) : hierarchySeasons.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 mt-12">
          No seasons found.
        </div>
      ) : (
        <div className="mt-12 flex-col gap-10">
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
                className="border bg-surface overflow-hidden"
                style={{ borderRadius: 10 }}
              >
                <div
                  className="flex-between border-bottom bg-surface-2 gap-12"
                  style={{ padding: '10px 12px' }}
                >
                  <div className="flex-col gap-2 min-w-0">
                    {seasonPath ? (
                      <button
                        type="button"
                        className="app-unstyled-button hover:underline text-left fw-800 fs-14"
                        onClick={() => navigate(seasonPath)}
                        style={{ color: '#60a5fa' }}
                      >
                        {String((season as any)?.name || 'Season')}
                      </button>
                    ) : (
                      <div className="fw-800 fs-14 text-primary">
                        {String((season as any)?.name || 'Season')}
                      </div>
                    )}
                  </div>

                  <div className="flex-row gap-8 flex-wrap" style={{ justifyContent: 'flex-end' }}>
                    <span style={pillStyle}>Competitions: {competitionsAll.length}</span>
                    <span style={pillStyle}>Matches: {seasonMatches}</span>
                  </div>
                </div>

                <div style={{ padding: '10px 12px' }}>
                  {competitions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">No competitions.</div>
                  ) : (
                    <div className="flex-col gap-8">
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
                            <div className="min-w-0">
                              {competitionPath ? (
                                <button
                                  type="button"
                                  className="app-unstyled-button hover:underline text-left fw-700 fs-13"
                                  onClick={() => navigate(competitionPath)}
                                  style={{ color: '#60a5fa' }}
                                >
                                  {String((c as any)?.name || 'Competition')}
                                </button>
                              ) : (
                                <div className="fw-700 fs-13 text-primary">{String((c as any)?.name || 'Competition')}</div>
                              )}
                            </div>

                            <div className="flex-row gap-8 flex-wrap" style={{ justifyContent: 'flex-end' }}>
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
        </div>
      )}
    </Card>
  );
}
