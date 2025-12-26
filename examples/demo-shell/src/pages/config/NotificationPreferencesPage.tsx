import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Button,
  Alert,
  Table,
  Badge,
} from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import { useContextSwitcher } from '@django-core/context-switcher';

interface NotificationPreference {
  id?: string;
  notification_type: string;
  channel: 'email' | 'sms' | 'in_app' | 'push';
  enabled: boolean;
  organisation?: string;
  project?: string;
}

export const NotificationPreferencesPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { currentOrganisation } = useContextSwitcher();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/v1/contextual-notifications/preferences/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setPreferences(data.results || data);
        } else if (response.status === 404) {
          // Demo mode: Use default preferences
          const defaultPrefs: NotificationPreference[] = [
            { id: '1', notification_type: 'project.created', channel: 'email', enabled: true },
            { id: '2', notification_type: 'project.created', channel: 'in_app', enabled: true },
            { id: '3', notification_type: 'member.role_changed', channel: 'email', enabled: true },
            { id: '4', notification_type: 'member.role_changed', channel: 'in_app', enabled: true },
            { id: '5', notification_type: 'auth.login', channel: 'in_app', enabled: false },
          ];
          setPreferences(defaultPrefs);
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
        console.error('Preferences fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleToggle = async (index: number) => {
    const pref = preferences[index];
    const newEnabled = !pref.enabled;

    // Optimistic update
    const newPreferences = [...preferences];
    newPreferences[index] = { ...pref, enabled: newEnabled };
    setPreferences(newPreferences);

    try {
      setSaving(true);
      setError(null);

      if (pref.id) {
        // Update existing preference
        const response = await fetch(`/api/v1/contextual-notifications/preferences/${pref.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ enabled: newEnabled }),
        });

        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to update preference: ${response.status}`);
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.notification_type]) {
      acc[pref.notification_type] = [];
    }
    acc[pref.notification_type].push(pref);
    return acc;
  }, {} as Record<string, NotificationPreference[]>);

  return (
    <AppShell>
      <div>
        <PageHeader
          title="Notification Preferences"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Configuration' },
            { label: 'Notification Preferences' },
          ]}
        />
        <PageContent>
          <Alert type="info" className="mb-4">
            Configure which notification channels you want to receive for different event types.
            Changes are saved automatically.
          </Alert>

          {currentOrganisation && (
            <Alert type="warning" className="mb-4">
              <strong>Current Context:</strong> {currentOrganisation.name}
            </Alert>
          )}

          {success && (
            <Alert type="success" className="mb-4">
              Preferences saved successfully!
            </Alert>
          )}

          {error && (
            <Alert type="error" className="mb-4">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          {loading && (
            <Card>
              <div className="p-6 text-center">Loading preferences...</div>
            </Card>
          )}

          {!loading && Object.keys(groupedPreferences).length === 0 && (
            <Card>
              <div className="p-6 text-center text-gray-500">
                No preferences configured yet.
              </div>
            </Card>
          )}

          {!loading && Object.keys(groupedPreferences).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(groupedPreferences).map(([notificationType, prefs]) => (
                <Card key={notificationType}>
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', fontWeight: 600 }}>
                      <code>{notificationType}</code>
                    </h3>
                    <Table>
                      <thead>
                        <tr>
                          <th>Channel</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prefs.map((pref, index) => {
                          const globalIndex = preferences.indexOf(pref);
                          return (
                            <tr key={pref.id || index}>
                              <td>
                                <Badge variant="secondary">{pref.channel}</Badge>
                              </td>
                              <td>
                                <Badge variant={pref.enabled ? 'success' : 'default'}>
                                  {pref.enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                              </td>
                              <td>
                                <Button
                                  onClick={() => handleToggle(globalIndex)}
                                  variant={pref.enabled ? 'secondary' : 'primary'}
                                  size="sm"
                                  disabled={saving}
                                >
                                  {pref.enabled ? 'Disable' : 'Enable'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </PageContent>
      </div>
    </AppShell>
  );
};

export default NotificationPreferencesPage;
