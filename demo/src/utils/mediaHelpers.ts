/**
 * Media Helper Functions
 *
 * Utility functions for working with member media slots and TeamReel assets.
 */

import { MEDIA_SLOTS, MediaSlotId, MemberMediaForm } from '../constants/mediaSlots';

/** Membership-like object carrying TeamReel media metadata. */
interface MembershipWithMedia {
  user?: { avatar_url?: string | null; [key: string]: unknown };
  metadata?: {
    teamreel_assets?: TeamReelAssets;
    teamreelAssets?: TeamReelAssets;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface TeamReelAssets {
  roles?: Record<string, {
    images?: Record<string, Record<string, Record<string, unknown>>>;
    videos?: Record<string, Record<string, Record<string, unknown>>>;
  }>;
  media?: Record<string, { url?: string; caption?: string }>;
  images?: Record<string, Record<string, unknown>>;
  videos?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Check if a membership has media for a specific slot
 * For the 'profile' slot, also considers user.avatar_url as a valid photo source.
 */
export function memberHasMedia(membership: MembershipWithMedia, slotId: MediaSlotId): boolean {
  // Profile slot: also count user.avatar_url as a valid profile photo
  if (slotId === 'profile') {
    const avatarUrl = membership?.user?.avatar_url;
    if (avatarUrl) return true;
  }
  const tr = membership?.metadata?.teamreel_assets;
  const media = tr?.media;
  // Check flat media slot
  if (media?.[slotId]?.url || media?.[slotId]?.caption) return true;
  // Legacy slot: also check images.fullbody.legacy
  if (slotId === 'legacy') {
    const legacyVariant = (tr as Record<string, any>)?.images?.fullbody?.legacy;
    if (legacyVariant?.raw || legacyVariant?.processed) return true;
  }
  return false;
}

/**
 * Count how many media slots are filled for a membership
 */
export function countFilledMediaSlots(membership: MembershipWithMedia): number {
  return MEDIA_SLOTS.filter((slot) => memberHasMedia(membership, slot.id)).length;
}

/**
 * Check if a membership has all media slots filled
 */
export function hasAllMediaSlots(membership: MembershipWithMedia): boolean {
  return countFilledMediaSlots(membership) === MEDIA_SLOTS.length;
}

/**
 * Get completion percentage for media slots
 */
export function getMediaCompletionPercent(membership: MembershipWithMedia): number {
  return (countFilledMediaSlots(membership) / MEDIA_SLOTS.length) * 100;
}

/**
 * Create an empty media form with all slots initialized
 */
export function createEmptyMediaForm(): MemberMediaForm {
  return MEDIA_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = { url: '', caption: '' };
    return acc;
  }, {} as MemberMediaForm);
}

/**
 * Read TeamReel assets from membership metadata into form structure
 */
export function readAssetsFromMembership(membership: MembershipWithMedia): MemberMediaForm {
  const meta = membership?.metadata || {};
  const tr = meta?.teamreel_assets || meta?.teamreelAssets || {};
  const media = tr.media || {};
  const form = createEmptyMediaForm();

  for (const slot of MEDIA_SLOTS) {
    const slotData = media[slot.id];
    if (slotData) {
      form[slot.id] = {
        url: slotData.url || '',
        caption: slotData.caption || '',
      };
    }
  }

  return form;
}

/**
 * Merge form data back into membership metadata structure
 */
export function mergeAssetsIntoMetadata(existingMetadata: Record<string, unknown> | null | undefined, form: MemberMediaForm): Record<string, unknown> {
  const meta = existingMetadata ? JSON.parse(JSON.stringify(existingMetadata)) : {};
  const prev =
    meta.teamreel_assets && typeof meta.teamreel_assets === 'object'
      ? meta.teamreel_assets
      : {};

  const media: Record<string, { url: string; caption: string }> = {};

  for (const slot of MEDIA_SLOTS) {
    const urlVal = (form[slot.id]?.url || '').trim();
    const capVal = (form[slot.id]?.caption || '').trim();
    if (urlVal || capVal) {
      media[slot.id] = { url: urlVal, caption: capVal };
    }
  }

  const next = { ...prev, media };
  meta.teamreel_assets = next;

  return meta;
}

/**
 * Count how many media slots are processed (lineup-ready) for a membership.
 * Uses getMediaProcessingState which checks per-variant data, not just flat URLs.
 */
export function countProcessedMediaSlots(membership: MembershipWithMedia): number {
  return MEDIA_SLOTS.filter(
    (slot) => getMediaProcessingState(membership, slot.id) === 'processed',
  ).length;
}

/**
 * Count how many media slots have any content (not empty) for a membership.
 * Uses getMediaProcessingState which checks per-variant data.
 */
export function countNonEmptyMediaSlots(membership: MembershipWithMedia): number {
  return MEDIA_SLOTS.filter(
    (slot) => getMediaProcessingState(membership, slot.id) !== 'empty',
  ).length;
}

/**
 * Get media URL for a specific slot from membership
 */
export function getMediaUrl(membership: MembershipWithMedia, slotId: MediaSlotId): string | undefined {
  return membership?.metadata?.teamreel_assets?.media?.[slotId]?.url;
}

/**
 * Get media caption for a specific slot from membership
 */
export function getMediaCaption(membership: MembershipWithMedia, slotId: MediaSlotId): string | undefined {
  return membership?.metadata?.teamreel_assets?.media?.[slotId]?.caption;
}

/**
 * Mapping from flat media slot ID to per-variant category and storage branch.
 * Only for slots that support processing (AI-generated assets).
 *
 * - variantKey: if set, only check this specific variant (e.g. 'legacy')
 *   instead of all variants in the category.
 * - excludeVariants: if set, skip these variant keys (e.g. exclude 'legacy' for kit slot).
 */
const SLOT_TO_VARIANT_CATEGORY: Record<string, {
  branch: 'images' | 'videos';
  category: string;
  variantKey?: string;
  excludeVariants?: string[];
}> = {
  kit: { branch: 'images', category: 'fullbody', excludeVariants: ['legacy'] },
  closeup: { branch: 'images', category: 'closeup', excludeVariants: ['legacy'] },
  legacy: { branch: 'images', category: 'fullbody', variantKey: 'legacy' },
  intro: { branch: 'videos', category: 'intro' },
  celebration: { branch: 'videos', category: 'celebration' },
  then_vs_now: { branch: 'videos', category: 'then_vs_now' },
  photo_composite: { branch: 'videos', category: 'photo_composite' },
  walking_composite: { branch: 'videos', category: 'walking_composite' },
  action_photo: { branch: 'images', category: 'action_photo' },
};

/**
 * Get the processing status for a media slot:
 *  - 'empty'     — no asset at all
 *  - 'raw'       — has an asset but not processed (lineup-ready)
 *  - 'processing' — currently being processed
 *  - 'processed' — has a processed / lineup-ready version
 *
 * Checks both the flat media.{slot}.url AND the per-variant structure
 * (images.fullbody.*, videos.intro.*, etc.).
 */
export function getMediaProcessingState(
  membership: MembershipWithMedia,
  slotId: MediaSlotId,
): 'empty' | 'raw' | 'processing' | 'processed' {
  const tr = membership?.metadata?.teamreel_assets || {};

  // Check flat media slot first
  const flatUrl = tr?.media?.[slotId]?.url;

  const mapping = SLOT_TO_VARIANT_CATEGORY[slotId];
  if (!mapping) {
    // Non-processable slot (profile, legacy_photo) — binary check
    // For 'profile': also count user.avatar_url as a valid source
    if (slotId === 'profile') {
      const avatarUrl = membership?.user?.avatar_url;
      return (flatUrl || avatarUrl) ? 'processed' : 'empty';
    }
    return flatUrl ? 'processed' : 'empty';
  }

  // Check per-variant data across all roles — best state wins.
  // New nested format: roles.{role}.{branch}.{category}.{kit}.{variant}
  let hasRaw = false;
  let hasProcessing = false;
  let hasProcessed = false;

  const roles = tr?.roles;
  if (roles && typeof roles === 'object') {
    for (const roleData of Object.values(roles)) {
      if (!roleData || typeof roleData !== 'object') continue;
      const branchData = (roleData as Record<string, unknown>)?.[mapping.branch];
      if (!branchData || typeof branchData !== 'object') continue;
      const categoryData = (branchData as Record<string, unknown>)?.[mapping.category];
      if (!categoryData || typeof categoryData !== 'object') continue;

      // categoryData = { home: { default: {...}, arms_crossed: {...} }, away: {...} }
      for (const [kitKey, kitData] of Object.entries(categoryData as Record<string, unknown>)) {
        if (!kitData || typeof kitData !== 'object') continue;
        for (const [variantKey, val] of Object.entries(kitData as Record<string, unknown>)) {
          if (!val) continue;
          // Apply variantKey / excludeVariants filters using kit_variant composite key
          const compositeKey = `${kitKey}_${variantKey}`;
          if (mapping.variantKey && kitKey !== mapping.variantKey && variantKey !== mapping.variantKey && compositeKey !== mapping.variantKey) continue;
          if (mapping.excludeVariants?.includes(kitKey) || mapping.excludeVariants?.includes(variantKey) || mapping.excludeVariants?.includes(compositeKey)) continue;

          if (typeof val === 'string') {
            hasRaw = true;
            continue;
          }
          if (typeof val === 'object') {
            const v = val as Record<string, unknown>;
            const state = v.processing_state;
            if (state === 'processed' && v.processed) {
              if (v.processed === v.raw) {
                hasRaw = true;
              } else {
                hasProcessed = true;
              }
            } else if (state === 'processing') {
              hasProcessing = true;
            } else if (v.raw || v.processed) {
              hasRaw = true;
            }
          }
        }
      }
    }
  }

  // Legacy fallback: check root-level images/videos for pre-migration data
  if (!hasRaw && !hasProcessing && !hasProcessed) {
    const legacyBranch = tr?.[mapping.branch]?.[mapping.category];
    if (legacyBranch && typeof legacyBranch === 'object') {
      for (const [key, val] of Object.entries(legacyBranch)) {
        if (!val) continue;
        if (mapping.variantKey && key !== mapping.variantKey) continue;
        if (mapping.excludeVariants?.includes(key)) continue;

        if (typeof val === 'string') {
          hasRaw = true;
          continue;
        }
        if (typeof val === 'object') {
          const v = val as Record<string, unknown>;
          const state = v.processing_state;
          if (state === 'processed' && v.processed) {
            if (v.processed === v.raw) {
              hasRaw = true;
            } else {
              hasProcessed = true;
            }
          } else if (state === 'processing') {
            hasProcessing = true;
          } else if (v.raw || v.processed) {
            hasRaw = true;
          }
        }
      }
    }
  }

  if (hasProcessing) return 'processing';
  if (hasProcessed) return 'processed';
  if (hasRaw || flatUrl) return 'raw';
  return 'empty';
}
