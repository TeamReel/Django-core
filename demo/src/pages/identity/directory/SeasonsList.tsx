import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date?: string;
  end_date?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  organisation?: { id: string; name: string } | null;
  organisation_id?: string | null;
  parent_period?: { id: string; name: string; slug?: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  activities_count?: number;
  data?: Record<string, any>;
};

// Table styling constants
const compactTableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  width: '100%',
  borderCollapse: 'collapse'
};
const compactThStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.8rem',
  textAlign: 'left',
  borderBottom: '2px solid var(--app-border)'
};
const compactTdStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.85rem',
  verticalAlign: 'middle',
  borderBottom: '1px solid #eee'
};
const compactTextTdStyle: React.CSSProperties = {
  ...compactTdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
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
          if (selectedTeamId) {
            params.set('project_id', String(selectedTeamId));
          } else if (selectedClubId) {
            // If only club selected, get all seasons for teams in that club
            const clubTeams = teams.filter((t) => {
              const tParent = t.parent_id || t.parent;
              return String(tParent) === String(selectedClubId);
            });
            if (clubTeams.length > 0) {
              // Fetch for all teams in the club
              const teamIds = clubTeams.map(t => String(t.id)).join(',');
              params.set('project_id__in', teamIds);
            }
          }
          if (selectedOrgId && !selectedClubId) params.set('organisation_id', selectedOrgId);

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
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams]);


  const selectedOrg = selectedOrgId
    ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
    : null;
  const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || selectedOrgId;

  const selectedTeam = selectedTeamId ? teams.find((t) => String(t.id) === String(selectedTeamId)) : null;
  const teamSlugOrId = (selectedTeam as any)?.slug || (selectedTeam as any)?.id || selectedTeamId;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {isSuperAdmin && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedClubId('');
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
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={selectedClubId}
          onChange={(e) => {
            setSelectedClubId(e.target.value);
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
          <option value="">Club: All</option>
          {clubs
            .filter((c) => {
              if (!selectedOrgId) return true;
              const cOrg = typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
              return String(cOrg) === String(selectedOrgId);
            })
            .map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
        </select>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="">Team: All</option>
          {teams
            .filter((t) => {
              if (!selectedClubId) return true;
              const tParent = t.parent_id || t.parent;
              return String(tParent) === String(selectedClubId);
            })
            .map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setSelectedClubId('');
              setSelectedTeamId('');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
          >
            Clear
          </Button>
          {selectedTeamId && (
            <Button variant="primary" size="md" onClick={() => {
              const orgSlug = organisations.find(o => String(o.id) === selectedOrgId)?.slug || selectedOrgId;
              const teamSlug = teams.find(t => String(t.id) === selectedTeamId)?.slug || selectedTeamId;
              navigate(`/organisations/${orgSlug}/teams/${teamSlug}/seasons/create`);
            }}>
              Create Season
            </Button>
          )}
        </div>
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
            <Table style={compactTableStyle}>
              <colgroup>
                <col />
                <col style={{ width: '120px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '120px' }} />
              </colgroup>
              <thead>
                <tr>
                    <th style={compactThStyle}>Season</th>
                    <th style={compactThStyle}>Start</th>
                    <th style={compactThStyle}>End</th>
                    <th style={compactThStyle}>Competitions</th>
                    <th style={compactThStyle}>Activities</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                    <tr key={season.id}>
                        <td style={compactTextTdStyle}>
                        <a
                            href={`/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${season.slug || season.id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${season.slug || season.id}`);
                            }}
                        >
                            {season.name}
                        </a>
                        </td>
                        <td style={compactTdStyle}>{season.start_date || '-'}</td>
                        <td style={compactTdStyle}>{season.end_date || '-'}</td>
                        <td style={compactTdStyle}>{season.children_count ?? '-'}</td>
                        <td style={compactTdStyle}>{season.activities_count ?? '-'}</td>
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
