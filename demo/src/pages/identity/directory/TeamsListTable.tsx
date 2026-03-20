import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import { routes } from '@/routes';
import { isNumericId, isUuid } from './useTeamsListData';
import type { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';
import styles from './TeamsListTable.module.css';
import dp from './DirectoryPremium.module.css';

/** Extended team record as returned by the directory API */
type TeamRecord = ProjectOption & {
  sport_variants_count?: number;
  seasons_count?: number;
  competitions_count?: number;
  matches_count?: number;
  member_count?: number;
  is_active?: boolean;
  parent_project?: string | number | { id: string; name?: string; slug?: string } | null;
  parent_project_id?: string | number | null;
  [key: string]: unknown;
};

interface TeamsListTableProps {
  filteredTeams: TeamRecord[];
  organisations: OrganisationOption[];
  clubs: TeamRecord[];
  orgLocked: boolean;
  clubLocked: boolean;
  lockedOrgSlug: string;
  selectedOrgId: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  navigate: (path: string) => void;
  onView: (team: TeamRecord) => void;
  onEdit: (team: TeamRecord) => void;
  onDelete: (orgSlugOrId: string, teamId: string, teamName: string) => void;
}

export const TeamsListTable: React.FC<TeamsListTableProps> = ({
  filteredTeams, organisations, clubs, orgLocked, clubLocked,
  lockedOrgSlug, selectedOrgId, userCanEditProject, userCanDeleteProject,
  navigate, onView, onEdit, onDelete,
}) => (
  <div className={dp.tableCard}>
    {/* ── Mobile card layout (< 640px) ── */}
    <div className={styles.mobileCards}>
      {filteredTeams.map((team) => {
        const resolved = resolveTeamRow(team, organisations, clubs, lockedOrgSlug, selectedOrgId, orgLocked);
        return (
          <div key={team.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                {resolved.orgSlugOrId && resolved.clubSlugOrId ? (
                  <button
                    className={styles.cardNameLink}
                    onClick={() => navigate(routes.team({ orgId: String(resolved.orgSlugOrId), clubId: String(resolved.clubSlugOrId), projectId: String(resolved.teamSlugOrId) }))}
                  >
                    {team.name}
                  </button>
                ) : (
                  <p className={styles.cardName}>{team.name}</p>
                )}
                <div className={styles.cardMeta}>
                  {resolved.orgSport && (
                    <span>{String(resolved.orgSport.sport_icon ?? '')} {String(resolved.orgSport.name ?? '')}</span>
                  )}
                </div>
              </div>
              <Badge variant={team.is_active === false ? 'warning' : 'success'}>
                {team.is_active === false ? 'Inactive' : 'Active'}
              </Badge>
            </div>

            <div className={styles.cardStats}>
              <div className={styles.cardStat}>
                <span className={styles.cardStatValue}>{team.sport_variants_count || 0}</span>
                <span className={styles.cardStatLabel}>Variant</span>
              </div>
              <div className={styles.cardStat}>
                <span className={styles.cardStatValue}>{team.seasons_count || 0}</span>
                <span className={styles.cardStatLabel}>Season</span>
              </div>
              <div className={styles.cardStat}>
                <span className={styles.cardStatValue}>{team.competitions_count || 0}</span>
                <span className={styles.cardStatLabel}>Comp.</span>
              </div>
              <div className={styles.cardStat}>
                <span className={styles.cardStatValue}>{team.matches_count || 0}</span>
                <span className={styles.cardStatLabel}>Match</span>
              </div>
              <div className={styles.cardStat}>
                <span className={styles.cardStatValue}>{team.member_count || 0}</span>
                <span className={styles.cardStatLabel}>Users</span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <button onClick={() => onView(team)} className="action-btn action-btn-primary">Bekijken</button>
              {userCanEditProject && (
                <button onClick={() => onEdit(team)} className="action-btn action-btn-warning">Bewerken</button>
              )}
              {userCanDeleteProject && (
                <button
                  onClick={() => onDelete(String(resolved.orgSlugOrId), String(team.id), String(team.name))}
                  className="action-btn action-btn-danger"
                >
                  Verwijderen
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* ── Desktop table (≥ 640px) ── */}
    <div className={`${dp.tableScroll} ${styles.desktopTable}`}>
      <Table className="dir-table">
        <thead>
          <tr>
            {!orgLocked && <th className={`dir-th ${styles.colFederation}`}>Federation</th>}
            {!clubLocked && <th className={`dir-th ${styles.colClub}`}>Club</th>}
            <th className={`dir-th ${styles.colTeam}`}>Team</th>
            <th className={`dir-th ${styles.colSport}`}>Sport</th>
            <th className={`dir-th ${styles.colVariant}`}>Variant</th>
            <th className={`dir-th ${styles.colSeason}`}>Season</th>
            <th className={`dir-th ${styles.colCompetition}`}>Competition</th>
            <th className={`dir-th ${styles.colMatch}`}>Match</th>
            <th className={`dir-th ${styles.colUsers}`}>Users</th>
            <th className={`dir-th ${styles.colStatus}`}>Status</th>
            <th className={`dir-th ${styles.colActions}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTeams.map((team) => {
            const resolved = resolveTeamRow(team, organisations, clubs, lockedOrgSlug, selectedOrgId, orgLocked);
            return (
              <tr key={team.id}>
                {!orgLocked && (
                  <td className="dir-td-text">
                    {resolved.orgSlugOrId ? (
                      <a
                        href={routes.orgDetailLegacy({ orgId: String(resolved.orgSlugOrId) })}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => { e.preventDefault(); navigate(routes.orgDetailLegacy({ orgId: String(resolved.orgSlugOrId) })); }}
                      >
                        {typeof team.organisation === 'object' ? team.organisation?.name || '-' : '-'}
                      </a>
                    ) : (typeof team.organisation === 'object' ? team.organisation?.name || '-' : '-')}
                  </td>
                )}

                {!clubLocked && (
                  <td className="dir-td-text">
                    {resolved.orgSlugOrId && resolved.clubSlugOrId ? (
                      <a
                        href={routes.club({ orgId: String(resolved.orgSlugOrId), clubId: String(resolved.clubSlugOrId) })}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => { e.preventDefault(); navigate(routes.club({ orgId: String(resolved.orgSlugOrId), clubId: String(resolved.clubSlugOrId) })); }}
                      >
                        {resolved.clubName}
                      </a>
                    ) : resolved.clubName}
                  </td>
                )}

                <td className="dir-td-text">
                  {resolved.orgSlugOrId && resolved.clubSlugOrId ? (
                    <a
                      href={routes.team({ orgId: String(resolved.orgSlugOrId), clubId: String(resolved.clubSlugOrId), projectId: String(resolved.teamSlugOrId) })}
                      className="text-blue-600 hover:underline"
                      onClick={(e) => { e.preventDefault(); navigate(routes.team({ orgId: String(resolved.orgSlugOrId), clubId: String(resolved.clubSlugOrId), projectId: String(resolved.teamSlugOrId) })); }}
                    >
                      {team.name}
                    </a>
                  ) : team.name}
                </td>

                <td className="dir-td">
                  {resolved.orgSport ? (
                    <span className="flex-row gap-4">
                      <span>{String(resolved.orgSport.sport_icon ?? '')}</span>
                      <span className="fs-12">{String(resolved.orgSport.name ?? '')}</span>
                    </span>
                  ) : <span className="text-muted">—</span>}
                </td>

                <td className="dir-td"><Badge variant="default">{team.sport_variants_count || 0}</Badge></td>
                <td className="dir-td"><Badge variant="default">{team.seasons_count || 0}</Badge></td>
                <td className="dir-td"><Badge variant="default">{team.competitions_count || 0}</Badge></td>
                <td className="dir-td"><Badge variant="default">{team.matches_count || 0}</Badge></td>
                <td className="dir-td"><Badge variant="default">{team.member_count || 0}</Badge></td>
                <td className="dir-td">
                  <Badge variant={team.is_active === false ? 'warning' : 'success'}>
                    {team.is_active === false ? 'Inactive' : 'Active'}
                  </Badge>
                </td>
                <td className="dir-td">
                  <div className="dir-actions">
                    <button onClick={() => onView(team)} className="action-btn action-btn-primary">Bekijken</button>
                    {userCanEditProject && (
                      <button onClick={() => onEdit(team)} className="action-btn action-btn-warning">Bewerken</button>
                    )}
                    {userCanDeleteProject && (
                      <button
                        onClick={() => onDelete(String(resolved.orgSlugOrId), String(team.id), String(team.name))}
                        className="action-btn action-btn-danger"
                      >
                        Verwijderen
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  </div>
);

/* ── Per-row slug resolution (extracted from inline map logic) ── */

function resolveTeamRow(
  team: TeamRecord,
  organisations: OrganisationOption[],
  clubs: TeamRecord[],
  lockedOrgSlug: string,
  selectedOrgId: string,
  orgLocked: boolean,
) {
  const org = typeof team.organisation === 'object' ? team.organisation : undefined;
  const orgIdFromProject = org?.id || (typeof team.organisation === 'string' ? team.organisation : undefined);
  const orgSlugFromProject = org?.slug;
  const orgFromList = orgIdFromProject
    ? organisations.find((o) => String(o.id) === String(orgIdFromProject))
    : undefined;

  const orgSport = org?.sport || orgFromList?.sport;

  const contextSlug = lockedOrgSlug || (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : undefined);
  const orgSlugOrId =
    orgSlugFromProject ||
    orgFromList?.slug ||
    (orgLocked ? contextSlug : undefined) ||
    orgIdFromProject ||
    selectedOrgId;

  const parent = team.parent_project || team.parent_id || team.parent_project_id;
  const parentId = typeof parent === 'object' && parent !== null ? (parent as { id?: string }).id : parent;
  const parentName = typeof parent === 'object' && parent !== null ? ((parent as { name?: string; slug?: string }).name || (parent as { name?: string; slug?: string }).slug) : parent;
  const clubObj = clubs.find((c) => String(c.id) === String(parentId));
  const clubName = clubObj ? clubObj.name : (String(parentName || '-'));
  const clubSlugOrId = clubObj ? (clubObj.slug || clubObj.id) : parentId;
  const teamSlugOrId = team.slug || team.id;

  return { orgSlugOrId, orgSport, clubName, clubSlugOrId, teamSlugOrId };
}
