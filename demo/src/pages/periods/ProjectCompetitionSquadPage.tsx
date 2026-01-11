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
  const [members, setMembers] = useState<Participation[]>([]);
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
      { label: 'Federations', onClick: () => navigate('/federations') },
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
      { label: season?.name || 'Season', onClick: () => navigate(`${seasonsBasePath}/${effectiveSeasonId}`) },
      {
        label: competition?.name || 'Competition',
        onClick: () =>
          navigate(`${seasonsBasePath}/${effectiveSeasonId}/competitions/${effectiveCompetitionId}`),
      },
      { label: 'Squad', current: true },
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
      effectiveCompetitionId,
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

        const [orgRes, projectRes, seasonRes, competitionRes, participationRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveSeasonId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveCompetitionId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/participations/?period_id=${encodeURIComponent(effectiveCompetitionId)}&page_size=250`, {
            credentials: 'include',
          }),
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
        if (!participationRes.ok) throw new Error('Failed to load squad');

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

        const rawParticipation: any = await participationRes.json();
        const participationData = rawParticipation?.data || rawParticipation;
        const participationResults = Array.isArray(participationData)
          ? participationData
          : participationData?.results || participationData?.data?.results || [];
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
                  `${seasonsBasePath}/${effectiveSeasonId}/competitions/${effectiveCompetitionId}`
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
