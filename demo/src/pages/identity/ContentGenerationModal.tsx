import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Badge, Alert } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// Generated output data - single variant
interface GeneratedVariant {
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
interface GenerationResponse {
  template_id: string;
  variant_count: number;
  variants: GeneratedVariant[];
}

// Legacy interface for backwards compatibility
interface GeneratedOutput {
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

// Asset type labels
const ASSET_TYPE_LABELS: Record<string, string> = {
  profile_photo: 'Profile Photo',
  legacy_photo: 'Legacy Photo',
  in_tenue: 'In Tenue',
  close_up: 'Close-up',
  short_intro: 'Short Intro',
  celebration: 'Celebration',
  legacy: 'Legacy in Tenue',
};

// Helper to detect mime type from base64 signature
const getSecureMimeType = (base64: string | null, declaredType: string | null): string => {
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

// Content type definitions - exported for use in other components
// Organized by template_type, with items having template_subtype
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

interface Participation {
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
  };
  metadata?: {
    team_role?: string;
    position?: string;
    shirt_number?: string;
    functional_roles?: string[];
  };
}

interface ContentGenerationModalProps {
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
  /** Pre-selected template - skips type/template selection */
  template?: ContentTemplate | null;
  /** Content type label for header */
  contentTypeLabel?: string;
  /** Asset type for BrandAsset linking (e.g. logo, kit_home) */
  assetType?: string | null;
  /** Callback fired when content has been successfully submitted/queued */
  onGenerated?: (message?: string) => void;
}

// Map template asset_types to teamreel_assets media slot keys
const ASSET_TYPE_TO_MEDIA_KEY: Record<string, string> = {
  'profile_photo': 'profile',
  'in_tenue': 'kit',
  'close_up': 'closeup',
  'short_intro': 'intro',
  'celebration': 'celebration',
  'legacy_photo': 'legacy_photo',
  'legacy': 'legacy',
  // Alternative spellings
  'full_body': 'kit',
  'closeup': 'closeup',
};

// Formation position layout data (x, y as percentages on a mini-field)
// Positions numbered 1-11: 1=GK, 2-5=DEF, 6-8=MID, 9-11=ATT (varies by formation)
export interface FormationPosition {
  slot: number;
  x: number;  // percentage from left
  y: number;  // percentage from top (0 = attacking end)
  label: string;
}

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

// Check if a member has a specific asset, optionally verifying role-specific variant
function memberHasAsset(member: Participation, assetType: string, role?: string): boolean {
  const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;
  const meta = member.metadata || {};
  const tr = (meta as any)?.teamreel_assets || {};

  const media = tr?.media || {};
  const videos = tr?.videos || {};
  const images = tr?.images || {}; // New structure: images.{type}.{variant}
  const legacyKit = tr?.kit || {};

  // Map media keys to images structure keys (they differ!)
  // images uses: fullbody, closeup
  // media uses: kit, closeup
  const imageStructureKey = mediaKey === 'kit' ? 'fullbody' : mediaKey;

  // Determine the role variant keys to check
  // For players: check both 'home' and 'away' variants (either is acceptable)
  // For goalkeeper: check 'goalkeeper' variant
  // For coach/assistant: check 'coach' variant
  let roleKeys: string[] = ['home']; // Default for player
  if (role === 'goalkeeper') {
    roleKeys = ['goalkeeper'];
  } else if (role === 'coach' || role === 'assistant') {
    roleKeys = ['coach'];
  } else if (role === 'player') {
    // Players can use either home or away kit
    roleKeys = ['home', 'away'];
  }

  // 1. Check the new 'images' structure (images.{type}.{variant})
  // e.g. images.fullbody.goalkeeper or images.closeup.home
  const hasImageAsset = roleKeys.some(roleKey =>
    images[imageStructureKey] && images[imageStructureKey][roleKey]
  );
  if (hasImageAsset) return true;

  // 2. Check videos structure for role-specific variants
  // e.g. videos.intro.goalkeeper_thumbs_up or videos.intro.home_hand_up
  if (videos[mediaKey]) {
    const variants = videos[mediaKey];
    // Check if any variant key contains/starts with any of the role keys
    const hasRoleVariant = Object.keys(variants).some(k => {
      const normalizedKey = k.toLowerCase();
      return roleKeys.some(roleKey =>
        (normalizedKey.includes(roleKey) || normalizedKey.startsWith(roleKey)) && variants[k]
      );
    });
    if (hasRoleVariant) return true;
    // NO FALLBACK: We require explicit role-specific variants for lineup filtering
    // This ensures goalkeeper-only members don't appear in player dropdowns
  }

  // 3. Check the 'media' structure (generic, not role-specific)
  // This is the older format: media.{slot}.url - only use when no role specified
  if (!role && media[mediaKey]?.url) return true;

  // 4. Check legacy format (only when no role specified or for backwards compatibility)
  if (!role) {
    if (mediaKey === 'profile' && legacyKit?.profile_photo_url) return true;
    if (mediaKey === 'kit' && legacyKit?.full_body_url) return true;
    if (mediaKey === 'celebration' && legacyKit?.goal_celebration_url) return true;
    if (mediaKey === 'legacy_photo' && tr?.old?.profile_photo_url) return true;
  }

  return false;
}

// Check if member has ALL required asset types
function memberHasRequiredAssets(member: Participation, assetTypes: string[], role?: string): boolean {
  if (!assetTypes || assetTypes.length === 0) return true;
  return assetTypes.every(assetType => memberHasAsset(member, assetType, role));
}

// Get list of missing assets for a member
function getMissingAssets(member: Participation, assetTypes: string[], role?: string): string[] {
  if (!assetTypes || assetTypes.length === 0) return [];
  return assetTypes.filter(assetType => !memberHasAsset(member, assetType, role));
}

// Group participations by functional role
export function groupParticipationsByRole(participations: Participation[]): Record<string, Participation[]> {
  const groups: Record<string, Participation[]> = {
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  };

  participations.forEach(p => {
    // Check functional_roles array first, then metadata, then legacy fields
    let roles: string[] = [];
    if (p.functional_roles && Array.isArray(p.functional_roles) && p.functional_roles.length > 0) {
      roles = p.functional_roles;
    } else if (p.metadata?.functional_roles && Array.isArray(p.metadata.functional_roles) && p.metadata.functional_roles.length > 0) {
      roles = p.metadata.functional_roles;
    } else if (p.data?.functional_role) {
      roles = [p.data.functional_role];
    } else if (p.metadata?.team_role) {
      roles = [p.metadata.team_role];
    } else {
      roles = ['player'];
    }

    // Add participation to all matching role groups
    roles.forEach(role => {
      const normalizedRole = role.toLowerCase();
      if (groups[normalizedRole]) {
        groups[normalizedRole].push(p);
      }
    });
  });

  return groups;
}

export default function ContentGenerationModal({
  isOpen,
  onClose,
  matchData,
  season,
  organisationSport,
  organisationId,
  template: initialTemplate,
  contentTypeLabel,
  assetType,
  onGenerated,
}: ContentGenerationModalProps) {
  const [step, setStep] = useState<'type' | 'template' | 'members' | 'lineup_squad' | 'confirm' | 'generating' | 'video_queued' | 'success' | 'error'>('type');
  const [selectedType, setSelectedType] = useState<{ type: string; subtype: string; label: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [progress, setProgress] = useState(0);
  const [generationStartedAtMs, setGenerationStartedAtMs] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: Multiple variants support
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [savingAsset, setSavingAsset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Lineup flyer options
  const [lineupFormation, setLineupFormation] = useState<string>(matchData?.metadata?.formation || '4-3-3');
  const [lineupCloseupStyle, setLineupCloseupStyle] = useState<'popout' | 'badge'>('popout');
  const [lineupAnimationStyle, setLineupAnimationStyle] = useState<'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade'>('slide_up');
  const [lineupIntroStyle, setLineupIntroStyle] = useState<'per_line' | 'per_player'>('per_line');
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<string | null>(null);
  const [appBackgrounds, setAppBackgrounds] = useState<Array<{ id: string; url: string; label?: string; profile_name?: string }>>([]);
  // Match flyer options
  const [matchFlyerVariant, setMatchFlyerVariant] = useState<'classic' | 'bold' | 'stadium'>('classic');

  // Goal celebration options
  const [goalScoreHome, setGoalScoreHome] = useState<number>(0);
  const [goalScoreAway, setGoalScoreAway] = useState<number>(0);
  const [goalScorerId, setGoalScorerId] = useState<string | null>(null);

  // Selected members per role
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string[]>>({
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  });

  // Season squad members grouped by functional role
  const [seasonSquad, setSeasonSquad] = useState<Record<string, Participation[]>>({
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  });

  // Fetch season squad on mount
  useEffect(() => {
    if (!isOpen) return;

    // Try to get project ID and season ID
    const projectId = matchData?.project?.id || season?.project_id;
    const seasonId = season?.id;

    console.log('🔍 ContentGenerationModal - Fetching members:', {
      projectId,
      seasonId,
      matchData,
      season,
    });

    if (!projectId) {
      console.warn('❌ No projectId found for fetching members');
      return;
    }

    const fetchSeasonSquad = async () => {
      try {
        // Fetch project members for lineup selection.
        // We do NOT filter by period_id because members may be registered
        // without a period, or on a different season — all project members
        // should be selectable for lineups.
        // Use page_size=200 to maximise results (API max = 200 via cursor, 100 via page).
        const url = `${getApiBaseUrl()}/api/v1/projects/${projectId}/members/?page_size=100`;

        console.log('📡 Fetching from URL:', url);

        const response = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ API Response:', data);
          // Handle envelope response: { status: 'success', data: [...], meta: { pagination: {...} } }
          let members: any[] = [];
          if (data?.data?.data && Array.isArray(data.data.data)) {
            members = data.data.data;
          } else if (data?.data?.results && Array.isArray(data.data.results)) {
            members = data.data.results;
          } else if (data?.results && Array.isArray(data.results)) {
            members = data.results;
          } else if (Array.isArray(data?.data)) {
            members = data.data;
          } else if (Array.isArray(data)) {
            members = data;
          }

          // Handle pagination: fetch remaining pages if there's a `next` link
          let nextUrl = data?.meta?.pagination?.next;
          while (nextUrl) {
            console.log('📡 Fetching next page:', nextUrl);
            const nextResp = await fetch(nextUrl, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (!nextResp.ok) break;
            const nextData = await nextResp.json();
            let nextMembers: any[] = [];
            if (nextData?.data?.data && Array.isArray(nextData.data.data)) {
              nextMembers = nextData.data.data;
            } else if (Array.isArray(nextData?.data)) {
              nextMembers = nextData.data;
            } else if (Array.isArray(nextData)) {
              nextMembers = nextData;
            }
            members = [...members, ...nextMembers];
            nextUrl = nextData?.meta?.pagination?.next;
          }

          console.log('👥 Extracted members:', members.length, members);
          const grouped = groupParticipationsByRole(members);
          console.log('📊 Grouped by role:', grouped);
          setSeasonSquad(grouped);
        } else {
          console.error('❌ API Error:', response.status, await response.text());
        }
      } catch (err) {
        console.error('Error fetching season squad:', err);
      }
    };

    fetchSeasonSquad();
  }, [isOpen, matchData?.project?.id, season?.project_id, season?.id]);

  // Fetch app-level backgrounds (stadium_background + club_background assets)
  useEffect(() => {
    if (!isOpen) return;

    const fetchBackgrounds = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/branding/assets/app-backgrounds/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.data || data?.results || []);
          const bgs = items
            .filter((a: any) => a.url)
            .map((a: any) => ({
              id: a.id,
              url: a.url,
              label: a.label || '',
              profile_name: a.project_name || a.profile_name || '',
            }));
          setAppBackgrounds(bgs);
        }
      } catch (err) {
        console.warn('Failed to fetch app backgrounds:', err);
      }
    };

    fetchBackgrounds();
  }, [isOpen]);

  // Track if we've already initialized (to preserve selections on retry)
  const hasInitializedRef = useRef(false);
  const lastOpenStateRef = useRef(false);

