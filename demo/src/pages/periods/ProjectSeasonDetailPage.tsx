import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
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
  const { orgId, projectId, seasonId } = useParams<{ orgId: string; projectId: string; seasonId: string }>();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';

  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', onClick: () => navigate('/') },
      { label: 'Organisations', onClick: () => navigate('/organisations') },
      { label: org?.name || 'Organisation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
      { label: 'Projects', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects`) },
      { label: project?.name || 'Project', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`) },
      { label: 'Seasons', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`) },
      { label: season?.name || 'Season', current: true },
    ],
    [navigate, org?.name, project?.name, season?.name, orgSlugOrId, projectSlugOrId]
  );

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, seasonRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveSeasonId}/`, { credentials: 'include' }),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');
        if (!seasonRes.ok) throw new Error('Failed to load season');

        const orgJson: Organisation = await orgRes.json();
        const projectJson: Project = await projectRes.json();
        const seasonJson: Period = await seasonRes.json();
        setOrg(orgJson);
        setProject(projectJson);
        setSeason(seasonJson);

        const competitionsRes = await fetch(
          `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(String(projectJson.id))}&parent_id=${encodeURIComponent(effectiveSeasonId)}&page_size=250`,
          { credentials: 'include' }
        );
        if (!competitionsRes.ok) throw new Error('Failed to load competitions');
        const competitionsJson: ListResponse<Period> | Period[] = await competitionsRes.json();
        const competitionResults = Array.isArray(competitionsJson)
          ? competitionsJson
          : (competitionsJson.results || []);
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
                onClick={() => navigate(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`)}
              >
                Back to Seasons
              </Button>
            </div>
          }
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

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
                        {new Date(competition.start_date).toLocaleDateString()} – {new Date(competition.end_date).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge variant="default">{competition.children_count ?? '—'}</Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            navigate(
                              `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons/${effectiveSeasonId}/competitions/${competition.id}`
                            )
                          }
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
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectSeasonDetailPage;
