/**
 * useMediaLibData/index.ts
 * Orchestrator hook for the Media Library page.
 *
 * Composes useMediaLibFetchers (brand assets + member media) with
 * filter/UI state, file-asset hook, and all derived filtered data.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { useFileAssets, type FileTypeFilter } from '../../../hooks/useFileAssets';
import type { HierarchyTab, OrganisationOption, ProjectOption, PreviewItem } from '../medialibHelpers';
import { useMediaLibFetchers } from '../useMediaLibFetchers';
import type { UseMediaLibDataReturn } from './types';
import { useMediaLibEffects } from './effects';
import { useDerivedMediaLib } from './derived';

// Re-export types
export type { UseMediaLibDataReturn } from './types';

export function useMediaLibData(): UseMediaLibDataReturn {
  const location = useLocation();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { user } = useAuth();
  const orgId = context.organisation?.id as string | undefined;
  const orgSlug = context.organisation?.slug as string | undefined;

  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

  const rawTab = new URLSearchParams(location.search).get('tab') || 'organisation';
  const activeLevel = (
    ['organisation', 'club', 'team', 'member', 'files'].includes(rawTab)
      ? rawTab
      : 'organisation'
  ) as HierarchyTab;

  /* ---------- sub-hooks ----------------------------------------- */
  const fetchers = useMediaLibFetchers({ orgId, orgSlug });
  const { brandAssets, brandLoading, brandError, memberMedia, memberMediaLoading } = fetchers;

  const {
    files,
    loading: filesLoading,
    error: filesError,
    fetchFiles,
    getDownloadUrl,
  } = useFileAssets();

  /* ---------- filter state -------------------------------------- */
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [kitFilter, setKitFilter] = useState<string>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

  // Reset kit filter when sub-filter changes
  useEffect(() => { setKitFilter('all'); }, [subFilter]);

  /* ---------- effects ------------------------------------------- */
  useMediaLibEffects({
    orgId,
    isSuperAdmin,
    myOrganisations,
    selectedOrgId,
    organisations,
    contextOrgSlug: context.organisation?.slug,
    activeLevel,
    setOrganisations,
    setClubs,
    setTeams,
    setSubFilter,
    setKitFilter,
    setFileTypeFilter,
    setSearchQuery,
    fetchAllBrandAssets: fetchers.fetchAllBrandAssets,
    fetchMemberMediaItems: fetchers.fetchMemberMediaItems,
    fetchFiles,
  });

  /* ---------- derived data -------------------------------------- */
  const {
    filteredTeams,
    filteredBrandAssets,
    filteredFiles,
    filteredMemberMedia,
    subTabCounts,
    fileTypeCounts,
  } = useDerivedMediaLib({
    brandAssets,
    memberMedia,
    files,
    activeLevel,
    subFilter,
    kitFilter,
    fileTypeFilter,
    searchQuery,
    selectedClubId,
    selectedTeamId,
    teams,
  });

  /* ---------- derived scalars ----------------------------------- */
  const loading =
    brandLoading ||
    (activeLevel === 'files' && filesLoading) ||
    (activeLevel === 'member' && memberMediaLoading);
  const error = activeLevel === 'files' ? filesError : brandError;

  const handleDownload = async (fileId: string) => {
    const url = await getDownloadUrl(fileId);
    if (url) window.open(url, '_blank');
  };

  const clearFilters = () => {
    setSelectedOrgId('');
    setSelectedClubId('');
    setSelectedTeamId('');
    setSubFilter('all');
    setKitFilter('all');
    setSearchQuery('');
  };

  /* ---------- return -------------------------------------------- */
  return {
    orgId, orgSlug, isSuperAdmin, activeLevel,
    brandAssets, memberMedia, files,
    filteredBrandAssets, filteredFiles, filteredMemberMedia, filteredTeams,
    subTabCounts, fileTypeCounts,
    organisations, clubs, teams,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    subFilter, setSubFilter,
    kitFilter, setKitFilter,
    fileTypeFilter, setFileTypeFilter,
    searchQuery, setSearchQuery,
    previewItem, setPreviewItem,
    loading, error,
    handleDownload, clearFilters,
  };
}
