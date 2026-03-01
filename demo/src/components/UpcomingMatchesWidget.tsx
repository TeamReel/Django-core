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
      <div className="mb-24">
        <h3 className="text-primary fs-18 flex-row gap-8 mb-16">
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
      <div className="mb-24">
        <h3 className="text-primary fs-18 flex-row gap-8 mb-16">
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
    <div className="mb-24">
      <h3 className="text-primary fs-18 flex-row gap-8 mb-16">
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
               className="p-16 bg-surface rounded-12 border mb-12 flex-between text-primary cursor-pointer"
               style={{
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
               <div className="flex-1">
                  {/* Relative time badge */}
                  <div className="fs-12 fw-600 mb-4" style={{
                    color: urgencyColors[urgency],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                     {relativeTime}
                  </div>
                  {/* Opponent */}
                  <div className="fs-16 fw-600 mb-4">
                     vs {opponent}
                  </div>
                  {/* Venue & Team */}
                  <div className="fs-13 flex-row gap-8" style={{
                    color: 'var(--app-muted-text)',
                  }}>
                    {match.metadata.venue && (
                      <>
                        <MapPin size={12} />
                        {match.metadata.venue}
                        <span className="opacity-50">•</span>
                      </>
                    )}
                    {match.project.name}
                  </div>
               </div>

               {/* Quick generate button */}
               <div className="flex-row gap-8">
                 <Button
                   size="sm"
                   variant="primary"
                   onClick={(e) => {
                     e.stopPropagation();
                     navigate(`/matches/${match.slug || match.id}?tab=content`);
                   }}
                   className="flex-row gap-4 py-8 px-12"
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
