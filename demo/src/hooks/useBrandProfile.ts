/**
 * useBrandProfile Hook
 *
 * Centralized hook for loading brand profiles and assets.
 * Replaces scattered fetch calls across ClubKitsTab, BrandIdentityPage, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';
import { getCsrfToken } from '../utils/csrf';
import {
  type BrandProfile,
  type BrandAsset,
  MULTI_INSTANCE_TYPES,
  getAssetUrl,
} from './brandProfileConstants';

// Re-export types and constants so existing imports keep working
export type { BrandAsset, DesignToken, BrandProfile } from './brandProfileConstants';
export {
  UPLOAD_ASSET_TYPES,
  PROCESSED_ASSET_TYPES,
  COMBINED_ASSET_TYPES,
  KIT_ROLES,
  ASSET_TYPE_LABELS,
  MULTI_INSTANCE_TYPES,
  getAssetUrl,
  resolvePresignedUrls,
} from './brandProfileConstants';

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
  /** Get first asset by type (for single-instance types) */
  getAsset: (assetType: string) => BrandAsset | undefined;
  /** Get all assets of a given type (for multi-instance types like club_background) */
  getAssets: (assetType: string) => BrandAsset[];
  /** Get asset URL by type (with S3 prefix) */
  getAssetUrl: (assetType: string) => string | null;
  /** Upload a file and create/update a BrandAsset */
  uploadAsset: (file: File, assetType: string, pathPrefix?: string, label?: string) => Promise<BrandAsset | null>;
  /** Delete (deactivate) a BrandAsset by asset type (first match) */
  deleteAsset: (assetType: string) => Promise<boolean>;
  /** Delete a specific BrandAsset by its UUID */
  deleteAssetById: (assetId: string) => Promise<boolean>;
  /** Fetch history for a specific asset type */
  fetchHistory: (assetType: string) => Promise<Array<{id: string, url: string, created_at: string, original_name: string}>>;
  /** Restore a previous version */
  restoreAsset: (fileAssetId: string, assetType: string) => Promise<boolean>;
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
        { credentials: 'include', cache: 'no-store' }
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
        { credentials: 'include', cache: 'no-store' }
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

  const getAssetByType = useCallback(
    (assetType: string) => assets.find((a) => a.asset_type === assetType && a.is_active),
    [assets]
  );

  const getAssetsByType = useCallback(
    (assetType: string) => assets.filter((a) => a.asset_type === assetType && a.is_active),
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
    async (file: File, assetType: string, pathPrefix?: string, label?: string): Promise<BrandAsset | null> => {
      let activeProfile = profile;

      // Auto-create BrandProfile if missing (e.g. first upload on a team page)
      if (!activeProfile && (projectId || organisationId)) {
        try {
          const createBody: Record<string, unknown> = {
            name: `Auto-created brand`,
            is_active: true,
          };
          if (projectId) {
            createBody['project'] = Number(projectId);
          } else if (organisationId) {
            createBody['organisation'] = organisationId;
          }

          const createRes = await fetch(`${apiBase}/api/v1/branding/profiles/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify(createBody),
          });

          if (createRes.ok) {
            const createJson = await createRes.json();
            activeProfile = createJson?.data || createJson;
            setProfile(activeProfile);
            console.log('[useBrandProfile] Auto-created BrandProfile:', activeProfile?.id);
          } else {
            console.error('[useBrandProfile] Failed to auto-create profile:', createRes.status);
            return null;
          }
        } catch (err) {
          console.error('[useBrandProfile] Auto-create profile error:', err);
          return null;
        }
      }

      if (!activeProfile || !organisationId) return null;

      try {
        // Step 1: Upload file to FileAsset
        const formData = new FormData();
        formData.append('file', file);
        formData.append('original_name', file.name);
        formData.append('is_public', 'true');

        const prefix = pathPrefix || `brand/${activeProfile.id}/${assetType}`;
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
        // Multi-instance types always create new; single-instance types update existing
        const isMulti = MULTI_INSTANCE_TYPES.has(assetType);
        const existing = isMulti ? undefined : assets.find((a) => a.asset_type === assetType);

        let brandAsset: BrandAsset;

        if (existing) {
          // Update existing
          const updateRes = await fetch(
            `${apiBase}/api/v1/branding/profiles/${activeProfile.id}/assets/${existing.id}/`,
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
            `${apiBase}/api/v1/branding/profiles/${activeProfile.id}/assets/`,
            {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify({
                profile: activeProfile.id,
                file: fileData.id,
                asset_type: assetType,
                is_active: true,
                ...(label ? { label } : {}),
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
    [apiBase, organisationId, projectId, profile, assets, fetchProfile]
  );

  const deleteAssetById = useCallback(
    async (assetId: string): Promise<boolean> => {
      if (!profile) return false;

      try {
        const res = await fetch(
          `${apiBase}/api/v1/branding/profiles/${profile.id}/assets/${assetId}/`,
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
        console.error('[useBrandProfile] DeleteById error:', err);
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      }
    },
    [apiBase, profile, fetchProfile]
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
    getAsset: getAssetByType,
    getAssets: getAssetsByType,
    getAssetUrl: getAssetUrlByType,
    uploadAsset,
    deleteAsset,
    deleteAssetById,
    fetchHistory,
    restoreAsset,
  };
}

export default useBrandProfile;
