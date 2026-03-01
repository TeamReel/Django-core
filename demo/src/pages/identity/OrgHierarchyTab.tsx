import React, { useMemo } from 'react';
import { Card, Input } from '@django-core/design-system';
import { Project } from '../../types';
import { actionButtonStyle } from '../../utils/directoryStyles';

export interface OrgHierarchyTabProps {
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  teams: Project[];
  clubsForHierarchy: any[];
  membershipUserCounts: { clubUsersCountById: Record<string, number>; teamUsersCountById: Record<string, number> };
  teamSeasonsCountById: Record<string, number>;
  teamCompetitionsCountById: Record<string, number>;
  teamMatchesCountById: Record<string, number>;
  teamsLoading: boolean;
  orgSlugOrId: string;
  currentOrgSlug: string | undefined;
  id: string | undefined;
  navigate: (path: string) => void;
}

interface ClubRow {
  clubId: string;
  clubName: string;
  clubSlugOrId: string;
  memberCount: number;
  teamCount: number;
  seasonsCount: number;
  competitionsCount: number;
  matchesCount: number;
  teams: TeamRow[];
}

interface TeamRow {
  teamId: string;
  teamName: string;
  teamSlugOrId: string;
  memberCount: number;
  seasonsCount: number;
  competitionsCount: number;
  matchesCount: number;
}

