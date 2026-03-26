/**
 * useLineupSheet — Self-contained lineup state for inline editing from dashboard.
 *
 * Fetches squad from /projects/:id/members/, loads saved lineup from match metadata,
 * and provides a saveLineup fn that PATCHes the match metadata.
 *
 * This avoids needing the full useMatchDetailData orchestrator,
 * keeping the dashboard bundle small.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/api';
import { FORMATION_LAYOUTS } from '../../pages/identity/content-generation';
import type { Match } from './ActiveMatchCard';

interface SquadMemberRecord {
  id: string;
  user?: { id?: string; name?: string; first_name?: string; last_name?: string; email?: string };
  member?: { id?: string; name?: string; user_name?: string };
  metadata?: { shirt_number?: string; functional_roles?: string[]; team_role?: string; [k: string]: unknown };
  data?: { jersey_number?: string; functional_role?: string; [k: string]: unknown };
  functional_roles?: string[];
}

export interface LineupSheetState {
  lineupFormation: string;
  setLineupFormation: (v: string) => void;
  lineupSlots: Record<string, string[]>;
  setLineupSlots: (v: Record<string, string[]>) => void;
  lineupSquad: Record<string, SquadMemberRecord[]>;
  lineupSquadLoading: boolean;
  lineupBenchStatus: Record<string, string>;
  setLineupBenchStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lineupSaving: boolean;
  lineupSaveSuccess: boolean;
  saveLineup: () => Promise<void>;
}

export function useLineupSheet(
  match: Match | null,
  onSaved?: (count: number, formation: string) => void,
): LineupSheetState {
  // Stable ref for callback to avoid re-creating saveLineup
  const _onSavedRef = React.useRef(onSaved);
  _onSavedRef.current = onSaved;
  const [lineupFormation, setLineupFormation] = useState('4-3-3');
  const [lineupSlots, setLineupSlots] = useState<Record<string, string[]>>({ goalkeeper: [], player: [] });
  const [lineupSquad, setLineupSquad] = useState<Record<string, SquadMemberRecord[]>>({});
  const [lineupSquadLoading, setLineupSquadLoading] = useState(false);
  const [lineupBenchStatus, setLineupBenchStatus] = useState<Record<string, string>>({});
  const [lineupSaving, setLineupSaving] = useState(false);
  const [lineupSaveSuccess, setLineupSaveSuccess] = useState(false);

  // ── Fetch squad when match changes ──
  useEffect(() => {
    const projectId = match?.project?.id;
    if (!projectId) return;

    let cancelled = false;

    (async () => {
      setLineupSquadLoading(true);
      try {
        const members = await api.listAll<SquadMemberRecord>(
          `/projects/${encodeURIComponent(String(projectId))}/members/`,
          { pageSize: 100 },
        );

        const groups: Record<string, SquadMemberRecord[]> = { goalkeeper: [], player: [], coach: [], assistant: [] };
        members.forEach((p: SquadMemberRecord) => {
          let roles: string[] = [];
          if (p.functional_roles && Array.isArray(p.functional_roles) && p.functional_roles.length > 0) {
            roles = p.functional_roles;
          } else if (p.metadata?.functional_roles && Array.isArray(p.metadata.functional_roles) && p.metadata.functional_roles.length > 0) {
            roles = p.metadata.functional_roles;
          } else if (p.data?.functional_role) {
            roles = [p.data.functional_role];
          } else if (p.metadata?.team_role) {
            roles = [p.metadata.team_role];
          } else {
            roles = ['player'];
          }
          roles.forEach(role => {
            const nr = role.toLowerCase();
            if (nr === 'keeper' || nr === 'gk') groups.goalkeeper.push(p);
            else if (groups[nr]) groups[nr].push(p);
            else groups.player.push(p);
          });
        });

        if (!cancelled) setLineupSquad(groups);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLineupSquadLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [match?.project?.id]);

  // ── Load saved lineup from match metadata ──
  useEffect(() => {
    if (!match) return;
    const saved = match.metadata?.lineup;
    if (saved) {
      if (saved.formation && FORMATION_LAYOUTS[saved.formation]) setLineupFormation(saved.formation);
      if (saved.goalkeeper || saved.player) setLineupSlots({ goalkeeper: saved.goalkeeper || [], player: saved.player || [] });
      if (saved.bench) setLineupBenchStatus(saved.bench);
    } else if (match.metadata?.formation) {
      setLineupFormation(match.metadata.formation);
    }
  }, [match?.id]);

  // ── Save lineup ──
  const saveLineup = useCallback(async () => {
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
      await api.patch(`/activities/${encodeURIComponent(String(match.id))}/`, {
        metadata: { ...(match.metadata || {}), formation: lineupFormation, lineup: lineupData },
      });
      setLineupSaveSuccess(true);
      // Compute saved player count for badge update
      const savedCount = (lineupSlots.goalkeeper?.length || 0) + (lineupSlots.player?.length || 0);
      _onSavedRef.current?.(savedCount, lineupFormation);
      setTimeout(() => setLineupSaveSuccess(false), 3000);
    } catch {
      // Error handling could be added here
    } finally {
      setLineupSaving(false);
    }
  }, [match?.id, match?.metadata, lineupFormation, lineupSlots, lineupBenchStatus]);

  return {
    lineupFormation,
    setLineupFormation,
    lineupSlots,
    setLineupSlots,
    lineupSquad,
    lineupSquadLoading,
    lineupBenchStatus,
    setLineupBenchStatus,
    lineupSaving,
    lineupSaveSuccess,
    saveLineup,
  };
}
