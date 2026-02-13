/**
 * useBrandProfile Hook
 *
 * Centralized hook for loading brand profiles and assets.
 * Replaces scattered fetch calls across ClubKitsTab, BrandIdentityPage, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

// ============================================================================
// Types
// ============================================================================

export interface BrandAsset {
  id: string;
  profile: string;
  file: string;
  asset_type: string;
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

// ── Asset type categories ──

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
] as const;

/** AI-processed standardized assets */
export const PROCESSED_ASSET_TYPES = [
  'logo_light',
  'logo_dark',
  'sponsor_logo',
  'kit_home',
  'kit_away',
  'kit_third',
  'kit_goalkeeper',
  'kit_coach',
  'kit_assistant',
  'kit_training',
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
] as const;

/** Kit role groups for display */
export const KIT_ROLES = [
  { id: 'home', label: 'Thuis', icon: '🏠' },
  { id: 'away', label: 'Uit', icon: '✈️' },
  { id: 'third', label: 'Derde', icon: '3️⃣' },
  { id: 'goalkeeper', label: 'Keeper', icon: '🧤' },
  { id: 'coach', label: 'Trainer', icon: '📋' },
  { id: 'assistant', label: 'Assistent', icon: '🤝' },
  { id: 'training', label: 'Training', icon: '🏋️' },
] as const;

/** Asset display labels */
export const ASSET_TYPE_LABELS: Record<string, string> = {
  logo_upload: 'Logo (upload)',
  logo_light: 'Logo',
  logo_dark: 'Logo (dark)',
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
  watermark: 'Watermerk',
  favicon: 'Favicon',
  font_file: 'Lettertype',
  location_photo: 'Locatie foto',
  stadium_background: 'Stadion achtergrond',
  other: 'Overig',
};

// ============================================================================
// S3 URL helper
// ============================================================================

const S3_BUCKET = 'teamreel-assets-demo';
const S3_REGION = 'eu-north-1';

