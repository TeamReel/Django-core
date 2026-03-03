import type { BrandAsset, HierarchyLevel } from '../../hooks/useBrandAssets';
import { getContentType } from '../../hooks/useBrandAssets';

// ============================================================================
// Types
// ============================================================================

export type HierarchyTab = 'organisation' | 'club' | 'team' | 'member' | 'files';

export interface OrganisationOption {
  id: string;
  name: string;
  slug: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  slug: string;
  organisation?: string | { id: string };
  parent_id?: number | null;
  parent_name?: string | null;
}

export interface MemberMediaItem {
  id: string;
  name: string;
  url: string;
  asset_type: string;
  member_id: string;
  member_name: string;
  project_id: string;
  project_name: string;
  parent_project_id: string | null;
  kit_type?: string;
  created_at?: string;
}

export type PreviewItem = {
  url: string | null;
  title: string;
  subtitle?: string;
  isVideo: boolean;
  linkHref?: string | null;
};

// ============================================================================
// Constants
// ============================================================================

export const KIT_TYPES = [
  { key: 'all', label: 'Alle Tenues' },
  { key: 'home', label: 'Thuis' },
  { key: 'away', label: 'Uit' },
  { key: 'third', label: 'Derde' },
  { key: 'goalkeeper', label: 'Keeper' },
  { key: 'coach', label: 'Coach' },
  { key: 'training', label: 'Training' },
  { key: 'legacy', label: 'Legacy' },
];

export const SUB_TABS: Record<HierarchyTab, { key: string; label: string }[]> = {
  organisation: [
    { key: 'all', label: 'Alles' },
    { key: 'logo', label: 'Logo' },
    { key: 'watermark', label: 'Watermark' },
    { key: 'favicon', label: 'Favicon' },
    { key: 'font', label: 'Font' },
    { key: 'location', label: 'Locatie' },
  ],
  club: [
    { key: 'all', label: 'Alles' },
    { key: 'logo', label: 'Logo' },
    { key: 'kit', label: 'Tenue' },
    { key: 'sponsor', label: 'Sponsor' },
    { key: 'location', label: 'Locatie' },
  ],
  team: [
    { key: 'all', label: 'Alles' },
    { key: 'logo', label: 'Logo' },
    { key: 'kit', label: 'Tenue' },
    { key: 'sponsor', label: 'Sponsor' },
  ],
  member: [
    { key: 'all', label: 'Alles' },
    { key: 'member_profile', label: 'Foto' },
    { key: 'member_fullbody', label: 'Full Body' },
    { key: 'member_closeup', label: 'Close-up' },
    { key: 'member_intro', label: 'Intro' },
    { key: 'member_celebration', label: 'Celebration' },
  ],
  files: [
    { key: 'all', label: 'Alles' },
    { key: 'image', label: 'Afbeeldingen' },
    { key: 'video', label: "Video's" },
    { key: 'document', label: 'Documenten' },
    { key: 'font', label: 'Fonts' },
  ],
};

// ============================================================================
// Helpers
// ============================================================================

/** Human-friendly label for asset_type (replacing code-style names) */
export function friendlyAssetLabel(asset: BrandAsset): string {
  const t = asset.asset_type;
  if (t.startsWith('member_closeup')) return 'Close-up';
  if (t.includes('in_tenue')) return 'In Tenue';
  if (t.includes('lineup')) return 'Lineup';
  if (t.includes('member_intro')) return 'Short Intro';
  if (t.includes('member_goal_celebration') || t.includes('celebration')) return 'Celebration';
  if (t.includes('profile') || t === 'headshot') return 'Profiel Foto';
  if (t.includes('kit_home')) return t.includes('combined') ? 'Thuistenue (Compleet)' : t.includes('upload') ? 'Thuistenue (Upload)' : 'Thuistenue';
  if (t.includes('kit_away')) return t.includes('combined') ? 'Uittenue (Compleet)' : t.includes('upload') ? 'Uittenue (Upload)' : 'Uittenue';
  if (t.includes('kit_third')) return t.includes('combined') ? 'Derde Tenue (Compleet)' : t.includes('upload') ? 'Derde Tenue (Upload)' : 'Derde Tenue';
  if (t.includes('kit_goalkeeper')) return t.includes('combined') ? 'Keeper Tenue (Compleet)' : t.includes('upload') ? 'Keeper Tenue (Upload)' : 'Keeper Tenue';
  if (t.includes('kit_coach')) return t.includes('combined') ? 'Coach Tenue (Compleet)' : t.includes('upload') ? 'Coach Tenue (Upload)' : 'Coach Tenue';
  if (t.includes('kit_assistant')) return t.includes('combined') ? 'Assistent Tenue (Compleet)' : t.includes('upload') ? 'Assistent Tenue (Upload)' : 'Assistent Tenue';
  if (t.includes('kit_training')) return t.includes('combined') ? 'Training Tenue (Compleet)' : t.includes('upload') ? 'Training Tenue (Upload)' : 'Training Tenue';
  if (t.includes('kit_legacy')) return t.includes('combined') ? 'Legacy Tenue (Compleet)' : t.includes('upload') ? 'Legacy Tenue (Upload)' : 'Legacy Tenue';
  if (t === 'logo_upload') return 'Logo (Upload)';
  if (t === 'logo') return 'Logo';
  if (t === 'watermark') return 'Watermerk';
  if (t === 'favicon') return 'Favicon';
  if (t === 'sponsor_logo_upload') return 'Sponsor Logo (Upload)';
  if (t === 'sponsor_logo') return 'Sponsor Logo';
  if (t === 'location_photo') return 'Locatie Foto';
  if (t === 'font_file') return 'Font';
  return asset.asset_type_label || t;
}

