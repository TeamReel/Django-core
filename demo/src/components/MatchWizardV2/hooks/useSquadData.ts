/**
 * useSquadData – Hook for fetching and managing team squad
 */
import { useCallback } from 'react';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { useMatchWizard } from '../MatchWizardContext';
import type { SquadMember } from '../types';

export function useSquadData() {
  const apiBaseUrl = getApiBaseUrl();
  const {
    selectedMatch,
    setSquadGroups,
    setSquadLoading,
    setSquadError,
    lineupSlots,
    setLineupSlots,
    setLineupFormation,
  } = useMatchWizard();

  const fetchSquad = useCallback(async () => {
    if (!selectedMatch) return;

    const pid = (selectedMatch as any).project?.id;
    if (!pid) return;

    setSquadLoading(true);
    setSquadError(null);

    try {
      const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(pid))}/members/?page_size=100`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        setSquadError('Kon spelers niet laden');
        setSquadLoading(false);
        return;
      }

      const raw = await res.json();
      let members: SquadMember[] = [];

      // Handle various API response formats
      if (raw?.data?.data && Array.isArray(raw.data.data)) members = raw.data.data;
      else if (raw?.data?.results && Array.isArray(raw.data.results)) members = raw.data.results;
      else if (raw?.results && Array.isArray(raw.results)) members = raw.results;
      else if (Array.isArray(raw?.data)) members = raw.data;
      else if (Array.isArray(raw)) members = raw;

      // Handle pagination
      let nextUrl = raw?.meta?.pagination?.next;
      while (nextUrl) {
        const nr = await fetch(nextUrl, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!nr.ok) break;
        const nd = await nr.json();
        let nm: SquadMember[] = [];
        if (nd?.data?.data && Array.isArray(nd.data.data)) nm = nd.data.data;
        else if (Array.isArray(nd?.data)) nm = nd.data;
        else if (Array.isArray(nd)) nm = nd;
        members = [...members, ...nm];
        nextUrl = nd?.meta?.pagination?.next;
      }

      // Group by role
      const groups: Record<string, SquadMember[]> = { goalkeeper: [], player: [] };
      members.forEach(p => {
        let roles: string[] = [];
        if (p.functional_roles?.length) roles = p.functional_roles;
        else if (p.metadata?.functional_roles?.length) roles = p.metadata.functional_roles;
        else if (p.data?.functional_role) roles = [p.data.functional_role];
        else if (p.metadata?.team_role) roles = [p.metadata.team_role];
        else roles = ['player'];

        roles.forEach(role => {
          const nr = role.toLowerCase();
          if (nr === 'goalkeeper' || nr === 'keeper' || nr === 'gk') {
            groups.goalkeeper.push(p);
          } else if (groups[nr]) {
            groups[nr].push(p);
          } else {
            groups.player.push(p);
          }
        });
      });

      setSquadGroups(groups);
    } catch (err) {
      console.error('Failed to fetch squad:', err);
      setSquadError('Kon spelers niet laden. Controleer je verbinding.');
    } finally {
      setSquadLoading(false);
    }
  }, [selectedMatch, apiBaseUrl, setSquadGroups, setSquadLoading, setSquadError]);

  // Load saved lineup from match metadata
  const loadSavedLineup = useCallback(() => {
    if (!selectedMatch) return;

    const metadata = (selectedMatch as any).metadata;
    const saved = metadata?.lineup;

    if (saved) {
      if (saved.formation) setLineupFormation(saved.formation);
      if (saved.goalkeeper || saved.player) {
        setLineupSlots({
          goalkeeper: saved.goalkeeper || [],
          player: saved.player || [],
        });
      }
    } else if (metadata?.formation) {
      setLineupFormation(metadata.formation);
    }
  }, [selectedMatch, setLineupFormation, setLineupSlots]);

  // Save lineup to match metadata
  const saveLineup = useCallback(async (): Promise<boolean> => {
    if (!selectedMatch) return false;

    try {
      const matchId = (selectedMatch as any).slug || selectedMatch.id;
      const existingMetadata = (selectedMatch as any).metadata || {};
      const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';

      await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(matchId))}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          metadata: {
            ...existingMetadata,
            formation: lineupSlots,
            lineup: {
              formation: (lineupSlots as any).formation || '4-3-3',
              goalkeeper: lineupSlots.goalkeeper,
              player: lineupSlots.player,
            },
          },
        }),
      });
      return true;
    } catch (err) {
      console.error('Failed to save lineup:', err);
      return false;
    }
  }, [selectedMatch, lineupSlots, apiBaseUrl]);

  return {
    fetchSquad,
    loadSavedLineup,
    saveLineup,
  };
}
