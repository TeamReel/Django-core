import React from 'react';
import { Organisation, Project } from '../../types';
import OrganisationDetailModal from './OrganisationDetailModal';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import ProjectEditModal from './ProjectEditModal';
import ProjectCreateModal from './ProjectCreateModal';
import PeriodCreateModal from './PeriodCreateModal';
import MatchCreateModal from './MatchCreateModal';
import AddMemberModal from './AddMemberModal';
import UserDetailModal from './UserDetailModal';
import { OrgEditMemberRoleModal } from './OrgEditMemberRoleModal';
import { canEditOrganisation } from '../../utils/permissions';
import { createOrgModalHandlers } from './orgModalHandlers';

export interface OrgModalsProps {
  /* common identifiers */
  org: Organisation;
  currentOrgSlug: string | undefined;
  currentOrgId: string | undefined;
  permissionContext: any;

  /* helper functions */
  getApiV1BaseUrl: () => string;
  getCsrfToken: () => string;
  fetchClubsPage: (page: number) => Promise<void>;
  fetchTeamsForOrg: (opts?: { force?: boolean }) => Promise<void>;
  fetchMembers: (force?: boolean) => Promise<void>;
  fetchFederationCounts: (organisationId: string) => Promise<void>;
  recomputePeriodCounts: (allPeriods: any[]) => void;
  saveProjectEdits: (project: Project, patch: Partial<Project>) => Promise<void>;

  /* list state setters (for optimistic updates) */
  setClubs: React.Dispatch<React.SetStateAction<Project[]>>;
  setClubsPage: (v: number) => void;
  setClubsCount: React.Dispatch<React.SetStateAction<number>>;
  setAllClubsForTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setTeamsCount: React.Dispatch<React.SetStateAction<number | null>>;
  setOrgPeriods: React.Dispatch<React.SetStateAction<any[]>>;
  setFederationMatches: React.Dispatch<React.SetStateAction<any[]>>;
  setMatchesCount: React.Dispatch<React.SetStateAction<number | null>>;
  setMembers: React.Dispatch<React.SetStateAction<any[]>>;

  /* modal state: club detail */
  isClubModalOpen: boolean;
  setIsClubModalOpen: (v: boolean) => void;
  selectedClub: Project | null;

  /* modal state: project detail */
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (v: boolean) => void;
  detailProject: Project | null;

  /* modal state: project edit */
  isEditModalOpen: boolean;
  setIsEditModalOpen: (v: boolean) => void;
  selectedEditProject: Project | null;

  /* modal state: create club */
  isCreateClubModalOpen: boolean;
  setIsCreateClubModalOpen: (v: boolean) => void;

  /* modal state: create team */
  isCreateTeamModalOpen: boolean;
  setIsCreateTeamModalOpen: (v: boolean) => void;
  teamClubFilterId: string;

  /* modal state: add member */
  isAddMemberModalOpen: boolean;
  setIsAddMemberModalOpen: (v: boolean) => void;

  /* modal state: create season */
  isCreateSeasonModalOpen: boolean;
  setIsCreateSeasonModalOpen: (v: boolean) => void;
  seasonClubFilterId: string;
  seasonTeamFilterId: string;

  /* modal state: create competition */
  isCreateCompetitionModalOpen: boolean;
  setIsCreateCompetitionModalOpen: (v: boolean) => void;
  compClubFilterId: string;
  compTeamFilterId: string;

  /* modal state: create match */
  isCreateMatchModalOpen: boolean;
  setIsCreateMatchModalOpen: (v: boolean) => void;
  matchClubFilterId: string;
  matchTeamFilterId: string;

  /* modal state: edit member role */
  isEditMemberRoleModalOpen: boolean;
  setIsEditMemberRoleModalOpen: (v: boolean) => void;
  editingMember: any;
  setEditingMember: (v: any) => void;

  /* modal state: org detail / edit */
  isOrgDetailModalOpen: boolean;
  setIsOrgDetailModalOpen: (v: boolean) => void;
  isOrgEditModalOpen: boolean;
  setIsOrgEditModalOpen: (v: boolean) => void;

  /* modal state: user detail */
  detailUser: any;
  isUserDetailModalOpen: boolean;
  setIsUserDetailModalOpen: (v: boolean) => void;

  /* create-modal helper data */
  createModalOrganisations: any[];
  createModalClubs: any[];
  teams: Project[];
}

