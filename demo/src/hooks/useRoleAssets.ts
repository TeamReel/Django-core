/**
 * useRoleAssets — role-aware access to a member's asset metadata.
 *
 * Provides typed helpers to read image/video variant data for a specific
 * functional role (player, keeper, coach, …).
 */
import { useMemo } from 'react';
import {
  type TeamreelAssets,
  type RoleAssets,
  type VariantValue,
  getVariantValue,
  getRoleAssets,
  getAssetRoles,
  iterVariants,
  getDefaultKit,
  getAvailableKits,
  mediaTypeForAsset,
} from '../utils/assetMetadata';

interface Membership {
  metadata?: {
    teamreel_assets?: TeamreelAssets;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RoleAssetsAccessor {
  /** The resolved role assets object (images + videos). */
  roleAssets: RoleAssets | undefined;

  /** Get a single image variant value. */
  getImage: (assetType: string, kit: string, variant?: string) => VariantValue | undefined;

  /** Get a single video variant value. */
  getVideo: (assetType: string, kit: string, variant?: string) => VariantValue | undefined;

  /** Get a variant value for any asset type (auto-detects images/videos). */
  getAsset: (assetType: string, kit: string, variant?: string) => VariantValue | undefined;

  /** List all variant IDs for a given video type + kit. */
  getVariantIds: (assetType: string, kit: string) => string[];

  /** List all roles that have asset data. */
  allRoles: string[];

  /** Default kit for this role (e.g. 'home' for player, 'goalkeeper' for keeper). */
  defaultKit: string | null;

  /** All available kits for this role. */
  availableKits: string[];
}

/**
 * Hook that provides role-aware asset access for a membership.
 *
 * @param membership - The membership record (must include metadata.teamreel_assets)
 * @param role - Functional role key ('player', 'keeper', 'coach', …)
 */
export function useRoleAssets(
  membership: Membership | null | undefined,
  role: string,
): RoleAssetsAccessor {
  const assets = membership?.metadata?.teamreel_assets;

  return useMemo(() => {
    const roleAssets = getRoleAssets(assets, role);

    const getImage = (assetType: string, kit: string, variant = 'default') =>
      getVariantValue(assets, role, 'images', assetType, kit, variant);

    const getVideo = (assetType: string, kit: string, variant = 'default') =>
      getVariantValue(assets, role, 'videos', assetType, kit, variant);

    const getAsset = (assetType: string, kit: string, variant = 'default') => {
      const mt = mediaTypeForAsset(assetType);
      return getVariantValue(assets, role, mt, assetType, kit, variant);
    };

    const getVariantIds = (assetType: string, kit: string): string[] => {
      const mt = mediaTypeForAsset(assetType);
      return iterVariants(assets, role, mt, assetType, kit).map((v) => v.variantId);
    };

    return {
      roleAssets,
      getImage,
      getVideo,
      getAsset,
      getVariantIds,
      allRoles: getAssetRoles(assets),
      defaultKit: getDefaultKit(role),
      availableKits: getAvailableKits(role),
    };
  }, [assets, role]);
}
