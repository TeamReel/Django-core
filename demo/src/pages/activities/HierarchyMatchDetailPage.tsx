import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';

type Organisation = { id: string; name: string; slug?: string };
type Project = { id: string; name: string; slug?: string };

type Participation = {
  id: string;
  member?: { id: string; user_name?: string };
  role?: string;
  status?: string;
  data?: {
    side?: 'home' | 'away';
    jersey_number?: number;
    position?: string;
    is_captain?: boolean;
    team_name?: string;
    team_id?: string;
  };
};

type ActivityEvent = {
  id: string;
  event_type: string;
  minute?: number;
  team_project?: { id: string; name: string };
  member?: { id: string; user_name?: string };
  related_member?: { id: string; user_name?: string };
  data?: any;
};

type MatchDetail = {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  activity_type?: string;
  project: { id: string; name: string; slug?: string };
  opponent_project?: { id: string; name: string; slug?: string };
  period?: { id: string; name: string; parent_period?: { id: string; name: string } | null };
  metadata?: Record<string, any>;
  participations?: Participation[];
  events?: ActivityEvent[];
};

type Period = {
  id: string;
  name: string;
  parent_period?: { id: string; name: string } | null;
};

const getEnvelopeData = <T,>(raw: any): T => {
  return (raw?.data ?? raw) as T;
};

