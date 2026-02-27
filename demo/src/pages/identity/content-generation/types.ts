// ContentGenerationModal shared types and constants
// Extracted from ContentGenerationModal.tsx for reusability

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
}

// Asset type labels
export const ASSET_TYPE_LABELS: Record<string, string> = {
  profile_photo: 'Profile Photo',
  legacy_photo: 'Legacy Photo',
  in_tenue: 'In Tenue',
  close_up: 'Close-up',
  short_intro: 'Short Intro',
  celebration: 'Celebration',
  legacy: 'Legacy in Tenue',
};

// Asset type to media key mapping
export const ASSET_TYPE_TO_MEDIA_KEY: Record<string, string> = {
  profile_photo: 'profile_photo',
  legacy_photo: 'legacy_photo',
  in_tenue: 'in_tenue',
  'in-tenue': 'in_tenue',
  close_up: 'close_up',
  'close-up': 'close_up',
  closeup: 'close_up',
  short_intro: 'short_intro',
  celebration: 'celebration',
  legacy: 'legacy',
};

// Formation layouts for different formations
export const FORMATION_LAYOUTS: Record<string, { name: string; positions: FormationPosition[] }> = {
  '4-3-3': {
    name: '4-3-3',
    positions: [
      // Goalkeeper
      { slot: 1, x: 50, y: 90, label: 'GK' },
      // Defense (4)
      { slot: 2, x: 15, y: 72, label: 'LB' },
      { slot: 3, x: 35, y: 75, label: 'CB' },
      { slot: 4, x: 65, y: 75, label: 'CB' },
      { slot: 5, x: 85, y: 72, label: 'RB' },
      // Midfield (3)
      { slot: 6, x: 30, y: 50, label: 'CM' },
      { slot: 7, x: 50, y: 55, label: 'CDM' },
      { slot: 8, x: 70, y: 50, label: 'CM' },
      // Attack (3)
      { slot: 9, x: 20, y: 22, label: 'LW' },
      { slot: 10, x: 50, y: 18, label: 'ST' },
      { slot: 11, x: 80, y: 22, label: 'RW' },
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    positions: [
      // Goalkeeper
      { slot: 1, x: 50, y: 90, label: 'GK' },
      // Defense (4)
      { slot: 2, x: 15, y: 72, label: 'LB' },
      { slot: 3, x: 35, y: 75, label: 'CB' },
      { slot: 4, x: 65, y: 75, label: 'CB' },
      { slot: 5, x: 85, y: 72, label: 'RB' },
      // Midfield (4)
      { slot: 6, x: 15, y: 48, label: 'LM' },
      { slot: 7, x: 38, y: 52, label: 'CM' },
      { slot: 8, x: 62, y: 52, label: 'CM' },
      { slot: 9, x: 85, y: 48, label: 'RM' },
      // Attack (2)
      { slot: 10, x: 35, y: 22, label: 'ST' },
      { slot: 11, x: 65, y: 22, label: 'ST' },
    ],
  },
  '3-4-3': {
    name: '3-4-3',
    positions: [
      // Goalkeeper
      { slot: 1, x: 50, y: 90, label: 'GK' },
      // Defense (3)
      { slot: 2, x: 25, y: 75, label: 'CB' },
      { slot: 3, x: 50, y: 78, label: 'CB' },
      { slot: 4, x: 75, y: 75, label: 'CB' },
      // Midfield (4)
      { slot: 5, x: 15, y: 50, label: 'LWB' },
      { slot: 6, x: 38, y: 55, label: 'CM' },
      { slot: 7, x: 62, y: 55, label: 'CM' },
      { slot: 8, x: 85, y: 50, label: 'RWB' },
      // Attack (3)
      { slot: 9, x: 20, y: 22, label: 'LW' },
      { slot: 10, x: 50, y: 18, label: 'ST' },
      { slot: 11, x: 80, y: 22, label: 'RW' },
    ],
  },
};

// Content type definitions - organized by template_type, with items having template_subtype
// Labels match backend TemplateSubtype choices
export const CONTENT_TYPES = {
  pre_match: {
    label: 'Pre-match',
    sportRequired: true,
    items: [
      { id: 'flyer', label: 'Match Flyer', icon: '📣', subtype: 'flyer' },
      { id: 'lineup', label: 'Lineup Video', icon: '🎬', subtype: 'lineup' },
      { id: 'lineup_flyer', label: 'Lineup Flyer', icon: '📋', subtype: 'lineup_flyer' },
      { id: 'match_intro', label: 'Match Intro', icon: '🎥', subtype: 'match_intro' },
      { id: 'poster', label: 'Elftalfoto', icon: '📸', subtype: 'poster' },
      { id: 'walkon', label: 'Walk-on Video', icon: '🚶', subtype: 'walkon' },
      { id: 'anthem', label: 'Anthem Video', icon: '🎵', subtype: 'anthem' },
    ],
  },
  during_match: {
    label: 'During match',
    sportRequired: true,
    items: [
      { id: 'goal', label: 'Goal Celebration', icon: '⚽', subtype: 'goal' },
      { id: 'score_update', label: 'Score Update', icon: '🔢', subtype: 'score_update' },
    ],
  },
  post_match: {
    label: 'Post-match',
    sportRequired: true,
    items: [
      { id: 'end_score', label: 'Final Score', icon: '🏁', subtype: 'end_score' },
      { id: 'match_summary', label: 'Match Summary', icon: '📊', subtype: 'match_summary' },
      { id: 'highlights', label: 'Highlights Reel', icon: '🎬', subtype: 'highlights' },
    ],
  },
  season: {
    label: 'Season',
    sportRequired: true,
    items: [
      { id: 'duo_portret_cover', label: 'Duo Portret Cover', icon: '👥', subtype: 'duo_portret_cover' },
      { id: 'duo_portret_overlay', label: 'Duo Portret Overlay', icon: '👥', subtype: 'duo_portret_overlay' },
      { id: 'sidebyside_cover', label: 'Then vs Now Cover', icon: '⏪', subtype: 'sidebyside_cover' },
      { id: 'sidebyside_overlay', label: 'Then vs Now Overlay', icon: '⏪', subtype: 'sidebyside_overlay' },
      { id: 'transformation', label: 'Transformation', icon: '🔄', subtype: 'transformation' },
      { id: 'walking_composite', label: 'Walking Composite', icon: '🚶', subtype: 'walking_composite' },
    ],
  },
  member: {
    label: 'Member',
    sportRequired: false, // Member templates don't require sport selection
    items: [
      { id: 'member_intro', label: 'Short Intro', icon: '👋', subtype: 'member_intro' },
      { id: 'member_goal_celebration', label: 'Goal Celebration', icon: '⚽', subtype: 'member_goal_celebration' },
      { id: 'member_in_tenue', label: 'In Tenue', icon: '👕', subtype: 'member_in_tenue' },
      { id: 'member_action_photo', label: 'Actiefoto', icon: '⚡', subtype: 'member_action_photo' },
      { id: 'member_legacy_closeup', label: 'Legacy Closeup', icon: '📷', subtype: 'member_legacy_closeup' },
      { id: 'member_legacy_in_tenue', label: 'Legacy In Tenue', icon: '🎽', subtype: 'member_legacy_in_tenue' },
    ],
  },
  custom: {
    label: 'Custom',
    sportRequired: false, // Custom templates don't require sport selection
    items: [
      { id: 'custom_logo', label: 'Logo', icon: '🏷️', subtype: 'custom_logo' },
      { id: 'custom_tenue', label: 'Tenue', icon: '👕', subtype: 'custom_tenue' },
      { id: 'custom_tenue_logo', label: 'Tenue + Logo', icon: '🎨', subtype: 'custom_tenue_logo' },
      { id: 'custom_tenue_logo_sponsor', label: 'Tenue + Logo + Sponsor', icon: '🏆', subtype: 'custom_tenue_logo_sponsor' },
    ],
  },
};

// Helper to detect mime type from base64 signature
export const getSecureMimeType = (base64: string | null, declaredType: string | null): string => {
  if (!base64) return declaredType || 'image/png';
  // JPEG signature
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  // PNG signature
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  // GIF signature
  if (base64.startsWith('R0lGODdh') || base64.startsWith('R0lGODlh')) return 'image/gif';
  // WebP signature
  if (base64.startsWith('UklGR')) return 'image/webp';
  return declaredType || 'image/png';
};

// Group participations by functional role
export function groupParticipationsByRole(participations: Participation[]): Record<string, Participation[]> {
  const groups: Record<string, Participation[]> = {
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  };

  for (const p of participations) {
    // Check functional_roles first (can be an array)
    const functionalRoles = p.functional_roles || [];

    if (functionalRoles.includes('goalkeeper')) {
      groups.goalkeeper.push(p);
    } else if (functionalRoles.includes('coach')) {
      groups.coach.push(p);
    } else if (functionalRoles.includes('assistant')) {
      groups.assistant.push(p);
    } else if (functionalRoles.some((r: string) => ['player', 'defender', 'midfielder', 'forward', 'attacker'].includes(r))) {
      groups.player.push(p);
    } else if (p.role === 'goalkeeper') {
      groups.goalkeeper.push(p);
    } else if (p.role === 'coach') {
      groups.coach.push(p);
    } else if (p.role === 'assistant') {
      groups.assistant.push(p);
    } else {
      // Default to player
      groups.player.push(p);
    }
  }

  return groups;
}

// Check if a member has a specific asset, optionally verifying role-specific variant
export function memberHasAsset(member: Participation, assetType: string, role?: string): boolean {
  const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;

  // Get the metadata from either user or member
  const meta = (member.metadata as Record<string, unknown>) || {};

  // Check teamreel_assets structure introduced by /api/v1/projects/{id}/members/ enrichment
  const teamreelAssets = meta.teamreel_assets as Record<string, unknown> | undefined;
  if (teamreelAssets) {
    const images = teamreelAssets.images as Record<string, unknown> | undefined;
    const videos = teamreelAssets.videos as Record<string, unknown> | undefined;

    // Check legacy photo (variant keyed lookup e.g. legacy_photo['home'])
    if (mediaKey === 'legacy_photo' && images?.legacy_photo) {
      const legacyObj = images.legacy_photo as Record<string, unknown>;
      if (role && legacyObj[role]) return true;
      if (Object.keys(legacyObj).length > 0) return true;
    }

    // For other images, check presence in images map
    if (images && mediaKey in images) {
      const assetData = images[mediaKey] as unknown;
      if (assetData)  {
        // May be keyed by variant
        if (typeof assetData === 'object' && assetData !== null && Object.keys(assetData).length > 0) return true;
        if (typeof assetData === 'string') return true;
      }
    }

    // Check videos (short_intro, celebration)
    if (videos && mediaKey in videos) {
      const vidData = videos[mediaKey] as unknown;
      if (vidData) {
        if (typeof vidData === 'object' && vidData !== null && Object.keys(vidData).length > 0) return true;
        if (typeof vidData === 'string') return true;
      }
    }
  }

  // Fallback: check flat metadata keys (older format)
  if ((meta[mediaKey] as unknown)) {
    const val = meta[mediaKey] as unknown;
    if (val && typeof val === 'object' && (val as Record<string, unknown>).processed) return true;
    if (val && typeof val === 'object' && (val as Record<string, unknown>).raw) return true;
    if (typeof val === 'string') return true;
  }

  return false;
}

// Check if a member has all required assets
export function memberHasRequiredAssets(member: Participation, assetTypes: string[], role?: string): boolean {
  return assetTypes.every(type => memberHasAsset(member, type, role));
}

// Get list of missing assets for a member
export function getMissingAssets(member: Participation, assetTypes: string[], role?: string): string[] {
  return assetTypes.filter(type => !memberHasAsset(member, type, role));
}

// Get member display name
export function getMemberName(p: Participation): string {
  const user = p.user || p.member;
  if (!user) return 'Unknown';
  if ('name' in user && user.name) return user.name;
  if ('user_name' in user && user.user_name) return user.user_name;
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName) return fullName;
  if ('email' in user && user.email) return user.email;
  return 'Unknown';
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
