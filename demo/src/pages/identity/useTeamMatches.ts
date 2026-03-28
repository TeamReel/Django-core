import { useEffect, useMemo, useState } from 'react';

import { api } from '@/api/client';
import type { TeamMatchRecord } from './useTeamTabData.types';

interface UseTeamMatchesParams {
  activeTabFromUrl: string;
  apiBaseUrl: string;
  teamIdForDirectoryLists: string;
}

export interface UseTeamMatchesReturn {
  teamMatches: TeamMatchRecord[];
  teamMatchesLoading: boolean;
  teamMatchesByPeriodId: Record<string, TeamMatchRecord[]>;
  contentCount: number | null;
  contentCountLoading: boolean;
}

export function useTeamMatches({
  activeTabFromUrl,
  apiBaseUrl,
  teamIdForDirectoryLists,
}: UseTeamMatchesParams): UseTeamMatchesReturn {
  const [teamMatches, setTeamMatches] = useState<TeamMatchRecord[]>([]);
  const [teamMatchesLoading, setTeamMatchesLoading] = useState(false);
  const [contentCount, setContentCount] = useState<number | null>(null);
  const [contentCountLoading, setContentCountLoading] = useState(false);

  // ── Load content count (generation requests for this team) ──
  useEffect(() => {
    let cancelled = false;

    const loadContentCount = async () => {
      if (activeTabFromUrl !== 'overview') return;
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!teamId) return;

      setContentCountLoading(true);
      try {
        const { count } = await api.list<Record<string, unknown>>('/generative/requests/', {
          params: { project: teamId },
          pageSize: 1,
        });
        if (!cancelled) setContentCount(typeof count === 'number' ? count : 0);
      } catch {
        if (!cancelled) setContentCount(0);
      } finally {
        if (!cancelled) setContentCountLoading(false);
      }
    };

    void loadContentCount();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists]);

  // ── Load team matches (for hierarchy drill-down and overview recent matches) ──
  useEffect(() => {
    let cancelled = false;

    const loadTeamMatches = async () => {
      if (activeTabFromUrl !== 'overview' && activeTabFromUrl !== 'hierarchy') return;
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!teamId) return;

      setTeamMatchesLoading(true);
      try {
        const list = await api.listAll<TeamMatchRecord>('/activities/', {
          params: {
            project_id: teamId,
            activity_type: 'match',
            ordering: '-start_time',
          },
          pageSize: 250, maxItems: 500,
        });
        if (!cancelled) setTeamMatches(list || []);
      } catch {
        if (!cancelled) setTeamMatches([]);
      } finally {
        if (!cancelled) setTeamMatchesLoading(false);
      }
    };

    void loadTeamMatches();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists]);

  /** Matches grouped by period (competition) id */
  const teamMatchesByPeriodId = useMemo(() => {
    const map: Record<string, TeamMatchRecord[]> = {};
    for (const m of teamMatches) {
      const pid = String(m?.period_id || (typeof m?.period === 'object' ? m?.period?.id : m?.period) || '').trim();
      if (!pid) continue;
      (map[pid] ||= []).push(m);
    }
    return map;
  }, [teamMatches]);

  return {
    teamMatches,
    teamMatchesLoading,
    teamMatchesByPeriodId,
    contentCount,
    contentCountLoading,
  };
}
