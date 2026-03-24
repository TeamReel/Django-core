/**
 * Asset status helpers for the "Mijn Team" hub.
 *
 * Checks completion of the 6 tracked media slots per member,
 * and club/team brand asset presence.
 *
 * Reads from roles.{role}.images/videos nested structure.
 * When no role is given, checks across all roles.
 */
import { getMediaProcessingState } from './mediaHelpers';
import {
  ASSET_TYPES_BY_ROLE,
  ROLE_KIT_MAP,
  iterVariants,
  mediaTypeForAsset,
  getAssetRoles,
} from './assetMetadata';
import type { TeamreelAssets } from './assetMetadata';
import type { MediaSlotId } from '../constants/mediaSlots';

const TRACKED_SLOT_IDS: MediaSlotId[] = ['profile', 'closeup', 'intro', 'celebration', 'then_vs_now', 'action_photo'];

export interface MemberAssetStatus {
  status: 'complete' | 'partial' | 'empty';
  filled: number;
  total: number;
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
    status: filled === 6 ? 'complete' : filled > 0 ? 'partial' : 'empty',
    filled,
    total: 6,
  };
}

/** Per-slot breakdown for asset-matrix views. */
export function getMemberSlotPresence(member: Record<string, unknown>): MemberSlotPresence[] {
  return TRACKED_SLOT_IDS.map((slotId) => {
    const state = getMediaProcessingState(member, slotId);
    return { slotId, present: state === 'processed' || state === 'raw' };
  });
}

/* ── Per-role asset status ────────────────────────────────────────────── */

export interface RoleAssetStatus {
  role: string;
  filled: number;
  total: number;
  status: 'complete' | 'partial' | 'empty';
  /** Per asset-type presence for this role. */
  types: Array<{ assetType: string; present: boolean }>;
}

/**
 * Calculate asset completeness for a single role.
 * Checks the tracked asset types for that role (from ASSET_TYPES_BY_ROLE)
 * across all kits, counting a type as filled if any kit has data.
 */
export function getMemberAssetStatusForRole(
  member: Record<string, unknown>,
  role: string,
): RoleAssetStatus {
  const assets = (member?.metadata as Record<string, unknown> | undefined)
    ?.teamreel_assets as TeamreelAssets | undefined;
  const trackedTypes = ASSET_TYPES_BY_ROLE[role] ?? ASSET_TYPES_BY_ROLE['player'] ?? [];
  const total = trackedTypes.length;
  let filled = 0;
  const types: Array<{ assetType: string; present: boolean }> = [];

  for (const assetType of trackedTypes) {
    const mt = mediaTypeForAsset(assetType);
    const variants = iterVariants(assets, role, mt, assetType);
    const hasData = variants.some((v) => {
      if (!v.value) return false;
      if (typeof v.value === 'string') return true;
      return !!(v.value.raw || v.value.processed);
    });
    if (hasData) filled++;
    types.push({ assetType, present: hasData });
  }

  return {
    role,
    filled,
    total,
    status: total === 0 ? 'empty' : filled === total ? 'complete' : filled > 0 ? 'partial' : 'empty',
    types,
  };
}

/**
 * Get asset status for all roles a member has.
 * Returns an array of per-role statuses + an overall weighted score.
 */
export function getMemberRoleStatuses(
  member: Record<string, unknown>,
): { roles: RoleAssetStatus[]; overallScore: number } {
  const assets = (member?.metadata as Record<string, unknown> | undefined)
    ?.teamreel_assets as TeamreelAssets | undefined;
  const memberRoles = getAssetRoles(assets);
  // Fallback: if no role data, check functional_roles
  const funcRoles = (member as Record<string, unknown>).functional_roles as string[] | undefined;
  const roles = memberRoles.length > 0 ? memberRoles : (funcRoles && funcRoles.length > 0 ? funcRoles : ['player']);

  const statuses = roles
    .filter((r) => ROLE_KIT_MAP[r]?.kits.length > 0)
    .map((r) => getMemberAssetStatusForRole(member, r));

  const totalSlots = statuses.reduce((sum, s) => sum + s.total, 0);
  const totalFilled = statuses.reduce((sum, s) => sum + s.filled, 0);
  const overallScore = totalSlots > 0 ? Math.round((totalFilled / totalSlots) * 100) : 0;

  return { roles: statuses, overallScore };
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
