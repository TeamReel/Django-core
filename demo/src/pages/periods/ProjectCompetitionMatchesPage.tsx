import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { api } from '@/api';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import styles from './ProjectCompetitionMatchesPage.module.css';
import { logger } from '@/utils/logger';

type Organisation = { id: string; name: string; slug?: string };
type Project = { id: string; name: string; slug?: string };
type Period = { id: string; name: string; parent_period?: any };

type Match = {
  id: string;
  title: string;
  start_time: string;
  project: { id: string; name: string };
  opponent_project?: { id: string; name: string };
  period?: { id: string; name: string };
  metadata: {
    home_score?: number;
    away_score?: number;
    venue?: string;
    status?: 'scheduled' | 'live' | 'finished' | 'cancelled';
  };
};

type ListResponse<T> = { results: T[]; count: number };

export const ProjectCompetitionMatchesPage: React.FC = () => {
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgSlugOrId = orgId || '';
  const projectSlugOrId = projectId || '';
  const effectiveSeasonId = seasonId || '';
  const effectiveCompetitionId = competitionId || '';

  const isTeamRoute = Boolean(clubId);
  const clubSlugOrId = clubId || '';

  const projectDetailPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

  const seasonsBasePath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;

  const seasonPathKey = periodPathKey(season) || effectiveSeasonId;
  const competitionPathKey = periodPathKey(competition) || effectiveCompetitionId;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      { label: org?.name || 'Federation', onClick: () => navigate(`/${orgSlugOrId}`) },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/${orgSlugOrId}/${clubSlugOrId}`),
            },
            { label: project?.name || 'Team', onClick: () => navigate(projectDetailPath) },
          ]
        : [{ label: project?.name || 'Club/Team', onClick: () => navigate(projectDetailPath) }]),
      { label: season?.name || 'Season', onClick: () => navigate(`${seasonsBasePath}/${seasonPathKey}`) },
      {
        label: competition?.name || 'Competition',
        onClick: () =>
          navigate(
            isTeamRoute
              ? `${seasonsBasePath}/${seasonPathKey}/${competitionPathKey}`
              : `${seasonsBasePath}/${seasonPathKey}/competitions/${effectiveCompetitionId}`
          ),
      },
      { label: 'Matches', current: true },
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
      competitionPathKey,
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

        const [orgJson, projectJson, competitionJson, clubJson] = await Promise.all([
          api.get<Organisation>(`/organisations/${orgSlugOrId}/`),
          api.get<Project>(`/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`),
          api.get<Period>(`/periods/${effectiveCompetitionId}/`),
          isTeamRoute
            ? api.get<Project>(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`).catch(() => null)
            : Promise.resolve(null),
        ]);

        setOrg(orgJson);
        setProject(projectJson);
        setCompetition(competitionJson);

        // Resolve season UUID from URL param (UUID or slugified name)
        const { results: allPeriods } = await api.list<Period>('/periods/', {
          params: { project_id: String(projectJson.id) },
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
        setSeason(seasonJson);

        if (isTeamRoute && clubJson) {
          setClub(clubJson);
        }

        const { results: matchResults } = await api.list<Match>('/activities/', {
          params: {
            project_id: String(projectJson.id),
            period_id: effectiveCompetitionId,
            activity_type: 'match',
          },
          pageSize: 250,
        });
        setMatches(matchResults);
      } catch (e) {
        logger.error('Failed to load matches', e);
        setError(e instanceof Error ? e.message : 'Failed to load matches');
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
          title={competition ? `${competition.name} · Matches` : 'Matches'}
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
              <div className={styles.emptyState}>Loading matches…</div>
            ) : matches.length === 0 ? (
              <div className={styles.emptyState}>No matches found.</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>Date</th>
                    <th className={styles.thLeft}>Match</th>
                    <th className={styles.thCenter}>Score</th>
                    <th className={styles.thRight}>Status</th>
                    <th className={styles.thRight}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches
                    .slice()
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    .map((match) => {
                      const date = new Date(match.start_time);
                      const status = match.metadata.status || 'scheduled';
                      return (
                        <tr key={match.id}>
                          <td className={styles.dateCell}>{date.toLocaleString()}</td>
                          <td>
                            <div className={styles.matchInfo}>
                              <span className={styles.matchTitle}>{match.title}</span>
                              <span className={styles.matchOpponent}>
                                vs {match.opponent_project?.name || 'Unknown Opponent'}
                              </span>
                            </div>
                          </td>
                          <td className={styles.scoreCell}>
                            {status === 'finished'
                              ? `${match.metadata.home_score ?? 0} - ${match.metadata.away_score ?? 0}`
                              : '—'}
                          </td>
                          <td className={styles.statusCell}>
                            <Badge
                              variant={
                                status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'
                              }
                            >
                              {status}
                            </Badge>
                          </td>
                          <td className={styles.actionCell}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const matchKeyOrId = String((match as any).slug || match.id || '').trim();
                                if (!matchKeyOrId) return;

                                if (isTeamRoute && orgSlugOrId && clubSlugOrId && projectSlugOrId && seasonPathKey && competitionPathKey) {
                                  navigate(
                                    `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonPathKey}/${competitionPathKey}/${matchKeyOrId}`
                                  );
                                  return;
                                }

                                navigate(`/matches/${matchKeyOrId}`);
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </Table>
            )}
          </Card>
        </PageContent>
      </div>
    </>
  );
};

export default ProjectCompetitionMatchesPage;
