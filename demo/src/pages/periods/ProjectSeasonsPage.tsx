import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { periodPathKey } from '../../utils/periodPath';
import styles from './ProjectSeasonsPage.module.css';

type Period = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  period_type?: string;
  parent_period?: { id: string; name: string } | string | null;
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

export const ProjectSeasonsPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId, projectId, clubId } = useParams<{ orgId: string; projectId: string; clubId?: string }>();

  const apiBaseUrl = getApiBaseUrl();

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [seasons, setSeasons] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
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
      { label: 'Seasons', current: true },
    ],
    [navigate, org?.name, project?.name, club?.name, orgSlugOrId, projectDetailPath, isTeamRoute, clubSlugOrId]
  );

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          isTeamRoute
            ? fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`, {
                credentials: 'include',
              })
            : Promise.resolve(null as any),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');

        const rawOrg: any = await orgRes.json();
        const rawProject: any = await projectRes.json();

        const orgJson: Organisation = rawOrg?.data?.data || rawOrg?.data || rawOrg;
        const projectJson: Project = rawProject?.data?.data || rawProject?.data || rawProject;

        setOrg(orgJson);
        setProject(projectJson);

        if (isTeamRoute && clubRes && (clubRes as any).ok) {
          try {
            setClub(await (clubRes as any).json());
          } catch {
            // ignore
          }
        }

        const seasonsRes = await fetch(
          `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(String(projectJson.id))}&page_size=250`,
          { credentials: 'include' }
        );
        if (!seasonsRes.ok) throw new Error('Failed to load seasons');
        const rawSeasons: any = await seasonsRes.json();
        const seasonsData = rawSeasons?.data || rawSeasons;
        const allPeriods = Array.isArray(seasonsData)
          ? seasonsData
          : seasonsData?.results || seasonsData?.data?.results || [];
        // Filter client-side for seasons (periods without parent)
        const seasonResults = allPeriods.filter((p: Period) => !p.parent_period);
        setSeasons(seasonResults);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load seasons');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId]);

  return (
    <>
      <div>
        <PageHeader
          title={project ? `${project.name} · Seasons` : 'Seasons'}
          breadcrumbs={breadcrumbs}
          actions={
            <Button
              variant="secondary"
              onClick={() => navigate(projectDetailPath)}
            >
              Back to Project
            </Button>
          }
        />
        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          <Card>
            {loading ? (
              <div className={styles.emptyState}>Loading seasons…</div>
            ) : seasons.length === 0 ? (
              <div className={styles.emptyState}>No seasons found.</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>Season</th>
                    <th className={styles.thLeft}>Dates</th>
                    <th className={styles.thCenter}>Competitions</th>
                    <th className={styles.thRight}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((season) => (
                    <tr key={season.id}>
                      <td className={styles.seasonName}>
                        {season.name}
                        {season.period_type === 'legends' && (
                          <span className={styles.legendsBadge}>
                            Legends
                          </span>
                        )}
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(season.start_date).toLocaleDateString()} – {new Date(season.end_date).toLocaleDateString()}
                      </td>
                      <td className={styles.centerCell}>
                        <Badge variant="default">{season.children_count ?? '—'}</Badge>
                      </td>
                      <td className={styles.rightCell}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            navigate(
                              `${seasonsBasePath}/${periodPathKey(season) || season.id}`
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
    </>
  );
};

export default ProjectSeasonsPage;
