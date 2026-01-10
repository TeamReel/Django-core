import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { useAuth } from '@django-core/auth-ui';
import { canDeleteProject, canEditProject } from '../../utils/permissions';

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date: string;
  end_date: string;
  parent_period?: { id: string; name: string } | null;
  children_count?: number;
};

type ListResponse<T> = {
  results: T[];
  count: number;
};

type Project = {
  id: string;
  name: string;
  slug?: string;
};

type Organisation = {
  id: string;
  name: string;
  slug?: string;
  user_role?: 'admin' | 'member';
};

const compactTableStyle: React.CSSProperties = { tableLayout: 'fixed', width: '100%' };
const compactThStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--app-muted-text)',
  borderBottom: '1px solid var(--app-border)',
  whiteSpace: 'nowrap',
};
const compactTdStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--app-border)',
  verticalAlign: 'middle',
  height: '40px',
};
const compactTextTdStyle: React.CSSProperties = {
  ...compactTdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

type ActionTone = 'neutral' | 'primary' | 'danger';
const actionButtonStyle = (tone: ActionTone): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--app-surface)',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1.2,
  };
  if (tone === 'primary') {
    return { ...base, border: '1px solid #007bff', color: '#007bff' };
  }
  if (tone === 'danger') {
    return { ...base, border: '1px solid #dc3545', color: '#dc3545' };
  }
  return { ...base, border: '1px solid #6c757d', color: '#6c757d' };
};

