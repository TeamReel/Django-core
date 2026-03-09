// ─── Shared types for MatchCreateModal ───────────────────────────────────────

export type OrgOption = { id: string; name: string; slug?: string };

export type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: any;
  parent_id?: any;
  parent?: any;
  parent_project_id?: any;
  parent_project?: any;
};

export type PeriodOption = {
  id: string;
  name: string;
  slug?: string;
  parent_period?: any;
  parent_period_id?: any;
};

export interface MatchCreatePayload {
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;

  metadata?: any;

  venue?: 'Home' | 'Away';

  opponent_project_id?: string;

  organisation_id?: string;
  project_id?: string;
  season_id?: string;
  period_id?: string;
}

export interface MatchCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: MatchCreatePayload) => Promise<void>;

  headerText?: string;
  submitText?: string;

  mode?: 'default' | 'season-detail' | 'team-context';

  apiBaseUrl?: string;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];

  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
  initialSeasonId?: string;
  initialCompetitionId?: string;

  initialOpponentOrganisationId?: string;
  initialOpponentClubId?: string;
  initialOpponentTeamId?: string;

  initialTitle?: string;
  initialMatchDate?: string;
  initialMatchTime?: string;
  initialVenue?: 'Home' | 'Away';
  initialLocation?: string;
  initialDescription?: string;
}