export function OrgHierarchyTab({
  hierarchySearch,
  setHierarchySearch,
  teams,
  clubsForHierarchy,
  membershipUserCounts,
  teamSeasonsCountById,
  teamCompetitionsCountById,
  teamMatchesCountById,
  teamsLoading,
  orgSlugOrId,
  currentOrgSlug,
  id,
  navigate,
}: OrgHierarchyTabProps) {
  const hierarchyGroups = useMemo((): ClubRow[] => {
    const q = String(hierarchySearch || '').trim().toLowerCase();
    const toSlugOrId = (p: any) => String(p?.slug || p?.id || '').trim();
    const toName = (p: any) => String(p?.name || p?.title || p?.slug || p?.id || '').trim();

    const clubUsersCountById = membershipUserCounts?.clubUsersCountById || {};
    const teamUsersCountById = membershipUserCounts?.teamUsersCountById || {};

    const teamSeasons = teamSeasonsCountById || {};
    const teamCompetitions = teamCompetitionsCountById || {};
    const teamMatches = teamMatchesCountById || {};

    const teamsByClubId = new Map<string, any[]>();
    for (const t of teams || []) {
      const parent = (t as any)?.parent_id ?? (t as any)?.parent ?? (t as any)?.parent_project_id ?? (t as any)?.parent_project?.id ?? null;
      const clubId = parent != null ? String(parent) : '';
      if (!clubId) continue;
      if (!teamsByClubId.has(clubId)) teamsByClubId.set(clubId, []);
      teamsByClubId.get(clubId)!.push(t as any);
    }

    const clubRows = (clubsForHierarchy || []).map((c) => {
      const clubId = String((c as any)?.id || '').trim();
      const clubName = toName(c) || '—';
      const clubSlugOrId = toSlugOrId(c);

      const clubTeams = (teamsByClubId.get(clubId) || []).slice();
      clubTeams.sort((a: any, b: any) => toName(a).localeCompare(toName(b), undefined, { sensitivity: 'base' }));

      const mappedTeams: TeamRow[] = clubTeams.map((t: any) => {
        const teamId = String(t?.id || '').trim();
        return {
          teamId,
          teamName: toName(t) || '—',
          teamSlugOrId: toSlugOrId(t),
          memberCount: teamId ? (teamUsersCountById[teamId] ?? 0) : 0,
          seasonsCount: teamId ? (teamSeasons[teamId] ?? 0) : 0,
          competitionsCount: teamId ? (teamCompetitions[teamId] ?? 0) : 0,
          matchesCount: teamId ? (teamMatches[teamId] ?? 0) : 0,
        };
      });

      const clubMemberCount = clubId ? (clubUsersCountById[clubId] ?? 0) : 0;
      const teamCount = mappedTeams.length;
      const clubSeasonsCount = mappedTeams.reduce((sum, t) => sum + (t.seasonsCount ?? 0), 0);
      const clubCompetitionsCount = mappedTeams.reduce((sum, t) => sum + (t.competitionsCount ?? 0), 0);
      const clubMatchesCount = mappedTeams.reduce((sum, t) => sum + (t.matchesCount ?? 0), 0);

      if (q) {
        const clubMatch = clubName.toLowerCase().includes(q);
        const teamsMatch = mappedTeams.some((t) => t.teamName.toLowerCase().includes(q));
        if (!clubMatch && !teamsMatch) return null;
        const filteredTeams = clubMatch ? mappedTeams : mappedTeams.filter((t) => t.teamName.toLowerCase().includes(q));
        return {
          clubId,
          clubName,
          clubSlugOrId,
          memberCount: clubMemberCount,
          teamCount: filteredTeams.length,
          seasonsCount: clubSeasonsCount,
          competitionsCount: clubCompetitionsCount,
          matchesCount: clubMatchesCount,
          teams: filteredTeams,
        };
      }

      return {
        clubId,
        clubName,
        clubSlugOrId,
        memberCount: clubMemberCount,
        teamCount,
        seasonsCount: clubSeasonsCount,
        competitionsCount: clubCompetitionsCount,
        matchesCount: clubMatchesCount,
        teams: mappedTeams,
      };
    }).filter(Boolean) as ClubRow[];

    clubRows.sort((a, b) => a.clubName.localeCompare(b.clubName, undefined, { sensitivity: 'base' }));
    return clubRows;
  }, [teams, clubsForHierarchy, hierarchySearch, membershipUserCounts, teamSeasonsCountById, teamCompetitionsCountById, teamMatchesCountById]);

  const orgKey = String(orgSlugOrId || currentOrgSlug || id || '').trim();

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

  return (
    <Card>
      <div className="flex-between gap-12">
        <div>
          <div className="fs-16 fw-700">Hierarchy</div>
          <div className="text-muted fs-13">
            Clubs → teams
          </div>
        </div>
        <Input
          value={hierarchySearch}
          onChange={(e) => setHierarchySearch((e.target as any).value)}
          placeholder="Search clubs / teams…"
        />
      </div>

      {teamsLoading && hierarchyGroups.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 mt-12">
          Loading hierarchy...
        </div>
      ) : hierarchyGroups.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 mt-12">
          No clubs/teams found.
        </div>
      ) : (
        <div className="flex-col mt-12 gap-10">
          {hierarchyGroups.map((club) => {
            const clubPath = orgKey && club.clubSlugOrId ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(club.clubSlugOrId)}` : '';

            return (
              <div
                key={club.clubId || club.clubSlugOrId}
                className="border overflow-hidden"
                style={{
                  borderRadius: 10,
                  background: 'var(--app-surface)',
                }}
              >
                <div
                  className="flex-between border-bottom gap-12"
                  style={{
                    padding: '10px 12px',
                    background: 'var(--app-surface-2)',
                  }}
                >
                  <div className="flex-col gap-2 min-w-0">
                    {clubPath ? (
                      <button
                        type="button"
                        className="app-unstyled-button hover:underline text-left fw-800 fs-14"
                        onClick={() => navigate(clubPath)}
                        style={{ color: '#60a5fa' }}
                      >
                        {club.clubName}
                      </button>
                    ) : (
                      <div className="fw-800 fs-14 text-primary">{club.clubName}</div>
                    )}
                  </div>

                  <div className="flex-row gap-8 flex-wrap" style={{ justifyContent: 'flex-end' }}>
                    <span style={pillStyle}>Teams: {club.teamCount}</span>
                    <span style={pillStyle}>Members: {club.memberCount}</span>
                    <span style={pillStyle}>Seasons: {club.seasonsCount ?? 0}</span>
                    <span style={pillStyle}>Competitions: {club.competitionsCount ?? 0}</span>
                    <span style={pillStyle}>Matches: {club.matchesCount ?? 0}</span>
                    {clubPath ? (
                      <button type="button" className="app-action-button" onClick={() => navigate(clubPath)} style={actionButtonStyle('primary')}>
                        View Club
                      </button>
                    ) : null}
                  </div>
                </div>

                <div style={{ padding: '10px 12px' }}>
                  {club.teams.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">No teams.</div>
                  ) : (
                    <div className="flex-col gap-8">
                      {club.teams.map((t) => {
                        const teamPath = orgKey && club.clubSlugOrId && t.teamSlugOrId
                          ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(club.clubSlugOrId)}/${encodeURIComponent(t.teamSlugOrId)}`
                          : '';
                        return (
                          <div
                            key={t.teamId || t.teamSlugOrId}
                            className="flex-between gap-12 border rounded-8"
                            style={{
                              padding: '8px 10px',
                              background: 'var(--app-surface)',
                            }}
                          >
                            <div className="min-w-0">
                              {teamPath ? (
                                <button
                                  type="button"
                                  className="app-unstyled-button hover:underline text-left fw-700 fs-13"
                                  onClick={() => navigate(teamPath)}
                                  style={{ color: '#60a5fa' }}
                                >
                                  {t.teamName}
                                </button>
                              ) : (
                                <div className="fw-700 fs-13 text-primary">{t.teamName}</div>
                              )}
                            </div>

                            <div className="flex-row gap-8 flex-wrap" style={{ justifyContent: 'flex-end' }}>
                              <span style={pillStyle}>Members: {t.memberCount}</span>
                              <span style={pillStyle}>Seasons: {t.seasonsCount ?? 0}</span>
                              <span style={pillStyle}>Competitions: {t.competitionsCount ?? 0}</span>
                              <span style={pillStyle}>Matches: {t.matchesCount ?? 0}</span>
                              {teamPath ? (
                                <button type="button" className="app-action-button" onClick={() => navigate(teamPath)} style={actionButtonStyle('primary')}>
                                  View Team
                                </button>
                              ) : null}
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
