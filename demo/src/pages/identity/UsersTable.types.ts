/**
 * Types for the identity-level UsersTable components.
 */
import { type User } from './useUsersData';

/** Minimal shape for a user project membership from the API. */
export interface UserProject {
  id?: string | number;
  name?: string;
  slug?: string;
  parent?: string | number | null;
  parent_name?: string;
}

/** Shape for context obj passed into table. */
export interface TableContext {
  organisation?: { id?: string; slug?: string; name?: string };
}

/** A user row item — either a raw User or a membership wrapper with `.user`. */
export interface UserRowItem {
  id?: string;
  user?: User;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface UsersTableProps {
  filteredUsers: UserRowItem[];
  canManageUsers: boolean;
  isSuperAdmin: boolean;
  navigate: (to: string) => void;
  orgIdParam: string | null | undefined;
  context: TableContext;
  organisations: { id: string | number; name: string; slug?: string }[];
  selectedOrgId: string;
  selectedClubKey: string;
  selectedTeamKey: string;
  handleEditClick: (item: UserRowItem) => void;
  setDetailUser: (u: User | null) => void;
  setIsDetailModalOpen: (v: boolean) => void;
  setAssignUser: (u: User | null) => void;
  setIsAssignModalOpen: (v: boolean) => void;
  setLinkUser: (u: User | null) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  fetchUsers: () => void;
}

/** Props shared by UserRow and UserActions (excludes filteredUsers). */
export type UserRowProps = Omit<UsersTableProps, 'filteredUsers'>;
