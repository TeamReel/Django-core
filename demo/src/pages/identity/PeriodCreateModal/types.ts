/**
 * Type definitions for PeriodCreateModal.
 */

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

export type PeriodOption = { id: string; name: string; slug?: string; project?: { id?: string | number; name?: string } | null; project_id?: string | number; parent_period?: { id?: string | number; name?: string } | null; parent_period_id?: string | number | null };

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

export interface PeriodCreateRequirements {
  requireOrganisation?: boolean;
  requireClub?: boolean;
  requireTeam?: boolean;
  requireSeason?: boolean;
  showSportVariant?: boolean;
}

export interface PeriodCreateModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  onCreate: (payload: PeriodCreatePayload) => Promise<void>;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];

  requirements?: PeriodCreateRequirements;

  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
  initialSeasonId?: string;
}
