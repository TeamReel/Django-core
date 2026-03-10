/**
 * useClubOrgDetailData/derived.ts
 * Derived state computations for ClubOrgDetail.
 */

import { useMemo } from 'react';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { looksLikeIdentifier, type Project, type Organisation } from '../clubOrgDetailHelpers';

interface UseDerivedClubOrgParams {
  orgSlugOrId: string;
  resolvedOrgSlug: string;
  org: Organisation | null;
  club: Project | null;
  clubSlugOrId: string;
  orgClubsForSwitcher: Project[];
  locationSearch: string;
}

export function useDerivedClubOrg({
  orgSlugOrId,
  resolvedOrgSlug,
  org,
  club,
  clubSlugOrId,
  orgClubsForSwitcher,
  locationSearch,
}: UseDerivedClubOrgParams) {
  const effectiveOrgSlug = useMemo(() => {
    const explicit = String(resolvedOrgSlug || '').trim();
    if (explicit) return explicit;
    const raw = String(orgSlugOrId || '').trim();
    return looksLikeIdentifier(raw) ? '' : raw;
  }, [orgSlugOrId, resolvedOrgSlug]);

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(locationSearch || '');
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    // Normalize legacy tab names
    const normalized =
      tab === 'people' || tab === 'users' ? 'members'
      : tab === 'hierarchy' || tab === 'seasons' || tab === 'competitions' || tab === 'matches' ? 'teams'
      : tab === 'assets' || tab === 'kits' || tab === 'settings' ? 'identity'
      : tab === 'balance' || tab === 'transactions' ? 'overview'
      : tab;
    const allowed = new Set(['overview', 'teams', 'members', 'media', 'identity']);
    return allowed.has(normalized) ? normalized : 'overview';
  }, [locationSearch]);

  const orgIdForDirectoryLists = useMemo(() => String(org?.id || '').trim(), [org?.id]);
  const orgSlugForDirectoryLists = useMemo(() => String(org?.slug || resolvedOrgSlug || '').trim(), [org?.slug, resolvedOrgSlug]);
  const clubIdForDirectoryLists = useMemo(() => String(club?.id || '').trim(), [club?.id]);
  const orgKeyForRoutes = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug || String(orgSlugOrId || '').trim();
  }, [org?.slug, orgSlugOrId, resolvedOrgSlug]);
  const clubKeyForRoutes = useMemo(() => String(club?.slug || clubSlugOrId || '').trim(), [club?.slug, clubSlugOrId]);

  const backToOrgHref = useMemo(() => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return '/federations';
    const params = new URLSearchParams(locationSearch || '');
    params.set('tab', 'clubs');
    return `/${encodeURIComponent(orgKey)}?${params.toString()}`;
  }, [locationSearch, org?.slug, orgSlugOrId]);

  const clubBreadcrumbOptions: BreadcrumbSwitcherOption[] = useMemo(() => {
    const base = (orgClubsForSwitcher || []).map((c: Project) => ({
      id: String(c.id),
      label: String(c.name || c.slug || c.id),
      slug: String(c.slug || c.id),
    }));
    if (club && !base.some((c) => String(c.id) === String(club.id))) {
      base.push({ id: String(club.id), label: String(club.name || club.slug || club.id), slug: String(club.slug || club.id) });
    }
    return base;
  }, [club, orgClubsForSwitcher]);

  const shouldResolveOrg = useMemo(() => looksLikeIdentifier(orgSlugOrId), [orgSlugOrId]);
  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);

  return {
    effectiveOrgSlug,
    activeTabFromUrl,
    orgIdForDirectoryLists,
    orgSlugForDirectoryLists,
    clubIdForDirectoryLists,
    orgKeyForRoutes,
    clubKeyForRoutes,
    backToOrgHref,
    clubBreadcrumbOptions,
    shouldResolveOrg,
    shouldResolveClub,
  };
}