export const OrgModals: React.FC<OrgModalsProps> = (props) => {
  const {
    org,
    currentOrgSlug,
    currentOrgId,
    permissionContext,
    saveProjectEdits,
    fetchMembers,
    setMembers,
    isClubModalOpen,
    setIsClubModalOpen,
    selectedClub,
    isDetailModalOpen,
    setIsDetailModalOpen,
    detailProject,
    isEditModalOpen,
    setIsEditModalOpen,
    selectedEditProject,
    isCreateClubModalOpen,
    setIsCreateClubModalOpen,
    isCreateTeamModalOpen,
    setIsCreateTeamModalOpen,
    teamClubFilterId,
    isAddMemberModalOpen,
    setIsAddMemberModalOpen,
    isCreateSeasonModalOpen,
    setIsCreateSeasonModalOpen,
    seasonClubFilterId,
    seasonTeamFilterId,
    isCreateCompetitionModalOpen,
    setIsCreateCompetitionModalOpen,
    compClubFilterId,
    compTeamFilterId,
    isCreateMatchModalOpen,
    setIsCreateMatchModalOpen,
    matchClubFilterId,
    matchTeamFilterId,
    isEditMemberRoleModalOpen,
    setIsEditMemberRoleModalOpen,
    editingMember,
    setEditingMember,
    isOrgDetailModalOpen,
    setIsOrgDetailModalOpen,
    isOrgEditModalOpen,
    setIsOrgEditModalOpen,
    detailUser,
    isUserDetailModalOpen,
    setIsUserDetailModalOpen,
    createModalOrganisations,
    createModalClubs,
    teams,
  } = props;

  const {
    handleCreateClub,
    handleCreateTeam,
    handleCreateSeason,
    handleCreateCompetition,
    handleCreateMatch,
  } = createOrgModalHandlers(props);

  return (
    <>
      <ProjectDetailModal
        opened={isClubModalOpen}
        onClose={() => setIsClubModalOpen(false)}
        project={selectedClub}
      />

      <ProjectDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        project={detailProject}
      />

      <ProjectEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedEditProject as any}
        onSave={(patch) => {
          if (!selectedEditProject) return Promise.resolve();
          return saveProjectEdits(selectedEditProject, patch as any);
        }}
      />

      <ProjectCreateModal
        opened={isCreateClubModalOpen}
        onClose={() => setIsCreateClubModalOpen(false)}
        title="Create Club"
        organisations={createModalOrganisations}
        requireOrganisation={createModalOrganisations.length > 0}
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        onCreate={handleCreateClub}
      />

      <ProjectCreateModal
        opened={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        title="Create Team"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        requireOrganisation={createModalOrganisations.length > 0}
        requireClub
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={teamClubFilterId || ''}
        onCreate={handleCreateTeam}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSuccess={() => {
          fetchMembers(true);
        }}
        contextLevel="organisation"
        orgSlug={String(currentOrgSlug || '')}
      />

      <PeriodCreateModal
        opened={isCreateSeasonModalOpen}
        onClose={() => setIsCreateSeasonModalOpen(false)}
        title="Create Season"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={teams as any}
        requireOrganisation
        requireClub
        requireTeam
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={seasonClubFilterId || ''}
        initialTeamId={seasonTeamFilterId || ''}
        onCreate={handleCreateSeason}
      />

      <PeriodCreateModal
        opened={isCreateCompetitionModalOpen}
        onClose={() => setIsCreateCompetitionModalOpen(false)}
        title="Create Competition"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={teams as any}
        requireOrganisation
        requireClub
        requireTeam
        requireSeason
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={compClubFilterId || ''}
        initialTeamId={compTeamFilterId || ''}
        onCreate={handleCreateCompetition}
      />

      <MatchCreateModal
        opened={isCreateMatchModalOpen}
        onClose={() => setIsCreateMatchModalOpen(false)}
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={teams as any}
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={matchClubFilterId || ''}
        initialTeamId={matchTeamFilterId || ''}
        onCreate={handleCreateMatch}
      />

      <OrgEditMemberRoleModal
        opened={isEditMemberRoleModalOpen}
        onClose={() => {
          setIsEditMemberRoleModalOpen(false);
          setEditingMember(null);
        }}
        editingMember={editingMember}
        currentOrgSlug={currentOrgSlug}
        onSaved={(updated, role) => {
          setMembers((prev: any[]) =>
            prev.map((m: any) => {
              if (String(m?.id) !== String(editingMember?.id)) return m;
              return updated && updated.id ? updated : { ...m, role };
            }),
          );
          setIsEditMemberRoleModalOpen(false);
          setEditingMember(null);
        }}
      />

      <OrganisationDetailModal
        opened={isOrgDetailModalOpen}
        onClose={() => setIsOrgDetailModalOpen(false)}
        organisation={org as any}
      />

      <EntityEditModal
        isOpen={isOrgEditModalOpen}
        onClose={() => setIsOrgEditModalOpen(false)}
        onSaved={() => window.location.reload()}
        entityType="organisation"
        entityId={currentOrgSlug || String(org?.id || '')}
        entityName={org?.name}
        organisationId={String(org?.id || currentOrgId || '')}
        initialEntityData={org ? {
          id: String(org.id),
          name: org.name,
          slug: org.slug,
          description: (org as any).description,
          is_active: (org as any).is_active ?? true,
          sport_id: (org as any).sport?.id || (org as any).sport_id || null,
        } : undefined}
        canEditGeneral={canEditOrganisation(permissionContext)}
        canEditBrand={canEditOrganisation(permissionContext)}
      />

      <UserDetailModal
        user={detailUser}
        opened={isUserDetailModalOpen}
        onClose={() => setIsUserDetailModalOpen(false)}
      />
    </>
  );
};
