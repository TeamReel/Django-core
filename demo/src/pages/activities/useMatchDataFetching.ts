import { useEffect, useCallback } from 'react';
import { periodPathKey } from '../../utils/periodPath';
import { FORMATION_LAYOUTS } from '../identity/ContentGenerationModal';
import type { Period, SeasonProject as Project } from '../../types/season';
import type { MatchDetail, OrgMember, SeasonSquadParticipation, ProjectMember } from './matchDetailTypes';
import { getEnvelopeData } from './matchDetailTypes';

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
  club: any;
  match: MatchDetail | null;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  location: any;
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
              const searchRes = await fetch(
                `${apiBaseUrl}/api/v1/periods/?parent=${encodeURIComponent(resolvedSeasonId)}&slug=${encodeURIComponent(effectiveCompetitionIdVal)}`,
                { credentials: 'include' },
              );
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const results = Array.isArray(searchData) ? searchData : (searchData?.results || searchData?.data || []);
                if (results.length > 0) {
                  competitionUuid = String(results[0].id || '').trim();
                }
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

        const [competitionRes, matchRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(competitionUuid)}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(effectiveMatchIdVal)}/`, { credentials: 'include' }),
        ]);

        if (!competitionRes.ok) throw new Error('Failed to load competition');
        const competitionJson = getEnvelopeData<Period>(await competitionRes.json());
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

        if (!matchRes.ok) throw new Error(matchRes.status === 404 ? 'Match not found' : 'Failed to load match');
        const matchJson = getEnvelopeData<MatchDetail>(await matchRes.json());
        setMatch(matchJson);

        const oppClubId = String(matchJson.metadata?.teamreel?.match_context?.opponent_club_id || '').trim();
        if (oppClubId && orgSlugOrId) {
          try {
            const oppClubRes = await fetch(
              `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(oppClubId)}/`,
              { credentials: 'include' }
            );
            if (oppClubRes.ok) setOpponentClub(getEnvelopeData<Project>(await oppClubRes.json()));
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
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, resolvedSeasonId, providerCompetitions, effectiveCompetitionIdVal, effectiveMatchIdVal, seasonsBasePath, seasonKeyOrId, orgSlugOrId]);

  // ── Roster loading ──
  useEffect(() => {
    const run = async () => {
      if (!match?.project?.id || !orgSlugOrId) return;
      try {
        setRosterLoading(true);
        setRosterError(null);

        const asArray = (value: any): any[] => (Array.isArray(value) ? value : []);
        const unwrap = (raw: any): any => raw?.data ?? raw;
        const extractList = (payload: any): any[] => {
          const u = unwrap(payload);
          if (Array.isArray(u)) return u;
          if (Array.isArray(u?.results)) return u.results;
          if (Array.isArray(u?.items)) return u.items;
          if (Array.isArray(u?.data)) return u.data;
          if (Array.isArray(u?.data?.results)) return u.data.results;
          if (Array.isArray(u?.data?.items)) return u.data.items;
          if (Array.isArray(u?.data?.data)) return u.data.data;
          if (Array.isArray(u?.data?.data?.results)) return u.data.data.results;
          return [];
        };
        const buildSyntheticMember = (id: string, label: string): OrgMember => ({ id, user: { id, full_name: label } });

        const seasonUuid = String(resolvedSeasonId || '').trim();
        const baseMembersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(match.project.id))}/members/`;

        const fetchMembers = async (withSeasonFilter: boolean) => {
          const p = new URLSearchParams();
          p.set('page_size', '500');
          if (withSeasonFilter && seasonUuid) p.set('period', seasonUuid);
          const res = await fetch(`${baseMembersUrl}?${p.toString()}`, { credentials: 'include' });
          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            return { ok: false, status: res.status, detail, list: [] };
          }
          const raw = await res.json().catch(() => null);
          return { ok: true, status: res.status, detail: '', list: extractList(raw) };
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
          asArray(projectMembers).map((m) => String(m?.user?.id ?? m?.user_id ?? '')).filter(Boolean)
        );

        const eligibleFromProjectMembers: OrgMember[] = asArray(projectMembers)
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
            const orgRes = await fetch(
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(String(orgSlugOrId))}/members/?page_size=1000`,
              { credentials: 'include' }
            );
            if (orgRes.ok) orgMembers = extractList(await orgRes.json().catch(() => null)) as OrgMember[];
            else { const d = await orgRes.text().catch(() => ''); throw new Error(`Failed to load organisation members (${orgRes.status}) ${d || ''}`.trim()); }
          } catch (e) { throw e; }
        }
        setOrgMembersAll(orgMembers);

        const byOrgMembershipId = new Map<string, OrgMember>();
        for (const m of asArray(orgMembers)) { if (m?.id) byOrgMembershipId.set(String(m.id), m); }

        let preferredEligibleMembers: OrgMember[] | null = null;
        if (eligibleFromProjectMembers.length > 0) preferredEligibleMembers = eligibleFromProjectMembers;

        if ((!preferredEligibleMembers || preferredEligibleMembers.length === 0) && seasonUuid) {
          const baseSquadParams = new URLSearchParams();
          baseSquadParams.set('page_size', '500');
          baseSquadParams.set('period_id', seasonUuid);

          const fetchSquad = async (withRoleFilter: boolean) => {
            const p = new URLSearchParams(baseSquadParams);
            if (withRoleFilter) p.set('role', 'squad_member');
            const res = await fetch(`${apiBaseUrl}/api/v1/participations/?${p.toString()}`, { credentials: 'include' });
            if (!res.ok) { const d = await res.text().catch(() => ''); return { ok: false, status: res.status, detail: d, list: [] }; }
            return { ok: true, status: res.status, detail: '', list: extractList(await res.json().catch(() => null)) };
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
          preferredEligibleMembers = asArray(orgMembers)
            .filter((m: OrgMember) => m?.id && projectUserIds.has(String(m?.user?.id ?? '')))
            .sort((a: OrgMember, b: OrgMember) => {
              const an = String(a?.user?.full_name || `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`.trim() || a?.user?.email || '').toLowerCase();
              const bn = String(b?.user?.full_name || `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.trim() || b?.user?.email || '').toLowerCase();
              return an.localeCompare(bn);
            });
        }

        setEligibleMembers(preferredEligibleMembers || []);

        if (club?.id) {
          const clubRes = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(club.id))}/members/?page_size=500`,
            { credentials: 'include' }
          );
          if (clubRes.ok) setClubProjectMembers(extractList(await clubRes.json().catch(() => null)) as ProjectMember[]);
        }
      } catch (e) {
        console.error(e);
        setRosterError(e instanceof Error ? e.message : 'Failed to load roster');
      } finally {
        setRosterLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, club?.id, match?.project?.id, orgSlugOrId, resolvedSeasonId]);

  // ── Squad for formation lineup editor ──
  useEffect(() => {
    const projectIdVal = match?.project?.id;
    if (!projectIdVal) return;

    const fetchSquadData = async () => {
      setLineupSquadLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectIdVal))}/members/?page_size=100`;
        const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) return;
        const raw = await res.json();
        let members: SquadMemberRecord[] = [];
        if (raw?.data?.data && Array.isArray(raw.data.data)) members = raw.data.data;
        else if (raw?.data?.results && Array.isArray(raw.data.results)) members = raw.data.results;
        else if (raw?.results && Array.isArray(raw.results)) members = raw.results;
        else if (Array.isArray(raw?.data)) members = raw.data;
        else if (Array.isArray(raw)) members = raw;

        let nextUrl = raw?.meta?.pagination?.next;
        while (nextUrl) {
          const nr = await fetch(nextUrl, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
          if (!nr.ok) break;
          const nd = await nr.json();
          let nm: SquadMemberRecord[] = [];
          if (nd?.data?.data && Array.isArray(nd.data.data)) nm = nd.data.data;
          else if (Array.isArray(nd?.data)) nm = nd.data;
          else if (Array.isArray(nd)) nm = nd;
          members = [...members, ...nm];
          nextUrl = nd?.meta?.pagination?.next;
        }

        const groups: Record<string, SquadMemberRecord[]> = { goalkeeper: [], player: [], coach: [], assistant: [] };
        members.forEach((p: SquadMemberRecord) => {
          let roles: string[] = [];
          if (p.functional_roles && Array.isArray(p.functional_roles) && p.functional_roles.length > 0) roles = p.functional_roles;
          else if (p.metadata?.functional_roles && Array.isArray(p.metadata.functional_roles) && p.metadata.functional_roles.length > 0) roles = p.metadata.functional_roles;
          else if (p.data?.functional_role) roles = [p.data.functional_role];
          else if (p.metadata?.team_role) roles = [p.metadata.team_role];
          else roles = ['player'];
          roles.forEach(role => { const nr = role.toLowerCase(); if (groups[nr]) groups[nr].push(p); });
        });
        setLineupSquad(groups);
      } catch { /* ignore */ } finally { setLineupSquadLoading(false); }
    };

    fetchSquadData();
  }, [apiBaseUrl, match?.project?.id]);

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
  }, [match?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh match from API ──
  const refreshMatch = useCallback(async () => {
    if (!match?.id) return;
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(match.id))}/`, {
      credentials: 'include',
    });
    if (!res.ok) return;
    const raw = await res.json().catch(() => null);
    setMatch(getEnvelopeData(raw));
  }, [match?.id, apiBaseUrl]);

  return { refreshMatch };
}
