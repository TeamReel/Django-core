import { getMediaUrl } from '../../utils/mediaHelpers';

/** Member/membership record from the API. */
export interface MemberRecord {
  id?: string;
  user?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  role?: string;
  functional_roles?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/* ── Name helpers ── */

export function getMemberName(m: MemberRecord): string {
  const u = m?.user || m;
  return (
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Lid'
  );
}

export function getInitials(m: MemberRecord): string {
  const u = m?.user || m;
  const f = String(u?.first_name || '').trim();
  const l = String(u?.last_name || '').trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  const email = String(u?.email || '').trim();
  if (email) return email[0].toUpperCase();
  return '?';
}

/* ── Role constants ── */

/** Map functional_roles array to display labels */
export const ROLE_LABELS: Record<string, string> = {
  player: 'Speler',
  coach: 'Coach',
  keeper: 'Keeper',
  supporter: 'Supporter',
};

/** Access role → TeamReel display name */
export const ACCESS_ROLE_LABELS: Record<string, string> = {
  admin: 'Team Admin',
  editor: 'Team Editor',
  viewer: 'Team Member',
};

export const ACCESS_ROLE_COLORS: Record<string, string> = {
  admin: 'var(--color-amber-400)',
  editor: 'var(--color-blue-500)',
  viewer: 'var(--color-neutral-400)',
};

export const ROLE_COLORS: Record<string, string> = {
  player: 'var(--color-blue-300)',
  coach: 'var(--color-amber-400)',
  keeper: 'var(--color-primary-400)',
  supporter: 'var(--color-neutral-300)',
};

/* ── Role accessors ── */

export function getFunctionalRoles(m: MemberRecord): string[] {
  const roles: string[] = Array.isArray(m?.functional_roles) ? [...m.functional_roles] : [];
  // Fallback: derive from access role
  if (roles.length === 0) {
    const accessRole = String(m?.role || '').trim().toLowerCase();
    if (accessRole === 'admin') roles.push('coach');
    else roles.push('player');
  }
  return [...new Set(roles)];
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
}

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] || 'var(--color-blue-300)';
}

export function getAccessRoleLabel(m: MemberRecord): string {
  const role = String(m?.role || '').trim().toLowerCase();
  return ACCESS_ROLE_LABELS[role] || 'Team Member';
}

export function getAccessRoleColor(m: MemberRecord): string {
  const role = String(m?.role || '').trim().toLowerCase();
  return ACCESS_ROLE_COLORS[role] || 'var(--color-neutral-400)';
}

/* ── Media URL resolution ── */

const S3_BASE = 'https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/';

/** Turn a relative S3 path into a full URL; pass through already-full URLs */
export function toFullUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${S3_BASE}${path}`;
}

/**
 * Resolve the best URL for a media slot, checking both flat and per-variant structures.
 * Per-variant: metadata.teamreel_assets.images.[category].[variant].processed|raw
 */
export function resolveMediaUrl(m: MemberRecord, slotId: string): string | null {
  // 1) Flat media URL
  const flat = (m?.metadata?.teamreel_assets as any)?.media?.[slotId]?.url;
  if (flat) return toFullUrl(flat);

  // 2) Per-variant structure
  const tr: any = m?.metadata?.teamreel_assets || {};
  const VARIANT_MAP: Record<string, { branch: string; category: string }> = {
    closeup: { branch: 'images', category: 'closeup' },
    kit: { branch: 'images', category: 'fullbody' },
    action_photo: { branch: 'images', category: 'action_photo' },
  };
  const mapping = VARIANT_MAP[slotId];
  if (mapping) {
    const branch = tr?.[mapping.branch]?.[mapping.category];
    if (branch && typeof branch === 'object') {
      for (const [_key, val] of Object.entries(branch)) {
        if (!val || typeof val !== 'object') continue;
        const v = val as Record<string, any>;
        if (v.processed && typeof v.processed === 'string') return toFullUrl(v.processed);
        if (v.raw && typeof v.raw === 'string') return toFullUrl(v.raw);
      }
    }
  }

  return null;
}

/** Get best available photo */
export function getMemberPhoto(m: MemberRecord): string | null {
  const closeup = resolveMediaUrl(m, 'closeup');
  if (closeup) return closeup;
  const kit = resolveMediaUrl(m, 'kit');
  if (kit) return kit;
  const profile = getMediaUrl(m, 'profile');
  if (profile) return toFullUrl(profile);
  const avatarUrl = m?.user?.avatar_url;
  if (avatarUrl) return avatarUrl;
  return null;
}
