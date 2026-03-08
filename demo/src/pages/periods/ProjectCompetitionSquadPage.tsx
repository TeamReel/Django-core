import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import styles from './ProjectCompetitionSquadPage.module.css';

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

  const apiBaseUrl = getApiBaseUrl();

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

  const seasonPathKey = periodPathKey(season) || effectiveSeasonId;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      { label: org?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`),
            },
            { label: project?.name || 'Team', onClick: () => navigate(projectDetailPath) },
          ]
        : [{ label: project?.name || 'Club/Team', onClick: () => navigate(projectDetailPath) }]),
      { label: season?.name || 'Season', onClick: () => navigate(`${seasonsBasePath}/${seasonPathKey}`) },
      {
        label: competition?.name || 'Competition',
        onClick: () =>
          navigate(`${seasonsBasePath}/${seasonPathKey}/competitions/${effectiveCompetitionId}`),
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
      seasonPathKey,
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

        const [orgRes, projectRes, competitionRes, participationRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
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
        if (!competitionRes.ok) throw new Error('Failed to load competition');
        if (!participationRes.ok) throw new Error('Failed to load squad');

        const rawOrg: any = await orgRes.json();
        const rawProject: any = await projectRes.json();
        const rawCompetition: any = await competitionRes.json();

        const projectJson: Project = rawProject?.data?.data || rawProject?.data || rawProject;

        // Resolve season UUID from URL param (UUID or slugified name)
        const periodsRes = await fetch(
          `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(String(projectJson.id))}&page_size=250`,
          { credentials: 'include' }
        );
        if (!periodsRes.ok) throw new Error('Failed to load seasons');
        const rawPeriods: any = await periodsRes.json();
        const periodsData = rawPeriods?.data || rawPeriods;
        const allPeriods: Period[] = Array.isArray(periodsData)
          ? periodsData
          : periodsData?.results || periodsData?.data?.results || periodsData?.data || [];

        const seasonOptions = allPeriods.filter((p: any) => !p.parent_period);
        const isUuidParam = looksLikeUuid(effectiveSeasonId);
        const resolvedSeason = isUuidParam
          ? seasonOptions.find((p: any) => String(p.id) === String(effectiveSeasonId))
          : seasonOptions.find((p: any) => periodPathKey(p) === String(effectiveSeasonId));
        const seasonUuid = String(resolvedSeason?.id || (isUuidParam ? effectiveSeasonId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');

        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, { credentials: 'include' });
        if (!seasonRes.ok) throw new Error('Failed to load season');
        const rawSeason: any = await seasonRes.json();

        setOrg(rawOrg?.data || rawOrg);
        setProject(projectJson);
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
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load squad');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId, effectiveSeasonId, effectiveCompetitionId]);

  return (
    <>
      <div>
        <PageHeader
          title={competition ? `${competition.name} · Squad` : 'Squad'}
          breadcrumbs={breadcrumbs}
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  `${seasonsBasePath}/${seasonPathKey}/competitions/${effectiveCompetitionId}`
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
              <div className={styles.loadingText}>Loading squad…</div>
            ) : members.length === 0 ? (
              <div className={styles.loadingText}>No squad registrations found.</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>Member</th>
                    <th className={styles.thLeft}>Role</th>
                    <th className={styles.thRight}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.memberCell}>
                          <span className={styles.memberName}>{p.member?.user_name || 'Unknown'}</span>
                          <span className={styles.memberEmail}>
                            {p.member?.user_email || ''}
                          </span>
                        </div>
                      </td>
                      <td>{p.role}</td>
                      <td className={styles.tdRight}>
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
    </>
  );
};

export default ProjectCompetitionSquadPage;
