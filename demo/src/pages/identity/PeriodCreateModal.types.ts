/**
 * Type definitions for PeriodCreateModal.
 */

export type OrgOption = { id: string; name: string; slug?: string };

export type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: any;
  parent_id?: any;
  parent_project_id?: any;
  parent_project?: any;
};

export type PeriodOption = { id: string; name: string; slug?: string; project?: any; parent_period?: any; parent_period_id?: any };

export interface PeriodCreatePayload {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;

  organisation_id?: string;
  project_id?: string;
  parent_period_id?: string;
  sport_id?: string;
}

export interface PeriodCreateModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  onCreate: (payload: PeriodCreatePayload) => Promise<void>;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];

  requireOrganisation?: boolean;
  requireClub?: boolean;
  requireTeam?: boolean;
  requireSeason?: boolean;
  showSportVariant?: boolean;

  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
  initialSeasonId?: string;
}
