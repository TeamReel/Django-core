import React, { useState, useEffect } from 'react';

interface AuditEvent {
  id: string;
  action: string;
  actor: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  target: string; // JSON string or object description
  remote_ip: string;
  timestamp: string;
  resource_type: string;
}

interface AuditLogTableProps {
  organisationId?: string;
  projectId?: string;
  limit?: number;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  organisationId,
  projectId,
  limit = 20
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAuditData() {
      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

        const params = new URLSearchParams();
        if (limit) params.append('limit', String(limit));
        if (organisationId) params.append('organisation', organisationId);
        // Note: Backend might use 'project_id' or 'project' depending on viewset implementation
        // Adjusting based on DRF standard filtering usually being the field name
        if (projectId) params.append('project', projectId);

        // Ensure ordering by newest first
        params.append('ordering', '-timestamp');

        const response = await fetch(`${apiBaseUrl}/api/v1/audit/?${params.toString()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch audit log: ${response.status}`);
        }

        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        setEvents(results);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching audit log:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (organisationId || projectId) {
      fetchAuditData();
    }
  }, [organisationId, projectId, limit]);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading audit logs...</div>;
  if (error) return <div style={{ color: 'var(--app-error)', padding: '20px' }}>Error: {error}</div>;

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--app-border)', borderRadius: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead style={{ backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)' }}>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ padding: '12px', borderBottom: '1px solid var(--app-border)' }}>Time</th>
            <th style={{ padding: '12px', borderBottom: '1px solid var(--app-border)' }}>Actor</th>
            <th style={{ padding: '12px', borderBottom: '1px solid var(--app-border)' }}>Action</th>
            <th style={{ padding: '12px', borderBottom: '1px solid var(--app-border)' }}>Resource</th>
            <th style={{ padding: '12px', borderBottom: '1px solid var(--app-border)' }}>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--app-text-muted)' }}>
                No audit events found.
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr key={event.id} style={{ borderBottom: '1px solid var(--app-border)', color: 'var(--app-text)' }}>
                <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '12px' }}>
                  {event.actor?.email || 'System'}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--app-surface-2)',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    {event.action.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                   {event.resource_type}
                   {/* Could expand "target" JSON here if needed */}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {event.remote_ip}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
