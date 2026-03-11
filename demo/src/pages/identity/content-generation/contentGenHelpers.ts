/**
 * Content generation helper functions.
 *
 * Pure functions for asset checking, participation grouping, and member utilities.
 */

import type { Participation } from './types';
import { ASSET_TYPE_TO_MEDIA_KEY } from './contentGenConstants';

// Helper to detect mime type from base64 signature
export const getSecureMimeType = (base64: string | null, declaredType: string | null): string => {
  if (!base64) return declaredType || 'image/png';
  // JPEG signature
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  // PNG signature
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  // GIF signature
  if (base64.startsWith('R0lGODdh') || base64.startsWith('R0lGODlh')) return 'image/gif';
  // WebP signature
  if (base64.startsWith('UklGR')) return 'image/webp';
  return declaredType || 'image/png';
};

// Group participations by functional role
export function groupParticipationsByRole(participations: Participation[]): Record<string, Participation[]> {
  const groups: Record<string, Participation[]> = {
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  };

  for (const p of participations) {
    // Check functional_roles first (can be an array)
    const functionalRoles = p.functional_roles || [];

    if (functionalRoles.includes('goalkeeper')) {
      groups.goalkeeper.push(p);
    } else if (functionalRoles.includes('coach')) {
      groups.coach.push(p);
    } else if (functionalRoles.includes('assistant')) {
      groups.assistant.push(p);
    } else if (functionalRoles.some((r: string) => ['player', 'defender', 'midfielder', 'forward', 'attacker'].includes(r))) {
      groups.player.push(p);
    } else if (p.role === 'goalkeeper') {
      groups.goalkeeper.push(p);
    } else if (p.role === 'coach') {
      groups.coach.push(p);
    } else if (p.role === 'assistant') {
      groups.assistant.push(p);
    } else {
      // Default to player
      groups.player.push(p);
    }
  }

  return groups;
}

// Check if a member has a specific asset, optionally verifying role-specific variant
export function memberHasAsset(member: Participation, assetType: string, role?: string): boolean {
  const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;

  // Get the metadata from either user or member
  const meta = (member.metadata as Record<string, unknown>) || {};

  // Check teamreel_assets structure introduced by /api/v1/projects/{id}/members/ enrichment
  const teamreelAssets = meta.teamreel_assets as Record<string, unknown> | undefined;
  if (teamreelAssets) {
    const images = teamreelAssets.images as Record<string, unknown> | undefined;
    const videos = teamreelAssets.videos as Record<string, unknown> | undefined;

    // Check legacy photo (variant keyed lookup e.g. legacy_photo['home'])
    if (mediaKey === 'legacy_photo' && images?.legacy_photo) {
      const legacyObj = images.legacy_photo as Record<string, unknown>;
      if (role && legacyObj[role]) return true;
      if (Object.keys(legacyObj).length > 0) return true;
    }

    // For other images, check presence in images map
    if (images && mediaKey in images) {
      const assetData = images[mediaKey] as unknown;
      if (assetData)  {
        // May be keyed by variant
        if (typeof assetData === 'object' && assetData !== null && Object.keys(assetData).length > 0) return true;
        if (typeof assetData === 'string') return true;
      }
    }

    // Check videos (short_intro, celebration)
    if (videos && mediaKey in videos) {
      const vidData = videos[mediaKey] as unknown;
      if (vidData) {
        if (typeof vidData === 'object' && vidData !== null && Object.keys(vidData).length > 0) return true;
        if (typeof vidData === 'string') return true;
      }
    }
  }

  // Fallback: check flat metadata keys (older format)
  if ((meta[mediaKey] as unknown)) {
    const val = meta[mediaKey] as unknown;
    if (val && typeof val === 'object' && (val as Record<string, unknown>).processed) return true;
    if (val && typeof val === 'object' && (val as Record<string, unknown>).raw) return true;
    if (typeof val === 'string') return true;
  }

  return false;
}

// Check if a member has all required assets
export function memberHasRequiredAssets(member: Participation, assetTypes: string[], role?: string): boolean {
  return assetTypes.every(type => memberHasAsset(member, type, role));
}

// Get list of missing assets for a member
export function getMissingAssets(member: Participation, assetTypes: string[], role?: string): string[] {
  return assetTypes.filter(type => !memberHasAsset(member, type, role));
}

// Get member display name
export function getMemberName(p: Participation): string {
  const user = p.user || p.member;
  if (!user) return 'Unknown';
  if ('name' in user && user.name) return user.name;
  if ('user_name' in user && user.user_name) return user.user_name;
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName) return fullName;
  if ('email' in user && user.email) return user.email;
  return 'Unknown';
}
