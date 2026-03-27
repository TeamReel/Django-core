/**
 * Types for useUsersData hook
 */
import type { Dispatch, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { useAuth } from '@django-core/auth-ui';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import type { Organisation as SharedOrganisation } from '@/types';
import type { User as BaseUser } from '@/types/api/user';

export interface User extends Omit<BaseUser, 'organisations' | 'projects'> {
  organisations?: { id: string; name: string; slug: string; role: string }[];
  projects?: UserProjectRef[];
  [key: string]: unknown;
}

export type OrganisationOption = Pick<SharedOrganisation, 'id' | 'name' | 'slug'>;

export type ProjectOption = {
  id: string | number;
  slug?: string;
  name: string;
  organisation?: string | { id: string };
  parent_id?: string | number | null;
  parent?: string | number | null;
  parent_name?: string | null;
};

export type UserProjectRef = {
  id: string | number;
  slug?: string;
  role?: string;
  parent?: string | number | null;
  parent_name?: string | null;
  name?: string;
};

export type UserListEntry = Record<string, unknown> & {
  user?: User;
  projects?: UserProjectRef[];
  role?: string;
};

export const FALLBACK_ROLES = [
  'Superadmin', 'Land Admin', 'Club Admin', 'Team Admin',
  'Team Staff', 'Team Member', 'Supporter', 'Viewer', 'User',
];

export interface UseUsersDataReturn {
  // Context + navigation
  navigate: NavigateFunction;
  context: { organisation?: { id?: string; slug?: string; name?: string }; isLoading?: boolean };
  myOrganisations: Array<{ id: string; name: string; slug: string }>;
  orgIdParam: string | null;
  organisationOptions: BreadcrumbSwitcherOption[];
  handleOrganisationSwitch: (option: BreadcrumbSwitcherOption) => void;
  // Auth
  user: ReturnType<typeof useAuth>['user'];
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  waitingForOrgContext: boolean;
  // Data
  filteredUsers: UserListEntry[];
  isLoading: boolean;
  error: string | null;
  total: number;
  // Pagination
  currentPage: number;
  totalPages: number;
  limit: number;
  handlePageChange: (page: number) => void;
  // Filters
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  availableRoles: string[];
  selectedOrgId: string;
  setSelectedOrgId: Dispatch<SetStateAction<string>>;
  selectedClubId: string;
  setSelectedClubId: Dispatch<SetStateAction<string>>;
  selectedClubKey: string;
  setSelectedClubKey: Dispatch<SetStateAction<string>>;
  selectedTeamId: string;
  setSelectedTeamId: Dispatch<SetStateAction<string>>;
  selectedTeamKey: string;
  setSelectedTeamKey: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  roleFilter: string;
  setRoleFilter: Dispatch<SetStateAction<string>>;
  resetPageToFirst: () => void;
  // Breadcrumbs
  breadcrumbs: Array<{ label: string; onClick?: () => void; current?: boolean }>;
  // User actions
  handleEditClick: (u: User | UserListEntry) => void;
  handleSaveUser: (updatedData: Partial<User>) => Promise<void>;
  fetchUsers: () => void;
  // Modal state
  editingUser: User | null;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  detailUser: User | null;
  setDetailUser: Dispatch<SetStateAction<User | null>>;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: Dispatch<SetStateAction<boolean>>;
  isAddMemberOpen: boolean;
  setIsAddMemberOpen: Dispatch<SetStateAction<boolean>>;
  assignUser: User | null;
  setAssignUser: Dispatch<SetStateAction<User | null>>;
  isAssignModalOpen: boolean;
  setIsAssignModalOpen: Dispatch<SetStateAction<boolean>>;
  linkUser: User | null;
  setLinkUser: Dispatch<SetStateAction<User | null>>;
  isLinkModalOpen: boolean;
  setIsLinkModalOpen: Dispatch<SetStateAction<boolean>>;
}
