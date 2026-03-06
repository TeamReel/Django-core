import React, { useEffect, useState } from 'react';
import { Card, Badge, Button } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/apiBase';
import { formatRelativeTime, getDateUrgency } from '../utils/relativeTime';
import { SkeletonList } from './Skeleton';
import SmartEmptyState from './SmartEmptyState';
import { Zap, Calendar, MapPin, ChevronRight } from 'lucide-react';
import styles from './UpcomingMatchesWidget.module.css';

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
        const now = new Date().toISOString();
        const response = await fetch(
            `${apiBaseUrl}/api/v1/activities/?activity_type=match&start_time__gte=${encodeURIComponent(now)}&ordering=start_time&page_size=5`,
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
          <Calendar size={20} className={styles.iconPrimary} />
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
          <Calendar size={20} className={styles.iconPrimary} />
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
        <Calendar size={20} className={styles.iconPrimary} />
        Wedstrijden
      </h3>

      {matches.map(match => {
         const date = new Date(match.start_time);
         const opponent = match.opponent_project?.name || 'Opponent';
         const relativeTime = formatRelativeTime(date, 'nl');
         const urgency = getDateUrgency(date);

         return (
            <div
               key={match.id}
               onClick={() => navigate(`/matches/${match.slug || match.id}`)}
               className={`p-16 bg-surface rounded-12 border mb-12 flex-between text-primary cursor-pointer ${styles.matchCard}`}
            >
               <div className="flex-1">
                  {/* Relative time badge */}
                  <div className={`fs-12 fw-600 mb-4 ${styles.relativeTime}`} data-urgency={urgency}>
                     {relativeTime}
                  </div>
                  {/* Opponent */}
                  <div className="fs-16 fw-600 mb-4">
                     vs {opponent}
                  </div>
                  {/* Venue & Team */}
                  <div className={`fs-13 flex-row gap-8 ${styles.metaInfo}`}>
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
                   <span className={styles.generateLabel}>
                     Genereer
                   </span>
                 </Button>
                 <ChevronRight size={20} className={styles.iconMuted} />
               </div>
            </div>
         );
      })}
    </div>
  );
};
