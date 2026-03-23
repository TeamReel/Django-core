/**
 * Pure helper functions and types extracted from ProjectSeasonMemberDetailPage.
 * These have NO dependency on React component state.
 */
import type { Dispatch, SetStateAction } from 'react';
import {
  type AssetVariantValue,
  normalizeVariantValue,
  getBestUrl,
} from '../../constants/assetProcessingSpecs';
import { MEDIA_SLOTS, type MemberMediaForm } from '../../constants/mediaSlots';
import { api } from '@/api';
import { logger } from '@/utils/logger';

/** Minimal membership record shape for member-detail utilities. */
export interface MembershipRecord {
  id?: string | number;
  user?: { id?: string | number; name?: string; first_name?: string; last_name?: string; email?: string; avatar_url?: string };
  role?: string;
  functional_roles?: string[];
  metadata?: Record<string, any>; // Deeply nested, truly polymorphic structure
  [key: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────────────

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Types ───────────────────────────────────────────────────────────

/** Per-variant asset URLs stored in metadata (supports both old string and new object format) */
export type AssetVariantRaw = string | AssetVariantValue;
export type AssetVariants = Record<string, AssetVariantRaw>;
export type AssetVariantsMap = {
  fullbody: AssetVariants;
  halfbody: AssetVariants;
  closeup: AssetVariants;
  intro: AssetVariants;
  celebration: AssetVariants;
  then_vs_now: AssetVariants;
  photo_composite: AssetVariants;
  walking_composite: AssetVariants;
  action_photo: AssetVariants;
};

/** Keep old name as alias for backwards compatibility */
export type VideoVariantsMap = AssetVariantsMap;

export interface EffectiveKit {
  id: string;
  label: string;
  icon: string;
  url: string | null;
}

/** Common props shared by all member tab components. */
export interface MemberTabCommonProps {
  membership: MembershipRecord;
  form: MemberMediaForm;
  videoVariants: AssetVariantsMap;
  setVideoVariants: Dispatch<SetStateAction<AssetVariantsMap>>;
  setForm: Dispatch<SetStateAction<MemberMediaForm>>;
  userCanEditProject: boolean;
  apiBaseUrl: string;
  membershipId: string | undefined;
  project: { id?: string; name?: string; slug?: string } | null;
  resolveDisplayUrl: (url: string | null | undefined) => string | null;
  openAiModal: (templateId: string, kitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => void;
  handleMetadataUpdate: (newMetadata: Record<string, unknown>, targetMembershipId?: string) => Promise<void>;
  startProcessingPoll: (assetType: string, kitType: string, variantId?: string | null) => void;
  setVideoPreviewUrl: (url: string | null) => void;
  setMembership: (m: MembershipRecord) => void;
  effectiveKits: EffectiveKit[];
  selectedRole: string;
}

// ─── Pure helpers ────────────────────────────────────────────────────

export function getUserDisplayName(membership: MembershipRecord): string {
  const u = membership?.user || {};
  const name =
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Member';
  return name;
}

export function createEmptyMediaForm(): MemberMediaForm {
  return MEDIA_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = { url: '', caption: '' };
    return acc;
  }, {} as MemberMediaForm);
}

export function createEmptyVideoVariants(): AssetVariantsMap {
  return { fullbody: {}, halfbody: {}, closeup: {}, intro: {}, celebration: {}, then_vs_now: {}, photo_composite: {}, walking_composite: {}, action_photo: {} };
}

export function readAssetsFromMembership(membership: MembershipRecord): MemberMediaForm {
  const meta = membership?.metadata || {};
  const tr = meta?.teamreel_assets || meta?.teamreelAssets || {};
  const media = tr?.media || {};

  const legacyKit = tr?.kit || {};
  const legacyOld = tr?.old || {};

  const form = createEmptyMediaForm();

  for (const slot of MEDIA_SLOTS) {
    const slotData = media[slot.id] || {};
    form[slot.id] = {
      url: String(slotData?.url || '').trim(),
      caption: String(slotData?.caption || '').trim(),
    };
  }

  if (!form.profile.url && legacyKit?.profile_photo_url) {
    form.profile.url = String(legacyKit.profile_photo_url).trim();
  }
  if (!form.kit.url && legacyKit?.full_body_url) {
    form.kit.url = String(legacyKit.full_body_url).trim();
  }
  if (!form.intro.caption && legacyKit?.intro_text) {
    form.intro.caption = String(legacyKit.intro_text).trim();
  }
  if (!form.celebration.url && legacyKit?.goal_celebration_url) {
    form.celebration.url = String(legacyKit.goal_celebration_url).trim();
  }
  if (!form.legacy_photo.url && legacyOld?.profile_photo_url) {
    form.legacy_photo.url = String(legacyOld.profile_photo_url).trim();
  }

  const avatarUrl = membership?.user?.avatar_url;
  if (!form.profile.url && avatarUrl) {
    form.profile.url = String(avatarUrl).trim();
  }

  return form;
}

export function readVideoVariantsFromMembership(membership: MembershipRecord): AssetVariantsMap {
  const meta = membership?.metadata || {};
  const tr = meta?.teamreel_assets || meta?.teamreelAssets || {};

  const safeObj = (obj: unknown): Record<string, AssetVariantRaw> =>
    (obj && typeof obj === 'object' ? { ...obj } : {});

  // Flatten kit.variant structure into composite keys: { home_default: {...}, home_arms_crossed: {...} }
  const flattenKitVariants = (
    categoryData: Record<string, unknown> | undefined,
  ): Record<string, AssetVariantRaw> => {
    if (!categoryData || typeof categoryData !== 'object') return {};
    const result: Record<string, AssetVariantRaw> = {};
    for (const [kit, kitData] of Object.entries(categoryData)) {
      if (!kitData || typeof kitData !== 'object') continue;
      for (const [variantId, val] of Object.entries(kitData as Record<string, unknown>)) {
        if (!val) continue;
        const compositeKey = variantId === 'default' ? kit : `${kit}_${variantId}`;
        result[compositeKey] = val as AssetVariantRaw;
      }
    }
    return result;
  };

  // Build result by merging all roles — later roles can override earlier ones
  const result: AssetVariantsMap = {
    fullbody: {},
    halfbody: {},
    closeup: {},
    intro: {},
    celebration: {},
    then_vs_now: {},
    photo_composite: {},
    walking_composite: {},
    action_photo: {},
  };

  const roles = tr?.roles;
  if (roles && typeof roles === 'object') {
    for (const roleData of Object.values(roles)) {
      if (!roleData || typeof roleData !== 'object') continue;
      const rd = roleData as Record<string, unknown>;
      const images = rd.images as Record<string, unknown> | undefined;
      const videos = rd.videos as Record<string, unknown> | undefined;

      Object.assign(result.fullbody, flattenKitVariants(images?.fullbody as Record<string, unknown>));
      Object.assign(result.halfbody, flattenKitVariants(images?.halfbody as Record<string, unknown>));
      Object.assign(result.closeup, flattenKitVariants(images?.closeup as Record<string, unknown>));
      Object.assign(result.intro, flattenKitVariants(videos?.intro as Record<string, unknown>));
      Object.assign(result.celebration, flattenKitVariants(videos?.celebration as Record<string, unknown>));
      Object.assign(result.then_vs_now, flattenKitVariants(videos?.then_vs_now as Record<string, unknown>));
      Object.assign(result.photo_composite, flattenKitVariants(images?.photo_composite as Record<string, unknown>));
      Object.assign(result.photo_composite, flattenKitVariants(videos?.photo_composite as Record<string, unknown>));
      Object.assign(result.walking_composite, flattenKitVariants(images?.walking_composite as Record<string, unknown>));
      Object.assign(result.walking_composite, flattenKitVariants(videos?.walking_composite as Record<string, unknown>));
      Object.assign(result.action_photo, flattenKitVariants(images?.action_photo as Record<string, unknown>));
    }
  }

  // Legacy fallback: root-level images/videos for pre-migration data
  if (Object.values(result).every((v) => Object.keys(v).length === 0)) {
    const images = tr?.images;
    const videos = tr?.videos;
    if (images && typeof images === 'object') {
      Object.assign(result.fullbody, safeObj((images as Record<string, unknown>)?.fullbody));
      Object.assign(result.halfbody, safeObj((images as Record<string, unknown>)?.halfbody));
      Object.assign(result.closeup, safeObj((images as Record<string, unknown>)?.closeup));
      Object.assign(result.action_photo, safeObj((images as Record<string, unknown>)?.action_photo));
    }
    if (videos && typeof videos === 'object') {
      Object.assign(result.intro, safeObj((videos as Record<string, unknown>)?.intro));
      Object.assign(result.celebration, safeObj((videos as Record<string, unknown>)?.celebration));
      Object.assign(result.then_vs_now, safeObj((videos as Record<string, unknown>)?.then_vs_now));
    }
  }

  const media = tr?.media || {};
  if (!result.fullbody.home && media?.kit?.url) {
    result.fullbody.home = String(media.kit.url).trim();
  }
  if (!result.closeup.home && media?.closeup?.url) {
    result.closeup.home = String(media.closeup.url).trim();
  }

  return result;
}

export function mergeAssetsIntoMetadata(existingMetadata: Record<string, any> | null | undefined, form: MemberMediaForm, videoVariants?: VideoVariantsMap): Record<string, any> {
  const meta = existingMetadata && typeof existingMetadata === 'object' ? { ...existingMetadata } : {};
  const existingTeamReel =
    meta.teamreel_assets && typeof meta.teamreel_assets === 'object'
      ? meta.teamreel_assets
      : meta.teamreelAssets && typeof meta.teamreelAssets === 'object'
        ? meta.teamreelAssets
        : {};

  const media: Record<string, { url: string; caption: string }> = {};
  for (const slot of MEDIA_SLOTS) {
    media[slot.id] = {
      url: form[slot.id]?.url || '',
      caption: form[slot.id]?.caption || '',
    };
  }

  const next: Record<string, any> = {
    ...existingTeamReel,
    media,
    kit: {
      profile_photo_url: form.profile?.url || '',
      full_body_url: form.kit?.url || '',
      intro_text: form.intro?.caption || '',
      goal_celebration_url: form.celebration?.url || '',
    },
    old: {
      profile_photo_url: form.legacy_photo?.url || '',
      full_body_url: '',
    },
  };

  if (videoVariants) {
    next.images = {
      fullbody: videoVariants.fullbody || {},
      halfbody: videoVariants.halfbody || {},
      closeup: videoVariants.closeup || {},
      action_photo: videoVariants.action_photo || {},
    };
    next.videos = {
      intro: videoVariants.intro || {},
      celebration: videoVariants.celebration || {},
      then_vs_now: videoVariants.then_vs_now || {},
      photo_composite: videoVariants.photo_composite || {},
      walking_composite: videoVariants.walking_composite || {},
    };
  } else {
    if (existingTeamReel.images) next.images = existingTeamReel.images;
    if (existingTeamReel.videos) next.videos = existingTeamReel.videos;
  }

  meta.teamreel_assets = next;
  return meta;
}

export function getVariantDisplayUrl(val: AssetVariantRaw | null | undefined): string | null {
  return getBestUrl(val);
}

export function getVariantRawUrl(val: AssetVariantRaw | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val || null;
  return val.raw || val.processed || null;
}

// ─── API helpers ─────────────────────────────────────────────────────

export async function triggerAssetProcessing(
  apiBaseUrl: string,
  membershipId: string,
  assetType: string,
  kitType: string,
  variantId?: string | null,
  role?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.post('/video/jobs/process-asset/', {
      membership_id: membershipId,
      asset_type: assetType,
      kit_type: kitType,
      variant_id: variantId || null,
      ...(role ? { role } : {}),
    });
    return { ok: true };
  } catch (e) {
    logger.error('Process asset error', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function cancelAssetProcessing(
  apiBaseUrl: string,
  membershipId: string,
  assetType: string,
  kitType: string,
  variantId?: string | null,
  force?: boolean,
  role?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.post('/video/jobs/cancel-asset-processing/', {
      membership_id: membershipId,
      asset_type: assetType,
      kit_type: kitType,
      variant_id: variantId || null,
      force: force || false,
      ...(role ? { role } : {}),
    });
    return { ok: true };
  } catch (e) {
    logger.error('Cancel asset processing error', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function pollProcessingResult(
  apiBaseUrl: string,
  projectId: string,
  membershipId: string,
  assetType: string,
  kitType: string,
  variantId: string | null | undefined,
  setMembershipFn: (m: MembershipRecord) => void,
  abortSignal?: AbortSignal,
): Promise<void> {
  const POLL_INTERVAL = 3000;
  const isImage = assetType === 'fullbody' || assetType === 'halfbody' || assetType === 'closeup';
  const MAX_POLLS = isImage ? 80 : 200;
  const compositeKey = variantId ? `${kitType}_${variantId}` : kitType;

  for (let i = 0; i < MAX_POLLS; i++) {
    if (abortSignal?.aborted) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    if (abortSignal?.aborted) return;

    try {
      const mData = await api.get<MembershipRecord>(
        `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
      );
      const tr = mData?.metadata?.teamreel_assets || mData?.metadata?.teamreelAssets || {};

      let checkVal: unknown = null;
      if (isImage) {
        checkVal = ((tr.images || {})[assetType] || {})[kitType];
      } else {
        checkVal = ((tr.videos || {})[assetType] || {})[compositeKey];
      }

      if (checkVal && typeof checkVal === 'object') {
        const state = (checkVal as Record<string, unknown>).processing_state;
        if (state === 'processed' || state === 'failed' || state === 'cancelled') {
          setMembershipFn(mData);
          return;
        }
      }
    } catch {
      // Network error — keep trying
    }
  }

  // Polling timed out — force-cancel
  if (!abortSignal?.aborted) {
    try {
      await api.post('/video/jobs/cancel-asset-processing/', {
        membership_id: membershipId,
        asset_type: assetType,
        kit_type: kitType,
        variant_id: variantId || null,
        force: true,
      });
      try {
        const mData = await api.get<MembershipRecord>(
          `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
        );
        setMembershipFn(mData);
      } catch {
        // Best-effort
      }
    } catch {
      // Best-effort cleanup
    }
  }
}
