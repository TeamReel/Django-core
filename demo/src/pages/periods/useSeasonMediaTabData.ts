import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { generativeApi } from '@/api';
import type { BatchMember } from '../../components/BatchGenerationModal';
import type { SeasonProject } from '../../types/season';

/** Squad member record with metadata and media assets */
export interface SquadMember {
  id?: string;
  user?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    name?: string;
    avatar_url?: string | null;
    [key: string]: unknown;
  };
  user_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  metadata?: { teamreel_assets?: Record<string, any>; [key: string]: unknown };
  [key: string]: unknown;
}

export interface GuestPlayerState {
  has_avatar: boolean;
  has_closeup: boolean;
  has_intro: boolean;
  has_celebration: boolean;
  guest_player: Record<string, any> | null;
}

interface UseSeasonMediaTabDataParams {
  members: SquadMember[];
  project: SeasonProject | null;
  apiBaseUrl: string;
  brandLogoUrl: string | null;
  brandSponsorUrl: string | null;
  batchBrandKits: Record<string, string | null>;
  onMembersReload?: () => void;
}

export function useSeasonMediaTabData({
  members,
  project,
  apiBaseUrl,
  brandLogoUrl,
  brandSponsorUrl,
  batchBrandKits,
  onMembersReload,
}: UseSeasonMediaTabDataParams) {
  const { pushToast } = useToast();
  // ── Tab-local state ──
  const [batchSelectedMemberIds, setBatchSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isActiveJobsModalOpen, setIsActiveJobsModalOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // ── Inline member detail panel ──
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const memberIds = useMemo(() => members.map((m) => String(m.id || '')).filter(Boolean), [members]);

  // Guest player state
  const [guestPlayer, setGuestPlayer] = useState<GuestPlayerState | null>(null);
  const [showGuestAiModal, setShowGuestAiModal] = useState(false);
  const [guestAiPreselectedTemplate, setGuestAiPreselectedTemplate] = useState<string | undefined>();
  const [guestAiSelectedKitType, setGuestAiSelectedKitType] = useState<string>('home');
  const [croppingGuestCloseup, setCroppingGuestCloseup] = useState(false);

  // ── Guest player data from project metadata ──
  interface GuestPlayerMediaVariant {
    raw?: string;
    processed?: string;
    url?: string;
    [key: string]: unknown;
  }
  interface GuestPlayerData {
    images?: {
      fullbody?: Record<string, GuestPlayerMediaVariant>;
      closeup?: Record<string, GuestPlayerMediaVariant>;
      [key: string]: unknown;
    };
    videos?: {
      intro?: Record<string, GuestPlayerMediaVariant>;
      celebration?: Record<string, GuestPlayerMediaVariant>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }
  useEffect(() => {
    const guestPlayerData = project?.metadata?.guest_player;
    if (guestPlayerData) {
      const guestData = guestPlayerData as GuestPlayerData;
      const fullbodyHome = guestData?.images?.fullbody?.home;
      const closeupHome = guestData?.images?.closeup?.home;
      const introHome = guestData?.videos?.intro?.home;
      const celebrationHome = guestData?.videos?.celebration?.home;
      const hasAvatar = !!(fullbodyHome?.raw || fullbodyHome?.processed);
      const hasCloseup = !!(closeupHome?.raw || closeupHome?.processed);
      const hasIntro = !!(introHome?.raw || introHome?.processed || introHome?.url);
      const hasCelebration = !!(celebrationHome?.raw || celebrationHome?.processed || celebrationHome?.url);
      setGuestPlayer({
        has_avatar: hasAvatar,
        has_closeup: hasCloseup,
        has_intro: hasIntro,
        has_celebration: hasCelebration,
        guest_player: guestPlayerData,
      });
    } else {
      setGuestPlayer(null);
    }
  }, [project]);

  const openGuestAiModal = useCallback((templateId: string, kitType?: string) => {
    setGuestAiPreselectedTemplate(templateId);
    setGuestAiSelectedKitType(kitType || 'home');
    setShowGuestAiModal(true);
  }, []);

  const cropGuestCloseup = useCallback(async (kitType: string = 'home') => {
    const projectId = String(project?.id || '');
    if (!projectId) {
      pushToast({ message: 'Project ID ontbreekt.', type: 'error' });
      return;
    }
    setCroppingGuestCloseup(true);
    try {
      await generativeApi.cropCloseup({ project_id: projectId, kit_type: kitType });

      setGuestPlayer((prev) => prev ? { ...prev, has_closeup: true } : prev);
      if (onMembersReload) setTimeout(() => { onMembersReload(); }, 500);
    } catch (err) {
      logger.error('Guest closeup crop error', err);
      pushToast({ message: err instanceof Error ? err.message : 'Crop mislukt', type: 'error' });
    } finally {
      setCroppingGuestCloseup(false);
    }
  }, [apiBaseUrl, project?.id]);

  // Brand assets for batch modal
  const batchBrandAssets = useMemo(() => ({
    logo: brandLogoUrl,
    sponsor: brandSponsorUrl,
    kits: batchBrandKits,
  }), [brandLogoUrl, brandSponsorUrl, batchBrandKits]);

  // Build BatchMember objects from squad members
  const batchMembers = useMemo((): BatchMember[] => {
    return Array.from(batchSelectedMemberIds)
      .map((mid) => {
        const m = members.find((mem) => String(mem.id) === mid);
        if (!m) return null;
        const memberUser = m.user || m;
        const name =
          memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email || '';
        const tr = m.metadata?.teamreel_assets || {};
        const profileUrl = tr?.media?.profile?.url || tr?.kit?.profile_photo_url || memberUser.avatar_url || null;
        const fullbodyUrls: Record<string, string> = {};
        const closeupUrls: Record<string, string> = {};
        const imgFb = tr?.images?.fullbody || {};
        const imgCu = tr?.images?.closeup || {};
        const extractUrl = (val: unknown): string | null => {
          if (!val) return null;
          if (typeof val === 'string') return val;
          if (typeof val === 'object') return (val as Record<string, unknown>).processed as string || (val as Record<string, unknown>).raw as string || null;
          return null;
        };
        for (const [k, v] of Object.entries(imgFb)) {
          const url = extractUrl(v);
          if (url) fullbodyUrls[k] = url;
        }
        for (const [k, v] of Object.entries(imgCu)) {
          const url = extractUrl(v);
          if (url) closeupUrls[k] = url;
        }
        if (!fullbodyUrls['home'] && tr?.media?.kit?.url) {
          fullbodyUrls['home'] = tr.media.kit.url;
        }
        return {
          id: mid,
          name,
          profilePhotoUrl: profileUrl,
          fullbodyUrls,
          closeupUrls,
          metadata: m.metadata,
        } as BatchMember;
      })
      .filter(Boolean) as BatchMember[];
  }, [batchSelectedMemberIds, members]);

  return {
    batchSelectedMemberIds,
    setBatchSelectedMemberIds,
    isBatchModalOpen,
    setIsBatchModalOpen,
    isActiveJobsModalOpen,
    setIsActiveJobsModalOpen,
    expandedCards,
    setExpandedCards,
    selectedMemberId,
    setSelectedMemberId,
    memberIds,
    guestPlayer,
    showGuestAiModal,
    setShowGuestAiModal,
    guestAiPreselectedTemplate,
    guestAiSelectedKitType,
    croppingGuestCloseup,
    openGuestAiModal,
    cropGuestCloseup,
    batchBrandAssets,
    batchMembers,
  };
}
