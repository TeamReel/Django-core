/**
 * useBrandProfile Hook
 *
 * Centralized hook for loading brand profiles and assets.
 * Replaces scattered fetch calls across ClubKitsTab, BrandIdentityPage, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
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

export interface UseBrandProfileReturn {
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

  const fetchProfile = useCallback(async () => {
    if (!organisationId && !projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Find brand profile for the exact project
      const params: Record<string, string> = {};
      if (projectId) params['project'] = String(projectId);
      else if (organisationId) params['organisation'] = organisationId;

      const listData = await api.list<BrandProfile>('/branding/profiles/', { params });
      let profiles = listData.results;

      // Step 2: Cascade — team has no profile → try all profiles in the org
      // This finds the parent club's profile (e.g. ASC) when querying from a
      // child team (e.g. Helden 6) that has no own brand profile.
      if (!profiles.length && projectId && organisationId) {
        const fallbackData = await api.list<BrandProfile>('/branding/profiles/', {
          params: { organisation_scope: organisationId },
        });
        // Prefer project-level profiles (club) over org-level profiles
        profiles = fallbackData.results.sort(
          (a, b) => (b.project ? 1 : 0) - (a.project ? 1 : 0),
        );
      }

      if (!profiles.length) {
        setProfile(null);
        setAssets([]);
        setLoading(false);
        return;
      }

      const brandProfile = profiles[0];

      // Step 2: Fetch detail with nested assets + tokens
      const detail = await api.get<BrandProfile>(`/branding/profiles/${brandProfile.id}/`);
      setProfile(detail);
      setAssets(detail.assets || []);
    } catch (err) {
      logger.error('useBrandProfile fetch error', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [organisationId, projectId]);

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

          activeProfile = await api.post<BrandProfile>('/branding/profiles/', createBody);
          setProfile(activeProfile);
        } catch (err) {
          logger.error('useBrandProfile auto-create profile error', err);
          return null;
        }
      }

      if (!activeProfile || !organisationId) return null;

      try {
        // Step 1: Upload file to FileAsset
        const prefix = pathPrefix || `brand/${activeProfile.id}/${assetType}`;
        const fileData = await api.upload<{ id: string }>(
          `/files/?path_prefix=${encodeURIComponent(prefix)}`,
          file,
          { original_name: file.name, is_public: 'true' },
        );

        // Step 2: Create or update BrandAsset
        // Multi-instance types always create new; single-instance types update existing
        const isMulti = MULTI_INSTANCE_TYPES.has(assetType);
        const existing = isMulti ? undefined : assets.find((a) => a.asset_type === assetType);

        let brandAsset: BrandAsset;

        if (existing) {
          // Update existing
          brandAsset = await api.patch<BrandAsset>(
            `/branding/profiles/${activeProfile.id}/assets/${existing.id}/`,
            { file: fileData.id },
          );
        } else {
          // Create new
          brandAsset = await api.post<BrandAsset>(
            `/branding/profiles/${activeProfile.id}/assets/`,
            {
              profile: activeProfile.id,
              file: fileData.id,
              asset_type: assetType,
              is_active: true,
              ...(label ? { label } : {}),
            },
          );
        }

        // Refresh all assets
        await fetchProfile();
        return brandAsset;
      } catch (err) {
        logger.error('useBrandProfile upload error', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        return null;
      }
    },
    [organisationId, projectId, profile, assets, fetchProfile]
  );

  const deleteAssetById = useCallback(
    async (assetId: string): Promise<boolean> => {
      if (!profile) return false;

      try {
        await api.delete(`/branding/profiles/${profile.id}/assets/${assetId}/`);
        await fetchProfile();
        return true;
      } catch (err) {
        logger.error('useBrandProfile deleteById error', err);
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      }
    },
    [profile, fetchProfile]
  );

  const deleteAsset = useCallback(
    async (assetType: string): Promise<boolean> => {
      if (!profile) return false;

      const existing = assets.find((a) => a.asset_type === assetType);
      if (!existing) return false;

      try {
        await api.delete(`/branding/profiles/${profile.id}/assets/${existing.id}/`);
        await fetchProfile();
        return true;
      } catch (err) {
        logger.error('useBrandProfile delete error', err);
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      }
    },
    [profile, assets, fetchProfile]
  );

  const fetchHistory = useCallback(
    async (assetType: string) => {
      try {
         const params = new URLSearchParams();
         if (projectId) params.set('project_id', String(projectId));
         else if (organisationId) params.set('organisation_id', organisationId);
         params.set('asset_type', assetType);

         const data = await api.get<{ history: Array<{id: string, url: string, created_at: string, original_name: string}> }>(
           `/generative/assets/history/?${params}`,
         );
         return data.history || [];
      } catch (e) {
        logger.error('useBrandProfile fetchHistory error', e);
        return [];
      }
    },
    [projectId, organisationId]
  );

  const restoreAsset = useCallback(
    async (fileAssetId: string, assetType: string) => {
       try {
         await api.post('/generative/assets/restore/', {
             file_asset_id: fileAssetId,
             asset_type: assetType,
             project_id: projectId,
             organisation_id: organisationId,
         });
         await fetchProfile(); // Reload
         return true;
       } catch (e) {
         logger.error('useBrandProfile restoreAsset error', e);
         return false;
       }
    },
    [projectId, organisationId, fetchProfile]
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
