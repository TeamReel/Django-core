/**
 * ContentGenerationModal — Shared type definitions
 */

// Generated output data - single variant
export interface GeneratedVariant {
  variant_index: number;
  image_base64: string | null;
  presigned_url: string | null;
  mime_type: string | null;
  filename: string | null;
  error: string | null;
  storage_info: {
    storage_backend: string;
    storage_path: string;
    file_size_bytes: number;
    mime_type: string;
    // Created record IDs
    file_asset_id?: string | null;
    brand_asset_id?: string | null;
    media_item_id?: string | null;
  } | null;
  metadata: Record<string, unknown>;
}

// Full generation response
export interface GenerationResponse {
  template_id: string;
  variant_count: number;
  variants: GeneratedVariant[];
}

// Legacy interface for backwards compatibility
export interface GeneratedOutput {
  image_base64: string | null;
  presigned_url: string | null;
  storage_info: {
    storage_backend: string;
    storage_path: string;
    file_size_bytes: number;
    mime_type: string;
    // Created record IDs
    file_asset_id?: string | null;
    brand_asset_id?: string | null;
    media_item_id?: string | null;
  } | null;
  metadata: Record<string, unknown>;
}

export interface ContentTemplate {
  id: number;
  name: string;
  description: string | null;
  template_type: string;
  template_subtype: string | null;
  style_variant: string | null;
  is_active?: boolean;
  credits_required?: number;
  sport?: number | null;
  sport_detail?: { id: number; name: string; slug?: string; parent_sport_id?: number | null } | null;
  formation_detail?: { code: string; name: string } | null;
  input_requirements?: {
    members?: {
      goalkeeper?: { count: number; asset_types?: string[] };
      player?: { count: number; asset_types?: string[] };
      coach?: { count: number; asset_types?: string[] };
      assistant?: { count: number; asset_types?: string[] };
      use_formation?: boolean;
    };
    match_data?: { required: string[] };
    organisation_assets?: { required: Array<{ type: string; label: string }> };
    output?: { type: string; format: string; dimensions?: { width: number; height: number; aspect_ratio: string } };
  };
}

export interface Participation {
  id: string;
  user?: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar_url?: string;
  };
  member?: {
    id: string;
    user_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  role?: string;
  status?: string;
  functional_roles?: string[];
  data?: {
    side?: 'home' | 'away';
    jersey_number?: number;
    position?: string;
    is_captain?: boolean;
    functional_role?: string;
    asset_warning?: string;
  };
  metadata?: {
    team_role?: string;
    position?: string;
    shirt_number?: string;
    functional_roles?: string[];
    teamreel_assets?: Record<string, any>;
    [key: string]: unknown;
  };
}

export interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: {
    id: string;
    title?: string;
    project?: { id: string; name: string };
    opponent_project?: { id: string; name: string };
    participations?: Participation[];
    start_time?: string;
    location?: string;
    metadata?: { formation?: string; lineup?: { formation?: string; goalkeeper?: string[]; player?: string[] }; [key: string]: unknown };
  } | null;
  season?: {
    id: string;
    name: string;
    project_id?: string | number;
  } | null;
  organisationSport?: { id: number | string; name: string; slug?: string } | null;
  /** Organisation ID for brand/storage scoping */
  organisationId?: string | null;
  /** Pre-selected template — skips type/template selection */
  template?: ContentTemplate | null;
  /** Content type label for header */
  contentTypeLabel?: string;
  /** Asset type for BrandAsset linking (e.g. logo, kit_home) */
  assetType?: string | null;
  /** Callback fired when content has been successfully submitted/queued */
  onGenerated?: (message?: string) => void;
  /** Club logo URL for home team (score display) */
  homeLogoUrl?: string | null;
  /** Club logo URL for away team (score display) */
  awayLogoUrl?: string | null;
  /** Resolved home team name (club name, respects is_home) */
  homeTeamName?: string | null;
  /** Resolved away team name (club name, respects is_home) */
  awayTeamName?: string | null;
}

// Formation position layout data
export interface FormationPosition {
  slot: number;
  x: number;  // percentage from left
  y: number;  // percentage from top (0 = attacking end)
  label: string;
}

// Step type
export type StepType = 'type' | 'template' | 'members' | 'lineup_squad' | 'confirm' | 'generating' | 'video_queued' | 'success' | 'error';
