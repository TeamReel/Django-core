import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import { fetchAllPages } from '../../utils/fetchAllPages';
import WorkFilterBar, { OrganisationOption, ProjectOption } from './WorkFilterBar';

type Activity = {
  id: string;
  title: string;
  activity_type: string;
  start_time?: string;
  end_time?: string;
  project?: { id: string; name: string } | null;
  period?: { id: string; name: string } | null;
  data?: Record<string, any>;
};

export default function MatchesPage() {
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

  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

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
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const orgs = data.data?.results || data.results || [];
        setOrganisations(orgs.map((o: any) => ({ id: String(o.id), name: o.name })));
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

  // Fetch matches when team selected
  useEffect(() => {
    const loadMatches = async () => {
      setMatches([]);
      if (!selectedTeamId) return;

      setMatchesLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('activity_type', 'match');
        params.set('project_id', String(selectedTeamId));
        if (selectedOrgId) params.set('organisation_id', selectedOrgId);

        const all = await fetchAllPages<Activity>(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`);
        setMatches(all);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [selectedTeamId, selectedOrgId]);

  const teamName = useMemo(() => {
    const t = teams.find((x) => String(x.id) === String(selectedTeamId));
    return t?.name || 'Team';
  }, [teams, selectedTeamId]);

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Federations', onClick: () => navigate('/federations') },
    { label: 'Matches', current: true },
  ];

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle={selectedTeamId ? `Showing matches for ${teamName}` : 'Select a team to view matches'}
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
          <Alert variant="info">Select a team in the filters to view matches.</Alert>
        )}

        {!isLoading && !error && selectedTeamId && matchesLoading && <LoadingState message="Loading matches..." />}

        {!isLoading && !error && selectedTeamId && !matchesLoading && matches.length === 0 && (
          <Alert variant="info">No matches found for the selected team.</Alert>
        )}

        {!isLoading && !error && selectedTeamId && !matchesLoading && matches.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Competition</th>
                    <th>Start</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {(() => {
                          const matchSlugOrId = String((m as any).slug || m.id || '').trim();

                          const orgObj: any = organisations.find((o: any) => String(o?.id) === String(selectedOrgId));
                          const orgSlugOrId = String(orgObj?.slug || selectedOrgId || '').trim();

                          const teamObj: any = teams.find((t: any) => String(t?.id) === String(selectedTeamId));
                          const teamSlugOrId = String(teamObj?.slug || selectedTeamId || '').trim();

                          const inferredClubId = String(
                            selectedClubId || teamObj?.parent_id || teamObj?.parent || teamObj?.parent_project_id || teamObj?.parent_project || ''
                          ).trim();
                          const clubObj: any = clubs.find((c: any) => String(c?.id) === inferredClubId);
                          const clubSlugOrId = String(clubObj?.slug || inferredClubId || '').trim();

                          const competition: any = (m as any)?.period;
                          const competitionKeyOrId = String(competition?.slug || competition?.id || '').trim();
                          const seasonKeyOrId = String(
                            competition?.parent_period?.slug ||
                              competition?.parent_period?.id ||
                              competition?.parent_period_id ||
                              ''
                          ).trim();

                          const matchPath = (orgSlugOrId && clubSlugOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId && matchSlugOrId)
                            ? `/${orgSlugOrId}/${clubSlugOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchSlugOrId}`
                            : `/matches/${matchSlugOrId}`;

                          return (
                        <a
                          href={matchPath}
                          className="text-blue-600 hover:underline"
                          style={{ fontSize: '0.85rem' }}
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
                      <td style={{ fontSize: '0.85rem' }}>{m.period?.name || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{m.start_time || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        )}
      </PageContent>
    </>
  );
}
