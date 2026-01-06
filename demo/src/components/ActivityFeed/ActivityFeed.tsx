import React from 'react';
import { Card, Badge, Button } from '@django-core/design-system';
import { useActivities, Activity } from '../../hooks/useActivities';

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
  title?: string;
}

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const startDate = new Date(activity.start_time);
  const isPast = startDate < new Date();

  // Format date: "Mon, Jan 6 • 14:00"
  const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('league')) return 'primary';  // Blue for League
    if (t.includes('cup')) return 'warning';     // Gold/Orange for Cup
    if (t.includes('training')) return 'success'; // Green for Training
    if (t.includes('meeting')) return 'default';  // Grey for Admin
    if (t.includes('match')) return 'error';      // Fallback Red for generic Match
    return 'info';
  };

  // Clean period name: "League Competition - FC Utrecht" -> "League Competition"
  const cleanPeriodName = activity.period?.name
    ? activity.period.name.split(' - ')[0]
    : '';

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid var(--app-border)',
      opacity: isPast ? 0.7 : 1,
      alignItems: 'flex-start'
    }}>
      {/* Date Box */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '60px',
        padding: '8px',
        backgroundColor: 'var(--app-surface-2)',
        borderRadius: '8px',
        border: '1px solid var(--app-border)',
        fontSize: '12px'
      }}>
        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--app-text)' }}>{startDate.getDate()}</span>
        <span style={{ textTransform: 'uppercase', opacity: 0.8, color: 'var(--app-text)' }}>
          {startDate.toLocaleDateString('en-US', { month: 'short' })}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <Badge variant={getTypeColor(activity.activity_type) || 'default'} size="sm">
            {activity.activity_type}
          </Badge>
          {cleanPeriodName && (
            <span style={{
              fontSize: '11px',
              color: 'var(--app-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}>
              {cleanPeriodName}
            </span>
          )}
        </div>

        <div style={{
          fontWeight: 600,
          fontSize: '15px',
          color: 'var(--app-text)',
          marginBottom: '2px'
        }}>
          {activity.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
          <span>🕒 {timeStr}</span>
          <span>📍 {activity.location}</span>
        </div>
      </div>
    </div>
  );
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projectId,
  limit = 5,
  title = "Recent Activity"
}) => {
  const { activities, loading, error } = useActivities({ limit, project_id: projectId });

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>
          <Button variant="ghost" size="sm">View All</Button>
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
