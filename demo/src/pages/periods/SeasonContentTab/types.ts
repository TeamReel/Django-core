/**
 * SeasonContentTab types
 */
import type { SeasonOrganisation as Organisation } from '../../../types/season';
import type { ContentTemplate } from '../../identity/ContentGenerationModal';
import type { ThenVsNowVideoType } from '../ThenVsNowModal';
import type { VideoJob } from '../../../hooks/useVideoJobs';

/** Squad member record with metadata and media assets */
export interface SquadMember {
  id?: string;
  user?: { id?: string; first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  user_id?: string;
  shirt_number?: string | number;
  position?: string;
  metadata?: { teamreel_assets?: Record<string, any>; shirt_number?: string | number; position?: string; [key: string]: unknown };
  [key: string]: any;
}

export interface SeasonContentTabProps {
  org: Organisation | null;
  projectId: string;
  seasonId: string;
  apiBaseUrl: string;
  members: SquadMember[];
  pushToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export interface ThenVsNowEligibleMember {
  id: string;
  userId: string;
  name: string;
  shirtNumber?: string;
  position?: string;
  hasDuoPortret: boolean;
  hasDuoPortretCover: boolean;
  hasDuoPortretOverlay: boolean;
  hasSidebysideCover: boolean;
  hasSidebysideOverlay: boolean;
  hasTransformation: boolean;
  hasWalkingComposite: boolean;
  transformationKeys: string[];
}
