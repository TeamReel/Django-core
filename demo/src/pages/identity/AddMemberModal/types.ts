/**
 * AddMemberModal - Type definitions
 */

export type ContextLevel = 'organisation' | 'club' | 'team';

export interface UserResult {
  id: string | number;
  first_name?: string;
  last_name?: string;
  email: string;
}

export interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** The hierarchy level we're adding the member to */
  contextLevel: ContextLevel;
  /** Organisation slug (always required) */
  orgSlug: string;
  /** Club project PK (required when contextLevel is club or team) */
  clubProjectId?: string | number;
  /** Team project PK (required when contextLevel is team) */
  teamProjectId?: string | number;
}

export interface NewUserFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export const LEVEL_LABEL: Record<ContextLevel, string> = {
  organisation: 'Federation',
  club: 'Club',
  team: 'Team',
};
