import { useCallback } from 'react';
import { api } from '@/api';
import type { MatchDetail, Participation, ContentItem } from './matchDetailTypes';
import type { ContentTemplate } from '../identity/ContentGenerationModal';
import { getEnvelopeData } from './matchDetailTypes';
import type { MatchMediaItem } from '../../components/MediaAssetCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseMatchActionsParams {
  apiBaseUrl: string;
  match: MatchDetail | null;
  setMatch: React.Dispatch<React.SetStateAction<MatchDetail | null>>;
  org: any;
  project: any;
  navigate: (to: any, opts?: any) => void;
  location: any;
  competitionBasePath: string;
  homeTeamName: string;
  awayTeamName: string;
  // Lineup state
  lineupFormation: string;
  lineupSlots: Record<string, string[]>;
  lineupBenchStatus: Record<string, string>;
  setLineupSaving: (v: boolean) => void;
  setLineupSaveSuccess: (v: boolean) => void;
  // Media / content callbacks
  fetchMatchMedia: () => Promise<void>;
  refreshMatchMedia: () => Promise<void>;
  fetchContentItems: () => Promise<void>;
  // Modal setters
  setSelectedTemplate: (v: ContentTemplate | null) => void;
  setSelectedContentTypeLabel: (v: string) => void;
  setIsContentModalOpen: (v: boolean) => void;
  setSelectedContentItem: (v: ContentItem | null) => void;
  setIsContentPreviewOpen: (v: boolean) => void;
}

// ─── Hook: all mutations + navigation ────────────────────────────────────────