  // Reset state when opening - but preserve selections if returning from error
  useEffect(() => {
    // Detect fresh open vs staying open
    const freshOpen = isOpen && !lastOpenStateRef.current;
    lastOpenStateRef.current = isOpen;

    if (isOpen) {
      // Always reset these on any open
      setProgress(0);
      setGenerationStartedAtMs(null);
      setError(null);
      setGenerationError(null);
      setGeneratedOutput(null);
      setGeneratedVariants([]);
      setSelectedVariantIndex(0);
      setSavingAsset(false);
      setSaveSuccess(false);
      setVideoJobId(null);
      setVideoJobStatus(null);
      setVideoJobProgressRaw(0);
      setVideoJobMeta({});

      // Only reset selections on FRESH open (not when staying open or after error)
      if (freshOpen && !hasInitializedRef.current) {
        hasInitializedRef.current = true;

        // Pre-load saved lineup from match metadata if available
        const savedLineup = matchData?.metadata?.lineup;
        if (savedLineup && (savedLineup.goalkeeper?.length || savedLineup.player?.length)) {
          setSelectedMembers({
            goalkeeper: savedLineup.goalkeeper || [],
            player: savedLineup.player || [],
            coach: [],
            assistant: [],
          });
          if (savedLineup.formation && savedLineup.formation !== lineupFormation) {
            setLineupFormation(savedLineup.formation);
          }
        } else {
          setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
        }
        setTemplates([]);

        // If template is provided, skip to appropriate step
        if (initialTemplate) {
          setSelectedTemplate(initialTemplate);
          setSelectedType({ type: initialTemplate.template_type, subtype: initialTemplate.template_subtype || '', label: contentTypeLabel || initialTemplate.name });

          // Goal celebration and match intro skip to confirm directly
          if (initialTemplate.template_subtype === 'goal' || initialTemplate.template_subtype === 'match_intro') {
            setStep('confirm');
          } else if (initialTemplate.template_subtype === 'poster') {
            // Poster needs lineup squad selection (synthetic template already has member reqs)
            setStep('members');
          } else {
            // Check if template requires member selection
            const needsMembers = initialTemplate.input_requirements?.members &&
              Object.entries(initialTemplate.input_requirements.members).some(([key, val]) =>
                key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
              );

            if (needsMembers) {
              setStep('members');
            } else {
              // No members needed, go to confirm step
              setStep('confirm');
            }
          }
        } else {
          setStep('type');
          setSelectedType(null);
          setSelectedTemplate(null);
        }
      }
    } else {
      // Reset initialization flag when modal closes
      hasInitializedRef.current = false;
    }
  }, [isOpen, initialTemplate, contentTypeLabel]);

  // Fetch templates when content type is selected
  const fetchTemplates = async (templateType: string, templateSubtype: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      params.append('template_type', templateType);
      params.append('template_subtype', templateSubtype);

      // Check if this content type requires sport selection
      const contentTypeConfig = CONTENT_TYPES[templateType as keyof typeof CONTENT_TYPES];
      const sportRequired = contentTypeConfig?.sportRequired !== false;

      // Filter by sport if available AND sport is required for this type
      if (organisationSport?.id && sportRequired) {
        params.append('sport', String(organisationSport.id));
      }

      const response = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      let results = data.results || data || [];

      // If no sport-specific templates found and sport was required, try without sport filter
      if (results.length === 0 && organisationSport?.id && sportRequired) {
        const paramsAll = new URLSearchParams();
        paramsAll.append('is_active', 'true');
        paramsAll.append('template_type', templateType);
        paramsAll.append('template_subtype', templateSubtype);

        const responseAll = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${paramsAll.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (responseAll.ok) {
          const dataAll = await responseAll.json();
          results = dataAll.results || dataAll || [];
        }
      }

      setTemplates(results);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Check if member selection is complete
  const memberSelectionValid = useMemo(() => {
    if (!selectedTemplate?.input_requirements?.members) return true;
    const reqs = selectedTemplate.input_requirements.members;

    for (const role of ['goalkeeper', 'player', 'coach', 'assistant'] as const) {
      const req = reqs[role];
      if (req && typeof req !== 'boolean' && req.count > 0) {
        // Count only non-empty entries (sparse arrays may contain '' placeholders)
        const filledCount = selectedMembers[role].filter(Boolean).length;
        if (filledCount !== req.count) {
          return false;
        }
      }
    }
    return true;
  }, [selectedTemplate, selectedMembers]);

  // Calculate total required members
  const totalRequiredMembers = useMemo(() => {
    if (!selectedTemplate?.input_requirements?.members) return 0;
    const reqs = selectedTemplate.input_requirements.members;
    let total = 0;
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant'] as const) {
      const req = reqs[role];
      if (req && typeof req !== 'boolean' && req.count) total += req.count;
    }
    return total;
  }, [selectedTemplate]);

  // State for video job polling
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoJobStatus, setVideoJobStatus] = useState<string | null>(null);
  const [videoJobProgressRaw, setVideoJobProgressRaw] = useState<number>(0);
  const [videoJobMeta, setVideoJobMeta] = useState<Record<string, unknown>>({});

  // Abortable polling controller for lineup video jobs.
  // Prevents duplicate poll loops that keep running after closing the modal or navigating away.
  const activeVideoJobPollRef = useRef<AbortController | null>(null);

  const abortActiveVideoJobPoll = () => {
    const ctrl = activeVideoJobPollRef.current;
    if (ctrl) {
      ctrl.abort();
      activeVideoJobPollRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) abortActiveVideoJobPoll();
    return () => abortActiveVideoJobPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Helper to get member's asset URL
  const getMemberAssetUrl = (memberId: string, assetType: string, memberRole?: string): string | null => {
    // Find the member in seasonSquad
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant']) {
      const member = seasonSquad[role]?.find(p => p.id === memberId);
      if (member) {
        const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;
        const meta = member.metadata || {};
        const tr = (meta as any)?.teamreel_assets || {};
        const media = tr?.media || {};
        const videos = tr?.videos || {};
        const images = tr?.images || {};
        const legacyKit = tr?.kit || {};

        // Determine the role variant key for images structure
        const effectiveRole = memberRole || role;
        let roleKey = 'home'; // Default for player
        if (effectiveRole === 'goalkeeper') roleKey = 'goalkeeper';
        else if (effectiveRole === 'coach' || effectiveRole === 'assistant') roleKey = 'coach';

        // Map media keys to images structure keys (they differ!)
        // images uses: fullbody, closeup — media uses: kit, closeup
        const imageStructureKey = mediaKey === 'kit' ? 'fullbody' : mediaKey;

        // 1. Check the 'images' structure (images.{type}.{variant})
        // e.g. images.closeup.goalkeeper or images.fullbody.home
        if (images[imageStructureKey]?.[roleKey]?.url) {
          return images[imageStructureKey][roleKey].url;
        }
        // Fallback: try 'home' variant if role-specific not found
        if (roleKey !== 'home' && images[imageStructureKey]?.home?.url) {
          return images[imageStructureKey].home.url;
        }

        // 2. For video types (intro, closeup, celebration), prefer processed WebM
        // (with VP9 alpha transparency) over raw MP4 (black background).
        // videos.intro = { variant_key: { raw: "...mp4", processed: "...webm" } }
        if (['intro', 'closeup', 'celebration'].includes(mediaKey) && videos[mediaKey]) {
          const variants = videos[mediaKey] || {};
          // First: try role-specific variant (e.g. goalkeeper_thumbs_up)
          const roleVariantEntries = Object.entries(variants).filter(([k]) =>
            k.toLowerCase().includes(roleKey) || k.toLowerCase().startsWith(roleKey)
          );
          // Role-specific: prefer processed
          for (const [, val] of roleVariantEntries) {
            if (val && typeof val === 'object' && (val as any).processed) return (val as any).processed;
          }
          for (const [, val] of roleVariantEntries) {
            if (val && typeof val === 'object' && (val as any).raw) return (val as any).raw;
            if (val && typeof val === 'string' && val.trim()) return val;
          }
          // Fallback: any variant — prefer processed
          for (const [, val] of Object.entries(variants)) {
            if (val && typeof val === 'object' && (val as any).processed) {
              return (val as any).processed;
            }
          }
          // Second pass: fall back to raw if no processed exists
          for (const [, val] of Object.entries(variants)) {
            if (val && typeof val === 'object' && (val as any).raw) {
              return (val as any).raw;
            }
            // Legacy: variant stored as plain string
            if (val && typeof val === 'string' && val.trim()) {
              return val;
            }
          }
        }

        // 3. Check media format (flat key: {url, caption})
        if (media[mediaKey]?.url) return media[mediaKey].url;

        // 4. Check legacy format
        if (mediaKey === 'profile' && legacyKit?.profile_photo_url) return legacyKit.profile_photo_url;
        if (mediaKey === 'kit' && legacyKit?.full_body_url) return legacyKit.full_body_url;
        if (mediaKey === 'celebration' && legacyKit?.goal_celebration_url) return legacyKit.goal_celebration_url;
      }
    }
    return null;
  };

