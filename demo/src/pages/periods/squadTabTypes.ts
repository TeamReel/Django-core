/** Shape for a squad membership record. */
export interface SquadMember {
  id?: string;
  user?: { id?: string; name?: string; first_name?: string; last_name?: string; email?: string };
  role?: string;
  metadata?: { position?: string; shirt_number?: string | number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface SeasonSquadTabProps {
  members: SquadMember[];
  membersLoading: boolean;
  membersError: string | null;
  userCanEditProject: boolean;
  bulkSubmitting: boolean;
  isTeamRoute: boolean;
  apiBaseUrl: string;
  projectId: string;
  memberDetailHref: (membershipId: string) => string;
  unassignMembershipsFromSeasonSquad: (ids: string[]) => Promise<void>;
  setIsAddSquadMemberModalOpen: (v: boolean) => void;
  onMemberUpdated: (membershipId: string, role: string, functionalRoles: string[]) => void;
  // Team roster (for merged "Niet in selectie" section)
  teamRoster?: SquadMember[];
  teamRosterLoading?: boolean;
  teamRosterError?: string | null;
  assignUsersToSeasonSquad?: (userIds: string[]) => Promise<void>;
  getBestRoleForUser?: (userId: string) => string;
  getFunctionalRolesForUser?: (userId: string) => string[];
}
