/**
 * useMediaLibData/effects.ts
 * Data loading effects for the Media Library.
 */

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import type { OrganisationOption, ProjectOption, HierarchyTab } from '../medialibHelpers';

interface UseMediaLibEffectsParams {
  orgId: string | undefined;
  isSuperAdmin: boolean;
  myOrganisations: Array<{ id: string | number; name: string; slug?: string }>;
  selectedOrgId: string;
  organisations: OrganisationOption[];
  contextOrgSlug: string | undefined;
  activeLevel: HierarchyTab;
  setOrganisations: Dispatch<SetStateAction<OrganisationOption[]>>;
  setClubs: Dispatch<SetStateAction<ProjectOption[]>>;
  setTeams: Dispatch<SetStateAction<ProjectOption[]>>;
  setSubFilter: Dispatch<SetStateAction<string>>;
  setKitFilter: Dispatch<SetStateAction<string>>;
  setFileTypeFilter: Dispatch<SetStateAction<any>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  fetchAllBrandAssets: () => Promise<void>;
  fetchMemberMediaItems: () => Promise<void>;
  fetchFiles: (orgId: string) => Promise<void>;
}

export function useMediaLibEffects({
  orgId,
  isSuperAdmin,
  myOrganisations,
  selectedOrgId,
  organisations,
  contextOrgSlug,
  activeLevel,
  setOrganisations,
  setClubs,
  setTeams,
  setSubFilter,
  setKitFilter,
  setFileTypeFilter,
  setSearchQuery,
  fetchAllBrandAssets,
  fetchMemberMediaItems,
  fetchFiles,
}: UseMediaLibEffectsParams) {
  // Reset kit filter when sub-filter changes (handled in main hook)

  // Load organisations
  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(
        myOrganisations.map((o) => ({
          id: String(o.id),
          name: o.name,
          slug: (o as any).slug || '',
        })),
      );
      return;
    }
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000 },
        );
        setOrganisations(
          (orgs || []).map((o: { id: string | number; name: string; slug?: string }) => ({
            id: String(o.id),
            name: o.name,
            slug: o.slug || '',
          })),
        );
      } catch {
        // ignore
      }
    };
    load();
  }, [isSuperAdmin, myOrganisations, setOrganisations]);

  // Load clubs and teams when org changes
  useEffect(() => {
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      const selectedOrg = selectedOrgId
        ? organisations.find((o) => String(o.id) === String(selectedOrgId))
        : null;
      const orgSlugForApi = selectedOrg?.slug || contextOrgSlug || '';
      if (!orgSlugForApi) {
        setClubs([]);
        setTeams([]);
        return;
      }
      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&parent_project__isnull=true`,
            { credentials: 'include' },
            { ttlMs: 120_000 },
          ),
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&parent_project__isnull=false`,
            { credentials: 'include' },
            { ttlMs: 120_000 },
          ),
        ]);
        setClubs(allClubs);
        setTeams(allTeams);
      } catch {
        // ignore
      }
    };
    load();
  }, [selectedOrgId, organisations, contextOrgSlug, setClubs, setTeams]);

  // Reset sub-filters when level changes
  useEffect(() => {
    setSubFilter('all');
    setFileTypeFilter('all');
    setSearchQuery('');
  }, [activeLevel, setSubFilter, setFileTypeFilter, setSearchQuery]);

  // Fetch assets on mount
  useEffect(() => {
    if (orgId) {
      fetchAllBrandAssets();
      fetchMemberMediaItems();
      fetchFiles(orgId);
    }
  }, [orgId, fetchAllBrandAssets, fetchMemberMediaItems, fetchFiles]);
}