export const ProjectSeasonDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId, projectId, seasonId, clubId } = useParams<{ orgId: string; projectId: string; seasonId: string; clubId?: string }>();
  const { user } = useAuth();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';

  const isTeamRoute = Boolean(clubId);
  const clubSlugOrId = clubId || '';

  // Permission checks
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || Boolean((user as any)?.is_staff) || (user as any)?.role === 'Superadmin';
  const permissionContext = {
    currentOrganisation: org as any,
    isSuperAdmin,
  };
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  const projectDetailPath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

  const seasonsBasePath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      { label: 'Federations', onClick: () => navigate('/organisations') },
      { label: org?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
      {
        label: 'Clubs',
        onClick: () => navigate(`/clubs?org_id=${encodeURIComponent(String(orgSlugOrId))}`),
      },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`),
            },
            {
              label: 'Teams',
              onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`),
            },
            { label: project?.name || 'Team', onClick: () => navigate(projectDetailPath) },
          ]
        : [{ label: project?.name || 'Club/Team', onClick: () => navigate(projectDetailPath) }]),
      { label: 'Seasons', onClick: () => navigate(seasonsBasePath) },
      { label: season?.name || 'Season', current: true },
    ],
    [navigate, org?.name, project?.name, club?.name, season?.name, orgSlugOrId, seasonsBasePath, projectDetailPath, isTeamRoute, clubSlugOrId]
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'competitions', label: 'Competitions' },
    { id: 'matches', label: 'Matches' },
    { id: 'people', label: 'Users' },
  ];

  // Helper to count matches per competition
  const getMatchCountForCompetition = (competitionId: string): number => {
    return matches.filter((m: any) => {
      const periodId = String(m.period_id || m.period?.id || '');
      return periodId === competitionId;
    }).length;
  };

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, seasonRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveSeasonId}/`, { credentials: 'include' }),
          isTeamRoute
            ? fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`, {
                credentials: 'include',
              })
            : Promise.resolve(null as any),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');
        if (!seasonRes.ok) throw new Error('Failed to load season');

        const rawOrg: any = await orgRes.json();
        const rawProject: any = await projectRes.json();
        const rawSeason: any = await seasonRes.json();

        const orgJson: Organisation = rawOrg?.data || rawOrg;
        const projectJson: Project = rawProject?.data || rawProject;
        const seasonJson: Period = rawSeason?.data || rawSeason;

        setOrg(orgJson);
        setProject(projectJson);
        setSeason(seasonJson);

        if (isTeamRoute && clubRes && (clubRes as any).ok) {
          try {
            setClub(await (clubRes as any).json());
          } catch {
            // ignore
          }
        }

        const competitionsRes = await fetch(
          `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(String(projectJson.id))}&page_size=250`,
          { credentials: 'include' }
        );
        if (!competitionsRes.ok) throw new Error('Failed to load competitions');
        const rawCompetitions: any = await competitionsRes.json();
        console.log('[SeasonDetail] Raw competitions response:', rawCompetitions);

        // Handle multiple envelope formats
        let allPeriods: Period[] = [];
        if (Array.isArray(rawCompetitions)) {
          allPeriods = rawCompetitions;
        } else if (Array.isArray(rawCompetitions?.data)) {
          allPeriods = rawCompetitions.data;
        } else if (Array.isArray(rawCompetitions?.data?.data)) {
          allPeriods = rawCompetitions.data.data;
        } else if (Array.isArray(rawCompetitions?.data?.results)) {
          allPeriods = rawCompetitions.data.results;
        } else if (Array.isArray(rawCompetitions?.results)) {
          allPeriods = rawCompetitions.results;
        }

        console.log('[SeasonDetail] All periods:', allPeriods.length);
        console.log('[SeasonDetail] Looking for parent_period:', effectiveSeasonId);
        // Filter client-side for competitions (children of this season)
        const competitionResults = allPeriods.filter((p: Period) => {
          const parentId = p.parent_period?.id || String(p.parent_period || '');
          const matches = parentId === effectiveSeasonId || String(parentId) === String(effectiveSeasonId);
          if (matches) {
            console.log('[SeasonDetail] Competition match:', p.name, 'parent:', parentId);
          }
          return p.parent_period && matches;
        });
        console.log('[SeasonDetail] Filtered competitions:', competitionResults.length, competitionResults);
        setCompetitions(competitionResults);

        // Fetch matches for competitions in this season
        const competitionIds = competitionResults.map((c: Period) => c.id);
        console.log('[SeasonDetail] Competition IDs:', competitionIds);
        if (competitionIds.length > 0) {
          try {
            const matchesRes = await fetch(
              `${apiBaseUrl}/api/v1/activities/?activity_type=match&page_size=250&ordering=-start_time`,
              { credentials: 'include' }
            );
            if (matchesRes.ok) {
              const rawMatches: any = await matchesRes.json();
              console.log('[SeasonDetail] Raw matches response:', rawMatches);

              // Handle multiple envelope formats
              let allMatches: any[] = [];
              if (Array.isArray(rawMatches)) {
                allMatches = rawMatches;
              } else if (Array.isArray(rawMatches?.data)) {
                allMatches = rawMatches.data;
              } else if (Array.isArray(rawMatches?.data?.data)) {
                allMatches = rawMatches.data.data;
              } else if (Array.isArray(rawMatches?.data?.results)) {
                allMatches = rawMatches.data.results;
              } else if (Array.isArray(rawMatches?.results)) {
                allMatches = rawMatches.results;
              }

              console.log('[SeasonDetail] All matches:', allMatches.length);
              const seasonMatches = allMatches.filter((m: any) => {
                const periodId = String(m.period_id || m.period?.id || '');
                const matches = competitionIds.includes(periodId);
                if (matches) {
                  console.log('[SeasonDetail] Match in season:', m.title || m.name, 'period:', periodId);
                }
                return matches;
              });
              console.log('[SeasonDetail] Filtered matches:', seasonMatches.length, seasonMatches);
              setMatches(seasonMatches);
            }
          } catch (e) {
            console.error('Failed to fetch matches:', e);
          }
        }

        // Fetch members for the team/project
        try {
          const membersRes = await fetch(
            `${apiBaseUrl}/api/v1/projects/${projectJson.id}/members/`,
            { credentials: 'include' }
          );
          if (membersRes.ok) {
            const rawMembers: any = await membersRes.json();

            // Handle multiple envelope formats
            let membersList: any[] = [];
            if (Array.isArray(rawMembers)) {
              membersList = rawMembers;
            } else if (Array.isArray(rawMembers?.data)) {
              membersList = rawMembers.data;
            } else if (Array.isArray(rawMembers?.data?.data)) {
              membersList = rawMembers.data.data;
            } else if (Array.isArray(rawMembers?.data?.results)) {
              membersList = rawMembers.data.results;
            } else if (Array.isArray(rawMembers?.results)) {
              membersList = rawMembers.results;
            }

            setMembers(membersList);
          }
        } catch (e) {
          console.error('Failed to fetch members:', e);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load season');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId, effectiveSeasonId, isTeamRoute, clubSlugOrId]);

  return (
    <AppShell>
      <div>
        <PageHeader
          title={season ? season.name : 'Season'}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate(seasonsBasePath)}
                style={actionButtonStyle('neutral')}
              >
                Back
              </button>
              <button
                onClick={() => navigate(`${seasonsBasePath}/${effectiveSeasonId}`)}
                style={actionButtonStyle('neutral')}
              >
                View
              </button>
              {userCanEditProject && (
                <button
                  onClick={() => navigate(`${seasonsBasePath}/${effectiveSeasonId}/edit`)}
                  style={actionButtonStyle('primary')}
                >
                  Edit
                </button>
              )}
              {userCanDeleteProject && (
                <button
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete season ${season?.name}?`)) return;
                    try {
                      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                      const res = await fetch(
                        `${apiBaseUrl}/api/v1/periods/${effectiveSeasonId}/`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrfToken || '',
                          },
                          credentials: 'include',
                        }
                      );

                      if (res.ok) {
                        navigate(seasonsBasePath);
                      } else {
                        alert('Error deleting season');
                      }
                    } catch (e) {
                      console.error(e);
                      alert('Error deleting season');
                    }
                  }}
                  style={actionButtonStyle('danger')}
                >
                  Delete
                </button>
              )}
            </div>
          }
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <Card><div style={{ padding: '16px' }}>Loading...</div></Card>
          ) : (
            <>
              <div style={{ borderBottom: '1px solid var(--app-border)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '12px 0',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid var(--app-primary)' : '2px solid transparent',
                        color: activeTab === tab.id ? 'var(--app-primary)' : 'var(--app-text-secondary)',
                        fontWeight: activeTab === tab.id ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'overview' && (
                <Card>
                  <div style={{ padding: '16px', display: 'grid', gap: '16px' }}>
                    <div>
                      <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Season Information</h3>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--app-text-secondary)', width: '120px' }}>Period:</span>
                          <span>
                            {season?.start_date ? new Date(season.start_date).toLocaleDateString() : '—'} –{' '}
                            {season?.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--app-text-secondary)', width: '120px' }}>Competitions:</span>
                          <Badge variant="info">{competitions.length}</Badge>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--app-text-secondary)', width: '120px' }}>Matches:</span>
                          <Badge variant="info">{matches.length}</Badge>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--app-text-secondary)', width: '120px' }}>Team Members:</span>
                          <Badge variant="info">{members.length}</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Quick Actions</h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Button size="sm" variant="secondary" onClick={() => setActiveTab('competitions')}>
                          View Competitions
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setActiveTab('matches')}>
                          View Matches
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setActiveTab('people')}>
                          View Team Members
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'competitions' && (
                <Card>
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Competitions</h3>
                    {competitions.length === 0 ? (
                      <Alert variant="info">No competitions found in this season.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Competition</th>
                            <th style={compactThStyle}>Dates</th>
                            <th style={compactThStyle}>Matches</th>
                            <th style={compactThStyle} className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitions.map((competition) => (
                            <tr key={competition.id}>
                              <td style={compactTextTdStyle}>{competition.name}</td>
                              <td style={compactTextTdStyle}>
                                {new Date(competition.start_date).toLocaleDateString()} –{' '}
                                {new Date(competition.end_date).toLocaleDateString()}
                              </td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{getMatchCountForCompetition(competition.id)}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    onClick={() => navigate(`${seasonsBasePath}/${season?.slug || effectiveSeasonId}/competitions/${competition.slug || competition.id}`)}
                                    style={actionButtonStyle('neutral')}
                                  >
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button
                                      onClick={() => navigate(`${seasonsBasePath}/${season?.slug || effectiveSeasonId}/competitions/${competition.slug || competition.id}/edit`)}
                                      style={actionButtonStyle('primary')}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                                        try {
                                          const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                                          const res = await fetch(
                                            `${apiBaseUrl}/api/v1/periods/${competition.id}/`,
                                            {
                                              method: 'DELETE',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': csrfToken || '',
                                              },
                                              credentials: 'include',
                                            }
                                          );

                                          if (res.ok) {
                                            setCompetitions((prev) => prev.filter((c) => c.id !== competition.id));
                                          } else {
                                            alert('Error deleting competition');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting competition');
                                        }
                                      }}
                                      style={actionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Card>
              )}

              {activeTab === 'matches' && (
                <Card>
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Matches</h3>
                    {matches.length === 0 ? (
                      <Alert variant="info">No matches found in this season.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Match</th>
                            <th style={compactThStyle}>Competition</th>
                            <th style={compactThStyle}>Date</th>
                            <th style={compactThStyle} className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((match) => (
                            <tr key={match.id}>
                              <td style={compactTextTdStyle}>{match.title || match.name}</td>
                              <td style={compactTextTdStyle}>{match.period?.name || '—'}</td>
                              <td style={compactTextTdStyle}>
                                {match.start_time ? new Date(match.start_time).toLocaleString() : '—'}
                              </td>
                              <td style={compactTdStyle}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    onClick={() => navigate(`/matches/${match.id}`)}
                                    style={actionButtonStyle('neutral')}
                                  >
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button
                                      onClick={() => navigate(`/matches/${match.id}/edit`)}
                                      style={actionButtonStyle('primary')}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Are you sure you want to delete match ${match.title || match.name}?`)) return;
                                        try {
                                          const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                                          const res = await fetch(
                                            `${apiBaseUrl}/api/v1/activities/${match.id}/`,
                                            {
                                              method: 'DELETE',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': csrfToken || '',
                                              },
                                              credentials: 'include',
                                            }
                                          );

                                          if (res.ok) {
                                            setMatches((prev) => prev.filter((m) => m.id !== match.id));
                                          } else {
                                            alert('Error deleting match');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting match');
                                        }
                                      }}
                                      style={actionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Card>
              )}

              {activeTab === 'people' && (
                <Card>
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Team Members</h3>
                    {members.length === 0 ? (
                      <Alert variant="info">No members found.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Name</th>
                            <th style={compactThStyle}>Email</th>
                            <th style={compactThStyle}>Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((item: any) => {
                            const user = item.user || item;
                            const name =
                              user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '-';
                            const email = user.email || '-';
                            const role = item.role || user.role || 'member';
                            return (
                              <tr key={String(user.id || item.id)}>
                                <td style={compactTextTdStyle}>{name}</td>
                                <td style={compactTextTdStyle}>{email}</td>
                                <td style={compactTextTdStyle}>
                                  <Badge variant="default">{String(role)}</Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectSeasonDetailPage;
