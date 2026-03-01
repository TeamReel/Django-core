import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Badge } from '@django-core/design-system';
import { DirectoryTableShell } from '../../../components/DirectoryTableShell';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { periodPathKey } from '../../../utils/periodPath';
import MatchDetailModal from '../MatchDetailModal';
import MatchEditModal from '../MatchEditModal';
import MatchCreateModal from '../MatchCreateModal';
import {
    compactThStyle,
    compactTdStyle,
    compactTextTdStyle,
    compactActionsStyle,
    actionButtonStyle
} from '../../../utils/directoryStyles';
import MobileFilterSheet from '../../../components/MobileFilterSheet';
import { useDirectoryFilters } from '../../../hooks/useDirectoryFilters';
import {
  chunkArray,
  getCsrfToken,
  sortKey,
  getTeamParentId,
  getFederationName,
  getTeamName,
  getClubName,
  filterSelectStyle,
  resolveRowContext,
} from '../../../utils/directoryHelpers';
import type { DirectoryListProps, SeasonOption, RowContextConfig } from '../../../utils/directoryHelpers';

type Activity = {
  id: string;
  title: string;
  activity_type: string;
  start_time?: string;
  end_time?: string;
  project?: { id: string; name: string } | null;
  period?: {
    id: string;
    name: string;
    parent_period?: { id: string; name: string; slug?: string; };
    slug?: string;
  } | null;
  organisation?: { id: string; name: string; slug: string } | null;
  data?: Record<string, any>;
};

