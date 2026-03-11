export type OrgOption = { id: string; name: string; slug?: string };

export type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: { id?: string | number; name?: string; slug?: string } | string | number;
  parent?: { id?: string | number; name?: string } | string | number | null;
  parent_id?: string | number | null;
  parent_project_id?: string | number | null;
  parent_project?: { id?: string | number; name?: string } | string | number | null;
};

export type UserOption = {
  id: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
};

export interface SeasonSquadAddMemberPayload {
  organisation_id?: string;
  club_id?: string;
  project_id: string;
  user_id: string;
  position?: string;
  shirt_number?: string;
}

export interface SeasonSquadAddMemberModalProps {
  opened: boolean;
  onClose: () => void;
  onAdd: (payload: SeasonSquadAddMemberPayload) => Promise<void>;
  apiBaseUrl: string;
  seasonId: string;
  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];
  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
}