export default function HierarchyMatchDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { orgId, projectId, seasonId, competitionId, matchId, clubId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
    clubId?: string;
  }>();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [competition, setCompetition] = useState<Period | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTeamRoute = Boolean(clubId);
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const effectiveCompetitionId = String(competitionId || '').trim();
  const effectiveMatchId = String(matchId || '').trim();

  const seasonsBasePath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'hierarchy', 'match', 'lineup', 'date']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  const navigateToTab = (tabId: string) => {
    const base = `${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}/matches/${effectiveMatchId}`;
    if (tabId === 'overview') {
      navigate(base);
      return;
    }
    navigate(`${base}?tab=${encodeURIComponent(tabId)}`);
  };

  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId || !seasonKeyOrId || !effectiveCompetitionId || !effectiveMatchId) return;
      try {
        setLoading(true);
        setError(null);

        const [orgRes, projectRes, clubRes, competitionRes, matchRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, { credentials: 'include' }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(projectSlugOrId)}/`,
            { credentials: 'include' }
          ),
          isTeamRoute
            ? fetch(
                `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
                { credentials: 'include' }
              )
            : Promise.resolve(null as any),
          fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(effectiveCompetitionId)}/`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(effectiveMatchId)}/`, { credentials: 'include' }),
        ]);

        if (orgRes.ok) setOrg(getEnvelopeData(await orgRes.json()));
        if (projectRes.ok) setProject(getEnvelopeData(await projectRes.json()));
        if (isTeamRoute && clubRes?.ok) setClub(getEnvelopeData(await clubRes.json()));

        if (!competitionRes.ok) throw new Error('Failed to load competition');
        const competitionJson = getEnvelopeData<Period>(await competitionRes.json());
        setCompetition(competitionJson);

        // Best-effort season lookup via competition parent.
        const seasonUuid = String(competitionJson?.parent_period?.id || '').trim();
        if (seasonUuid) {
          const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, {
            credentials: 'include',
          });
          if (seasonRes.ok) setSeason(getEnvelopeData(await seasonRes.json()));
        }

        if (!matchRes.ok) throw new Error(matchRes.status === 404 ? 'Match not found' : 'Failed to load match');
        setMatch(getEnvelopeData(await matchRes.json()));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    apiBaseUrl,
    orgSlugOrId,
    projectSlugOrId,
    clubSlugOrId,
    isTeamRoute,
    seasonKeyOrId,
    effectiveCompetitionId,
    effectiveMatchId,
  ]);

  const breadcrumbs = useMemo(() => {
    const projectDetailPath = isTeamRoute
      ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}`
      : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

    return [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      { label: 'Federations', onClick: () => navigate('/directory?tab=federations') },
      { label: org?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
      {
        label: 'Clubs',
        onClick: () => navigate(`/directory?tab=clubs&org_id=${encodeURIComponent(String(orgSlugOrId))}`),
      },
      ...(isTeamRoute
        ? [
            {
              label: club?.name || 'Club',
              onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`),
            },
            { label: 'Teams', onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`) },
            { label: project?.name || 'Team', onClick: () => navigate(projectDetailPath) },
          ]
        : [{ label: project?.name || 'Club/Team', onClick: () => navigate(projectDetailPath) }]),
      { label: 'Seasons', onClick: () => navigate(seasonsBasePath) },
      {
        label: season?.name || 'Season',
        onClick: () => navigate(`${seasonsBasePath}/${seasonKeyOrId}`),
      },
      {
        label: competition?.name || 'Competition',
        onClick: () => navigate(`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}`),
      },
      {
        label: 'Matches',
        onClick: () =>
          navigate(`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}?tab=matches`),
      },
      { label: match?.title || 'Match', current: true },
    ] as any[];
  }, [
    club,
    clubSlugOrId,
    competition?.name,
    effectiveCompetitionId,
    isTeamRoute,
    match?.title,
    navigate,
    org?.name,
    orgSlugOrId,
    project?.name,
    projectSlugOrId,
    season?.name,
    seasonKeyOrId,
    seasonsBasePath,
  ]);

  if (loading) {
    return (
      <AppShell>
        <PageContent>
          <div className="text-center py-8 text-gray-500">Loading match…</div>
        </PageContent>
      </AppShell>
    );
  }

  if (error || !match) {
    return (
      <AppShell>
        <PageContent>
          <Alert variant="error">{error || 'Match not found'}</Alert>
          <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </PageContent>
      </AppShell>
    );
  }

  const date = match.start_time ? new Date(match.start_time) : null;
  const status = String(match.metadata?.status || 'scheduled');

  const homeTeamName = match.project?.name || 'Home';
  const awayTeamName = match.opponent_project?.name || 'Opponent';
  const scoreDisplay = status === 'finished'
    ? `${match.metadata?.home_score ?? 0} - ${match.metadata?.away_score ?? 0}`
    : 'vs';

  const sortLineup = (a: Participation, b: Participation) => {
    const isStarterA = String(a.role || '').toLowerCase() === 'starter';
    const isStarterB = String(b.role || '').toLowerCase() === 'starter';
    if (isStarterA && !isStarterB) return -1;
    if (!isStarterA && isStarterB) return 1;

    if (isStarterA) {
      if (a.data?.position === 'GK') return -1;
      if (b.data?.position === 'GK') return 1;
    }

    return (a.data?.jersey_number || 99) - (b.data?.jersey_number || 99);
  };

  const allParticipations = match.participations || [];
  const homeParticipations = allParticipations
    .filter(
      (p) => p.data?.side === 'home' || String(p.data?.team_id || '') === String(match.project?.id || '')
    )
    .sort(sortLineup);
  const awayParticipations = allParticipations
    .filter(
      (p) =>
        p.data?.side === 'away' ||
        (match.opponent_project && String(p.data?.team_id || '') === String(match.opponent_project.id))
    )
    .sort(sortLineup);

  const matchEvents = (match.events || []).slice().sort((a, b) => (a.minute || 0) - (b.minute || 0));

  const renderLineup = (participations: Participation[] = []) => (
    <Table>
      <thead>
        <tr>
          <th className="w-12">#</th>
          <th>Name</th>
          <th className="w-16">Pos</th>
        </tr>
      </thead>
      <tbody>
        {participations.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-gray-500 text-center py-4">
              No lineup available
            </td>
          </tr>
        ) : (
          participations.map((p) => (
            <tr key={p.id} className={String(p.role || '').toLowerCase() !== 'starter' ? 'bg-gray-50' : ''}>
              <td className="font-mono text-sm">{p.data?.jersey_number || '-'}</td>
              <td>
                <div className="font-medium">
                  {p.member?.user_name || 'Unknown Player'}
                  {p.data?.is_captain && (
                    <span className="ml-2 text-yellow-500" title="Captain">
                      ©
                    </span>
                  )}
                </div>
                {String(p.role || '').toLowerCase() !== 'starter' && p.role && (
                  <div className="text-xs text-gray-500 capitalize">{p.role.replace('_', ' ')}</div>
                )}
              </td>
              <td className="text-xs font-bold text-gray-400">{p.data?.position}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );

  const renderEventIcon = (type: string) => {
    switch (String(type || '').toLowerCase()) {
      case 'goal':
        return '⚽';
      case 'card_yellow':
        return '🟨';
      case 'card_red':
        return '🟥';
      case 'substitution':
        return 'cS'; // 🔄 glyph issue sometimes
      case 'injury':
        return '🚑';
      default:
        return '•';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'match', label: 'Match' },
    { id: 'lineup', label: 'Lineup' },
    { id: 'date', label: 'Date' },
  ];

  return (
    <AppShell>
      <div>
        <PageHeader
          title={match.title}
          breadcrumbs={breadcrumbs}
          actions={
            <Button onClick={() => navigate(`/studio/create?context=${match.id}`)}>
              ✨ Generate Content (AI)
            </Button>
          }
        />

        <PageContent>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              borderBottom: '1px solid var(--app-border)',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px 6px 0 0',
                  border: '1px solid var(--app-border)',
                  borderBottom: activeTab === tab.id ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
                  backgroundColor: activeTab === tab.id ? 'var(--app-surface)' : 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              <Card className="mb-6">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                  }}
                >
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{homeTeamName}</h3>
                    <Badge variant="default">Home</Badge>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: '150px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{scoreDisplay}</div>
                    <div style={{ marginTop: '12px', color: 'var(--app-text-secondary)' }}>
                      <Badge variant={status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'}>
                        {status.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                      {date ? `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}
                    </div>
                  </div>

                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{awayTeamName}</h3>
                    <Badge variant="default">Away</Badge>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '20px',
                    borderTop: '1px solid var(--app-border)',
                    paddingTop: '10px',
                    color: 'var(--app-text-secondary)',
                  }}
                >
                  📍 {match.location || match.metadata?.venue || 'Unknown Venue'} • 🏆 {competition?.name || match.period?.name || 'Competition'}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Match Events">
                  {matchEvents.length === 0 ? (
                    <div className="text-gray-500 text-sm italic">No events recorded.</div>
                  ) : (
                    <div className="space-y-3">
                      {matchEvents.map((evt) => {
                        const isHome = String(evt.team_project?.id || '') === String(match.project?.id || '');
                        return (
                          <div key={evt.id} className="flex items-center text-sm">
                            <div className="font-mono font-bold w-8 text-right mr-3 text-gray-400">{evt.minute}'</div>
                            <div className={`flex-1 flex items-center ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                              <span className="text-xl mx-2" title={evt.event_type}>
                                {renderEventIcon(evt.event_type)}
                              </span>
                              <div>
                                <div className="font-medium">{evt.member?.user_name || 'Unknown'}</div>
                                {evt.related_member && (
                                  <div className="text-xs text-gray-500">({evt.related_member.user_name})</div>
                                )}
                                {String(evt.event_type || '').toLowerCase() === 'substitution' && evt.related_member && (
                                  <div className="text-xs text-green-600">IN: {evt.related_member.user_name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card title="Lineups">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{homeTeamName}</div>
                      {renderLineup(homeParticipations)}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{awayTeamName}</div>
                      {renderLineup(awayParticipations)}
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'hierarchy' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <div style={{ color: 'var(--app-muted-text)', fontSize: '13px', marginBottom: '10px' }}>
                  Navigate the hierarchy around this match.
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`${seasonsBasePath}/${seasonKeyOrId}`)}>
                    Season
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}`)}
                  >
                    Competition
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}?tab=matches`)}
                  >
                    Matches
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'match' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Match Details</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <tbody>
                      <tr>
                        <th style={{ textAlign: 'left', width: '180px' }}>Title</th>
                        <td>{match.title}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Home</th>
                        <td>{homeTeamName}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Away</th>
                        <td>{awayTeamName}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Status</th>
                        <td>{status}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Venue</th>
                        <td>{match.location || match.metadata?.venue || '—'}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Competition</th>
                        <td>
                          {competition ? (
                            <Link
                              to={`${seasonsBasePath}/${seasonKeyOrId}/competitions/${effectiveCompetitionId}`}
                              className="text-blue-600 hover:underline"
                              style={{ textDecoration: 'none' }}
                            >
                              {competition.name}
                            </Link>
                          ) : (
                            match.period?.name || '—'
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <details>
                    <summary style={{ cursor: 'pointer', color: 'var(--app-muted-text)' }}>Raw metadata</summary>
                    <pre
                      style={{
                        marginTop: '10px',
                        background: 'var(--app-surface-2)',
                        padding: '12px',
                        borderRadius: '6px',
                        overflowX: 'auto',
                        fontSize: '12px',
                      }}
                    >
                      {JSON.stringify(match.metadata || {}, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'lineup' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card title={`Lineup: ${homeTeamName}`}>{renderLineup(homeParticipations)}</Card>
                  <Card title={`Lineup: ${awayTeamName}`}>{renderLineup(awayParticipations)}</Card>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'date' && (
            <Card>
              <div style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Date & Time</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <tbody>
                      <tr>
                        <th style={{ textAlign: 'left', width: '180px' }}>Start</th>
                        <td>{match.start_time ? new Date(match.start_time).toLocaleString() : '—'}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>End</th>
                        <td>{match.end_time ? new Date(match.end_time).toLocaleString() : '—'}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Round</th>
                        <td>{String(match.metadata?.round ?? '—')}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </div>
            </Card>
          )}
        </PageContent>
      </div>
    </AppShell>
  );
}
