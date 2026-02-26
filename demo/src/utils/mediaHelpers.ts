/**
 * Media Helper Functions
 *
 * Utility functions for working with member media slots and TeamReel assets.
 */

import { MEDIA_SLOTS, MediaSlotId, MemberMediaForm } from '../constants/mediaSlots';

/**
 * Check if a membership has media for a specific slot
 * For the 'profile' slot, also considers user.avatar_url as a valid photo source.
 */
export function memberHasMedia(membership: any, slotId: MediaSlotId): boolean {
  // Profile slot: also count user.avatar_url as a valid profile photo
  if (slotId === 'profile') {
    const avatarUrl = membership?.user?.avatar_url;
    if (avatarUrl) return true;
  }
  const media = membership?.metadata?.teamreel_assets?.media;
  if (!media) return false;
  const slot = media[slotId];
  return !!(slot?.url || slot?.caption);
}

/**
 * Count how many media slots are filled for a membership
 */
export function countFilledMediaSlots(membership: any): number {
  return MEDIA_SLOTS.filter((slot) => memberHasMedia(membership, slot.id)).length;
}

/**
 * Check if a membership has all media slots filled
 */
export function hasAllMediaSlots(membership: any): boolean {
  return countFilledMediaSlots(membership) === MEDIA_SLOTS.length;
}

/**
 * Get completion percentage for media slots
 */
export function getMediaCompletionPercent(membership: any): number {
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
export function readAssetsFromMembership(membership: any): MemberMediaForm {
  const meta = membership?.metadata || {};
  const tr = (meta as any)?.teamreel_assets || (meta as any)?.teamreelAssets || {};
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
export function mergeAssetsIntoMetadata(existingMetadata: any, form: MemberMediaForm): any {
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
export function countProcessedMediaSlots(membership: any): number {
  return MEDIA_SLOTS.filter(
    (slot) => getMediaProcessingState(membership, slot.id) === 'processed',
  ).length;
}

/**
 * Count how many media slots have any content (not empty) for a membership.
 * Uses getMediaProcessingState which checks per-variant data.
 */
export function countNonEmptyMediaSlots(membership: any): number {
  return MEDIA_SLOTS.filter(
    (slot) => getMediaProcessingState(membership, slot.id) !== 'empty',
  ).length;
}

/**
 * Get media URL for a specific slot from membership
 */
export function getMediaUrl(membership: any, slotId: MediaSlotId): string | undefined {
  return membership?.metadata?.teamreel_assets?.media?.[slotId]?.url;
}

/**
 * Get media caption for a specific slot from membership
 */
export function getMediaCaption(membership: any, slotId: MediaSlotId): string | undefined {
  return membership?.metadata?.teamreel_assets?.media?.[slotId]?.caption;
}

/**
 * Mapping from flat media slot ID to per-variant category and storage branch.
 * Only for slots that support processing (AI-generated assets).
 */
const SLOT_TO_VARIANT_CATEGORY: Record<string, { branch: 'images' | 'videos'; category: string }> = {
  kit: { branch: 'images', category: 'fullbody' },
  closeup: { branch: 'images', category: 'closeup' },
  intro: { branch: 'videos', category: 'intro' },
  celebration: { branch: 'videos', category: 'celebration' },
  then_vs_now: { branch: 'videos', category: 'then_vs_now' },
  photo_composite: { branch: 'images', category: 'photo_composite' },
  walking_composite: { branch: 'images', category: 'walking_composite' },
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
  membership: any,
  slotId: MediaSlotId,
): 'empty' | 'raw' | 'processing' | 'processed' {
  const tr = membership?.metadata?.teamreel_assets || {};

  // Check flat media slot first
  const flatUrl = tr?.media?.[slotId]?.url;

  const mapping = SLOT_TO_VARIANT_CATEGORY[slotId];
  if (!mapping) {
    // Non-processable slot (profile, legacy_photo, legacy) — binary check
    // For 'profile': also count user.avatar_url as a valid source
    if (slotId === 'profile') {
      const avatarUrl = membership?.user?.avatar_url;
      return (flatUrl || avatarUrl) ? 'processed' : 'empty';
    }
    return flatUrl ? 'processed' : 'empty';
  }

  // Check per-variant data (images.fullbody.home, videos.intro.home_*, etc.)
  const branchData = tr?.[mapping.branch]?.[mapping.category];
  if (!branchData || typeof branchData !== 'object') {
    return flatUrl ? 'raw' : 'empty';
  }

  // Check all variants in this category; best state wins
  let hasRaw = false;
  let hasProcessing = false;
  let hasProcessed = false;

  for (const val of Object.values(branchData)) {
    if (!val) continue;
    if (typeof val === 'string') {
      hasRaw = true;
      continue;
    }
    if (typeof val === 'object') {
      const v = val as Record<string, any>;
      const state = v.processing_state;
      if (state === 'processed' && v.processed) {
        // If processed URL equals raw URL, no actual processing happened
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

  if (hasProcessing) return 'processing';
  if (hasProcessed) return 'processed';
  if (hasRaw || flatUrl) return 'raw';
  return 'empty';
}
