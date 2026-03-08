import React, { useMemo } from 'react';
import { Card, Input, Alert } from '@django-core/design-system';

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

type Project = {
  id: string;
  name: string;
  slug?: string;
};

export interface ClubHierarchyTabProps {
  club: Project;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  hierarchyTeams: Project[];
  hierarchySeasonsByTeamId: Record<string, Period[]>;
  hierarchyCompetitionsCountByTeamId: Record<string, number>;
  hierarchyMatchesCountByTeamId: Record<string, number>;
  hierarchyCompetitionsCountBySeasonId: Record<string, number>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyMembersCountByTeamId: Record<string, number>;
  hierarchyMembersCountForClub: number | null;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  navigate: (path: string) => void;
}

export function ClubHierarchyTab({
  club,
  orgKeyForRoutes,
  clubKeyForRoutes,
  hierarchySearch,
  setHierarchySearch,
  hierarchyTeams,
  hierarchySeasonsByTeamId,
  hierarchyCompetitionsCountByTeamId,
  hierarchyMatchesCountByTeamId,
  hierarchyCompetitionsCountBySeasonId,
  hierarchyMatchesCountBySeasonId,
  hierarchyMembersCountByTeamId,
  hierarchyMembersCountForClub,
  hierarchyLoading,
  hierarchyError,
  navigate,
}: ClubHierarchyTabProps) {
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

    return { teamsCount, seasonsCount, competitionsCount, matchesCount, membersCount };
  }, [
    visibleHierarchyTeams,
    hierarchySeasonsByTeamId,
    hierarchyCompetitionsCountByTeamId,
    hierarchyMatchesCountByTeamId,
    hierarchyMembersCountByTeamId,
    hierarchyMembersCountForClub,
  ]);

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--app-border)',
    background: 'var(--app-surface-2)',
    fontSize: 'var(--text-xs)',
    color: 'var(--app-muted-text)',
    fontWeight: 'var(--font-semibold)',
  };

  const seasonRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--app-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--app-surface)',
  };

  return (
    <Card>
      <div className="flex-between gap-12">
        <div>
          <div className="fs-16 fw-700">Hierarchy</div>
          <div className="text-muted fs-13">Teams → seasons</div>
        </div>
        <Input
          value={hierarchySearch}
          onChange={(e) => setHierarchySearch((e.target as any).value)}
          placeholder="Search teams / seasons…"
        />
      </div>

      {hierarchyError && (
        <div className="mt-12">
          <Alert variant="error">{hierarchyError}</Alert>
        </div>
      )}

      {hierarchyLoading && hierarchyTeams.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 mt-12">Loading hierarchy...</div>
      ) : hierarchyTeams.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 mt-12">No teams found.</div>
      ) : visibleHierarchyTeams.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 mt-12">No teams found.</div>
      ) : (
        <div className="mt-12 flex-col gap-10">
          {/* Club summary row */}
          <div className="border bg-surface overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex-between gap-12 border-bottom bg-surface-2" style={{ padding: 'var(--space-3) var(--space-3)' }}>
              <div className="flex-col gap-2 min-w-0">
                <div className="fw-800 fs-14 text-primary">{club?.name || 'Club'}</div>
              </div>
              <div className="flex-row gap-8 flex-wrap justify-end">
                <span style={pillStyle}>Teams: {hierarchyTotals.teamsCount}</span>
                <span style={pillStyle}>Members: {hierarchyTotals.membersCount}</span>
                <span style={pillStyle}>Seasons: {hierarchyTotals.seasonsCount}</span>
                <span style={pillStyle}>Competitions: {hierarchyTotals.competitionsCount}</span>
                <span style={pillStyle}>Matches: {hierarchyTotals.matchesCount}</span>
              </div>
            </div>
          </div>

          {/* Team rows with seasons */}
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
              <div key={team.id} className="border bg-surface overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="flex-between gap-12 border-bottom bg-surface-2" style={{ padding: 'var(--space-3) var(--space-3)' }}>
                  <div className="flex-col gap-2 min-w-0">
                    {teamPath ? (
                      <button
                        type="button"
                        className="app-unstyled-button hover:underline text-left fw-800 fs-14"
                        onClick={() => navigate(teamPath)}
                        style={{ color: 'var(--color-blue-400)' }}
                      >
                        {team.name}
                      </button>
                    ) : (
                      <div className="fw-800 fs-14 text-primary">{team.name}</div>
                    )}
                  </div>

                  <div className="flex-row gap-8 flex-wrap justify-end">
                    <span style={pillStyle}>Members: {membersCount}</span>
                    <span style={pillStyle}>Seasons: {seasonsAll.length}</span>
                    <span style={pillStyle}>Competitions: {competitionsCount}</span>
                    <span style={pillStyle}>Matches: {matchesCount}</span>
                    {teamPath ? (
                      <button
                        type="button"
                        className="app-action-button action-btn action-btn-primary"
                        onClick={() => navigate(teamPath)}
                      >
                        View Team
                      </button>
                    ) : null}
                  </div>
                </div>

                <div style={{ padding: 'var(--space-3) var(--space-3)' }}>
                  {seasons.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">No seasons.</div>
                  ) : (
                    <div className="flex-col gap-8">
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
                            <div className="min-w-0">
                              {seasonPath ? (
                                <button
                                  type="button"
                                  className="app-unstyled-button hover:underline text-left fw-700 fs-13"
                                  onClick={() => navigate(seasonPath)}
                                  style={{ color: 'var(--color-blue-400)' }}
                                >
                                  {String((s as any)?.name || 'Season')}
                                </button>
                              ) : (
                                <div className="fw-700 fs-13 text-primary">
                                  {String((s as any)?.name || 'Season')}
                                </div>
                              )}
                            </div>

                            <div className="flex-row gap-8 flex-wrap justify-end">
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
        </div>
      )}
    </Card>
  );
}
