import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, PullToRefresh } from '@django-core/design-system';
import { PageHeader } from '../components/ui/PageHeader';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { getApiBaseUrl } from '../utils/apiBase';
import SwipeableCard from '../components/SwipeableCard';
import styles from './NotificationsPage.module.css';

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

interface Notification {
  id: string;
  title?: string;
  message?: string;
  level?: string;
  is_read?: boolean;
  created_at?: string;
  // Back-compat fields (older schema)
  type?: {
    code?: string;
    name?: string;
  };
  payload?: {
    title?: string;
    body?: string;
    message?: string;
  };
  metadata?: any;
  status?: string;
  read_at?: string | null;
}

const unwrapResponseData = <T,>(raw: any): T => {
  // Global renderer can wrap as { status, data, meta }
  return (raw?.data ?? raw) as T;
};

const safeSearchParams = (search: string) => {
  try {
    return new URLSearchParams(search);
  } catch {
    return new URLSearchParams();
  }
};

export default function NotificationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = safeSearchParams(location.search);
    const tab = (params.get('tab') || '').toLowerCase();
    if (tab === 'settings') {
      navigate('/preferences?tab=notifications', { replace: true });
    }
  }, [location.search, navigate]);

  const apiBaseUrl = useMemo(
    () => getApiBaseUrl(),
    []
  );

  const notificationsList = useMemo(
    () => (Array.isArray(notifications) ? notifications : []),
    [notifications]
  );

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const raw = await response.json();
      const data = unwrapResponseData<any>(raw);
      debugLog('Fetched notifications:', data);

      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      debugLog('Array length:', list.length);
      setNotifications(list as Notification[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const markAsRead = async (notificationId: string) => {
    // Optimistic update: mark as read in local state immediately
    const previousNotifications = [...notifications];
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    window.dispatchEvent(new Event('notificationChanged'));

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

      const raw = await response.json();
      const updatedNotification = unwrapResponseData<Notification>(raw);

      // Reconcile with server response
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? updatedNotification : n)
      );
    } catch (err) {
      // Rollback on failure
      console.error('Error marking notification as read:', err);
      setNotifications(previousNotifications);
      window.dispatchEvent(new Event('notificationChanged'));
    }
  };

  const markAllAsRead = async () => {
    // Optimistic: mark all as read immediately
    const previousNotifications = [...notifications];
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    window.dispatchEvent(new Event('notificationChanged'));

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

      // Reconcile with server
      await fetchNotifications();
    } catch (err) {
      // Rollback on failure
      console.error('Error marking all as read:', err);
      setNotifications(previousNotifications);
      window.dispatchEvent(new Event('notificationChanged'));
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
      <div className={styles.pageContainer}>
        <BreadcrumbNav items={[
          { label: 'Profile', path: '/profile' },
        ]} />
        <div className="text-lg font-semibold text-primary">Notifications</div>
        <div className="text-sm text-muted">Loading notifications…</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <BreadcrumbNav items={[
        { label: 'Profile', path: '/profile' },
      ]} />
      <PageHeader
        title="Notifications"
        subtitle="View all your system notifications and updates"
          className="mb-16"
          actions={
            <div className={`flex-row gap-8 flex-wrap ${styles.headerActions}`}>
              <Button
                variant="primary"
                size="sm"
                onClick={markAllAsRead}
                disabled={notificationsList.length === 0}
              >
                Mark All as Read
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={markAllAsUnread}
                disabled={notificationsList.length === 0}
              >
                Mark All as Unread
              </Button>
            </div>
          }
        />

        <PullToRefresh
          onRefresh={fetchNotifications}
          pullText="Trek om te vernieuwen"
          releaseText="Laat los om te vernieuwen"
          refreshingText="Vernieuwen..."
        >
        <div className={styles.notificationsContainer}>
          <Card>
            <div className="fw-800 mb-4">Notification settings moved</div>
            <div className={`fs-13 text-muted ${styles.settingsNote}`}>
              Manage your notification channels and preferences in Preferences.
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/preferences?tab=notifications')}
            >
              Open notification settings
            </Button>
          </Card>

          {!!error && (
            <div className="mt-12">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <div className="mt-12">
            {notificationsList.length === 0 ? (
              <Card>
                <div className="py-12 text-center text-muted">
                  No notifications yet
                </div>
              </Card>
            ) : (
              <div className="flex-col gap-12">
                {notificationsList.map((notification) => {
                const isUnread = (notification as any)?.is_read === undefined
                  ? !notification.read_at
                  : !Boolean((notification as any)?.is_read);

                const notificationType =
                  String((notification as any)?.level || (notification as any)?.metadata?.event_type || 'info').toLowerCase();

                const title =
                  String(
                    (notification as any)?.title ||
                    (notification as any)?.payload?.title ||
                    (notification as any)?.metadata?.title ||
                    (notification as any)?.type?.name ||
                    (notification as any)?.metadata?.event_type ||
                    'Notification'
                  );

                const body =
                  String(
                    (notification as any)?.message ||
                    (notification as any)?.payload?.message ||
                    (notification as any)?.payload?.body ||
                    (notification as any)?.metadata?.body ||
                    (notification as any)?.metadata?.message ||
                    ''
                  );

                let createdLabel = '';
                try {
                  if ((notification as any)?.created_at) {
                    createdLabel = new Date((notification as any).created_at).toLocaleString('nl-NL', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }
                } catch {
                  createdLabel = '';
                }

                const borderColor =
                  notificationType === 'error' ? 'var(--app-danger, #ef4444)' :
                  notificationType === 'warning' ? 'var(--app-warning, #f59e0b)' :
                  notificationType === 'success' ? 'var(--app-success, #22c55e)' :
                  'var(--app-primary)';

                return (
                  <SwipeableCard
                    key={notification.id}
                    onDismiss={() => markAsRead(notification.id)}
                    disabled={!isUnread}
                    direction="left"
                    threshold={80}
                    leftReveal={
                      <div
                        className={`flex-row gap-8 h-full py-16 px-24 ${styles.swipeReveal}`}
                      >
                        <span className="fs-18">✓</span>
                        <span className="fw-600">Gelezen</span>
                      </div>
                    }
                  >
                  <div
                    onClick={() => isUnread && markAsRead(notification.id)}
                    className={`rounded-8 ${styles.notificationCard}`}
                    data-unread={isUnread ? 'true' : undefined}
                    style={{ '--notification-border-color': borderColor } as React.CSSProperties}
                  >
                    <Card>
                      <div
                        className={`p-0 rounded-8 ${styles.notificationInner}`}
                        data-unread={isUnread ? 'true' : undefined}
                      >
                        <div
                          className={`gap-12 ${styles.notificationHeader}`}
                        >
                          <div className="flex-row gap-8">
                            <div className={`fs-16 text-primary ${styles.notificationTitle}`} data-unread={isUnread ? 'true' : undefined}>
                              {title}
                            </div>
                            {isUnread && (
                              <span
                                className={`inline-block rounded-full ${styles.unreadDot}`}
                              />
                            )}
                          </div>
                          <div className="fs-12 text-muted whitespace-nowrap">
                            {createdLabel || '—'}
                          </div>
                        </div>

                        {body ? (
                          <div className={`text-muted fs-14 ${styles.notificationBody}`}>
                            {body}
                          </div>
                        ) : null}

                        {isUnread && (
                          <div className={`mt-8 fs-12 ${styles.readHint}`}>
                            Swipe of klik om als gelezen te markeren
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                  </SwipeableCard>
                );
              })}
              </div>
            )}
          </div>
        </div>
        </PullToRefresh>
      </div>
  );
}