export function useMatchActions(params: UseMatchActionsParams) {
  const {
    apiBaseUrl, match, setMatch, org, project, navigate, location,
    competitionBasePath, homeTeamName, awayTeamName,
    lineupFormation, lineupSlots, lineupBenchStatus,
    setLineupSaving, setLineupSaveSuccess,
    fetchMatchMedia, refreshMatchMedia, fetchContentItems,
    setSelectedTemplate, setSelectedContentTypeLabel, setIsContentModalOpen,
    setSelectedContentItem, setIsContentPreviewOpen,
  } = params;

  // ── Media CRUD ──
  const handleDeleteMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      await api.delete(`/media/items/${item.id}/`);
      await fetchMatchMedia();
    } catch (err) { console.error('[Media] Error deleting media item:', err); }
  }, [fetchMatchMedia]);

  const handleRestoreMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      await api.post('/generative/assets/save/', {
        storage_path: item.storage_path,
        filename: item.title,
        mime_type: item.mime_type,
        activity_id: match?.id,
        organisation_id: org?.id,
        project_id: match?.project?.id || project?.id,
        asset_type: (item.extraction_metadata?.asset_type as string) || 'other',
      });
      await fetchMatchMedia();
    } catch (err) { console.error('[Media] Error restoring media item:', err); }
  }, [match?.id, org?.id, match?.project?.id, project?.id, fetchMatchMedia]);

  // ── Content modal ──
  const openContentModal = (template?: ContentTemplate, label?: string) => {
    setSelectedTemplate(template || null);
    setSelectedContentTypeLabel(label || '');
    setIsContentModalOpen(true);
  };

  const closeContentModal = () => {
    setIsContentModalOpen(false);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
    fetchContentItems();
    void refreshMatchMedia();
  };

  const openContentPreview = (item: ContentItem) => {
    setSelectedContentItem(item);
    setIsContentPreviewOpen(true);
  };

  const closeContentPreview = () => {
    setIsContentPreviewOpen(false);
    setSelectedContentItem(null);
  };

  // ── Tab navigation ──
  const navigateToTab = (tabId: string) => {
    const pathname = location.pathname;
    if (!pathname) return;
    const p = new URLSearchParams(location.search);
    if (tabId === 'overview') p.delete('tab');
    else p.set('tab', tabId);
    const search = p.toString();
    navigate({ pathname, search: search ? `?${search}` : '' });
  };

  // ── Match edits ──
  const saveMatchEdits = async (matchToEdit: Record<string, unknown>, patch: Record<string, unknown>) => {
    const matchIdValue = String(matchToEdit?.id || '').trim();
    if (!matchIdValue) throw new Error('Missing match id');
    const raw = await api.patch<MatchDetail>(`/activities/${encodeURIComponent(matchIdValue)}/`, patch || {});
    setMatch(raw ?? (getEnvelopeData<MatchDetail>(matchToEdit as any)));
  };

  // ── Lineup save ──
  const saveLineup = async () => {
    if (!match?.id) return;
    setLineupSaving(true);
    setLineupSaveSuccess(false);
    try {
      const lineupData = {
        formation: lineupFormation,
        goalkeeper: lineupSlots.goalkeeper || [],
        player: lineupSlots.player || [],
        bench: lineupBenchStatus,
      };
      await saveMatchEdits(match, {
        metadata: { ...(match.metadata || {}), formation: lineupFormation, lineup: lineupData },
      });
      setLineupSaveSuccess(true);
      setTimeout(() => setLineupSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to save lineup');
    } finally {
      setLineupSaving(false);
    }
  };

  // ── Delete match ──
  const handleDeleteMatch = async () => {
    if (!match?.id) return;
    if (!window.confirm(`Are you sure you want to delete match ${match.title || match.id}?`)) return;
    await api.delete(`/activities/${encodeURIComponent(String(match.id))}/`);
    if (competitionBasePath) navigate(`${competitionBasePath}?tab=matches`);
    else navigate(-1);
  };

  // ── Participation state helpers ──
  const upsertParticipationInState = (p: Participation) => {
    setMatch((prev) => {
      if (!prev) return prev;
      const next = [...(prev.participations || []).filter(x => String(x.id) !== String(p.id)), p];
      return { ...prev, participations: next };
    });
  };

  const removeParticipationFromState = (participationId: string) => {
    setMatch((prev) => {
      if (!prev) return prev;
      return { ...prev, participations: (prev.participations || []).filter(p => String(p.id) !== String(participationId)) };
    });
  };

  // ── Refresh match from API ──
  const refreshMatch = useCallback(async () => {
    if (!match?.id) return;
    const raw = await api.get<MatchDetail>(`/activities/${encodeURIComponent(String(match.id))}/`);
    if (raw) setMatch(raw);
  }, [match?.id]);

  const getApiErrorMessage = async (_res: Response, fallback: string) => {
    return fallback;
  };

  // ── Participation CRUD ──
  const createParticipation = async (memberId: string, side: 'home' | 'away') => {
    if (!memberId || !match) return;
    const teamId = side === 'home' ? String(match.project.id) : String(match.opponent_project?.id || '');
    const teamName = side === 'home' ? homeTeamName : awayTeamName;
    const body: any = {
      member_id: memberId,
      activity_id: String(match.id),
      role: 'starter', status: 'confirmed',
      data: { side, team_id: teamId || undefined, team_name: teamName },
    };
    const created = await api.post<any>('/participations/', body);
    upsertParticipationInState(created);
    await refreshMatch();
  };

  const updateParticipation = async (p: Participation, patch: any) => {
    const updated = await api.patch<any>(`/participations/${encodeURIComponent(String(p.id))}/`, patch);
    upsertParticipationInState(updated);
    await refreshMatch();
  };

  const deleteParticipation = async (p: Participation) => {
    await api.delete(`/participations/${encodeURIComponent(String(p.id))}/`);
    removeParticipationFromState(String(p.id));
    await refreshMatch();
  };

  const bulkCreateParticipations = async (memberIds: string[], side: 'home' | 'away') => {
    const ids = (memberIds || []).map(x => String(x || '').trim()).filter(Boolean);
    if (!ids.length || !match) return;
    if (ids.length > 1) {
      const teamId = side === 'home' ? String(match.project?.id || '') : String(match.opponent_project?.id || '');
      const teamName = side === 'home' ? homeTeamName : awayTeamName;
      await api.post('/participations/bulk/', {
        activity_id: String(match.id), member_ids: ids,
        role: 'starter', status: 'confirmed',
        data: { side, team_id: teamId || undefined, team_name: teamName },
      });
      await refreshMatch();
      return;
    }
    await createParticipation(ids[0], side);
  };

  const bulkDeleteParticipations = async (participationIds: string[]) => {
    const ids = (participationIds || []).map(x => String(x || '').trim()).filter(Boolean);
    if (!ids.length) return;
    if (ids.length > 1) {
      await api.post('/participations/bulk-delete/', { participation_ids: ids });
      await refreshMatch();
      return;
    }
    const p = (match?.participations || []).find(x => String(x?.id || '') === ids[0]);
    if (p) await deleteParticipation(p);
  };

  return {
    handleDeleteMediaItem, handleRestoreMediaItem,
    openContentModal, closeContentModal,
    openContentPreview, closeContentPreview,
    navigateToTab, saveMatchEdits, saveLineup, handleDeleteMatch,
    createParticipation, updateParticipation, deleteParticipation,
    bulkCreateParticipations, bulkDeleteParticipations, refreshMatch,
  };
}
