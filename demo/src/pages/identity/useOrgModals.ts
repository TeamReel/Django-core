/**
 * Custom hook bundling all modal state for the Organisation Detail page.
 * Extracted from useOrgData.ts during Phase 21 refactor.
 */

import { useState } from 'react';
import type { Project } from '../../types';
import type { OrgModalState } from './orgDataTypes';

export function useOrgModals(): OrgModalState {
  const [selectedClub, setSelectedClub] = useState<Project | null>(null);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEditProject, setSelectedEditProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateClubModalOpen, setIsCreateClubModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isCreateSeasonModalOpen, setIsCreateSeasonModalOpen] = useState(false);
  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [isEditMemberRoleModalOpen, setIsEditMemberRoleModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isOrgDetailModalOpen, setIsOrgDetailModalOpen] = useState(false);
  const [isOrgEditModalOpen, setIsOrgEditModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);

  return {
    selectedClub, setSelectedClub,
    isClubModalOpen, setIsClubModalOpen,
    detailProject, setDetailProject,
    isDetailModalOpen, setIsDetailModalOpen,
    selectedEditProject, setSelectedEditProject,
    isEditModalOpen, setIsEditModalOpen,
    isCreateClubModalOpen, setIsCreateClubModalOpen,
    isCreateTeamModalOpen, setIsCreateTeamModalOpen,
    isAddMemberModalOpen, setIsAddMemberModalOpen,
    isCreateSeasonModalOpen, setIsCreateSeasonModalOpen,
    isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen,
    isCreateMatchModalOpen, setIsCreateMatchModalOpen,
    isEditMemberRoleModalOpen, setIsEditMemberRoleModalOpen,
    editingMember, setEditingMember,
    isOrgDetailModalOpen, setIsOrgDetailModalOpen,
    isOrgEditModalOpen, setIsOrgEditModalOpen,
    detailUser, setDetailUser,
    isUserDetailModalOpen, setIsUserDetailModalOpen,
  };
}
