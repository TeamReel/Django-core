import React, { useState, useEffect } from 'react';
import styles from './AuditLogViewer.module.css';

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
          <table className={`w-full ${styles.auditTable}`}>
            <thead className="bg-surface-2">
              <tr className="text-left">
                <th className={`border-bottom ${styles.tableCell}`}>Action</th>
                <th className={`border-bottom ${styles.tableCell}`}>User</th>
                <th className={`hide-mobile border-bottom ${styles.tableCell}`}>Details</th>
                <th className={`hide-mobile border-bottom ${styles.tableCell}`}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-bottom">
                  <td className={styles.tableCell}>
                    <span className={`rounded-4 fs-11 ${styles.actionBadge}`} data-action={event.action}>
                      {event.action.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className={`fs-13 ${styles.tableCell}`}>
                    <div>{event.actor.name}</div>
                  </td>
                  <td className={`hide-mobile fs-13 ${styles.tableCell}`}>
                    <div>{event.details}</div>
                    <div className="fs-11 text-muted">Target: {event.target.name}</div>
                  </td>
                  <td className={`hide-mobile fs-12 text-muted ${styles.tableCell}`}>
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
