/**
 * ContentGenerationModal — Season squad sub-hook
 *
 * Fetches squad members, provides member selection state,
 * getMemberAssetUrl/getMemberNameById helpers.
 */
import { useState, useEffect, useMemo } from 'react';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { ContentTemplate, Participation } from './types';
import { ASSET_TYPE_TO_MEDIA_KEY } from './constants';
import { groupParticipationsByRole } from './utils';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface UseSeasonSquadDataParams {
  isOpen: boolean;
  projectId?: string | null;
  seasonId?: string | null;
  selectedTemplate?: ContentTemplate | null;
}

export interface UseSeasonSquadDataReturn {
  seasonSquad: Record<string, Participation[]>;
  selectedMembers: Record<string, string[]>;
  setSelectedMembers: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  memberSelectionValid: boolean;
  getMemberAssetUrl: (memberId: string, assetType: string, memberRole?: string) => string | null;
  getMemberNameById: (memberId: string) => string;
}

/* ================================================================== */
/*  Hook                                                               */
/* ================================================================== */

export function useSeasonSquadData({
  isOpen,
  projectId,
  seasonId,
  selectedTemplate,
}: UseSeasonSquadDataParams): UseSeasonSquadDataReturn {
  const [seasonSquad, setSeasonSquad] = useState<Record<string, Participation[]>>({
    goalkeeper: [], player: [], coach: [], assistant: [],
  });
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string[]>>({
    goalkeeper: [], player: [], coach: [], assistant: [],
  });

  // ─── Fetch season squad ────────────────────────────────
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const fetchSeasonSquad = async () => {
      try {
        const url = `${getApiBaseUrl()}/api/v1/projects/${projectId}/members/?page_size=100`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          let members: any[] = [];
          if (data?.data?.data && Array.isArray(data.data.data)) members = data.data.data;
          else if (data?.data?.results && Array.isArray(data.data.results)) members = data.data.results;
          else if (data?.results && Array.isArray(data.results)) members = data.results;
          else if (Array.isArray(data?.data)) members = data.data;
          else if (Array.isArray(data)) members = data;

          // Handle pagination
          let nextUrl = data?.meta?.pagination?.next;
          while (nextUrl) {
            const nextResp = await fetch(nextUrl, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (!nextResp.ok) break;
            const nextData = await nextResp.json();
            let nextMembers: any[] = [];
            if (nextData?.data?.data && Array.isArray(nextData.data.data)) nextMembers = nextData.data.data;
            else if (Array.isArray(nextData?.data)) nextMembers = nextData.data;
            else if (Array.isArray(nextData)) nextMembers = nextData;
            members = [...members, ...nextMembers];
            nextUrl = nextData?.meta?.pagination?.next;
          }

          setSeasonSquad(groupParticipationsByRole(members));
        }
      } catch (err) {
        console.error(err);
        console.error('Error fetching season squad:', err);
      }
    };

    fetchSeasonSquad();
  }, [isOpen, projectId, seasonId]);

  // ─── Derived: member selection valid ───────────────────
  const memberSelectionValid = useMemo(() => {
    if (!selectedTemplate?.input_requirements?.members) return true;
    const reqs = selectedTemplate.input_requirements.members;

    for (const role of ['goalkeeper', 'player', 'coach', 'assistant'] as const) {
      const req = reqs[role];
      if (req && typeof req !== 'boolean' && req.count > 0) {
        const filledCount = selectedMembers[role].filter(Boolean).length;
        if (filledCount !== req.count) return false;
      }
    }
    return true;
  }, [selectedTemplate, selectedMembers]);

  // ─── getMemberAssetUrl ─────────────────────────────────
  const getMemberAssetUrl = (memberId: string, assetType: string, memberRole?: string): string | null => {
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant']) {
      const member = seasonSquad[role]?.find(p => p.id === memberId);
      if (member) {
        const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;
        const meta = member.metadata || {};
        const tr = (meta as any)?.teamreel_assets || {};
        const media = tr?.media || {};
        const videos = tr?.videos || {};
        const images = tr?.images || {};
        const legacyKit = tr?.kit || {};

        const effectiveRole = memberRole || role;
        let roleKey = 'home';
        if (effectiveRole === 'goalkeeper') roleKey = 'goalkeeper';
        else if (effectiveRole === 'coach' || effectiveRole === 'assistant') roleKey = 'coach';

        const imageStructureKey = mediaKey === 'kit' ? 'fullbody' : mediaKey;

        // 1. Check images structure
        if (images[imageStructureKey]?.[roleKey]?.url) return images[imageStructureKey][roleKey].url;
        if (roleKey !== 'home' && images[imageStructureKey]?.home?.url) return images[imageStructureKey].home.url;

        // 2. Check videos structure
        if (['intro', 'closeup', 'celebration'].includes(mediaKey) && videos[mediaKey]) {
          const variants = videos[mediaKey] || {};
          const roleVariantEntries = Object.entries(variants).filter(([k]) =>
            k.toLowerCase().includes(roleKey) || k.toLowerCase().startsWith(roleKey),
          );
          for (const [, val] of roleVariantEntries) {
            if (val && typeof val === 'object' && (val as any).processed) return (val as any).processed;
          }
          for (const [, val] of roleVariantEntries) {
            if (val && typeof val === 'object' && (val as any).raw) return (val as any).raw;
            if (val && typeof val === 'string' && val.trim()) return val;
          }
          for (const [, val] of Object.entries(variants)) {
            if (val && typeof val === 'object' && (val as any).processed) return (val as any).processed;
          }
          for (const [, val] of Object.entries(variants)) {
            if (val && typeof val === 'object' && (val as any).raw) return (val as any).raw;
            if (val && typeof val === 'string' && val.trim()) return val;
          }
        }

        // 3. Check media format
        if (media[mediaKey]?.url) return media[mediaKey].url;

        // 4. Legacy format
        if (mediaKey === 'profile' && legacyKit?.profile_photo_url) return legacyKit.profile_photo_url;
        if (mediaKey === 'kit' && legacyKit?.full_body_url) return legacyKit.full_body_url;
        if (mediaKey === 'celebration' && legacyKit?.goal_celebration_url) return legacyKit.goal_celebration_url;
      }
    }
    return null;
  };

  // ─── getMemberNameById ─────────────────────────────────
  const getMemberNameById = (memberId: string): string => {
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant']) {
      const member = seasonSquad[role]?.find(p => p.id === memberId);
      if (member) {
        const user = member.user || member.member;
        if (user) {
          if ('name' in user && user.name) return user.name;
          if ('user_name' in user && user.user_name) return user.user_name;
          const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          if (fullName) return fullName;
        }
      }
    }
    return 'Unknown';
  };

  return {
    seasonSquad,
    selectedMembers,
    setSelectedMembers,
    memberSelectionValid,
    getMemberAssetUrl,
    getMemberNameById,
  };
}
