/**
 * Sidebar Panel B "work" section — shared types and helpers.
 */
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export interface PanelBResult {
    title: string;
    items: { label: string; path: string; icon?: LucideIcon }[];
    isActive: boolean;
}

export interface WorkSectionParams {
    path: string;
    isPlayer: boolean;
    isOrgRoute: boolean;
    orgSlug: string;
    clubSlugOrId: string | null;
    teamSlugOrId: string | null;
    seasonSlugOrId: string | null;
    competitionSlugOrId: string | null;
    matchId: string | null;
    locationPathname: string;
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

/** Safely extract a named route param from any matchPath result (returns '' when absent). */
type AnyParams = Record<string, string | undefined>;
export const getParam = (match: { params: unknown } | null | undefined, key: string): string =>
    String((match?.params as AnyParams)?.[key] ?? '');

export const makeTabUrl = (baseUrl: string, tab: string): string => {
    const t = String(tab || '').trim().toLowerCase();
    if (!t || t === 'overview') return baseUrl;
    return `${baseUrl}?tab=${encodeURIComponent(t)}`;
};

export const makeOrgSectionUrl = (orgIdOrSlug: string, section: string): string => {
    const orgKey = String(orgIdOrSlug || '').trim();
    if (!orgKey) return '/federations';
    const s = String(section || '').trim().toLowerCase();
    if (!s || s === 'overview') return `/${encodeURIComponent(orgKey)}`;
    return `/${encodeURIComponent(orgKey)}/${encodeURIComponent(s)}`;
};
