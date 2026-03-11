import React, { useEffect, useState } from 'react';
import { Badge, Button } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import SmartEmptyState from '../../components/SmartEmptyState';
import { logger } from '@/utils/logger';


interface Match {
  id: string;
  slug?: string;
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
}

export const ProjectMatches: React.FC<ProjectMatchesProps> = ({
  projectId,
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
        const data = await api.get<any>(`/activities/?project=${projectId}&activity_type=match&page_size=100`);
        const results = data.results || data; // Handle pagination or list

        // Sort by start_time
        const sorted = (results as Match[]).sort((a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        setMatches(sorted);
        setIsLoading(false);
      } catch (err) {
        logger.error('Error fetching matches', err);
        setError('Failed to load match schedule.');
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [projectId]);

  if (isLoading) return <div className="p-20 text-muted">Loading matches...</div>;
  if (error) return <div className="p-20 text-error">{error}</div>;

  if (matches.length === 0) {
    return (
      <SmartEmptyState
        type="matches"
        description="Er zijn nog geen wedstrijden gepland voor dit team."
      />
    );
  }

  return (
    <div>
      <div className="flex-between mb-16">
        <h3 className="m-0">Match Schedule</h3>
        <Badge variant="default" size="sm">{matches.length} Matches</Badge>
      </div>

      <Table>
        <thead>
          <tr>
            <th className="text-left">Date</th>
            <th className="text-left">Competition</th>
            <th className="text-left">Match</th>
            <th className="text-center">Score</th>
            <th className="text-right">Status</th>
            <th className="text-right">Action</th>
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
                <td className="whitespace-nowrap">
                  <div className="fw-500">
                    {date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="fs-11 text-muted">
                    {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td>
                   <Badge variant="default" size="sm">{competitionName}</Badge>
                </td>
                <td>
                  <div className="flex-col">
                     <span className="fw-600">{match.title}</span>
                     <span className="fs-11 text-muted">
                        vs {opponentName} • {match.metadata.venue || 'Home'}
                     </span>
                  </div>
                </td>
                <td className="text-center fw-700">
                  {status === 'finished'
                    ? `${match.metadata.home_score ?? 0} - ${match.metadata.away_score ?? 0}`
                    : '-'}
                </td>
                <td className="text-right">
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
                 <td className="text-right">
                   <Button size="sm" variant="secondary" onClick={() => navigate(`/matches/${match.slug || match.id}`)}>View</Button>
                 </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};
