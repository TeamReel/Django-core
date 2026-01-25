import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';
import {
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactActionsStyle,
  actionButtonStyle,
} from '../../../utils/directoryStyles';
import PeriodDetailModal from '../PeriodDetailModal';
import PeriodEditModal from '../PeriodEditModal';
import PeriodCreateModal from '../PeriodCreateModal';

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  organisation?: { id: string; name: string } | null;
  organisation_id?: string | null;
  parent_period?: { id: string; name: string; slug?: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  activities_count?: number;
  matches_count?: number;
  children_matches_count?: number;
  matches_total_count?: number;
  data?: Record<string, any>;
};

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// Table styling constants

// Button + table styles come from utils/directoryStyles

interface CompetitionsListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
  preselectedTeamId?: string;
}

export const CompetitionsList: React.FC<CompetitionsListProps> = ({ preselectedOrgId, preselectedClubId, preselectedTeamId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const teamLocked = Boolean(preselectedTeamId);

  const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());
  const isUuid = (value: unknown) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || ''),
    );

  const parseDateOnlyUtc = (value?: string | null): Date | null => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const ymd = raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    const dt = new Date(`${ymd}T00:00:00.000Z`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const isPeriodActive = (p: any): boolean => {
    const start = parseDateOnlyUtc(p?.start_date) ?? parseDateOnlyUtc(p?.parent_period?.start_date);
    const end = parseDateOnlyUtc(p?.end_date) ?? parseDateOnlyUtc(p?.parent_period?.end_date);

    // Open-ended ranges: missing start means "always started"; missing end means "never ends".
    if (!start && !end) return false;

    const today = parseDateOnlyUtc(new Date().toISOString())!;
    const afterStart = !start || today.getTime() >= start.getTime();
    const beforeEnd = !end || today.getTime() <= end.getTime();
    return afterStart && beforeEnd;
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  // When the page is org-locked, we receive an org UUID (not a slug). Many endpoints use org slug.
  // Resolve and pin the slug so we never fall back to global (unscoped) project lists.
  const [lockedOrgSlug, setLockedOrgSlug] = useState<string>('');

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(preselectedTeamId || '');

  useEffect(() => {
    if (preselectedOrgId) {
      setSelectedOrgId(preselectedOrgId);
    }
  }, [preselectedOrgId]);

  useEffect(() => {
    if (preselectedClubId) {
      setSelectedClubId(preselectedClubId);
    }
  }, [preselectedClubId]);

  useEffect(() => {
    if (preselectedTeamId) {
      setSelectedTeamId(preselectedTeamId);
    }
  }, [preselectedTeamId]);

  useEffect(() => {
    if (!orgLocked) {
      if (lockedOrgSlug) setLockedOrgSlug('');
      return;
    }

    const rawLockedId = String(preselectedOrgId || '').trim();
    if (!rawLockedId) return;

    // If the lock key is already a slug, keep it.
    if (!isNumericId(rawLockedId) && !isUuid(rawLockedId)) {
      setLockedOrgSlug(rawLockedId);
      return;
    }

    // Prefer already-known org options.
    const fromList = organisations.find((o) => String(o.id) === String(rawLockedId))?.slug;
    if (fromList) {
      setLockedOrgSlug(String(fromList));
      return;
    }

    // Fallback: resolve UUID -> slug via organisations list (detail lookup_field is slug).
    let cancelled = false;
    const loadSlug = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=250`, { credentials: 'include' });
        if (!res.ok) return;
        const raw: any = await res.json().catch(() => null);
        const data: any = raw?.data ?? raw;
        const list: any[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const match = list.find((o: any) => String(o?.id || '') === String(rawLockedId));
        const slug = String(match?.slug || '').trim();
        if (!cancelled && slug) setLockedOrgSlug(slug);
      } catch {
        // ignore
      }
    };

    void loadSlug();
    return () => {
      cancelled = true;
    };
  }, [orgLocked, preselectedOrgId, organisations]);
  const [selectedSeasonName, setSelectedSeasonName] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [seasons, setSeasons] = useState<Period[]>([]);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailCompetition, setDetailCompetition] = useState<Period | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editCompetition, setEditCompetition] = useState<Period | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getSelectedOrgSlugForApi = () => {
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId),
        )
      : null;

    // On org-locked pages, do not fall back to context organisation.
    // Context can change asynchronously and would cause cross-org reloads.
    if (orgLocked) {
      return (
        selectedOrg?.slug ||
        lockedOrgSlug ||
        (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : '') ||
        ''
      );
    }

    return (
      selectedOrg?.slug ||
      (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : '') ||
      context.organisation?.slug ||
      ''
    );
  };

  const getSelectedOrgIdForApi = () => {
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId),
        )
      : null;
    const resolved = selectedOrg ? String((selectedOrg as any).id ?? '') : '';
    if (resolved && isUuid(resolved)) return resolved;
    if (selectedOrgId && isUuid(selectedOrgId)) return String(selectedOrgId);
    return '';
  };
  // Initialize org filter
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

  useEffect(() => {
    if (preselectedOrgId) {
      const clubId = searchParams.get('club_id');
      const teamId = searchParams.get('team_id');
      const seasonId = searchParams.get('season_id');

      if (!clubLocked && clubId) setSelectedClubId(String(clubId));
      if (!teamLocked && !clubLocked && teamId) setSelectedTeamId(String(teamId));
      if (!clubLocked && !teamLocked && seasonId) setSelectedSeasonName(String(seasonId));
      return;
    }

    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');
    const seasonId = searchParams.get('season_id');

    if (orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (!clubLocked && clubId) setSelectedClubId(String(clubId));
    if (!teamLocked && !clubLocked && teamId) setSelectedTeamId(String(teamId));
    if (!clubLocked && !teamLocked && seasonId) {
      // Best-effort: if URL provides an id, we'll set after seasons load.
      setSelectedSeasonName(String(seasonId));
    }
  }, [isSuperAdmin, preselectedOrgId, searchParams, clubLocked]);

  const seasonOptions = useMemo(() => {
    const byName = new Map<string, { name: string; ids: string[] }>();
    for (const s of seasons as any[]) {
      const name = String((s as any)?.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const id = String((s as any)?.id);
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, { name, ids: [id] });
      } else if (!existing.ids.includes(id)) {
        existing.ids.push(id);
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [seasons]);

  const selectedSeasonIds = useMemo(() => {
    if (!selectedSeasonName) return [];
    // If selectedSeasonName is an ID (from URL), try match by id first.
    const byId = (seasons as any[]).find((s: any) => String(s.id) === String(selectedSeasonName));
    if (byId?.name) {
      const match = seasonOptions.find((o) => o.name === String(byId.name));
      return match?.ids || [String(byId.id)];
    }
    const match = seasonOptions.find((o) => o.name === selectedSeasonName);
    return match?.ids || [];
  }, [selectedSeasonName, seasonOptions, seasons]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );
        setOrganisations((orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch {
        // ignore
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const orgSlugForApi = getSelectedOrgSlugForApi();

        // If federation is locked but slug isn't resolved yet, wait.
        // Never fall back to global projects here (would leak cross-federation data).
        if (orgLocked && !orgSlugForApi) {
          setClubs([]);
          setTeams([]);
          return;
        }

        if (orgSlugForApi) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=500&include_archived=true&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
          return;
        }

        // Non-locked pages: fallback to global project list (less accurate for very large orgs)
        if (!orgLocked) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load options');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [context.organisation?.slug, organisations, refreshKey, selectedOrgId, orgLocked, lockedOrgSlug]);

  // Fetch Seasons for Filter
  useEffect(() => {
    const loadSeasons = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const baseParams = new URLSearchParams();
        baseParams.set('page_size', '500');
        baseParams.set('parent_id', 'null');
        baseParams.set('type', 'season');

        if (selectedTeamId) {
          baseParams.set('project_id', String(selectedTeamId));
        } else if (selectedClubId) {
          if (teams.length === 0) {
            setSeasons([]);
            return;
          }

          const clubTeams = teams.filter((t) => {
            const parent =
              (t as any).parent_id ??
              (t as any).parent ??
              (t as any).parent_project_id ??
              (typeof (t as any).parent_project === 'object' ? (t as any).parent_project?.id : (t as any).parent_project);
            const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
            return parentId && parentId === String(selectedClubId);
          });

          if (clubTeams.length === 0) {
            setSeasons([]);
            return;
          }

          const teamIds = clubTeams.map((t) => String((t as any).id));
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
          const unique = [...new Map((Array.isArray(results) ? results : []).map((p: any) => [String(p.id), p])).values()];
          setSeasons(unique);
          return;
        } else if (selectedOrgId) {
          // NOTE: in production, periods are typically team-scoped (project_id set) and
          // may not have organisation_id populated. Prefer scoping by teams.
          if (teams.length > 0) {
            const teamIds = teams.map((t) => String((t as any).id)).filter(Boolean);
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
            const unique = [
              ...new Map((Array.isArray(results) ? results : []).map((p: any) => [String(p.id), p])).values(),
            ];
            setSeasons(unique);
            return;
          }

          // Fallback if teams aren't loaded yet
          const orgIdForApi = getSelectedOrgIdForApi();
          if (orgIdForApi) baseParams.set('organisation_id', orgIdForApi);
        }

        const results = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/periods/?${baseParams.toString()}`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );
        const all = Array.isArray(results) ? results : [];
        const unique = [...new Map(all.map((p: any) => [String(p.id), p])).values()];
        setSeasons(unique);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load seasons');
        setSeasons([]);
      }
    };

    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey]);

  // Fetch Competitions (child periods)
  useEffect(() => {
    const loadCompetitions = async () => {
      setCompetitionsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const explicitTeamScope = selectedTeamId ? [String(selectedTeamId)] : null;

        let clubTeamIds: string[] | null = null;
        if (!selectedTeamId && selectedClubId) {
          if (teams.length === 0) {
            setCompetitions([]);
            return;
          }

          clubTeamIds = teams
            .filter((t) => {
              const parent =
                (t as any).parent_id ??
                (t as any).parent ??
                (t as any).parent_project_id ??
                (typeof (t as any).parent_project === 'object' ? (t as any).parent_project?.id : (t as any).parent_project);
              const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
              return parentId && parentId === String(selectedClubId);
            })
            .map((t) => String((t as any).id));

          if (clubTeamIds.length === 0) {
            setCompetitions([]);
            return;
          }
        }

        const buildParams = (seasonId?: string) => {
          const params = new URLSearchParams();
          params.set('page_size', '500');
          params.set('type', 'competition');
          if (seasonId) params.set('parent_id', seasonId);

          if (selectedTeamId) {
            params.set('project_id', String(selectedTeamId));
          } else if (clubTeamIds && clubTeamIds.length > 0) {
            params.set('project_id__in', clubTeamIds.join(','));
          }

          if (selectedOrgId && !selectedClubId && !selectedTeamId) {
            // Prefer team-scoped filtering (project_id__in) over organisation_id.
            // organisation_id may be null on team-scoped periods.
            if (teams.length > 0) {
              params.set(
                'project_id__in',
                teams
                  .map((t) => String((t as any).id))
                  .filter(Boolean)
                  .join(','),
              );
            } else {
              const orgIdForApi = getSelectedOrgIdForApi();
              if (orgIdForApi) params.set('organisation_id', orgIdForApi);
            }
          }

          return params;
        };

        const teamIdsForOrg =
          selectedOrgId && !selectedClubId && !selectedTeamId
            ? teams.map((t) => String((t as any).id)).filter(Boolean)
            : null;

        const scopedTeamIds =
          explicitTeamScope ||
          (clubTeamIds && clubTeamIds.length > 0 ? clubTeamIds : null) ||
          (teamIdsForOrg && teamIdsForOrg.length > 0 ? teamIdsForOrg : null);

        // When scoped to a federation and periods are team-scoped, we must have the org teams
        // loaded to avoid falling back to organisation_id (which is often null on periods).
        if (selectedOrgId && !selectedClubId && !selectedTeamId && (!teamIdsForOrg || teamIdsForOrg.length === 0)) {
          setCompetitions([]);
          return;
        }

        const fetchWithTeamChunks = async (baseParams: URLSearchParams, teamIds: string[]) => {
          const chunks = chunkArray(teamIds, 25);
          const results = (
            await Promise.all(
              chunks.map(async (ids) => {
                const params = new URLSearchParams(baseParams);
                // Ensure we only use chunked `project_id__in` scoping.
                params.delete('project_id');
                params.delete('project_id__in');
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

        const inferCompetitions = (items: any[]) =>
          (Array.isArray(items) ? items : []).filter(
            (p: any) => (p?.parent_period_id != null || p?.parent_period) && p?.metadata?.type !== 'season',
          );

        const maybeFallbackUntyped = async (baseParams: URLSearchParams, teamIds: string[]) => {
          const untyped = new URLSearchParams(baseParams);
          untyped.delete('type');
          const all = await fetchWithTeamChunks(untyped, teamIds);
          return inferCompetitions(all);
        };

        if (selectedSeasonIds.length > 0) {
          // Season filter: fetch comps under each season id (can be multiple ids due to
          // same season name repeated per-team).
          const requests = selectedSeasonIds.map(async (sid) => {
            const params = buildParams(sid);
            if (scopedTeamIds && scopedTeamIds.length > 0) {
              const typed = await fetchWithTeamChunks(params, scopedTeamIds);
              const fallback = await maybeFallbackUntyped(params, scopedTeamIds);
              return [...typed, ...fallback];
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
          return;
        }

        // No season filter: fetch all org competitions.
        const params = buildParams(undefined);

        // If no season is selected, we MUST relax the check.
        // Some backends might not return `type=competition` for all items.
        // But if we use buildParams(undefined), it sets type=competition.

        if (scopedTeamIds && scopedTeamIds.length > 0) {
          const typed = await fetchWithTeamChunks(params, scopedTeamIds);
          const fallback = await maybeFallbackUntyped(params, scopedTeamIds);
          const merged = [...typed, ...fallback];
          const unique = [...new Map(merged.map((c: any) => [String(c.id), c])).values()];
          setCompetitions(unique as any);
          return;
        }

        const results = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );
        setCompetitions(Array.isArray(results) ? results : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load competitions');
      } finally {
        setCompetitionsLoading(false);
      }
    };

    loadCompetitions();
  }, [selectedTeamId, selectedClubId, selectedOrgId, selectedSeasonIds, teams, refreshKey]);


  const selectedOrg = selectedOrgId
    ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
    : null;
  const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || selectedOrgId;

  const selectedTeam = selectedTeamId ? teams.find((t) => String(t.id) === String(selectedTeamId)) : null;
  const teamSlugOrId = (selectedTeam as any)?.slug || (selectedTeam as any)?.id || selectedTeamId;

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];

  const savePeriodEdits = async (periodId: string, payload: any) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/v1/periods/${periodId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || 'Failed to update competition');
    }
  };

  const createCompetition = async (payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    organisation_id?: string;
    project_id?: string;
    parent_period_id?: string;
  }) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    const orgId = String(payload.organisation_id || selectedOrgId || '');
    const teamId = String(payload.project_id || selectedTeamId || '');
    const seasonId = String(payload.parent_period_id || selectedSeasonIds[0] || '');
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');
    if (!seasonId) throw new Error('Select a season first');

    const response = await fetch(`${apiBaseUrl}/api/v1/periods/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        organisation_id: orgId,
        project_id: teamId ? Number(teamId) : undefined,
        parent_period_id: seasonId || null,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        metadata: { type: 'competition' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || 'Failed to create competition');
    }

    invalidateFetchAllPagesCache();
    setRefreshKey((k) => k + 1);
  };

  const filteredCompetitions = useMemo(() => {
    if (statusFilter === 'active') {
      return competitions.filter(isPeriodActive);
    }
    if (statusFilter === 'inactive') {
      return competitions.filter((c) => !isPeriodActive(c));
    }
    return competitions;
  }, [competitions, statusFilter]);

  const sortedCompetitions = useMemo(() => {
    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };

    const getFederationName = (comp: any) => {
      const org = comp?.organisation;
      if (typeof org === 'object' && org?.name) return org.name;
      const orgId = typeof org === 'string' ? org : org?.id;
      const fromList = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
      return fromList?.name || '';
    };

    const getTeamId = (comp: any) => {
      const project = comp?.project;
      return String(typeof project === 'object' ? project?.id : project || '');
    };

    const getTeamName = (comp: any) => {
      const project = comp?.project;
      if (typeof project === 'object' && project?.name) return project.name;
      const teamId = getTeamId(comp);
      const fromList = teamId ? teams.find((t) => String(t.id) === String(teamId)) : undefined;
      return fromList?.name || '';
    };

    const getClubName = (comp: any) => {
      const teamId = getTeamId(comp);
      const teamObj = teams.find((t) => String(t.id) === String(teamId));
      const clubId = teamObj?.parent_id || (teamObj as any)?.parent || (teamObj as any)?.parent_project_id;
      const clubObj = clubs.find((c) => String(c.id) === String(clubId));
      return clubObj?.name || '';
    };

    const getSeasonName = (comp: any) => {
      const season = comp?.parent_period;
      if (typeof season === 'object' && season?.name) return season.name;
      const seasonId = (comp as any)?.parent_period_id || season?.id;
      const fromList = seasonId ? seasons.find((s) => String(s.id) === String(seasonId)) : undefined;
      return (fromList as any)?.name || '';
    };

    const list = [...filteredCompetitions];
    list.sort((a: any, b: any) => {
      const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a)).localeCompare(sortKey(getClubName(b)));
      if (byClub !== 0) return byClub;
      const byTeam = sortKey(getTeamName(a)).localeCompare(sortKey(getTeamName(b)));
      if (byTeam !== 0) return byTeam;
      const bySeason = sortKey(getSeasonName(a)).localeCompare(sortKey(getSeasonName(b)));
      if (bySeason !== 0) return bySeason;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });
    return list;
  }, [filteredCompetitions, organisations, clubs, teams, seasons]);

  const handleDelete = async (orgId: string, compId: string, compName: string) => {
    if (!compId || !window.confirm(`Are you sure you want to delete competition "${compName}"?`)) {
        return;
    }
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
        const response = await fetch(`${apiBaseUrl}/api/v1/periods/${compId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to delete competition');
        }
        // removing from local state
        setCompetitions(prev => prev.filter(c => c.id !== compId));
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete competition');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {isSuperAdmin && !orgLocked && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              if (!clubLocked) setSelectedClubId('');
              if (!teamLocked) setSelectedTeamId('');
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
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
            onChange={(e) => {
              if (clubLocked) return;
              setSelectedClubId(e.target.value);
              if (!teamLocked) setSelectedTeamId('');
            }}
            disabled={clubLocked}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            {!clubLocked && <option value="">Club: All</option>}
            {clubs
              .filter((c) => {
                if (orgLocked) return true;
                if (!selectedOrgId) return true;
                const cOrg = typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
                return String(cOrg) === String(selectedOrgId);
              })
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
            onChange={(e) => {
              if (teamLocked) return;
              setSelectedTeamId(e.target.value);
            }}
            disabled={teamLocked}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            {!teamLocked && <option value="">Team: All</option>}
            {teams
              .filter((t) => {
                if (!selectedClubId) return true;
                const tParent = t.parent_id || t.parent;
                return String(tParent) === String(selectedClubId);
              })
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
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="">Season: All</option>
          {seasonOptions.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="all">Status: All</option>
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (!clubLocked) setSelectedClubId('');
              if (!teamLocked) setSelectedTeamId('');
              setSelectedSeasonName('');
              setStatusFilter('all');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
          >
            Create Competition
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState message="Loading options..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && competitionsLoading && (
        <LoadingState message="Loading competitions..." />
      )}

      {!isLoading && !error && !competitionsLoading && sortedCompetitions.length === 0 && (
        <Alert variant="info">No competitions found. Use filters to narrow your search.</Alert>
      )}

      {!isLoading && !error && !competitionsLoading && sortedCompetitions.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                    {!orgLocked && (
                      <th style={{ ...compactThStyle, width: '12%' }}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th style={{ ...compactThStyle, width: '12%' }}>Club</th>
                    )}
                    {!teamLocked && <th style={{ ...compactThStyle, width: '12%' }}>Team</th>}
                    <th style={{ ...compactThStyle, width: '12%' }}>Season</th>
                    <th style={{ ...compactThStyle, width: '20%' }}>Competition</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Match</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Squad</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Status</th>
                  <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCompetitions
                  // Defensive filter: ensures the UI always matches the dropdown,
                  // even if a memo/cache issue ever causes stale lists.
                  .filter((comp) => {
                    if (statusFilter === 'active') return isPeriodActive(comp);
                    if (statusFilter === 'inactive') return !isPeriodActive(comp);
                    return true;
                  })
                  .map((comp) => {
                    const seasonId = (comp as any).parent_period_id || comp.parent_period?.id;
                    const seasonSlug = comp.parent_period?.slug;
                    const org = comp.organisation;
                    const project = comp.project;
                    const orgId = typeof org === 'object' ? org?.id : org;
                    const orgSlug = typeof org === 'object' ? (org as any)?.slug : undefined;
                    const orgName = typeof org === 'string' ? org : org?.name || '-';
                    const teamId = typeof project === 'object' ? project?.id : project;
                    const teamSlug = typeof project === 'object' ? (project as any)?.slug : undefined;
                    const teamName = typeof project === 'string' ? project : project?.name || '-';

                    // Get club by finding team's parent in clubs array
                    const teamObj = teams.find(t => String(t.id) === String(teamId));
                    const clubId = teamObj?.parent_id || teamObj?.parent || (typeof project === 'object' && (project as any)?.parent_id);
                    const club = clubs.find(c => String(c.id) === String(clubId));
                    const clubName = club?.name || '-';

                    // Use matches_count
                    const matchesCount = comp.matches_count || 0;

                    // Link URL logic
                    const orgSlugOrId = lockedOrgSlug || orgSlug || (selectedOrgId && !isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : undefined) || orgId;
                    const clubSlugOrId = (club as any)?.slug || clubId;
                    const teamSlugOrId = teamSlug || teamId;
                    const seasonSlugOrId = seasonSlug || seasonId;
                    const teamBasePath = clubSlugOrId
                      ? `/${orgSlugOrId}/${clubSlugOrId}/${teamSlugOrId}`
                      : `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}`;

                    return (
                        <tr key={comp.id}>
                        {!orgLocked && (
                          <td style={compactTextTdStyle}>
                            {orgId ? (
                              <a
                                href={`/organisations/${orgSlug || orgId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/organisations/${orgSlug || orgId}`);
                                }}
                              >
                                {orgName}
                              </a>
                            ) : orgName}
                          </td>
                        )}
                        {!clubLocked && (
                          <td style={compactTextTdStyle}>
                            {clubId ? (
                              <a
                                href={`/${orgSlugOrId}/${clubSlugOrId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/${orgSlugOrId}/${clubSlugOrId}`);
                                }}
                              >
                                {clubName}
                              </a>
                            ) : clubName}
                          </td>
                        )}
                        {!teamLocked && (
                          <td style={compactTextTdStyle}>
                            {teamId ? (
                              <a
                                href={teamBasePath}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(teamBasePath);
                                }}
                              >
                                {teamName}
                              </a>
                            ) : teamName}
                          </td>
                        )}
                        <td style={compactTextTdStyle}>
                            {seasonId ? (
                                <a
                            href={`${teamBasePath}/${seasonSlugOrId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(
                                `${teamBasePath}/${seasonSlugOrId}`
                                    );
                                }}
                                >
                                {comp.parent_period?.name || '-'}
                                </a>
                            ) : (
                                comp.parent_period?.name || '-'
                            )}
                        </td>
                        <td style={compactTextTdStyle}>
                            <a
                          href={`${teamBasePath}/${seasonSlugOrId}/${comp.slug || comp.id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(
                            `${teamBasePath}/${seasonSlugOrId}/${comp.slug || comp.id}`,
                                );
                            }}
                            >
                            {comp.name}
                            </a>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {matchesCount}
                            </Badge>
                        </td>
                        <td style={compactTdStyle}>-</td>
                         <td style={compactTdStyle}>
                           {(() => {
                             const isActive = isPeriodActive(comp);
                             return (
                               <Badge variant={isActive ? 'success' : 'warning'}>
                                 {isActive ? 'Active' : 'Inactive'}
                               </Badge>
                             );
                           })()}
                         </td>
                        <td style={compactTdStyle}>
                            <div style={compactActionsStyle}>
                                <button
                                    onClick={() => {
                                 setDetailCompetition(comp);
                                 setIsDetailModalOpen(true);
                                    }}
                                    style={actionButtonStyle('primary')}
                                >
                                    View
                                </button>
                                <button
                              onClick={() => {
                                setEditCompetition(comp);
                                setIsEditModalOpen(true);
                              }}
                                    style={actionButtonStyle('warning')}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(String(orgId), comp.id, comp.name)}
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
            </Table>
          </div>
        </Card>
      )}

      <PeriodCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Competition"
        organisations={organisations}
        clubs={clubs}
        teams={teams}
        requireOrganisation
        requireClub
        requireTeam
        requireSeason
        initialOrganisationId={selectedOrgId}
        initialClubId={selectedClubId}
        initialTeamId={selectedTeamId}
        onCreate={createCompetition}
      />

      <PeriodDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        period={detailCompetition as any}
      />

      <PeriodEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        period={editCompetition as any}
        onSave={async (payload) => {
          if (!editCompetition) return;
          await savePeriodEdits(editCompetition.id, payload);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};
