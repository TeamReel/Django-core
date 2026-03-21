/**
 * Asset status helpers for the "Mijn Team" hub.
 *
 * Checks completion of the 5 tracked media slots per member,
 * and club/team brand asset presence.
 */
import { getMediaProcessingState } from './mediaHelpers';
import type { MediaSlotId } from '../constants/mediaSlots';

const TRACKED_SLOT_IDS: MediaSlotId[] = ['profile', 'kit', 'closeup', 'intro', 'celebration'];

export interface MemberAssetStatus {
  status: 'complete' | 'partial' | 'empty';
  filled: number;
  total: 5;
}

/** Per-slot presence for a single member. */
export interface MemberSlotPresence {
  slotId: MediaSlotId;
  present: boolean;
}

/**
 * Calculate asset completion status for a single member.
 * Works with the loose `Record<string, unknown>` shape returned by the members API.
 */
export function getMemberAssetStatus(member: Record<string, unknown>): MemberAssetStatus {
  let filled = 0;
  for (const slotId of TRACKED_SLOT_IDS) {
    const state = getMediaProcessingState(member, slotId);
    if (state === 'processed' || state === 'raw') {
      filled++;
    }
  }
  return {
    status: filled === 5 ? 'complete' : filled > 0 ? 'partial' : 'empty',
    filled,
    total: 5,
  };
}

/** Per-slot breakdown for asset-matrix views. */
export function getMemberSlotPresence(member: Record<string, unknown>): MemberSlotPresence[] {
  return TRACKED_SLOT_IDS.map((slotId) => {
    const state = getMediaProcessingState(member, slotId);
    return { slotId, present: state === 'processed' || state === 'raw' };
  });
}

/** Check club-level brand assets (logo + sponsor). */
export function getClubAssetStatus(
  brandLogoUrl?: string | null,
  brandSponsorUrl?: string | null,
): 'complete' | 'incomplete' {
  return brandLogoUrl && brandSponsorUrl ? 'complete' : 'incomplete';
}

/** Check team-level brand assets (at least home kit present). */
export function getTeamAssetStatus(
  batchBrandKits?: Record<string, string | null>,
): 'complete' | 'incomplete' {
  if (!batchBrandKits) return 'incomplete';
  return batchBrandKits.home ? 'complete' : 'incomplete';
}

/** Count how many members have all 5 slots filled. */
export function getMemberAssetSummary(members: Record<string, unknown>[]): {
  complete: number;
  partial: number;
  empty: number;
  total: number;
} {
  let complete = 0;
  let partial = 0;
  let empty = 0;
  for (const m of members) {
    const s = getMemberAssetStatus(m);
    if (s.status === 'complete') complete++;
    else if (s.status === 'partial') partial++;
    else empty++;
  }
  return { complete, partial, empty, total: members.length };
}
