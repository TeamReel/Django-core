import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Card, Badge, Spinner } from '@django-core/design-system';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import styles from './DocsNotificationsPage.module.css';

interface DocsNotification {
  id: string;
  title: string;
  message: string;
  level: string;
  is_read: boolean;
  created_at: string;
}

export function DocsNotificationsPage() {
  const [notifications, setNotifications] = useState<DocsNotification[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const { results } = await api.list<DocsNotification>('/user-notifications/');
      setNotifications(results);
    } catch (err) {
      logger.error('Failed to fetch notifications', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleToggleRead = async (id: string, currentReadStatus: boolean) => {
    setMarking(id);
    try {
      const updated = await api.patch<DocsNotification>(`/user-notifications/${id}/`, { is_read: !currentReadStatus });
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      window.dispatchEvent(new CustomEvent('notificationChanged'));
    } catch (err) {
      logger.error('Failed to toggle notification', err);
      alert(err instanceof Error ? err.message : 'Failed to update notification');
    } finally {
      setMarking(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/user-notifications/mark-all-read/');

      await fetchNotifications();
      window.dispatchEvent(new Event('notificationChanged'));
    } catch (err) {
      logger.error('Error marking all as read', err);
      alert('Failed to mark all as read');
    }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="In-App Notifications with Persistent Read/Unread Status" />
      <PageContent>
        <div className="page-container" data-testid="notifications-page">
          {loading ? (
            <div className={styles.loadingWrapper}><Spinner /></div>
          ) : error ? (
            <Card className="p-24 text-center bg-surface border">
              <p className={`mb-16 ${styles.errorText}`}>{error}</p>
              <button onClick={fetchNotifications} className={styles.filterBtn} data-active="true">Retry</button>
            </Card>
          ) : (
            <>
              <Card className="p-16 mb-24 bg-surface border">
                <div className="flex-between">
                  <div>
                    <h3 className="m-0 fs-18 fw-600 text-primary">Unread: {unreadCount}</h3>
                    <p className={`fs-14 text-muted ${styles.totalText}`}>Total: {notifications.length} notifications</p>
                  </div>
                  <div className={styles.filterGroup}>
                    <button onClick={() => setFilter('all')} className={styles.filterBtn} data-active={String(filter === 'all')}>All</button>
                    <button onClick={() => setFilter('unread')} className={styles.filterBtn} data-active={String(filter === 'unread')}>Unread ({unreadCount})</button>
                    <button
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      className={styles.filterBtn}
                    >
                      Mark All Read
                    </button>
                  </div>
                </div>
              </Card>

              {filtered.length === 0 ? (
                <Card className={`text-center bg-surface border ${styles.emptyCard}`}>
                  <p className={styles.emptyText}>{filter === 'unread' ? 'No unread notifications' : 'No notifications'}</p>
                </Card>
              ) : (
                <div className="flex-col gap-12">
                  {filtered.map(notif => (
                    <Card key={notif.id} className={styles.notifCard} data-read={String(notif.is_read)}>
                      <div className={styles.notifRow}>
                        <div className={styles.notifContent}>
                          <div className="flex-row gap-8 mb-8">
                            <Badge variant={notif.level === 'error' ? 'error' : notif.level === 'warning' ? 'warning' : notif.level === 'success' ? 'success' : 'info'}>
                              {notif.level}
                            </Badge>
                            {!notif.is_read && <Badge variant="info">NEW</Badge>}
                          </div>
                          <h4 className={`fs-16 fw-600 text-primary ${styles.notifTitle}`}>{notif.title}</h4>
                          <p className={`fs-14 text-muted ${styles.notifMessage}`}>{notif.message}</p>
                          <div className="fs-12 text-muted">{new Date(notif.created_at).toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => handleToggleRead(notif.id, notif.is_read)}
                          disabled={marking === notif.id}
                          className={styles.toggleBtn}
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

export default DocsNotificationsPage;
