import React, { useEffect, useState } from 'react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { periodPathKey } from '../../../utils/periodPath';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
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
    const hasParent = Boolean(p?.parent_period_id || p?.parent_period);
    if (hasParent) return false;
    const name = String(p?.name || '').trim().toLowerCase();
    if (!name) return false;
    if (name.startsWith('season') || name.startsWith('seizoen')) return true;
    const compact = name.replace(/\s+/g, '');
    return /^\d{4}([/-])\d{2,4}$/.test(compact) || /^\d{4}([/-])\d{4}$/.test(compact);
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

  // Fetch filter options
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        try {
          const baseParams = new URLSearchParams();
          baseParams.set('page_size', '500');
          baseParams.set('parent_id', 'null');
          // Push season filtering to the API (backend supports ?type=season).
          baseParams.set('type', 'season');

          // Always fetch based on selection, or all if nothing selected
          if (selectedTeamId) {
            baseParams.set('project_id', String(selectedTeamId));
          } else if (selectedClubId) {
            // If only club selected, get all seasons for teams in that club
            const clubTeams = teams.filter((t) => {
              const tParent = (t as any).parent_id || (t as any).parent || (t as any).parent_project_id;
              return String(tParent) === String(selectedClubId);
            });
            if (clubTeams.length > 0) {
              // Fetch for all teams in the club (chunk to avoid long URLs)
              const teamIds = clubTeams.map((t) => String(t.id));
              const chunks = chunkArray(teamIds, 25);
              const results = (
                await Promise.all(
                  chunks.map(async (ids) => {
                    const params = new URLSearchParams(baseParams);
                    params.set('project_id__in', ids.join(','));
                    const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
                    return await fetchAllPages<any>(
                      url,
                      { credentials: 'include' },
                      { ttlMs: 120_000, bypass: refreshKey > 0 },
                    );
                  }),
                )
              ).flat();

              const roots = (Array.isArray(results) ? results : []).filter(
                (p: any) => (p?.parent_period_id == null && !p?.parent_period),
              );
              const unique = [...new Map(roots.map((p: any) => [String(p.id), p])).values()];
              setSeasons(unique as any);
              return;
            }
          } else if (selectedOrgId) {
            // If only org selected, periods are commonly team-scoped.
            // Prefer scoping by team ids; fall back to organisation_id using resolved UUID.
            if (teams.length > 0) {
              const teamIds = teams.map((t) => String((t as any).id)).filter(Boolean);
              const chunks = chunkArray(teamIds, 25);
              const results = (
                await Promise.all(
                  chunks.map(async (ids) => {
                    const params = new URLSearchParams(baseParams);
                    params.set('project_id__in', ids.join(','));
                    const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
                    return await fetchAllPages<any>(
                      url,
                      { credentials: 'include' },
                      { ttlMs: 120_000, bypass: refreshKey > 0 },
                    );
                  }),
                )
              ).flat();

              const roots = (Array.isArray(results) ? results : []).filter(
                (p: any) => (p?.parent_period_id == null && !p?.parent_period),
              );
              const unique = [...new Map(roots.map((p: any) => [String(p.id), p])).values()];
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

          const url = `${apiBaseUrl}/api/v1/periods/?${baseParams.toString()}`;
          const results = await fetchAllPages<any>(
            url,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          );

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
            // Keep org scoping; drop the explicit parent filter so we get everything.
            fallbackParams.delete('parent_id');

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

          // Root periods represent seasons in the demo scenario.
          const filteredSeasons = results.filter((p: any) => (p?.parent_period_id == null && !p?.parent_period));

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
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
    if (statusFilter === 'active') {
      return seasons.filter((s) => {
        const start = s.start_date || '0000-00-00';
        const end = s.end_date || '9999-99-99';
        return today >= start && today <= end;
      });
    }
    if (statusFilter === 'inactive') {
      return seasons.filter((s) => {
        const start = s.start_date || '0000-00-00';
        const end = s.end_date || '9999-99-99';
        return !(today >= start && today <= end);
      });
    }
    return seasons;
  }, [seasons, statusFilter]);

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (!clubLocked) setSelectedClubId('');
              if (!teamLocked) setSelectedTeamId('');
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
                    const teamId = typeof project === 'string' ? project : project?.id;

                    // Find the team in teams list to get parent club info
                    const teamObj = teams.find(t => String(t.id) === String(teamId));
                    const clubId = teamObj?.parent_id || (teamObj as any)?.parent_project_id;
                    const clubObj = clubs.find(c => String(c.id) === String(clubId));
                    const clubName = clubObj?.name || '-';

                    const orgId = typeof org === 'string' ? org : org?.id;
                    const orgFromList = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
                    const orgSlugOrId = orgFromList?.slug || (org as any)?.slug || orgId;

                    const clubSlugOrId = (clubObj as any)?.slug || clubId;
                    const teamSlugOrId = (teamObj as any)?.slug || teamId;
                    const seasonSlugOrId = periodPathKey(season) || season.slug || season.id;

                    const teamDetailPath = (orgSlugOrId && clubSlugOrId && teamSlugOrId)
                      ? `/${orgSlugOrId}/${clubSlugOrId}/${teamSlugOrId}`
                      : (orgSlugOrId && teamSlugOrId)
                        ? `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}`
                        : null;

                    const seasonDetailPath = (orgSlugOrId && clubSlugOrId && teamSlugOrId && seasonSlugOrId)
                      ? `/${orgSlugOrId}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}`
                      : (orgSlugOrId && teamSlugOrId && seasonSlugOrId)
                        ? `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlugOrId}`
                        : null;

                    // Use activities_count for matches if available, else 0
                    const matchesCount = (season as any).matches_count ?? season.activities_count ?? 0;

                    return (
                    <tr key={season.id}>
                        {!orgLocked && (
                          <td style={compactTextTdStyle}>
                            {orgSlugOrId ? (
                              <a
                                href={`/organisations/${orgSlugOrId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/organisations/${orgSlugOrId}`);
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
                            {clubSlugOrId && orgSlugOrId ? (
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
                            season.name
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
