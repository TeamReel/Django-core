/**
 * Shared type definitions for the Season hierarchy pages.
 *
 * These are the lightweight API-response types used across
 * SeasonDetailPage, CompetitionDetailPage, MatchDetailPage,
 * and MemberDetailPage.  They intentionally differ from the
 * heavier `types/index.ts` Organisation / Project which carry
 * many fields the season pages never read.
 */

// ── Period (Season / Competition / Round) ──────────────────────────────

/** Sportstype nested on a Period. */
export type PeriodSport = {
  id: string | number;
  name: string;
  slug?: string;
  sport_icon?: string | null;
  category_name?: string | null;
  is_variant?: boolean;
  parent_sport_id?: number | null;
};

/** Period (Season, Competition, Round, etc.) as returned by the Periods API. */
export type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date?: string;
  end_date?: string;
  type?: string;
  period_type?: string;
  parent_period?: { id: string; name: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  matches_count?: number;
  children_matches_count?: number;
  sport_id?: string | number | null;
  sport?: PeriodSport | null;
};

// ── Project (Club / Team) ──────────────────────────────────────────────

/** Project as embedded in season-hierarchy responses. */
export type SeasonProject = {
  id: string;
  name: string;
  slug?: string;
  organisation?: any;
  metadata?: Record<string, any>;
};

// ── Organisation ───────────────────────────────────────────────────────

/** Organisation sport nested on the org response. */
export type OrgSport = {
  id: string | number;
  name: string;
  slug: string;
  sport_icon?: string;
  parent_sport_id?: number | null;
};

/** Organisation as returned by the Organisations detail API. */
export type SeasonOrganisation = {
  id: string;
  name: string;
  slug?: string;
  user_role?: 'admin' | 'member' | string;
  sport?: OrgSport | null;
};

// ── Generic list envelope ──────────────────────────────────────────────

export type ListResponse<T> = {
  results: T[];
  count: number;
};

// ── Utility helpers ────────────────────────────────────────────────────

/** Unwrap the `{ status, data }` envelope returned by most API endpoints. */
export function unwrapEnvelope<T = any>(raw: any): T {
  // Handle double-nested: { data: { data: {...} } }
  const candidate = raw?.data?.data;
  if (candidate && typeof candidate === 'object' && candidate.id) return candidate as T;
  return (raw?.data ?? raw) as T;
}

/** Unwrap a list response from an API envelope. */
export function unwrapListResults<T = any>(raw: any): T[] {
  const envelope = raw?.data ?? raw;
  const results =
    envelope?.results ??
    envelope?.data?.results ??
    envelope?.data ??
    envelope;
  return Array.isArray(results) ? (results as T[]) : [];
}

/** Safe CSRF token reader. */
export function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] ?? ''
  );
}
