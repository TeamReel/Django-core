import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Table,
  Badge,
  Alert,
  Button,
} from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import { useContextSwitcher } from '@django-core/context-switcher';

interface UsageEvent {
  id: string;
  timestamp: string;
  event_type: string;
  resource_type: string;
  resource_id?: string;
  quantity: number;
  unit: string;
  organisation?: string;
  project?: string;
  user?: string;
}

export const UsageEventsPage: React.FC = () => {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { currentOrganisation, currentProject } = useContextSwitcher();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/usage-events/', {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.results || data);
      } else if (response.status === 404) {
        // Demo mode: Use mock usage events
        const demoEvents: UsageEvent[] = [
          {
            id: '1',
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            event_type: 'api.request',
            resource_type: 'api_call',
            quantity: 10,
            unit: 'requests',
            organisation: currentOrganisation?.name || 'KNVB',
            project: currentProject?.name || 'Eredivisie 2024',
            user: 'admin@example.com',
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            event_type: 'storage.write',
            resource_type: 'file_storage',
            quantity: 50,
            unit: 'MB',
            organisation: currentOrganisation?.name || 'KNVB',
            user: 'coach@example.com',
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            event_type: 'compute.execution',
            resource_type: 'background_task',
            quantity: 5,
            unit: 'minutes',
            organisation: currentOrganisation?.name || 'KNVB',
            project: currentProject?.name || 'Eredivisie 2024',
          },
        ];
        setEvents(demoEvents);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage events');
      console.error('Usage events fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentOrganisation, currentProject]);

  const handleGenerateTestEvent = async () => {
    if (!currentOrganisation) {
      setError('Please select an organisation first');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const testEvent = {
        event_type: 'demo.test_event',
        resource_type: 'demo_action',
        quantity: Math.floor(Math.random() * 100) + 1,
        unit: 'credits',
        organisation_id: currentOrganisation.id,
        project_id: currentProject?.id,
      };

      const response = await fetch('/api/v1/usage-events/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify(testEvent),
      });

      if (response.ok || response.status === 404) {
        // Demo mode: Add to local state
        const newEvent: UsageEvent = {
          id: `demo-${Date.now()}`,
          timestamp: new Date().toISOString(),
          ...testEvent,
          organisation: currentOrganisation.name,
          project: currentProject?.name,
          user: 'current_user',
        };
        setEvents([newEvent, ...events]);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        throw new Error(`Failed to create usage event: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test event');
    } finally {
      setGenerating(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <AppShell>
      <div>
        <PageHeader
          title="Usage Events"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Configuration' },
            { label: 'Usage Events' },
          ]}
        />
        <PageContent>
          <Alert type="info" className="mb-4">
            Usage events track resource consumption across your organisation and projects.
            These events affect credit balance and billing calculations.
          </Alert>

          {currentOrganisation && (
            <Alert type="warning" className="mb-4">
              <strong>Filtered by Organisation:</strong> {currentOrganisation.name}
              {currentProject && ` / Project: ${currentProject.name}`}
            </Alert>
          )}

          {success && (
            <Alert type="success" className="mb-4">
              Test usage event generated successfully!
            </Alert>
          )}

          {error && (
            <Alert type="error" className="mb-4">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          <Card className="mb-4">
            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Button
                onClick={handleGenerateTestEvent}
                disabled={generating || !currentOrganisation}
                variant="primary"
              >
                {generating ? 'Generating...' : '🧪 Generate Test Usage Event'}
              </Button>
              <span style={{ fontSize: '0.875rem', color: 'var(--app-muted-text)' }}>
                Demo action: Creates a random usage event in the current context
              </span>
            </div>
          </Card>

          {loading && (
            <Card>
              <div className="p-6 text-center">Loading usage events...</div>
            </Card>
          )}

          {!loading && events.length === 0 && (
            <Card>
              <div className="p-6 text-center text-gray-500">
                No usage events recorded yet. Generate a test event to see how they appear.
              </div>
            </Card>
          )}

          {!loading && events.length > 0 && (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Resource</th>
                    <th>Quantity</th>
                    <th>Organisation</th>
                    <th>Project</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td style={{ fontSize: '0.85rem' }}>{formatTimestamp(event.timestamp)}</td>
                      <td>
                        <code style={{ fontSize: '0.85rem' }}>{event.event_type}</code>
                      </td>
                      <td>
                        <Badge variant="secondary">{event.resource_type}</Badge>
                      </td>
                      <td>
                        <strong>{event.quantity}</strong> {event.unit}
                      </td>
                      <td>{event.organisation || '-'}</td>
                      <td>{event.project || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{event.user || '-'}</td>
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

export default UsageEventsPage;
