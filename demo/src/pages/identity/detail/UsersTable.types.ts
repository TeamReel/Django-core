/** Types for the detail/UsersTable component. */

/** Project membership record from the API */
export interface ProjectMembershipRecord {
  project_id?: string;
  project?: {
    id?: string;
    name?: string;
    slug?: string;
    title?: string;
    parent_id?: string;
    parent_project_id?: string;
    parent?: { id?: string };
  };
  project_name?: string;
  project_slug?: string;
  club_id?: string;
  club?: { id?: string };
  role?: string;
  functional_roles?: string[];
  functionalRoles?: string[];
  metadata?: Record<string, unknown>;
}

/** User nested within an org membership row */
export interface MembershipItemUser {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_superuser?: boolean;
  role?: string;
  project_memberships?: ProjectMembershipRecord[];
  project_membership_details?: ProjectMembershipRecord[];
}

/** A single row in the users table (org membership + nested user) */
export interface MembershipItem {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user?: MembershipItemUser;
  organisation_membership_id?: string;
  organisationMembershipId?: string;
  role?: string;
  is_superuser?: boolean;
  project_memberships?: ProjectMembershipRecord[];
  project_membership_details?: ProjectMembershipRecord[];
}

/** Team record from the teamById lookup map */
export interface TeamRecord {
  id: string;
  slug?: string;
  name?: string;
  parent_id?: string;
  parent_project_id?: string;
  parent?: { id?: string };
}

export type UsersTableProps = {
  isTeamRoute: boolean;
  pageItems: MembershipItem[];
  currentOrgSlug: string;
  currentClubSlugOrId: string;
  currentClubId: string;
  currentProjectId: string;
  teamById: Map<string, TeamRecord>;
  userCanManageMembers: boolean;
  seasonId?: string;
  onOpenAssignSeason?: (item: MembershipItem) => void;
  onOpenUnassignSeason?: (item: MembershipItem) => void;
  onViewUser?: (user: MembershipItemUser) => void;
  onViewMembership: (membershipId: string) => void;
  onEditMembership: (args: { item: MembershipItem; teamId?: string }) => void;
  onRemoveMembership: (membershipId: string, email: string) => Promise<void>;
};
