import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import WorkFilterBar, { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';

type Period = {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  organisation?: { id: string; name: string } | null;
  organisation_id?: string | null;
  parent_period?: { id: string; name: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  activities_count?: number;
  data?: Record<string, any>;
};

export const SeasonsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const [seasons, setSeasons] = useState<Period[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);

  // Initialize org filter
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

  // Sync params from URL to state
  useEffect(() => {
    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');

    if (orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (clubId) setSelectedClubId(String(clubId));
    if (teamId) setSelectedTeamId(String(teamId));
  }, [isSuperAdmin, searchParams]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const orgs = data.data?.results || data.results || [];
        setOrganisations(orgs.map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
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
            fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`),
            fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`),
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
          const params = new URLSearchParams();
          params.set('page_size', '250');
          params.set('parent_period__isnull', 'true');
          if (selectedTeamId) params.set('project_id', String(selectedTeamId));
          if (selectedOrgId) params.set('organisation_id', selectedOrgId);

          const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
          if (!res.ok) throw new Error(`API error: ${res.status}`);

          const data = await res.json();
          const results = data.data?.results || data.results || data.data || [];
          setSeasons(Array.isArray(results) ? results : []);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load seasons');
        } finally {
          setSeasonsLoading(false);
        }
      };

      loadSeasons();
  }, [selectedTeamId, selectedOrgId]);


  const selectedOrg = selectedOrgId
    ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
    : null;
  const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || selectedOrgId;

  const selectedTeam = selectedTeamId ? teams.find((t) => String(t.id) === String(selectedTeamId)) : null;
  const teamSlugOrId = (selectedTeam as any)?.slug || (selectedTeam as any)?.id || selectedTeamId;

  return (
    <div>
       <div style={{ marginBottom: '16px' }}>
      <WorkFilterBar
        showStatus={false}
        organisations={organisations}
        clubs={clubs}
        teams={teams}
        statusFilter="all"
        onStatusChange={() => {}}
        selectedOrgId={selectedOrgId}
        onOrganisationChange={(value) => {
            setSelectedOrgId(value);
            setSelectedClubId('');
            setSelectedTeamId('');
        }}
        selectedClubId={selectedClubId}
        onClubChange={(value) => {
            setSelectedClubId(value);
            setSelectedTeamId('');
        }}
        selectedTeamId={selectedTeamId}
        onTeamChange={setSelectedTeamId}
        onClear={() => {
          setSelectedClubId('');
          setSelectedTeamId('');
          if (isSuperAdmin) setSelectedOrgId('');
        }}
      />
      </div>

      {isLoading && <LoadingState message="Loading options..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && seasonsLoading && <LoadingState message="Loading seasons..." />}

      {!isLoading && !error && !seasonsLoading && seasons.length === 0 && (
          <Alert variant="info">No seasons found. Use filters to narrow your search.</Alert>
      )}

      {!isLoading && !error && !seasonsLoading && seasons.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                    <th>Season</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Competitions</th>
                    <th>Activities</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                    <tr key={season.id}>
                        <td>
                        <a
                            href={`/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${season.id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${season.id}`);
                            }}
                        >
                            {season.name}
                        </a>
                        </td>
                        <td>{season.start_date || '-'}</td>
                        <td>{season.end_date || '-'}</td>
                        <td>{season.children_count ?? '-'}</td>
                        <td>{season.activities_count ?? '-'}</td>
                    </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};
