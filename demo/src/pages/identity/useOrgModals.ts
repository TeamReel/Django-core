/**
 * Custom hook bundling all modal state for the Organisation Detail page.
 * Extracted from useOrgData.ts during Phase 21 refactor.
 * Consolidated to useReducer during S3 refactor.
 */

import { useReducer, useMemo } from 'react';
import { formReducer, makeSetter } from '@/utils/formReducer';
import type { Project, User } from '../../types';
import type { OrgModalState } from './orgDataTypes';

interface OrgModalsInternal {
  selectedClub: Project | null;
  isClubModalOpen: boolean;
  detailProject: Project | null;
  isDetailModalOpen: boolean;
  selectedEditProject: Project | null;
  isEditModalOpen: boolean;
  isCreateClubModalOpen: boolean;
  isCreateTeamModalOpen: boolean;
  isAddMemberModalOpen: boolean;
  isCreateSeasonModalOpen: boolean;
  isCreateCompetitionModalOpen: boolean;
  isCreateMatchModalOpen: boolean;
  isEditMemberRoleModalOpen: boolean;
  editingMember: Record<string, unknown> | null;
  isOrgDetailModalOpen: boolean;
  isOrgEditModalOpen: boolean;
  detailUser: User | null;
  isUserDetailModalOpen: boolean;
}

const initial: OrgModalsInternal = {
  selectedClub: null, isClubModalOpen: false,
  detailProject: null, isDetailModalOpen: false,
  selectedEditProject: null, isEditModalOpen: false,
  isCreateClubModalOpen: false, isCreateTeamModalOpen: false,
  isAddMemberModalOpen: false, isCreateSeasonModalOpen: false,
  isCreateCompetitionModalOpen: false, isCreateMatchModalOpen: false,
  isEditMemberRoleModalOpen: false, editingMember: null,
  isOrgDetailModalOpen: false, isOrgEditModalOpen: false,
  detailUser: null, isUserDetailModalOpen: false,
};

export function useOrgModals(): OrgModalState {
  const [s, dispatch] = useReducer(formReducer<OrgModalsInternal>, initial);

  const setters = useMemo(() => ({
    setSelectedClub: makeSetter<OrgModalsInternal, 'selectedClub'>(dispatch, 'selectedClub'),
    setIsClubModalOpen: makeSetter<OrgModalsInternal, 'isClubModalOpen'>(dispatch, 'isClubModalOpen'),
    setDetailProject: makeSetter<OrgModalsInternal, 'detailProject'>(dispatch, 'detailProject'),
    setIsDetailModalOpen: makeSetter<OrgModalsInternal, 'isDetailModalOpen'>(dispatch, 'isDetailModalOpen'),
    setSelectedEditProject: makeSetter<OrgModalsInternal, 'selectedEditProject'>(dispatch, 'selectedEditProject'),
    setIsEditModalOpen: makeSetter<OrgModalsInternal, 'isEditModalOpen'>(dispatch, 'isEditModalOpen'),
    setIsCreateClubModalOpen: makeSetter<OrgModalsInternal, 'isCreateClubModalOpen'>(dispatch, 'isCreateClubModalOpen'),
    setIsCreateTeamModalOpen: makeSetter<OrgModalsInternal, 'isCreateTeamModalOpen'>(dispatch, 'isCreateTeamModalOpen'),
    setIsAddMemberModalOpen: makeSetter<OrgModalsInternal, 'isAddMemberModalOpen'>(dispatch, 'isAddMemberModalOpen'),
    setIsCreateSeasonModalOpen: makeSetter<OrgModalsInternal, 'isCreateSeasonModalOpen'>(dispatch, 'isCreateSeasonModalOpen'),
    setIsCreateCompetitionModalOpen: makeSetter<OrgModalsInternal, 'isCreateCompetitionModalOpen'>(dispatch, 'isCreateCompetitionModalOpen'),
    setIsCreateMatchModalOpen: makeSetter<OrgModalsInternal, 'isCreateMatchModalOpen'>(dispatch, 'isCreateMatchModalOpen'),
    setIsEditMemberRoleModalOpen: makeSetter<OrgModalsInternal, 'isEditMemberRoleModalOpen'>(dispatch, 'isEditMemberRoleModalOpen'),
    setEditingMember: makeSetter<OrgModalsInternal, 'editingMember'>(dispatch, 'editingMember'),
    setIsOrgDetailModalOpen: makeSetter<OrgModalsInternal, 'isOrgDetailModalOpen'>(dispatch, 'isOrgDetailModalOpen'),
    setIsOrgEditModalOpen: makeSetter<OrgModalsInternal, 'isOrgEditModalOpen'>(dispatch, 'isOrgEditModalOpen'),
    setDetailUser: makeSetter<OrgModalsInternal, 'detailUser'>(dispatch, 'detailUser'),
    setIsUserDetailModalOpen: makeSetter<OrgModalsInternal, 'isUserDetailModalOpen'>(dispatch, 'isUserDetailModalOpen'),
  }), [dispatch]);

  return {
    selectedClub: s.selectedClub, setSelectedClub: setters.setSelectedClub,
    isClubModalOpen: s.isClubModalOpen, setIsClubModalOpen: setters.setIsClubModalOpen,
    detailProject: s.detailProject, setDetailProject: setters.setDetailProject,
    isDetailModalOpen: s.isDetailModalOpen, setIsDetailModalOpen: setters.setIsDetailModalOpen,
    selectedEditProject: s.selectedEditProject, setSelectedEditProject: setters.setSelectedEditProject,
    isEditModalOpen: s.isEditModalOpen, setIsEditModalOpen: setters.setIsEditModalOpen,
    isCreateClubModalOpen: s.isCreateClubModalOpen, setIsCreateClubModalOpen: setters.setIsCreateClubModalOpen,
    isCreateTeamModalOpen: s.isCreateTeamModalOpen, setIsCreateTeamModalOpen: setters.setIsCreateTeamModalOpen,
    isAddMemberModalOpen: s.isAddMemberModalOpen, setIsAddMemberModalOpen: setters.setIsAddMemberModalOpen,
    isCreateSeasonModalOpen: s.isCreateSeasonModalOpen, setIsCreateSeasonModalOpen: setters.setIsCreateSeasonModalOpen,
    isCreateCompetitionModalOpen: s.isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen: setters.setIsCreateCompetitionModalOpen,
    isCreateMatchModalOpen: s.isCreateMatchModalOpen, setIsCreateMatchModalOpen: setters.setIsCreateMatchModalOpen,
    isEditMemberRoleModalOpen: s.isEditMemberRoleModalOpen, setIsEditMemberRoleModalOpen: setters.setIsEditMemberRoleModalOpen,
    editingMember: s.editingMember, setEditingMember: setters.setEditingMember,
    isOrgDetailModalOpen: s.isOrgDetailModalOpen, setIsOrgDetailModalOpen: setters.setIsOrgDetailModalOpen,
    isOrgEditModalOpen: s.isOrgEditModalOpen, setIsOrgEditModalOpen: setters.setIsOrgEditModalOpen,
    detailUser: s.detailUser, setDetailUser: setters.setDetailUser,
    isUserDetailModalOpen: s.isUserDetailModalOpen, setIsUserDetailModalOpen: setters.setIsUserDetailModalOpen,
  };
}