export const MatchesList: React.FC<DirectoryListProps> = (props) => {
  const { preselectedClubSlug, preselectedTeamSlug } = props;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useDirectoryFilters({
    ...props,
    showSeasonFilter: true,
    showCompetitionFilter: true,
    showVariantFilter: true,
  });

  const {
    isSuperAdmin,
    orgLocked,
    clubLocked,
    teamLocked,
    organisations,
    clubs,
    teams,
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    statusFilter,
    sportFilter,
    variantFilter,
    selectedSeasonName,
    seasonOptions,
    selectedSeasonIds,
    selectedCompetitionId,
    competitions,
    seasons,
    setSeasons,
    setCompetitions,
    isLoading,
    error,
    setError,
    refreshKey,
    triggerRefresh,
    lockedOrgSlug,
    getSelectedOrgSlugForApi,
    getSelectedOrgIdForApi,
    setSelectedOrgId,
    setSelectedClubId,
    setSelectedTeamId,
    setSelectedSeasonName,
    setSelectedCompetitionId,
    setStatusFilter,
    setSportFilter,
    setVariantFilter,
    clearAll,
    categories,
    variants,
    getVariantsForCategory,
  } = filters;

  // ─── Match-specific state ────────────────────────────────────────

  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Loading *all* matches for large federations can be expensive.
  // Default to a sane limit; allow the user to load more or all.
  const [matchesMaxItems, setMatchesMaxItems] = useState<number | null>(500);

  // Modal state
  const [detailMatch, setDetailMatch] = useState<Activity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Activity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Auto-open create modal from ?create=match URL param
  useEffect(() => {
    const create = String(searchParams.get('create') || '').trim().toLowerCase();
    if (create !== 'match') return;

    setIsCreateModalOpen(true);

    // Remove param once consumed so refresh/back doesn't keep reopening.
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadMatchesSeqRef = useRef(0);

  // When the federation changes, reset match list + limit to avoid showing stale data.
  useEffect(() => {
    setMatches([]);
    setMatchesMaxItems(500);
  }, [selectedOrgId]);

  // ─── Domain-specific: filteredMatches ────────────────────────────

  const filteredMatches = useMemo(() => {
    let list = matches;

    // Client-side club/team filtering (safety net for race conditions)
    if (selectedTeamId) {
      list = list.filter((m) => String((m as any)?.project?.id) === String(selectedTeamId));
    } else if (selectedClubId && teams.length > 0) {
      const clubTeamIds = new Set(
        teams
          .filter((t) => getTeamParentId(t) === String(selectedClubId))
          .map((t) => String(t.id))
      );
      if (clubTeamIds.size > 0) {
        list = list.filter((m) => clubTeamIds.has(String((m as any)?.project?.id)));
      }
    }

    // Status filter (active = upcoming, inactive = past)
    if (statusFilter !== 'all') {
      const now = new Date();
      const isUpcoming = (m: Activity) => {
        if (!m.start_time) return false;
        const dt = new Date(m.start_time);
        return dt.getTime() >= now.getTime();
      };
      if (statusFilter === 'active') {
        list = list.filter(isUpcoming);
      } else {
        list = list.filter((m) => !isUpcoming(m));
      }
    }

    // Sport category filter — match period's sport first, then org fallback
    if (sportFilter !== 'all') {
      list = list.filter((match) => {
        // Try to get sport from match's period first (competition-level sport)
        const periodSportId = (match as any)?.period?.sport?.id;
        const periodSportCategoryId = (match as any)?.period?.sport?.parent_sport_id || periodSportId;
        if (periodSportCategoryId && String(periodSportCategoryId) === String(sportFilter)) return true;

        // Fallback: get sport from organisation (organisation-level category)
        const nestedOrg = (match as any)?.organisation;
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.sport?.id : undefined;
        if (nestedSportId && String(nestedSportId) === String(sportFilter)) return true;

        // Last fallback: look up organisation in loaded list
        const orgId =
          (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
          (match as any)?.organisation_id;
        const org = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        const orgSportId = (org as any)?.sport?.id;
        return orgSportId && String(orgSportId) === String(sportFilter);
      });
    }

    // Sport variant filter
    if (variantFilter !== 'all') {
      list = list.filter((match) => (match as any).period?.sport?.id === variantFilter);
    }

    return list;
  }, [matches, statusFilter, sportFilter, variantFilter, organisations, selectedTeamId, selectedClubId, teams]);

  // ─── Domain-specific: sortedMatches ──────────────────────────────

  const sortedMatches = useMemo(() => {
    const getCompetitionName = (m: Activity) => String((m as any)?.period?.name || '');
    const getMatchName = (m: Activity) => String((m as any)?.title || '');

    const list = [...filteredMatches];
    list.sort((a, b) => {
      const byFederation = sortKey(getFederationName(a, organisations)).localeCompare(
        sortKey(getFederationName(b, organisations)),
      );
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a, clubs, teams)).localeCompare(
        sortKey(getClubName(b, clubs, teams)),
      );
      if (byClub !== 0) return byClub;
      const byTeam = sortKey(getTeamName(a, teams)).localeCompare(
        sortKey(getTeamName(b, teams)),
      );
      if (byTeam !== 0) return byTeam;
      const bySeason = sortKey((a as any)?.period?.parent_period?.name || '').localeCompare(
        sortKey((b as any)?.period?.parent_period?.name || ''),
      );
      if (bySeason !== 0) return bySeason;
      const byCompetition = sortKey(getCompetitionName(a)).localeCompare(sortKey(getCompetitionName(b)));
      if (byCompetition !== 0) return byCompetition;
      return sortKey(getMatchName(a)).localeCompare(sortKey(getMatchName(b)));
    });
    return list;
  }, [filteredMatches, organisations, clubs, teams]);

  // ─── Fetch Seasons ───────────────────────────────────────────────

  useEffect(() => {
    const loadSeasons = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const baseParams = new URLSearchParams();
        baseParams.set('page_size', '500');
        baseParams.set('parent_id', 'null'); // Top-level periods = Seasons
        baseParams.set('type', 'season');

        if (selectedTeamId) {
          baseParams.set('project_id', selectedTeamId);
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length > 0) {
            const teamIds = clubTeams.map((t) => String(t.id));
            const chunks = chunkArray(teamIds, 25);
            const results = (
              await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                  );
                }),
              )
            ).flat();

            const roots = (Array.isArray(results) ? results : []).filter(
              (p: any) => p?.parent_period_id == null && !p?.parent_period,
            );
            setSeasons(roots);
            return;
          } else {
            setSeasons([]);
            return;
          }
        } else if (selectedOrgId) {
          // Periods are often team-scoped (project_id set) and may not have organisation_id
          // populated. Prefer scoping by all teams in the selected org.
          if (teams.length > 0) {
            const teamIds = teams.map((t) => String(t.id)).filter(Boolean);
            const chunks = chunkArray(teamIds, 25);
            const results = (
              await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                  );
                }),
              )
            ).flat();

            const roots = (Array.isArray(results) ? results : []).filter(
              (p: any) => p?.parent_period_id == null && !p?.parent_period,
            );
            setSeasons([...new Map(roots.map((p: any) => [String(p.id), p])).values()]);
            return;
          }

          // Fallback if teams not loaded
          baseParams.set('organisation_id', selectedOrgId);
        }

        const results = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/periods/?${baseParams.toString()}`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );

        const roots = (Array.isArray(results) ? results : []).filter(
          (p: any) => p?.parent_period_id == null && !p?.parent_period
        );
        setSeasons(roots);
      } catch {
        setSeasons([]);
      }
    };
    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey]);

  // ─── Fetch Competitions ──────────────────────────────────────────

  useEffect(() => {
     if (!selectedSeasonName) {
         setCompetitions([]);
         return;
     }
     const loadCompetitions = async () => {
         const apiBaseUrl = getApiBaseUrl();
         try {
             const seasonIds = selectedSeasonIds;
             if (seasonIds.length === 0) {
               setCompetitions([]);
               return;
             }

              const teamIdsForOrg =
                selectedOrgId && !selectedClubId && !selectedTeamId
                  ? teams.map((t) => String(t.id)).filter(Boolean)
                  : null;

              const fetchWithTeamChunks = async (baseParams: URLSearchParams, teamIds: string[]) => {
                const chunks = chunkArray(teamIds, 25);
                const results = (
                  await Promise.all(
                    chunks.map(async (ids) => {
                      const params = new URLSearchParams(baseParams);
                      params.set('project_id__in', ids.join(','));
                      return await fetchAllPages<any>(
                        `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                        { credentials: 'include' },
                        { ttlMs: 120_000, bypass: refreshKey > 0 },
                      );
                    }),
                  )
                ).flat();
                return [...new Map(results.map((c: any) => [String(c.id), c])).values()];
              };

             const requests = seasonIds.map(async (seasonId) => {
               const params = new URLSearchParams();
                 params.set('page_size', '300');
               params.set('parent_id', seasonId);
                 params.set('type', 'competition');
               if (selectedTeamId) {
                 params.set('project_id', String(selectedTeamId));
               } else if (selectedClubId && teams.length > 0) {
                 const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
                 if (clubTeams.length > 0) {
                   params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
                 }
              } else if (teamIdsForOrg && teamIdsForOrg.length > 0) {
                // Prefer team-scoped filtering over organisation_id.
                return await fetchWithTeamChunks(params, teamIdsForOrg);
              } else if (selectedOrgId) {
                const orgIdForApi = getSelectedOrgIdForApi();
                if (orgIdForApi) params.set('organisation_id', orgIdForApi);
               }

                  return await fetchAllPages<any>(
                  `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                  { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                );
             });

             const all = (await Promise.all(requests)).flat();
             const unique = [...new Map(all.map((c: any) => [String(c.id), c])).values()];
             setCompetitions(unique as any);
         } catch {
             setCompetitions([]);
         }
     };
     loadCompetitions();
  }, [selectedSeasonName, selectedSeasonIds, selectedOrgId, selectedClubId, selectedTeamId, teams]);

  // ─── Fetch Matches ───────────────────────────────────────────────

  useEffect(() => {
    const loadMatches = async () => {
      const seq = (loadMatchesSeqRef.current += 1);
      setMatchesLoading(true);
      const apiBaseUrl = getApiBaseUrl();

      try {
        // On org-locked pages, do not run an initial unscoped query before selectedOrgId is set.
        if (orgLocked && !selectedOrgId) {
          setMatches([]);
          return;
        }

        const orgIdForApi = getSelectedOrgIdForApi();

        // If a federation is selected but we can't resolve its UUID yet (e.g. org list
        // still loading), don't run an unscoped query.
        if (selectedOrgId && !orgIdForApi) {
          setMatches([]);
          return;
        }

        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('activity_type', 'match');
        params.set('ordering', '-start_time');

        if (selectedTeamId) {
          params.set('project_id', String(selectedTeamId));
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length === 0) {
            setMatches([]);
            return;
          }
          params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
        }

        // Federation scoping: ActivityViewSet filters organisation_id indirectly via project.
        if (orgIdForApi) params.set('organisation_id', orgIdForApi);

        // Filter by Season or Competition
        if (selectedCompetitionId) {
          params.set('period_id', selectedCompetitionId);
        } else if (selectedSeasonIds.length === 1) {
          // Matches live under competition periods; include descendants to capture all comps in this season.
          params.set('period_id', selectedSeasonIds[0]);
          params.set('include_descendants', 'true');
        }

        const all = await fetchAllPages<Activity>(
          `${apiBaseUrl}/api/v1/activities/?${params.toString()}`,
          { credentials: 'include' },
          {
            ttlMs: 20_000,
            bypass: refreshKey > 0,
            cacheKey: `matches:${params.toString()}:max:${matchesMaxItems ?? 'all'}`,
            maxItems: matchesMaxItems ?? undefined,
          },
        );

        // Avoid stale late-arriving requests overwriting the newest selection.
        if (seq !== loadMatchesSeqRef.current) return;

        // Strict org guard based on serializer-provided organisation.
        // This protects against any accidental unscoped fetches / caching races.
        const guardedByOrg = orgIdForApi
          ? all.filter((m) => String((m as any)?.organisation?.id || '') === String(orgIdForApi))
          : all;

        // Final safety guard: when org-locked, only show matches for teams that belong
        // to the locked org (prevents UI leaks if any upstream filter/mapping fails).
        const guarded = (() => {
          if (!orgLocked) return guardedByOrg;
          if (teams.length === 0) return [];

          const allowedTeamIds = new Set(
            selectedTeamId
              ? [String(selectedTeamId)]
              : selectedClubId
                ? teams
                    .filter((t) => getTeamParentId(t) === String(selectedClubId))
                    .map((t) => String((t as any).id))
                : teams.map((t) => String((t as any).id)),
          );

          return guardedByOrg.filter((m) => allowedTeamIds.has(String((m as any)?.project?.id || '')));
        })();

        // If season selection maps to multiple season ids (duplicate season names across teams),
        // apply the season filter client-side to keep dropdown unique by name.
        if (selectedSeasonIds.length > 1 && selectedSeasonName) {
          const filtered = guarded.filter((m) => {
            const seasonName = (m as any)?.period?.parent_period?.name;
            return String(seasonName || '').trim() === selectedSeasonName;
          });
          setMatches(filtered);
        } else {
          setMatches(guarded);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        if (seq === loadMatchesSeqRef.current) setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [
    selectedTeamId,
    selectedClubId,
    selectedOrgId,
    selectedSeasonName,
    selectedSeasonIds,
    selectedCompetitionId,
    teams,
    refreshKey,
    matchesMaxItems,
  ]);

  // ─── Render ──────────────────────────────────────────────────────

  const activeFilterCount = [
    selectedOrgId !== '',
    !clubLocked && selectedClubId !== '',
    !teamLocked && selectedTeamId !== '',
    selectedSeasonName !== '',
    selectedCompetitionId !== '',
    statusFilter !== 'all',
    sportFilter !== 'all',
    variantFilter !== 'all',
  ].filter(Boolean).length;

  const rowConfig = useMemo<RowContextConfig>(
    () => ({
      organisations,
      clubs,
      teams,
      lockedOrgSlug,
      preselectedClubSlug,
      preselectedTeamSlug,
      selectedOrgId,
      selectedClubId,
    }),
    [organisations, clubs, teams, lockedOrgSlug, preselectedClubSlug, preselectedTeamSlug, selectedOrgId, selectedClubId],
  );

  return (
    <div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <MobileFilterSheet activeFilterCount={activeFilterCount}>
        {isSuperAdmin && !orgLocked && (
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="">Federation: All</option>
            {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
        {!clubLocked && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            disabled={clubLocked}
            style={filterSelectStyle}
          >
            {!clubLocked && <option value="">Club: All</option>}
            {clubs
              .filter((c) => {
                if (!selectedOrgId) return true;
                const cOrg = typeof c.organisation === 'string' ? c.organisation : (c.organisation as any)?.id;
                return String(cOrg) === String(selectedOrgId);
              })
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
          </select>
        )}
        {!teamLocked && (
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            disabled={teamLocked}
            style={filterSelectStyle}
          >
            {!teamLocked && <option value="">Team: All</option>}
            {teams
              .filter((t) => {
                if (!selectedClubId) return true;
                return getTeamParentId(t) === String(selectedClubId);
              })
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
          </select>
        )}

        <select
          value={selectedSeasonName}
            onChange={(e) => setSelectedSeasonName(e.target.value)}
            style={{
                ...filterSelectStyle,
                maxWidth: '200px'
            }}
        >
            <option value="">Season: All</option>
            {seasonOptions.map((s: SeasonOption) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
        </select>

        <select
            value={selectedCompetitionId}
            onChange={(e) => setSelectedCompetitionId(e.target.value)}
            style={{
                ...filterSelectStyle,
                maxWidth: '200px'
            }}
        >
            <option value="">Competition: All</option>
            {[...new Map(competitions.map((c: any) => [String(c.id), c])).values()]
              .slice()
              .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')))
              .map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            ...filterSelectStyle,
            maxWidth: '200px',
          }}
        >
          <option value="all">Status: All</option>
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
        </select>

        <select
          value={sportFilter}
          onChange={(e) => { setSportFilter(e.target.value); setVariantFilter('all'); }}
          style={filterSelectStyle}
        >
          <option value="all">Sport: All</option>
          {categories.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>

        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="all">Variant: All</option>
          {(sportFilter !== 'all' ? getVariantsForCategory(sportFilter) : variants).map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>
        </MobileFilterSheet>

        <div className="hide-mobile" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
            Showing {matchesMaxItems ?? 'all'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMatchesMaxItems((v) => (v == null ? null : Math.min(10_000, v + 500)))}
            disabled={matchesMaxItems == null}
          >
            Load more
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMatchesMaxItems(null)}
            disabled={matchesMaxItems == null}
          >
            Load all
          </Button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="md" onClick={clearAll}>
            Clear
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
          >
            Create Match
          </Button>
        </div>
      </div>

        <DirectoryTableShell
          isLoading={isLoading}
          error={error}
          domainLoading={matchesLoading}
          domainLoadingMessage="Loading matches..."
          emptyMessage="No matches found. Use filters to narrow your search."
          itemCount={sortedMatches.length}
        >
                <thead>
                  <tr>
                    {!orgLocked && (
                      <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Club</th>
                    )}
                    {!teamLocked && <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Team</th>}
                    <th style={{ ...compactThStyle, width: '15%' }}>Season</th>
                    <th style={{ ...compactThStyle, width: '18%' }}>Competition</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '10%' }}>Sport</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '12%' }}>Sport Variant</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Match</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '8%' }}>Squad</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMatches.map((m) => {
                    const row = resolveRowContext(m, rowConfig);

                    const competition = m.period;
                    const compName = competition?.name || '-';
                    const season = competition?.parent_period;
                    const seasonName = season?.name || '-';

                    const isActive = (() => {
                      if (!m.start_time) return false;
                      const start = new Date(m.start_time);
                      return start.getTime() >= Date.now();
                    })();

                    // Season/competition targets (match-specific; Period has no slug field)
                    const seasonId = season?.id;
                    const seasonFromList = seasonId ? seasons.find((s: any) => String(s.id) === String(seasonId)) : undefined;
                    const seasonTarget = periodPathKey(seasonFromList || season) || seasonId;
                    const compId = competition?.id;
                    const compFromList = compId ? competitions.find((c: any) => String(c.id) === String(compId)) : undefined;
                    const compTarget = periodPathKey(compFromList || competition) || compId;

                    return (
                        <tr key={m.id}>
                        {!orgLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {row.orgId ? (
                              <a
                                href={`/organisations/${row.orgSlug}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/organisations/${row.orgSlug}`);
                                }}
                              >
                                {row.orgName}
                              </a>
                            ) : row.orgName}
                          </td>
                        )}
                        {!clubLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {row.clubId ? (
                              <a
                            href={`/${row.orgSlug}/${row.clubSlug}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                            navigate(`/${row.orgSlug}/${row.clubSlug}`);
                              }}
                              >
                              {row.clubName}
                              </a>
                            ) : row.clubName}
                          </td>
                        )}
                        {!teamLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {row.teamId ? (
                              <a
                                href={row.teamBasePath}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(row.teamBasePath);
                                }}
                              >
                                {row.teamName}
                              </a>
                            ) : row.teamName}
                          </td>
                        )}
                        <td style={compactTextTdStyle}>
                             {season ? (
                                <a
                            href={`${row.teamBasePath}/${seasonTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(seasonTarget) {
                                navigate(`${row.teamBasePath}/${seasonTarget}`);
                                    }
                                }}
                                >
                                {seasonName}
                                </a>
                             ) : seasonName}
                        </td>
                            <td style={compactTextTdStyle}>
                              {competition ? (
                                <a
                            href={`${row.teamBasePath}/${seasonTarget}/${compTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if(seasonTarget && compTarget) {
                              navigate(`${row.teamBasePath}/${seasonTarget}/${compTarget}`);
                                  }
                                }}
                                >
                                {compName}
                                </a>
                              ) : compName}
                            </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          {(m as any).period?.sport?.category_name ? (
                            <span style={{ fontSize: '11px' }}>{(m as any).period.sport.category_name}</span>
                          ) : (
                            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                          )}
                        </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          {(m as any).period?.sport ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{(m as any).period.sport.sport_icon}</span>
                              <span style={{ fontSize: '11px' }}>{(m as any).period.sport.name}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                            {(() => {
                              const matchKey = (m as any).slug || m.id;
                              const matchPath = (row.orgSlug && row.clubSlug && row.teamSlug && seasonTarget && compTarget)
                                ? `/${row.orgSlug}/${row.clubSlug}/${row.teamSlug}/${seasonTarget}/${compTarget}/${matchKey}`
                                : `/matches/${matchKey}`;
                              return (
                                <a
                                  href={matchPath}
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(matchPath);
                                  }}
                                >
                                  {m.title}
                                </a>
                              );
                            })()}
                        </td>
                        <td className="hide-mobile" style={compactTdStyle}>-</td>
                        <td style={compactTdStyle}>
                          <Badge variant={isActive ? 'success' : 'warning'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                              setDetailMatch(m);
                              setIsDetailModalOpen(true);
                                }}
                                style={actionButtonStyle('primary')}
                            >
                                View
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                              setEditMatch(m);
                              setIsEditModalOpen(true);
                                }}
                                style={actionButtonStyle('warning')}
                            >
                                Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(window.confirm('Are you sure you want to delete this match?')) {
                                        // TODO: Implement delete match
                                        alert('Delete functionality not yet implemented');
                                    }
                                }}
                                style={actionButtonStyle('danger')}
                            >
                                Delete
                            </button>
                          </div>
                         </td>
                        </tr>
                    );
                  })}
                </tbody>
        </DirectoryTableShell>

        <MatchDetailModal
          opened={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          match={detailMatch}
        />

        <MatchEditModal
          opened={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          match={editMatch}
          onSave={async (payload) => {
            if (!editMatch) return;

            const csrfToken = getCsrfToken();

            const apiBaseUrl = getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/v1/activities/${editMatch.id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
              },
              credentials: 'include',
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to update match');
            }

            triggerRefresh();
          }}
        />

        <MatchCreateModal
          opened={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          organisations={organisations}
          clubs={clubs}
          teams={teams}
          initialOrganisationId={selectedOrgId}
          initialClubId={selectedClubId}
          initialTeamId={selectedTeamId}
          onCreate={async (payload) => {
            const apiBaseUrl = getApiBaseUrl();
            const csrfToken = getCsrfToken();

            const teamId = String(payload.project_id || '');
            const competitionId = String(payload.period_id || '');
            if (!teamId) throw new Error('Select a team first');
            if (!competitionId) throw new Error('Select a competition first');

            const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
              },
              credentials: 'include',
              body: JSON.stringify({
                title: payload.title,
                activity_type: 'match',
                project_id: Number(teamId),
                opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
                period_id: competitionId,
                start_time: payload.start_time,
                end_time: payload.end_time,
                location: payload.location,
                description: payload.description,
                metadata: {
                  venue: payload.venue || 'Home',
                  is_home: (payload.venue || 'Home') === 'Home',
                  ...(payload as any)?.metadata,
                },
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create match');
            }

            const raw: any = await res.json().catch(() => null);
            const created: any = raw?.data?.data || raw?.data || raw;
            if (created && typeof created === 'object') {
              const createdId = String(created?.id || '').trim();
              if (createdId) {
                setMatches((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                  return [created, ...list];
                });
              }
            }

            invalidateFetchAllPagesCache();
          }}
        />
    </div>
  );
};
