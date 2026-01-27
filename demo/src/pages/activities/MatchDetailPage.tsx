import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';

interface Participation {
  id: string;
  member: {
    id: string;
    user_name: string;
  };
  role: string;
  status: string;
  data: {
    side?: 'home' | 'away';
    jersey_number?: number;
    position?: string;
    is_captain?: boolean;
    team_name?: string;
    team_id?: string;
  };
}

interface ActivityEvent {
  id: string;
  event_type: string; // goal, card_yellow, substitution, etc.
  minute?: number;
  team_project?: {
    id: string;
    name: string;
  };
  member?: {
    id: string;
    user_name: string;
  };
  related_member?: {
    id: string;
    user_name: string;
  };
  data?: any;
}

interface MatchDetail {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  activity_type: string;
  project: {
    id: string;
    name: string;
  };
  opponent_project?: {
    id: string;
    name: string;
  };
  period?: {
    id: string;
    name: string;
  };
  metadata: {
    home_score?: number;
    away_score?: number;
    round?: number | string;
    venue?: string;
    status?: 'scheduled' | 'live' | 'finished' | 'cancelled';
    [key: string]: any;
  };
  participations?: Participation[];
  events?: ActivityEvent[];
}

export const MatchDetailPage: React.FC = () => {
  const { matchId, federationSlugOrId, projectSlugOrId } = useParams<{ matchId: string; federationSlugOrId?: string; projectSlugOrId?: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [competitionPeriod, setCompetitionPeriod] = useState<any | null>(null);
  const [seasonPeriod, setSeasonPeriod] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Load active context on mount
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        console.error('Failed to load active context:', e);
      }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}/api/v1/activities/${matchId}/`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
           if (response.status === 404) throw new Error('Match not found');
           throw new Error('Failed to fetch match details');
        }

        const data = await response.json();
        setMatch(data);
      } catch (err) {
        console.error('Error fetching match:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId, apiBaseUrl]);

  useEffect(() => {
    const fetchPeriodHierarchy = async () => {
      try {
        setCompetitionPeriod(null);
        setSeasonPeriod(null);

        const competitionId = match?.period?.id;
        if (!competitionId) return;

        const competitionRes = await fetch(`${apiBaseUrl}/api/v1/periods/${competitionId}/`, {
          credentials: 'include',
        });
        if (!competitionRes.ok) return;
        const competition = await competitionRes.json();
        setCompetitionPeriod(competition);

        const seasonId = competition?.parent_period?.id;
        if (!seasonId) return;
        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${seasonId}/`, {
          credentials: 'include',
        });
        if (!seasonRes.ok) return;
        const season = await seasonRes.json();
        setSeasonPeriod(season);
      } catch {
        // Best-effort only (breadcrumbs should not break the page)
      }
    };

    if (match) fetchPeriodHierarchy();
  }, [apiBaseUrl, match]);

  if (loading) {
    return (
      <div className="p-6">
        <PageContent>
          <div className="text-center py-8 text-gray-500">Loading match details...</div>
        </PageContent>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="p-6">
         <PageContent>
            <Alert variant="error">{error || 'Match not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
         </PageContent>
      </div>
    );
  }

  const homeTeamName = match.project.name;
  const awayTeamName = match.opponent_project?.name || 'Opponent';
  const scoreDisplay = `${match.metadata?.home_score ?? 0} - ${match.metadata?.away_score ?? 0}`;
  const status = match.metadata?.status || 'scheduled';
  const date = new Date(match.start_time);

  const homeParticipations = match.participations?.filter(p => p.data?.side === 'home' || String(p.data?.team_id) === String(match.project.id));
  const awayParticipations = match.participations?.filter(p => p.data?.side === 'away' || (match.opponent_project && String(p.data?.team_id) === String(match.opponent_project.id)));

  const sortLineup = (a: Participation, b: Participation) => {
    // Starters first
    const isStarterA = a.role === 'starter';
    const isStarterB = b.role === 'starter';
    if (isStarterA && !isStarterB) return -1;
    if (!isStarterA && isStarterB) return 1;

    // GK first among starters
    if (isStarterA) {
      if (a.data?.position === 'GK') return -1;
      if (b.data?.position === 'GK') return 1;
    }

    return (a.data?.jersey_number || 99) - (b.data?.jersey_number || 99);
  };

  homeParticipations?.sort(sortLineup);
  awayParticipations?.sort(sortLineup);

  const matchEvents = match.events || [];
  matchEvents.sort((a, b) => (a.minute || 0) - (b.minute || 0));

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
            <tr key={p.id} className={p.role !== 'starter' ? 'bg-gray-50' : ''}>
              <td className="font-mono text-sm">{p.data?.jersey_number || '-'}</td>
              <td>
                <div className="font-medium">
                  {p.member?.user_name || 'Unknown Player'}
                  {p.data?.is_captain && <span className="ml-2 text-yellow-500" title="Captain">©</span>}
                </div>
                {p.role !== 'starter' && <div className="text-xs text-gray-500 capitalize">{p.role.replace('_', ' ')}</div>}
              </td>
              <td className="text-xs font-bold text-gray-400">{p.data?.position}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );

  const renderEventIcon = (type: string) => {
    switch(type) {
      case 'goal': return '⚽';
      case 'card_yellow': return '🟨';
      case 'card_red': return '🟥';
      case 'substitution': return 'cS'; // 🔄 glyph issue sometimes
      case 'injury': return '🚑';
      default: return '•';
    }
  };

  return (
    <>
      <div>
        <PageHeader
          title={match.title}
          breadcrumbs={([
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            federationSlugOrId
              ? {
                  label: competitionPeriod.organisation?.name || 'Federation',
                  onClick: () => navigate(`/organisations/${federationSlugOrId}`),
                }
              : { label: 'Federation' },
            federationSlugOrId
              ? {
                  label: match.project.name,
                  onClick: () =>
                    navigate(`/organisations/${federationSlugOrId}/projects/${projectSlugOrId}`),
                }
              : { label: match.project.name, onClick: () => navigate('/clubs') },
            seasonPeriod && federationSlugOrId
              ? {
                  label: seasonPeriod.name,
                  onClick: () =>
                    navigate(
                      `/organisations/${federationSlugOrId}/projects/${projectSlugOrId}/seasons/${periodPathKey(seasonPeriod) || seasonPeriod.id}`
                    ),
                }
              : seasonPeriod
                ? { label: seasonPeriod.name }
                : null,
            competitionPeriod && seasonPeriod && federationSlugOrId
              ? {
                  label: competitionPeriod.name,
                  onClick: () =>
                    navigate(
                      `/organisations/${federationSlugOrId}/projects/${projectSlugOrId}/seasons/${periodPathKey(seasonPeriod) || seasonPeriod.id}/competitions/${competitionPeriod.id}`
                    ),
                }
              : competitionPeriod
                ? { label: competitionPeriod.name }
                : null,
            { label: match.title || 'Match', current: true },
          ].filter(Boolean) as any[])}
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {(() => {
                const isActive = match && activeContext?.match?.id === match.id;
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    onClick={async () => {
                      if (isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('match', String(match.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || isActive}
                    title="Set this match as your active context"
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      fontWeight: isActive ? 600 : undefined,
                      opacity: activatingContext || isActive ? 0.8 : 1,
                    }}
                  >
                    {isActive ? '✓ Active Context' : 'Make active'}
                  </Button>
                );
              })()}
              <Button onClick={() => navigate(`/studio/create?context=${match.id}`)}>
                ✨ Generate Content (AI)
              </Button>
            </div>
          }
        />

        <PageContent>
          {/* Scoreboard Card */}
          <Card className="mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0' }}>

               {/* Home Team */}
               <div style={{ flex: 1, textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{homeTeamName}</h3>
                  <Badge variant="default">Home</Badge>
               </div>

               {/* Score / Time */}
               <div style={{ textAlign: 'center', minWidth: '150px' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{scoreDisplay}</div>
                  <div style={{ marginTop: '12px', color: 'var(--app-text-secondary)' }}>
                     <Badge variant={status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'}>
                       {status.toUpperCase()}
                     </Badge>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                    {date.toLocaleDateString()} • {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
               </div>

               {/* Away Team */}
               <div style={{ flex: 1, textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{awayTeamName}</h3>
                  <Badge variant="default">Away</Badge>
               </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid var(--app-border)', paddingTop: '10px', color: 'var(--app-text-secondary)' }}>
              📍 {match.location || match.metadata.venue || 'Unknown Venue'} • 🏆 {match.period?.name || 'League'}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Match Events */}
             <div className="md:col-span-1">
               <Card title="Match Events">
                  {matchEvents.length === 0 ? (
                    <div className="text-gray-500 text-sm italic">No events recorded.</div>
                  ) : (
                    <div className="space-y-3">
                      {matchEvents.map(evt => {
                         const isHome = String(evt.team_project?.id) === String(match.project.id);
                         return (
                           <div key={evt.id} className="flex items-center text-sm">
                             <div className="font-mono font-bold w-8 text-right mr-3 text-gray-400">{evt.minute}'</div>
                             <div className={`flex-1 flex items-center ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                                <span className="text-xl mx-2" title={evt.event_type}>{renderEventIcon(evt.event_type)}</span>
                                <div>
                                   <div className="font-medium">{evt.member?.user_name || 'Unknown'}</div>
                                   {evt.related_member && <div className="text-xs text-gray-500">({evt.related_member.user_name})</div>}
                                   {evt.event_type === 'substitution' && evt.related_member && (
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
             </div>

             {/* Lineups */}
             <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title={`Lineup: ${homeTeamName}`}>
                   {renderLineup(homeParticipations)}
                </Card>
                <Card title={`Lineup: ${awayTeamName}`}>
                   {renderLineup(awayParticipations)}
                </Card>
             </div>
          </div>

        </PageContent>
      </div>
    </>
  );
};

export default MatchDetailPage;
