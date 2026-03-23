/**
 * Asset metadata types and helpers for role-based nested variant storage.
 *
 * Structure: roles.{role}.{images|videos}.{assetType}.{kit}.{variant} = VariantValue
 *
 * All components should use these helpers instead of directly reading
 * the metadata dict.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VariantValue {
  raw?: string;
  processed?: string;
  processing_state?: string;
  specs?: Record<string, unknown>;
}

/** Asset data for a single role (images + videos). */
export interface RoleAssets {
  images?: Record<string, Record<string, Record<string, VariantValue>>>;
  videos?: Record<string, Record<string, Record<string, VariantValue>>>;
}

/** Top-level teamreel_assets shape. */
export interface TeamreelAssets {
  roles?: Record<string, RoleAssets>;
  media?: Record<string, { url?: string; caption?: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export interface RoleKitConfig {
  default: string | null;
  kits: string[];
}

export const ROLE_KIT_MAP: Record<string, RoleKitConfig> = {
  keeper: { default: 'goalkeeper', kits: ['goalkeeper'] },
  player: { default: 'home', kits: ['home', 'away', 'third'] },
  coach: { default: null, kits: [] },
  assistant: { default: null, kits: [] },
  verzorger: { default: null, kits: [] },
  supporter: { default: null, kits: [] },
  manager: { default: null, kits: [] },
};

export const IMAGE_ASSET_TYPES = new Set([
  'fullbody',
  'halfbody',
  'closeup',
  'action_photo',
]);

export const VIDEO_ASSET_TYPES = new Set([
  'intro',
  'celebration',
  'then_vs_now',
  'photo_composite',
  'walking_composite',
]);

export const ASSET_TYPES_BY_ROLE: Record<string, string[]> = {
  keeper: ['fullbody', 'halfbody', 'closeup', 'intro', 'celebration'],
  player: ['fullbody', 'halfbody', 'closeup', 'intro', 'celebration'],
  coach: ['profile'],
  assistant: ['profile'],
};

export const SHARED_ASSET_TYPES = new Set(['profile', 'action_photo']);

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * Direct dict lookup for a single variant value.  No fallbacks.
 */
export function getVariantValue(
  assets: TeamreelAssets | undefined | null,
  role: string,
  mediaType: 'images' | 'videos',
  assetType: string,
  kit: string,
  variant = 'default',
): VariantValue | undefined {
  return assets?.roles?.[role]?.[mediaType]?.[assetType]?.[kit]?.[variant];
}

/**
 * Return the full asset dict for a single role.
 */
export function getRoleAssets(
  assets: TeamreelAssets | undefined | null,
  role: string,
): RoleAssets | undefined {
  return assets?.roles?.[role];
}

/**
 * List all roles that have asset data.
 */
export function getAssetRoles(
  assets: TeamreelAssets | undefined | null,
): string[] {
  if (!assets?.roles) return [];
  return Object.keys(assets.roles);
}

/**
 * Iterate all (kit, variantId, value) tuples for a given role + asset type.
 * If kit is provided, only iterate variants for that kit.
 */
export function iterVariants(
  assets: TeamreelAssets | undefined | null,
  role: string,
  mediaType: 'images' | 'videos',
  assetType: string,
  kit?: string,
): Array<{ kit: string; variantId: string; value: VariantValue }> {
  const assetData = assets?.roles?.[role]?.[mediaType]?.[assetType];
  if (!assetData) return [];

  const result: Array<{ kit: string; variantId: string; value: VariantValue }> = [];
  const kitsToCheck = kit ? [kit] : Object.keys(assetData);

  for (const k of kitsToCheck) {
    const kitData = assetData[k];
    if (!kitData) continue;
    for (const [variantId, value] of Object.entries(kitData)) {
      result.push({ kit: k, variantId, value });
    }
  }

  return result;
}

/**
 * Return the default kit for a functional role, or null if the role has no kits.
 */
export function getDefaultKit(role: string): string | null {
  return ROLE_KIT_MAP[role]?.default ?? null;
}

/**
 * Return available kits for a functional role.
 */
export function getAvailableKits(role: string): string[] {
  return ROLE_KIT_MAP[role]?.kits ?? [];
}

/**
 * Determine the media type ('images' | 'videos') for an asset type.
 */
export function mediaTypeForAsset(assetType: string): 'images' | 'videos' {
  return IMAGE_ASSET_TYPES.has(assetType) ? 'images' : 'videos';
}
