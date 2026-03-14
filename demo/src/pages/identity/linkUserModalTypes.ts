export type Organisation = {
  id: string | number;
  name: string;
  slug?: string;
};

export type ProjectOption = {
  id: string | number;
  slug?: string;
  name: string;
  organisation?: string | { id: string | number };
  parent_id?: string | number | null;
};

export type User = {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  organisations?: Array<{ id: string | number; slug?: string; name?: string; membership_id?: string | number }>;
  projects?: Array<{ id?: string | number; slug?: string | null; membership_id?: string | number | null }>;
};

export type PeriodOption = {
  id: string;
  name: string;
  parent_period?: { id: string; name?: string } | null;
  data?: Record<string, unknown>;
};

export interface LinkUserModalProps {
  opened: boolean;
  onClose: () => void;
  user: User | null;
  organisations: Organisation[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  initialOrganisationSlugOrId?: string;
  onSuccess: () => void;
}

export const accessRoleOptions: Array<{ value: 'viewer' | 'editor' | 'admin'; label: string }> = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

export const functionalRoleOptions: Array<{ value: string; label: string }> = [
  { value: 'player', label: 'Player' },
  { value: 'keeper', label: 'Keeper' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'verzorger', label: 'Verzorger' },
  { value: 'manager', label: 'Manager' },
  { value: 'supporter', label: 'Supporter' },
];
