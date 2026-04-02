/**
 * Shared types for MatchDetailPage and its tab sub-components.
 * Extracted from the monolithic MatchDetailPage.tsx during Phase 0 refactor.
 */

export type Organisation = {
  id: string;
  name: string;
  slug?: string;
  sport?: {
    id: string | number;
    name: string;
    slug?: string;
    sport_icon?: string | null;
    parent_sport_id?: number | null;
  } | null;
};

export type Project = { id: string; name: string; slug?: string };

export type Participation = {
  id: string;
  member?: { id: string; user_name?: string };
  role?: string;
  status?: string;
  data?: {
    side?: 'home' | 'away';
    jersey_number?: number;
    position?: string;
    is_captain?: boolean;
    team_name?: string;
    team_id?: string;
    asset_warning?: string;
  };
};

export type ActivityEvent = {
  id: string;
  event_type: string;
  minute?: number;
  team_project?: { id: string; name: string };
  member?: { id: string; user_name?: string };
  related_member?: { id: string; user_name?: string };
  data?: Record<string, unknown>;
};

export type OrgMember = {
  id: string;
  role?: string;
  user?: {
    id: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
};

export type SeasonSquadParticipation = {
  id: string;
  member?: { id: string; user_name?: string };
  period?: { id: string; name?: string };
  role?: string;
  status?: string;
  data?: Record<string, unknown>;
};

export type ProjectMember = {
  id: string;
  role?: string;
  organisation_membership_id?: string;
  user?: {
    id: string | number;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
  user_id?: string | number;
};

export type MatchDetail = {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  activity_type?: string;
  project: { id: string; name: string; slug?: string };
  opponent_project?: { id: string; name: string; slug?: string };
  period?: {
    id: string;
    name: string;
    parent_period?: { id: string; name: string } | null;
  };
  metadata?: Record<string, any>;
  participations?: Participation[];
  events?: ActivityEvent[];
};

export type Period = {
  id: string;
  name: string;
  parent_period?: { id: string; name: string } | null;
  sport?: {
    id: string | number;
    name: string;
    slug?: string;
    sport_icon?: string | null;
    parent_sport_id?: number | null;
  } | null;
};

export type ContentItemStatus =
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'approved'
  | 'rejected';

export type ContentItem = {
  id: string;
  template: { id: number; name: string; template_subtype?: string | null };
  status: ContentItemStatus;
  created_at: string;
  output_file?: { id: string; url: string; file_name?: string } | null;
  error_message?: string | null;
};

export type SavedAssetPreview = {
  title: string;
  url: string;
  isVideo: boolean;
  subtitle?: string;
} | null;
