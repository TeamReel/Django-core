/**
 * useNotifications Hook
 *
 * Manages user notifications (B16):
 * - Fetch notification list with pagination
 * - Track unread count
 * - Mark individual notifications read/unread
 * - Mark all read/unread
 * - Auto-poll for new notifications
 * - Dispatch 'notificationChanged' events for cross-component sync
 *
 * API: /api/v1/user-notifications/
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api';

// ============================================================================
// Types
// ============================================================================

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  /** Legacy/extended fields */
  type?: { code?: string; name?: string };
  payload?: { title?: string; body?: string; message?: string };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Helpers
// ============================================================================

function unwrapNotifications(raw: any): UserNotification[] {
  const data = raw?.data ?? raw;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : [];
  return list as UserNotification[];
}

function dispatchChange() {
  window.dispatchEvent(new Event('notificationChanged'));
}

// ============================================================================
// Level display helpers
// ============================================================================

export function getNotificationLevelDisplay(level: string): {
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (level) {
    case 'success':
      return { color: 'var(--color-green-600)', bgColor: 'var(--color-green-100)', icon: 'check-circle-2' };
    case 'warning':
      return { color: 'var(--color-amber-500)', bgColor: 'var(--color-amber-100)', icon: 'alert-triangle' };
    case 'error':
      return { color: 'var(--color-red-500)', bgColor: 'var(--color-red-100)', icon: 'x-circle' };
    default: // 'info'
      return { color: 'var(--color-blue-600)', bgColor: 'var(--color-blue-100)', icon: 'info' };
  }
}

// ============================================================================
// Hook: useNotifications
// ============================================================================

interface UseNotificationsOptions {
  /** Auto-poll interval in ms (0 = disabled, default 30s) */
  pollInterval?: number;
  /** Maximum notifications to fetch per page */
  pageSize?: number;
}

export interface UseNotificationsReturn {
  notifications: UserNotification[];
  unreadCount: number;
  unreadNotifications: UserNotification[];
  readNotifications: UserNotification[];
  loading: boolean;
  error: string | null;
  markRead: (notificationId: string) => Promise<void>;
  markUnread: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  markAllUnread: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { pollInterval = 30_000, pageSize = 50 } = options;

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch notifications ─────────────────────────────────────────

  const fetchNotifications = useCallback(async (silent = false) => {
    if (silent && document.hidden) return; // Skip background polling (not initial fetch)
    try {
      if (!silent) setLoading(true);

      const { results } = await api.list<UserNotification>('/user-notifications/', {
        params: { page_size: pageSize },
      });

      setNotifications(results);
      setError(null);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-poll
  useEffect(() => {
    if (!pollInterval) return;
    const interval = setInterval(() => fetchNotifications(true), pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval, fetchNotifications]);

  // Listen for cross-component changes
  useEffect(() => {
    const handler = () => fetchNotifications(true);
    window.addEventListener('notificationChanged', handler);
    return () => window.removeEventListener('notificationChanged', handler);
  }, [fetchNotifications]);

  // ── Computed values ─────────────────────────────────────────────

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  // ── Mutations ───────────────────────────────────────────────────

  const markRead = useCallback(async (notificationId: string) => {
    try {
      await api.patch(`/user-notifications/${notificationId}/`, { is_read: true });
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      dispatchChange();
    } catch (err) {
      console.error(err);
      console.error('Failed to mark notification read:', err);
    }
  }, []);

  const markUnread = useCallback(async (notificationId: string) => {
    try {
      await api.patch(`/user-notifications/${notificationId}/`, { is_read: false });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n)
      );
      dispatchChange();
    } catch (err) {
      console.error(err);
      console.error('Failed to mark notification unread:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/user-notifications/mark-all-read/', undefined);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      dispatchChange();
    } catch (err) {
      console.error(err);
      console.error('Failed to mark all read:', err);
    }
  }, []);

  const markAllUnread = useCallback(async () => {
    try {
      await api.post('/user-notifications/mark-all-unread/', undefined);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: false })));
      dispatchChange();
    } catch (err) {
      console.error(err);
      console.error('Failed to mark all unread:', err);
    }
  }, []);

  const refresh = useCallback(() => fetchNotifications(), [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    unreadNotifications,
    readNotifications,
    loading,
    error,
    markRead,
    markUnread,
    markAllRead,
    markAllUnread,
    refresh,
  };
}

// ============================================================================
// Hook: useUnreadCount (lightweight, for TopNavbar bell)
// ============================================================================

export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const { results } = await api.list<UserNotification>('/user-notifications/');
      setCount(results.filter(n => !n.is_read).length);
    } catch {
      // Silent fail for badge
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    const handler = () => fetchCount();
    window.addEventListener('notificationChanged', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationChanged', handler);
    };
  }, [fetchCount]);

  return count;
}
