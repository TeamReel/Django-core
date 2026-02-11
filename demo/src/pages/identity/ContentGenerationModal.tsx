import React, { useState, useEffect, useMemo } from 'react';
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
      { id: 'lineup', label: 'Lineup Announcement', icon: '📋', subtype: 'lineup' },
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
      { id: 'transformation', label: 'Then vs Now', icon: '🔄', subtype: 'transformation' },
      { id: 'season_recap', label: 'Season Recap', icon: '📅', subtype: 'season_recap' },
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
  /** Asset type for BrandAsset linking (e.g. logo_light, kit_home) */
  assetType?: string | null;
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

  // Determine the role variant key
  let roleKey = 'home'; // Default for player
  if (role === 'goalkeeper') roleKey = 'goalkeeper';
  else if (role === 'coach' || role === 'assistant') roleKey = 'coach';

  // 1. Check the new 'images' structure (images.{type}.{variant})
  // e.g. images.fullbody.goalkeeper or images.closeup.home
  if (images[imageStructureKey] && images[imageStructureKey][roleKey]) {
    return true;
  }

  // 2. Check videos structure for role-specific variants
  // e.g. videos.intro.goalkeeper_thumbs_up or videos.intro.home_hand_up
  if (videos[mediaKey]) {
    const variants = videos[mediaKey];
    // Check if any variant key contains/starts with the role key
    const hasRoleVariant = Object.keys(variants).some(k => {
      const normalizedKey = k.toLowerCase();
      return (normalizedKey.includes(roleKey) || normalizedKey.startsWith(roleKey)) && variants[k];
    });
    if (hasRoleVariant) return true;

    // Also accept any video variant if no role-specific one found (fallback)
    const hasAnyVariant = Object.values(variants).some((v: any) => v && typeof v === 'string' && v.trim());
    if (hasAnyVariant) return true;
  }

  // 3. Check the 'media' structure (generic, not role-specific)
  // This is the older format: media.{slot}.url
  if (media[mediaKey]?.url) return true;

  // 4. Check legacy format
  if (mediaKey === 'profile' && legacyKit?.profile_photo_url) return true;
  if (mediaKey === 'kit' && legacyKit?.full_body_url) return true;
  if (mediaKey === 'celebration' && legacyKit?.goal_celebration_url) return true;
  if (mediaKey === 'legacy_photo' && tr?.old?.profile_photo_url) return true;

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
function groupParticipationsByRole(participations: Participation[]): Record<string, Participation[]> {
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
}: ContentGenerationModalProps) {
  const [step, setStep] = useState<'type' | 'template' | 'members' | 'confirm' | 'generating' | 'success' | 'error'>('type');
  const [selectedType, setSelectedType] = useState<{ type: string; subtype: string; label: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [progress, setProgress] = useState(0);
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
        // Fetch season-specific project members (filtered by period_id)
        let url = `${getApiBaseUrl()}/api/v1/projects/${projectId}/members/`;
        if (seasonId) {
          url += `?period_id=${seasonId}`;
        }

        console.log('📡 Fetching from URL:', url);

        const response = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ API Response:', data);
          // Handle paginated response structure from /api/v1/projects/{id}/members/
          // Response format: { status: 'success', data: { data: [...] }, meta: {...} }
          let members = [];
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

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
      setTemplates([]);
      setError(null);
      setGenerationError(null);
      setGeneratedOutput(null);
      // Reset variant selection
      setGeneratedVariants([]);
      setSelectedVariantIndex(0);
      setSavingAsset(false);
      setSaveSuccess(false);

      // If template is provided, skip to members step
      if (initialTemplate) {
        setSelectedTemplate(initialTemplate);
        setSelectedType({ type: initialTemplate.template_type, subtype: initialTemplate.template_subtype || '', label: contentTypeLabel || initialTemplate.name });

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
      } else {
        setStep('type');
        setSelectedType(null);
        setSelectedTemplate(null);
      }
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
        if (selectedMembers[role].length !== req.count) {
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

  // Helper to get member's asset URL
  const getMemberAssetUrl = (memberId: string, assetType: string): string | null => {
    // Find the member in seasonSquad
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant']) {
      const member = seasonSquad[role]?.find(p => p.id === memberId);
      if (member) {
        const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;
        const meta = member.metadata || {};
        const tr = (meta as any)?.teamreel_assets || {};
        const media = tr?.media || {};
        const videos = tr?.videos || {};
        const legacyKit = tr?.kit || {};

        // Check new format
        if (media[mediaKey]?.url) return media[mediaKey].url;

        // Check videos format (intro, closeup, celebration have variants)
        if (['intro', 'closeup', 'celebration'].includes(mediaKey) && videos[mediaKey]) {
          // Return first available variant
          const variants = videos[mediaKey] || {};
          for (const [key, val] of Object.entries(variants)) {
            if (val && typeof val === 'string' && val.trim()) {
              return val;
            }
          }
        }

        // Check legacy format
        if (mediaKey === 'profile' && legacyKit?.profile_photo_url) return legacyKit.profile_photo_url;
        if (mediaKey === 'kit' && legacyKit?.full_body_url) return legacyKit.full_body_url;
        if (mediaKey === 'celebration' && legacyKit?.goal_celebration_url) return legacyKit.goal_celebration_url;
      }
    }
    return null;
  };

  // Helper to get member name
  const getMemberName = (memberId: string): string => {
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

  // Generate lineup video using video module
  const handleGenerateLineupVideo = async () => {
    setProgress(10);

    try {
      // Build segments array for each selected member
      // Order: goalkeeper first, then players (sorted by selection order)
      const segments: Array<{type: string; url: string; duration?: number; label?: string}> = [];

      // Get required asset types from template
      const reqs = selectedTemplate?.input_requirements?.members;
      const goalkeeperAssets = reqs?.goalkeeper?.asset_types || [];
      const playerAssets = reqs?.player?.asset_types || [];

      // Add goalkeeper segments
      for (const memberId of selectedMembers.goalkeeper) {
        const memberName = getMemberName(memberId);

        // Add each required asset as a segment
        // Order: In Tenue (image, 3s) → Short Intro (video) → Close-up (video)
        for (const assetType of goalkeeperAssets) {
          const url = getMemberAssetUrl(memberId, assetType);
          if (!url) {
            console.warn(`Missing asset ${assetType} for goalkeeper ${memberName}`);
            continue;
          }

          // Determine if image or video based on asset type
          const isImage = ['profile_photo', 'in_tenue', 'legacy_photo', 'legacy', 'full_body'].includes(assetType);
          segments.push({
            type: isImage ? 'image' : 'video',
            url: url,
            duration: isImage ? 3.0 : undefined,
            label: memberName,
          });
        }
      }

      // Add player segments
      for (const memberId of selectedMembers.player) {
        const memberName = getMemberName(memberId);

        for (const assetType of playerAssets) {
          const url = getMemberAssetUrl(memberId, assetType);
          if (!url) {
            console.warn(`Missing asset ${assetType} for player ${memberName}`);
            continue;
          }

          const isImage = ['profile_photo', 'in_tenue', 'legacy_photo', 'legacy', 'full_body'].includes(assetType);
          segments.push({
            type: isImage ? 'image' : 'video',
            url: url,
            duration: isImage ? 3.0 : undefined,
            label: memberName,
          });
        }
      }

      // Add coach segments (if any)
      const coachAssets = reqs?.coach?.asset_types || [];
      for (const memberId of selectedMembers.coach) {
        const memberName = getMemberName(memberId);
        for (const assetType of coachAssets) {
          const url = getMemberAssetUrl(memberId, assetType);
          if (url) {
            const isImage = ['profile_photo', 'in_tenue', 'legacy_photo', 'legacy', 'full_body'].includes(assetType);
            segments.push({
              type: isImage ? 'image' : 'video',
              url: url,
              duration: isImage ? 3.0 : undefined,
              label: memberName,
            });
          }
        }
      }

      // Add assistant segments (if any)
      const assistantAssets = reqs?.assistant?.asset_types || [];
      for (const memberId of selectedMembers.assistant) {
        const memberName = getMemberName(memberId);
        for (const assetType of assistantAssets) {
          const url = getMemberAssetUrl(memberId, assetType);
          if (url) {
            const isImage = ['profile_photo', 'in_tenue', 'legacy_photo', 'legacy', 'full_body'].includes(assetType);
            segments.push({
              type: isImage ? 'image' : 'video',
              url: url,
              duration: isImage ? 3.0 : undefined,
              label: memberName,
            });
          }
        }
      }

      console.log('📹 Lineup video segments:', segments);

      if (segments.length === 0) {
        throw new Error('No valid segments found. Make sure selected members have the required assets.');
      }

      setProgress(20);

      // Create video job
      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          project_id: matchData?.project?.id,
          job_type: 'lineup',
          config: {
            segments: segments,
            output_resolution: '1080p',
            output_fps: 30,
            fade_duration: 0.5,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
      }

      const jobData = await response.json();
      const jobId = jobData.data?.id || jobData.id;
      console.log('🎬 Video job created:', jobId);

      setVideoJobId(jobId);
      setVideoJobStatus('queued');
      setProgress(30);

      // Poll for job completion
      let pollCount = 0;
      const maxPolls = 120; // 10 minutes max (5s intervals)

      const pollJob = async (): Promise<void> => {
        if (pollCount >= maxPolls) {
          throw new Error('Video processing timed out. Please try again.');
        }

        const statusRes = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/${jobId}/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!statusRes.ok) {
          throw new Error('Failed to check job status');
        }

        const statusData = await statusRes.json();
        const job = statusData.data || statusData;
        const status = job.status;
        const progressPercent = job.progress_percent || 0;

        setVideoJobStatus(status);
        setProgress(30 + (progressPercent * 0.6)); // Map 0-100% to 30-90%

        if (status === 'completed') {
          // Job finished - get output
          const outputUrl = job.output_file?.presigned_url || job.output_file?.url;
          if (outputUrl) {
            setGeneratedVariants([{
              variant_index: 0,
              image_base64: null,
              presigned_url: outputUrl,
              mime_type: 'video/mp4',
              filename: `lineup_${jobId}.mp4`,
              error: null,
              storage_info: job.output_file?.storage_info || null,
              metadata: { job_id: jobId, type: 'lineup_video' },
            }]);
            setProgress(100);
            setTimeout(() => setStep('success'), 300);
          } else {
            throw new Error('Video completed but no output file found');
          }
          return;
        }

        if (status === 'failed') {
          throw new Error(job.error_message || 'Video processing failed');
        }

        if (status === 'cancelled') {
          throw new Error('Video processing was cancelled');
        }

        // Still processing, poll again
        pollCount++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        return pollJob();
      };

      await pollJob();

    } catch (err) {
      console.error('❌ Lineup video generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setStep('error');
    }
  };

  if (!isOpen) return null;

  const handleSelectType = (type: string, subtype: string, label: string) => {
    setSelectedType({ type, subtype, label });
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

    // Simulate initial progress
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 10;
      if (p > 85) p = 85; // Cap at 85% while waiting for API
      setProgress(Math.min(p, 85));
    }, 500);

    try {
      const templateSubtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';

      // Check if this is a lineup video generation
      if (templateSubtype === 'lineup') {
        clearInterval(progressInterval);
        await handleGenerateLineupVideo();
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

      // Map template subtype to BrandAsset type
      if (templateSubtype.includes('logo')) {
        brandAssetType = 'logo_light'; // AI-processed logo
      } else if (templateSubtype.includes('sponsor')) {
        brandAssetType = 'sponsor_logo'; // AI-processed sponsor
      } else if (templateSubtype.includes('kit') || templateSubtype.includes('tenue')) {
        const kitType = (selectedTemplate as ContentTemplate & { params?: { kit_type?: string } })?.params?.kit_type || 'home';
        brandAssetType = `kit_${kitType}`; // e.g. kit_home, kit_away
      }

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
          image_base64: selectedVariant.image_base64,
          filename: selectedVariant.filename,
          mime_type: selectedVariant.mime_type || 'image/png',
          file_size_bytes: selectedVariant.storage_info?.file_size_bytes || 0,
          // Context
          organisation_id: organisationId,
          project_id: matchData?.project?.id,
          // Asset type for BrandAsset
          asset_type: brandAssetType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to save: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Saved as BrandAsset:', result);

      setSaveSuccess(true);

      // Update the variant's storage_info with the new IDs
      const updatedVariants = [...generatedVariants];
      if (result.data?.brand_asset_id || result.brand_asset_id) {
        updatedVariants[selectedVariantIndex] = {
          ...selectedVariant,
          storage_info: {
            ...selectedVariant.storage_info!,
            brand_asset_id: result.data?.brand_asset_id || result.brand_asset_id,
            file_asset_id: result.data?.file_asset_id || result.file_asset_id,
          },
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
    // If we started with a template, just close the modal on first back
    if (initialTemplate && (step === 'members' || step === 'confirm')) {
      onClose();
      return;
    }

    if (step === 'template') {
      setStep('type');
      setSelectedType(null);
      setTemplates([]);
    } else if (step === 'members') {
      setStep('template');
      setSelectedTemplate(null);
      setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
    } else if (step === 'confirm') {
      // Check if we need to go back to members or template
      const needsMembers = selectedTemplate?.input_requirements?.members &&
        Object.entries(selectedTemplate.input_requirements.members).some(([key, val]) =>
          key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
        );
      if (needsMembers) {
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
          maxWidth: '95%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold m-0">
              {step === 'type' && 'Create Content'}
              {step === 'template' && `Select ${selectedType?.label} Template`}
              {step === 'members' && `Create ${contentTypeLabel || selectedType?.label || 'Content'}`}
              {step === 'generating' && 'Generating...'}
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Progress indicator - only show for multi-step flow */}
        {!initialTemplate && (step === 'type' || step === 'template' || step === 'members') && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className={`px-3 py-1 rounded-full ${step === 'type' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
              1. Content Type
            </span>
            <span className="text-gray-300">→</span>
            <span className={`px-3 py-1 rounded-full ${step === 'template' ? 'bg-blue-100 text-blue-700 font-medium' : selectedType ? 'bg-gray-100 text-gray-500' : 'text-gray-300'}`}>
              2. Template
            </span>
            {totalRequiredMembers > 0 && (
              <>
                <span className="text-gray-300">→</span>
                <span className={`px-3 py-1 rounded-full ${step === 'members' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-300'}`}>
                  3. Members
                </span>
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
              <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4">
                <div className="text-3xl">📋</div>
                <div>
                  <div className="font-semibold">{selectedTemplate.name}</div>
                  <div className="text-sm text-gray-600">Select the required members for this template</div>
                </div>
              </div>

              {/* Member Selection - Compact Dropdown Layout */}
              {(['goalkeeper', 'player', 'coach', 'assistant'] as const).map(role => {
                const req = selectedTemplate.input_requirements?.members?.[role];
                if (!req || typeof req === 'boolean' || !req.count) return null;

                const available = seasonSquad[role] || [];
                const selected = selectedMembers[role];
                const assetTypes = req.asset_types || [];
                const assetLabels = assetTypes.map(t => ASSET_TYPE_LABELS[t] || t);

                return (
                  <div key={role} className="border border-gray-300 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3 pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-base">{renderRoleLabel(role)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          selected.length === req.count
                            ? 'bg-green-100 text-green-700 font-medium'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {selected.length} / {req.count}
                        </span>
                      </div>
                      {assetLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {assetLabels.map((label, idx) => (
                            <Badge key={idx} variant="info" size="sm">📸 {label}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {Array.from({ length: req.count }).map((_, idx) => {
                        const currentSelection = selected[idx];
                        const currentMember = available.find(p => p.id === currentSelection);

                        // Calculate position number based on role
                        let positionLabel = '';
                        if (role === 'goalkeeper') {
                          positionLabel = 'Goalkeeper #1';
                        } else if (role === 'player') {
                          // Players start at #2 (after goalkeeper #1)
                          positionLabel = `Player #${idx + 2}`;
                        } else if (role === 'coach') {
                          positionLabel = idx === 0 ? 'Coach' : `Coach ${idx + 1}`;
                        } else if (role === 'assistant') {
                          positionLabel = idx === 0 ? 'Assistant' : `Assistant ${idx + 1}`;
                        } else {
                          positionLabel = `${renderRoleLabel(role)} ${idx + 1}`;
                        }

                        // Split available members into eligible (have all required assets) and ineligible
                        const eligibleMembers = available.filter(p => memberHasRequiredAssets(p, assetTypes, role));
                        const ineligibleMembers = available.filter(p => !memberHasRequiredAssets(p, assetTypes, role));

                        return (
                          <div key={idx} className="grid grid-cols-[120px_1fr] gap-3 items-center">
                            <label className="text-sm text-gray-600 font-medium">
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

          {/* Confirm - Review before generation */}
          {step === 'confirm' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="text-6xl mb-6">🎬</div>
              <h3 className="text-2xl font-bold mb-2">Ready to Generate</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                You're about to generate a <strong>{selectedType?.label || selectedTemplate?.name}</strong> for this match.
              </p>

              {/* Template info */}
              {selectedTemplate && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 w-full max-w-md">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="info">{selectedTemplate.template_type}</Badge>
                    {selectedTemplate.style_variant && (
                      <Badge variant="default">{selectedTemplate.style_variant}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Template:</strong> {selectedTemplate.name}
                  </div>
                  {selectedTemplate.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {selectedTemplate.description}
                    </div>
                  )}
                  {selectedTemplate.credits_required && selectedTemplate.credits_required > 0 && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Cost:</strong> {selectedTemplate.credits_required} credits
                    </div>
                  )}
                </div>
              )}

              {/* Match info */}
              {matchData && (
                <div className="bg-blue-50 rounded-lg p-4 w-full max-w-md">
                  <div className="text-sm text-blue-800">
                    <strong>Match:</strong> {matchData.title || 'Match'}
                  </div>
                  {matchData.start_time && (
                    <div className="text-sm text-blue-600 mt-1">
                      {new Date(matchData.start_time).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <div className="w-full max-w-sm mb-6">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">{Math.round(progress)}%</div>
              </div>
              <div className="text-xl font-medium text-gray-700 animate-pulse">Generating Content...</div>
              <div className="text-sm text-gray-500 mt-2">Applying {matchData?.project?.name} branding</div>
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
                // Single variant display
                <>
                  {/* Check if it's a video (lineup) */}
                  {generatedVariants[0]?.mime_type?.startsWith('video/') ? (
                    <div className="mb-4">
                      <video
                        src={generatedVariants[0].presigned_url || ''}
                        controls
                        className="max-w-lg max-h-80 rounded-lg border shadow-lg"
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className="mt-2 text-sm text-gray-500">
                        🎬 Lineup video ready! Click play to preview.
                      </div>
                    </div>
                  ) : generatedOutput?.image_base64 ? (
                    <div className="mb-4">
                      <img
                        src={`data:${getSecureMimeType(generatedOutput.image_base64, generatedOutput.storage_info?.mime_type || 'image/png')};base64,${generatedOutput.image_base64}`}
                        alt="Generated content"
                        className="max-w-md max-h-64 rounded-lg border shadow-lg"
                      />
                    </div>
                  ) : generatedOutput?.presigned_url ? (
                    <div className="mb-4">
                      <img
                        src={generatedOutput.presigned_url}
                        alt="Generated content"
                        className="max-w-md max-h-64 rounded-lg border shadow-lg"
                      />
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
            {(step === 'template' || step === 'members' || step === 'confirm') && (
              <Button variant="ghost" onClick={handleBack}>← Back</Button>
            )}
          </div>
          <div className="flex gap-3">
            {step !== 'generating' && step !== 'success' && step !== 'error' && (
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            )}
            {step === 'members' && (
              <Button disabled={!memberSelectionValid} onClick={() => setStep('confirm')}>
                Continue →
              </Button>
            )}
            {step === 'confirm' && (
              <Button onClick={handleGenerate}>
                🚀 Generate Content
              </Button>
            )}
            {step === 'success' && (
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
          </div>
        </div>
      </div>
    </div>
  );
}
