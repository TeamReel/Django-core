import React, { useState, useMemo } from 'react';
import { Card, Badge, Button } from '@django-core/design-system';
import { useActivities, Activity } from '../../hooks/useActivities';

interface ActivityFeedProps {
  projectId?: string;
  organisationId?: string;
  limit?: number;
  title?: string;
}

type ActivityFilter = 'all' | 'league' | 'cup';

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const startDate = new Date(activity.start_time);
  const isPast = startDate < new Date();

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
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid var(--app-border)',
      opacity: isPast ? 0.6 : 1,
      alignItems: 'center'
    }}>
      {/* Date Box */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '50px',
        height: '50px',
        padding: '4px',
        backgroundColor: 'var(--app-surface-2)',
        borderRadius: '8px',
        border: '1px solid var(--app-border)',
        fontSize: '12px'
      }}>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--app-text)', lineHeight: 1 }}>{startDate.getDate()}</span>
        <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 600, opacity: 0.8, color: 'var(--app-text)' }}>
          {startDate.toLocaleDateString('en-US', { month: 'short' })}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Badge variant={getTypeColor(activity.activity_type) || 'default'} size="sm">
            {activity.activity_type}
          </Badge>
          {cleanPeriodName && (
            <span style={{
              fontSize: '10px',
              color: 'var(--app-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {cleanPeriodName}
            </span>
          )}
        </div>

        <div style={{
          fontWeight: 600,
          fontSize: '14px',
          color: 'var(--app-text)',
          marginBottom: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {displayTitle}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--app-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🕒</span> {timeStr}
          </span>
          {activity.location && (
             <span style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               <span>📍</span> {activity.location}
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
  const [filter, setFilter] = useState<ActivityFilter>('all');

  // Fetch more items than limit to account for filtering
  const { activities: allActivities, loading, error } = useActivities({
    limit: 50, // Fetch more to have enough after filtering
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
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>{title}</h3>
          <div style={{ opacity: 0.5 }}>Loading activities...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    // Fail silently/gracefully in demo if backend not ready
    return null;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>{title}</h3>
          <div style={{ opacity: 0.5, fontStyle: 'italic' }}>No upcoming activities found.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>

          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--app-border)',
                borderRadius: '4px',
                backgroundColor: filter === 'all' ? 'var(--app-primary)' : 'var(--app-surface-2)',
                color: filter === 'all' ? 'white' : 'var(--app-text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilter('league')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--app-border)',
                borderRadius: '4px',
                backgroundColor: filter === 'league' ? '#3b82f6' : 'var(--app-surface-2)',
                color: filter === 'league' ? 'white' : 'var(--app-text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ⚽ League
            </button>
            <button
              onClick={() => setFilter('cup')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--app-border)',
                borderRadius: '4px',
                backgroundColor: filter === 'cup' ? '#f59e0b' : 'var(--app-surface-2)',
                color: filter === 'cup' ? 'white' : 'var(--app-text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🏆 Cup
            </button>
          </div>
        </div>

        <div>
          {activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </Card>
  );
};
