/**
 * useMediaLibData/types.ts
 * Types for the Media Library data hook.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { BrandAsset } from '../../../hooks/useBrandAssets';
import type { FileAsset, FileTypeFilter } from '../../../hooks/useFileAssets';
import type { HierarchyTab, OrganisationOption, ProjectOption, PreviewItem, MemberMediaItem } from '../medialibHelpers';

export interface UseMediaLibDataReturn {
    orgId: string | undefined;
    orgSlug: string | undefined;
    isSuperAdmin: boolean;
    activeLevel: HierarchyTab;
    brandAssets: BrandAsset[];
    memberMedia: MemberMediaItem[];
    files: FileAsset[];
    filteredBrandAssets: BrandAsset[];
    filteredFiles: FileAsset[];
    filteredMemberMedia: MemberMediaItem[];
    filteredTeams: ProjectOption[];
    subTabCounts: Record<string, number>;
    fileTypeCounts: { all: number; image: number; video: number; document: number; font: number };
    organisations: OrganisationOption[];
    clubs: ProjectOption[];
    teams: ProjectOption[];
    selectedOrgId: string;
    setSelectedOrgId: Dispatch<SetStateAction<string>>;
    selectedClubId: string;
    setSelectedClubId: Dispatch<SetStateAction<string>>;
    selectedTeamId: string;
    setSelectedTeamId: Dispatch<SetStateAction<string>>;
    subFilter: string;
    setSubFilter: Dispatch<SetStateAction<string>>;
    kitFilter: string;
    setKitFilter: Dispatch<SetStateAction<string>>;
    fileTypeFilter: FileTypeFilter;
    setFileTypeFilter: Dispatch<SetStateAction<FileTypeFilter>>;
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    previewItem: PreviewItem | null;
    setPreviewItem: Dispatch<SetStateAction<PreviewItem | null>>;
    loading: boolean;
    error: string | null;
    handleDownload: (fileId: string) => Promise<void>;
    clearFilters: () => void;
}

// Re-export from helpers for convenience
export type { HierarchyTab, OrganisationOption, ProjectOption, PreviewItem, MemberMediaItem };
