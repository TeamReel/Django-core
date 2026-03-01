import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';

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
        const apiBaseUrl = getApiBaseUrl();

        const params = new URLSearchParams();
        if (limit) params.append('limit', String(limit));
        if (organisationId) params.append('organisation', organisationId);
        // Note: Backend might use 'project_id' or 'project' depending on viewset implementation
        // Adjusting based on DRF standard filtering usually being the field name
        if (projectId) params.append('project', projectId);

        // Ensure ordering by newest first
        params.append('ordering', '-timestamp');

        const response = await fetch(`${apiBaseUrl}/api/v1/activity/?${params.toString()}`, {
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

  if (loading) return <div className="p-20 text-center">Loading audit logs...</div>;
  if (error) return <div className="text-error p-20">Error: {error}</div>;

  return (
    <div className="overflow-x-auto border rounded-8">
      <table className="w-full fs-14" style={{ borderCollapse: 'collapse' }}>
        <thead className="bg-surface-2 text-primary">
          <tr className="text-left">
            <th className="border-bottom" style={{ padding: '10px 8px' }}>Time</th>
            <th className="border-bottom" style={{ padding: '10px 8px' }}>Action</th>
            <th className="hide-mobile border-bottom" style={{ padding: '10px 8px' }}>Actor</th>
            <th className="hide-mobile border-bottom" style={{ padding: '10px 8px' }}>Resource</th>
            <th className="hide-mobile hide-tablet border-bottom" style={{ padding: '10px 8px' }}>IP</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-20 text-center text-muted">
                No audit events found.
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr key={event.id} className="border-bottom text-primary">
                <td className="whitespace-nowrap fs-12" style={{ padding: '10px 8px' }}>
                  {new Date(event.timestamp).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <span className="rounded-12 bg-surface-2 fs-11 fw-500" style={{ padding: '2px 6px' }}>
                    {event.action.toUpperCase()}
                  </span>
                </td>
                <td className="hide-mobile fs-13" style={{ padding: '10px 8px' }}>
                  {event.actor?.email || 'System'}
                </td>
                <td className="hide-mobile fs-13" style={{ padding: '10px 8px' }}>
                   {event.resource_type}
                </td>
                <td className="hide-mobile hide-tablet fs-12" style={{ padding: '10px 8px', fontFamily: 'monospace' }}>
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
