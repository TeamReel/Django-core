import React, { useState, useEffect } from 'react';

interface AuditEvent {
  id: string;
  action: 'member_added' | 'member_removed' | 'role_changed' | 'invite_sent';
  actor: { name: string; email: string };
  target: { name: string; email: string };
  details: string;
  timestamp: string;
}

interface AuditLogViewerProps {
  projectId: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ projectId }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setEvents([
        {
          id: 'e1',
          action: 'member_added',
          actor: { name: 'Alice Admin', email: 'alice@example.com' },
          target: { name: 'Bob Builder', email: 'bob@example.com' },
          details: 'Added as Editor',
          timestamp: '2023-01-02 10:00:00',
        },
        {
          id: 'e2',
          action: 'role_changed',
          actor: { name: 'Alice Admin', email: 'alice@example.com' },
          target: { name: 'Charlie Checker', email: 'charlie@example.com' },
          details: 'Changed role from Viewer to Editor',
          timestamp: '2023-01-03 14:30:00',
        },
        {
          id: 'e3',
          action: 'member_removed',
          actor: { name: 'Alice Admin', email: 'alice@example.com' },
          target: { name: 'Dave Destroyer', email: 'dave@example.com' },
          details: 'Removed from project',
          timestamp: '2023-01-04 09:15:00',
        },
      ]);
      setLoading(false);
    }, 500);
  }, [projectId]);

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.action === filter);

  if (loading) return <div>Loading activity...</div>;

  return (
    <div className="audit-log-viewer p-20">
      <div className="flex-between mb-20">
        <h3>Project Activity</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-8 rounded-4 border"
        >
          <option value="all">All Events</option>
          <option value="member_added">Member Added</option>
          <option value="member_removed">Member Removed</option>
          <option value="role_changed">Role Changed</option>
        </select>
      </div>

      <div className="rounded-8 overflow-hidden border">
        {filteredEvents.length === 0 ? (
          <div className="p-20 text-center text-muted">No events found.</div>
        ) : (
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead className="bg-surface-2">
              <tr className="text-left">
                <th className="border-bottom" style={{ padding: '10px 8px' }}>Action</th>
                <th className="border-bottom" style={{ padding: '10px 8px' }}>User</th>
                <th className="hide-mobile border-bottom" style={{ padding: '10px 8px' }}>Details</th>
                <th className="hide-mobile border-bottom" style={{ padding: '10px 8px' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-bottom">
                  <td style={{ padding: '10px 8px' }}>
                    <span className="rounded-4 fs-11" style={{
                      padding: '2px 6px',
                      backgroundColor: event.action === 'member_removed' ? '#ffebee' : '#e3f2fd',
                      color: event.action === 'member_removed' ? '#c62828' : '#1565c0'
                    }}>
                      {event.action.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="fs-13" style={{ padding: '10px 8px' }}>
                    <div>{event.actor.name}</div>
                  </td>
                  <td className="hide-mobile fs-13" style={{ padding: '10px 8px' }}>
                    <div>{event.details}</div>
                    <div className="fs-11 text-muted">Target: {event.target.name}</div>
                  </td>
                  <td className="hide-mobile fs-12 text-muted" style={{ padding: '10px 8px' }}>
                    {event.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
