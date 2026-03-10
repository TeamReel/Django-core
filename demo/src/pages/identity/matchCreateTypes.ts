// ─── Shared types for MatchCreateModal ───────────────────────────────────────

export type OrgOption = { id: string; name: string; slug?: string };

export type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: { id?: string | number; name?: string; slug?: string } | string | number;
  parent_id?: string | number | null;
  parent?: { id?: string | number; name?: string } | string | number | null;
  parent_project_id?: string | number | null;
  parent_project?: { id?: string | number; name?: string } | string | number | null;
};

export type PeriodOption = {
  id: string;
  name: string;
  slug?: string;
  parent_period?: { id?: string | number; name?: string } | null;
  parent_period_id?: string | number | null;
};

export interface MatchCreatePayload {
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;

  metadata?: Record<string, unknown>;

  venue?: 'Home' | 'Away';

  opponent_project_id?: string;

  organisation_id?: string;
  project_id?: string;
  season_id?: string;
  period_id?: string;
}

export interface MatchSelectOptions {
  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];
}

export interface MatchInitialIds {
  organisationId?: string;
  clubId?: string;
  teamId?: string;
  seasonId?: string;
  competitionId?: string;
}

export interface MatchInitialOpponent {
  organisationId?: string;
  clubId?: string;
  teamId?: string;
}

export interface MatchInitialFormValues {
  title?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: 'Home' | 'Away';
  location?: string;
  description?: string;
}

export interface MatchCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: MatchCreatePayload) => Promise<void>;

  headerText?: string;
  submitText?: string;

  mode?: 'default' | 'season-detail' | 'team-context';

  apiBaseUrl?: string;

  selectOptions?: MatchSelectOptions;
  initialIds?: MatchInitialIds;
  initialOpponent?: MatchInitialOpponent;
  initialFormValues?: MatchInitialFormValues;
}
