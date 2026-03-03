import { useCallback } from 'react';
import { getCsrfToken } from '../../utils/csrf';
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
      const res = await fetch(`${apiBaseUrl}/api/v1/media/items/${item.id}/`, {
        method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok || res.status === 204) await fetchMatchMedia();
      else console.error('[Media] Delete failed:', res.status);
    } catch (err) { console.error('[Media] Error deleting media item:', err); }
  }, [apiBaseUrl, fetchMatchMedia]);

  const handleRestoreMediaItem = useCallback(async (item: MatchMediaItem) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/save/`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({
          storage_path: item.storage_path,
          filename: item.title,
          mime_type: item.mime_type,
          activity_id: match?.id,
          organisation_id: org?.id,
          project_id: match?.project?.id || project?.id,
          asset_type: (item.extraction_metadata?.asset_type as string) || 'other',
        }),
      });
      if (res.ok) await fetchMatchMedia();
      else console.error('[Media] Restore failed:', res.status);
    } catch (err) { console.error('[Media] Error restoring media item:', err); }
  }, [apiBaseUrl, match?.id, org?.id, match?.project?.id, project?.id, fetchMatchMedia]);

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
  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const matchIdValue = String(matchToEdit?.id || '').trim();
    if (!matchIdValue) throw new Error('Missing match id');
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchIdValue)}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include',
      body: JSON.stringify(patch || {}),
    });
    if (!res.ok) throw new Error('Failed to update match');
    const raw = await res.json().catch(() => null);
    setMatch(getEnvelopeData<MatchDetail>(raw));
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
      alert(e instanceof Error ? e.message : 'Failed to save lineup');
    } finally {
      setLineupSaving(false);
    }
  };

  // ── Delete match ──
  const handleDeleteMatch = async () => {
    if (!match?.id) return;
    if (!window.confirm(`Are you sure you want to delete match ${match.title || match.id}?`)) return;
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(match.id))}/`, {
      method: 'DELETE', headers: { 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
    });
    if (!res.ok) { alert('Error deleting match'); return; }
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
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(match.id))}/`, { credentials: 'include' });
    if (!res.ok) return;
    const raw = await res.json().catch(() => null);
    setMatch(getEnvelopeData(raw));
  }, [match?.id, apiBaseUrl]);

  const getApiErrorMessage = async (res: Response, fallback: string) => {
    const raw = await res.json().catch(() => null);
    return raw?.error?.message || raw?.detail || (typeof raw === 'string' ? raw : null) || fallback;
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
    const res = await fetch(`${apiBaseUrl}/api/v1/participations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Failed to add participant'));
    const created = await res.json().catch(() => null);
    upsertParticipationInState(getEnvelopeData(created));
    await refreshMatch();
  };

  const updateParticipation = async (p: Participation, patch: any) => {
    const res = await fetch(`${apiBaseUrl}/api/v1/participations/${encodeURIComponent(String(p.id))}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Failed to update participant'));
    const updated = await res.json().catch(() => null);
    upsertParticipationInState(getEnvelopeData(updated));
    await refreshMatch();
  };

  const deleteParticipation = async (p: Participation) => {
    const res = await fetch(`${apiBaseUrl}/api/v1/participations/${encodeURIComponent(String(p.id))}/`, {
      method: 'DELETE', headers: { 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
    });
    if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Failed to remove participant'));
    removeParticipationFromState(String(p.id));
    await refreshMatch();
  };

  const bulkCreateParticipations = async (memberIds: string[], side: 'home' | 'away') => {
    const ids = (memberIds || []).map(x => String(x || '').trim()).filter(Boolean);
    if (!ids.length || !match) return;
    if (ids.length > 1) {
      const teamId = side === 'home' ? String(match.project?.id || '') : String(match.opponent_project?.id || '');
      const teamName = side === 'home' ? homeTeamName : awayTeamName;
      const res = await fetch(`${apiBaseUrl}/api/v1/participations/bulk/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          activity_id: String(match.id), member_ids: ids,
          role: 'starter', status: 'confirmed',
          data: { side, team_id: teamId || undefined, team_name: teamName },
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Failed to add participants'));
      await refreshMatch();
      return;
    }
    await createParticipation(ids[0], side);
  };

  const bulkDeleteParticipations = async (participationIds: string[]) => {
    const ids = (participationIds || []).map(x => String(x || '').trim()).filter(Boolean);
    if (!ids.length) return;
    if (ids.length > 1) {
      const res = await fetch(`${apiBaseUrl}/api/v1/participations/bulk-delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ participation_ids: ids }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Failed to remove participants'));
      await refreshMatch();
      return;
    }
    const p = (match?.participations || []).find(x => String((x as any)?.id || '') === ids[0]);
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