  // Helper to get member name by ID
  const getMemberNameById = (memberId: string): string => {
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant']) {
      const member = seasonSquad[role]?.find(p => p.id === memberId);
      if (member) {
        const user = member.user || member.member;
        if (user) {
          if ('name' in user && user.name) return user.name;
          if ('user_name' in user && user.user_name) return user.user_name;
          const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          if (fullName) return fullName;
        }
      }
    }
    return 'Unknown';
  };

  // Generate lineup flyer (static PNG) using the lineup_flyer_generator service
  const handleGenerateLineupFlyer = async () => {
    setProgress(10);

    try {
      // Get project ID from available sources
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) {
        throw new Error('No project ID available');
      }

      if (!matchData?.id) {
        throw new Error('No match/activity data available for flyer generation');
      }

      // Build selected member IDs (1 GK + 10 players for lineup)
      const targetGKs = selectedMembers.goalkeeper?.slice(0, 1) || [];
      const targetPlayers = selectedMembers.player?.slice(0, 10) || [];

      // Determine formation from state (user selection in confirm step)
      const formation = lineupFormation || matchData?.metadata?.formation || '4-3-3';

      setProgress(30);

      // Call the lineup-flyer endpoint (synchronous — returns URL directly)
      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/lineup-flyer/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          template_id: selectedTemplate?.id || null,
          formation: formation,
          closeup_style: lineupCloseupStyle,
          selected_member_ids: {
            goalkeeper: targetGKs,
            player: targetPlayers,
          },
          ...(selectedBackgroundUrl ? { background_url: selectedBackgroundUrl } : {}),
        }),
      });

      setProgress(70);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to generate lineup flyer: ${response.status}`);
      }

      const data = await response.json();
      console.log('🖼️ Lineup flyer generated:', data);

      const flyerUrl = data.data?.flyer_url || data.flyer_url;
      if (!flyerUrl) {
        throw new Error('Flyer generated but no URL returned');
      }

      // Set result as a generated variant (image, not video)
      setGeneratedVariants([{
        variant_index: 0,
        image_base64: null,
        presigned_url: flyerUrl,
        mime_type: 'image/png',
        filename: `lineup_flyer_${matchData.id}.png`,
        error: null,
        storage_info: null,
        metadata: { type: 'lineup_flyer', formation, activity_id: matchData.id },
      }]);

      setProgress(100);
      setTimeout(() => setStep('success'), 300);

    } catch (err) {
      console.error('❌ Lineup flyer generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Flyer generation failed');
      setStep('error');
    }
  };

  // Generate team poster (AI elftalfoto) — synchronous PNG generation
  const handleGenerateTeamPoster = async () => {
    setProgress(10);

    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) {
        throw new Error('No project ID available');
      }

      if (!matchData?.id) {
        throw new Error('No match/activity data available for poster generation');
      }

      // Build selected member IDs (1 GK + 10 players)
      const targetGKs = selectedMembers.goalkeeper?.slice(0, 1) || [];
      const targetPlayers = selectedMembers.player?.slice(0, 10) || [];

      const formation = lineupFormation || matchData?.metadata?.formation || '4-3-3';

      setProgress(20);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/team-poster/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          template_id: selectedTemplate?.id || null,
          formation: formation,
          selected_member_ids: {
            goalkeeper: targetGKs,
            player: targetPlayers,
          },
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to generate team poster: ${response.status}`);
      }

      const data = await response.json();
      console.log('📸 Team poster generated:', data);

      const posterUrl = data.poster_url || data.data?.poster_url;
      if (!posterUrl) {
        throw new Error('Poster generated but no URL returned');
      }

      setGeneratedVariants([{
        variant_index: 0,
        image_base64: null,
        presigned_url: posterUrl,
        mime_type: 'image/png',
        filename: `team_poster_${matchData.id}.png`,
        error: null,
        storage_info: null,
        metadata: { type: 'poster', formation, activity_id: matchData.id },
      }]);

      setProgress(100);
      setTimeout(() => setStep('success'), 300);

    } catch (err) {
      console.error('❌ Team poster generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Poster generation failed');
      setStep('error');
    }
  };

  // Generate match flyer (static PNG) in a single chosen design variant
  const handleGenerateMatchFlyer = async () => {
    setProgress(10);

    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) {
        throw new Error('No project ID available');
      }
      if (!matchData?.id) {
        throw new Error('No match/activity data available for flyer generation');
      }

      setProgress(30);

      // Call the match-flyer endpoint (synchronous — returns a single flyer URL)
      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/match-flyer/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          variant: matchFlyerVariant,
        }),
      });

      setProgress(70);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to generate match flyer: ${response.status}`);
      }

      const data = await response.json();
      console.log('📣 Match flyer generated:', data);

      const flyerUrl = data.data?.flyer_url || data.flyer_url;
      if (!flyerUrl) {
        throw new Error('Flyer generated but no URL returned');
      }

      // Set result as a single generated variant (image, not video) — same as lineup flyer
      setGeneratedVariants([{
        variant_index: 0,
        image_base64: null,
        presigned_url: flyerUrl,
        mime_type: 'image/png',
        filename: `match_flyer_${matchFlyerVariant}_${matchData.id}.png`,
        error: null,
        storage_info: null,
        metadata: { type: 'match_flyer', variant: matchFlyerVariant, activity_id: matchData.id },
      }]);

      setProgress(100);
      setTimeout(() => setStep('success'), 300);

    } catch (err) {
      console.error('❌ Match flyer generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Match flyer generation failed');
      setStep('error');
    }
  };

  // Generate lineup video using video module
  const handleGenerateLineupVideo = async () => {
    // If a previous job poll is still running (e.g. user retried or reopened), stop it.
    abortActiveVideoJobPoll();
    setProgress(10);

    try {
      // Build segments array for each selected member
      // Order: goalkeeper first, then players (sorted by selection order)
      const segments: Array<{type: string; url: string; duration?: number; label?: string; scale?: number}> = [];

      // For lineup videos, enforce specific asset sequence: In Tenue -> Intro -> In Tenue -> Closeup (kleiner)
      // TV-style lineup announcement: full body reveal → intro clip → full body again → close-up zoom
      // Also strictly limit to 1 GK + 10 Players
      let targetGKs = selectedMembers.goalkeeper;
      let targetPlayers = selectedMembers.player;
      let targetCoach = selectedMembers.coach;
      let targetAssistant = selectedMembers.assistant;

      let gkAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      let playerAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      let coachAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      let assistantAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];

      // If requirements exist, use them, but fallback to our defaults for structure
      if (selectedTemplate?.input_requirements?.members) {
        const reqs = selectedTemplate.input_requirements.members;
        if (reqs.goalkeeper?.asset_types?.length) gkAssets = reqs.goalkeeper.asset_types;
        if (reqs.player?.asset_types?.length) playerAssets = reqs.player.asset_types;
        if (reqs.coach?.asset_types?.length) coachAssets = reqs.coach.asset_types;
        if (reqs.assistant?.asset_types?.length) assistantAssets = reqs.assistant.asset_types;

        // Force defaults if user specifically requested this standard lineup flow
        if (selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer') {
            gkAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
            playerAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
            // Lineup = 1 goalkeeper + 10 players (no coaches/assistants)
            targetGKs = targetGKs.slice(0, 1);
            targetPlayers = targetPlayers.slice(0, 10);
            targetCoach = [];
            targetAssistant = [];
        }
      }

      // Helper to add segments for a list of members
      const addMemberSegments = (members: string[], assets: string[], role?: string) => {
        for (const memberId of members) {
          const memberName = getMemberNameById(memberId);

          for (const assetType of assets) {
            const url = getMemberAssetUrl(memberId, assetType, role);
            if (!url) {
              // Try fallback for close_up -> profile_photo if missing
              if (assetType === 'close_up') {
                 const altUrl = getMemberAssetUrl(memberId, 'profile_photo', role);
                 if (altUrl) {
                    segments.push({
                        type: 'image',
                        url: altUrl,
                        duration: 2.0,
                        label: memberName,
                        scale: 0.6,
                    });
                    continue;
                 }
              }
              console.warn(`Missing asset ${assetType} for member ${memberName}`);
              continue;
            }

            let isImage = ['profile_photo', 'in_tenue', 'legacy_photo', 'legacy', 'full_body'].includes(assetType);

            // Auto-detect image from URL extension if not explicitly typed as image already
            // This fixes cases where 'close_up' is technically a PNG but was defaulted to video type
            if (!isImage && url) {
               const lowerUrl = url.toLowerCase();
               if (lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.webp')) {
                  isImage = true;
               }
            }

            // Closeup segments are smaller (TV-style zoom effect)
            const isCloseup = assetType === 'close_up';

            segments.push({
              type: isImage ? 'image' : 'video',
              url: url,
              duration: isImage ? (isCloseup ? 2.0 : 3.0) : undefined,
              label: memberName,
              ...(isCloseup ? { scale: 0.6 } : {}),
            });
          }
        }
      };

      setProgress(20);

      // Get project ID from available sources
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) {
        throw new Error('No project ID available - cannot create video job');
      }

      let jobId: string;

      // Use template-based endpoint when matchData is available
      // This endpoint auto-builds segments from match participations + brand assets + field background
      if (matchData?.id) {
        console.log('🎬 Using template-based lineup video generation');
        // Submit async job — frontend polls for completion
        const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/lineup-from-template/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Project-ID': String(projectId),
          },
          body: JSON.stringify({
            activity_id: matchData.id,
            template_id: selectedTemplate?.id || null,
            output_resolution: 'vertical_1080p',
            formation: lineupFormation || '4-3-3',
            closeup_style: lineupCloseupStyle || 'popout',
            animation_style: lineupAnimationStyle || 'slide_up',
            intro_style: lineupIntroStyle || 'per_line',
            selected_member_ids: {
              goalkeeper: targetGKs,
              player: targetPlayers,
              coach: targetCoach,
              assistant: targetAssistant,
            },
            ...(selectedBackgroundUrl ? { background_url: selectedBackgroundUrl } : {}),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
        }

        const jobData = await response.json();
        jobId = jobData.data?.id || jobData.id;
        console.log('🎬 Template-based video job created:', jobId);
      } else {
        addMemberSegments(targetGKs, gkAssets, 'goalkeeper');
        addMemberSegments(targetPlayers, playerAssets, 'player');
        addMemberSegments(targetCoach, coachAssets, 'coach');
        addMemberSegments(targetAssistant, assistantAssets, 'assistant');

        console.log('📹 Lineup video segments:', segments);

        // Fallback: manual segments mode (no match context)
        if (segments.length === 0) {
          throw new Error('No valid segments found. Make sure selected members have the required assets.');
        }

        const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Project-ID': String(projectId),
          },
          body: JSON.stringify({
            job_type: 'lineup',
            config: {
              segments: segments,
              output_resolution: 'auto',
              output_fps: 30,
              fade_duration: 0.5,
              match_id: null,
              activity_id: null,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
        }

        const jobData = await response.json();
        jobId = jobData.data?.id || jobData.id;
        console.log('🎬 Manual video job created:', jobId);
      }

      setVideoJobId(jobId);
      setVideoJobStatus('queued');
      setVideoJobProgressRaw(0);
      setProgress(100);

      // Show queued confirmation — video processes in the background
      // and will appear in the approval queue when ready.
      setStep('video_queued');
      onGenerated?.('🎬 Lineup video staat in de wachtrij en wordt op de achtergrond verwerkt.');

    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.error('❌ Lineup video generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setStep('error');
    }
  };

  // Generate goal celebration video
  const handleGenerateGoalCelebration = async () => {
    abortActiveVideoJobPoll();
    setProgress(10);

    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) {
        throw new Error('No project ID available — cannot create video job');
      }

      if (!matchData?.id) {
        throw new Error('No match/activity data available for goal celebration');
      }

      if (!goalScorerId) {
        throw new Error('No goal scorer selected');
      }

      console.log('⚽ Creating goal celebration video:', {
        activity_id: matchData.id,
        scorer_member_id: goalScorerId,
        score_home: goalScoreHome,
        score_away: goalScoreAway,
      });

      setProgress(20);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/goal-celebration-from-template/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          scorer_member_id: goalScorerId,
          score_home: goalScoreHome,
          score_away: goalScoreAway,
          output_resolution: 'vertical_1080p',
          ...(selectedBackgroundUrl ? { background_url: selectedBackgroundUrl } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
      }

      const jobData = await response.json();
      const jobId = jobData.data?.id || jobData.id;
      console.log('⚽ Goal celebration video job created:', jobId);

      setVideoJobId(jobId);
      setVideoJobStatus('queued');
      setVideoJobProgressRaw(0);
      setProgress(100);

      // Show queued confirmation — video processes in the background
      setStep('video_queued');
      onGenerated?.('⚽ Goal celebration staat in de wachtrij en wordt op de achtergrond verwerkt.');

    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.error('❌ Goal celebration video generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setStep('error');
    }
  };

  const handleGenerateMatchIntro = async () => {
    abortActiveVideoJobPoll();
    setProgress(10);

    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) {
        throw new Error('No project ID available — cannot create video job');
      }

      if (!matchData?.id) {
        throw new Error('No match/activity data available for match intro');
      }

      console.log('🎥 Creating match intro video:', {
        activity_id: matchData.id,
      });

      setProgress(20);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/match-intro-from-template/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          output_resolution: 'vertical_1080p',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
      }

      const jobData = await response.json();
      const jobId = jobData.data?.id || jobData.id;
      console.log('🎥 Match intro video job created:', jobId);

      setVideoJobId(jobId);
      setVideoJobStatus('queued');
      setVideoJobProgressRaw(0);
      setProgress(100);

      // Show queued confirmation — video processes in the background
      setStep('video_queued');
      onGenerated?.('🎥 Match intro staat in de wachtrij en wordt op de achtergrond verwerkt.');

    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.error('❌ Match intro video generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setStep('error');
    }
  };

  if (!isOpen) return null;

  const handleSelectType = (type: string, subtype: string, label: string) => {
    setSelectedType({ type, subtype, label });

    // Goal celebration and match intro skip template selection — go directly to confirm step
    if (subtype === 'goal' || subtype === 'match_intro') {
      setStep('confirm');
      return;
    }

    // Poster (elftalfoto) skips template — needs lineup squad selection
    if (subtype === 'poster') {
      // Set a synthetic template so lineup_squad step can read member requirements
      setSelectedTemplate({
        id: 0,
        name: 'Elftalfoto',
        description: '',
        style_variant: '',
        template_type: 'pre_match',
        template_subtype: 'poster',
        is_active: true,
        input_requirements: {
          members: {
            goalkeeper: { count: 1, asset_types: ['in_tenue'] },
            player: { count: 10, asset_types: ['in_tenue'] },
          },
        },
      } as ContentTemplate);
      setStep('members');
      return;
    }

    setStep('template');
    fetchTemplates(type, subtype);
  };

  const handleSelectTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);

    // Check if template requires member selection
    const needsMembers = template.input_requirements?.members &&
      Object.entries(template.input_requirements.members).some(([key, val]) =>
        key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
      );

    if (needsMembers) {
      setStep('members');
    } else {
      // No members needed, go to confirm step
      setStep('confirm');
    }
  };

  const handleMemberToggle = (role: string, memberId: string) => {
    const req = selectedTemplate?.input_requirements?.members?.[role as 'goalkeeper' | 'player' | 'coach' | 'assistant'];
    const maxCount = (req && typeof req !== 'boolean' && req.count) || 0;

    setSelectedMembers(prev => {
      const current = prev[role] || [];
      if (current.includes(memberId)) {
        return { ...prev, [role]: current.filter(id => id !== memberId) };
      } else if (current.length < maxCount) {
        return { ...prev, [role]: [...current, memberId] };
      }
      return prev;
    });
  };

  const handleGenerateInternal = async () => {
    setStep('generating');
    setGenerationError(null);
    setGeneratedOutput(null);
    setGeneratedVariants([]);
    setSelectedVariantIndex(0);
    setSaveSuccess(false);
    setGenerationStartedAtMs(Date.now());
    setVideoJobId(null);
    setVideoJobStatus(null);
    setVideoJobProgressRaw(0);
    setVideoJobMeta({});

    // Simulate initial progress
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 10;
      if (p > 85) p = 85; // Cap at 85% while waiting for API
      setProgress(Math.min(p, 85));
    }, 500);

    try {
      const templateSubtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';

      // Check if this is a lineup flyer generation
      if (templateSubtype === 'lineup_flyer') {
        clearInterval(progressInterval);
        await handleGenerateLineupFlyer();
        return;
      }

      // Check if this is a team poster (elftalfoto) generation
      if (templateSubtype === 'poster') {
        clearInterval(progressInterval);
        await handleGenerateTeamPoster();
        return;
      }

      // Check if this is a match flyer generation
      if (templateSubtype === 'flyer') {
        clearInterval(progressInterval);
        await handleGenerateMatchFlyer();
        return;
      }

      // Check if this is a lineup video generation
      if (templateSubtype === 'lineup') {
        clearInterval(progressInterval);
        await handleGenerateLineupVideo();
        return;
      }

      // Check if this is a goal celebration video generation
      if (templateSubtype === 'goal') {
        clearInterval(progressInterval);
        await handleGenerateGoalCelebration();
        return;
      }

      // Check if this is a match intro video generation
      if (templateSubtype === 'match_intro') {
        clearInterval(progressInterval);
        await handleGenerateMatchIntro();
        return;
      }

      // Determine variant count based on template type
      // Logo/sponsor standardize should show multiple options
      const isStandardize = templateSubtype.includes('standardize') || templateSubtype.includes('logo') || templateSubtype.includes('sponsor');
      const variantCount = isStandardize ? 3 : 1;

      // Call the real generation API
      const response = await fetch(`${getApiBaseUrl()}/api/v1/generative/assets/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          template_id: selectedTemplate?.id?.toString() || 'default',
          params: {
            template_type: selectedType?.type || selectedTemplate?.template_type,
            template_subtype: selectedType?.subtype || selectedTemplate?.template_subtype,
            style_variant: selectedTemplate?.style_variant || 'default',
            // Include match context
            match_id: matchData?.id,
            project_name: matchData?.project?.name,
            opponent_name: matchData?.opponent_project?.name,
          },
          variant_count: variantCount,
          input_images: {},
          input_image_urls: {},
          // === Context for S3 folder structure & record creation ===
          project_id: matchData?.project?.id || null,
          organisation_id: organisationId || null,
          activity_id: matchData?.id || null,
          // Asset type for BrandAsset linking - DON'T save automatically, let user choose
          asset_type: assetType || selectedTemplate?.template_subtype || null,
          // Don't auto-save to brand - user will select variant first
          save_to_brand: false,
          save_to_media_library: false,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎉 Generation response:', data);

      // Get all variants (from data.data.variants or data.variants)
      const responseData = data.data || data;
      const variants: GeneratedVariant[] = responseData.variants || [];

      console.log(`📦 Parsed ${variants.length} variants from response`);

      // Check for errors
      const firstError = variants.find((v: GeneratedVariant) => v.error);
      if (firstError?.error) {
        throw new Error(firstError.error);
      }

      // Store all variants
      setGeneratedVariants(variants);
      setSelectedVariantIndex(0);

      // Also set legacy generatedOutput for backwards compatibility
      const firstVariant = variants[0];
      if (firstVariant) {
        setGeneratedOutput({
          image_base64: firstVariant.image_base64 || null,
          presigned_url: firstVariant.presigned_url || null,
          storage_info: firstVariant.storage_info || null,
          metadata: firstVariant.metadata || {},
        });
      } else {
        // Fallback if no variants array but fields exist at root
        if (responseData.image_base64 || responseData.presigned_url) {
           console.log('⚠️ No variants array found, falling back to legacy single variant extraction');
           const singleVariant: GeneratedVariant = {
              variant_index: 0,
              image_base64: responseData.image_base64,
              presigned_url: responseData.presigned_url,
              mime_type: responseData.mime_type,
              filename: responseData.filename,
              error: null,
              storage_info: responseData.storage_info,
              metadata: responseData.metadata || {}
           };
           setGeneratedVariants([singleVariant]);
           setGeneratedOutput({
              image_base64: singleVariant.image_base64,
              presigned_url: singleVariant.presigned_url,
              storage_info: singleVariant.storage_info,
              metadata: singleVariant.metadata
           });
        }
      }

      setProgress(100);
      setTimeout(() => setStep('success'), 300);

    } catch (err) {
      clearInterval(progressInterval);
      console.error('❌ Generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      setStep('error');
    }
  };

  // Save selected variant as BrandAsset
  const handleSaveAsAsset = async () => {
    const selectedVariant = generatedVariants[selectedVariantIndex];
    if (!selectedVariant) return;

    setSavingAsset(true);
    setSaveSuccess(false);

    try {
      // Determine the asset type based on template
      const templateSubtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';
      let brandAssetType = assetType;

      const isVideo = (selectedVariant.mime_type || '').startsWith('video/');

      // Map template subtype to BrandAsset type
      if (templateSubtype.includes('logo')) {
        brandAssetType = 'logo'; // AI-processed logo
      } else if (templateSubtype.includes('sponsor')) {
        brandAssetType = 'sponsor_logo'; // AI-processed sponsor
      } else if (templateSubtype.includes('kit') || templateSubtype.includes('tenue')) {
        const kitType = (selectedTemplate as ContentTemplate & { params?: { kit_type?: string } })?.params?.kit_type || 'home';
        brandAssetType = `kit_${kitType}`; // e.g. kit_home, kit_away
      } else if (templateSubtype === 'lineup_flyer') {
        const matchSuffix = (matchData?.id || '').toString().slice(0, 8) || 'unknown';
        brandAssetType = `lineup_flyer_${matchSuffix}`;
      } else if (templateSubtype === 'flyer') {
        const matchSuffix = (matchData?.id || '').toString().slice(0, 8) || 'unknown';
        brandAssetType = `match_flyer_${matchSuffix}`;
      } else if (templateSubtype === 'goal' || templateSubtype === 'goal_celebration') {
        const matchSuffix = (matchData?.id || '').toString().slice(0, 8) || 'unknown';
        brandAssetType = `goal_${matchSuffix}`;
      } else if (templateSubtype === 'match_intro') {
        const matchSuffix = (matchData?.id || '').toString().slice(0, 8) || 'unknown';
        brandAssetType = `match_intro_${matchSuffix}`;
      } else if (templateSubtype === 'poster') {
        const matchSuffix = (matchData?.id || '').toString().slice(0, 8) || 'unknown';
        brandAssetType = `poster_${matchSuffix}`;
      } else if (templateSubtype === 'lineup' || isVideo) {
        // Lineup videos need a non-empty asset_type. Use a per-match unique value to avoid
        // overwriting due to unique(profile, asset_type).
        const matchSuffix = (matchData?.id || '').toString().slice(0, 8) || 'unknown';
        brandAssetType = `lineup_${matchSuffix}`;
      }

      // Final fallback: API requires asset_type
      if (!brandAssetType) {
        brandAssetType = 'other';
      }

      const filename = selectedVariant.filename || (isVideo ? 'lineup.mp4' : 'saved_asset.png');

      // Call API to save as BrandAsset
      const response = await fetch(`${getApiBaseUrl()}/api/v1/generative/assets/save/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          // Pass the storage path of the selected variant
          storage_path: selectedVariant.storage_info?.storage_path,
          presigned_url: selectedVariant.presigned_url,
          video_url: isVideo ? selectedVariant.presigned_url : null,
          image_base64: selectedVariant.image_base64,
          filename,
          mime_type: selectedVariant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
          file_size_bytes: selectedVariant.storage_info?.file_size_bytes || 0,
          // Context
          organisation_id: organisationId,
          project_id: matchData?.project?.id,
          // Activity (match) context — creates MediaItem instead of BrandAsset
          activity_id: matchData?.id || null,
          // Asset type
          asset_type: brandAssetType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to save: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Asset saved:', result);

      setSaveSuccess(true);

      // Auto-close modal after a short delay so user sees the success state
      setTimeout(() => {
        onClose();
      }, 1200);

      // Update the variant's storage_info with the new IDs
      const updatedVariants = [...generatedVariants];
      if (result.data?.brand_asset_id || result.brand_asset_id || result.data?.media_item_id || result.media_item_id) {
        const returnedFileAssetId = result.data?.file_asset_id || result.file_asset_id;
        const returnedBrandAssetId = result.data?.brand_asset_id || result.brand_asset_id;
        const returnedMediaItemId = result.data?.media_item_id || result.media_item_id;
        const returnedStoragePath = result.data?.storage_path || result.storage_path;

        const nextStorageInfo: NonNullable<GeneratedVariant['storage_info']> = selectedVariant.storage_info
          ? { ...selectedVariant.storage_info }
          : {
              // Backend isn't returned by the save endpoint; default to s3 for UI typing.
              storage_backend: 's3',
              storage_path: returnedStoragePath || selectedVariant.presigned_url || '',
              file_size_bytes: 0,
              mime_type: selectedVariant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
            };

        if (returnedStoragePath) nextStorageInfo.storage_path = returnedStoragePath;
        if (returnedFileAssetId) nextStorageInfo.file_asset_id = returnedFileAssetId;
        if (returnedBrandAssetId) nextStorageInfo.brand_asset_id = returnedBrandAssetId;
        if (returnedMediaItemId) (nextStorageInfo as Record<string, unknown>).media_item_id = returnedMediaItemId;

        updatedVariants[selectedVariantIndex] = {
          ...selectedVariant,
          storage_info: nextStorageInfo,
        };
        setGeneratedVariants(updatedVariants);
      }

    } catch (err) {
      console.error('❌ Failed to save as asset:', err);
      setGenerationError(err instanceof Error ? err.message : 'Failed to save as asset');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    handleGenerateInternal();
  };

  const handleBack = () => {
    // If we started with a template, only close on the very first step (members)
    if (initialTemplate && step === 'members') {
      onClose();
      return;
    }

    if (step === 'template') {
      setStep('type');
      setSelectedType(null);
      setTemplates([]);
    } else if (step === 'members') {
      // Poster skipped template selection, go back to type
      if (selectedType?.subtype === 'poster') {
        setStep('type');
        setSelectedType(null);
        setSelectedTemplate(null);
      } else {
        setStep('template');
        setSelectedTemplate(null);
      }
    } else if (step === 'lineup_squad') {
      setStep('members');
    } else if (step === 'confirm') {
      const needsMembers = selectedTemplate?.input_requirements?.members &&
        Object.entries(selectedTemplate.input_requirements.members).some(([key, val]) =>
          key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
        );
      const isLineup = selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer' || selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'lineup' || selectedTemplate?.template_subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'poster';
      const isGoal = selectedType?.subtype === 'goal';
      if (isGoal) {
        // Goal celebration skips template step, go back to type selection
        setStep('type');
        setSelectedType(null);
      } else if (isLineup && needsMembers) {
        setStep('lineup_squad');
      } else if (needsMembers) {
        setStep('members');
      } else {
        setStep('template');
        setSelectedTemplate(null);
      }
    }
  };

  const renderRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1) + 's';
  };

  const isLineupFlow =
    selectedType?.subtype === 'lineup' ||
    selectedType?.subtype === 'lineup_flyer' ||
    selectedType?.subtype === 'poster' ||
    selectedTemplate?.template_subtype === 'lineup' ||
    selectedTemplate?.template_subtype === 'lineup_flyer' ||
    selectedTemplate?.template_subtype === 'poster' ||
    initialTemplate?.template_subtype === 'lineup' ||
    initialTemplate?.template_subtype === 'lineup_flyer' ||
    initialTemplate?.template_subtype === 'poster';

  // Helper to extract member name from participation
  const getMemberName = (p: Participation): string => {
    const user = p.user || p.member;
    if (!user) return 'Unknown';
    if ('name' in user && user.name) return user.name;
    if ('user_name' in user && user.user_name) return user.user_name;
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (fullName) return fullName;
    if ('email' in user && user.email) return user.email;
    return 'Unknown';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--app-surface, white)',
          padding: '24px',
          borderRadius: '12px',
          width: '1200px',
          maxWidth: '100%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold m-0">
              {step === 'type' && 'Create Content'}
              {step === 'template' && `Select ${selectedType?.label} Template`}
              {step === 'members' && (isLineupFlow ? 'Lineup Opties' : `Create ${contentTypeLabel || selectedType?.label || 'Content'}`)}
              {step === 'lineup_squad' && 'Opstelling kiezen'}
              {step === 'generating' && 'Generating...'}
              {step === 'video_queued' && 'In de wachtrij!'}
              {step === 'success' && 'Content Ready!'}
            </h2>
            <div className="text-sm text-gray-500 mt-1">
              {matchData?.project?.name} vs {matchData?.opponent_project?.name || 'Opponent'}
              {organisationSport && (
                <span className="ml-2">
                  <Badge variant="info" size="sm">⚽ {organisationSport.name}</Badge>
                </span>
              )}
            </div>
          </div>
          {!(isLineupFlow || step === 'generating' || step === 'video_queued' || step === 'members' || step === 'lineup_squad') && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {/* Progress indicator - only show for multi-step flow */}
        {!initialTemplate && (step === 'type' || step === 'template' || step === 'members' || step === 'lineup_squad') && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className={`px-3 py-1 rounded-full ${step === 'type' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
              1. Type
            </span>
            <span className="text-gray-300">→</span>
            <span className={`px-3 py-1 rounded-full ${step === 'template' ? 'bg-blue-100 text-blue-700 font-medium' : selectedType ? 'bg-gray-100 text-gray-500' : 'text-gray-300'}`}>
              2. Template
            </span>
            {totalRequiredMembers > 0 && (
              <>
                <span className="text-gray-300">→</span>
                <span className={`px-3 py-1 rounded-full ${step === 'members' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
                  3. {isLineupFlow ? 'Opties' : 'Members'}
                </span>
                {isLineupFlow && (
                  <>
                    <span className="text-gray-300">→</span>
                    <span className={`px-3 py-1 rounded-full ${step === 'lineup_squad' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-300'}`}>
                      4. Opstelling
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-[400px]">

          {/* Step 1: Select Content Type */}
          {step === 'type' && (
            <div className="space-y-6">
              {Object.entries(CONTENT_TYPES).map(([typeKey, typeData]) => (
                <div key={typeKey}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {typeData.label}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {typeData.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectType(typeKey, item.subtype, item.label)}
                        className="p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all"
                      >
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <div className="font-semibold text-sm">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Select Template */}
          {step === 'template' && (
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-10 text-gray-500">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                  <div>Loading templates...</div>
                </div>
              )}

              {error && (
                <div className="space-y-4">
                  <div className="text-center py-6 px-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-yellow-600 mb-2">⚠️ Could not load templates</div>
                    <div className="text-sm text-gray-600 mb-4">
                      Make sure the backend server is running.
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => selectedType && fetchTemplates(selectedType.type, selectedType.subtype)}>
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {!loading && !error && templates.length === 0 && (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">📭</div>
                  <div className="text-gray-600 mb-2">No templates found for "{selectedType?.label}"</div>
                  <div className="text-sm text-gray-400 mb-4">
                    {organisationSport ? `Looking for ${organisationSport.name} templates` : 'No sport filter active'}
                  </div>
                  <a href="/content-templates" className="text-blue-600 hover:underline text-sm">
                    → Go to Content Templates to create one
                  </a>
                </div>
              )}

              {!loading && !error && templates.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => {
                    const memberReqs = template.input_requirements?.members;
                    const reqSummary: string[] = [];
                    if (memberReqs) {
                      (['goalkeeper', 'player', 'coach', 'assistant'] as const).forEach(role => {
                        const req = memberReqs[role];
                        if (req && typeof req !== 'boolean' && req.count) {
                          reqSummary.push(`${req.count} ${role}${req.count > 1 ? 's' : ''}`);
                        }
                      });
                    }

                    return (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="border rounded-lg p-4 cursor-pointer transition-all flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
                      >
                        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                          {template.style_variant || 'Preview'}
                        </div>
                        <div className="font-semibold">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                        )}
                        <div className="flex flex-wrap gap-1 items-center">
                          {template.sport_detail && (
                            <Badge variant="info" size="sm">⚽ {template.sport_detail.name}</Badge>
                          )}
                          {template.formation_detail && (
                            <Badge variant="default" size="sm">{template.formation_detail.code}</Badge>
                          )}
                          {template.style_variant && (
                            <Badge variant="success" size="sm">{template.style_variant}</Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-2 border-t text-xs text-gray-500">
                          <span>💎 {template.credits_required ?? 1} credit{(template.credits_required ?? 1) !== 1 ? 's' : ''}</span>
                          {reqSummary.length > 0 && (
                            <span>{reqSummary.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Members */}
          {step === 'members' && selectedTemplate && (
            <div className="space-y-6">

              {/* Lineup Options - Formation & Player Style (styled like AssetGenerationModal) */}
              {(selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'lineup' || selectedTemplate?.template_subtype === 'lineup_flyer') && (
                <div style={{
                  border: '1px solid var(--vscode-widget-border, #333)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--vscode-editor-background, #1e1e1e)',
                }}>
                  {/* Section header */}
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--vscode-widget-border, #333)',
                    background: 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
                  }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--vscode-foreground, #ccc)' }}>
                      ⚽ Lineup Opties
                    </h4>
                  </div>

                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Formation selector */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 10,
                      color: 'var(--vscode-foreground, #ccc)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>Formatie</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                      gap: 8,
                    }}>
                      {Object.entries(FORMATION_LAYOUTS).map(([code, layout]) => {
                        const isSelected = lineupFormation === code;
                        return (
                          <button
                            key={code}
                            onClick={() => setLineupFormation(code)}
                            style={{
                              position: 'relative',
                              border: isSelected
                                ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                : '1px solid var(--vscode-widget-border, #333)',
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              padding: 0,
                              background: isSelected
                                ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                                : 'var(--vscode-editor-background, #1e1e1e)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {/* Mini field */}
                            <div style={{
                              position: 'relative',
                              width: '100%',
                              aspectRatio: '3/4',
                              background: isSelected
                                ? 'linear-gradient(to bottom, #16a34a, #15803d)'
                                : 'linear-gradient(to bottom, #166534, #14532d)',
                            }}>
                              {/* Field markings */}
                              <div style={{ position: 'absolute', left: 8, right: 8, top: '15%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
                              <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
                              <div style={{
                                position: 'absolute', left: '50%', top: '50%',
                                width: 20, height: 20, transform: 'translate(-50%, -50%)',
                                border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%',
                              }} />

                              {/* Position dots */}
                              {layout.positions.map(pos => (
                                <div
                                  key={pos.slot}
                                  style={{
                                    position: 'absolute',
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                                    left: `${pos.x}%`, top: `${pos.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: isSelected ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
                                  }}
                                />
                              ))}

                              {/* Selected check badge */}
                              {isSelected && (
                                <div style={{
                                  position: 'absolute', top: 3, right: 3,
                                  width: 16, height: 16, borderRadius: '50%',
                                  background: '#10b981', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, color: '#fff', fontWeight: 700,
                                }}>✓</div>
                              )}
                            </div>
                            {/* Formation code label */}
                            <div style={{
                              padding: '5px 0',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              color: isSelected ? '#fff' : 'var(--vscode-foreground, #ccc)',
                              background: isSelected
                                ? 'var(--vscode-focusBorder, #007fd4)'
                                : 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
                            }}>
                              {code}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Closeup style selector — not for poster */}
                  {!(selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'poster') && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 10,
                      color: 'var(--vscode-foreground, #ccc)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>Weergave Stijl</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { value: 'popout' as const, label: 'Popout', desc: 'Speler los van achtergrond', icon: '🧍' },
                        { value: 'badge' as const, label: 'Badge', desc: 'Ronde spelersfoto', icon: '⭕' },
                      ].map(opt => {
                        const isSelected = lineupCloseupStyle === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setLineupCloseupStyle(opt.value)}
                            style={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 14px',
                              border: isSelected
                                ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                : '1px solid var(--vscode-widget-border, #333)',
                              borderRadius: 8,
                              background: isSelected
                                ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                                : 'var(--vscode-editor-background, #1e1e1e)',
                              color: 'var(--vscode-foreground, #ccc)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              textAlign: 'left',
                            }}
                          >
                            <span style={{ fontSize: 26, flexShrink: 0 }}>{opt.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground, #888)', marginTop: 1 }}>
                                {opt.desc}
                              </div>
                            </div>
                            {isSelected && (
                              <div style={{
                                position: 'absolute', top: 6, right: 6,
                                width: 18, height: 18, borderRadius: '50%',
                                background: '#10b981', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, color: '#fff', fontWeight: 700,
                              }}>✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  {/* Animation style selector — only for video, not for static flyer or poster */}
                  {!(selectedType?.subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'lineup_flyer' || selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'poster') && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 10,
                      color: 'var(--vscode-foreground, #ccc)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>Animatie Stijl</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { value: 'slide_up', label: 'Omhoog', icon: '⬆️' },
                        { value: 'appear', label: 'Direct', icon: '✨' },
                        { value: 'slide_in', label: 'Naar binnen', icon: '↔️' },
                        { value: 'zoom', label: 'Inzoomen', icon: '🔍' },
                        { value: 'fade', label: 'Vervagen', icon: '🌫️' },
                      ].map(opt => {
                        const isSelected = lineupAnimationStyle === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setLineupAnimationStyle(opt.value as typeof lineupAnimationStyle)}
                            style={{
                              position: 'relative',
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4,
                              padding: '10px 6px',
                              border: isSelected
                                ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                : '1px solid var(--vscode-widget-border, #333)',
                              borderRadius: 8,
                              background: isSelected
                                ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                                : 'var(--vscode-editor-background, #1e1e1e)',
                              color: 'var(--vscode-foreground, #ccc)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{opt.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{opt.label}</span>
                            {isSelected && (
                              <div style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 18, height: 18, borderRadius: '50%',
                                background: '#10b981', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, color: '#fff', fontWeight: 700,
                              }}>✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  {/* Intro style selector — per line vs per player — only for video */}
                  {!(selectedType?.subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'lineup_flyer' || selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'poster') && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 10,
                      color: 'var(--vscode-foreground, #ccc)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>Introductie Stijl</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { value: 'per_line', label: 'Per linie', icon: '👥', desc: 'Hele linie tegelijk' },
                        { value: 'per_player', label: 'Per speler', icon: '👤', desc: 'Eén voor één, groot in beeld' },
                      ].map(opt => {
                        const isSelected = lineupIntroStyle === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setLineupIntroStyle(opt.value as typeof lineupIntroStyle)}
                            style={{
                              position: 'relative',
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4,
                              padding: '10px 6px',
                              border: isSelected
                                ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                : '1px solid var(--vscode-widget-border, #333)',
                              borderRadius: 8,
                              background: isSelected
                                ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                                : 'var(--vscode-editor-background, #1e1e1e)',
                              color: 'var(--vscode-foreground, #ccc)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{opt.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{opt.label}</span>
                            <span style={{ fontSize: 9, color: '#999' }}>{opt.desc}</span>
                            {isSelected && (
                              <div style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 18, height: 18, borderRadius: '50%',
                                background: '#10b981', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, color: '#fff', fontWeight: 700,
                              }}>✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  {/* Background / Location selector */}
                  {appBackgrounds.length > 0 && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 10,
                      color: 'var(--vscode-foreground, #ccc)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>Achtergrond / Locatie</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: 8,
                    }}>
                      {/* Default option — auto from club brand */}
                      <button
                        onClick={() => setSelectedBackgroundUrl(null)}
                        style={{
                          position: 'relative',
                          border: !selectedBackgroundUrl
                            ? '2px solid var(--vscode-focusBorder, #007fd4)'
                            : '1px solid var(--vscode-widget-border, #333)',
                          borderRadius: 8,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          padding: 0,
                          background: !selectedBackgroundUrl
                            ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                            : 'var(--vscode-editor-background, #1e1e1e)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: '100%',
                          aspectRatio: '9/16',
                          background: 'linear-gradient(to bottom, #16a34a, #14532d)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 24 }}>⚽</span>
                        </div>
                        <div style={{
                          padding: '4px 0',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: 10,
                          color: !selectedBackgroundUrl ? '#fff' : 'var(--vscode-foreground, #ccc)',
                          background: !selectedBackgroundUrl
                            ? 'var(--vscode-focusBorder, #007fd4)'
                            : 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
                        }}>
                          Standaard
                        </div>
                        {!selectedBackgroundUrl && (
                          <div style={{
                            position: 'absolute', top: 3, right: 3,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#10b981', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, color: '#fff', fontWeight: 700,
                          }}>✓</div>
                        )}
                      </button>

                      {/* App-level backgrounds */}
                      {appBackgrounds.map((bg) => {
                        const isSelected = selectedBackgroundUrl === bg.url;
                        return (
                          <button
                            key={bg.id}
                            onClick={() => setSelectedBackgroundUrl(bg.url)}
                            style={{
                              position: 'relative',
                              border: isSelected
                                ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                : '1px solid var(--vscode-widget-border, #333)',
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              padding: 0,
                              background: isSelected
                                ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                                : 'var(--vscode-editor-background, #1e1e1e)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: '9/16',
                              background: `url(${bg.url}) center/cover`,
                            }} />
                            <div style={{
                              padding: '4px 0',
                              textAlign: 'center',
                              fontWeight: 600,
                              fontSize: 10,
                              color: isSelected ? '#fff' : 'var(--vscode-foreground, #ccc)',
                              background: isSelected
                                ? 'var(--vscode-focusBorder, #007fd4)'
                                : 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {bg.label || bg.profile_name || 'Locatie'}
                            </div>
                            {isSelected && (
                              <div style={{
                                position: 'absolute', top: 3, right: 3,
                                width: 16, height: 16, borderRadius: '50%',
                                background: '#10b981', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, color: '#fff', fontWeight: 700,
                              }}>✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  </div>
                </div>
              )}

              {/* Member Selection - Compact Dropdown Layout (non-lineup flows only) */}
              {!isLineupFlow && (['goalkeeper', 'player', 'coach', 'assistant'] as const).map(role => {
                const req = selectedTemplate.input_requirements?.members?.[role];
                if (!req || typeof req === 'boolean' || !req.count) return null;

                // For lineup videos, allow selecting from ALL squad members, not just those with matching roles
                // This handles cases like coaches who can also play, or players mislabeled as other roles
                const isLineupTemplate = selectedTemplate?.template_subtype?.toLowerCase()?.includes('lineup');
                const available = isLineupTemplate && (role === 'player' || role === 'goalkeeper')
                  ? [...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || []), ...(seasonSquad.coach || []), ...(seasonSquad.assistant || [])]
                    // Remove duplicates (same member ID)
                    .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx)
                  : (seasonSquad[role] || []);
                const selected = selectedMembers[role];
                const assetTypes = req.asset_types || [];
                const assetLabels = assetTypes.map(t => ASSET_TYPE_LABELS[t] || t);

                return (
                  <div key={role} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-sm">
                    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="font-semibold text-base text-gray-800 dark:text-gray-100">{renderRoleLabel(role)}</span>
                    </div>

                    <div className="space-y-2">
                      {Array.from({ length: req.count }).map((_, idx) => {
                        const currentSelection = selected[idx];
                        const currentMember = available.find(p => p.id === currentSelection);

                        // Calculate position label based on role and formation
                        let positionLabel = '';
                        if (role === 'goalkeeper') {
                          positionLabel = 'Keeper';
                        } else if (role === 'player') {
                          // Get position label from formation layout if available
                          const slotNumber = idx + 2; // Players start at slot 2 (after goalkeeper)
                          const formationLayout = FORMATION_LAYOUTS[lineupFormation];
                          const positionData = formationLayout?.positions.find(p => p.slot === slotNumber);
                          if (positionData) {
                            positionLabel = positionData.label;
                          } else {
                            positionLabel = 'Speler';
                          }
                        } else if (role === 'coach') {
                          positionLabel = idx === 0 ? 'Coach' : `Coach ${idx + 1}`;
                        } else if (role === 'assistant') {
                          positionLabel = idx === 0 ? 'Assistent' : `Assistent ${idx + 1}`;
                        } else {
                          positionLabel = `${renderRoleLabel(role)} ${idx + 1}`;
                        }

                        // Split available members into eligible (have all required assets) and ineligible
                        const eligibleMembers = available.filter(p => memberHasRequiredAssets(p, assetTypes, role));
                        const ineligibleMembers = available.filter(p => !memberHasRequiredAssets(p, assetTypes, role));

                        return (
                          <div key={idx} className="grid grid-cols-[100px_1fr] gap-3 items-center">
                            <label className="text-sm text-gray-600 font-medium truncate" title={positionLabel}>
                              {positionLabel}
                            </label>
                            <select
                              value={currentSelection || ''}
                              onChange={(e) => {
                                const newSelected = [...selected];
                                if (e.target.value) {
                                  newSelected[idx] = e.target.value;
                                } else {
                                  newSelected.splice(idx, 1);
                                }
                                setSelectedMembers({ ...selectedMembers, [role]: newSelected.filter(Boolean) });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">
                                {available.length === 0
                                  ? `No ${role}s in season squad - add members first`
                                  : eligibleMembers.length === 0
                                    ? `No ${role}s have required assets`
                                    : `Select ${role}...`
                                }
                              </option>
                              {/* Eligible members - can be selected */}
                              {eligibleMembers.length > 0 && assetTypes.length > 0 && (
                                <optgroup label="✅ Ready (have required assets)">
                                  {eligibleMembers.map(p => {
                                    const user = p.user || p.member;
                                    let memberName = 'Unknown';
                                    if (user) {
                                      if ('name' in user && user.name) {
                                        memberName = user.name;
                                      } else if ('user_name' in user && user.user_name) {
                                        memberName = user.user_name;
                                      } else {
                                        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                                        if (fullName) {
                                          memberName = fullName;
                                        } else if ('email' in user && user.email) {
                                          memberName = user.email;
                                        }
                                      }
                                    }
                                    const isAlreadySelected = selected.includes(p.id) && p.id !== currentSelection;
                                    const jerseyNumber = p.metadata?.shirt_number || p.data?.jersey_number;

                                    return (
                                      <option
                                        key={p.id}
                                        value={p.id}
                                        disabled={isAlreadySelected}
                                      >
                                        {jerseyNumber ? `#${jerseyNumber} - ` : ''}{memberName}{isAlreadySelected ? ' (already selected)' : ''}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                              {/* No asset requirements - show all */}
                              {assetTypes.length === 0 && available.map(p => {
                                const user = p.user || p.member;
                                let memberName = 'Unknown';
                                if (user) {
                                  if ('name' in user && user.name) {
                                    memberName = user.name;
                                  } else if ('user_name' in user && user.user_name) {
                                    memberName = user.user_name;
                                  } else {
                                    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                                    if (fullName) {
                                      memberName = fullName;
                                    } else if ('email' in user && user.email) {
                                      memberName = user.email;
                                    }
                                  }
                                }
                                const isAlreadySelected = selected.includes(p.id) && p.id !== currentSelection;
                                const jerseyNumber = p.metadata?.shirt_number || p.data?.jersey_number;

                                return (
                                  <option
                                    key={p.id}
                                    value={p.id}
                                    disabled={isAlreadySelected}
                                  >
                                    {jerseyNumber ? `#${jerseyNumber} - ` : ''}{memberName}{isAlreadySelected ? ' (already selected)' : ''}
                                  </option>
                                );
                              })}
                              {/* Ineligible members - shown but disabled with reason */}
                              {ineligibleMembers.length > 0 && assetTypes.length > 0 && (
                                <optgroup label="⚠️ Missing assets">
                                  {ineligibleMembers.map(p => {
                                    const user = p.user || p.member;
                                    let memberName = 'Unknown';
                                    if (user) {
                                      if ('name' in user && user.name) {
                                        memberName = user.name;
                                      } else if ('user_name' in user && user.user_name) {
                                        memberName = user.user_name;
                                      } else {
                                        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                                        if (fullName) {
                                          memberName = fullName;
                                        } else if ('email' in user && user.email) {
                                          memberName = user.email;
                                        }
                                      }
                                    }
                                    const jerseyNumber = p.metadata?.shirt_number || p.data?.jersey_number;
                                    const missingAssets = getMissingAssets(p, assetTypes, role);
                                    const missingLabels = missingAssets.map(a => ASSET_TYPE_LABELS[a] || a).join(', ');

                                    return (
                                      <option
                                        key={p.id}
                                        value={p.id}
                                        disabled={true}
                                      >
                                        {jerseyNumber ? `#${jerseyNumber} - ` : ''}{memberName} (missing: {missingLabels})
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                            </select>
                          </div>
                        );
                      })}

                      {/* Show summary of eligible vs total */}
                      {assetTypes.length > 0 && (
                        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                          {(() => {
                            const eligible = available.filter(p => memberHasRequiredAssets(p, assetTypes, role)).length;
                            const total = available.length;
                            if (eligible === 0 && total > 0) {
                              return (
                                <span className="text-red-600">
                                  ⚠️ No {role}s have the required assets. Generate assets for members first.
                                </span>
                              );
                            }
                            return `${eligible} of ${total} ${role}s have required assets`;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 4 (lineup only): Squad selection on field visualization */}
          {step === 'lineup_squad' && selectedTemplate && (() => {
            const formationLayout = FORMATION_LAYOUTS[lineupFormation] || FORMATION_LAYOUTS['4-3-3'];
            // Separate pools: GK dropdown only shows goalkeepers
            // Player slots show ALL non-goalkeeper members (players, coaches, assistants)
            // because coaches/assistants may have player-type (home/away) assets and should be selectable
            const gkPool = (seasonSquad.goalkeeper || [])
              .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
            const allMembers = Object.values(seasonSquad).flat() as Participation[];
            const gkIds = new Set(gkPool.map(p => p.id));
            const playerPool = allMembers
              .filter(p => !gkIds.has(p.id))
              .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
            const playerReq = selectedTemplate.input_requirements?.members?.player;
            const gkReq = selectedTemplate.input_requirements?.members?.goalkeeper;
            const playerAssetTypes = (playerReq && typeof playerReq !== 'boolean' && playerReq.asset_types) || [];
            const gkAssetTypes = (gkReq && typeof gkReq !== 'boolean' && (gkReq as any).asset_types) || playerAssetTypes;
            // Eligible/ineligible split per role
            const eligibleGks = gkPool.filter(p => memberHasRequiredAssets(p, gkAssetTypes, 'goalkeeper'));
            const ineligibleGks = gkPool.filter(p => !memberHasRequiredAssets(p, gkAssetTypes, 'goalkeeper'));
            const eligiblePlayers = playerPool.filter(p => memberHasRequiredAssets(p, playerAssetTypes, 'player'));
            const ineligiblePlayers = playerPool.filter(p => !memberHasRequiredAssets(p, playerAssetTypes, 'player'));
            const gkSelected = selectedMembers.goalkeeper || [];
            const playerSelected = selectedMembers.player || [];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Field */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '3 / 4',
                  maxHeight: 'calc(100vh - 340px)',
                  margin: '0 auto',
                  background: 'linear-gradient(to bottom, #16a34a, #15803d)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid var(--vscode-widget-border, #333)',
                }}>
                  {/* Field markings */}
                  <div style={{ position: 'absolute', left: 16, right: 16, top: '15%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ position: 'absolute', left: 16, right: 16, top: '50%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, transform: 'translate(-50%, -50%)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', left: '22%', right: '22%', bottom: 0, height: '14%', borderTop: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />
                  <div style={{ position: 'absolute', left: '22%', right: '22%', top: 0, height: '14%', borderBottom: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />

                  {/* Position nodes */}
                  {formationLayout.positions.map(pos => {
                    const isGk = pos.slot === 1;
                    const role = isGk ? 'goalkeeper' : 'player';
                    const idx = isGk ? 0 : pos.slot - 2; // Players index from 0 at slot 2
                    const selected = isGk ? gkSelected : playerSelected;
                    const currentId = selected[idx] || '';
                    const pool = isGk ? gkPool : playerPool;
                    const assetTypes = isGk ? gkAssetTypes : playerAssetTypes;
                    const eligibleMembers = isGk ? eligibleGks : eligiblePlayers;
                    const ineligibleMembers = isGk ? ineligibleGks : ineligiblePlayers;
                    const currentMember = currentId === '__guest__' ? null : pool.find(p => p.id === currentId);
                    const isGuestSelected = currentId === '__guest__';
                    const jerseyNumber = currentMember?.metadata?.shirt_number || currentMember?.data?.jersey_number;

                    return (
                      <div
                        key={pos.slot}
                        style={{
                          position: 'absolute',
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          zIndex: 10,
                          minWidth: 100,
                        }}
                      >
                        {/* Position label */}
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.7)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>{pos.label}</div>

                        {/* Dropdown */}
                        <select
                          value={currentId}
                          onChange={(e) => {
                            const newSelected = [...selected];
                            if (e.target.value) {
                              // Ensure array is long enough for this index
                              while (newSelected.length <= idx) newSelected.push('');
                              newSelected[idx] = e.target.value;
                            } else {
                              // Clear this slot (keep position)
                              if (idx < newSelected.length) newSelected[idx] = '';
                            }
                            // Keep sparse array — positions must stay aligned with formation slots
                            setSelectedMembers({ ...selectedMembers, [role]: [...newSelected] });
                          }}
                          style={{
                            width: 120,
                            padding: '4px 6px',
                            fontSize: 11,
                            fontWeight: currentId ? 700 : 400,
                            background: currentId
                              ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                              : 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: currentId
                              ? '2px solid var(--vscode-focusBorder, #007fd4)'
                              : '1px solid rgba(255,255,255,0.3)',
                            borderRadius: 6,
                            outline: 'none',
                            cursor: 'pointer',
                            textAlign: 'center',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.6)'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                            paddingRight: 20,
                          }}
                        >
                          <option value="" style={{ background: '#1e1e1e', color: '#ccc' }}>
                            — Kies —
                          </option>
                          {/* Guest player option — always available, can be used multiple times */}
                          <option value="__guest__" style={{ background: '#1e1e1e', color: '#a78bfa' }}>
                            🏃 Gast Speler
                          </option>
                          {assetTypes.length > 0 && eligibleMembers.length > 0 && (
                            <optgroup label="✅ Beschikbaar">
                              {eligibleMembers.map(p => {
                                const name = getMemberName(p);
                                const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                                const allUsedIds = [...gkSelected, ...playerSelected].filter(id => id && id !== '__guest__');
                                const isAlreadyUsed = allUsedIds.includes(p.id) && p.id !== currentId;
                                return (
                                  <option key={p.id} value={p.id} disabled={isAlreadyUsed} style={{ background: '#1e1e1e', color: isAlreadyUsed ? '#666' : '#ccc' }}>
                                    {jersey ? `#${jersey} ` : ''}{name}{isAlreadyUsed ? ' ✗' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}
                          {assetTypes.length === 0 && pool.map(p => {
                            const name = getMemberName(p);
                            const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                            const allUsedIds = [...gkSelected, ...playerSelected].filter(id => id && id !== '__guest__');
                            const isAlreadyUsed = allUsedIds.includes(p.id) && p.id !== currentId;
                            return (
                              <option key={p.id} value={p.id} disabled={isAlreadyUsed} style={{ background: '#1e1e1e', color: isAlreadyUsed ? '#666' : '#ccc' }}>
                                {jersey ? `#${jersey} ` : ''}{name}{isAlreadyUsed ? ' ✗' : ''}
                              </option>
                            );
                          })}
                          {assetTypes.length > 0 && ineligibleMembers.length > 0 && (
                            <optgroup label="⚠️ Ontbrekende assets">
                              {ineligibleMembers.map(p => {
                                const name = getMemberName(p);
                                const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                                const missingAssets = getMissingAssets(p, assetTypes, role);
                                const missingLabels = missingAssets.map(a => ASSET_TYPE_LABELS[a] || a).join(', ');
                                return (
                                  <option key={p.id} value={p.id} disabled style={{ background: '#1e1e1e', color: '#666' }}>
                                    {jersey ? `#${jersey} ` : ''}{name} ({missingLabels})
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}
                        </select>

                        {/* Show selected name below */}
                        {(currentMember || isGuestSelected) && (
                          <div style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: isGuestSelected ? '#a78bfa' : '#fff',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                            maxWidth: 110,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                          }}>
                            {isGuestSelected ? '🏃 Gast' : `${jerseyNumber ? `#${jerseyNumber} ` : ''}${currentMember ? getMemberName(currentMember) : ''}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--vscode-foreground, #ccc)',
                }}>
                  <span>Formatie: <strong>{lineupFormation}</strong></span>
                  <span>
                    {(() => {
                      const filled = [...gkSelected, ...playerSelected].filter(Boolean).length;
                      const total = formationLayout.positions.length;
                      return filled === total
                        ? <span style={{ color: '#10b981' }}>✓ Alle {total} posities ingevuld</span>
                        : <span>{filled} / {total} posities ingevuld</span>;
                    })()}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Confirm - Review before generation */}
          {step === 'confirm' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="text-6xl mb-6">{selectedType?.subtype === 'goal' ? '⚽' : selectedType?.subtype === 'flyer' ? '📣' : selectedType?.subtype === 'match_intro' ? '🎥' : '🎬'}</div>
              <h3 className="text-2xl font-bold mb-2">
                {selectedType?.subtype === 'goal' ? 'Goal Celebration Video' : selectedType?.subtype === 'flyer' ? 'Match Flyer' : selectedType?.subtype === 'match_intro' ? 'Match Intro Video' : 'Klaar om te genereren'}
              </h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                {selectedType?.subtype === 'goal'
                  ? 'Vul de doelpuntgegevens in en kies een speler.'
                  : selectedType?.subtype === 'flyer'
                    ? 'Kies een ontwerpstijl en genereer je match flyer.'
                    : selectedType?.subtype === 'match_intro'
                      ? 'Er wordt een 6 seconden intro video gegenereerd met header, logo\'s en wedstrijdinfo.'
                      : <>Je gaat een <strong>{selectedType?.label || selectedTemplate?.name}</strong> maken.</>
                }
              </p>

              {/* Match info */}
              {matchData && (
                <div className="bg-blue-50 rounded-lg p-4 w-full max-w-md">
                  <div className="text-sm text-blue-800">
                    <strong>Wedstrijd:</strong> {matchData.title || `${matchData.project?.name} vs ${matchData.opponent_project?.name || 'Opponent'}`}
                  </div>
                  {matchData.start_time && (
                    <div className="text-sm text-blue-600 mt-1">
                      {new Date(matchData.start_time).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  )}
                </div>
              )}

              {/* Match Flyer Variant Picker */}
              {selectedType?.subtype === 'flyer' && (
                <div style={{
                  width: '100%',
                  maxWidth: 480,
                  marginTop: 20,
                  border: '1px solid var(--vscode-widget-border, #ddd)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--vscode-editor-background, #fff)',
                }}>
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--vscode-widget-border, #ddd)',
                    background: 'var(--vscode-editor-inactiveSelectionBackground, #f5f5f5)',
                  }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--vscode-foreground, #333)' }}>
                      🎨 Kies Ontwerpstijl
                    </h4>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([
                      { key: 'classic' as const, label: 'Klassiek', desc: 'Header + logo\'s + wedstrijdinfo', icon: '🏟️' },
                      { key: 'bold' as const, label: 'Bold', desc: 'Groot typografie, hoog contrast', icon: '💪' },
                      { key: 'stadium' as const, label: 'Stadium AI', desc: 'AI-gegenereerde stadion achtergrond', icon: '✨' },
                    ]).map((opt) => {
                      const isSelected = matchFlyerVariant === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => setMatchFlyerVariant(opt.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                            background: isSelected ? '#eff6ff' : 'var(--vscode-editor-background, #f9fafb)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: isSelected ? '6px solid #3b82f6' : '2px solid #d1d5db',
                            flexShrink: 0,
                          }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--vscode-foreground, #333)' }}>
                              {opt.icon} {opt.label}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Goal Celebration Options */}
              {selectedType?.subtype === 'goal' && (
                <div style={{
                  width: '100%',
                  maxWidth: 480,
                  marginTop: 20,
                  border: '1px solid var(--vscode-widget-border, #ddd)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--vscode-editor-background, #fff)',
                }}>
                  {/* Section header */}
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--vscode-widget-border, #ddd)',
                    background: 'var(--vscode-editor-inactiveSelectionBackground, #f5f5f5)',
                  }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--vscode-foreground, #333)' }}>
                      ⚽ Doelpunt Details
                    </h4>
                  </div>

                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Score input */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 10,
                        color: 'var(--vscode-foreground, #555)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>Nieuwe Stand</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--vscode-foreground, #666)' }}>
                            {matchData?.project?.name || 'Thuis'}
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={goalScoreHome}
                            onChange={(e) => setGoalScoreHome(Math.max(0, parseInt(e.target.value) || 0))}
                            style={{
                              width: 64,
                              height: 56,
                              fontSize: 28,
                              fontWeight: 700,
                              textAlign: 'center',
                              border: '2px solid var(--vscode-widget-border, #ccc)',
                              borderRadius: 8,
                              background: 'var(--vscode-input-background, #fff)',
                              color: 'var(--vscode-foreground, #333)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--vscode-foreground, #666)' }}>-</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--vscode-foreground, #666)' }}>
                            {matchData?.opponent_project?.name || 'Uit'}
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={goalScoreAway}
                            onChange={(e) => setGoalScoreAway(Math.max(0, parseInt(e.target.value) || 0))}
                            style={{
                              width: 64,
                              height: 56,
                              fontSize: 28,
                              fontWeight: 700,
                              textAlign: 'center',
                              border: '2px solid var(--vscode-widget-border, #ccc)',
                              borderRadius: 8,
                              background: 'var(--vscode-input-background, #fff)',
                              color: 'var(--vscode-foreground, #333)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Goal scorer dropdown selector */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 10,
                        color: 'var(--vscode-foreground, #555)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>Doelpuntenmaker</label>
                      <select
                        value={goalScorerId || ''}
                        onChange={(e) => setGoalScorerId(e.target.value || null)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 14,
                          border: '1px solid var(--vscode-widget-border, #ccc)',
                          borderRadius: 8,
                          background: 'var(--vscode-input-background, #fff)',
                          color: 'var(--vscode-foreground, #333)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">-- Selecteer speler --</option>
                        {[...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || [])]
                          .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx) // dedupe
                          .map((member) => {
                            const user = member.user || member.member;
                            const name = user ? (
                              ('name' in user && user.name) ||
                              ('user_name' in user && user.user_name) ||
                              `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            ) : 'Unknown';

                            // Check if member has celebration video (required for goal celebration)
                            const tr = (member.metadata as any)?.teamreel_assets || {};
                            const videos = tr?.videos || {};
                            const hasCelebration = videos?.celebration && Object.keys(videos.celebration).length > 0;

                            return (
                              <option
                                key={member.id}
                                value={member.id}
                                disabled={!hasCelebration}
                                style={{
                                  color: hasCelebration ? 'inherit' : '#999',
                                  fontWeight: hasCelebration ? 500 : 400,
                                }}
                              >
                                {name}{hasCelebration ? ' 🎉' : ' (geen celebration video)'}
                              </option>
                            );
                          })}
                      </select>
                      {!goalScorerId && (
                        <div style={{ fontSize: 11, color: '#e11d48', marginTop: 6 }}>
                          Selecteer een doelpuntenmaker
                        </div>
                      )}
                    </div>

                    {/* Background selector (reuse same pattern) */}
                    {appBackgrounds.length > 0 && (
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 10,
                          color: 'var(--vscode-foreground, #555)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>Achtergrond</label>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                          gap: 8,
                        }}>
                          <button
                            onClick={() => setSelectedBackgroundUrl(null)}
                            style={{
                              position: 'relative',
                              border: !selectedBackgroundUrl
                                ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                : '1px solid var(--vscode-widget-border, #ddd)',
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: '9/16',
                              background: 'linear-gradient(to bottom, #16a34a, #14532d)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <span style={{ fontSize: 20 }}>⚽</span>
                            </div>
                            <div style={{
                              padding: '3px 0',
                              textAlign: 'center',
                              fontWeight: 600,
                              fontSize: 9,
                              color: !selectedBackgroundUrl ? 'var(--vscode-focusBorder, #007fd4)' : 'var(--vscode-foreground, #888)',
                            }}>
                              Standaard
                            </div>
                          </button>

                          {appBackgrounds.map((bg) => {
                            const isSel = selectedBackgroundUrl === bg.url;
                            return (
                              <button
                                key={bg.id}
                                onClick={() => setSelectedBackgroundUrl(bg.url)}
                                style={{
                                  position: 'relative',
                                  border: isSel
                                    ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                    : '1px solid var(--vscode-widget-border, #ddd)',
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <div style={{
                                  width: '100%',
                                  aspectRatio: '9/16',
                                  background: `url(${bg.url}) center/cover`,
                                }} />
                                <div style={{
                                  padding: '3px 0',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  fontSize: 9,
                                  color: isSel ? 'var(--vscode-focusBorder, #007fd4)' : 'var(--vscode-foreground, #888)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {bg.label || bg.profile_name || 'Locatie'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              {(() => {
                const templateSubtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';
                const isLineupVideo = templateSubtype === 'lineup';
                const isLineupFlyer = templateSubtype === 'lineup_flyer';
                const isGoalCelebration = templateSubtype === 'goal';
                const isMatchIntro = templateSubtype === 'match_intro';
                const isLineup = isLineupVideo || isLineupFlyer;
                const isVideoJob = isLineup || isGoalCelebration || isMatchIntro;
                const status = (videoJobStatus || '').toLowerCase();

                // Determine progress value (use videoJobProgressRaw for lineup, progress for others)
                const displayProgress = isVideoJob && videoJobProgressRaw > 0 ? videoJobProgressRaw : progress;

                // Dynamic headline and description based on status
                let headline = 'Bezig met genereren…';
                let description = 'Even geduld, we maken je content.';

                if (isGoalCelebration) {
                  headline = '⚽ Goal Celebration wordt gemaakt';
                  if (status === 'queued') {
                    description = 'Wachten op verwerking…';
                  } else if (status === 'processing') {
                    if (displayProgress > 0) {
                      description = displayProgress < 30
                        ? 'Assets worden geladen…'
                        : displayProgress < 70
                          ? 'Video wordt samengesteld…'
                          : 'Bijna klaar, video wordt afgerond…';
                    } else {
                      description = 'Celebration video wordt verwerkt…';
                    }
                  } else if (status === 'completed') {
                    description = 'Voltooid! ⚽🎉';
                  }
                } else if (isMatchIntro) {
                  headline = '🎥 Match Intro wordt gemaakt';
                  if (status === 'queued') {
                    description = 'Wachten op verwerking…';
                  } else if (status === 'processing') {
                    if (displayProgress > 0) {
                      description = displayProgress < 30
                        ? 'Header en logo\'s worden geladen…'
                        : displayProgress < 70
                          ? 'Intro video wordt samengesteld…'
                          : 'Bijna klaar, video wordt afgerond…';
                    } else {
                      description = 'Match intro wordt verwerkt…';
                    }
                  } else if (status === 'completed') {
                    description = 'Voltooid! 🎥🎉';
                  }
                } else if (isLineupFlyer) {
                  headline = 'Flyer wordt gemaakt';
                  description = 'Even geduld, we genereren je lineup flyer.';
                } else if (isLineupVideo) {
                  headline = 'Video wordt gemaakt';

                  const currentPlayer = (videoJobMeta as Record<string, unknown>)?.current_segment as string | undefined;
                  const segIdx = (videoJobMeta as Record<string, unknown>)?.segment_index as number | undefined;
                  const segTotal = (videoJobMeta as Record<string, unknown>)?.segment_total as number | undefined;

                  if (status === 'queued') {
                    description = 'Wachten op verwerking…';
                  } else if (status === 'processing') {
                    if (currentPlayer && segIdx && segTotal) {
                      description = `${currentPlayer} (${segIdx}/${segTotal})`;
                    } else if (displayProgress > 0) {
                      description = displayProgress < 50
                        ? 'Intro en spelers worden verwerkt…'
                        : displayProgress < 85
                          ? 'Segmenten worden samengevoegd…'
                          : 'Bijna klaar, video wordt afgerond…';
                    } else {
                      description = 'Assets worden geladen…';
                    }
                  } else if (status === 'completed') {
                    description = 'Voltooid!';
                  }
                }

                return (
                  <div className="w-full max-w-md text-center">
                    {/* Icon */}
                    <div className="text-5xl mb-6 animate-pulse">{isGoalCelebration ? '⚽' : isMatchIntro ? '🎥' : isLineupFlyer ? '📋' : '🎬'}</div>

                    {/* Headline */}
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">{headline}</h2>

                    {/* Description */}
                    <p className="text-sm text-gray-500 mb-6 min-h-[20px]">{description}</p>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(displayProgress, 2)}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">{Math.round(displayProgress)}%</div>

                    {/* Close option for lineup/goal (runs in background) */}
                    {isVideoJob && videoJobId && (
                      <div className="mt-8">
                        <p className="text-xs text-gray-400 mb-2">
                          Je kunt dit venster sluiten — de video wordt op de achtergrond verwerkt.
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onClose}
                        >
                          Sluiten
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Video Queued — shown after video job is submitted */}
          {step === 'video_queued' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-full max-w-md text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">In de wachtrij!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Je {selectedType?.label || 'video'} wordt op de achtergrond gegenereerd.
                  <br />
                  Zodra het klaar is, verschijnt het in de <strong>Approvals</strong> pagina waar je het kunt goedkeuren.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <a
                    href="/approvals"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    📋 Ga naar Approvals
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    Sluiten
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center overflow-y-auto">
              <div className="text-4xl mb-2">✨</div>
              <h3 className="text-xl font-bold mb-1">
                {generatedVariants.length > 1 ? 'Select Your Favorite' : 'Content Ready!'}
              </h3>
              <p className="text-gray-600 mb-4 max-w-sm text-sm">
                {generatedVariants.length > 1
                  ? `${generatedVariants.length} variants generated. Select one to save.`
                  : `Your ${selectedType?.label || 'content'} has been generated.`
                }
              </p>

              {/* Multiple variants grid */}
              {generatedVariants.length > 1 ? (
                <div className="w-full max-w-2xl mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {generatedVariants.map((variant, index) => {
                      const isSelected = selectedVariantIndex === index;

                      // Calculate image source with secure mime type detection
                      let mimeType = variant.mime_type;
                      if (variant.image_base64) {
                         mimeType = getSecureMimeType(variant.image_base64, variant.mime_type);
                      }

                      const imageSrc = variant.image_base64
                        ? `data:${mimeType};base64,${variant.image_base64}`
                        : variant.presigned_url;

                      return (
                        <div
                          key={variant.variant_index}
                          onClick={() => setSelectedVariantIndex(index)}
                          className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {mimeType?.startsWith('video/') ? (
                            <video
                              src={variant.presigned_url || ''}
                              className="w-full h-32 object-contain bg-gray-50"
                              muted
                            />
                          ) : imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={`Variant ${index + 1}`}
                              className="w-full h-32 object-contain bg-gray-50"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                              No preview
                            </div>
                          )}
                          <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 text-blue-500">
                              ✓
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2">
                            {variant.storage_info ? `${(variant.storage_info.file_size_bytes / 1024).toFixed(0)} KB` : 'Preview'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Single variant display — tile-based card (like member asset tiles)
                <>
                  {generatedVariants[0]?.mime_type?.startsWith('video/') ? (
                    <div
                      style={{
                        width: '280px',
                        maxWidth: '92vw',
                        marginBottom: '16px',
                        alignSelf: 'center',
                      }}
                    >
                      {/* Tile card */}
                      <div
                        style={{
                          border: saveSuccess ? '2px solid #22c55e' : '2px solid #e5e7eb',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#000',
                          cursor: !saveSuccess ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        onClick={() => {
                          if (!saveSuccess && !savingAsset) {
                            handleSaveAsAsset();
                          }
                        }}
                        title={!saveSuccess ? 'Klik om op te slaan' : ''}
                      >
                        {/* Video preview */}
                        <div style={{ position: 'relative' }}>
                          <video
                            src={generatedVariants[0].presigned_url || ''}
                            controls
                            autoPlay
                            playsInline
                            style={{
                              width: '100%',
                              height: '160px',
                              maxHeight: '160px',
                              objectFit: 'contain',
                              display: 'block',
                              background: '#000',
                            }}
                          >
                            Your browser does not support the video tag.
                          </video>
                          {/* Badge: saved or click to save */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: saveSuccess ? '#22c55e' : '#3b82f6',
                              color: 'white',
                            }}
                          >
                            {savingAsset ? '⏳ Opslaan...' : saveSuccess ? '✅ Opgeslagen' : '💾 Klik om op te slaan'}
                          </div>
                          {/* File size badge */}
                          {generatedVariants[0].storage_info && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 8,
                                left: 8,
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                background: 'rgba(0,0,0,0.6)',
                                color: 'white',
                              }}
                            >
                              {((generatedVariants[0].storage_info.file_size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                            </div>
                          )}
                        </div>

                        {/* Tile footer */}
                        <div style={{ padding: '12px 16px', background: 'var(--app-surface, #111)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--app-text, white)', marginBottom: '6px' }}>
                            🎬 Lineup Video
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                            {matchData?.title || 'Match'} — {new Date().toLocaleDateString('nl-NL')}
                          </div>

                          {/* Action buttons (shown after save) */}
                          {saveSuccess ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleGenerateInternal(); }}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #3b82f6',
                                  background: 'transparent',
                                  color: '#3b82f6',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                🔄 Opnieuw
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = generatedVariants[0]?.presigned_url;
                                  if (url) window.open(url, '_blank');
                                }}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #6b7280',
                                  background: 'transparent',
                                  color: '#6b7280',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                ⬇️ Download
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Weet je zeker dat je deze lineup video wilt verwijderen?')) {
                                    // Reset state — effectively deletes from modal context
                                    setGeneratedVariants([]);
                                    setSaveSuccess(false);
                                    setStep('confirm');
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #ef4444',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!savingAsset && !saveSuccess) handleSaveAsAsset();
                                }}
                                disabled={savingAsset || saveSuccess}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #22c55e',
                                  background: 'transparent',
                                  color: '#22c55e',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: savingAsset || saveSuccess ? 'not-allowed' : 'pointer',
                                  opacity: savingAsset || saveSuccess ? 0.6 : 1,
                                }}
                              >
                                {savingAsset ? '⏳ Opslaan...' : '✅ Accepteren & Opslaan'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = generatedVariants[0]?.presigned_url;
                                  if (url) window.open(url, '_blank');
                                }}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #6b7280',
                                  background: 'transparent',
                                  color: '#6b7280',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                🔍 Groot bekijken
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : generatedOutput?.image_base64 ? (
                    <div style={{ width: '220px', maxWidth: '92vw', marginBottom: '16px', alignSelf: 'center' }}>
                      <div style={{
                        border: saveSuccess ? '2px solid #22c55e' : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#f9fafb',
                        cursor: !saveSuccess ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
                      }}
                        onClick={() => { if (!saveSuccess && !savingAsset) handleSaveAsAsset(); }}
                        title={!saveSuccess ? 'Klik om op te slaan' : ''}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={`data:${getSecureMimeType(generatedOutput.image_base64, generatedOutput.storage_info?.mime_type || 'image/png')};base64,${generatedOutput.image_base64}`}
                            alt="Generated content"
                            style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', top: 8, right: 8,
                            padding: '4px 10px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 600,
                            background: saveSuccess ? '#22c55e' : '#3b82f6', color: 'white',
                          }}>
                            {savingAsset ? '⏳ Opslaan...' : saveSuccess ? '✅ Opgeslagen' : '💾 Klik om op te slaan'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (generatedOutput?.presigned_url || generatedVariants[0]?.presigned_url) ? (
                    <div style={{ width: '220px', maxWidth: '92vw', marginBottom: '16px', alignSelf: 'center' }}>
                      <div style={{
                        border: saveSuccess ? '2px solid #22c55e' : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#f9fafb',
                        cursor: !saveSuccess ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
                      }}
                        onClick={() => { if (!saveSuccess && !savingAsset) handleSaveAsAsset(); }}
                        title={!saveSuccess ? 'Klik om op te slaan' : ''}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={generatedOutput?.presigned_url || generatedVariants[0]?.presigned_url || ''}
                            alt="Generated content"
                            style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', top: 8, right: 8,
                            padding: '4px 10px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 600,
                            background: saveSuccess ? '#22c55e' : '#3b82f6', color: 'white',
                          }}>
                            {savingAsset ? '⏳ Opslaan...' : saveSuccess ? '✅ Opgeslagen' : '💾 Klik om op te slaan'}
                          </div>
                        </div>
                        <div style={{ padding: '10px 14px', background: 'var(--app-surface, #fff)', borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--app-text, #333)', marginBottom: '4px' }}>
                            📣 {selectedType?.label || 'Content'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {matchData?.title || 'Match'} — {new Date().toLocaleDateString('nl-NL')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video w-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border flex items-center justify-center text-gray-400 mb-4">
                      [No preview available]
                    </div>
                  )}
                </>
              )}

              {/* Save success message */}
              {saveSuccess && (
                <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm border border-green-200 max-w-md mb-4">
                  ✅ <strong>Saved!</strong> The selected variant has been saved as a brand asset.
                </div>
              )}

              {/* Selected variant info */}
              {generatedVariants[selectedVariantIndex]?.storage_info && (
                <details className="p-3 bg-gray-50 rounded-lg text-sm border max-w-md mb-4 text-left">
                  <summary className="cursor-pointer font-medium">📦 Storage Info (Variant {selectedVariantIndex + 1})</summary>
                  <div className="mt-2 text-xs space-y-1">
                    <div><strong>Backend:</strong> {generatedVariants[selectedVariantIndex].storage_info?.storage_backend}</div>
                    <div><strong>Path:</strong> {generatedVariants[selectedVariantIndex].storage_info?.storage_path}</div>
                    <div><strong>Size:</strong> {((generatedVariants[selectedVariantIndex].storage_info?.file_size_bytes || 0) / 1024).toFixed(1)} KB</div>
                    {generatedVariants[selectedVariantIndex].storage_info?.brand_asset_id && (
                      <div className="text-green-600"><strong>BrandAsset ID:</strong> {generatedVariants[selectedVariantIndex].storage_info?.brand_asset_id}</div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-2xl font-bold mb-2 text-red-600">Generation Failed</h3>
              <Alert variant="error" className="max-w-md mb-6">
                {generationError || 'An unknown error occurred'}
              </Alert>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep('confirm')}>
                  ← Try Again
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex justify-between">
          <div>
            {(step === 'template' || step === 'members' || step === 'lineup_squad' || step === 'confirm') && (
              <Button variant="ghost" onClick={handleBack}>← Back</Button>
            )}
          </div>
          <div className="flex gap-3">
            {step !== 'generating' && step !== 'success' && step !== 'error' && (
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            )}
            {step === 'members' && isLineupFlow && (
              <Button onClick={() => setStep('lineup_squad')}>
                Opstelling kiezen →
              </Button>
            )}
            {step === 'members' && !isLineupFlow && (
              <Button disabled={!memberSelectionValid} onClick={() => setStep('confirm')}>
                Continue →
              </Button>
            )}
            {step === 'lineup_squad' && (
              <Button disabled={!memberSelectionValid} onClick={() => {
                // Compact sparse arrays before moving to confirm/generate
                setSelectedMembers(prev => ({
                  ...prev,
                  goalkeeper: prev.goalkeeper.filter(Boolean),
                  player: prev.player.filter(Boolean),
                }));
                setStep('confirm');
              }}>
                Continue →
              </Button>
            )}
            {step === 'confirm' && (
              <Button
                onClick={handleGenerate}
                disabled={selectedType?.subtype === 'goal' && !goalScorerId}
              >
                🚀 Generate Content
              </Button>
            )}
            {step === 'success' && (
              <>
                {generatedVariants.length === 1 && generatedVariants[0]?.mime_type?.startsWith('video/') ? (
                  <>
                    <Button variant="ghost" onClick={onClose}>Sluiten</Button>
                    <Button
                      variant="secondary"
                      onClick={handleSaveAsAsset}
                      disabled={savingAsset || saveSuccess}
                    >
                      {savingAsset ? '⏳ Opslaan...' : saveSuccess ? '✅ Opgeslagen' : '✅ Accepteren & Opslaan'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        // Regenerate with same settings
                        handleGenerateInternal();
                      }}
                    >
                      🔄 Regenerate
                    </Button>
                    {/* Download selected variant */}
                    {generatedVariants[selectedVariantIndex] && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const variant = generatedVariants[selectedVariantIndex];
                          if (variant.image_base64) {
                            const link = document.createElement('a');
                            const mimeType = getSecureMimeType(variant.image_base64, variant.mime_type);
                            link.href = `data:${mimeType};base64,${variant.image_base64}`;

                            // Ensure filename extension matches actual mime type
                            let filename = variant.filename || `generated-variant-${selectedVariantIndex + 1}`;
                            if (mimeType === 'image/jpeg' && (filename.endsWith('.png') || !filename.includes('.'))) {
                                filename = filename.replace(/\.png$/i, '') + '.jpg';
                            }

                            link.download = filename;
                            link.click();
                          } else if (variant.presigned_url) {
                            window.open(variant.presigned_url, '_blank');
                          }
                        }}
                      >
                        ⬇️ Download
                      </Button>
                    )}
                    {/* Save as BrandAsset button */}
                    <Button
                      onClick={handleSaveAsAsset}
                      disabled={savingAsset || saveSuccess}
                    >
                      {savingAsset ? '⏳ Saving...' : saveSuccess ? '✅ Saved' : '💾 Save as Asset'}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