export function getAssetUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('http')) return storagePath;
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${storagePath}`;
}

// ============================================================================
// Hook
// ============================================================================

interface UseBrandProfileOptions {
  /** Organisation UUID or slug */
  organisationId?: string | null;
  /** Project ID (number or UUID) */
  projectId?: string | number | null;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

interface UseBrandProfileReturn {
  profile: BrandProfile | null;
  assets: BrandAsset[];
  loading: boolean;
  error: string | null;
  /** Reload profile and assets */
  refresh: () => Promise<void>;
  /** Get asset by type */
  getAsset: (assetType: string) => BrandAsset | undefined;
  /** Get asset URL by type (with S3 prefix) */
  getAssetUrl: (assetType: string) => string | null;
  /** Upload a file and create/update a BrandAsset */
  uploadAsset: (file: File, assetType: string, pathPrefix?: string) => Promise<BrandAsset | null>;
  /** Delete (deactivate) a BrandAsset by asset type */
  deleteAsset: (assetType: string) => Promise<boolean>;
  /** Fetch history for a specific asset type */
  fetchHistory: (assetType: string) => Promise<Array<{id: string, url: string, created_at: string, original_name: string}>>;
  /** Restore a previous version */
  restoreAsset: (fileAssetId: string, assetType: string) => Promise<boolean>;
}

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

export function useBrandProfile({
  organisationId,
  projectId,
  autoFetch = true,
}: UseBrandProfileOptions): UseBrandProfileReturn {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = getApiBaseUrl();

  const fetchProfile = useCallback(async () => {
    if (!organisationId && !projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Find brand profile
      const params = new URLSearchParams();
      if (projectId) params.set('project', String(projectId));
      else if (organisationId) params.set('organisation', organisationId);

      const listRes = await fetch(
        `${apiBase}/api/v1/branding/profiles/?${params}`,
        { credentials: 'include' }
      );

      if (!listRes.ok) throw new Error(`Failed to fetch profiles: ${listRes.status}`);

      const listJson = await listRes.json();
      // Unwrap API envelope: {"status":"success","data":{...}}
      const listData = listJson?.data || listJson;
      const profiles = listData?.results || (Array.isArray(listData) ? listData : []);

      if (!profiles.length) {
        setProfile(null);
        setAssets([]);
        setLoading(false);
        return;
      }

      const brandProfile = profiles[0];

      // Step 2: Fetch detail with nested assets + tokens
      const detailRes = await fetch(
        `${apiBase}/api/v1/branding/profiles/${brandProfile.id}/`,
        { credentials: 'include' }
      );

      if (!detailRes.ok) throw new Error(`Failed to fetch profile detail: ${detailRes.status}`);

      const detailJson = await detailRes.json();
      // Unwrap API envelope
      const detail: BrandProfile = detailJson?.data || detailJson;
      setProfile(detail);
      setAssets(detail.assets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[useBrandProfile] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, organisationId, projectId]);

  useEffect(() => {
    if (autoFetch) {
      fetchProfile();
    }
  }, [autoFetch, fetchProfile]);

  const getAsset = useCallback(
    (assetType: string) => assets.find((a) => a.asset_type === assetType && a.is_active),
    [assets]
  );

  const getAssetUrlByType = useCallback(
    (assetType: string): string | null => {
      const asset = assets.find((a) => a.asset_type === assetType && a.is_active);
      return asset ? getAssetUrl(asset.url) : null;
    },
    [assets]
  );

  const uploadAsset = useCallback(
    async (file: File, assetType: string, pathPrefix?: string): Promise<BrandAsset | null> => {
      if (!profile || !organisationId) return null;

      try {
        // Step 1: Upload file to FileAsset
        const formData = new FormData();
        formData.append('file', file);
        formData.append('original_name', file.name);
        formData.append('is_public', 'true');

        const prefix = pathPrefix || `brand/${profile.id}/${assetType}`;
        const fileRes = await fetch(
          `${apiBase}/api/v1/files/?path_prefix=${encodeURIComponent(prefix)}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'X-Organization-ID': organisationId,
              'X-CSRFToken': getCsrfToken(),
            },
            body: formData,
          }
        );

        if (!fileRes.ok) throw new Error(`File upload failed: ${fileRes.status}`);
        const fileJson = await fileRes.json();
        const fileData = fileJson?.data || fileJson;

        // Step 2: Create or update BrandAsset
        const existing = assets.find((a) => a.asset_type === assetType);

        let brandAsset: BrandAsset;

        if (existing) {
          // Update existing
          const updateRes = await fetch(
            `${apiBase}/api/v1/branding/profiles/${profile.id}/assets/${existing.id}/`,
            {
              method: 'PATCH',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify({ file: fileData.id }),
            }
          );
          if (!updateRes.ok) throw new Error(`Asset update failed: ${updateRes.status}`);
          const updateJson = await updateRes.json();
          brandAsset = updateJson?.data || updateJson;
        } else {
          // Create new
          const createRes = await fetch(
            `${apiBase}/api/v1/branding/profiles/${profile.id}/assets/`,
            {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify({
                profile: profile.id,
                file: fileData.id,
                asset_type: assetType,
                is_active: true,
              }),
            }
          );
          if (!createRes.ok) throw new Error(`Asset create failed: ${createRes.status}`);
          const createJson = await createRes.json();
          brandAsset = createJson?.data || createJson;
        }

        // Refresh all assets
        await fetchProfile();
        return brandAsset;
      } catch (err) {
        console.error('[useBrandProfile] Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        return null;
      }
    },
    [apiBase, organisationId, profile, assets, fetchProfile]
  );

  const deleteAsset = useCallback(
    async (assetType: string): Promise<boolean> => {
      if (!profile) return false;

      const existing = assets.find((a) => a.asset_type === assetType);
      if (!existing) return false;

      try {
        const res = await fetch(
          `${apiBase}/api/v1/branding/profiles/${profile.id}/assets/${existing.id}/`,
          {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'X-CSRFToken': getCsrfToken(),
            },
          }
        );
        if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
        await fetchProfile();
        return true;
      } catch (err) {
        console.error('[useBrandProfile] Delete error:', err);
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      }
    },
    [apiBase, profile, assets, fetchProfile]
  );

  const fetchHistory = useCallback(
    async (assetType: string) => {
      try {
         const params = new URLSearchParams();
         if (projectId) params.set('project_id', String(projectId));
         else if (organisationId) params.set('organisation_id', organisationId);
         params.set('asset_type', assetType);

         const res = await fetch(`${apiBase}/api/v1/generative/assets/history/?${params}`, {
             credentials: 'include'
         });
         if (!res.ok) throw new Error('Failed to fetch history');
         const json = await res.json();
         return json.history || [];
      } catch (e) {
         console.error(e);
         return [];
      }
    },
    [apiBase, projectId, organisationId]
  );

  const restoreAsset = useCallback(
    async (fileAssetId: string, assetType: string) => {
       try {
         const res = await fetch(`${apiBase}/api/v1/generative/assets/restore/`, {
             method: 'POST',
             credentials: 'include',
             headers: {
                 'Content-Type': 'application/json',
                 'X-CSRFToken': getCsrfToken()
             },
             body: JSON.stringify({
                 file_asset_id: fileAssetId,
                 asset_type: assetType,
                 project_id: projectId,
                 organisation_id: organisationId
             })
         });
         if (!res.ok) throw new Error('Restore failed');
         await fetchProfile(); // Reload
         return true;
       } catch (e) {
          console.error(e);
          return false;
       }
    },
    [apiBase, projectId, organisationId, fetchProfile]
  );

  return {
    profile,
    assets,
    loading,
    error,
    refresh: fetchProfile,
    getAsset,
    getAssetUrl: getAssetUrlByType,
    uploadAsset,
    deleteAsset,
    fetchHistory,
    restoreAsset,
  };
}

export default useBrandProfile;
