import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, PullToRefresh } from '@django-core/design-system';
import { PageHeader } from '../components/ui/PageHeader';
import { useSetBackNavigation } from '../providers/BackNavigationProvider';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { useAsync } from '@/hooks/useAsync';
import SwipeableCard from '../components/SwipeableCard';
import styles from './NotificationsPage.module.css';

const debugLog = (...args: unknown[]) => {
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
  metadata?: Record<string, unknown>;
  status?: string;
  read_at?: string | null;
}

const unwrapResponseData = <T,>(raw: unknown): T => {
  // Global renderer can wrap as { status, data, meta }
  const obj = raw as Record<string, unknown> | undefined;
  return (obj?.data ?? raw) as T;
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
  const { data: notifications, setData: setNotifications, loading, error, reload } = useAsync(
    async () => {
      const { results } = await api.list<Notification>('/user-notifications/');
      return results;
    },
    [],
  );
  useSetBackNavigation({ label: 'Profiel', path: '/profile' });

  useEffect(() => {
    const params = safeSearchParams(location.search);
    const tab = (params.get('tab') || '').toLowerCase();
    if (tab === 'settings') {
      navigate('/preferences?tab=notifications', { replace: true });
    }
  }, [location.search, navigate]);

  const notificationsList = useMemo(
    () => (Array.isArray(notifications) ? notifications : []),
    [notifications]
  );

  const markAsRead = async (notificationId: string) => {
    // Optimistic update: mark as read in local state immediately
    const previousNotifications = [...(notifications || [])];
    setNotifications(prev =>
      (prev || []).map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    window.dispatchEvent(new Event('notificationChanged'));

    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      const updatedNotification = await api.patch<Notification>(`/user-notifications/${notificationId}/`, { is_read: true });

      // Reconcile with server response
      setNotifications(prev =>
        (prev || []).map(n => n.id === notificationId ? updatedNotification : n)
      );
    } catch (err) {
      logger.error('Error marking notification as read', err);
      // Rollback on failure
      setNotifications(previousNotifications);
      window.dispatchEvent(new Event('notificationChanged'));
    }
  };

  const markAllAsRead = async () => {
    // Optimistic: mark all as read immediately
    const previousNotifications = [...(notifications || [])];
    setNotifications(prev => (prev || []).map(n => ({ ...n, is_read: true })));
    window.dispatchEvent(new Event('notificationChanged'));

    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      await api.post('/user-notifications/mark-all-read/');

      // Reconcile with server
      reload();
    } catch (err) {
      logger.error('Error marking all as read', err);
      // Rollback on failure
      setNotifications(previousNotifications);
      window.dispatchEvent(new Event('notificationChanged'));
    }
  };

  const markAllAsUnread = async () => {
    try {
      await api.post('/user-notifications/mark-all-unread/');

      // Refetch notifications
      reload();

      // Trigger event for badge update
      window.dispatchEvent(new Event('notificationChanged'));
    } catch (err) {
      logger.error('Error marking all as unread', err);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className="text-lg font-semibold text-primary">Notifications</div>
        <div className="text-sm text-muted">Loading notifications…</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
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
          onRefresh={async () => { reload(); }}
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
                const isUnread = notification?.is_read === undefined
                  ? !notification.read_at
                  : !Boolean(notification?.is_read);

                const notificationType =
                  String(notification?.level || notification?.metadata?.event_type || 'info').toLowerCase();

                const title =
                  String(
                    notification?.title ||
                    notification?.payload?.title ||
                    notification?.metadata?.title ||
                    notification?.type?.name ||
                    notification?.metadata?.event_type ||
                    'Notification'
                  );

                const body =
                  String(
                    notification?.message ||
                    notification?.payload?.message ||
                    notification?.payload?.body ||
                    notification?.metadata?.body ||
                    notification?.metadata?.message ||
                    ''
                  );

                let createdLabel = '';
                try {
                  if (notification?.created_at) {
                    createdLabel = new Date(notification.created_at).toLocaleString('nl-NL', {
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
                        <span className="fs-18">OK</span>
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
