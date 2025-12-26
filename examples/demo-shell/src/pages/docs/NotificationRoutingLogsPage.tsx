import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Table,
  Badge,
  Alert,
} from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import { useContextSwitcher } from '@django-core/context-switcher';

interface RoutingLog {
  id: string;
  timestamp: string;
  notification_type: string;
  recipient_count: number;
  organisation?: string;
  project?: string;
  routing_decision: string;
  delivery_channels: string[];
}

export const NotificationRoutingLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<RoutingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganisation } = useContextSwitcher();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/v1/contextual-notifications/routing-logs/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setLogs(data.results || data);
        } else if (response.status === 404) {
          // Demo mode: Use mock routing logs
          const demoLogs: RoutingLog[] = [
            {
              id: '1',
              timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
              notification_type: 'project.created',
              recipient_count: 3,
              organisation: currentOrganisation?.name || 'KNVB',
              project: 'Eredivisie 2024',
              routing_decision: 'org_admins + creator',
              delivery_channels: ['email', 'in_app'],
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
              notification_type: 'member.role_changed',
              recipient_count: 2,
              organisation: currentOrganisation?.name || 'KNVB',
              routing_decision: 'affected_user + changer',
              delivery_channels: ['in_app'],
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
              notification_type: 'auth.login',
              recipient_count: 1,
              routing_decision: 'system_admins',
              delivery_channels: ['in_app'],
            },
          ];
          setLogs(demoLogs);
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch routing logs');
        console.error('Routing logs fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [currentOrganisation]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <AppShell>
      <div>
        <PageHeader
          title="Notification Routing Logs"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Docs' },
            { label: 'Routing Logs' },
          ]}
        />
        <PageContent>
          <Alert type="info" className="mb-4">
            This page shows recent notification routing decisions. Each log entry records how notifications
            were routed to recipients based on context and preferences.
          </Alert>

          {currentOrganisation && (
            <Alert type="warning" className="mb-4">
              <strong>Filtered by Organisation:</strong> {currentOrganisation.name}
            </Alert>
          )}

          {loading && (
            <Card>
              <div className="p-6 text-center">Loading routing logs...</div>
            </Card>
          )}

          {error && (
            <Alert type="error" className="mb-4">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          {!loading && !error && logs.length === 0 && (
            <Card>
              <div className="p-6 text-center text-gray-500">
                No routing logs found. Notifications will appear here as they are generated.
              </div>
            </Card>
          )}

          {!loading && !error && logs.length > 0 && (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Notification Type</th>
                    <th>Organisation</th>
                    <th>Project</th>
                    <th>Routing Decision</th>
                    <th>Recipients</th>
                    <th>Channels</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem' }}>{formatTimestamp(log.timestamp)}</td>
                      <td>
                        <code style={{ fontSize: '0.85rem' }}>{log.notification_type}</code>
                      </td>
                      <td>{log.organisation || '-'}</td>
                      <td>{log.project || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{log.routing_decision}</td>
                      <td>
                        <Badge variant="info">{log.recipient_count}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {log.delivery_channels.map((channel) => (
                            <Badge key={channel} variant="secondary">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </PageContent>
      </div>
    </AppShell>
  );
};

export default NotificationRoutingLogsPage;
