import { useEffect, useCallback } from 'react';
import { api } from '@/api';
import { periodPathKey } from '../../utils/periodPath';
import { FORMATION_LAYOUTS } from '../identity/ContentGenerationModal';
import type { Period, SeasonProject as Project } from '../../types/season';
import type { MatchDetail, OrgMember, SeasonSquadParticipation, ProjectMember } from './matchDetailTypes';
import { logger } from '@/utils/logger';

// ─── Local types ─────────────────────────────────────────────────────────────

/** Squad member record from the project members API */
interface SquadMemberRecord {
  functional_roles?: string[];
  metadata?: { functional_roles?: string[]; team_role?: string; [key: string]: unknown };
  data?: { functional_role?: string; [key: string]: unknown };
  [key: string]: unknown;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseMatchDataFetchingParams {
  apiBaseUrl: string;
  resolvedSeasonId: string | null;
  providerCompetitions: Period[];
  effectiveCompetitionIdVal: string;
  effectiveMatchIdVal: string;
  seasonsBasePath: string;
  seasonKeyOrId: string | null;
  orgSlugOrId: string;
  club: { id?: string | number; name?: string; [key: string]: unknown } | null;
  match: MatchDetail | null;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  location: { search: string; pathname: string };
  // Setters from formState
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setCompetition: (v: Period | null) => void;
  setResolvedCompetitionUuid: (v: string) => void;
  setMatch: React.Dispatch<React.SetStateAction<MatchDetail | null>>;
  setOpponentClub: (v: Project | null) => void;
  setRosterLoading: (v: boolean) => void;
  setRosterError: (v: string | null) => void;
  setTeamProjectMembers: (v: ProjectMember[]) => void;
  setOrgMembersAll: (v: OrgMember[]) => void;
  setEligibleMembers: (v: OrgMember[]) => void;
  setClubProjectMembers: (v: ProjectMember[]) => void;
  setLineupSquadLoading: (v: boolean) => void;
  setLineupSquad: (v: Record<string, SquadMemberRecord[]>) => void;
  setLineupFormation: (v: string) => void;
  setLineupSlots: (v: Record<string, string[]>) => void;
  setLineupBenchStatus: (v: Record<string, string>) => void;
}

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UseMatchDataFetchingReturn {
  refreshMatch: () => Promise<void>;
}

// ─── Hook: data loading effects ──────────────────────────────────────────────

export function useMatchDataFetching(params: UseMatchDataFetchingParams): UseMatchDataFetchingReturn {
  const {
    apiBaseUrl, resolvedSeasonId, providerCompetitions,
    effectiveCompetitionIdVal, effectiveMatchIdVal, seasonsBasePath, seasonKeyOrId,
    orgSlugOrId, club, match, navigate, location,
    setLoading, setError, setCompetition, setResolvedCompetitionUuid, setMatch,
    setOpponentClub, setRosterLoading, setRosterError, setTeamProjectMembers,
    setOrgMembersAll, setEligibleMembers, setClubProjectMembers,
    setLineupSquadLoading, setLineupSquad,
    setLineupFormation, setLineupSlots, setLineupBenchStatus,
  } = params;

  // ── Fetch competition + match + opponent ──
  useEffect(() => {
    const run = async () => {
      if (!resolvedSeasonId || !effectiveCompetitionIdVal || !effectiveMatchIdVal) return;
      try {
        setLoading(true);
        setError(null);

        let competitionUuid = '';
        const isUuidComp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveCompetitionIdVal);
        if (isUuidComp) {
          competitionUuid = effectiveCompetitionIdVal;
        } else {
          // Try local provider cache first
          const found = providerCompetitions.find((p) => periodPathKey(p) === effectiveCompetitionIdVal);
          competitionUuid = String(found?.id || '').trim();

          // Fallback: search by slug via API when provider hasn't loaded yet
          if (!competitionUuid && resolvedSeasonId) {
            try {
              const { results } = await api.list<any>('/periods/', {
                params: { parent: resolvedSeasonId, slug: effectiveCompetitionIdVal },
              });
              if (results.length > 0) {
                competitionUuid = String(results[0].id || '').trim();
              }
            } catch { /* ignore — will fall through to error */ }
          }
        }

        if (!competitionUuid) {
          // If provider competitions are still loading, don't show an error yet
          if (providerCompetitions.length === 0) return;
          throw new Error('Competition not found');
        }
        setResolvedCompetitionUuid(competitionUuid);

        const [competitionJson, matchJson] = await Promise.all([
          api.get<Period>(`/periods/${encodeURIComponent(competitionUuid)}/`),
          api.get<MatchDetail>(`/activities/${encodeURIComponent(effectiveMatchIdVal)}/`),
        ]);

        setCompetition(competitionJson);

        const desiredCompetitionKey = periodPathKey(competitionJson) || '';
        if (desiredCompetitionKey && String(desiredCompetitionKey) !== String(effectiveCompetitionIdVal)) {
          const suffix = location.search ? location.search : '';
          navigate(
            `${seasonsBasePath}/${seasonKeyOrId}/${desiredCompetitionKey}/${effectiveMatchIdVal}${suffix}`,
            { replace: true }
          );
          return;
        }

        if (!matchJson) throw new Error('Match not found');
        setMatch(matchJson);

        const oppClubId = String(matchJson.metadata?.teamreel?.match_context?.opponent_club_id || '').trim();
        if (oppClubId && orgSlugOrId) {
          try {
            const oppClub = await api.get<Project>(`/projects/${encodeURIComponent(oppClubId)}/`);
            if (oppClub) setOpponentClub(oppClub);
          } catch { /* ignore */ }
        }

        const desiredMatchKey = String(matchJson?.slug || '').trim();
        if (desiredMatchKey && desiredMatchKey !== String(effectiveMatchIdVal)) {
          const suffix = location.search ? location.search : '';
          const compKey = periodPathKey(competitionJson) || String(effectiveCompetitionIdVal);
          navigate(
            `${seasonsBasePath}/${seasonKeyOrId}/${compKey}/${desiredMatchKey}${suffix}`,
            { replace: true }
          );
          return;
        }
      } catch (e) {
        logger.error('Failed to load match', e);
        setError(e instanceof Error ? e.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [resolvedSeasonId, providerCompetitions, effectiveCompetitionIdVal, effectiveMatchIdVal, seasonsBasePath, seasonKeyOrId, orgSlugOrId]);

  // ── Roster loading ──
  useEffect(() => {
    const run = async () => {
      if (!match?.project?.id || !orgSlugOrId) return;
      try {
        setRosterLoading(true);
        setRosterError(null);

        const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);
        const buildSyntheticMember = (id: string, label: string): OrgMember => ({ id, user: { id, full_name: label } });

        const seasonUuid = String(resolvedSeasonId || '').trim();

        const fetchMembers = async (withSeasonFilter: boolean) => {
          try {
            const params: Record<string, string | undefined> = {};
            if (withSeasonFilter && seasonUuid) params.period = seasonUuid;
            const { results } = await api.list<ProjectMember>(`/projects/${encodeURIComponent(String(match.project.id))}/members/`, {
              pageSize: 500,
              params,
            });
            return { ok: true, status: 200, detail: '', list: results };
          } catch (_e: unknown) {
            const e = _e as { status?: number; message?: string };
            return { ok: false, status: e?.status || 0, detail: e?.message || '', list: [] };
          }
        };

        let projectMembers: ProjectMember[] = [];
        let lastRosterError: string | null = null;
        if (seasonUuid) {
          const seasonAttempt = await fetchMembers(true);
          if (seasonAttempt.ok) projectMembers = seasonAttempt.list;
          else lastRosterError = `Failed to load season roster (${seasonAttempt.status}) ${seasonAttempt.detail || ''}`.trim();
          if (projectMembers.length === 0) {
            const fallback = await fetchMembers(false);
            if (fallback.ok) projectMembers = fallback.list;
            else lastRosterError = `Failed to load team roster (${fallback.status}) ${fallback.detail || ''}`.trim();
          }
        } else {
          const fallback = await fetchMembers(false);
          if (fallback.ok) projectMembers = fallback.list;
          else lastRosterError = `Failed to load team roster (${fallback.status}) ${fallback.detail || ''}`.trim();
        }

        if (projectMembers.length === 0 && lastRosterError) throw new Error(lastRosterError);
        if (!Array.isArray(projectMembers)) projectMembers = [];
        setTeamProjectMembers(projectMembers as ProjectMember[]);

        const projectUserIds = new Set(
          asArray<ProjectMember>(projectMembers).map((m) => String(m?.user?.id ?? m?.user_id ?? '')).filter(Boolean)
        );

        const eligibleFromProjectMembers: OrgMember[] = asArray<ProjectMember>(projectMembers)
          .map((m: OrgMember) => {
            const memberId = String(m?.organisation_membership_id || '').trim();
            if (!memberId) return null;
            return { id: memberId, user: m?.user } as OrgMember;
          })
          .filter(Boolean) as OrgMember[];
        eligibleFromProjectMembers.sort((a, b) => {
          const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
          const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
          return an.localeCompare(bn);
        });

        let orgMembers: OrgMember[] = [];
        if (eligibleFromProjectMembers.length === 0) {
          try {
            const { results } = await api.list<OrgMember>(`/organisations/${encodeURIComponent(String(orgSlugOrId))}/members/`, { pageSize: 1000 });
            orgMembers = results;
          } catch (e) { throw e; }
        }
        setOrgMembersAll(orgMembers);

        const byOrgMembershipId = new Map<string, OrgMember>();
        for (const m of asArray<OrgMember>(orgMembers)) { if (m?.id) byOrgMembershipId.set(String(m.id), m); }

        let preferredEligibleMembers: OrgMember[] | null = null;
        if (eligibleFromProjectMembers.length > 0) preferredEligibleMembers = eligibleFromProjectMembers;

        if ((!preferredEligibleMembers || preferredEligibleMembers.length === 0) && seasonUuid) {

          const fetchSquad = async (withRoleFilter: boolean) => {
            try {
              const params: Record<string, string> = { period_id: seasonUuid };
              if (withRoleFilter) params.role = 'squad_member';
              const { results } = await api.list<SeasonSquadParticipation>('/participations/', { pageSize: 500, params });
              return { ok: true, status: 200, detail: '', list: results as SeasonSquadParticipation[] };
            } catch (_e: unknown) {
              const e = _e as { status?: number; message?: string };
              return { ok: false, status: e?.status || 0, detail: e?.message || '', list: [] as SeasonSquadParticipation[] };
            }
          };

          const squadAttempt = await fetchSquad(true);
          let squadParticipations = squadAttempt.ok ? (squadAttempt.list as SeasonSquadParticipation[]) : [];
          if (squadParticipations.length === 0) {
            const anyRole = await fetchSquad(false);
            if (anyRole.ok) squadParticipations = anyRole.list as SeasonSquadParticipation[];
          }

          const squadMembers: OrgMember[] = [];
          for (const p of squadParticipations) {
            const mid = String(p?.member?.id || '').trim();
            if (!mid) continue;
            const existing = byOrgMembershipId.get(mid);
            squadMembers.push(existing || buildSyntheticMember(mid, String(p?.member?.user_name || '\u2014').trim() || '\u2014'));
          }

          if (squadMembers.length > 0) {
            const seen = new Set<string>();
            const deduped = squadMembers.filter((m) => { const k = String(m.id); if (!k || seen.has(k)) return false; seen.add(k); return true; });
            deduped.sort((a, b) => {
              const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
              const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
              return an.localeCompare(bn);
            });
            preferredEligibleMembers = deduped;
          }
        }

        if (!preferredEligibleMembers || preferredEligibleMembers.length === 0) {
          preferredEligibleMembers = asArray<OrgMember>(orgMembers)
            .filter((m: OrgMember) => m?.id && projectUserIds.has(String(m?.user?.id ?? '')))
            .sort((a: OrgMember, b: OrgMember) => {
              const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
              const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
              return an.localeCompare(bn);
            });
        }

        setEligibleMembers(preferredEligibleMembers || []);

        if (club?.id) {
          try {
            const { results } = await api.list<ProjectMember>(`/projects/${encodeURIComponent(String(club.id))}/members/`, { pageSize: 500 });
            setClubProjectMembers(results);
          } catch { /* ignore */ }
        }
      } catch (e) {
        logger.error('Failed to load roster', e);
        setRosterError(e instanceof Error ? e.message : 'Failed to load roster');
      } finally {
        setRosterLoading(false);
      }
    };

    run();
  }, [club?.id, match?.project?.id, orgSlugOrId, resolvedSeasonId]);

  // ── Squad for formation lineup editor ──
  useEffect(() => {
    const projectIdVal = match?.project?.id;
    if (!projectIdVal) return;

    const fetchSquadData = async () => {
      setLineupSquadLoading(true);
      try {
        const members = await api.listAll<SquadMemberRecord>(`/projects/${encodeURIComponent(String(projectIdVal))}/members/`, { pageSize: 100 });

        const groups: Record<string, SquadMemberRecord[]> = { goalkeeper: [], player: [], coach: [], assistant: [] };
        members.forEach((p: SquadMemberRecord) => {
          let roles: string[] = [];
          if (p.functional_roles && Array.isArray(p.functional_roles) && p.functional_roles.length > 0) roles = p.functional_roles;
          else if (p.metadata?.functional_roles && Array.isArray(p.metadata.functional_roles) && p.metadata.functional_roles.length > 0) roles = p.metadata.functional_roles;
          else if (p.data?.functional_role) roles = [p.data.functional_role];
          else if (p.metadata?.team_role) roles = [p.metadata.team_role];
          else roles = ['player'];
          roles.forEach(role => {
            const nr = role.toLowerCase();
            if (nr === 'keeper' || nr === 'gk') groups.goalkeeper.push(p);
            else if (groups[nr]) groups[nr].push(p);
            else groups.player.push(p);
          });
        });
        setLineupSquad(groups);
      } catch { /* ignore */ } finally { setLineupSquadLoading(false); }
    };

    fetchSquadData();
  }, [match?.project?.id]);

  // ── Load saved lineup from match metadata ──
  useEffect(() => {
    const saved = match?.metadata?.lineup;
    if (saved) {
      if (saved.formation && FORMATION_LAYOUTS[saved.formation]) setLineupFormation(saved.formation);
      if (saved.goalkeeper || saved.player) setLineupSlots({ goalkeeper: saved.goalkeeper || [], player: saved.player || [] });
      if (saved.bench) setLineupBenchStatus(saved.bench);
    } else if (match?.metadata?.formation) {
      setLineupFormation(match.metadata.formation);
    }
  }, [match?.id]);

  // ── Refresh match from API ──
  const refreshMatch = useCallback(async () => {
    if (!match?.id) return;
    try {
      const raw = await api.get<MatchDetail>(`/activities/${encodeURIComponent(String(match.id))}/`);
      setMatch(raw);
    } catch { /* ignore */ }
  }, [match?.id]);

  return { refreshMatch };
}
