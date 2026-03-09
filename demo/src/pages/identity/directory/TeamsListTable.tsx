import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import { isNumericId, isUuid } from './useTeamsListData';
import type { OrganisationOption } from '../../work/WorkFilterBar';
import styles from './TeamsListTable.module.css';
import dp from './DirectoryPremium.module.css';

interface TeamsListTableProps {
  filteredTeams: any[];
  organisations: OrganisationOption[];
  clubs: any[];
  orgLocked: boolean;
  clubLocked: boolean;
  lockedOrgSlug: string;
  selectedOrgId: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  navigate: (path: string) => void;
  onView: (team: any) => void;
  onEdit: (team: any) => void;
  onDelete: (orgSlugOrId: string, teamId: string, teamName: string) => void;
}

export const TeamsListTable: React.FC<TeamsListTableProps> = ({
  filteredTeams, organisations, clubs, orgLocked, clubLocked,
  lockedOrgSlug, selectedOrgId, userCanEditProject, userCanDeleteProject,
  navigate, onView, onEdit, onDelete,
}) => (
  <div className={dp.tableCard}>
    <div className={dp.tableScroll}>
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
                        href={`/organisations/${resolved.orgSlugOrId}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => { e.preventDefault(); navigate(`/organisations/${resolved.orgSlugOrId}`); }}
                      >
                        {team.organisation?.name || '-'}
                      </a>
                    ) : (team.organisation?.name || '-')}
                  </td>
                )}

                {!clubLocked && (
                  <td className="dir-td-text">
                    {resolved.orgSlugOrId && resolved.clubSlugOrId ? (
                      <a
                        href={`/${resolved.orgSlugOrId}/${resolved.clubSlugOrId}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => { e.preventDefault(); navigate(`/${resolved.orgSlugOrId}/${resolved.clubSlugOrId}`); }}
                      >
                        {resolved.clubName}
                      </a>
                    ) : resolved.clubName}
                  </td>
                )}

                <td className="dir-td-text">
                  {resolved.orgSlugOrId && resolved.clubSlugOrId ? (
                    <a
                      href={`/${resolved.orgSlugOrId}/${resolved.clubSlugOrId}/${resolved.teamSlugOrId}`}
                      className="text-blue-600 hover:underline"
                      onClick={(e) => { e.preventDefault(); navigate(`/${resolved.orgSlugOrId}/${resolved.clubSlugOrId}/${resolved.teamSlugOrId}`); }}
                    >
                      {team.name}
                    </a>
                  ) : team.name}
                </td>

                <td className="dir-td">
                  {resolved.orgSport ? (
                    <span className="flex-row gap-4">
                      <span>{resolved.orgSport.sport_icon}</span>
                      <span className="fs-12">{resolved.orgSport.name}</span>
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
                    <button onClick={() => onView(team)} className="action-btn action-btn-primary">View</button>
                    {userCanEditProject && (
                      <button onClick={() => onEdit(team)} className="action-btn action-btn-warning">Edit</button>
                    )}
                    {userCanDeleteProject && (
                      <button
                        onClick={() => onDelete(String(resolved.orgSlugOrId), String(team.id), String(team.name))}
                        className="action-btn action-btn-danger"
                      >
                        Delete
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
  team: any,
  organisations: OrganisationOption[],
  clubs: any[],
  lockedOrgSlug: string,
  selectedOrgId: string,
  orgLocked: boolean,
) {
  const orgIdFromProject = team.organisation?.id || (typeof team.organisation === 'string' ? team.organisation : undefined);
  const orgSlugFromProject = team.organisation?.slug;
  const orgFromList = orgIdFromProject
    ? organisations.find((o) => String(o.id) === String(orgIdFromProject))
    : undefined;

  const orgSport = team.organisation?.sport || orgFromList?.sport;

  const contextSlug = lockedOrgSlug || (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : undefined);
  const orgSlugOrId =
    orgSlugFromProject ||
    orgFromList?.slug ||
    (orgLocked ? contextSlug : undefined) ||
    orgIdFromProject ||
    selectedOrgId;

  const parent = team.parent_project || team.parent_id || team.parent_project_id;
  const parentId = typeof parent === 'object' ? parent.id : parent;
  const parentName = typeof parent === 'object' ? (parent.name || parent.slug) : parent;
  const clubObj = clubs.find((c) => String(c.id) === String(parentId));
  const clubName = clubObj ? clubObj.name : (parentName || '-');
  const clubSlugOrId = clubObj ? (clubObj.slug || clubObj.id) : parentId;
  const teamSlugOrId = team.slug || team.id;

  return { orgSlugOrId, orgSport, clubName, clubSlugOrId, teamSlugOrId };
}
