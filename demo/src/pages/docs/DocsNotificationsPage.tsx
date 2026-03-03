import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Card, Badge, Spinner } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

export function DocsNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const results = data.data?.results || data.results || data.data || data || [];
      setNotifications(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleToggleRead = async (id: string, currentReadStatus: boolean) => {
    setMarking(id);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const csrfToken = document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/${id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
        body: JSON.stringify({ is_read: !currentReadStatus }),
      });
      if (!response.ok) throw new Error(`Failed to update notification: ${response.status}`);

      const updated = await response.json();
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      window.dispatchEvent(new CustomEvent('notificationChanged'));
    } catch (err) {
      console.error('Failed to toggle notification:', err);
      alert(err instanceof Error ? err.message : 'Failed to update notification');
    } finally {
      setMarking(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/mark-all-read/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');

      await fetchNotifications();
      window.dispatchEvent(new Event('notificationChanged'));
    } catch (err) {
      console.error('Error marking all as read:', err);
      alert('Failed to mark all as read');
    }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: '4px',
    border: active ? '1px solid #007bff' : '1px solid #6c757d',
    backgroundColor: 'var(--app-surface)',
    color: active ? '#007bff' : '#6c757d',
    cursor: 'pointer', fontSize: '14px', fontWeight: 500,
  });

  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="In-App Notifications with Persistent Read/Unread Status" />
      <PageContent>
        <div className="page-container" data-testid="notifications-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner /></div>
          ) : error ? (
            <Card className="p-24 text-center bg-surface border">
              <p className="mb-16" style={{ color: '#ef4444' }}>{error}</p>
              <button onClick={fetchNotifications} style={filterBtnStyle(true)}>Retry</button>
            </Card>
          ) : (
            <>
              <Card className="p-16 mb-24 bg-surface border">
                <div className="flex-between">
                  <div>
                    <h3 className="m-0 fs-18 fw-600 text-primary">Unread: {unreadCount}</h3>
                    <p className="fs-14 text-muted" style={{ margin: '4px 0 0 0' }}>Total: {notifications.length} notifications</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setFilter('all')} style={filterBtnStyle(filter === 'all')}>All</button>
                    <button onClick={() => setFilter('unread')} style={filterBtnStyle(filter === 'unread')}>Unread ({unreadCount})</button>
                    <button
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      style={{ ...filterBtnStyle(false), cursor: unreadCount === 0 ? 'not-allowed' : 'pointer', opacity: unreadCount === 0 ? 0.5 : 1 }}
                    >
                      Mark All Read
                    </button>
                  </div>
                </div>
              </Card>

              {filtered.length === 0 ? (
                <Card className="text-center bg-surface border" style={{ padding: '48px' }}>
                  <p style={{ color: 'var(--app-muted-text)' }}>{filter === 'unread' ? 'No unread notifications' : 'No notifications'}</p>
                </Card>
              ) : (
                <div className="flex-col gap-12">
                  {filtered.map(notif => (
                    <Card key={notif.id} style={{ padding: '16px', backgroundColor: notif.is_read ? 'var(--app-surface)' : 'var(--app-surface-2)', border: '1px solid var(--app-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div className="flex-row gap-8 mb-8">
                            <Badge variant={notif.level === 'error' ? 'error' : notif.level === 'warning' ? 'warning' : notif.level === 'success' ? 'success' : 'info'}>
                              {notif.level}
                            </Badge>
                            {!notif.is_read && <Badge variant="info">NEW</Badge>}
                          </div>
                          <h4 className="fs-16 fw-600 text-primary" style={{ margin: '0 0 4px 0' }}>{notif.title}</h4>
                          <p className="fs-14 text-muted" style={{ margin: '0 0 8px 0' }}>{notif.message}</p>
                          <div className="fs-12 text-muted">{new Date(notif.created_at).toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => handleToggleRead(notif.id, notif.is_read)}
                          disabled={marking === notif.id}
                          style={{
                            padding: '6px 12px', borderRadius: '4px',
                            border: '1px solid #6c757d', backgroundColor: 'var(--app-surface)',
                            color: '#6c757d', cursor: marking === notif.id ? 'not-allowed' : 'pointer',
                            fontSize: '12px', fontWeight: 500,
                            opacity: marking === notif.id ? 0.6 : 1, whiteSpace: 'nowrap',
                          }}
                        >
                          {marking === notif.id ? 'Updating...' : notif.is_read ? 'Mark Unread' : 'Mark Read'}
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}
