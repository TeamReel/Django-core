import type { TeamreelAssets } from '../../../utils/assetMetadata';

/* ── Types ──────────────────────────────── */

interface SquadMemberUser {
  id?: string;
  name?: string;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface SquadMember {
  id: string;
  isGuest?: boolean;
  user?: SquadMemberUser;
  member?: SquadMemberUser;
  metadata?: { shirt_number?: string; [key: string]: unknown };
  data?: {
    jersey_number?: string;
    functional_role?: string;
    [key: string]: unknown;
  };
  functional_roles?: string[];
}

/* ── Helpers ──────────────────────────────── */

export const getSquadMemberName = (p: SquadMember): string => {
  const user = p.user || p.member;
  if (!user) return 'Unknown';
  if (user.name) return user.name;
  if (user.user_name) return user.user_name;
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (full) return full;
  if (user.email) return user.email;
  return 'Unknown';
};

export const getUserKey = (p: SquadMember): string => {
  const user = p.user || p.member;
  if (user?.id) return String(user.id);
  return String(p.id);
};

export const sortByName = (a: SquadMember, b: SquadMember): number =>
  getSquadMemberName(a).localeCompare(getSquadMemberName(b), 'nl');

/* ── Asset availability helpers ──────────── */

const IMAGE_TYPES = ['fullbody', 'halfbody', 'closeup'] as const;

export const hasLineupAsset = (
  assets: TeamreelAssets | undefined,
  role: string,
  kit: string,
): boolean => {
  if (!assets) return false;
  const raw = assets as Record<string, unknown>;

  // 1. New nested: roles.{role}.images.{type}.{kit}
  const roleImages = assets.roles?.[role]?.images;
  if (roleImages) {
    for (const type of IMAGE_TYPES) {
      const img = roleImages[type] as Record<string, unknown> | undefined;
      if (img && img[kit]) return true;
    }
  }

  // 2. Legacy flat: images.{type}.{kit}
  const legacyImages = raw.images as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (legacyImages) {
    for (const type of IMAGE_TYPES) {
      if (legacyImages[type]?.[kit]) return true;
    }
  }

  // 3. Media alias: media.kit (only for player/home)
  if (kit === 'home') {
    const media = raw.media as
      | Record<string, { url?: string }>
      | undefined;
    if (media?.kit?.url) return true;
  }

  return false;
};

export const hasKeeperAsset = (p: SquadMember): boolean => {
  if (p.isGuest) return true;
  const assets = (p.metadata as Record<string, unknown>)?.teamreel_assets as
    | TeamreelAssets
    | undefined;
  return hasLineupAsset(assets, 'keeper', 'goalkeeper');
};

export const hasPlayerAsset = (p: SquadMember): boolean => {
  if (p.isGuest) return true;
  const assets = (p.metadata as Record<string, unknown>)?.teamreel_assets as
    | TeamreelAssets
    | undefined;
  return hasLineupAsset(assets, 'player', 'home');
};
