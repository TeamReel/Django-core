/**
 * memberAssetHelpers — Helper functions & checklist definition for MemberSummarySheet.
 *
 * Extracted from MemberSummarySheet.tsx to keep the component under 500 lines.
 */
import React from 'react';
import { Video, Sparkles, Crop, ArrowLeftRight, Camera, Upload, Shirt, ImageIcon, Footprints, Users } from 'lucide-react';
import { iterVariants, getAssetRoles, ROLE_KIT_MAP, type TeamreelAssets } from '../../utils/assetMetadata';
import { getAssetUrl } from '../../hooks/brandProfileConstants';
import type { SquadMember } from '../periods/squadTabTypes';

/* ── Labels ──────────────────────────────────────────────────────────── */

export const ROLE_LABELS: Record<string, string> = {
  keeper: 'Keeper',
  goalkeeper: 'Keeper',
  player: 'Speler',
  coach: 'Coach',
  assistant: 'Assistent',
  verzorger: 'Verzorger',
  manager: 'Manager',
  supporter: 'Supporter',
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

export function memberName(m: SquadMember): string {
  const u = m.user;
  if (u?.first_name || u?.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u?.name || u?.email || 'Onbekend';
}

export function memberAvatarUrl(m: SquadMember, role?: string): string | undefined {
  const assets = (m.metadata as Record<string, unknown> | undefined)
    ?.teamreel_assets as TeamreelAssets | undefined;
  if (!assets) return undefined;

  // Role-strict: keeper only gets goalkeeper kit, player only gets home/away/third
  const effectiveRole = role ?? getPrimaryRole(m);
  const allowedKits = ROLE_KIT_MAP[effectiveRole]?.kits ?? ['home', 'away', 'third'];

  for (const kit of allowedKits) {
    const variants = iterVariants(assets, effectiveRole, 'images', 'closeup', kit);
    for (const v of variants) {
      if (typeof v.value?.processed === 'string' && v.value.processed) {
        return getAssetUrl(v.value.processed) ?? undefined;
      }
    }
  }
  // Fallback: media alias (catches legacy kits not in ROLE_KIT_MAP)
  const mediaUrl = assets?.media?.closeup?.url;
  if (mediaUrl) return getAssetUrl(mediaUrl) ?? undefined;
  return undefined;
}

/** Extract first available *displayable image* URL for an asset type.
 *  For videos only preview_url (poster frame) is returned — video file URLs
 *  cannot be rendered as <img>.
 *  Role-strict: only searches kits allowed for the given role.
 *  Falls back to media aliases when role/kit lookup misses (e.g. legacy kits). */
export function getFirstAssetUrl(
  assets: TeamreelAssets | undefined,
  role: string,
  mediaType: 'images' | 'videos',
  assetType: string,
): string | null {
  const allowedKits = ROLE_KIT_MAP[role]?.kits ?? [];
  // Search only role-appropriate kits (or all if role has no kit restrictions)
  const kitsToSearch = allowedKits.length > 0 ? allowedKits : [undefined as string | undefined];
  for (const kit of kitsToSearch) {
    const variants = iterVariants(assets, role, mediaType, assetType, kit);
    for (const v of variants) {
      if (!v.value) continue;
      if (typeof v.value === 'string') {
        if (mediaType === 'images') return getAssetUrl(v.value);
        continue;
      }
      const val = v.value as Record<string, unknown>;
      if (val.preview_url && typeof val.preview_url === 'string') return getAssetUrl(val.preview_url);
      if (mediaType === 'images') {
        if (val.processed && typeof val.processed === 'string') return getAssetUrl(val.processed);
        if (val.raw && typeof val.raw === 'string') return getAssetUrl(val.raw);
      }
    }
  }
  // For videos: try all variants without kit filter (handles composite names like home_hand_up)
  if (mediaType === 'videos') {
    const allVariants = iterVariants(assets, role, 'videos', assetType);
    for (const v of allVariants) {
      if (!v.value) continue;
      const val = v.value as Record<string, unknown>;
      if (val.preview_url && typeof val.preview_url === 'string') return getAssetUrl(val.preview_url);
    }
  }
  // Fallback: check media aliases — images only. Video media aliases point to the
  // video file itself (not a poster frame), so they can't be used as a <video> thumbnail.
  // For videos, only preview_url fields (poster frames) are usable as thumbnails.
  if (mediaType === 'images') {
    const mediaUrl = assets?.media?.[assetType]?.url;
    if (mediaUrl) return getAssetUrl(mediaUrl);
  }
  return null;
}

/** Check whether ANY variant data exists for a given asset type (for presence indicators).
 *  Role-strict: only checks kits allowed for the given role.
 *  Falls back to media aliases when role/kit lookup misses (e.g. legacy kits). */
export function hasAnyVariant(
  assets: TeamreelAssets | undefined,
  role: string,
  mediaType: 'images' | 'videos',
  assetType: string,
): boolean {
  const allowedKits = ROLE_KIT_MAP[role]?.kits ?? [];
  const kitsToSearch = allowedKits.length > 0 ? allowedKits : [undefined as string | undefined];
  for (const kit of kitsToSearch) {
    const variants = iterVariants(assets, role, mediaType, assetType, kit);
    for (const v of variants) {
      if (!v.value) continue;
      if (typeof v.value === 'string') return true;
      const val = v.value as Record<string, unknown>;
      if (val.url || val.preview_url || val.processed || val.raw) return true;
    }
  }
  // Fallback: check media aliases (catches legacy kits and flat-format data)
  const mediaUrl = assets?.media?.[assetType]?.url;
  if (mediaUrl) return true;
  return false;
}

/** Get legacy photo URL from metadata. */
export function getLegacyPhotoUrl(assets: TeamreelAssets | undefined): string | null {
  if (!assets) return null;
  if (assets.media?.legacy_photo?.url) return getAssetUrl(assets.media.legacy_photo.url);
  const old = (assets as Record<string, unknown>).old as Record<string, unknown> | undefined;
  if (old?.profile_photo_url && typeof old.profile_photo_url === 'string') return getAssetUrl(old.profile_photo_url);
  return null;
}

/** Get legacy fullbody (in tenue, legacy variant) URL. */
export function getLegacyFullbodyUrl(assets: TeamreelAssets | undefined, role: string): string | null {
  const variants = iterVariants(assets, role, 'images', 'fullbody', 'legacy');
  for (const v of variants) {
    if (!v.value) continue;
    const val = v.value as Record<string, unknown>;
    if (val.processed && typeof val.processed === 'string') return getAssetUrl(val.processed);
    if (val.raw && typeof val.raw === 'string') return getAssetUrl(val.raw);
  }
  return null;
}

/** Derive the primary role for display. */
export function getPrimaryRole(m: SquadMember): string {
  const tr = (m.metadata as Record<string, unknown> | undefined)?.teamreel_assets as TeamreelAssets | undefined;
  const roles = getAssetRoles(tr);
  if (roles.length > 0) return roles[0];
  return m.functional_roles?.[0] ?? 'player';
}

/* ── Asset checklist definition ──────────────────────────────────────── */

export interface AssetItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Displayable image URL for visual preview (null if no preview available) */
  thumbnail: string | null;
  /** Whether the asset data exists in metadata (drives checkmark + progress) */
  hasAsset: boolean;
  /** Tab to open in editor when tapped */
  editTab: string;
  /** true = at least 1 variant present is enough (e.g. intro) */
  anyVariantSufficient?: boolean;
  /** Whether this row supports inline accordion expansion */
  expandable?: boolean;
  /** Media type for accordion content rendering */
  mediaType?: 'images' | 'videos';
  /** true when thumbnail is a video URL (render <video> instead of <img>) */
  isVideo?: boolean;
}

export function buildAssetChecklist(
  assets: TeamreelAssets | undefined,
  role: string,
  avatarUrl?: string | null,
): AssetItem[] {
  const legacyPhotoUrl = getLegacyPhotoUrl(assets);
  const legacyFullbodyUrl = getLegacyFullbodyUrl(assets, role);

  // Upload = user avatar (the original uploaded photo).
  // Prefer avatarUrl (presigned URL from API) over profileUrl (direct S3 URL that
  // may require public bucket access). They point to the same file.
  const profileMedia = assets?.media?.profile;
  const profileUrl = profileMedia?.url ? getAssetUrl(profileMedia.url) : null;
  const uploadUrl = avatarUrl ?? profileUrl ?? null;

  return [
    {
      id: 'upload',
      label: 'Upload',
      icon: <Upload size={16} />,
      thumbnail: uploadUrl,
      hasAsset: uploadUrl !== null,
      editTab: 'assets',
    },
    {
      id: 'fullbody',
      label: 'Fullbody in tenue',
      icon: <Shirt size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'images', 'fullbody'),
      hasAsset: hasAnyVariant(assets, role, 'images', 'fullbody'),
      editTab: 'assets',
      expandable: true,
      mediaType: 'images',
    },
    {
      id: 'closeup',
      label: 'Close-up',
      icon: <Crop size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'images', 'closeup'),
      hasAsset: hasAnyVariant(assets, role, 'images', 'closeup'),
      editTab: 'assets',
      expandable: true,
      mediaType: 'images',
    },
    {
      id: 'intro',
      label: 'Short intro',
      icon: <Video size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'intro'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'intro'),
      editTab: 'intro',
      anyVariantSufficient: true,
      expandable: true,
      mediaType: 'videos',
      isVideo: true,
    },
    {
      id: 'celebration',
      label: 'Goal celebration',
      icon: <Sparkles size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'celebration'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'celebration'),
      editTab: 'celebration',
      expandable: true,
      mediaType: 'videos',
      isVideo: true,
    },
    {
      id: 'action_photo',
      label: 'Actiefoto',
      icon: <Camera size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'images', 'action_photo'),
      hasAsset: hasAnyVariant(assets, role, 'images', 'action_photo'),
      editTab: 'action_photo',
      expandable: true,
      mediaType: 'images',
    },
    {
      id: 'legacy_photo',
      label: 'Legacy foto',
      icon: <ImageIcon size={16} />,
      thumbnail: legacyPhotoUrl,
      hasAsset: legacyPhotoUrl !== null,
      editTab: 'assets',
    },
    {
      id: 'legacy_fullbody',
      label: 'Legacy in tenue',
      icon: <Shirt size={16} />,
      thumbnail: legacyFullbodyUrl,
      hasAsset: legacyFullbodyUrl !== null,
      editTab: 'assets',
    },
    {
      id: 'then_vs_now',
      label: 'Then vs Now',
      icon: <ArrowLeftRight size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'then_vs_now'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'then_vs_now'),
      editTab: 'then_vs_now',
      expandable: true,
      mediaType: 'videos',
      isVideo: true,
    },
    {
      id: 'walking_composite',
      label: 'Walking Composite',
      icon: <Footprints size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'walking_composite'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'walking_composite'),
      editTab: 'walking_composite',
      expandable: true,
      mediaType: 'videos',
      isVideo: true,
    },
    {
      id: 'photo_composite',
      label: 'Duo Portret',
      icon: <Users size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'photo_composite'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'photo_composite'),
      editTab: 'photo_composite',
      expandable: true,
      mediaType: 'videos',
      isVideo: true,
    },
  ];
}
