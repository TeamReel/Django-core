import React, { useEffect, useState } from 'react';
import { Card, Badge, Button } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';

interface Match {
  id: string;
  title: string;
  start_time: string;
  project: {
    id: string;
    name: string;
  };
  opponent_project?: {
    name: string;
  };
  metadata: {
     venue?: string;
  };
}

export const UpcomingMatchesWidget: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    // Determine how to filter for "my matches".
    // Ideally: /api/v1/activities/?member=me&activity_type=match&future=true
    // For now, let's fetch matches for the current user's projects if possible,
    // or just fetch general upcoming matches as a placeholder for the "My Matches" feature.
    // Given the current RBAC, we might need to rely on the user context being set.

    const fetchMatches = async () => {
      try {
        setLoading(true);
        // NOTE: The backend needs to support filtering by user participation or membership.
        // As a demo fallback, we'll fetch general matches (permission guarded by backend)
        const response = await fetch(
            `${apiBaseUrl}/api/v1/activities/?activity_type=match&future=true&limit=3`,
            { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
        );

        if (response.ok) {
            const data = await response.json();
            setMatches(data.results || []);
        }
      } catch (err) {
        console.error("Failed to fetch upcoming matches", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [apiBaseUrl]);

  if (loading) return <div>Loading schedule...</div>;
  if (!matches.length) return null; // Don't show if empty

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ color: 'var(--app-text)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
         ⚽ Next Match
      </h3>

      {matches.map(match => {
         const date = new Date(match.start_time);
         const opponent = match.opponent_project?.name || 'Opponent';

         return (
            <div
               key={match.id}
               style={{
                   padding: '16px',
                   backgroundColor: 'var(--app-surface)',
                   borderRadius: '8px',
                   border: '1px solid var(--app-border)',
                   marginBottom: '12px',
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   color: 'var(--app-text)'
               }}
            >
               <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                     {date.toLocaleDateString()} • {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>
                     vs {opponent}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                     {match.metadata.venue || 'Unknown Venue'} • {match.project.name}
                  </div>
               </div>

               <Button size="sm" variant="secondary" onClick={() => navigate(`/matches/${match.id}`)}>
                  Details
               </Button>
            </div>
         );
      })}
    </div>
  );
};
