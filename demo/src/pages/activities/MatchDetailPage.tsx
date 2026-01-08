import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';

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
}

export const MatchDetailPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

  if (loading) {
    return (
      <AppShell>
        <PageContent>
          <div className="text-center py-8 text-gray-500">Loading match details...</div>
        </PageContent>
      </AppShell>
    );
  }

  if (error || !match) {
    return (
      <AppShell>
         <PageContent>
            <Alert variant="error">{error || 'Match not found'}</Alert>
            <Button variant="default" onClick={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
         </PageContent>
      </AppShell>
    );
  }

  const date = new Date(match.start_time);
  const status = match.metadata.status || 'scheduled';

  // Logic to determine Home vs Away if not explicit in metadata
  // Ideally metadata should have 'is_home' or 'home_team_name' etc.
  // For now, assume Project is Home, Opponent is Away, unless metadata says otherwise.
  const homeTeamName = match.project.name;
  const awayTeamName = match.opponent_project?.name || 'Unknown Opponent';
  const scoreDisplay = status === 'finished'
    ? `${match.metadata.home_score ?? 0} - ${match.metadata.away_score ?? 0}`
    : 'vs';

  return (
    <AppShell>
      <div>
        <PageHeader
          title={match.title}
          breadcrumbs={[
            { label: 'Home', onClick: () => navigate('/') },
            { label: 'Projects', onClick: () => navigate(`/organisations/${match.project.id}/projects`) }, // Fallback link
            { label: match.project.name, onClick: () => navigate(`/organisations/fallback/projects/${match.project.id}`) },
            { label: 'Matches', onClick: () => navigate(-1) },
            { label: 'Details', current: true },
          ]}
          actions={
            <Button onClick={() => navigate(`/studio/create?context=${match.id}`)}>
               ✨ Generate Content (AI)
            </Button>
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
                  <div style={{ marginTop: '12px', color: '#666' }}>
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

            <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px', color: '#666' }}>
              📍 {match.location || match.metadata.venue || 'Unknown Venue'} • 🏆 {match.period?.name || 'League'}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Match Events / Stats Placeholder */}
             <Card title="Match Events">
                <Alert variant="info">Match events (goals, cards, subs) coming soon.</Alert>
             </Card>

             {/* Lineups Placeholder */}
             <Card title="Lineups">
                <Alert variant="info">Lineup management coming in Phase 2.</Alert>
             </Card>
          </div>

        </PageContent>
      </div>
    </AppShell>
  );
};

export default MatchDetailPage;