/** Get member sub-content type for filtering */
export function getMemberContentType(assetType: string): string {
  if (assetType.includes('closeup')) return 'closeup';
  if (assetType.includes('in_tenue') && !assetType.includes('intro') && !assetType.includes('celebration')) return 'in_tenue';
  if (assetType.includes('intro')) return 'intro';
  if (assetType.includes('celebration') || assetType.includes('goal_celebration')) return 'celebration';
  if (assetType.includes('profile') || assetType === 'headshot') return 'profile';
  return 'other';
}

/** Badge color per hierarchy level */
export function levelColor(level: HierarchyLevel): string {
  switch (level) {
    case 'club': return 'var(--color-blue-600)';
    case 'team': return '#7c3aed';
    case 'member': return '#059669';
    default: return 'var(--app-muted-text)';
  }
}

/** Badge label per hierarchy level */
export function levelLabel(level: HierarchyLevel): string {
  switch (level) {
    case 'club': return 'Club';
    case 'team': return 'Team';
    case 'member': return 'Speler';
    default: return 'Organisatie';
  }
}

export function normalizeKitType(raw?: string | null): string {
  const k = String(raw || '').trim().toLowerCase();
  if (!k) return '';
  if (k === 'gk') return 'goalkeeper';
  if (k === 'keeper') return 'goalkeeper';
  return k;
}

export function inferKitTypeFromBrandAssetType(assetType: string): string {
  const t = String(assetType || '').toLowerCase();
  if (t.includes('kit_home')) return 'home';
  if (t.includes('kit_away')) return 'away';
  if (t.includes('kit_third')) return 'third';
  if (t.includes('kit_goalkeeper')) return 'goalkeeper';
  if (t.includes('kit_coach')) return 'coach';
  if (t.includes('kit_training')) return 'training';
  if (t.includes('kit_assistant')) return 'assistant';
  if (t.includes('kit_legacy')) return 'legacy';
  return '';
}

export function getBrandAssetTags(asset: BrandAsset): string[] {
  const tags: string[] = [];
  const type = String(asset.asset_type || '').toLowerCase();

  if (type.startsWith('kit_')) {
    tags.push('tenue');
    const kitType = inferKitTypeFromBrandAssetType(type);
    if (kitType) tags.push(kitType);
  }

  if (type.startsWith('member_fullbody')) tags.push('full_body');
  if (type.startsWith('member_closeup')) tags.push('closeup');
  if (type.startsWith('member_intro')) tags.push('intro');
  if (type.includes('celebration')) tags.push('celebration');

  return Array.from(new Set(tags));
}

export function getMemberMediaTags(item: {
  asset_type: string;
  kit_type?: string;
}): string[] {
  const tags: string[] = [];
  const t = String(item.asset_type || '').toLowerCase();

  if (t.includes('fullbody')) tags.push('full_body');
  if (t.includes('closeup')) tags.push('closeup');
  if (t.includes('profile')) tags.push('profile');
  if (t.includes('intro')) tags.push('intro');
  if (t.includes('celebration')) tags.push('celebration');

  const k = normalizeKitType(item.kit_type);
  if (k) tags.push(k);

  return Array.from(new Set(tags));
}

export function buildBrandAssetPageHref(asset: BrandAsset, orgSlugOrId?: string): string | null {
  const orgKey = String(orgSlugOrId || '').trim();
  if (!orgKey) return null;

  const projectType = String((asset as any)?.project_type || asset.project_type || '').trim().toLowerCase();
  const projectId = String((asset as any)?.project_id || '').trim();
  const parentProjectId = String((asset as any)?.parent_project_id || '').trim();

  if (projectType === 'team') {
    if (!parentProjectId || !projectId) return null;
    return `/${encodeURIComponent(orgKey)}/${encodeURIComponent(parentProjectId)}/${encodeURIComponent(projectId)}?tab=assets`;
  }

  if (projectType === 'club') {
    if (!projectId) return null;
    return `/${encodeURIComponent(orgKey)}/${encodeURIComponent(projectId)}?tab=assets`;
  }

  return `/${encodeURIComponent(orgKey)}?tab=identity`;
}

export function buildMemberAssetPageHref(item: { member_id: string }, orgSlugOrId?: string): string | null {
  const orgKey = String(orgSlugOrId || '').trim();
  const memberKey = String(item.member_id || '').trim();
  if (!orgKey || !memberKey) return null;
  return `/organisations/${encodeURIComponent(orgKey)}/members/${encodeURIComponent(memberKey)}`;
}
