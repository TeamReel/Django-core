/**
 * Data fetching for useCompetitionDetailData hook
 */
import { useEffect } from 'react';
import { api } from '@/api/client';
import { logger } from '@/utils/logger';
import { looksLikeUuid, periodPathKey } from '@/utils/periodPath';
import type { Period, SeasonProject as Project } from '@/types/season';
import type { Activity } from '@/types/api/activity';
import type { MemberRef } from '../useCompetitionMutations';
import type { MatchMetadata } from './types';

interface UseFetchersParams {
  effectiveCompetitionId: string;
  resolvedSeasonId: string;
  resolvedCompetitionId: string;
  competition: Period | null;
  project: Project | null;
  club: Project | null;
  activeTab: string;
  competitionsForSwitcher: Period[];
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonKeyOrId: string;
  apiBaseUrl: string;
  matches: Activity[];
  opponentClubNames: Record<string, string>;
  location: { search: string };
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCompetition: (competition: Period | null) => void;
  setResolvedCompetitionId: (id: string) => void;
  setMatches: (matches: Activity[]) => void;
  setMatchesLoading: (loading: boolean) => void;
  setMembers: (members: MemberRef[]) => void;
  setMembersLoading: (loading: boolean) => void;
  setMatchMediaMap: (map: Record<string, Record<string, unknown>[]>) => void;
  setMatchMediaLoading: (loading: boolean) => void;
  setOpponentClubNames: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
}

export function useCompetitionFetchers(params: UseFetchersParams) {
  const {
    effectiveCompetitionId, resolvedSeasonId, resolvedCompetitionId,
    competition, project, club, activeTab, competitionsForSwitcher,
    isTeamRoute, seasonsBasePath, seasonKeyOrId, apiBaseUrl, matches, opponentClubNames,
    location, navigate,
    setLoading, setError, setCompetition, setResolvedCompetitionId,
    setMatches, setMatchesLoading, setMembers, setMembersLoading,
    setMatchMediaMap, setMatchMediaLoading, setOpponentClubNames,
  } = params;

  // ── Resolve competition ────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!resolvedSeasonId || !effectiveCompetitionId) return;
      try {
        setLoading(true);
        setError(null);

        const isUuid = looksLikeUuid(effectiveCompetitionId);
        const fromList = isUuid
          ? competitionsForSwitcher.find((p) => String(p.id) === effectiveCompetitionId)
          : competitionsForSwitcher.find((p) => periodPathKey(p) === effectiveCompetitionId);
        const uuid = String(fromList?.id || (isUuid ? effectiveCompetitionId : '')).trim();
        if (!uuid) throw new Error('Competition not found');
        setResolvedCompetitionId(uuid);

        const json = await api.get<Period>(`/periods/${encodeURIComponent(uuid)}/`);
        setCompetition(json);

        const desired = periodPathKey(json);
        if (desired && desired !== effectiveCompetitionId) {
          const suffix = location.search || '';
          navigate(
            isTeamRoute
              ? `${seasonsBasePath}/${seasonKeyOrId}/${desired}${suffix}`
              : `${seasonsBasePath}/${seasonKeyOrId}/competitions/${desired}${suffix}`,
            { replace: true },
          );
        }
      } catch (e) {
        logger.error('Failed to load competition', e);
        setError(e instanceof Error ? e.message : 'Failed to load competition');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiBaseUrl, competitionsForSwitcher, effectiveCompetitionId, resolvedSeasonId, isTeamRoute, location.search, navigate, seasonsBasePath, seasonKeyOrId, setLoading, setError, setCompetition, setResolvedCompetitionId]);

  // ── Fetch matches ──────────────────────────────────────────────────
  useEffect(() => {
    const needs = ['hierarchy', 'matches', 'overview', 'content'].includes(activeTab);
    if (!needs) return;
    const pid = String(project?.id || '').trim();
    const cid = String(resolvedCompetitionId || competition?.id || '').trim();
    if (!pid || !cid) return;

    let cancelled = false;
    (async () => {
      setMatchesLoading(true);
      try {
        const results = await api.listAll<Activity>('/activities/', {
          params: { project_id: pid, period_id: cid, activity_type: 'match', ordering: '-start_time' },
          pageSize: 250, maxItems: 250,
        });
        if (!cancelled) setMatches(results);
      } catch (e) { logger.error('Failed to fetch matches', e); }
      finally { if (!cancelled) setMatchesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, apiBaseUrl, competition, project, resolvedCompetitionId, setMatches, setMatchesLoading]);

  // ── Fetch media for content matrix ─────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'content' || !matches.length) return;
    let cancelled = false;
    (async () => {
      setMatchMediaLoading(true);
      try {
        const map: Record<string, Record<string, unknown>[]> = {};
        await Promise.all(matches.map(async (m) => {
          try {
            const { results } = await api.list<Record<string, unknown>>('/media/items/', { params: { activity: String(m.id) } });
            map[String(m.id)] = results;
          } catch { map[String(m.id)] = []; }
        }));
        if (!cancelled) setMatchMediaMap(map);
      } finally { if (!cancelled) setMatchMediaLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, apiBaseUrl, matches, setMatchMediaMap, setMatchMediaLoading]);

  // ── Fetch members ──────────────────────────────────────────────────
  useEffect(() => {
    if (!['users', 'overview'].includes(activeTab)) return;
    const pid = String(project?.id || '').trim();
    const cid = String(resolvedCompetitionId || competition?.id || '').trim();
    if (!pid || !cid) return;

    let cancelled = false;
    (async () => {
      setMembersLoading(true);
      try {
        const { results: list } = await api.list<MemberRef>(`/projects/${pid}/members/`, { params: { period: cid } });
        if (!cancelled) setMembers(list);
      } catch (e) { logger.error('Failed to fetch members', e); }
      finally { if (!cancelled) setMembersLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, apiBaseUrl, competition, project, resolvedCompetitionId, setMembers, setMembersLoading]);

  // ── Fetch opponent club names ──────────────────────────────────────
  useEffect(() => {
    if (!matches.length || !apiBaseUrl) return;
    const ids = [...new Set(
      matches.map((m: Activity) => {
        const mc = (m.metadata as MatchMetadata)?.teamreel?.match_context;
        return String(mc?.opponent_club_id || '').trim();
      }).filter((id) => id && !opponentClubNames[id]),
    )];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(ids.map(async (cid) => {
        try {
          const data = await api.get<{ name?: string }>(`/projects/${encodeURIComponent(cid)}/`);
          if (data?.name) results[cid] = data.name;
        } catch { /* ignore */ }
      }));
      if (!cancelled) setOpponentClubNames((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [matches, apiBaseUrl, opponentClubNames, setOpponentClubNames]);
}
