import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      console.log('Fetched notifications:', data);
      console.log('Array length:', (data.results || data).length);
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={markAllAsRead}
              disabled={notifications.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: notifications.length === 0 ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: notifications.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                if (notifications.length > 0) e.currentTarget.style.backgroundColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                if (notifications.length > 0) e.currentTarget.style.backgroundColor = '#2196f3';
              }}
            >
              Mark All as Read
            </button>
            <button
              onClick={markAllAsUnread}
              disabled={notifications.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--app-surface)',
                color: notifications.length === 0 ? '#ccc' : '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: notifications.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                if (notifications.length > 0) e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
              }}
              onMouseLeave={(e) => {
                if (notifications.length > 0) e.currentTarget.style.backgroundColor = 'var(--app-surface)';
              }}
            >
              Mark All as Unread
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '800px' }}>
          {notifications.length === 0 ? (
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
