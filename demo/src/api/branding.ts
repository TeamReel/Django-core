/**
 * Branding domain API — brand profiles, assets, design tokens.
 *
 * ```ts
 * import { brandingApi } from '@/api';
 * const { results } = await brandingApi.listProfiles({ organisationId: orgId });
 * const profile = await brandingApi.getProfile(profileId);
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type {
  BrandProfile,
  BrandProfileDetail,
  BrandAsset,
  DesignToken,
} from '../types/api';

/* ------------------------------------------------------------------ */
/*  Brand Profiles                                                     */
/* ------------------------------------------------------------------ */

export interface BrandProfileListParams {
  project?: number;
  organisation?: string;
  organisationScope?: string;
}

export const brandingApi = {
  /** List brand profiles (paginated). */
  listProfiles(params?: BrandProfileListParams, opts?: ListOptions) {
    return api.list<BrandProfile>('/branding/profiles/', {
      ...opts,
      params: {
        project: params?.project,
        organisation: params?.organisation,
        organisation_scope: params?.organisationScope,
        ...opts?.params,
      },
    });
  },

  /** List ALL brand profiles across pages. */
  listAllProfiles(params?: BrandProfileListParams, opts?: ListAllOptions) {
    return api.listAll<BrandProfile>('/branding/profiles/', {
      ...opts,
      params: {
        project: params?.project,
        organisation: params?.organisation,
        organisation_scope: params?.organisationScope,
        ...opts?.params,
      },
    });
  },

  /** Get a single brand profile by ID. */
  getProfile(id: number, signal?: AbortSignal) {
    return api.get<BrandProfileDetail>(`/branding/profiles/${id}/`, signal);
  },

  /** Create a brand profile. */
  createProfile(data: Partial<BrandProfile>, opts?: MutateOptions) {
    return api.post<BrandProfile>('/branding/profiles/', data, opts);
  },

  /** Update a brand profile. */
  updateProfile(id: number, data: Partial<BrandProfile>, opts?: MutateOptions) {
    return api.patch<BrandProfile>(`/branding/profiles/${id}/`, data, opts);
  },

  /* ───── Profile assets ───────────────────────────────────── */

  /** List assets for a profile (paginated). */
  listProfileAssets(profileId: number, opts?: ListOptions) {
    return api.list<BrandAsset>(`/branding/profiles/${profileId}/assets/`, opts);
  },

  /** List ALL assets for a profile across pages. */
  listAllProfileAssets(profileId: number, opts?: ListAllOptions) {
    return api.listAll<BrandAsset>(`/branding/profiles/${profileId}/assets/`, opts);
  },

  /** Create an asset on a profile. */
  createProfileAsset(profileId: number, data: Partial<BrandAsset>, opts?: MutateOptions) {
    return api.post<BrandAsset>(`/branding/profiles/${profileId}/assets/`, data, opts);
  },

  /** Update an asset on a profile. */
  updateProfileAsset(profileId: number, assetId: number, data: Partial<BrandAsset>, opts?: MutateOptions) {
    return api.patch<BrandAsset>(`/branding/profiles/${profileId}/assets/${assetId}/`, data, opts);
  },

  /** Delete an asset from a profile. */
  deleteProfileAsset(profileId: number, assetId: number, opts?: MutateOptions) {
    return api.delete(`/branding/profiles/${profileId}/assets/${assetId}/`, opts);
  },

  /* ───── Profile tokens ───────────────────────────────────── */

  /** Create a design token on a profile. */
  createToken(profileId: number, data: Partial<DesignToken>, opts?: MutateOptions) {
    return api.post<DesignToken>(`/branding/profiles/${profileId}/tokens/`, data, opts);
  },

  /** Update a design token. */
  updateToken(profileId: number, tokenId: number, data: Partial<DesignToken>, opts?: MutateOptions) {
    return api.patch<DesignToken>(`/branding/profiles/${profileId}/tokens/${tokenId}/`, data, opts);
  },

  /** Delete a design token. */
  deleteToken(profileId: number, tokenId: number, opts?: MutateOptions) {
    return api.delete(`/branding/profiles/${profileId}/tokens/${tokenId}/`, opts);
  },

  /** Trigger AI token generation for a profile. */
  generateTokens(profileId: number, data?: Record<string, unknown>, opts?: MutateOptions) {
    return api.post<void>(`/branding/profiles/${profileId}/generate-tokens/`, data, opts);
  },

  /* ───── Bulk assets (org-wide) ───────────────────────────── */

  /** List all brand assets org-wide (paginated). */
  listAssets(params?: { profile?: number; organisationScope?: string }, opts?: ListOptions) {
    return api.list<BrandAsset>('/branding/assets/', {
      ...opts,
      params: {
        profile: params?.profile,
        organisation_scope: params?.organisationScope,
        ...opts?.params,
      },
    });
  },

  /** List ALL brand assets org-wide across pages. */
  listAllAssets(params?: { profile?: number; organisationScope?: string }, opts?: ListAllOptions) {
    return api.listAll<BrandAsset>('/branding/assets/', {
      ...opts,
      params: {
        profile: params?.profile,
        organisation_scope: params?.organisationScope,
        ...opts?.params,
      },
    });
  },

  /** Create a brand asset (org-wide endpoint). */
  createAsset(data: Partial<BrandAsset>, opts?: MutateOptions) {
    return api.post<BrandAsset>('/branding/assets/', data, opts);
  },

  /** Update a brand asset. */
  updateAsset(id: number, data: Partial<BrandAsset>, opts?: MutateOptions) {
    return api.patch<BrandAsset>(`/branding/assets/${id}/`, data, opts);
  },

  /** Get app background images. */
  getAppBackgrounds(signal?: AbortSignal) {
    return api.get<BrandAsset[]>('/branding/assets/app-backgrounds/', signal);
  },
};
