/**
 * Media Helper Functions
 *
 * Utility functions for working with member media slots and TeamReel assets.
 */

import { MEDIA_SLOTS, MediaSlotId, MemberMediaForm } from '../constants/mediaSlots';

/**
 * Check if a membership has media for a specific slot
 */
export function memberHasMedia(membership: any, slotId: MediaSlotId): boolean {
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
