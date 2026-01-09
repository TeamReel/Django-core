import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import WorkFilterBar, { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';

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

export const MatchesList: React.FC = () => {
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

  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Initialize org filter
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

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

  // Fetch options
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
        setError(e instanceof Error ? e.message : 'Failed to load options');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  // Fetch matches
  useEffect(() => {
    const loadMatches = async () => {
      setMatchesLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('activity_type', 'match');
        if (selectedTeamId) params.set('project_id', String(selectedTeamId));
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

        {!isLoading && !error && matchesLoading && (
          <LoadingState message="Loading matches..." />
        )}

        {!isLoading && !error && !matchesLoading && matches.length === 0 && (
          <Alert variant="info">No matches found. Use filters to narrow your search.</Alert>
        )}

        {!isLoading && !error && !matchesLoading && matches.length > 0 && (
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
                        <a
                          href={`/matches/${m.id}`}
                          className="text-blue-600 hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/matches/${m.id}`);
                          }}
                        >
                          {m.title}
                        </a>
                      </td>
                      <td>{m.period?.name || '-'}</td>
                      <td>{m.start_time || '-'}</td>
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
