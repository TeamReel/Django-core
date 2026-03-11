import { useMemo } from 'react';
import { Card, Input } from '@django-core/design-system';
import { Project } from '../../types';
import styles from './OrgHierarchyTab.module.css';

export interface OrgHierarchyTabProps {
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  teams: Project[];
  clubsForHierarchy: Project[];
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
    const toSlugOrId = (p: { slug?: string; id?: string | number }) => String(p?.slug || p?.id || '').trim();
    const toName = (p: { name?: string; title?: string; slug?: string; id?: string | number }) => String(p?.name || p?.title || p?.slug || p?.id || '').trim();

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
      teamsByClubId.get(clubId)!.push(t);
    }

    const clubRows = (clubsForHierarchy || []).map((c) => {
      const clubId = String(c?.id || '').trim();
      const clubName = toName(c) || '—';
      const clubSlugOrId = toSlugOrId(c);

      const clubTeams = (teamsByClubId.get(clubId) || []).slice();
      clubTeams.sort((a, b) => toName(a).localeCompare(toName(b), undefined, { sensitivity: 'base' }));

      const mappedTeams: TeamRow[] = clubTeams.map((t) => {
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
                className={`border overflow-hidden ${styles.clubCard}`}
              >
                <div
                  className={`flex-between border-bottom gap-12 ${styles.clubHeader}`}
                >
                  <div className="flex-col gap-2 min-w-0">
                    {clubPath ? (
                      <button
                        type="button"
                        className={`app-unstyled-button hover:underline text-left fw-800 fs-14 ${styles.clubLinkButton}`}
                        onClick={() => navigate(clubPath)}
                      >
                        {club.clubName}
                      </button>
                    ) : (
                      <div className="fw-800 fs-14 text-primary">{club.clubName}</div>
                    )}
                  </div>

                  <div className={`flex-row gap-8 flex-wrap ${styles.pillRow}`}>
                    <span className={styles.pill}>Teams: {club.teamCount}</span>
                    <span className={styles.pill}>Members: {club.memberCount}</span>
                    <span className={styles.pill}>Seasons: {club.seasonsCount ?? 0}</span>
                    <span className={styles.pill}>Competitions: {club.competitionsCount ?? 0}</span>
                    <span className={styles.pill}>Matches: {club.matchesCount ?? 0}</span>
                    {clubPath ? (
                      <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => navigate(clubPath)}>
                        View Club
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className={styles.clubContent}>
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
                            className={`flex-between gap-12 border rounded-8 ${styles.teamRow}`}
                          >
                            <div className="min-w-0">
                              {teamPath ? (
                                <button
                                  type="button"
                                  className={`app-unstyled-button hover:underline text-left fw-700 fs-13 ${styles.clubLinkButton}`}
                                  onClick={() => navigate(teamPath)}
                                >
                                  {t.teamName}
                                </button>
                              ) : (
                                <div className="fw-700 fs-13 text-primary">{t.teamName}</div>
                              )}
                            </div>

                            <div className={`flex-row gap-8 flex-wrap ${styles.pillRow}`}>
                              <span className={styles.pill}>Members: {t.memberCount}</span>
                              <span className={styles.pill}>Seasons: {t.seasonsCount ?? 0}</span>
                              <span className={styles.pill}>Competitions: {t.competitionsCount ?? 0}</span>
                              <span className={styles.pill}>Matches: {t.matchesCount ?? 0}</span>
                              {teamPath ? (
                                <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => navigate(teamPath)}>
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
