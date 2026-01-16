import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';

type Organisation = { id: string; name: string; slug?: string };
type Project = { id: string; name: string; slug?: string };
type Period = { id: string; name: string };

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

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

        const [orgRes, projectRes, competitionRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/periods/${effectiveCompetitionId}/`, { credentials: 'include' }),
          isTeamRoute
            ? fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/`, {
                credentials: 'include',
              })
            : Promise.resolve(null as any),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');
        if (!competitionRes.ok) throw new Error('Failed to load competition');

        const rawOrg: any = await orgRes.json();
        const rawProject: any = await projectRes.json();
        const rawCompetition: any = await competitionRes.json();

        const orgJson: Organisation = rawOrg?.data || rawOrg;
        const projectJson: Project = rawProject?.data || rawProject;
        const competitionJson: Period = rawCompetition?.data || rawCompetition;
        setOrg(orgJson);
        setProject(projectJson);
        setCompetition(competitionJson);

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
        const seasonJson: Period = rawSeason?.data || rawSeason;
        setSeason(seasonJson);

        if (isTeamRoute && clubRes && (clubRes as any).ok) {
          try {
            setClub(await (clubRes as any).json());
          } catch {
            // ignore
          }
        }

        const matchesRes = await fetch(
          `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(String(projectJson.id))}&period_id=${encodeURIComponent(effectiveCompetitionId)}&activity_type=match&page_size=250`,
          { credentials: 'include' }
        );
        if (!matchesRes.ok) throw new Error('Failed to load matches');

        const rawMatches: any = await matchesRes.json();
        const matchesData = rawMatches?.data || rawMatches;
        const matchResults = Array.isArray(matchesData)
          ? matchesData
          : matchesData?.results || matchesData?.data?.results || [];
        setMatches(matchResults);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matches');
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
              <div style={{ padding: '16px', color: 'var(--app-text-secondary)' }}>Loading matches…</div>
            ) : matches.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--app-text-secondary)' }}>No matches found.</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Date</th>
                    <th style={{ textAlign: 'left' }}>Match</th>
                    <th style={{ textAlign: 'center' }}>Score</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
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
                          <td style={{ whiteSpace: 'nowrap' }}>{date.toLocaleString()}</td>
                          <td>
                            <div style={{ display: 'grid' }}>
                              <span style={{ fontWeight: 600 }}>{match.title}</span>
                              <span style={{ fontSize: '12px', color: 'var(--app-text-secondary)' }}>
                                vs {match.opponent_project?.name || 'Unknown Opponent'}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {status === 'finished'
                              ? `${match.metadata.home_score ?? 0} - ${match.metadata.away_score ?? 0}`
                              : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Badge
                              variant={
                                status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'
                              }
                            >
                              {status}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                navigate(
                                  `/matches/${(match as any).slug || match.id}`
                                )
                              }
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
    </AppShell>
  );
};

export default ProjectCompetitionMatchesPage;
