import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { api } from '@/api';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import styles from './ProjectCompetitionSquadPage.module.css';
import { logger } from '@/utils/logger';

type Organisation = { id: string; name: string; slug?: string };
type Project = { id: string; name: string; slug?: string };
type Period = { id: string; name: string; parent_period?: any };

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

        const [orgJson, projectJson, competitionJson, participationRes, clubJson] = await Promise.all([
          api.get<any>(`/organisations/${orgSlugOrId}/`),
          api.get<any>(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`),
          api.get<any>(`/periods/${effectiveCompetitionId}/`),
          api.list<Participation>('/participations/', {
            params: { period_id: effectiveCompetitionId },
            pageSize: 250,
          }),
          isTeamRoute
            ? api.get<Project>(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`).catch(() => null)
            : Promise.resolve(null),
        ]);

        const projectJsonData: Project = projectJson;

        // Resolve season UUID from URL param (UUID or slugified name)
        const { results: allPeriods } = await api.list<Period>('/periods/', {
          params: { project_id: String(projectJsonData.id) },
          pageSize: 250,
        });

        const seasonOptions = allPeriods.filter((p) => !p.parent_period);
        const isUuidParam = looksLikeUuid(effectiveSeasonId);
        const resolvedSeason = isUuidParam
          ? seasonOptions.find((p) => String(p.id) === String(effectiveSeasonId))
          : seasonOptions.find((p) => periodPathKey(p) === String(effectiveSeasonId));
        const seasonUuid = String(resolvedSeason?.id || (isUuidParam ? effectiveSeasonId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');

        const seasonJson = await api.get<Period>(`/periods/${encodeURIComponent(seasonUuid)}/`);

        setOrg(orgJson);
        setProject(projectJsonData);
        setSeason(seasonJson);
        setCompetition(competitionJson);

        if (isTeamRoute && clubJson) {
          setClub(clubJson);
        }

        setMembers(participationRes.results);
      } catch (e) {
        logger.error('Failed to load squad', e);
        setError(e instanceof Error ? e.message : 'Failed to load squad');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orgSlugOrId, projectSlugOrId, effectiveSeasonId, effectiveCompetitionId]);

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
