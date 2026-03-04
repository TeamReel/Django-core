import React from 'react';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import { SkeletonList } from '../../../components/Skeleton';
import { Table } from '@/shims/design-system';
import ProjectDetailModal from '../ProjectDetailModal';
import ProjectEditModal from '../ProjectEditModal';
import ProjectCreateModal from '../ProjectCreateModal';
import { useClubsData } from './useClubsData';
import styles from './ClubsList.module.css';

interface ClubsListProps {
  preselectedOrgId?: string;
}

export const ClubsList: React.FC<ClubsListProps> = ({ preselectedOrgId }) => {
  const d = useClubsData(preselectedOrgId);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex-row gap-12 mb-16 flex-wrap">
        {d.isSuperAdmin && !d.orgLocked && (
          <select
            value={d.selectedOrgId}
            onChange={(e) => {
              d.setSelectedOrgId(e.target.value);
              d.setSelectedClubId('');
            }}
            className="py-8 px-12 border rounded-4 fs-14 bg-surface"
          >
            <option value="">Federation: All</option>
            {[...d.organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={d.statusFilter}
          onChange={(e) => d.setStatusFilter(e.target.value)}
          className="py-8 px-12 border rounded-4 fs-14 bg-surface"
        >
          <option value="all">Status: All</option>
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
        </select>
        <select
          value={d.sportFilter}
          onChange={(e) => d.setSportFilter(e.target.value)}
          className="py-8 px-12 border rounded-4 fs-14 bg-surface"
        >
          <option value="all">Sport: All</option>
          {d.categories.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="md" onClick={d.handleClearFilters} className="ml-auto">
          Clear
        </Button>
        {d.userCanEditProject && (
          <Button variant="primary" size="md" onClick={() => d.setIsCreateModalOpen(true)}>
            Create Club
          </Button>
        )}
      </div>

      {/* Loading / Error / Empty */}
      {d.isLoading && <SkeletonList count={4} variant="row" />}
      {d.error && <Alert variant="error">{d.error}</Alert>}
      {!d.isLoading && !d.error && d.filteredClubs.length === 0 && (
        <Alert variant="info">No clubs match the current filters.</Alert>
      )}

      {/* Table */}
      {!d.isLoading && !d.error && d.filteredClubs.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table className="dir-table">
              <thead>
                <tr>
                  {!d.orgLocked && (
                    <th className={`dir-th ${styles.colFederation}`}>Federation</th>
                  )}
                  <th className={`dir-th ${styles.colClub}`}>Club</th>
                  <th className={`dir-th ${styles.colSport}`}>Sport</th>
                  <th className={`dir-th ${styles.colVariant}`}>Variant</th>
                  <th className={`dir-th ${styles.colTeams}`}>Teams</th>
                  <th className={`dir-th ${styles.colSeason}`}>Season</th>
                  <th className={`dir-th ${styles.colCompetition}`}>Competition</th>
                  <th className={`dir-th ${styles.colMatch}`}>Match</th>
                  <th className={`dir-th ${styles.colUsers}`}>Users</th>
                  <th className={`dir-th ${styles.colStatus}`}>Status</th>
                  <th className={`dir-th ${styles.colActions}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {d.filteredClubs.map((club: any) => (
                  <ClubRow
                    key={club.id}
                    club={club}
                    d={d}
                  />
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <ProjectDetailModal
        opened={d.isDetailModalOpen}
        onClose={() => d.setIsDetailModalOpen(false)}
        project={d.detailProject}
      />

      <ProjectEditModal
        opened={d.isEditModalOpen}
        onClose={() => d.setIsEditModalOpen(false)}
        project={d.editProject}
        onSave={d.handleSaveProject}
      />

      <ProjectCreateModal
        opened={d.isCreateModalOpen}
        onClose={() => d.setIsCreateModalOpen(false)}
        title="Create Club"
        organisations={d.organisations}
        requireOrganisation
        initialOrganisationId={d.selectedOrgId}
        onCreate={d.handleCreateProject}
      />
    </div>
  );
};

/* ── ClubRow sub-component ──────────────────────────────────── */

type HookData = ReturnType<typeof useClubsData>;

function ClubRow({ club, d }: { club: any; d: HookData }) {
  const orgIdFromProject = club.organisation?.id || (typeof club.organisation === 'string' ? club.organisation : undefined);
  const orgSlugFromProject = club.organisation?.slug;
  const orgFromList = orgIdFromProject
    ? d.organisations.find((o) => String(o.id) === String(orgIdFromProject))
    : undefined;
  const selectedOrg = d.selectedOrgId
    ? d.organisations.find((o) => String(o.id) === String(d.selectedOrgId) || String(o.slug) === String(d.selectedOrgId))
    : undefined;
  const orgSlugOrId =
    orgSlugFromProject ||
    orgFromList?.slug ||
    selectedOrg?.slug ||
    orgIdFromProject ||
    selectedOrg?.id ||
    d.selectedOrgId;
  const clubSlugOrId = club.slug || club.id;
  const orgSport = (club.organisation as any)?.sport || (orgFromList as any)?.sport;

  const teamsForClub = d.teams.filter((t: any) => {
    const parent =
      t.parent_id ??
      t.parent_project_id ??
      (typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project);
    const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
    return parentId && parentId === String(club.id);
  });

  return (
    <tr>
      {!d.orgLocked && (
        <td className="dir-td-text">
          {orgSlugOrId ? (
            <a
              href={`/organisations/${orgSlugOrId}`}
              className="text-blue-600 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                d.navigate(`/organisations/${orgSlugOrId}`);
              }}
            >
              {club.organisation?.name || 'Federation'}
            </a>
          ) : (
            club.organisation?.name || '-'
          )}
        </td>
      )}
      <td className="dir-td-text">
        <a
          href={`/${orgSlugOrId}/${clubSlugOrId}`}
          className="text-blue-600 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            d.navigate(`/${orgSlugOrId}/${clubSlugOrId}`);
          }}
        >
          {club.name}
        </a>
      </td>
      <td className="dir-td">
        {orgSport ? (
          <span className="flex-row gap-4">
            <span>{orgSport.sport_icon}</span>
            <span className="fs-12">{orgSport.name}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="dir-td">
        <Badge variant="default">{club.sport_variants_count || 0}</Badge>
      </td>
      <td className="dir-td">
        <Badge variant="default">{teamsForClub.length}</Badge>
      </td>
      <td className="dir-td">
        <Badge variant="default">{club.seasons_count || 0}</Badge>
      </td>
      <td className="dir-td">
        <Badge variant="default">{club.competitions_count || 0}</Badge>
      </td>
      <td className="dir-td">
        <Badge variant="default">{club.matches_count || 0}</Badge>
      </td>
      <td className="dir-td">
        <Badge variant="default">{club.member_count || 0}</Badge>
      </td>
      <td className="dir-td">
        <Badge variant={club.is_active === false ? 'warning' : 'success'}>
          {club.is_active === false ? 'Inactive' : 'Active'}
        </Badge>
      </td>
      <td className="dir-td">
        <div className="dir-actions">
          <button
            onClick={() => {
              d.setDetailProject(club);
              d.setIsDetailModalOpen(true);
            }}
            className="action-btn action-btn-primary"
          >
            View
          </button>
          {d.userCanEditProject && (
            <button
              onClick={() => {
                d.setEditProject(club);
                d.setIsEditModalOpen(true);
              }}
              className="action-btn action-btn-warning"
            >
              Edit
            </button>
          )}
          {d.userCanDeleteProject && (
            <button
              onClick={() => d.handleDeleteProject(String(orgSlugOrId), String(clubSlugOrId), String(club.name))}
              className="action-btn action-btn-danger"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
