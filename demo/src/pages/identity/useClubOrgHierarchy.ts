import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { isSeasonPeriod, isCompetitionPeriod } from './orgDetailUtils';
import {
    mergeUniqueById,
    type Project, type Period,
} from './clubOrgDetailHelpers';
import { api } from '@/api';

/* ═══════════════════════════════════════════════════════════════
   useClubOrgHierarchy
   Hierarchy-tab state + data-loading effects extracted from
   useClubOrgDetailData for file-size compliance.
   ═══════════════════════════════════════════════════════════════ */

interface Params {
    activeTabFromUrl: string;
    apiBaseUrl: string;
    orgSlugForDirectoryLists: string;
    clubIdForDirectoryLists: string;
}

export function useClubOrgHierarchy({ activeTabFromUrl, apiBaseUrl, orgSlugForDirectoryLists, clubIdForDirectoryLists }: Params) {
    const apiV1 = getApiV1BaseUrl();
    // ── State ──
    const [hierarchyTeams, setHierarchyTeams] = useState<Project[]>([]);
    const [hierarchySeasonsByTeamId, setHierarchySeasonsByTeamId] = useState<Record<string, Period[]>>({});
    const [hierarchyCompetitionsCountByTeamId, setHierarchyCompetitionsCountByTeamId] = useState<Record<string, number>>({});
    const [hierarchyMatchesCountByTeamId, setHierarchyMatchesCountByTeamId] = useState<Record<string, number>>({});
    const [hierarchyCompetitionsCountBySeasonId, setHierarchyCompetitionsCountBySeasonId] = useState<Record<string, number>>({});
    const [hierarchyMatchesCountBySeasonId, setHierarchyMatchesCountBySeasonId] = useState<Record<string, number>>({});
    const [hierarchyMembersCountByTeamId, setHierarchyMembersCountByTeamId] = useState<Record<string, number>>({});
    const [hierarchyMembersCountForClub, setHierarchyMembersCountForClub] = useState<number | null>(null);
    const [hierarchyLoading, setHierarchyLoading] = useState(false);
    const [hierarchyError, setHierarchyError] = useState<string | null>(null);
    const [hierarchySearch, setHierarchySearch] = useState('');

    // ── Club member count ──
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (activeTabFromUrl !== 'hierarchy') return;
            const clubId = String(clubIdForDirectoryLists || '').trim();
            if (!clubId) return;
            try {
                const data = await api.list<Record<string, unknown>>(`/projects/${encodeURIComponent(clubId)}/members/`, { pageSize: 1 });
                if (!cancelled) setHierarchyMembersCountForClub(data.count);
            } catch { if (!cancelled) setHierarchyMembersCountForClub(null); }
        };
        void run();
        return () => { cancelled = true; };
    }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists]);

    // ── Hierarchy tab data ──
    useEffect(() => {
        let cancelled = false;
        const loadHierarchy = async () => {
            if (activeTabFromUrl !== 'hierarchy') return;
            if (!orgSlugForDirectoryLists || !clubIdForDirectoryLists) return;
            setHierarchyLoading(true);
            setHierarchyError(null);
            try {
                const teamsData = await api.list<Project>(`/organisations/${encodeURIComponent(orgSlugForDirectoryLists)}/projects/`, { pageSize: 2000, params: { include_archived: true, parent_project__isnull: false } });
                const teamsList = teamsData.results;
                const filteredTeams = teamsList
                    .filter((t) => {
                        const parent = t?.parent_id ?? t?.parent_project_id ?? (typeof t?.parent_project === 'object' ? t?.parent_project?.id : t?.parent_project) ?? (typeof t?.parent === 'object' ? t?.parent?.id : t?.parent);
                        if (parent == null) return false;
                        return String(parent) === String(clubIdForDirectoryLists);
                    })
                    .map((t) => ({ id: String(t?.id || '').trim(), name: String(t?.name || 'Team'), slug: t?.slug ? String(t.slug) : undefined, organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined, organisation: t?.organisation }))
                    .filter((t) => Boolean(t.id));
                if (cancelled) return;
                setHierarchyTeams(filteredTeams);

                const teamIds = filteredTeams.map((t) => String(t.id)).filter(Boolean);
                if (!teamIds.length) { setHierarchySeasonsByTeamId({}); return; }

                const chunkSize = 50;
                const chunks: string[][] = [];
                for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));

                const seasonsChunks = await Promise.all(
                    chunks.map(async (chunk) => {
                        const params = new URLSearchParams();
                        params.set('project_id__in', chunk.join(','));
                        params.set('page_size', '500');
                        const typedData = await api.list<Period>('/periods/', { pageSize: 500, params: { project_id__in: chunk.join(','), type: 'season' } });
                        if (typedData.results.length > 0) return typedData.results;
                        const untypedData = await api.list<Period>('/periods/', { pageSize: 500, params: { project_id__in: chunk.join(',') } });
                        return untypedData.results.filter(isSeasonPeriod);
                    }),
                );
                const mergedSeasons = mergeUniqueById(seasonsChunks.flat());
                const byTeam: Record<string, Period[]> = {};
                for (const season of mergedSeasons) {
                    const pid = season?.project_id ?? season?.project?.id ?? '';
                    const teamId = pid != null ? String(pid) : '';
                    if (!teamId) continue;
                    (byTeam[teamId] ||= []).push(season);
                }
                for (const key of Object.keys(byTeam)) byTeam[key] = [...byTeam[key]].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
                if (cancelled) return;
                setHierarchySeasonsByTeamId(byTeam);

                // Competitions + matches counts
                try {
                    const periodsChunks = await Promise.all(
                        chunks.map(async (chunk) => {
                            const params = new URLSearchParams();
                            params.set('project_id__in', chunk.join(','));
                            params.set('page_size', '250');
                            return await fetchAllPages<Period>(`${apiV1}/periods/?${params.toString()}`, { credentials: 'include' }, { bypass: true, maxItems: 5000 });
                        }),
                    );
                    const allPeriods: Period[] = periodsChunks.flat();
                    const childrenMap = new Map<string, Period[]>();
                    for (const p of allPeriods || []) {
                        const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
                        if (!parentId) continue;
                        const key = String(parentId);
                        const arr = childrenMap.get(key) || [];
                        arr.push(p);
                        childrenMap.set(key, arr);
                    }
                    const getRecursiveActivitiesCount = (p: Period): number => {
                        let count: number = Number(p?.activities_count ?? 0);
                        const children = childrenMap.get(String(p?.id));
                        if (children) for (const child of children) count += getRecursiveActivitiesCount(child);
                        return count;
                    };
                    const competitionsCountByTeamId: Record<string, number> = {};
                    const matchesCountByTeamId: Record<string, number> = {};
                    const competitionsCountBySeasonId: Record<string, number> = {};
                    const matchesCountBySeasonId: Record<string, number> = {};
                    for (const p of allPeriods || []) {
                        if (!isCompetitionPeriod(p)) continue;
                        const teamIdRaw = p?.project_id ?? p?.project?.id ?? null;
                        const teamId = teamIdRaw != null ? String(teamIdRaw) : '';
                        if (!teamId) continue;
                        competitionsCountByTeamId[teamId] = (competitionsCountByTeamId[teamId] || 0) + 1;
                        matchesCountByTeamId[teamId] = (matchesCountByTeamId[teamId] || 0) + getRecursiveActivitiesCount(p);
                    }
                    for (const season of mergedSeasons || []) {
                        const seasonId = String(season?.id ?? '').trim();
                        if (!seasonId) continue;
                        const children = childrenMap.get(seasonId) || [];
                        const competitions = (children || []).filter((c) => isCompetitionPeriod(c));
                        competitionsCountBySeasonId[seasonId] = competitions.length;
                        matchesCountBySeasonId[seasonId] = competitions.reduce((sum, c) => sum + getRecursiveActivitiesCount(c), 0);
                    }
                    if (!cancelled) {
                        setHierarchyCompetitionsCountByTeamId(competitionsCountByTeamId);
                        setHierarchyMatchesCountByTeamId(matchesCountByTeamId);
                        setHierarchyCompetitionsCountBySeasonId(competitionsCountBySeasonId);
                        setHierarchyMatchesCountBySeasonId(matchesCountBySeasonId);
                    }
                } catch {
                    if (!cancelled) { setHierarchyCompetitionsCountByTeamId({}); setHierarchyMatchesCountByTeamId({}); setHierarchyCompetitionsCountBySeasonId({}); setHierarchyMatchesCountBySeasonId({}); }
                }

                // Member counts per team
                try {
                    const membersCountByTeamId: Record<string, number> = {};
                    const concurrency = 8;
                    for (let i = 0; i < filteredTeams.length; i += concurrency) {
                        const batch = filteredTeams.slice(i, i + concurrency);
                        const results = await Promise.all(
                            batch.map(async (t) => {
                                const tid = String(t?.id || '').trim();
                                if (!tid) return null;
                                try {
                                    const data = await api.list<Record<string, unknown>>(`/projects/${encodeURIComponent(tid)}/members/`, { pageSize: 1 });
                                    return { teamId: tid, count: data.count };
                                } catch { return { teamId: tid, count: 0 }; }
                            }),
                        );
                        for (const r of results) { if (!r) continue; membersCountByTeamId[r.teamId] = r.count; }
                    }
                    if (!cancelled) setHierarchyMembersCountByTeamId(membersCountByTeamId);
                } catch { if (!cancelled) setHierarchyMembersCountByTeamId({}); }
            } catch (e) {
              logger.error('Failed to load hierarchy', e);
                if (cancelled) return;
                setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
                setHierarchyTeams([]); setHierarchySeasonsByTeamId({});
                setHierarchyCompetitionsCountByTeamId({}); setHierarchyMatchesCountByTeamId({});
                setHierarchyCompetitionsCountBySeasonId({}); setHierarchyMatchesCountBySeasonId({});
                setHierarchyMembersCountByTeamId({});
            } finally { if (!cancelled) setHierarchyLoading(false); }
        };
        void loadHierarchy();
        return () => { cancelled = true; };
    }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists, orgSlugForDirectoryLists]);

    return {
        hierarchySearch, setHierarchySearch,
        hierarchyTeams, hierarchySeasonsByTeamId,
        hierarchyCompetitionsCountByTeamId, hierarchyMatchesCountByTeamId,
        hierarchyCompetitionsCountBySeasonId, hierarchyMatchesCountBySeasonId,
        hierarchyMembersCountByTeamId, hierarchyMembersCountForClub,
        hierarchyLoading, hierarchyError,
    };
}
