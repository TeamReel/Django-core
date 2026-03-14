/**
 * NotificationsSheetContent — Compact notification list for ProfileSheet.
 *
 * Reuses the same API + optimistic update logic as NotificationsPage
 * but without PageHeader/PullToRefresh/back-navigation.
 */
import React, { useMemo } from 'react';
import { Alert, Button, Card } from '@django-core/design-system';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { useAsync } from '@/hooks/useAsync';
import s from './NotificationsSheetContent.module.css';

interface Notification {
  id: string;
  title?: string;
  message?: string;
  level?: string;
  is_read?: boolean;
  created_at?: string;
  type?: { code?: string; name?: string };
  payload?: { title?: string; body?: string; message?: string };
  metadata?: Record<string, unknown>;
  read_at?: string | null;
}

export const NotificationsSheetContent: React.FC = () => {
  const { data: notifications, setData: setNotifications, loading, error, reload } = useAsync(
    async () => {
      const { results } = await api.list<Notification>('/user-notifications/');
      return results;
    },
    [],
  );

  const list = useMemo(() => (Array.isArray(notifications) ? notifications : []), [notifications]);

  const markAsRead = async (id: string) => {
    const prev = [...(notifications || [])];
    setNotifications((p) => (p || []).map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    window.dispatchEvent(new Event('notificationChanged'));
    try {
      await api.patch<Notification>(`/user-notifications/${id}/`, { is_read: true });
    } catch (err) {
      logger.error('Error marking notification as read', err);
      setNotifications(prev);
      window.dispatchEvent(new Event('notificationChanged'));
    }
  };

  const markAllAsRead = async () => {
    const prev = [...(notifications || [])];
    setNotifications((p) => (p || []).map((n) => ({ ...n, is_read: true })));
    window.dispatchEvent(new Event('notificationChanged'));
    try {
      await api.post('/user-notifications/mark-all-read/');
      reload();
    } catch (err) {
      logger.error('Error marking all as read', err);
      setNotifications(prev);
      window.dispatchEvent(new Event('notificationChanged'));
    }
  };

  if (loading) {
    return <div className="text-muted fs-13">Loading notifications…</div>;
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex-row gap-8 mb-12">
        <Button variant="primary" size="sm" onClick={markAllAsRead} disabled={list.length === 0}>
          Mark All as Read
        </Button>
      </div>

      {error && <Alert variant="error" className="mb-12">{error}</Alert>}

      {list.length === 0 ? (
        <Card>
          <div className={s.emptyCard}>No notifications yet</div>
        </Card>
      ) : (
        <div className="flex-col gap-12">
          {list.map((n) => {
            const isUnread = n.is_read === undefined ? !n.read_at : !n.is_read;
            const title = String(
              n.title || n.payload?.title || n.metadata?.title || n.type?.name || 'Notification',
            );
            const body = String(n.message || n.payload?.message || n.payload?.body || n.metadata?.message || '');
            let date = '';
            try {
              if (n.created_at) {
                date = new Date(n.created_at).toLocaleString('nl-NL', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                });
              }
            } catch { /* ignore */ }

            const borderColor =
              n.level === 'error' ? 'var(--app-danger)' :
              n.level === 'warning' ? 'var(--app-warning)' :
              n.level === 'success' ? 'var(--app-success)' :
              'var(--app-primary)';

            return (
              <div
                key={n.id}
                onClick={() => isUnread && markAsRead(n.id)}
                className={s.notificationItem}
                data-unread={isUnread || undefined}
                style={{ '--notification-border-color': borderColor } as React.CSSProperties}
              >
                <div className={s.notificationHeader}>
                  <div className={s.notificationTitle} data-unread={isUnread || undefined}>
                    {title}
                    {isUnread && <span className={s.unreadDot} />}
                  </div>
                  <div className="fs-12 text-muted" style={{ whiteSpace: 'nowrap' }}>
                    {date}
                  </div>
                </div>
                {body && (
                  <div className="fs-13 text-muted mt-4">{body}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
