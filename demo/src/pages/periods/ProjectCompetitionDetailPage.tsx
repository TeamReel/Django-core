import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Tab, TabList, TabPanel, Tabs } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

type Period = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  parent_period?: { id: string; name: string } | null;
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

export const ProjectCompetitionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId, projectId, seasonId, competitionId, clubId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    clubId?: string;
  }>();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competition, setCompetition] = useState<Period | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'links'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';
  const effectiveCompetitionId = competitionId || '';

  const isTeamRoute = Boolean(clubId);
  const clubSlugOrId = clubId || '';

  const projectDetailPath = isTeamRoute
    ? `/federations/${orgSlugOrId}/clubs/${clubSlugOrId}/teams/${projectSlugOrId}`
    : `/federations/${orgSlugOrId}/clubs/${projectSlugOrId}`;

  const seasonsBasePath = isTeamRoute
    ? `/federations/${orgSlugOrId}/clubs/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`
    : `/federations/${orgSlugOrId}/clubs/${projectSlugOrId}/seasons`;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      { label: 'Federations', onClick: () => navigate('/federations') },
      { label: org?.name || 'Federation', onClick: () => navigate(`/federations/${orgSlugOrId}`) },
      {
        label: 'Clubs',
        onClick: () => navigate(`/clubs?org_id=${encodeURIComponent(String(orgSlugOrId))}`),
      },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/federations/${orgSlugOrId}/clubs/${clubSlugOrId}`),
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
      { label: season?.name || 'Season', onClick: () => navigate(`${seasonsBasePath}/${effectiveSeasonId}`) },
      { label: competition?.name || 'Competition', current: true },
    ],
    [
      navigate,
      org?.name,
      project?.name,
      club?.name,
      season?.name,
      competition?.name,
      orgSlugOrId,
      seasonsBasePath,
      projectDetailPath,
      effectiveSeasonId,
      isTeamRoute,
      clubSlugOrId,
    ]
  );

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId || !effectiveCompetitionId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, seasonRes, competitionRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/clubs/${projectSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveSeasonId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveCompetitionId}/`, { credentials: 'include' }),
          isTeamRoute
            ? fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/clubs/${clubSlugOrId}/`, {
                credentials: 'include',
              })
            : Promise.resolve(null as any),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');
        if (!seasonRes.ok) throw new Error('Failed to load season');
        if (!competitionRes.ok) throw new Error('Failed to load competition');

        const rawOrg: any = await orgRes.json();
        const rawProject: any = await projectRes.json();
        const rawSeason: any = await seasonRes.json();
        const rawCompetition: any = await competitionRes.json();

        setOrg(rawOrg?.data || rawOrg);
        setProject(rawProject?.data || rawProject);
        setSeason(rawSeason?.data || rawSeason);
        setCompetition(rawCompetition?.data || rawCompetition);

        if (isTeamRoute && clubRes && (clubRes as any).ok) {
          try {
            setClub(await (clubRes as any).json());
          } catch {
            // ignore
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load competition');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId, effectiveSeasonId, effectiveCompetitionId]);

  return (
    <AppShell>
      <div>
        <PageHeader
          title={competition ? competition.name : 'Competition'}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    `${seasonsBasePath}/${effectiveSeasonId}`
                  )
                }
              >
                Back to Season
              </Button>
              <Button
                onClick={() =>
                  navigate(
                    `${seasonsBasePath}/${effectiveSeasonId}/competitions/${effectiveCompetitionId}/matches`
                  )
                }
              >
                Matches
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    `${seasonsBasePath}/${effectiveSeasonId}/competitions/${effectiveCompetitionId}/squad`
                  )
                }
              >
                Squad
              </Button>
            </div>
          }
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          <Tabs value={activeTab} onChange={(v) => setActiveTab(v as any)}>
            <TabList className="mb-6">
              <Tab value="overview">Overview</Tab>
              <Tab value="links">Matches & Squad</Tab>
            </TabList>

            <TabPanel value="overview">
              <Card>
                {loading ? (
                  <div style={{ padding: '16px', color: 'var(--app-text-secondary)' }}>Loading…</div>
                ) : competition ? (
                  <div style={{ padding: '16px', display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant="default">Competition</Badge>
                      <span style={{ color: 'var(--app-text-secondary)' }}>
                        {new Date(competition.start_date).toLocaleDateString()} – {new Date(competition.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--app-text-secondary)' }}>
                      Use the tabs/buttons to drill down into matches and squad.
                    </div>
                  </div>
                ) : null}
              </Card>
            </TabPanel>

            <TabPanel value="links">
              <Card>
                <div style={{ padding: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    onClick={() =>
                      navigate(`${seasonsBasePath}/${effectiveSeasonId}/competitions/${effectiveCompetitionId}/matches`)
                    }
                  >
                    Matches
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(`${seasonsBasePath}/${effectiveSeasonId}/competitions/${effectiveCompetitionId}/squad`)
                    }
                  >
                    Squad
                  </Button>
                </div>
              </Card>
            </TabPanel>
          </Tabs>
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectCompetitionDetailPage;
