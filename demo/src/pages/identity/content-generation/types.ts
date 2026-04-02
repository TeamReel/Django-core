// ContentGenerationModal shared types and constants
// Extracted from ContentGenerationModal.tsx for reusability

// Re-export constants and helpers for backward compatibility
export {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_TO_MEDIA_KEY,
  FORMATION_LAYOUTS,
  CONTENT_TYPES,
} from './contentGenConstants';

export {
  getSecureMimeType,
  groupParticipationsByRole,
  memberHasAsset,
  memberHasRequiredAssets,
  getMissingAssets,
  getMemberName,
} from './contentGenHelpers';

export { useFormations, getFormationLayouts } from './useFormations';
export type { FormationLayoutMap } from './useFormations';

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

// Template interface
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

// Participation/member interface
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
  };
  metadata?: Record<string, unknown>;
}

// Formation position layout data (x, y as percentages on a mini-field)
// Positions numbered 1-11: 1=GK, 2-5=DEF, 6-8=MID, 9-11=ATT (varies by formation)
export interface FormationPosition {
  slot: number;
  x: number;  // percentage from left
  y: number;  // percentage from top (0 = attacking end)
  label: string;
  line?: string;
  position?: string;
}

// Step type for the modal wizard
export type ModalStep = 'type' | 'template' | 'members' | 'lineup_squad' | 'confirm' | 'generating' | 'video_queued' | 'success' | 'error';

// Selected type info
export interface SelectedTypeInfo {
  type: string;
  subtype: string;
  label: string;
}

// Match data interface (partial - what's used in the modal)
export interface MatchData {
  id?: string;
  title?: string;
  start_time?: string;
  project?: {
    id: string;
    name: string;
  };
  opponent_project?: {
    id: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

// Season interface
export interface Season {
  id: string;
  project_id?: string;
}

// Organisation sport interface
export interface OrganisationSport {
  id: number;
  name: string;
  slug?: string;
}
