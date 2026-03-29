/**
 * Brand profile types, constants, and asset URL utilities.
 *
 * Shared across useBrandProfile hook and any consumer that needs brand types.
 */

import { api } from '@/api';

// ============================================================================
// Types
// ============================================================================

export interface BrandAsset {
  id: string;
  profile: string;
  file: string;
  asset_type: string;
  label: string;
  alt_text: string;
  is_active: boolean;
  file_details: {
    id: string;
    name: string;
    size: number;
    content_type: string;
  } | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DesignToken {
  id: string;
  profile: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandProfile {
  id: string;
  organisation: string | null;
  project: string | number | null;
  name: string;
  is_active: boolean;
  token_count: number;
  asset_count: number;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
  tokens?: DesignToken[];
  assets?: BrandAsset[];
}

// ============================================================================
// Asset type categories
// ============================================================================

/** Raw uploads by user */
export const UPLOAD_ASSET_TYPES = [
  'logo_upload',
  'sponsor_logo_upload',
  'kit_home_upload',
  'kit_away_upload',
  'kit_third_upload',
  'kit_goalkeeper_upload',
  'kit_coach_upload',
  'kit_assistant_upload',
  'kit_training_upload',
  'kit_legacy_upload',
] as const;

/** AI-processed standardized assets */
export const PROCESSED_ASSET_TYPES = [
  'logo',
  'sponsor_logo',
  'kit_home',
  'kit_away',
  'kit_third',
  'kit_goalkeeper',
  'kit_coach',
  'kit_assistant',
  'kit_training',
  'kit_legacy',
] as const;

/** AI-combined final outputs (kit + logo + sponsor) */
export const COMBINED_ASSET_TYPES = [
  'kit_home_combined',
  'kit_away_combined',
  'kit_third_combined',
  'kit_goalkeeper_combined',
  'kit_coach_combined',
  'kit_assistant_combined',
  'kit_training_combined',
  'kit_legacy_combined',
] as const;

/** Kit role groups for display */
export const KIT_ROLES = [
  { id: 'home', label: 'Thuis', icon: 'home' },
  { id: 'away', label: 'Uit', icon: 'plane' },
  { id: 'third', label: 'Derde', icon: 'hash' },
  { id: 'goalkeeper', label: 'Keeper', icon: 'shield' },
  { id: 'coach', label: 'Trainer', icon: 'clipboard-list' },
  { id: 'assistant', label: 'Assistent', icon: 'handshake' },
  { id: 'training', label: 'Training', icon: 'activity' },
  { id: 'legacy', label: 'Legacy', icon: 'history' },
] as const;

/** Asset display labels */
export const ASSET_TYPE_LABELS: Record<string, string> = {
  logo_upload: 'Logo (upload)',
  logo: 'Logo',
  sponsor_logo_upload: 'Sponsor (upload)',
  sponsor_logo: 'Sponsor',
  kit_home_upload: 'Thuistenue (upload)',
  kit_home: 'Thuistenue',
  kit_home_combined: 'Thuistenue (compleet)',
  kit_away_upload: 'Uittenue (upload)',
  kit_away: 'Uittenue',
  kit_away_combined: 'Uittenue (compleet)',
  kit_third_upload: 'Derde tenue (upload)',
  kit_third: 'Derde tenue',
  kit_third_combined: 'Derde tenue (compleet)',
  kit_goalkeeper_upload: 'Keeperstenue (upload)',
  kit_goalkeeper: 'Keeperstenue',
  kit_goalkeeper_combined: 'Keeperstenue (compleet)',
  kit_coach_upload: 'Trainerstenue (upload)',
  kit_coach: 'Trainerstenue',
  kit_coach_combined: 'Trainerstenue (compleet)',
  kit_assistant_upload: 'Assistent tenue (upload)',
  kit_assistant: 'Assistent tenue',
  kit_assistant_combined: 'Assistent tenue (compleet)',
  kit_training_upload: 'Trainingstenue (upload)',
  kit_training: 'Trainingstenue',
  kit_training_combined: 'Trainingstenue (compleet)',
  kit_legacy_upload: 'Legacy tenue (upload)',
  kit_legacy: 'Legacy tenue',
  kit_legacy_combined: 'Legacy tenue (compleet)',
  watermark: 'Watermerk',
  favicon: 'Favicon',
  font_file: 'Lettertype',
  location_photo: 'Locatie foto',
  stadium_background: 'Stadion achtergrond',
  'club_background': 'Achtergrond',
  other: 'Overig',
};

/** Multi-instance asset types (allow multiple per profile) */
export const MULTI_INSTANCE_TYPES = new Set(['club_background', 'club_background_upload']);

// ============================================================================
// S3 URL helpers
// ============================================================================

const S3_BUCKET = 'teamreel-assets-demo';
const S3_REGION = 'eu-north-1';

/** Base URL prefix for S3 assets — use `getAssetUrl()` to build full URLs. */
export const S3_ASSET_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;

export function getAssetUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('http')) return storagePath;
  // Encode path segments to handle spaces/special chars in S3 keys
  const encodedPath = storagePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodedPath}`;
}

/**
 * Batch-resolve raw S3 storage paths to presigned URLs via the backend.
 * Returns a map of { storagePath → presignedUrl }.
 * Skips paths that are already full URLs.
 */
export async function resolvePresignedUrls(
  paths: string[],
  orgId?: string,
): Promise<Record<string, string>> {
  // Filter to only raw S3 keys (not already full URLs)
  const rawPaths = paths.filter((p) => p && !p.startsWith('http'));
  if (rawPaths.length === 0) return {};

  try {
    const headers: Record<string, string> = {};
    if (orgId) headers['X-Organization-ID'] = orgId;
    const data = await api.post<{ urls: Record<string, string> }>('/files/presigned-urls/', { paths: rawPaths }, { headers });
    return data.urls || {};
  } catch {
    return {};
  }
}
