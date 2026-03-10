import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { api } from '@/api/client';
import {
  type Period,
  mergeUniqueById,
  isSeasonPeriod,
  getParentPeriodId,
} from './teamDetailTypes';

interface UseHierarchyDataParams {
  activeTabFromUrl: string;
  apiBaseUrl: string;
  teamIdForDirectoryLists: string;
  clubIdForDirectoryLists: string;
}

export interface UseHierarchyDataReturn {
  hierarchySeasons: Period[];
  hierarchyCompetitionsBySeasonId: Record<string, Period[]>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyMatchesCountByCompetitionId: Record<string, number>;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  hierarchySearch: string;
  setHierarchySearch: Dispatch<SetStateAction<string>>;
}

export function useHierarchyData({
  activeTabFromUrl,
  apiBaseUrl,
  teamIdForDirectoryLists,
  clubIdForDirectoryLists,
}: UseHierarchyDataParams): UseHierarchyDataReturn {
  const [hierarchySeasons, setHierarchySeasons] = useState<Period[]>([]);
  const [hierarchyCompetitionsBySeasonId, setHierarchyCompetitionsBySeasonId] = useState<Record<string, Period[]>>({});
  const [hierarchyMatchesCountBySeasonId, setHierarchyMatchesCountBySeasonId] = useState<Record<string, number>>({});
  const [hierarchyMatchesCountByCompetitionId, setHierarchyMatchesCountByCompetitionId] = useState<Record<string, number>>({});
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [hierarchySearch, setHierarchySearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      if (activeTabFromUrl !== 'hierarchy' && activeTabFromUrl !== 'overview') return;
      if (!teamIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Seasons for this team (typed query first; fallback to untyped + competition parent seasons)
        const seasonProjectIds = [teamIdForDirectoryLists, clubIdForDirectoryLists].filter(Boolean);

        const typedList: Period[] = await api.listAll<any>(`/periods/`, {
          params: {
            ...(seasonProjectIds.length === 1 ? { project_id: seasonProjectIds[0] } : {}),
            ...(seasonProjectIds.length > 1 ? { project_id__in: seasonProjectIds.join(',') } : {}),
            type: 'season',
          },
          pageSize: 2000, maxItems: 5000,
        });

        const untypedList: Period[] = await api.listAll<any>(`/periods/`, {
          params: {
            ...(seasonProjectIds.length === 1 ? { project_id: seasonProjectIds[0] } : {}),
            ...(seasonProjectIds.length > 1 ? { project_id__in: seasonProjectIds.join(',') } : {}),
          },
          pageSize: 2000, maxItems: 5000,
        });

        // Pull season parents from competitions as a last-resort source of truth.
        const competitionsList: Period[] = await api.listAll<any>(`/periods/`, {
          params: {
            project_id: teamIdForDirectoryLists,
            type: 'competition',
          },
          pageSize: 2000, maxItems: 5000,
        });
        const parentSeasonsFromCompetitions = (competitionsList || [])
          .map((c: Period) => c?.parent_period)
          .filter((p): p is NonNullable<Period['parent_period']> => !!(p && (p?.id || (p as Record<string, unknown>)?.slug))) as Period[];

        const seasons = mergeUniqueById(
          [...(typedList || []), ...(untypedList || []), ...parentSeasonsFromCompetitions]
            .filter(isSeasonPeriod)
            .filter((p: Period) => !getParentPeriodId(p)),
        );
        seasons.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

        if (cancelled) return;
        setHierarchySeasons(seasons);

        // 2) Competitions for this team (fetch all periods and group by season parent id)
        const periodsList: Period[] = await api.listAll<any>(`/periods/`, {
          params: { project_id: teamIdForDirectoryLists },
          pageSize: 1000, maxItems: 5000,
        });

        const seasonIds = new Set(seasons.map((s) => String(s.id)));
        const competitions = (periodsList || []).filter((p: Period) => {
          const parentId = getParentPeriodId(p);
          if (!parentId) return false;
          return seasonIds.has(parentId);
        });

        const bySeason: Record<string, Period[]> = {};
        for (const c of competitions) {
          const parentId = getParentPeriodId(c);
          if (!parentId) continue;
          (bySeason[parentId] ||= []).push(c);
        }

        for (const key of Object.keys(bySeason)) {
          bySeason[key] = mergeUniqueById(bySeason[key]).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        }

        // Build children map for recursive activity counts.
        const childrenMap = new Map<string, Period[]>();
        for (const p of periodsList || []) {
          const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
          if (!parentId) continue;
          const key = String(parentId);
          const arr = childrenMap.get(key) || [];
          arr.push(p);
          childrenMap.set(key, arr);
        }

        const getRecursiveActivitiesCount = (p: Period): number => {
          let count = (p?.activities_count ?? 0);
          const children = childrenMap.get(String(p?.id));
          if (children) {
            for (const child of children) {
              count += getRecursiveActivitiesCount(child);
            }
          }
          return count;
        };

        const matchesCountByCompetitionId: Record<string, number> = {};
        for (const list of Object.values(bySeason)) {
          for (const c of list || []) {
            const cid = String(c?.id ?? '').trim();
            if (!cid) continue;
            matchesCountByCompetitionId[cid] = getRecursiveActivitiesCount(c);
          }
        }

        const matchesCountBySeasonId: Record<string, number> = {};
        for (const season of seasons) {
          const sid = String(season?.id ?? '').trim();
          if (!sid) continue;
          const comps = bySeason[sid] || [];
          matchesCountBySeasonId[sid] = comps.reduce((sum, c) => {
            const cid = String(c?.id ?? '').trim();
            return sum + (matchesCountByCompetitionId[cid] ?? 0);
          }, 0);
        }

        if (cancelled) return;
        setHierarchyCompetitionsBySeasonId(bySeason);
        setHierarchyMatchesCountByCompetitionId(matchesCountByCompetitionId);
        setHierarchyMatchesCountBySeasonId(matchesCountBySeasonId);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setHierarchySeasons([]);
        setHierarchyCompetitionsBySeasonId({});
        setHierarchyMatchesCountBySeasonId({});
        setHierarchyMatchesCountByCompetitionId({});
      } finally {
        if (!cancelled) setHierarchyLoading(false);
      }
    };

    void loadHierarchy();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists]);

  return {
    hierarchySeasons,
    hierarchyCompetitionsBySeasonId,
    hierarchyMatchesCountBySeasonId,
    hierarchyMatchesCountByCompetitionId,
    hierarchyLoading,
    hierarchyError,
    hierarchySearch,
    setHierarchySearch,
  };
}
