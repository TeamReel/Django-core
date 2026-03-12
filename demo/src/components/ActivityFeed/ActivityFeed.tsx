import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '@django-core/design-system';
import { useActivities, Activity } from '../../hooks/useActivities';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { SkeletonList } from '../Skeleton';
import { routes } from '../../routes';
import styles from './ActivityFeed.module.css';

interface ActivityFeedProps {
  projectId?: string;
  organisationId?: string;
  limit?: number;
  title?: string;
}

type ActivityFilter = 'all' | 'league' | 'cup';

const ActivityItem: React.FC<{ activity: Activity; onClick?: () => void }> = ({ activity, onClick }) => {
  const startDate = new Date(activity.start_time);
  const isPast = startDate < new Date();
  const relativeTime = formatRelativeTime(startDate, 'nl');
  const urgency = getDateUrgency(startDate);

  // Urgency color for relative time badge
  const urgencyColor = urgency === 'urgent' ? 'var(--color-red-500)' :
                       urgency === 'soon' ? 'var(--color-amber-400)' :
                       urgency === 'upcoming' ? 'var(--color-blue-500)' :
                       'var(--app-text-muted)';

  // Format date: "Mon, Jan 6 • 14:00"
  const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('league')) return 'primary';  // Blue for League Match
    if (t.includes('cup')) return 'warning';     // Gold/Orange for Cup Match
    if (t.includes('training')) return 'success'; // Green for Training
    if (t.includes('meeting')) return 'default';  // Grey for Admin
    if (t.includes('match')) return 'error';      // Fallback Red for generic Match
    return 'info';
  };

  // Clean period name: "League Competition - FC Utrecht" -> "League Competition"
  const cleanPeriodName = activity.period?.name
    ? activity.period.name.replace(/ - .*/, '') // Remove " - Team Name"
    : '';

  // Build full match title with team context
  const teamName = activity.project.name; // e.g., "Ajax Amsterdam"
  let displayTitle = activity.title;
  let isAway = false;

  // Parse and format title with team name
  if (displayTitle.startsWith('vs ')) {
    // Home game: "vs FC Utrecht" -> "Ajax Amsterdam vs FC Utrecht"
    const opponent = displayTitle.substring(3);
    displayTitle = `${teamName} vs ${opponent}`;
    isAway = false;
  } else if (displayTitle.startsWith('@ ')) {
    // Away game: "@ FC Utrecht" -> "Ajax Amsterdam @ FC Utrecht"
    const opponent = displayTitle.substring(2);
    displayTitle = `${teamName} @ ${opponent}`;
    isAway = true;
  } else {
    // Fallback: keep original title
    displayTitle = activity.title;
  }

  return (
    <div
      onClick={onClick}
      className={`flex-row gap-12 py-12 px-8 border-bottom rounded-8 ${styles.activityItem}`}
      data-past={isPast}
      data-clickable={Boolean(onClick)}
    >
      {/* Date Box */}
      <div className={`flex-center flex-col p-4 bg-surface-2 rounded-8 border fs-12 ${styles.dateBox}`}>
        <span className={`fw-700 fs-16 text-primary ${styles.dateNumber}`}>{startDate.getDate()}</span>
        <span className={`fw-600 opacity-80 text-primary ${styles.dateMonth}`}>
          {startDate.toLocaleDateString('en-US', { month: 'short' })}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex-row gap-8 mb-4">
          <Badge variant={getTypeColor(activity.activity_type) || 'default'} size="sm">
            {activity.activity_type}
          </Badge>
          {cleanPeriodName && (
            <span className={`text-muted fw-600 truncate ${styles.periodName}`}>
              {cleanPeriodName}
            </span>
          )}
        </div>

        <div className={`fw-600 fs-14 text-primary truncate ${styles.activityTitle}`}>
          {displayTitle}
        </div>

        <div className="flex-row gap-12 fs-11 text-muted">
          <span className={`flex-row gap-4 fw-600 ${styles.urgencyTime}`} style={{ '--urgency-color': urgencyColor } as React.CSSProperties}>
            {relativeTime}
          </span>
          <span className="flex-row gap-4">
            <span></span> {timeStr}
          </span>
          {activity.location && (
             <span className={`flex-row gap-4 overflow-hidden ${styles.locationText}`}>
               <span></span> {activity.location}
             </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projectId,
  organisationId,
  limit = 10,
  title = "Recent Activity"
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  // Fetch more items than limit to account for filtering
  const { activities: allActivities, loading, error } = useActivities({
    limit: 200, // Fetch more to have enough after filtering (increased for demo data range)
    project_id: projectId,
    organisation_id: organisationId
  });

  // Filter activities by type
  const activities = useMemo(() => {
    let filtered = allActivities;

    if (filter === 'league') {
      filtered = allActivities.filter(a =>
         a.activity_type.toLowerCase().includes('match') &&
         (a.period?.name?.toLowerCase().includes('league') || a.period?.name?.toLowerCase().includes('competitie') || a.period?.name?.toLowerCase().includes('divisie'))
      );
    } else if (filter === 'cup') {
      filtered = allActivities.filter(a =>
        a.activity_type.toLowerCase().includes('match') &&
        (a.period?.name?.toLowerCase().includes('cup') || a.period?.name?.toLowerCase().includes('beker'))
      );
    }

    // Apply limit after filtering
    return filtered.slice(0, limit);
  }, [allActivities, filter, limit]);

  if (loading) {
    return (
      <Card>
        <div className="p-16">
          <h3 className="m-0 mb-16 fs-18">{title}</h3>
          <SkeletonList count={4} variant="row" gap={8} />
        </div>
      </Card>
    );
  }

  if (error) {
    // Fail silently/gracefully in demo if backend not ready
    return null;
  }

  return (
    <Card>
      <div className="p-16">
        <div className="flex-between mb-16 flex-wrap gap-12">
          <h3 className="m-0 fs-18">{title}</h3>

          {/* Filter Buttons */}
          <div className="flex-row gap-8">
            <button
              onClick={() => setFilter('all')}
              className={`fs-12 fw-600 border rounded-4 cursor-pointer ${styles.filterBtn}`}
              data-variant="all"
              data-active={filter === 'all'}
            >
              All
            </button>
            <button
              onClick={() => setFilter('league')}
              className={`fs-12 fw-600 border rounded-4 cursor-pointer ${styles.filterBtn}`}
              data-variant="league"
              data-active={filter === 'league'}
            >
              ⚽ League
            </button>
            <button
              onClick={() => setFilter('cup')}
              className={`fs-12 fw-600 border rounded-4 cursor-pointer ${styles.filterBtn}`}
              data-variant="cup"
              data-active={filter === 'cup'}
            >
              🏆 Cup
            </button>
          </div>
        </div>

        <div>
          {activities.length === 0 ? (
            <div className={`opacity-50 py-24 ${styles.emptyMessage}`}>
              No activities found for this filter.
            </div>
          ) : (
            activities.map(activity => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onClick={() => {
                  // Navigate to search for this match, since we don't have match_id
                  // TODO: Link directly to match when activity has match_id
                  const searchQuery = activity.title.replace(/^(vs |@ )/, '');
                  navigate(routes.search({ q: searchQuery }));
                }}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
};
