import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';
  const effectiveCompetitionId = competitionId || '';

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
      { label: 'Clubs & Teams', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects`) },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`),
            },
            { label: 'Teams' },
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
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveSeasonId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveCompetitionId}/`, { credentials: 'include' }),
          isTeamRoute
            ? fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`, {
                credentials: 'include',
              })
            : Promise.resolve(null as any),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');
        if (!seasonRes.ok) throw new Error('Failed to load season');
        if (!competitionRes.ok) throw new Error('Failed to load competition');

        setOrg(await orgRes.json());
        setProject(await projectRes.json());
        setSeason(await seasonRes.json());
        setCompetition(await competitionRes.json());

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
                  Use the buttons above to view matches and squad for this competition.
                </div>
              </div>
            ) : null}
          </Card>
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectCompetitionDetailPage;
