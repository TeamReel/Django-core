/**
 * useMediaLibData/derived.ts
 * Derived state computations for filtered media library data.
 */

import { useMemo } from 'react';
import { getContentType, type BrandAsset } from '@/hooks/useBrandAssets';
import { getFileTypeFilter, type FileAsset, type FileTypeFilter } from '@/hooks/useFileAssets';
import { friendlyAssetLabel, getMemberContentType, type MemberMediaItem, type ProjectOption, type HierarchyTab } from '../medialibHelpers';

interface UseDerivedMediaLibParams {
  brandAssets: BrandAsset[];
  memberMedia: MemberMediaItem[];
  files: FileAsset[];
  activeLevel: HierarchyTab;
  subFilter: string;
  kitFilter: string;
  fileTypeFilter: FileTypeFilter;
  searchQuery: string;
  selectedClubId: string;
  selectedTeamId: string;
  teams: ProjectOption[];
}

export function useDerivedMediaLib({
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
}: UseDerivedMediaLibParams) {

  const filteredTeams = useMemo(() => {
    if (!selectedClubId) return teams;
    return teams.filter((t) => String(t.parent_id) === String(selectedClubId));
  }, [teams, selectedClubId]);

  const filteredBrandAssets = useMemo(() => {
    let result = brandAssets;
    if (activeLevel === 'organisation') {
      result = result.filter((a) => {
        const pt = a.project_type;
        return (pt === null || pt === undefined) && !a.asset_type.startsWith('member_');
      });
    } else if (activeLevel === 'club') {
      result = result.filter(
        (a) => a.project_type === 'club' && !a.asset_type.startsWith('member_'),
      );
    } else if (activeLevel === 'team') {
      result = result.filter(
        (a) => a.project_type === 'team' && !a.asset_type.startsWith('member_'),
      );
    } else if (activeLevel === 'member') {
      result = [];
    }
    if (selectedClubId) {
      result = result.filter((a) => {
        const pid = a.project_id;
        const ppid = a.parent_project_id;
        if (activeLevel === 'club') return String(pid) === String(selectedClubId);
        if (activeLevel === 'team') return String(ppid) === String(selectedClubId);
        return true;
      });
    }
    if (selectedTeamId) {
      result = result.filter((a) => String(a.project_id) === String(selectedTeamId));
    }
    if (subFilter !== 'all') {
      if (activeLevel === 'member') {
        result = result.filter((a) => getMemberContentType(a.asset_type) === subFilter);
      } else if (activeLevel === 'organisation') {
        if (subFilter === 'logo') result = result.filter((a) => a.asset_type.startsWith('logo'));
        else if (subFilter === 'watermark') result = result.filter((a) => a.asset_type === 'watermark');
        else if (subFilter === 'favicon') result = result.filter((a) => a.asset_type === 'favicon');
        else if (subFilter === 'font') result = result.filter((a) => a.asset_type === 'font_file');
        else if (subFilter === 'location') result = result.filter((a) => a.asset_type === 'location_photo');
      } else {
        result = result.filter((a) => getContentType(a.asset_type) === subFilter);
      }
    }
    if (kitFilter !== 'all' && subFilter === 'kit') {
      result = result.filter((a) => a.asset_type.includes(`kit_${kitFilter}`));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          friendlyAssetLabel(a).toLowerCase().includes(q) ||
          a.profile_name?.toLowerCase().includes(q) ||
          a.project_name?.toLowerCase().includes(q) ||
          a.asset_type.toLowerCase().includes(q) ||
          a.file_details?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, searchQuery]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (fileTypeFilter !== 'all') {
      result = result.filter((f) => getFileTypeFilter(f.mime_type) === fileTypeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.original_name?.toLowerCase().includes(q) ||
          f.mime_type?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [files, fileTypeFilter, searchQuery]);

  const filteredMemberMedia = useMemo(() => {
    if (activeLevel !== 'member') return [];
    let result = memberMedia;
    if (result.length === 0) {
      result = brandAssets
        .filter((a) => a.asset_type.startsWith('member_'))
        .map((a) => ({
          id: a.id,
          name: friendlyAssetLabel(a),
          url: a.url || '',
          asset_type: a.asset_type,
          member_id: '',
          member_name: '',
          project_id: a.project_id || '',
          project_name: a.project_name || '',
          parent_project_id: a.parent_project_id || null,
          kit_type: undefined,
          created_at: a.created_at,
        }));
    }
    if (selectedTeamId) {
      result = result.filter((item) => String(item.project_id) === String(selectedTeamId));
    }
    if (selectedClubId && !selectedTeamId) {
      const teamIds = teams
        .filter((t) => String(t.parent_id) === String(selectedClubId))
        .map((t) => String(t.id));
      result = result.filter((item) => teamIds.includes(String(item.project_id)));
    }
    if (subFilter !== 'all') {
      result = result.filter((item) => {
        const at = item.asset_type || '';
        if (subFilter === 'member_profile' && at.includes('profile')) return true;
        if (subFilter === 'member_fullbody' && at.includes('fullbody')) return true;
        if (subFilter === 'member_closeup' && at.includes('closeup')) return true;
        if (subFilter === 'member_intro' && at.includes('intro')) return true;
        if (subFilter === 'member_celebration' && at.includes('celebration')) return true;
        return false;
      });
    }
    if (kitFilter !== 'all' && (subFilter === 'member_fullbody' || subFilter === 'member_closeup')) {
      result = result.filter((item) => item.kit_type === kitFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.member_name?.toLowerCase().includes(q) ||
          item.project_name?.toLowerCase().includes(q) ||
          item.asset_type?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [memberMedia, brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, teams, searchQuery]);

  const subTabCounts = useMemo(() => {
    if (activeLevel === 'member') {
      let relevantItems: { asset_type: string; project_id: string }[] = memberMedia.map(
        (m) => ({ asset_type: m.asset_type, project_id: m.project_id }),
      );
      if (relevantItems.length === 0) {
        relevantItems = brandAssets
          .filter((a) => a.asset_type.startsWith('member_'))
          .map((a) => ({
            asset_type: a.asset_type,
            project_id: a.project_id || '',
          }));
      }
      if (selectedTeamId) {
        relevantItems = relevantItems.filter(
          (item) => String(item.project_id) === String(selectedTeamId),
        );
      } else if (selectedClubId) {
        const teamIds = teams
          .filter((t) => String(t.parent_id) === String(selectedClubId))
          .map((t) => String(t.id));
        relevantItems = relevantItems.filter((item) =>
          teamIds.includes(String(item.project_id)),
        );
      }
      const counts: Record<string, number> = { all: relevantItems.length };
      relevantItems.forEach((item) => {
        const at = item.asset_type || '';
        if (at.includes('profile')) counts.member_profile = (counts.member_profile || 0) + 1;
        else if (at.includes('fullbody')) counts.member_fullbody = (counts.member_fullbody || 0) + 1;
        else if (at.includes('closeup')) counts.member_closeup = (counts.member_closeup || 0) + 1;
        else if (at.includes('intro')) counts.member_intro = (counts.member_intro || 0) + 1;
        else if (at.includes('celebration')) counts.member_celebration = (counts.member_celebration || 0) + 1;
      });
      return counts;
    }
    const levelAssets =
      activeLevel === 'files'
        ? []
        : brandAssets.filter((a) => {
            if (activeLevel === 'organisation') return a.project_type === null;
            if (activeLevel === 'club') return a.project_type === 'club';
            if (activeLevel === 'team') return a.project_type === 'team';
            return false;
          });
    const counts: Record<string, number> = { all: levelAssets.length };
    if (activeLevel === 'organisation') {
      levelAssets.forEach((a) => {
        if (a.asset_type.startsWith('logo')) counts.logo = (counts.logo || 0) + 1;
        else if (a.asset_type === 'watermark') counts.watermark = (counts.watermark || 0) + 1;
        else if (a.asset_type === 'favicon') counts.favicon = (counts.favicon || 0) + 1;
        else if (a.asset_type === 'font_file') counts.font = (counts.font || 0) + 1;
        else if (a.asset_type === 'location_photo') counts.location = (counts.location || 0) + 1;
      });
    } else {
      levelAssets.forEach((a) => {
        const ct = getContentType(a.asset_type);
        counts[ct] = (counts[ct] || 0) + 1;
      });
    }
    return counts;
  }, [brandAssets, memberMedia, activeLevel, selectedClubId, selectedTeamId, teams]);

  const fileTypeCounts = useMemo(
    () => ({
      all: files.length,
      image: files.filter((f) => getFileTypeFilter(f.mime_type) === 'image').length,
      video: files.filter((f) => getFileTypeFilter(f.mime_type) === 'video').length,
      document: files.filter((f) => getFileTypeFilter(f.mime_type) === 'document').length,
      font: files.filter((f) => getFileTypeFilter(f.mime_type) === 'font').length,
    }),
    [files],
  );

  return {
    filteredTeams,
    filteredBrandAssets,
    filteredFiles,
    filteredMemberMedia,
    subTabCounts,
    fileTypeCounts,
  };
}
