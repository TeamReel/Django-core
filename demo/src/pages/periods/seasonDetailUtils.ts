/**
 * Pure helper functions extracted from ProjectSeasonDetailPage.
 * These have NO dependency on React component state.
 */

import { apiFetch } from '@/utils/apiFetch';

// ─── Helper types ─────────────────────────────────────────────────────────────

interface MemberRecord {
  user?: { id?: string | number; name?: string; first_name?: string; last_name?: string; email?: string };
  user_id?: string | number;
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  functional_roles?: unknown[];
  functionalRoles?: unknown[];
  metadata?: Record<string, unknown>;
}

// ─── Membership helpers ──────────────────────────────────────────────────────────

export const getUserId = (m: MemberRecord | null | undefined): string => {
  const u = m?.user || m;
  const id = u?.id ?? m?.user_id;
  return String(id || '').trim();
};

export const getUserLabel = (m: MemberRecord | null | undefined): { name: string; email: string } => {
  const u = m?.user || m;
  const name =
    u?.name ||
    `${u?.first_name || ''} ${u?.last_name || ''}`.trim() ||
    String(u?.email || '').trim() ||
    '""';
  const email = String(u?.email || '').trim() || '""';
  return { name, email };
};

// ─── Access-role helpers ─────────────────────────────────────────────

export const normalizeAccessRole = (raw: unknown): 'viewer' | 'editor' | 'admin' => {
  const role = String(raw || '').trim().toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'editor') return 'editor';
  if (role === 'viewer') return 'viewer';
  if (['coach', 'trainer'].includes(role)) return 'editor';
  if (['manager', 'owner'].includes(role)) return 'admin';
  return 'viewer';
};

/** Map membership role + project level → RBAC display label */
export const getRbacLabel = (membershipRole: string, isTeamRoute: boolean): string => {
  const role = normalizeAccessRole(membershipRole);
  if (role === 'admin') return isTeamRoute ? 'Team Admin' : 'Club Admin';
  return isTeamRoute ? 'Team Member' : 'Supporter';
};

export type AccessRoleOption = {
  value: 'admin' | 'viewer';
  label: string;
  description: string;
  icon: string;
};

/** Access role options for the current project level */
export const getAccessRoleOptions = (isTeamRoute: boolean): AccessRoleOption[] =>
  isTeamRoute
    ? [
        { value: 'admin', label: 'Team Admin', description: 'Volledige toegang: wedstrijden, content, lineups, profielen', icon: 'shield' },
        { value: 'viewer', label: 'Team Member', description: 'Beperkt: eigen content & profiel bewerken, rest alleen bekijken', icon: 'user' },
      ]
    : [
        { value: 'admin', label: 'Club Admin', description: 'Volledige toegang: club, teams, wedstrijden, content', icon: 'landmark' },
        { value: 'viewer', label: 'Supporter', description: 'Alleen-lezen: wedstrijden bekijken', icon: 'eye' },
      ];

// ─── Functional-role helpers ─────────────────────────────────────────

export const getFunctionalRolesFromMembership = (m: MemberRecord | null | undefined): string[] => {
  // Try top-level functional_roles field first (from API)
  const direct = m?.functional_roles ?? m?.functionalRoles;
  if (Array.isArray(direct) && direct.length > 0) {
    return direct.map((r: unknown) => String(r || '').trim()).filter(Boolean);
  }

  // Then try metadata.functional_roles (where we save it)
  const meta = m?.metadata || {};
  if (Array.isArray(meta.functional_roles) && meta.functional_roles.length > 0) {
    return (meta.functional_roles as unknown[]).map((r: unknown) => String(r || '').trim()).filter(Boolean);
  }

  // Legacy single role fields
  const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
  return legacy ? [legacy] : [];
};

// ─── Match / competition count helpers ───────────────────────────────

export const getMatchParticipantsCount = (match: unknown): number => {
  if (!match || typeof match !== 'object') return 0;
  const m = match as Record<string, unknown>;
  const direct = Number(
    m?.participants_count ??
      m?.participations_count ??
      m?.participantsCount ??
      m?.participationsCount
  );
  if (Number.isFinite(direct) && direct >= 0) return direct;

  const maybeParticipants = m?.participants;
  if (Array.isArray(maybeParticipants)) return maybeParticipants.length;
  const maybeParticipations = m?.participations;
  if (Array.isArray(maybeParticipations)) return maybeParticipations.length;

  return 0;
};

// ─── Network helpers ─────────────────────────────────────────────────

export const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const getRetryDelayMsFromResponse = async (res: Response): Promise<number | null> => {
  const header = res.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.max(500, Math.round(seconds * 1000));
  }

  try {
    const rawText = await res.text();
    const match = rawText.match(/Expected available in\s+(\d+)\s+seconds/i);
    if (match?.[1]) {
      const seconds = Number(match[1]);
      if (Number.isFinite(seconds) && seconds > 0) return Math.max(500, Math.round(seconds * 1000));
    }
  } catch {
    // ignore
  }

  return null;
};

export const fetchWithThrottleRetry = async (
  input: RequestInfo | URL,
  init: RequestInit,
  opts?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<Response> => {
  const maxAttempts = opts?.maxAttempts ?? 6;
  const baseDelayMs = opts?.baseDelayMs ?? 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await apiFetch(String(input), init);

    if (res.status !== 429 || attempt === maxAttempts) return res;

    const retryDelayMs = (await getRetryDelayMsFromResponse(res)) ?? baseDelayMs * attempt;
    await sleep(Math.min(60_000, retryDelayMs));
  }
  // Unreachable — loop always returns
  throw new Error('fetchWithRetry: exhausted all attempts');
};
