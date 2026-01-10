import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import { fetchAllPages } from '../../utils/fetchAllPages';
import WorkFilterBar, { OrganisationOption, ProjectOption } from './WorkFilterBar';

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date?: string;
  end_date?: string;
  parent_period?: { id: string; name: string; slug?: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  activities_count?: number;
  data?: Record<string, any>;
};

export default function CompetitionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);

  // Initialize org filter for non-superadmins
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

  // Preselect org for superadmin via query param
  useEffect(() => {
    if (!isSuperAdmin) return;
    const params = new URLSearchParams(location.search);
    const orgId = params.get('org_id');
    if (orgId) setSelectedOrgId(orgId);
  }, [isSuperAdmin, location.search]);

  // Fetch org options for superadmin
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

  // Fetch club/team filter options
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
        setError(e instanceof Error ? e.message : 'Failed to load filter options');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  // Fetch competitions when team selected
  useEffect(() => {
    const loadCompetitions = async () => {
      setCompetitions([]);
      if (!selectedTeamId) return;

      setCompetitionsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('project_id', String(selectedTeamId));
        if (selectedOrgId) params.set('organisation_id', selectedOrgId);

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const results = data.data?.results || data.results || data.data || [];
        const periods: Period[] = Array.isArray(results) ? results : [];

        // Competitions are periods with a parent (season)
        setCompetitions(periods.filter((p) => (p as any).parent_period_id || p.parent_period));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load competitions');
      } finally {
        setCompetitionsLoading(false);
      }
    };

    loadCompetitions();
  }, [selectedTeamId, selectedOrgId]);

  const teamName = useMemo(() => {
    const t = teams.find((x) => String(x.id) === String(selectedTeamId));
    return t?.name || 'Team';
  }, [teams, selectedTeamId]);

  const selectedOrg = selectedOrgId
    ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
    : null;
  const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || selectedOrgId;

  const selectedTeam = selectedTeamId ? teams.find((t) => String(t.id) === String(selectedTeamId)) : null;
  const teamSlugOrId = (selectedTeam as any)?.slug || (selectedTeam as any)?.id || selectedTeamId;

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Federations', onClick: () => navigate('/organisations') },
    { label: 'Competitions', current: true },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Competitions"
        subtitle={selectedTeamId ? `Showing competitions for ${teamName}` : 'Select a team to view competitions'}
        breadcrumbs={breadcrumbs}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <WorkFilterBar
              showStatus={false}
              organisations={organisations}
              clubs={clubs}
              teams={teams}
              statusFilter="all"
              onStatusChange={() => {
                // no-op
              }}
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
        }
      />
      <PageContent>
        {isLoading && <LoadingState message="Loading filter options..." />}
        {error && <Alert variant="error">{error}</Alert>}

        {!isLoading && !error && !selectedTeamId && (
          <Alert variant="info">Select a team in the filters to view competitions.</Alert>
        )}

        {!isLoading && !error && selectedTeamId && competitionsLoading && (
          <LoadingState message="Loading competitions..." />
        )}

        {!isLoading && !error && selectedTeamId && !competitionsLoading && competitions.length === 0 && (
          <Alert variant="info">No competitions found for the selected team.</Alert>
        )}

        {!isLoading && !error && selectedTeamId && !competitionsLoading && competitions.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>Competition</th>
                    <th>Season</th>
                    <th>Children</th>
                    <th>Activities</th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((comp) => {
                    const seasonId = (comp as any).parent_period_id || comp.parent_period?.id;
                    const seasonSlug = comp.parent_period?.slug;
                    return (
                      <tr key={comp.id}>
                        <td>
                          <a
                            href={`/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`}
                            className="text-blue-600 hover:underline"
                            style={{ fontSize: '0.85rem' }}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(
                                `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`,
                              );
                            }}
                          >
                            {comp.name}
                          </a>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{comp.parent_period?.name || '-'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{comp.children_count ?? '-'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{comp.activities_count ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
        )}
      </PageContent>
    </AppShell>
  );
}
