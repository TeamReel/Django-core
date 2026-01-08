import React, { useEffect, useState } from 'react';
import { Badge, Button } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import { useNavigate } from 'react-router-dom';


interface Match {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  project_id: string;
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
  };
}

interface ProjectMatchesProps {
  projectId: string;
  apiBaseUrl?: string;
}

export const ProjectMatches: React.FC<ProjectMatchesProps> = ({
  projectId,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
}) => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Fetch matches (activities filtered by type=match)
    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${apiBaseUrl}/api/v1/activities/?project=${projectId}&activity_type=match&page_size=100`, // Fetch plenty
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }
        );

        if (!response.ok) throw new Error('Failed to fetch matches');

        const data = await response.json();
        const results = data.results || data; // Handle pagination or list

        // Sort by start_time
        const sorted = (results as Match[]).sort((a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        setMatches(sorted);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError('Failed to load match schedule.');
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [projectId, apiBaseUrl]);

  if (isLoading) return <div style={{ padding: '20px', color: '#666' }}>Loading matches...</div>;
  if (error) return <div style={{ padding: '20px', color: '#d32f2f' }}>{error}</div>;

  if (matches.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: '8px',
        border: '1px dashed #ccc'
      }}>
        <p>No matches scheduled for this team yet.</p>
        <Button size="sm">Schedule Match</Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Match Schedule</h3>
        <Badge variant="default" size="sm">{matches.length} Matches</Badge>
      </div>

      <Table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Date</th>
            <th style={{ textAlign: 'left' }}>Competition</th>
            <th style={{ textAlign: 'left' }}>Match</th>
            <th style={{ textAlign: 'center' }}>Score</th>
            <th style={{ textAlign: 'right' }}>Status</th>
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const date = new Date(match.start_time);
            const status = match.metadata.status || 'scheduled';
            const opponentName = match.opponent_project?.name || 'Unknown Opponent';
            const competitionName = match.period?.name || 'League';

            return (
              <tr key={match.id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 500 }}>
                    {date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td>
                   <Badge variant="default" size="sm">{competitionName}</Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontWeight: 600 }}>{match.title}</span>
                     <span style={{ fontSize: '11px', color: '#666' }}>
                        vs {opponentName} • {match.metadata.venue || 'Home'}
                     </span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {status === 'finished'
                    ? `${match.metadata.home_score ?? 0} - ${match.metadata.away_score ?? 0}`
                    : '-'}
                </td>
                <td style={{ textAlign: 'right' }}>
                   <Badge
                     variant={
                       status === 'finished' ? 'success' :
                       status === 'live' ? 'error' :
                       'default'
                     }
                   >
                     {status}
                   </Badge>
                </td>
                <td style={{ textAlign: 'right' }}>
                   <Button size="sm" variant="secondary" onClick={() => navigate(`/matches/${match.id}`)}>View</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};
