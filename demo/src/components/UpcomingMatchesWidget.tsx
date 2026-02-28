import React, { useEffect, useState } from 'react';
import { Card, Badge, Button } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/apiBase';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import { SkeletonList } from './Skeleton';
import SmartEmptyState from './SmartEmptyState';
import { Zap, Calendar, MapPin, ChevronRight } from 'lucide-react';

interface Match {
  id: string;
  title: string;
  start_time: string;
  slug?: string;
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

  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
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

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          color: 'var(--app-text)',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
          Wedstrijden
        </h3>
        <SkeletonList count={2} variant="card" />
      </div>
    );
  }

  // Smart empty state
  if (!matches.length) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          color: 'var(--app-text)',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
          Wedstrijden
        </h3>
        <SmartEmptyState
          type="matches"
          title="Geen komende wedstrijden"
          description="Voeg een wedstrijd toe om content te genereren."
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{
        color: 'var(--app-text)',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
        Wedstrijden
      </h3>

      {matches.map(match => {
         const date = new Date(match.start_time);
         const opponent = match.opponent_project?.name || 'Opponent';
         const relativeTime = formatRelativeTime(date, 'nl');
         const urgency = getDateUrgency(date);

         const urgencyColors: Record<string, string> = {
           urgent: 'var(--color-error, #ef4444)',
           soon: 'var(--color-warning, #f59e0b)',
           upcoming: 'var(--color-success, #22c55e)',
           future: 'var(--color-text-muted)',
           past: 'var(--color-text-muted)',
         };

         return (
            <div
               key={match.id}
               onClick={() => navigate(`/matches/${match.slug || match.id}`)}
               style={{
                   padding: '16px',
                   backgroundColor: 'var(--app-surface)',
                   borderRadius: '12px',
                   border: '1px solid var(--app-border)',
                   marginBottom: '12px',
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   color: 'var(--app-text)',
                   cursor: 'pointer',
                   transition: 'transform 0.15s ease, box-shadow 0.15s ease',
               }}
               onMouseEnter={e => {
                 (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                 (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
               }}
               onMouseLeave={e => {
                 (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                 (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
               }}
            >
               <div style={{ flex: 1 }}>
                  {/* Relative time badge */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: urgencyColors[urgency],
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                     {relativeTime}
                  </div>
                  {/* Opponent */}
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                     vs {opponent}
                  </div>
                  {/* Venue & Team */}
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--app-muted-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {match.metadata.venue && (
                      <>
                        <MapPin size={12} />
                        {match.metadata.venue}
                        <span style={{ opacity: 0.5 }}>•</span>
                      </>
                    )}
                    {match.project.name}
                  </div>
               </div>

               {/* Quick generate button */}
               <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <Button
                   size="sm"
                   variant="primary"
                   onClick={(e) => {
                     e.stopPropagation();
                     navigate(`/matches/${match.slug || match.id}?tab=content`);
                   }}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     padding: '8px 12px'
                   }}
                 >
                   <Zap size={14} />
                   <span style={{ display: 'none', '@media (min-width: 640px)': { display: 'inline' } } as any}>
                     Genereer
                   </span>
                 </Button>
                 <ChevronRight size={20} style={{ color: 'var(--app-muted-text)' }} />
               </div>
            </div>
         );
      })}
    </div>
  );
};
