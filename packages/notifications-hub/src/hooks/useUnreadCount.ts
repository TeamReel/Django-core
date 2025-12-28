import { useContext } from 'react';
import { NotificationsContext } from '../context/NotificationsContext';

/**
 * Lightweight hook for accessing unread notification count.
 * Optimized for badge components that only need the count and loading state.
 *
 * @throws {Error} If used outside of NotificationsProvider
 * @returns {{ count: number; loading: boolean }} Unread count and loading state
 *
 * @example
 * ```tsx
 * function NotificationBadge() {
 *   const { count, loading } = useUnreadCount();
 *
 *   if (loading) return <Skeleton width={20} height={20} />;
 *   if (count === 0) return null;
 *   return <Badge>{count > 99 ? '99+' : count}</Badge>;
 * }
 * ```
 */
export function useUnreadCount(): { count: number; loading: boolean } {
  const context = useContext(NotificationsContext);

  if (context === undefined) {
    throw new Error(
      'useUnreadCount must be used within a NotificationsProvider. ' +
      'Ensure your component tree is wrapped with <NotificationsProvider>.'
    );
  }

  return {
    count: context.unreadCount,
    loading: context.loading,
  };
}
