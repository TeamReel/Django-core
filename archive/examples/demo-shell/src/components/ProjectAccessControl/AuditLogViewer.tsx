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
    <div className="audit-log-viewer" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Project Activity</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="all">All Events</option>
          <option value="member_added">Member Added</option>
          <option value="member_removed">Member Removed</option>
          <option value="role_changed">Role Changed</option>
        </select>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No events found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9f9f9' }}>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Action</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>User</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Details</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85em',
                      backgroundColor: event.action === 'member_removed' ? '#ffebee' : '#e3f2fd',
                      color: event.action === 'member_removed' ? '#c62828' : '#1565c0'
                    }}>
                      {event.action.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>{event.actor.name}</div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>{event.actor.email}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>{event.details}</div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>Target: {event.target.name}</div>
                  </td>
                  <td style={{ padding: '12px', color: '#666', fontSize: '0.9em' }}>
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
