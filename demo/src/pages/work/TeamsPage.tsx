import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import { fetchAllPages } from '../../utils/fetchAllPages';
import WorkFilterBar, { OrganisationOption, ProjectOption } from './WorkFilterBar';

export default function TeamsPage() {
  const navigate = useNavigate();
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Initialize org filter for non-superadmins
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

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

  // Fetch clubs/teams options
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

  const filteredTeams = useMemo(() => {
    let list = [...teams];

    if (selectedTeamId) {
      list = list.filter((t) => String(t.id) === String(selectedTeamId));
    }

    if (selectedClubId) {
      const selectedClub = clubs.find((c) => String(c.id) === String(selectedClubId));
      const selectedClubName = selectedClub?.name;
      list = list.filter((team: any) => {
        const teamParentId = team.parent_id ?? team.parent ?? null;
        const teamParentName = team.parent_name ?? null;
        const matchesById = teamParentId !== null && String(teamParentId) === String(selectedClubId);
        const matchesByName = selectedClubName && teamParentName && String(teamParentName) === String(selectedClubName);
        return matchesById || matchesByName;
      });
    }

    if (selectedOrgId) {
      list = list.filter((team: any) => {
        const parentId = team.parent_id ?? team.parent ?? null;
        const parentName = team.parent_name ?? null;

        let parentClub = parentId !== null ? clubs.find((c) => String(c.id) === String(parentId)) : undefined;
        if (!parentClub && parentName) parentClub = clubs.find((c) => c.name === parentName);
        if (!parentClub) return false;

        const clubOrg = typeof parentClub.organisation === 'string' ? parentClub.organisation : parentClub.organisation?.id;
        return String(clubOrg) === String(selectedOrgId);
      });
    }

    if (statusFilter === 'active') {
      list = list.filter((t: any) => t.is_active !== false);
    } else if (statusFilter === 'inactive') {
      list = list.filter((t: any) => t.is_active === false);
    }

    return list;
  }, [teams, selectedOrgId, selectedClubId, selectedTeamId, clubs, statusFilter]);

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Federations', onClick: () => navigate('/organisations') },
    { label: 'Teams', current: true },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Teams"
        breadcrumbs={breadcrumbs}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <WorkFilterBar
              organisations={organisations}
              clubs={clubs}
              teams={teams}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
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
              onTeamChange={(value) => {
                setSelectedTeamId(value);
              }}
              onClear={() => {
                setStatusFilter('all');
                setSelectedClubId('');
                setSelectedTeamId('');
                if (isSuperAdmin) setSelectedOrgId('');
              }}
            />
          </div>
        }
      />
      <PageContent>
        {isLoading && <LoadingState message="Loading teams..." />}
        {error && <Alert variant="error">{error}</Alert>}

        {!isLoading && !error && filteredTeams.length === 0 && (
          <Alert variant="info">No teams match the current filters.</Alert>
        )}

        {!isLoading && !error && filteredTeams.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Club</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team: any) => {
                    const orgSlugOrId = team.organisation?.slug || team.organisation?.id || selectedOrgId;
                    return (
                      <tr key={team.id}>
                        <td>
                          <a
                            href={`/organisations/${orgSlugOrId}/projects/${team.slug || team.id}`}
                            className="text-blue-600 hover:underline"
                            style={{ fontSize: '0.85rem' }}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/organisations/${orgSlugOrId}/projects/${team.slug || team.id}`);
                            }}
                          >
                            {team.name}
                          </a>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{team.parent_name || '-'}</td>
                        <td>{team.is_active === false ? 'Inactive' : 'Active'}</td>
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
