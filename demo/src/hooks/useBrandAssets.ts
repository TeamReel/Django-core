/**
 * useBrandAssets Hook
 *
 * Fetches brand assets (logos, kits, sponsors) from the branding API.
 * Flow: get profiles for org → get assets per profile → flatten into one list.
 *
 * API: GET /api/v1/branding/profiles/?organisation={orgId}
 *      GET /api/v1/branding/profiles/{profileId}/assets/
 */

import { useState, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

// ============================================================================
// Types
// ============================================================================

export interface BrandAssetFileDetails {
  id: string;
  name: string;
  size: number;
  content_type: string;
}

export interface BrandAsset {
  id: string;
  profile: string;
  profile_name?: string;
  file: string;
  asset_type: string;
  asset_type_label?: string;
  alt_text: string;
  is_active: boolean;
  file_details: BrandAssetFileDetails | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

interface BrandProfile {
  id: string;
  name: string;
  organisation: string | null;
  project: number | null;
  is_active: boolean;
}

export type AssetCategory = 'all' | 'logo' | 'kit' | 'sponsor' | 'other';

/** Map asset_type to a human-readable category */
export function getAssetCategory(assetType: string): AssetCategory {
  if (assetType.startsWith('logo') || assetType === 'watermark' || assetType === 'favicon') return 'logo';
  if (assetType.startsWith('kit_')) return 'kit';
  if (assetType.startsWith('sponsor_')) return 'sponsor';
  return 'other';
}

/** Human-readable label for asset_type */
const ASSET_TYPE_LABELS: Record<string, string> = {
  logo_upload: 'Logo (Upload)',
  logo_light: 'Logo (Light)',
  logo_dark: 'Logo (Dark)',
  watermark: 'Watermark',
  favicon: 'Favicon',
  font_file: 'Font File',
  sponsor_logo_upload: 'Sponsor Logo (Upload)',
  sponsor_logo: 'Sponsor Logo',
  kit_home_upload: 'Home Kit (Upload)',
  kit_home: 'Home Kit',
  kit_home_combined: 'Home Kit (Combined)',
  kit_away_upload: 'Away Kit (Upload)',
  kit_away: 'Away Kit',
  kit_away_combined: 'Away Kit (Combined)',
  kit_third_upload: 'Third Kit (Upload)',
  kit_third: 'Third Kit',
  kit_third_combined: 'Third Kit (Combined)',
  kit_goalkeeper_upload: 'Goalkeeper Kit (Upload)',
  kit_goalkeeper: 'Goalkeeper Kit',
  kit_goalkeeper_combined: 'Goalkeeper Kit (Combined)',
  kit_coach_upload: 'Coach Kit (Upload)',
  kit_coach: 'Coach Kit',
  kit_coach_combined: 'Coach Kit (Combined)',
  kit_assistant_upload: 'Assistant Kit (Upload)',
  kit_assistant: 'Assistant Kit',
  kit_assistant_combined: 'Assistant Kit (Combined)',
  kit_training_upload: 'Training Kit (Upload)',
  kit_training: 'Training Kit',
  kit_training_combined: 'Training Kit (Combined)',
  location_photo: 'Location Photo',
  other: 'Other',
};

export function getAssetTypeLabel(assetType: string): string {
  return ASSET_TYPE_LABELS[assetType] || assetType;
}

export interface UseBrandAssetsReturn {
  assets: BrandAsset[];
  loading: boolean;
  error: string | null;
  fetchAssets: (orgId: string, category?: AssetCategory) => Promise<void>;
  categories: { key: AssetCategory; label: string; count: number }[];
}

// ============================================================================
// Hook
// ============================================================================

export function useBrandAssets(): UseBrandAssetsReturn {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    if (csrfToken) headers['X-CSRFToken'] = csrfToken;
    return headers;
  };

  const fetchAssets = useCallback(async (orgId: string, category?: AssetCategory) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const base = getApiBaseUrl();

      /** Fetch all pages from a paginated envelope endpoint */
      const fetchAllPages = async <T,>(url: string, signal: AbortSignal): Promise<T[]> => {
        const all: T[] = [];
        let nextUrl: string | null = url;
        while (nextUrl) {
          const res = await fetch(nextUrl, { headers: getHeaders(), credentials: 'include', signal });
          if (!res.ok) break;
          const json = await res.json();
          // Handle envelope formats
          const items: T[] = Array.isArray(json.data?.results) ? json.data.results
            : Array.isArray(json.data) ? json.data
            : Array.isArray(json.results) ? json.results
            : Array.isArray(json) ? json : [];
          all.push(...items);
          // Next page URL
          nextUrl = json.data?.next || json.meta?.pagination?.next || json.next || null;
        }
        return all;
      };

      // Step 1: Get ALL brand profiles for this organisation (paginated)
      const profiles = await fetchAllPages<BrandProfile>(
        `${base}/api/v1/branding/profiles/?organisation=${orgId}&page_size=100`,
        controller.signal,
      );

      if (profiles.length === 0) {
        setAssets([]);
        return;
      }

      // Step 2: Get assets for each profile in parallel
      const assetPromises = profiles.map(async (profile) => {
        const items = await fetchAllPages<BrandAsset>(
          `${base}/api/v1/branding/profiles/${profile.id}/assets/?page_size=100`,
          controller.signal,
        );
        // Enrich with profile name
        return items.map((a) => ({
          ...a,
          profile_name: profile.name,
          asset_type_label: getAssetTypeLabel(a.asset_type),
        }));
      });

      const allAssets = (await Promise.all(assetPromises)).flat();

      // Client-side category filter
      const filtered = category && category !== 'all'
        ? allAssets.filter((a) => getAssetCategory(a.asset_type) === category)
        : allAssets;

      setAssets(filtered);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load brand assets');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Compute category counts from current (unfiltered) data
  const categories: UseBrandAssetsReturn['categories'] = [
    { key: 'all', label: 'All Assets', count: assets.length },
    { key: 'logo', label: 'Logos', count: assets.filter(a => getAssetCategory(a.asset_type) === 'logo').length },
    { key: 'kit', label: 'Kits', count: assets.filter(a => getAssetCategory(a.asset_type) === 'kit').length },
    { key: 'sponsor', label: 'Sponsors', count: assets.filter(a => getAssetCategory(a.asset_type) === 'sponsor').length },
    { key: 'other', label: 'Other', count: assets.filter(a => getAssetCategory(a.asset_type) === 'other').length },
  ];

  return { assets, loading, error, fetchAssets, categories };
}
