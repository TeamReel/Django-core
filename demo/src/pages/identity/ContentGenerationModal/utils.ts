/**
 * ContentGenerationModal — Utility functions
 */
import type { Participation } from './types';
import { ASSET_TYPE_TO_MEDIA_KEY } from './constants';

/** Get CSRF token from cookie */
export { getCsrfToken } from '@/utils/csrf';

/** Detect mime type from base64 signature */
export const getSecureMimeType = (base64: string | null, declaredType: string | null): string => {
  if (!base64) return declaredType || 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('R0lGODdh') || base64.startsWith('R0lGODlh')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return declaredType || 'image/png';
};

/** Check if a member has a specific asset, optionally verifying role-specific variant */
export function memberHasAsset(member: Participation, assetType: string, role?: string): boolean {
  const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;
  const meta = member.metadata || {};
  const tr = (meta as Record<string, any>)?.teamreel_assets || {};

  const media = tr?.media || {};
  const videos = tr?.videos || {};
  const images = tr?.images || {};
  const legacyKit = tr?.kit || {};

  // Direct check in media slots
  if (media[mediaKey] && (typeof media[mediaKey] === 'string' || media[mediaKey]?.url)) return true;

  // Check new images structure: images.{type}.{variant}
  const imageStructureKey = mediaKey === 'kit' ? 'fullbody' : mediaKey;
  const imageGroup = images[imageStructureKey] || images[assetType] || images[mediaKey];
  if (imageGroup && typeof imageGroup === 'object') {
    // Determine which role keys are valid for this member
    let roleKeys: string[] = ['home']; // Default for player
    if (role === 'goalkeeper') {
      roleKeys = ['home', 'keeper_home'];
    } else if (role === 'coach' || role === 'assistant') {
      roleKeys = ['home'];
    }

    const hasMatchingVariant = Object.keys(imageGroup).some(key => {
      const normalizedKey = key.toLowerCase();
      return roleKeys.some(rk => normalizedKey.includes(rk));
    });
    if (hasMatchingVariant) return true;

    // Check for any variant if no role-specific variants found
    const hasImageAsset = roleKeys.some(roleKey =>
      Object.keys(imageGroup).some(k => k.toLowerCase().includes(roleKey))
    );
    if (hasImageAsset || Object.keys(imageGroup).length > 0) return true;
  }

  // Check videos structure
  const variants = videos[mediaKey];
  if (variants && typeof variants === 'object') {
    const hasRoleVariant = Object.keys(variants).some(k => {
      const normalizedKey = k.toLowerCase();
      return normalizedKey.includes('home') || normalizedKey.includes('away');
    });
    if (hasRoleVariant) return true;
  }

  // Legacy kit check
  if (assetType === 'in_tenue' || assetType === 'full_body') {
    if (legacyKit?.home || legacyKit?.away || legacyKit?.keeper_home) return true;
  }

  return false;
}

/** Check if a member has ALL required assets */
export function memberHasRequiredAssets(member: Participation, assetTypes: string[], role?: string): boolean {
  if (!assetTypes || assetTypes.length === 0) return true;
  return assetTypes.every(assetType => memberHasAsset(member, assetType, role));
}

/** Get list of missing assets for a member */
export function getMissingAssets(member: Participation, assetTypes: string[], role?: string): string[] {
  if (!assetTypes || assetTypes.length === 0) return [];
  return assetTypes.filter(assetType => !memberHasAsset(member, assetType, role));
}

/** Group participations by functional role */
export function groupParticipationsByRole(participations: Participation[]): Record<string, Participation[]> {
  const groups: Record<string, Participation[]> = {
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  };

  participations.forEach(p => {
    let roles: string[] = [];
    if (p.functional_roles && Array.isArray(p.functional_roles) && p.functional_roles.length > 0) {
      roles = p.functional_roles;
    } else if (p.metadata?.functional_roles && Array.isArray(p.metadata.functional_roles) && p.metadata.functional_roles.length > 0) {
      roles = p.metadata.functional_roles;
    } else if (p.data?.functional_role) {
      roles = [p.data.functional_role];
    } else if (p.metadata?.team_role) {
      roles = [p.metadata.team_role];
    } else {
      roles = ['player'];
    }

    roles.forEach(role => {
      const normalizedRole = role.toLowerCase();
      if (groups[normalizedRole]) {
        groups[normalizedRole].push(p);
      }
    });
  });

  return groups;
}

/** Extract member name from participation */
export function getMemberName(p: Participation): string {
  const user = p.user || p.member;
  if (!user) return 'Onbekend';
  if ('name' in user && user.name) return user.name;
  if ('user_name' in user && user.user_name) return user.user_name;
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName) return fullName;
  if ('email' in user && user.email) return user.email;
  return 'Onbekend';
}

/** Get display label for a role */
export function renderRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    goalkeeper: 'Keepers',
    player: 'Spelers',
    coach: 'Coaches',
    assistant: 'Assistenten',
  };
  return roleLabels[role] || (role.charAt(0).toUpperCase() + role.slice(1) + 's');
}
