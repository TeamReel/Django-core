import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from '../components/PermissionGuards';

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

interface Notification {
  id: string;
  type: {
    code: string;
    name: string;
  };
  payload: {
    title: string;
    body: string;
  };
  metadata: any;
  status: string;
  created_at: string;
  read_at: string | null;
}

interface NotificationPreference {
  id: number;
  event_type: string;
  channel: 'in_app' | 'email' | 'push';
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

interface BalancePolicy {
  id?: number | null;
  organization_id?: string;
  project_id?: number | null;
  allow_negative: boolean;
  warn_threshold: string | null;
  enforcement_mode: string;
}

interface OrganisationNotificationPolicy {
  id?: number | null;
  organisation?: string;
  organisation_name?: string;
  policy_type?: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string | null;
  quiet_hours_rate_limit: number | null;
}

const isUuid = (value: string | null | undefined) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value)));

export default function NotificationsPage() {
  const { context } = useContextSwitcher();
  const { isSystemAdmin, isLandAdmin, isOrgAdmin } = useUserRole();
  const canManageOrgSettings = isSystemAdmin || isLandAdmin || isOrgAdmin;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'inbox' | 'settings'>('inbox');

  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const [newPrefEventType, setNewPrefEventType] = useState('');
  const [newPrefChannel, setNewPrefChannel] = useState<'in_app' | 'email' | 'push'>('in_app');
  const [newPrefEnabled, setNewPrefEnabled] = useState(false);

  const [orgBalancePolicy, setOrgBalancePolicy] = useState<BalancePolicy | null>(null);
  const [orgNotifPolicy, setOrgNotifPolicy] = useState<OrganisationNotificationPolicy | null>(null);
  const [orgPolicyLoading, setOrgPolicyLoading] = useState(false);
  const [orgPolicyError, setOrgPolicyError] = useState<string | null>(null);

  const [routingRulesCount, setRoutingRulesCount] = useState<number | null>(null);
  const [routingRulesLoading, setRoutingRulesLoading] = useState(false);
  const [routingRulesError, setRoutingRulesError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    []
  );

  const currentOrgId = useMemo(() => {
    const fromContext = context?.organisation?.id ? String((context.organisation as any).id) : '';
    if (isUuid(fromContext)) return fromContext;
    const fromStorage = localStorage.getItem('django-core:currentOrgId');
    if (isUuid(fromStorage)) return String(fromStorage);
    return '';
  }, [context?.organisation?.id]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    void fetchPreferences();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    void fetchOrgPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentOrgId]);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    if (!currentOrgId) return;
    if (!canManageOrgSettings) return;
    void fetchRoutingRulesSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentOrgId, canManageOrgSettings]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      debugLog('Fetched notifications:', data);
      debugLog('Array length:', (data.results || data).length);
      setNotifications(data.results || data);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/${notificationId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({ is_read: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      const updatedNotification = await response.json();

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? updatedNotification : n)
      );

      // Trigger event for badge update
      window.dispatchEvent(new Event('notificationChanged'));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/mark-all-read/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      // Refetch notifications
      await fetchNotifications();

      // Trigger event for badge update
      window.dispatchEvent(new Event('notificationChanged'));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markAllAsUnread = async () => {
    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/mark-all-unread/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as unread');
      }

      // Refetch notifications
      await fetchNotifications();

      // Trigger event for badge update
      window.dispatchEvent(new Event('notificationChanged'));
    } catch (err) {
      console.error('Error marking all as unread:', err);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: '20px' }}>
          <h1>Notifications</h1>
          <p>Loading notifications...</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div style={{ padding: '20px' }}>
          <h1>Notifications</h1>
          <div style={{
            padding: '16px',
            backgroundColor: '#fee',
            borderRadius: '8px',
            color: '#c00',
            marginTop: '16px'
          }}>
            {error}
          </div>
        </div>
      </AppShell>
    );
  }

  const fetchPreferences = async () => {
    try {
      setPrefsLoading(true);
      setPrefsError(null);

      const response = await fetch(`${apiBaseUrl}/api/v1/contextual-notifications/preferences/?page_size=100`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences (${response.status})`);
      }

      const data = await response.json();
      setPreferences((data?.results || data?.data?.results || data?.data || data) as NotificationPreference[]);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setPrefsError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setPrefsLoading(false);
    }
  };

  const fetchRoutingRulesSummary = async () => {
    if (!currentOrgId) {
      setRoutingRulesCount(null);
      return;
    }

    try {
      setRoutingRulesLoading(true);
      setRoutingRulesError(null);

      const response = await fetch(
        `${apiBaseUrl}/api/v1/contextual-notifications/routing-rules/?org_id=${encodeURIComponent(currentOrgId)}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const msg =
          (payload && (payload.detail || payload.error)) ||
          `Failed to fetch routing rules (${response.status})`;
        throw new Error(msg);
      }

      const data = await response.json().catch(() => null);
      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data?.results)
            ? data.data.results
            : Array.isArray(data?.data)
              ? data.data
              : [];

      setRoutingRulesCount(list.length);
    } catch (err) {
      console.error('Error fetching routing rules summary:', err);
      setRoutingRulesCount(null);
      setRoutingRulesError(err instanceof Error ? err.message : 'Failed to load routing rules');
    } finally {
      setRoutingRulesLoading(false);
    }
  };

  const updatePreference = async (prefId: number, patch: Partial<NotificationPreference>) => {
    try {
      setPrefsSaving(true);
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
      const response = await fetch(`${apiBaseUrl}/api/v1/contextual-notifications/preferences/${prefId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to update preference (${response.status}) ${text}`);
      }

      const updated = (await response.json()) as NotificationPreference;
      setPreferences((prev) => prev.map((p) => (p.id === prefId ? updated : p)));
    } catch (err) {
      console.error('Error updating notification preference:', err);
      setPrefsError(err instanceof Error ? err.message : 'Failed to update preference');
    } finally {
      setPrefsSaving(false);
    }
  };

  const deletePreference = async (prefId: number) => {
    try {
      setPrefsSaving(true);
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
      const response = await fetch(`${apiBaseUrl}/api/v1/contextual-notifications/preferences/${prefId}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to delete preference (${response.status})`);
      }
      setPreferences((prev) => prev.filter((p) => p.id !== prefId));
    } catch (err) {
      console.error('Error deleting notification preference:', err);
      setPrefsError(err instanceof Error ? err.message : 'Failed to delete preference');
    } finally {
      setPrefsSaving(false);
    }
  };

  const createPreference = async () => {
    const eventType = newPrefEventType.trim();
    if (!eventType) {
      setPrefsError('Event type is required');
      return;
    }

    try {
      setPrefsSaving(true);
      setPrefsError(null);
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/contextual-notifications/preferences/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          event_type: eventType,
          channel: newPrefChannel,
          enabled: newPrefEnabled,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to create preference (${response.status}) ${text}`);
      }

      const created = (await response.json()) as NotificationPreference;

      setPreferences((prev) => {
        const next = [created, ...prev.filter((p) => p.id !== created.id)];
        // de-dupe by (event_type, channel)
        const seen = new Set<string>();
        return next.filter((p) => {
          const key = `${p.event_type}__${p.channel}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });

      setNewPrefEventType('');
      setNewPrefChannel('in_app');
      setNewPrefEnabled(false);
    } catch (err) {
      console.error('Error creating notification preference:', err);
      setPrefsError(err instanceof Error ? err.message : 'Failed to create preference');
    } finally {
      setPrefsSaving(false);
    }
  };

  const fetchOrgPolicies = async () => {
    if (!currentOrgId) {
      setOrgBalancePolicy(null);
      setOrgNotifPolicy(null);
      setOrgPolicyError(null);
      return;
    }

    try {
      setOrgPolicyLoading(true);
      setOrgPolicyError(null);

      const [balRes, notifRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/transactions/balance-policies/organization/${encodeURIComponent(currentOrgId)}/`, {
          credentials: 'include',
        }),
        fetch(`${apiBaseUrl}/api/v1/contextual-notifications/org-policies/organization/${encodeURIComponent(currentOrgId)}/`, {
          credentials: 'include',
        }),
      ]);

      if (balRes.ok) {
        const json = await balRes.json();
        setOrgBalancePolicy(json?.data || json);
      } else {
        setOrgBalancePolicy(null);
      }

      if (notifRes.ok) {
        const json = await notifRes.json();
        setOrgNotifPolicy(json?.data || json);
      } else {
        // This endpoint may be permissioned for org admins; don't hard-fail the whole panel.
        setOrgNotifPolicy(null);
      }

      if (!balRes.ok && !notifRes.ok) {
        setOrgPolicyError(`Failed to load org policies (${balRes.status}/${notifRes.status})`);
      }
    } catch (err) {
      console.error('Error fetching org governance policies:', err);
      setOrgPolicyError(err instanceof Error ? err.message : 'Failed to load org policies');
    } finally {
      setOrgPolicyLoading(false);
    }
  };

  return (
    <AppShell>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: '8px' }}>Notifications</h1>
            <p style={{ color: '#666', margin: 0 }}>
              View all your system notifications and updates
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setActiveTab('inbox')}
              style={{
                padding: '8px 12px',
                backgroundColor: activeTab === 'inbox' ? '#2196f3' : 'var(--app-surface)',
                color: activeTab === 'inbox' ? 'white' : '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '8px 12px',
                backgroundColor: activeTab === 'settings' ? '#2196f3' : 'var(--app-surface)',
                color: activeTab === 'settings' ? 'white' : '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Settings
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={markAllAsRead}
              disabled={notifications.length === 0}
              aria-disabled={activeTab !== 'inbox'}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab !== 'inbox' ? '#ccc' : (notifications.length === 0 ? '#ccc' : '#2196f3'),
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: activeTab !== 'inbox' || notifications.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                if (activeTab === 'inbox' && notifications.length > 0) e.currentTarget.style.backgroundColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                if (activeTab === 'inbox' && notifications.length > 0) e.currentTarget.style.backgroundColor = '#2196f3';
              }}
            >
              Mark All as Read
            </button>
            <button
              onClick={markAllAsUnread}
              disabled={notifications.length === 0}
              aria-disabled={activeTab !== 'inbox'}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--app-surface)',
                color: activeTab !== 'inbox' || notifications.length === 0 ? '#ccc' : '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: activeTab !== 'inbox' || notifications.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                if (activeTab === 'inbox' && notifications.length > 0) e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
              }}
              onMouseLeave={(e) => {
                if (activeTab === 'inbox' && notifications.length > 0) e.currentTarget.style.backgroundColor = 'var(--app-surface)';
              }}
            >
              Mark All as Unread
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '800px' }}>
          {activeTab === 'settings' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: 'var(--app-surface)',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Your notification preferences</div>
                <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                  Defaults are <b>enabled</b> when no rule exists. Add an override to disable a specific event/channel.
                </div>

                {!!prefsError && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fee',
                    borderRadius: '8px',
                    color: '#c00',
                    marginBottom: '12px',
                  }}>
                    {prefsError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                  <input
                    value={newPrefEventType}
                    onChange={(e) => setNewPrefEventType(e.target.value)}
                    placeholder="event_type (e.g. match.created)"
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      minWidth: 280,
                      flex: 1,
                    }}
                  />
                  <select
                    value={newPrefChannel}
                    onChange={(e) => setNewPrefChannel(e.target.value as any)}
                    style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
                  >
                    <option value="in_app">In-App</option>
                    <option value="email">Email</option>
                    <option value="push">Push</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#444', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={newPrefEnabled}
                      onChange={(e) => setNewPrefEnabled(e.target.checked)}
                    />
                    Enabled
                  </label>
                  <button
                    onClick={createPreference}
                    disabled={prefsSaving}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: prefsSaving ? '#ccc' : '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: prefsSaving ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Add override
                  </button>
                  <button
                    onClick={fetchPreferences}
                    disabled={prefsLoading}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--app-surface)',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: prefsLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Refresh
                  </button>
                </div>

                {prefsLoading ? (
                  <div style={{ color: '#666' }}>Loading preferences…</div>
                ) : preferences.length === 0 ? (
                  <div style={{ color: '#666' }}>No overrides yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {preferences.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          border: '1px solid #eee',
                          borderRadius: '8px',
                          backgroundColor: 'var(--app-surface-2)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ fontWeight: 800, color: 'var(--app-text)' }}>{p.event_type}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{p.channel}</div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#444', fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={p.enabled}
                            disabled={prefsSaving}
                            onChange={(e) => updatePreference(p.id, { enabled: e.target.checked })}
                          />
                          Enabled
                        </label>
                        <button
                          onClick={() => deletePreference(p.id)}
                          disabled={prefsSaving}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'transparent',
                            color: '#c00',
                            border: '1px solid #f2c2c2',
                            borderRadius: '6px',
                            cursor: prefsSaving ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: 'var(--app-surface)',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Organisation governance (read-only)</div>
                <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                  Uses the currently selected organisation context.
                </div>

                {!currentOrgId ? (
                  <div style={{ color: '#666' }}>
                    No organisation selected. Pick one in the context switcher (top bar) to view org-level policies.
                  </div>
                ) : orgPolicyLoading ? (
                  <div style={{ color: '#666' }}>Loading org policies…</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!!orgPolicyError && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fff7e6',
                        borderRadius: '8px',
                        color: '#8a5a00',
                      }}>
                        {orgPolicyError}
                      </div>
                    )}

                    <div style={{
                      padding: '12px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      backgroundColor: 'var(--app-surface-2)',
                    }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Balance policy</div>
                      {orgBalancePolicy ? (
                        <div style={{ color: '#444', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div>enforcement_mode: <b>{orgBalancePolicy.enforcement_mode}</b></div>
                          <div>allow_negative: <b>{String(orgBalancePolicy.allow_negative)}</b></div>
                          <div>warn_threshold: <b>{String(orgBalancePolicy.warn_threshold)}</b></div>
                        </div>
                      ) : (
                        <div style={{ color: '#666', fontSize: 13 }}>Not available.</div>
                      )}
                    </div>

                    <div style={{
                      padding: '12px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      backgroundColor: 'var(--app-surface-2)',
                    }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Notification policy (org)</div>
                      {orgNotifPolicy ? (
                        <div style={{ color: '#444', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div>quiet_hours_enabled: <b>{String(orgNotifPolicy.quiet_hours_enabled)}</b></div>
                          <div>quiet_hours_start: <b>{String(orgNotifPolicy.quiet_hours_start)}</b></div>
                          <div>quiet_hours_end: <b>{String(orgNotifPolicy.quiet_hours_end)}</b></div>
                          <div>timezone: <b>{String(orgNotifPolicy.quiet_hours_timezone)}</b></div>
                          <div>rate_limit: <b>{String(orgNotifPolicy.quiet_hours_rate_limit)}</b></div>
                        </div>
                      ) : (
                        <div style={{ color: '#666', fontSize: 13 }}>
                          Not available (may require org admin permissions).
                        </div>
                      )}
                    </div>

                    <div style={{
                      padding: '12px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      backgroundColor: 'var(--app-surface-2)',
                    }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Routing rules (sending)</div>
                      <div style={{ color: '#666', fontSize: 13, marginBottom: 10 }}>
                        Controls which notifications can be sent for this organisation (separate from user opt-out preferences).
                      </div>

                      {!canManageOrgSettings ? (
                        <div style={{ color: '#666', fontSize: 13 }}>
                          You need org admin permissions to manage routing rules.
                        </div>
                      ) : routingRulesLoading ? (
                        <div style={{ color: '#666', fontSize: 13 }}>Loading routing rules…</div>
                      ) : routingRulesError ? (
                        <div style={{ color: '#8a5a00', fontSize: 13 }}>{routingRulesError}</div>
                      ) : (
                        <div style={{ color: '#444', fontSize: 13 }}>
                          Current rules: <b>{routingRulesCount ?? '—'}</b>
                        </div>
                      )}

                      {canManageOrgSettings && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          <a
                            href="/routing-rules"
                            style={{
                              display: 'inline-block',
                              padding: '10px 12px',
                              backgroundColor: '#2196f3',
                              color: 'white',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontWeight: 800,
                              fontSize: 13,
                            }}
                          >
                            Manage routing rules
                          </a>
                          <button
                            onClick={fetchRoutingRulesSummary}
                            disabled={routingRulesLoading}
                            style={{
                              padding: '10px 12px',
                              backgroundColor: 'var(--app-surface)',
                              color: '#666',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              cursor: routingRulesLoading ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            Refresh rules
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={fetchOrgPolicies}
                        disabled={orgPolicyLoading}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--app-surface)',
                          color: '#666',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          cursor: orgPolicyLoading ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        Refresh policies
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              color: '#666'
            }}>
              No notifications yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((notification) => {
                const isUnread = !notification.read_at;
                const notificationType = notification.metadata?.event_type || 'info';
                const borderColor =
                  notificationType === 'project_created' ? '#2196f3' :
                  notificationType === 'member_role_changed' ? '#ff9800' :
                  '#4caf50';

                return (
                  <div
                    key={notification.id}
                    onClick={() => isUnread && markAsRead(notification.id)}
                    style={{
                      padding: '16px',
                      backgroundColor: isUnread ? '#e3f2fd' : '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${borderColor}`,
                      cursor: isUnread ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      opacity: isUnread ? 1 : 0.7,
                    }}
                    onMouseEnter={(e) => {
                      if (isUnread) {
                        e.currentTarget.style.backgroundColor = '#bbdefb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isUnread) {
                        e.currentTarget.style.backgroundColor = '#e3f2fd';
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: isUnread ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {notification.payload.title}
                        {isUnread && (
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#2196f3',
                            borderRadius: '50%'
                          }}></span>
                        )}
                      </h3>
                      <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                        {new Date(notification.created_at).toLocaleString('nl-NL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                      {notification.payload.body}
                    </p>
                    {isUnread && (
                      <p style={{
                        margin: '8px 0 0 0',
                        fontSize: '12px',
                        color: '#2196f3',
                        fontStyle: 'italic'
                      }}>
                        Click to mark as read
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
