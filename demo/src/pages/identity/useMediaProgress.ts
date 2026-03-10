import { useEffect, useMemo, useState } from 'react';

import { api } from '@/api/client';
import { getMediaProcessingState } from '@/utils/mediaHelpers';
import type { TeamMemberRecord } from './useTeamTabData.types';
import { TRACKED_SLOTS } from './useTeamTabData.types';

interface UseMediaProgressParams {
  activeTabFromUrl: string;
  apiBaseUrl: string;
  teamIdForDirectoryLists: string;
}

export interface UseMediaProgressReturn {
  fullMembers: TeamMemberRecord[];
  fullMembersLoading: boolean;
  refreshFullMembers: () => void;
  assetStats: { id: string; label: string; done: number; total: number; pct: number }[];
}

export function useMediaProgress({
  activeTabFromUrl,
  apiBaseUrl,
  teamIdForDirectoryLists,
}: UseMediaProgressParams): UseMediaProgressReturn {
  const [fullMembers, setFullMembers] = useState<TeamMemberRecord[]>([]);
  const [fullMembersLoading, setFullMembersLoading] = useState(false);
  const [fullMembersRefreshKey, setFullMembersRefreshKey] = useState(0);
  const refreshFullMembers = () => setFullMembersRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    const loadFullMembers = async () => {
      if (!['overview', 'members', 'media'].includes(activeTabFromUrl)) return;
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!teamId) return;

      setFullMembersLoading(true);
      try {
        const { results } = await api.list<any>(
          `/projects/${encodeURIComponent(teamId)}/members/`,
          { pageSize: 200 },
        );

        // ── Deduplicate by user id (same player may appear with different periods) ──
        const byUserId = new Map<string, any>();
        for (const m of results) {
          const uid = String(m?.user?.id ?? m?.id ?? '').trim();
          if (!uid) continue;
          const existing = byUserId.get(uid);
          if (existing) {
            // Merge functional_roles arrays
            const existingRoles: string[] = existing.functional_roles || [];
            const newRoles: string[] = m.functional_roles || [];
            existing.functional_roles = [...new Set([...existingRoles, ...newRoles])];
            // Keep the entry with the most complete metadata (teamreel_assets)
            const existingAssets = Object.keys(existing?.metadata?.teamreel_assets || {}).length;
            const newAssets = Object.keys(m?.metadata?.teamreel_assets || {}).length;
            if (newAssets > existingAssets) {
              existing.metadata = m.metadata;
            }
          } else {
            byUserId.set(uid, { ...m });
          }
        }
        const deduped = Array.from(byUserId.values());

        // ── Sort alphabetically by name ──
        deduped.sort((a, b) => {
          const au = a?.user || a;
          const bu = b?.user || b;
          const aName = `${au?.last_name || ''} ${au?.first_name || ''} ${au?.email || ''}`.trim().toLowerCase();
          const bName = `${bu?.last_name || ''} ${bu?.first_name || ''} ${bu?.email || ''}`.trim().toLowerCase();
          return aName.localeCompare(bName);
        });

        if (!cancelled) setFullMembers(deduped);
      } catch {
        if (!cancelled) setFullMembers([]);
      } finally {
        if (!cancelled) setFullMembersLoading(false);
      }
    };

    void loadFullMembers();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists, fullMembersRefreshKey]);

  /** Media asset stats (per slot completion) */
  const assetStats = useMemo(() => {
    const total = fullMembers.length;
    return TRACKED_SLOTS.map((slot) => {
      const done = fullMembers.filter((m) => {
        const state = getMediaProcessingState(m, slot.id);
        return state === 'processed' || state === 'raw';
      }).length;
      return { ...slot, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [fullMembers]);

  return {
    fullMembers,
    fullMembersLoading,
    refreshFullMembers,
    assetStats,
  };
}
