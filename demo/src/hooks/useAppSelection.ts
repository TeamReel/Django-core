import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { fetchAllPages } from '../utils/fetchAllPages';
import { periodPathKey } from '../utils/periodPath';
import { getApiV1BaseUrl } from '../utils/apiFetch';
import {
  type AppProjectRow,
  type AppPeriodRow,
  type AppSelection,
  type ParsedPathFields,
  APP_LAST_CTX_KEY,
  parseAppPath,
} from './appSelectionParser';

/** Minimal organisation shape for UUID→slug resolution. */
interface OrganisationRow {
  id: string | number;
  slug: string;
  name?: string;
}

export const APP_SELECTION_VERSION = 'v4-own-teams';

export function useAppSelection(): AppSelection {
  const location = useLocation();
  const { context } = useContextSwitcher();
  const { user } = useAuth(); // assuming useAuth provides authenticated user

  // Pre-seed from localStorage for instant rendering (overwritten by async compute()).
  // This eliminates the cold-start flicker where "Mijn Team" shows /directory
  // while the async resolution is in flight.
  const [appSelection, setAppSelection] = useState<AppSelection>(() => {
    try {
      const raw = localStorage.getItem(APP_LAST_CTX_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      if (parsed && typeof parsed === 'object') {
        const orgSlug = String(parsed.orgSlug || '');
        const clubSlugOrId = parsed.clubSlugOrId ? String(parsed.clubSlugOrId) : null;
        const teamSlugOrId = parsed.teamSlugOrId ? String(parsed.teamSlugOrId) : null;
        const seasonSlugOrId = parsed.seasonSlugOrId ? String(parsed.seasonSlugOrId) : null;
        if (orgSlug) {
          return {
            orgSlug,
            clubSlugOrId,
            clubName: null,
            teamSlugOrId,
            teamName: null,
            teamIdForApi: null,
            seasonSlugOrId,
            seasonName: null,
            seasonIdForApi: null,
            competitionSlugOrId: parsed.competitionSlugOrId ? String(parsed.competitionSlugOrId) : null,
            competitionName: null,
            competitionIdForApi: null,
            matchId: parsed.matchId ? String(parsed.matchId) : null,
            myOrgSlug: orgSlug,
            myClubSlugOrId: clubSlugOrId,
            myTeamSlugOrId: teamSlugOrId,
            mySeasonSlugOrId: seasonSlugOrId,
          };
        }
      }
    } catch {
      // ignore — fallback to nulls
    }
    return {
      orgSlug: '',
      clubSlugOrId: null,
      clubName: null,
      teamSlugOrId: null,
      teamName: null,
      teamIdForApi: null,
      seasonSlugOrId: null,
      seasonName: null,
      seasonIdForApi: null,
      competitionSlugOrId: null,
      competitionName: null,
      competitionIdForApi: null,
      matchId: null,
      myOrgSlug: null,
      myClubSlugOrId: null,
      myTeamSlugOrId: null,
      mySeasonSlugOrId: null,
    };
  });

  const readLastAppContext = (currentUserEmail?: string) => {
    try {
      const raw = localStorage.getItem(APP_LAST_CTX_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      // Discard stale context from a different user (prevents cross-account leaking)
      if (currentUserEmail && parsed.userEmail && parsed.userEmail !== currentUserEmail) {
        localStorage.removeItem(APP_LAST_CTX_KEY);
        return null;
      }
      return parsed as {
        orgSlug?: string;
        clubSlugOrId?: string;
        teamSlugOrId?: string;
        seasonSlugOrId?: string;
        competitionSlugOrId?: string;
        matchId?: string;
        userEmail?: string;
        ts?: number;
      };
    } catch {
      return null;
    }
  };

  const writeLastAppContext = (next: {
    orgSlug: string;
    clubSlugOrId?: string;
    teamSlugOrId?: string;
    seasonSlugOrId?: string;
    competitionSlugOrId?: string;
    matchId?: string;
  }) => {
    try {
      localStorage.setItem(
        APP_LAST_CTX_KEY,
        JSON.stringify({
          ...next,
          userEmail: userEmail || undefined,
          ts: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  };

  // Memoize path parsing
  const parsedPath = useMemo(() => parseAppPath(location.pathname), [location.pathname]);

  // Stable context dependencies
  const contextOrg = context?.organisation;
  const contextOrgSlug = contextOrg?.slug;
  const contextOrgId = contextOrg?.id;
  const userEmail = user?.email;

  // Track last visited club/team/season context
  // NOTE: We no longer write to localStorage here based on URL parsing alone.
  // Writing happens in compute() after API validation, to prevent "poisoning"
  // localStorage with teams the user doesn't have access to.
  // The legacy match case still merges matchId into existing (validated) context.
  useEffect(() => {
    if (!parsedPath) return;

    if (parsedPath.type === 'legacyMatch' && parsedPath.matchId) {
        const last = readLastAppContext(userEmail);
        if (last?.orgSlug) {
          writeLastAppContext({
            orgSlug: String(last.orgSlug),
            clubSlugOrId: last.clubSlugOrId,
            teamSlugOrId: last.teamSlugOrId,
            seasonSlugOrId: last.seasonSlugOrId,
            competitionSlugOrId: last.competitionSlugOrId,
            matchId: parsedPath.matchId,
          });
        }
    }
  }, [parsedPath, userEmail]);

  // Compute best match
  useEffect(() => {
    // Audit Instrumentation
    const auditId = Math.random().toString(36).substring(7);
    if (import.meta.env.DEV) {
        console.group(`[AppSelection] Re-computing context (${auditId})`);
        console.time(`[AppSelection] Computation ${auditId}`);
    }

    const apiBaseUrl = getApiV1BaseUrl();

    const isUuid = (value: unknown) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
    const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());

    const pickBestByUpdatedOrName = (items: AppProjectRow[]): AppProjectRow | null => {
      const list = [...items];
      list.sort((a, b) => {
        const da = a.updated_at ? Date.parse(a.updated_at) : NaN;
        const db = b.updated_at ? Date.parse(b.updated_at) : NaN;
        const hasDa = Number.isFinite(da);
        const hasDb = Number.isFinite(db);
        if (hasDa && hasDb && da !== db) return db - da;
        if (hasDa && !hasDb) return -1;
        if (!hasDa && hasDb) return 1;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
      return list[0] || null;
    };

    const pickMostRecentSeason = (periods: AppPeriodRow[]): AppPeriodRow | null => {
        const list = [...periods];
        list.sort((a, b) => {
          const ea = a.end_date ? Date.parse(a.end_date) : NaN;
          const eb = b.end_date ? Date.parse(b.end_date) : NaN;
          const sa = a.start_date ? Date.parse(a.start_date) : NaN;
          const sb = b.start_date ? Date.parse(b.start_date) : NaN;
          const hasE = Number.isFinite(ea) && Number.isFinite(eb);
          if (hasE && ea !== eb) return eb - ea;
          const hasS = Number.isFinite(sa) && Number.isFinite(sb);
          if (hasS && sa !== sb) return sb - sa;
          return String(a.name || '').localeCompare(String(b.name || ''));
        });
        return list[0] || null;
      };

      const compute = async () => {
        if (!user) return;

          // Build sets of user's own project IDs from /auth/me memberships.
          // Teams have a parent (club), clubs don't.
          const userTeamIds = new Set(
            (user.projects || []).filter(p => p.parent != null).map(p => String(p.id))
          );
          const userClubIds = new Set(
            (user.projects || []).filter(p => p.parent == null).map(p => String(p.id))
          );

          const searchParams = new URLSearchParams(location.search || '');
          const orgFromQueryRaw = String(searchParams.get('org_id') || searchParams.get('orgId') || searchParams.get('org') || '').trim();

        const orgFromPath = parsedPath && 'orgSlug' in parsedPath ? (parsedPath as ParsedPathFields).orgSlug : null;
        const orgFromPathStr = String(orgFromPath || '');

        const ctxOrgSlugStr = String(contextOrgSlug || '');
        const ctxOrgIdStr = String(contextOrgId || '');

          const last = readLastAppContext(userEmail);

          const orgFromQuery = orgFromQueryRaw;
          const orgFromLast = String(last?.orgSlug || '').trim();

        // Derive the user's primary org slug from their memberships (/auth/me).
        // This is more reliable than the context-switcher which may auto-select
        // a different org (e.g. DFB) that the user only has read access to.
        const userPrimaryOrgSlug = String(user.organisations?.[0]?.slug || '').trim();

        // Priority: URL path > query param > last-visited > user's own org > context-switcher.
        let orgSlug =
          (orgFromPathStr && !isNumericId(orgFromPathStr) && !isUuid(orgFromPathStr))
            ? orgFromPathStr
            : (orgFromQuery || orgFromLast || userPrimaryOrgSlug || ctxOrgSlugStr || '');

        if (!orgSlug) return;

        // If we somehow have an org UUID (e.g. from stale links), resolve UUID -> slug.
        // Organisation API lookup_field is `slug`, so using UUID will 404.
        if (isUuid(orgSlug) || isNumericId(orgSlug)) {
          try {
            const orgs = await fetchAllPages<OrganisationRow>(
              `${apiBaseUrl}/organisations/?page_size=250`,
              { credentials: 'include' },
              { ttlMs: 120_000 },
            );
            const match = (orgs || []).find((o) => String(o?.id || '') === String(orgSlug));
            const resolved = String(match?.slug || '').trim();
            if (!resolved) return;
            orgSlug = resolved;
          } catch {
            return;
          }
        }

        // Determine target slugs from URL if present
        const urlClubSlug = parsedPath && 'clubSlugOrId' in parsedPath ? (parsedPath as ParsedPathFields).clubSlugOrId : null;
        const urlTeamSlug = parsedPath && 'teamSlugOrId' in parsedPath ? (parsedPath as ParsedPathFields).teamSlugOrId : null;
        const urlSeasonSlug = parsedPath && 'seasonSlugOrId' in parsedPath ? (parsedPath as ParsedPathFields).seasonSlugOrId : null;

        // Fetch accessible clubs + teams for this organisation.
        const [clubs, teams] = await Promise.all([
          fetchAllPages<AppProjectRow>(
            `${apiBaseUrl}/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=500&parent_project__isnull=true`,
            { credentials: 'include' },
            { ttlMs: 120_000 }
          ),
          fetchAllPages<AppProjectRow>(
            `${apiBaseUrl}/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000&parent_project__isnull=false`,
            { credentials: 'include' },
            { ttlMs: 120_000 }
          ),
        ]);

        const clubsById = new Map<string, AppProjectRow>();
        const clubsBySlug = new Map<string, AppProjectRow>();
        for (const c of clubs || []) {
          clubsById.set(String(c.id), c);
          clubsBySlug.set(String(c.slug || ''), c);
        }

        const teamsById = new Map<string, AppProjectRow>();
        const teamsBySlug = new Map<string, AppProjectRow>();
        for (const t of teams || []) {
            teamsById.set(String(t.id), t);
            teamsBySlug.set(String(t.slug || ''), t);
        }

        let selectedTeam: AppProjectRow | null = null;

        // 1. Try URL Match for Team
        if (urlTeamSlug) {
            selectedTeam = teamsBySlug.get(urlTeamSlug) || (teams || []).find(t => String(t.id) === urlTeamSlug) || null;
            if (!selectedTeam) {
                selectedTeam = { id: urlTeamSlug, slug: urlTeamSlug, name: urlTeamSlug, parent_id: null };
            }
        }

        // 2. If no URL match, try last visited — but only if it's one of our own teams.
        //    This prevents "poisoning" where visiting another team's URL overwrites
        //    the context so "Mijn Team" points to the wrong team.
        if (!selectedTeam && last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.teamSlugOrId) {
          const lastTeam = (teams || []).find((t) => String(t.slug) === String(last.teamSlugOrId)) || null;
          if (lastTeam && (userTeamIds.size === 0 || userTeamIds.has(String(lastTeam.id)))) {
            selectedTeam = lastTeam;
          }
        }

        // 3. Fallback: prefer user's own teams, then best guess
        if (!selectedTeam) {
          const ownTeams = (teams || []).filter(t => userTeamIds.has(String(t.id)));
          if (ownTeams.length === 1) {
            selectedTeam = ownTeams[0];
          } else if (ownTeams.length > 1) {
            selectedTeam = pickBestByUpdatedOrName(ownTeams);
          } else if ((teams || []).length === 1) {
            selectedTeam = (teams || [])[0] || null;
          } else if (!urlTeamSlug) {
            selectedTeam = pickBestByUpdatedOrName(teams || []);
          }
        }

        let selectedClub: AppProjectRow | null = null;

        // 1. Try URL Match for Club
        if (urlClubSlug) {
             selectedClub = clubsBySlug.get(urlClubSlug) || (clubs || []).find(c => String(c.id) === urlClubSlug) || null;
             if (!selectedClub) {
                selectedClub = { id: urlClubSlug, slug: urlClubSlug, name: urlClubSlug };
            }
        }

        // 2. Derive from Team
        if (!selectedClub && selectedTeam?.parent_id !== null && selectedTeam?.parent_id !== undefined) {
          selectedClub = clubsById.get(String(selectedTeam.parent_id)) || null;
        }

        // 3. Last visited — same ownership check as team step 2
        if (!selectedClub && last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.clubSlugOrId) {
            const lastClub = clubsBySlug.get(String(last.clubSlugOrId)) || null;
            if (lastClub && (userClubIds.size === 0 || userClubIds.has(String(lastClub.id)))) {
              selectedClub = lastClub;
            }
        }

        // 4. Fallback: prefer user's own clubs, then alphabetical
        if (!selectedClub) {
          const ownClubs = (clubs || []).filter(c => userClubIds.has(String(c.id)));
          if (ownClubs.length === 1) {
            selectedClub = ownClubs[0] || null;
          } else if (ownClubs.length > 1) {
            selectedClub = pickBestByUpdatedOrName(ownClubs);
          } else if ((clubs || []).length === 1) {
            selectedClub = (clubs || [])[0] || null;
          } else {
            const clubsSorted = [...(clubs || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            selectedClub = clubsSorted[0] || null;
          }
        }

        // If we picked a club but not a team, prefer the most-recent team under that club.
        if (selectedClub && !selectedTeam) {
          const clubTeams = (teams || []).filter((t) => String(t.parent_id || '') === String(selectedClub!.id));
          if (clubTeams.length === 1) selectedTeam = clubTeams[0];
          else if (clubTeams.length > 1) selectedTeam = pickBestByUpdatedOrName(clubTeams);
        }

        // Resolve a best season for selected team.
        let selectedSeasonId: string | null = null;
        let selectedSeasonKey: string | null = null;
        let selectedSeasonName: string | null = null;

        if (selectedTeam) {
          try {
            const seasons = await fetchAllPages<AppPeriodRow>(
              `${apiBaseUrl}/periods/?page_size=250&project_id=${encodeURIComponent(String(selectedTeam.id))}&type=season`,
              { credentials: 'include' },
              { ttlMs: 120_000, cacheKey: `GET:seasons:${orgSlug}:${selectedTeam.id}` }
            );

            // 1. Try URL Match
            if (urlSeasonSlug) {
                const match = (seasons || []).find(p => periodPathKey(p) === urlSeasonSlug || String(p.id) === urlSeasonSlug);
                if (match) {
                    selectedSeasonId = String(match.id);
                    selectedSeasonKey = periodPathKey(match) || String(match.id);
                    selectedSeasonName = match.name || null;
                } else {
                    selectedSeasonKey = urlSeasonSlug;
                    selectedSeasonName = urlSeasonSlug; // Fallback
                }
            }

            // 2. Last visited
            if (!selectedSeasonId && last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.seasonSlugOrId) {
              const match = (seasons || []).find((p) => {
                const key = periodPathKey(p);
                return key && String(key) === String(last.seasonSlugOrId);
              });
              if (match) {
                selectedSeasonId = String(match.id);
                selectedSeasonKey = periodPathKey(match) || String(match.id);
                selectedSeasonName = match.name || null;
              }
            }

            // 3. Most recent
            if (!selectedSeasonKey) {
              const best = pickMostRecentSeason(seasons || []);
              if (best) {
                selectedSeasonId = String(best.id);
                selectedSeasonKey = periodPathKey(best) || String(best.id);
                selectedSeasonName = best.name || null;
              }
            }
          } catch {
            // ignore
          }
        }

        let selectedMatchId: string | null = null;
        if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.matchId) {
          selectedMatchId = String(last.matchId);
        }

        let selectedCompetitionSlugOrId: string | null = null;
        if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.competitionSlugOrId) {
           selectedCompetitionSlugOrId = String(last.competitionSlugOrId);
        }

        // ── Resolve user's OWN team (for "Mijn Team" navigation) ────────
        // Always from user.projects — never affected by URL or localStorage.
        let myTeam: AppProjectRow | null = null;
        let myClub: AppProjectRow | null = null;
        let mySeasonKey: string | null = null;

        const ownTeamsList = (teams || []).filter(t => userTeamIds.has(String(t.id)));
        if (ownTeamsList.length === 1) {
          myTeam = ownTeamsList[0];
        } else if (ownTeamsList.length > 1) {
          myTeam = pickBestByUpdatedOrName(ownTeamsList);
        }

        if (myTeam?.parent_id != null) {
          myClub = clubsById.get(String(myTeam.parent_id)) || null;
        }
        if (!myClub) {
          const ownClubsList = (clubs || []).filter(c => userClubIds.has(String(c.id)));
          if (ownClubsList.length >= 1) myClub = ownClubsList[0] || null;
        }

        // Resolve season for own team (reuse cache if same as page team)
        if (myTeam) {
          if (String(myTeam.id) === String(selectedTeam?.id) && selectedSeasonKey) {
            mySeasonKey = selectedSeasonKey;
          } else {
            try {
              const mySeasons = await fetchAllPages<AppPeriodRow>(
                `${apiBaseUrl}/periods/?page_size=250&project_id=${encodeURIComponent(String(myTeam.id))}&type=season`,
                { credentials: 'include' },
                { ttlMs: 120_000, cacheKey: `GET:seasons:${orgSlug}:${myTeam.id}` }
              );
              const best = pickMostRecentSeason(mySeasons || []);
              if (best) mySeasonKey = periodPathKey(best) || String(best.id);
            } catch { /* ignore */ }
          }
        }

        setAppSelection({
          orgSlug,
          clubSlugOrId: selectedClub ? String(selectedClub.slug || selectedClub.id) : null,
          clubName: selectedClub?.name || null,
          teamSlugOrId: selectedTeam ? String(selectedTeam.slug || selectedTeam.id) : null,
          teamName: selectedTeam?.name || null,
          teamIdForApi: selectedTeam ? String(selectedTeam.id) : null,
          seasonSlugOrId: selectedSeasonKey,
          seasonName: selectedSeasonName,
          seasonIdForApi: selectedSeasonId,
          competitionSlugOrId: selectedCompetitionSlugOrId,
          competitionName: null, // Not fetching competition names deeply yet
          competitionIdForApi: selectedCompetitionSlugOrId,
          matchId: selectedMatchId,
          myOrgSlug: userPrimaryOrgSlug || orgSlug,
          myClubSlugOrId: myClub ? String(myClub.slug || myClub.id) : null,
          myTeamSlugOrId: myTeam ? String(myTeam.slug || myTeam.id) : null,
          mySeasonSlugOrId: mySeasonKey,
        });

        // Persist validated context to localStorage (only after API resolution)
        writeLastAppContext({
          orgSlug,
          clubSlugOrId: selectedClub ? String(selectedClub.slug || selectedClub.id) : undefined,
          teamSlugOrId: selectedTeam ? String(selectedTeam.slug || selectedTeam.id) : undefined,
          seasonSlugOrId: selectedSeasonKey || undefined,
          competitionSlugOrId: selectedCompetitionSlugOrId || undefined,
          matchId: selectedMatchId || undefined,
        });

        // Keep django-core:currentOrgId in sync with the resolved org so the
        // ContextSwitcherProvider loads the same org on next mount/reload.
        // Without this, stale currentOrgId (e.g. DFB) can cause a second
        // compute() with the wrong org after the context-switcher loads.
        if (orgSlug && orgSlug !== ctxOrgSlugStr) {
          try {
            const orgs = await fetchAllPages<OrganisationRow>(
              `${apiBaseUrl}/organisations/?page_size=250`,
              { credentials: 'include' },
              { ttlMs: 120_000 },
            );
            const matchedOrg = (orgs || []).find(
              (o) => String(o.slug || '') === orgSlug,
            );
            if (matchedOrg) {
              localStorage.setItem('django-core:currentOrgId', String(matchedOrg.id));
            }
          } catch {
            // Non-critical — sync will happen on next navigation
          }
        }

    if (import.meta.env.DEV) {
        console.timeEnd(`[AppSelection] Computation ${auditId}`);
        console.groupEnd();
    }
      };

      compute();
    }, [parsedPath, contextOrgSlug, contextOrgId, userEmail]);

  return appSelection;
}
