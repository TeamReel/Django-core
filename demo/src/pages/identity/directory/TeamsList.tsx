import React from 'react';
import { Alert } from '@django-core/design-system';
import { SkeletonList } from '@/components/Skeleton';
import SmartEmptyState from '@/components/SmartEmptyState';
import ProjectDetailModal from '../ProjectDetailModal';
import ProjectEditModal from '../ProjectEditModal';
import ProjectCreateModal from '../ProjectCreateModal';
import { useTeamsListData } from './useTeamsListData';
import { TeamsListFilters } from './TeamsListFilters';
import { TeamsListTable } from './TeamsListTable';

interface TeamsListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
}

export const TeamsList: React.FC<TeamsListProps> = ({ preselectedOrgId, preselectedClubId }) => {
  const d = useTeamsListData({ preselectedOrgId, preselectedClubId });

  return (
    <div>
      <TeamsListFilters
        isSuperAdmin={d.isSuperAdmin}
        orgLocked={d.orgLocked}
        clubLocked={d.clubLocked}
        organisations={d.organisations}
        clubs={d.clubs}
        categories={d.categories}
        filterValues={{
          selectedOrgId: d.selectedOrgId,
          selectedClubId: d.selectedClubId,
          statusFilter: d.statusFilter,
          sportFilter: d.sportFilter,
        }}
        userCanEditProject={d.userCanEditProject}
        onOrgChange={(id) => {
          d.setSelectedOrgId(id);
          if (!d.clubLocked) d.setSelectedClubId('');
          d.setSelectedTeamId('');
        }}
        onClubChange={(id) => {
          d.setSelectedClubId(id);
          d.setSelectedTeamId('');
        }}
        onStatusChange={d.setStatusFilter}
        onSportChange={d.setSportFilter}
        onClear={d.clearFilters}
        onCreateTeam={() => d.setIsCreateModalOpen(true)}
      />

      {d.isLoading && <SkeletonList count={4} variant="row" />}
      {d.error && <Alert variant="error">{d.error}</Alert>}

      {!d.isLoading && !d.error && d.filteredTeams.length === 0 && (
        <SmartEmptyState type="teams" hideActions />
      )}

      {!d.isLoading && !d.error && d.filteredTeams.length > 0 && (
        <TeamsListTable
          filteredTeams={d.filteredTeams}
          organisations={d.organisations}
          clubs={d.clubs}
          orgLocked={d.orgLocked}
          clubLocked={d.clubLocked}
          lockedOrgSlug={d.lockedOrgSlug}
          selectedOrgId={d.selectedOrgId}
          userCanEditProject={d.userCanEditProject}
          userCanDeleteProject={d.userCanDeleteProject}
          navigate={d.navigate}
          onView={(team) => { d.setDetailProject(team); d.setIsDetailModalOpen(true); }}
          onEdit={(team) => { d.setEditProject(team); d.setIsEditModalOpen(true); }}
          onDelete={d.handleDeleteProject}
        />
      )}

      <ProjectDetailModal
        opened={d.isDetailModalOpen}
        onClose={() => d.setIsDetailModalOpen(false)}
        project={d.detailProject as unknown as import('@/types/api/project').Project}
      />

      <ProjectEditModal
        opened={d.isEditModalOpen}
        onClose={() => d.setIsEditModalOpen(false)}
        project={d.editProject as any}
        onSave={d.handleEditSave}
      />

      <ProjectCreateModal
        opened={d.isCreateModalOpen}
        onClose={() => d.setIsCreateModalOpen(false)}
        title="Create Team"
        organisations={d.organisations}
        clubs={d.clubs}
        requireOrganisation
        requireClub
        initialOrganisationId={d.selectedOrgId}
        initialClubId={d.selectedClubId}
        onCreate={d.handleCreateTeam}
      />
    </div>
  );
};
