import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Tab, TabList, TabPanel, Tabs } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';

type Period = {
  id: string;
  name: string;
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
};

export const ProjectSeasonDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId, projectId, seasonId, clubId } = useParams<{ orgId: string; projectId: string; seasonId: string; clubId?: string }>();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [activeTab, setActiveTab] = useState<'competitions' | 'details'>('competitions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';

  const isTeamRoute = Boolean(clubId);
  const clubSlugOrId = clubId || '';

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
              onClick: () =>
                navigate(
                  `/teams?org_id=${encodeURIComponent(String(orgSlugOrId))}&club_id=${encodeURIComponent(String(clubSlugOrId))}`
                ),
            },
            { label: project?.name || 'Team', onClick: () => navigate(projectDetailPath) },
          ]
        : [{ label: project?.name || 'Club/Team', onClick: () => navigate(projectDetailPath) }]),
      { label: 'Seasons', onClick: () => navigate(seasonsBasePath) },
      { label: season?.name || 'Season', current: true },
    ],
    [navigate, org?.name, project?.name, club?.name, season?.name, orgSlugOrId, seasonsBasePath, projectDetailPath, isTeamRoute, clubSlugOrId]
  );

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
        const competitionsData = rawCompetitions?.data || rawCompetitions;
        const allPeriods = Array.isArray(competitionsData)
          ? competitionsData
          : competitionsData?.results || competitionsData?.data?.results || [];
        // Filter client-side for competitions (children of this season)
        const competitionResults = allPeriods.filter((p: Period) =>
          p.parent_period && (p.parent_period.id === effectiveSeasonId || String(p.parent_period) === effectiveSeasonId)
        );
        setCompetitions(competitionResults);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load season');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId, effectiveSeasonId]);

  return (
    <AppShell>
      <div>
        <PageHeader
          title={season ? season.name : 'Season'}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                onClick={() => navigate(seasonsBasePath)}
              >
                Back to Seasons
              </Button>
            </div>
          }
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          <Tabs value={activeTab} onChange={(v) => setActiveTab(v as any)}>
            <TabList className="mb-6">
              <Tab value="competitions">Competitions</Tab>
              <Tab value="details">Details</Tab>
            </TabList>

            <TabPanel value="competitions">
              <Card>
                {loading ? (
                  <div style={{ padding: '16px', color: 'var(--app-text-secondary)' }}>Loading competitions…</div>
                ) : competitions.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--app-text-secondary)' }}>No competitions found.</div>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Competition</th>
                        <th style={{ textAlign: 'left' }}>Dates</th>
                        <th style={{ textAlign: 'center' }}>Matches</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitions.map((competition) => (
                        <tr key={competition.id}>
                          <td style={{ fontWeight: 600 }}>{competition.name}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(competition.start_date).toLocaleDateString()} –{' '}
                            {new Date(competition.end_date).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Badge variant="default">{competition.children_count ?? '—'}</Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`${seasonsBasePath}/${effectiveSeasonId}/competitions/${competition.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </TabPanel>

            <TabPanel value="details">
              <Card>
                <div style={{ padding: '16px', display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="default">Season</Badge>
                    <span style={{ color: 'var(--app-text-secondary)' }}>
                      {season?.start_date ? new Date(season.start_date).toLocaleDateString() : '—'} –{' '}
                      {season?.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--app-text-secondary)' }}>Use the Competitions tab to drill down to matches.</div>
                </div>
              </Card>
            </TabPanel>
          </Tabs>
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectSeasonDetailPage;
