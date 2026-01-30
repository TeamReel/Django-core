import React, { useEffect, useState } from 'react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { periodPathKey } from '../../../utils/periodPath';
import { useSports } from '../../../hooks/useSports';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';
import PeriodDetailModal from '../PeriodDetailModal';
import PeriodEditModal from '../PeriodEditModal';
import PeriodCreateModal from '../PeriodCreateModal';
import {
    compactTableStyle,
    compactThStyle,
    compactTdStyle,
    compactTextTdStyle,
    compactActionsStyle,
    actionButtonStyle
} from '../../../utils/directoryStyles';

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
  members_count?: number;
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

interface SeasonsListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
  preselectedTeamId?: string;
}

export const SeasonsList: React.FC<SeasonsListProps> = ({ preselectedOrgId, preselectedClubId, preselectedTeamId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { categories } = useSports();

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const teamLocked = Boolean(preselectedTeamId);

  const isUuid = (value: unknown) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

  const getSelectedOrgIdForApi = () => {
    const selectedOrg = selectedOrgId
      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
      : null;
    const resolved = selectedOrg ? String((selectedOrg as any).id ?? '') : '';
    if (resolved && isUuid(resolved)) return resolved;
    if (selectedOrgId && isUuid(selectedOrgId)) return String(selectedOrgId);
    return '';
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(preselectedTeamId || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');

  const [seasons, setSeasons] = useState<Period[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailSeason, setDetailSeason] = useState<Period | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editSeason, setEditSeason] = useState<Period | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isLikelySeasonRoot = (p: any): boolean => {
    if (!p) return false;

    // TeamReel hierarchy: Season is a root Period (no parent_period).
    // Do NOT infer by name; rely on parent/type.
    const hasParent = Boolean(p?.parent_period_id ?? p?.parent_period?.id ?? p?.parent_period);
    if (hasParent) return false;

    const type = String(p?.type ?? p?.data?.type ?? p?.metadata?.type ?? '').toLowerCase();
    if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;

    return true;
  };

  // Initialize org filter
  useEffect(() => {
    if (preselectedOrgId) {
      setSelectedOrgId(preselectedOrgId);
    } else if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [preselectedOrgId, context.organisation?.id, isSuperAdmin]);

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

  // Sync params from URL to state
  useEffect(() => {
    if (preselectedOrgId) {
      const clubId = searchParams.get('club_id');
      const teamId = searchParams.get('team_id');
      if (!clubLocked && clubId) setSelectedClubId(String(clubId));
      if (!teamLocked && !clubLocked && teamId) setSelectedTeamId(String(teamId));
      return;
    }

    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');

    if (orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (!clubLocked && clubId) setSelectedClubId(String(clubId));
    if (!teamLocked && !clubLocked && teamId) setSelectedTeamId(String(teamId));
  }, [isSuperAdmin, searchParams, clubLocked, preselectedOrgId]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
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

  // Fetch filter options
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = getApiBaseUrl();

      try {
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  // Fetch seasons
  useEffect(() => {
      const loadSeasons = async () => {
        setSeasonsLoading(true);
        const apiBaseUrl = getApiBaseUrl();

        try {
          const fetchPeriods = async (params: URLSearchParams) => {
            const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
            const results = await fetchAllPages<any>(
              url,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            );
            return Array.isArray(results) ? results : [];
          };

          const baseParams = new URLSearchParams();
          baseParams.set('page_size', '2000');
          // Push season filtering to the API (backend supports ?type=season).
          // NOTE: We do NOT rely on server-side "parent is null" filters here.
          // We always classify seasons client-side based on hierarchy (root period).
          baseParams.set('type', 'season');

          // Always fetch based on selection, or all if nothing selected
          if (selectedTeamId) {
            // Some datasets store seasons on the club (project_id=club). Include both scopes.
            const projectIds = [String(selectedTeamId), selectedClubId ? String(selectedClubId) : ''].filter(Boolean);
            if (projectIds.length === 1) baseParams.set('project_id', projectIds[0]);
            else baseParams.set('project_id__in', projectIds.join(','));

            const typedParams = new URLSearchParams(baseParams);
            const typed = await fetchPeriods(typedParams);

            const untypedParams = new URLSearchParams(baseParams);
            untypedParams.delete('type');
            const untyped = await fetchPeriods(untypedParams);

            // Extra fallback: competitions almost always point at their season via parent_period.
            const competitionsParams = new URLSearchParams();
            competitionsParams.set('project_id', String(selectedTeamId));
            competitionsParams.set('page_size', '2000');
            competitionsParams.set('type', 'competition');
            const competitions = await fetchPeriods(competitionsParams);
            const parentSeasons = (competitions || [])
              .map((c: any) => c?.parent_period)
              .filter((p: any) => p && (p?.id || p?.slug));

            const merged = [...typed, ...untyped, ...parentSeasons].filter((p: any) => isLikelySeasonRoot(p));
            const unique = [...new Map(merged.map((p: any) => [String(p.id), p])).values()];
            setSeasons(unique as any);
            return;
          } else if (selectedClubId) {
            // If only club selected, get all seasons for teams in that club
            const clubTeams = teams.filter((t) => {
              const parent =
                (t as any).parent_id ??
                (t as any).parent_project_id ??
                (typeof (t as any).parent_project === 'object' ? (t as any).parent_project?.id : (t as any).parent_project) ??
                (typeof (t as any).parent === 'object' ? (t as any).parent?.id : (t as any).parent);
              const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
              return parentId && parentId === String(selectedClubId);
            });
            if (clubTeams.length > 0) {
              // Fetch for all teams in the club (chunk to avoid long URLs)
              const teamIds = clubTeams.map((t) => String(t.id));

              const projectIds = [String(selectedClubId), ...teamIds].filter(Boolean);
              const chunks = chunkArray(projectIds, 25);

              const typedChunks = await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchPeriods(params);
                }),
              );

              const untypedBase = new URLSearchParams(baseParams);
              untypedBase.delete('type');
              const untypedChunks = await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(untypedBase);
                  params.set('project_id__in', ids.join(','));
                  return await fetchPeriods(params);
                }),
              );

              const merged = [...typedChunks.flat(), ...untypedChunks.flat()].filter((p: any) => isLikelySeasonRoot(p));
              const unique = [...new Map(merged.map((p: any) => [String(p.id), p])).values()];
              setSeasons(unique as any);
              return;
            }
          } else if (selectedOrgId) {
            // If only org selected, periods are commonly team-scoped.
            // Prefer scoping by team ids; fall back to organisation_id using resolved UUID.
            if (teams.length > 0) {
              const teamIds = teams.map((t) => String((t as any).id)).filter(Boolean);
              const chunks = chunkArray(teamIds, 25);
              const typedChunks = await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchPeriods(params);
                }),
              );

              const untypedBase = new URLSearchParams(baseParams);
              untypedBase.delete('type');
              const untypedChunks = await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(untypedBase);
                  params.set('project_id__in', ids.join(','));
                  return await fetchPeriods(params);
                }),
              );

              const merged = [...typedChunks.flat(), ...untypedChunks.flat()].filter((p: any) => isLikelySeasonRoot(p));
              const unique = [...new Map(merged.map((p: any) => [String(p.id), p])).values()];
              setSeasons(unique as any);
              return;
            }

            const orgIdForApi = getSelectedOrgIdForApi();
            if (orgIdForApi) baseParams.set('organisation_id', orgIdForApi);
          }
          // If nothing selected at all, fetch all seasons (for superadmin)

          if (selectedClubId && teams.length === 0) {
            // Club selected but teams list not available yet -> avoid fetching all seasons.
            setSeasons([]);
            return;
          }

          const results = await fetchPeriods(baseParams);

          // Backend filtering uses metadata__type (via ?type=season). Some legacy data doesn't
          // set that, so we fall back to an untyped org-scoped fetch and infer seasons client-side.
          if (
            Array.isArray(results) &&
            results.length === 0 &&
            selectedOrgId &&
            !selectedClubId &&
            !selectedTeamId
          ) {
            const fallbackParams = new URLSearchParams(baseParams);
            fallbackParams.delete('type');
            // Keep org scoping; fetch everything.

            const fallbackUrl = `${apiBaseUrl}/api/v1/periods/?${fallbackParams.toString()}`;
            const fallback = await fetchAllPages<any>(
              fallbackUrl,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            );

            const inferred = (Array.isArray(fallback) ? fallback : []).filter((p: any) => isLikelySeasonRoot(p));
            const unique = [...new Map(inferred.map((p: any) => [String(p.id), p])).values()];
            setSeasons(unique as any);
            return;
          }

          // Prefer the backend's ?type=season, but tolerate legacy/untyped data.
          const filteredSeasons = results.filter((p: any) => isLikelySeasonRoot(p));

          const unique = [...new Map((Array.isArray(filteredSeasons) ? filteredSeasons : []).map((p: any) => [String(p.id), p])).values()];
          setSeasons(unique as any);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load seasons');
        } finally {
          setSeasonsLoading(false);
        }
      };

      loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey]);


  const selectedOrg = selectedOrgId
    ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
    : null;
  const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || selectedOrgId;
  const orgKeyForRoutes = String(
    orgSlugOrId ||
      (context as any)?.organisation?.slug ||
      (context as any)?.organisation?.id ||
      ''
  ).trim();

  const selectedTeam = selectedTeamId ? teams.find((t) => String(t.id) === String(selectedTeamId)) : null;
  const teamSlugOrId = (selectedTeam as any)?.slug || (selectedTeam as any)?.id || selectedTeamId;

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];

  const savePeriodEdits = async (periodId: string, payload: any) => {
    const apiBaseUrl = getApiBaseUrl();
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
      throw new Error(detail || 'Failed to update season');
    }
  };

  const createSeason = async (payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    organisation_id?: string;
    project_id?: string;
  }) => {
    const apiBaseUrl = getApiBaseUrl();
    const orgId = String(payload.organisation_id || selectedOrgId || '');
    const teamId = String(payload.project_id || selectedTeamId || '');
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');

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
        parent_period_id: null,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        metadata: { type: 'season' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || 'Failed to create season');
    }

    invalidateFetchAllPagesCache();
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = async (orgId: string, seasonId: string | undefined, seasonName: string) => {
    if (!seasonId || !window.confirm(`Are you sure you want to delete season "${seasonName}"?`)) {
      return;
    }
    const apiBaseUrl = getApiBaseUrl();
    try {
        const response = await fetch(`${apiBaseUrl}/api/v1/periods/${seasonId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to delete season');
        }
        // removing from local state
        setSeasons(prev => prev.filter(s => s.id !== seasonId));
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete season');
    }
  };

  const filteredSeasons = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let list = seasons;

    if (statusFilter === 'active') {
      list = list.filter((s) => {
        const start = s.start_date || '0000-00-00';
        const end = s.end_date || '9999-99-99';
        return today >= start && today <= end;
      });
    }
    if (statusFilter === 'inactive') {
      list = list.filter((s) => {
        const start = s.start_date || '0000-00-00';
        const end = s.end_date || '9999-99-99';
        return !(today >= start && today <= end);
      });
    }

    if (sportFilter !== 'all') {
      // Filter by organisation's sport
      list = list.filter((season) => {
        const org = organisations.find(o => String(o.id) === String((season as any).organisation?.id || (season as any).organisation_id));
        return (org as any)?.sport?.id === sportFilter;
      });
    }

    return list;
  }, [seasons, statusFilter, sportFilter, organisations]);

  const sortedSeasons = useMemo(() => {
    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };

    const getFederationName = (season: any) => {
      const org = season?.organisation;
      if (typeof org === 'object' && org?.name) return org.name;
      const orgId = typeof org === 'string' ? org : org?.id;
      const fromList = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
      return fromList?.name || '';
    };

    const getTeamId = (season: any) => {
      const project = season?.project;
      return String(typeof project === 'object' ? project?.id : project || '');
    };

    const getTeamName = (season: any) => {
      const project = season?.project;
      return typeof project === 'object' ? project?.name : '';
    };

    const getClubName = (season: any) => {
      const teamId = getTeamId(season);
      const teamObj = teams.find((t) => String(t.id) === String(teamId));
      const clubId = teamObj?.parent_id || (teamObj as any)?.parent_project_id;
      const clubObj = clubs.find((c) => String(c.id) === String(clubId));
      return clubObj?.name || '';
    };

    const list = [...filteredSeasons];
    list.sort((a: any, b: any) => {
      const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a)).localeCompare(sortKey(getClubName(b)));
      if (byClub !== 0) return byClub;
      const byTeam = sortKey(getTeamName(a)).localeCompare(sortKey(getTeamName(b)));
      if (byTeam !== 0) return byTeam;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });
    return list;
  }, [filteredSeasons, organisations, clubs, teams]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {isSuperAdmin && !orgLocked && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              if (!clubLocked) setSelectedClubId('');
              setSelectedTeamId('');
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
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="all">Sport: All</option>
          {categories.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (!clubLocked) setSelectedClubId('');
              if (!teamLocked) setSelectedTeamId('');
              setStatusFilter('all');
              setSportFilter('all');
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
            Create Season
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState message="Loading options..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && seasonsLoading && <LoadingState message="Loading seasons..." />}

      {!isLoading && !error && !seasonsLoading && filteredSeasons.length === 0 && (
          <Alert variant="info">No seasons found. Use filters to narrow your search.</Alert>
      )}

      {!isLoading && !error && !seasonsLoading && filteredSeasons.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                    {!orgLocked && (
                      <th style={{ ...compactThStyle, width: '140px' }}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th style={{ ...compactThStyle, width: '140px' }}>Club</th>
                    )}
                    {!teamLocked && <th style={{ ...compactThStyle, width: '140px' }}>Team</th>}
                    <th style={{ ...compactThStyle, width: '260px' }}>Season</th>
                  <th style={{ ...compactThStyle, width: '110px' }}>Competition</th>
                  <th style={{ ...compactThStyle, width: '100px' }}>Match</th>
                    <th style={{ ...compactThStyle, width: '90px' }}>Squad</th>
                    <th style={{ ...compactThStyle, width: '100px' }}>Status</th>
                    <th style={{ ...compactThStyle, width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSeasons.map((season) => {
                    const org = season.organisation;
                    const project = season.project;
                    const orgName = typeof org === 'string' ? org : org?.name || '-';
                    const teamName = typeof project === 'string' ? project : project?.name || '-';
                    const teamId =
                      (typeof project === 'string' ? project : project?.id) ??
                      (season as any)?.project_id ??
                      (season as any)?.project?.id ??
                      '';

                    // Find the team in teams list to get parent club info
                    const teamObj = teams.find(t => String(t.id) === String(teamId));
                    const clubId = teamObj?.parent_id || (teamObj as any)?.parent_project_id;
                    const clubObj = clubs.find(c => String(c.id) === String(clubId));
                    const clubName = clubObj?.name || '-';

                    const orgId =
                      (typeof org === 'string' ? org : org?.id) ??
                      (season as any)?.organisation_id ??
                      (season as any)?.organisation?.id ??
                      '';
                    const orgFromList = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
                    const rowOrgSlugOrId = String(orgFromList?.slug || (org as any)?.slug || orgId || '').trim();
                    const orgForRowRoutes = rowOrgSlugOrId || orgKeyForRoutes;

                    const clubSlugOrId = (clubObj as any)?.slug || clubId;
                    const teamSlugOrId = (teamObj as any)?.slug || String(teamId || '').trim();
                    const seasonSlugOrId = periodPathKey(season) || season.slug || season.id;

                    const teamDetailPath = (orgForRowRoutes && clubSlugOrId && teamSlugOrId)
                      ? `/${orgForRowRoutes}/${clubSlugOrId}/${teamSlugOrId}`
                      : (orgForRowRoutes && teamSlugOrId)
                        ? `/organisations/${orgForRowRoutes}/projects/${teamSlugOrId}`
                        : null;

                    const seasonDetailPath = (orgForRowRoutes && teamSlugOrId && seasonSlugOrId)
                      ? `/organisations/${orgForRowRoutes}/projects/${teamSlugOrId}/seasons/${seasonSlugOrId}`
                      : null;

                    // Use activities_count for matches if available, else 0
                    const matchesCount = (season as any).matches_count ?? season.activities_count ?? 0;

                    return (
                    <tr key={season.id}>
                        {!orgLocked && (
                          <td style={compactTextTdStyle}>
                            {orgForRowRoutes ? (
                              <a
                                href={`/organisations/${orgForRowRoutes}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/organisations/${orgForRowRoutes}`);
                                }}
                              >
                                {orgName}
                              </a>
                            ) : (
                              orgName
                            )}
                          </td>
                        )}
                        {!clubLocked && (
                          <td style={compactTextTdStyle}>
                            {clubSlugOrId && orgForRowRoutes ? (
                              <a
                                href={`/${orgForRowRoutes}/${clubSlugOrId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/${orgForRowRoutes}/${clubSlugOrId}`);
                                }}
                              >
                                {clubName}
                              </a>
                            ) : (
                              clubName
                            )}
                          </td>
                        )}
                        {!teamLocked && (
                          <td style={compactTextTdStyle}>
                            {teamDetailPath ? (
                              <a
                                href={teamDetailPath}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(teamDetailPath);
                                }}
                              >
                                {teamName}
                              </a>
                            ) : (
                              teamName
                            )}
                          </td>
                        )}
                        <td style={compactTextTdStyle}>
                          {seasonDetailPath ? (
                            <a
                              href={seasonDetailPath}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(seasonDetailPath);
                              }}
                            >
                              {season.name}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDetailSeason(season as any);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                color: 'var(--app-link, #2563eb)',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                font: 'inherit',
                              }}
                            >
                              {season.name}
                            </button>
                          )}
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {season.children_count || 0}
                            </Badge>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                            {(season as any).matches_total_count ?? season.matches_count ?? 0}
                            </Badge>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {(season as any).members_count || 0}
                            </Badge>
                        </td>
                         <td style={compactTdStyle}>
                           {(() => {
                             const today = new Date().toISOString().split('T')[0];
                             const start = season.start_date || '0000-00-00';
                             const end = season.end_date || '9999-99-99';
                             const isActive = today >= start && today <= end;
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
                                    setDetailSeason(season);
                                    setIsDetailModalOpen(true);
                                }}
                                style={actionButtonStyle('primary')}
                            >
                                View
                            </button>
                            <button
                              onClick={() => {
                                setEditSeason(season);
                                setIsEditModalOpen(true);
                              }}
                              style={actionButtonStyle('warning')}
                            >
                              Edit
                            </button>
                            <button
                                onClick={() => handleDelete(String(orgId), season.id, season.name)}
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
        title="Create Season"
        organisations={organisations}
        clubs={clubs}
        teams={teams}
        requireOrganisation
        requireClub
        requireTeam
        initialOrganisationId={selectedOrgId}
        initialClubId={selectedClubId}
        initialTeamId={selectedTeamId}
        onCreate={createSeason}
      />

      <PeriodDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        period={detailSeason as any}
      />

      <PeriodEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        period={editSeason as any}
        onSave={async (payload) => {
          if (!editSeason) return;
          await savePeriodEdits(editSeason.id, payload);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};
