import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';

type Organisation = { id: string; name: string; slug?: string };
type Project = { id: string; name: string; slug?: string };
type Period = { id: string; name: string };

type Participation = {
  id: string;
  role: string;
  status: string;
  member?: {
    id: string;
    user_name?: string;
    user_email?: string;
  };
};

type ListResponse<T> = { results: T[]; count: number };

export const ProjectCompetitionSquadPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId, projectId, seasonId, competitionId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
  }>();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competition, setCompetition] = useState<Period | null>(null);
  const [members, setMembers] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';
  const effectiveCompetitionId = competitionId || '';

  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', onClick: () => navigate('/') },
      { label: 'Organisations', onClick: () => navigate('/organisations') },
      { label: org?.name || 'Organisation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
      { label: 'Projects', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects`) },
      { label: project?.name || 'Project', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`) },
      { label: 'Seasons', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`) },
      { label: season?.name || 'Season', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons/${effectiveSeasonId}`) },
      { label: competition?.name || 'Competition', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons/${effectiveSeasonId}/competitions/${effectiveCompetitionId}`) },
      { label: 'Squad', current: true },
    ],
    [navigate, org?.name, project?.name, season?.name, competition?.name, orgSlugOrId, projectSlugOrId, effectiveSeasonId, effectiveCompetitionId]
  );

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId || !effectiveCompetitionId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, seasonRes, competitionRes, participationRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveSeasonId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveCompetitionId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/participations/?period_id=${encodeURIComponent(effectiveCompetitionId)}&page_size=250`, {
            credentials: 'include',
          }),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');
        if (!seasonRes.ok) throw new Error('Failed to load season');
        if (!competitionRes.ok) throw new Error('Failed to load competition');
        if (!participationRes.ok) throw new Error('Failed to load squad');

        setOrg(await orgRes.json());
        setProject(await projectRes.json());
        setSeason(await seasonRes.json());
        setCompetition(await competitionRes.json());

        const participationJson: ListResponse<Participation> | Participation[] = await participationRes.json();
        const participationResults = Array.isArray(participationJson)
          ? participationJson
          : (participationJson.results || []);
        setMembers(participationResults);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load squad');
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
          title={competition ? `${competition.name} · Squad` : 'Squad'}
          breadcrumbs={breadcrumbs}
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons/${effectiveSeasonId}/competitions/${effectiveCompetitionId}`
                )
              }
            >
              Back to Competition
            </Button>
          }
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          <Card>
            {loading ? (
              <div style={{ padding: '16px', color: 'var(--app-text-secondary)' }}>Loading squad…</div>
            ) : members.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--app-text-secondary)' }}>No squad registrations found.</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Member</th>
                    <th style={{ textAlign: 'left' }}>Role</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'grid' }}>
                          <span style={{ fontWeight: 600 }}>{p.member?.user_name || 'Unknown'}</span>
                          <span style={{ fontSize: '12px', color: 'var(--app-text-secondary)' }}>
                            {p.member?.user_email || ''}
                          </span>
                        </div>
                      </td>
                      <td>{p.role}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Badge variant="default">{p.status}</Badge>
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

export default ProjectCompetitionSquadPage;
