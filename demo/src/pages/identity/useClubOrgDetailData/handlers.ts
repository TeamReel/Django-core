/**
 * useClubOrgDetailData/handlers.ts
 * Event handlers for ClubOrgDetail.
 */

import { useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import type { Organisation } from '../clubOrgDetailHelpers';
import { routes } from '@/routes';

interface UseClubOrgHandlersParams {
  org: Organisation | null;
  orgSlugOrId: string;
  locationPathname: string;
  locationSearch: string;
  navigate: NavigateFunction;
}

export function useClubOrgHandlers({
  org,
  orgSlugOrId,
  locationPathname,
  locationSearch,
  navigate,
}: UseClubOrgHandlersParams) {
  const makeTabHref = useCallback((tabId: string): string => {
    const params = new URLSearchParams(locationSearch);
    const t = String(tabId || '').trim().toLowerCase();
    const normalized = t === 'people' || t === 'users' ? 'members' : t;
    if (!normalized || normalized === 'overview') params.delete('tab');
    else params.set('tab', normalized);
    const qs = params.toString();
    return qs ? `${locationPathname}?${qs}` : locationPathname;
  }, [locationPathname, locationSearch]);

  const handleClubSwitch = useCallback((option: BreadcrumbSwitcherOption) => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return;
    navigate(`${routes.club({ orgId: orgKey, clubId: String(option.slug || option.id) })}${locationSearch || ''}`);
  }, [org?.slug, orgSlugOrId, locationSearch, navigate]);

  return {
    makeTabHref,
    handleClubSwitch,
  };
}
