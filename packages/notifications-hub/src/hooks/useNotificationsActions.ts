import { useContext } from 'react';
import { NotificationsContext, NotificationsActions } from '../context/NotificationsContext';

/**
 * Hook for accessing only notification actions without state.
 * Use this when components need to trigger actions but don't need state,
 * avoiding unnecessary re-renders.
 *
 * @throws {Error} If used outside of NotificationsProvider
 * @returns {NotificationsActions} All notification actions
 *
 * @example
 * ```tsx
 * function MarkAsReadButton({ notificationId }: { notificationId: string }) {
 *   const { markAsRead } = useNotificationsActions();
 *
 *   return (
 *     <Button onClick={() => markAsRead(notificationId)}>
 *       Mark as Read
 *     </Button>
 *   );
 * }
 * ```
 */
export function useNotificationsActions(): NotificationsActions {
  const context = useContext(NotificationsContext);

  if (context === undefined) {
    throw new Error(
      'useNotificationsActions must be used within a NotificationsProvider. ' +
      'Ensure your component tree is wrapped with <NotificationsProvider>.'
    );
  }

  // Extract only action functions (not state)
  const {
    fetchNotifications,
    loadMore,
    refresh,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    setFilters,
    openPanel,
    closePanel,
    togglePanel,
    dismissToast,
    pausePolling,
    resumePolling,
    isPollingActive,
  } = context;

  return {
    fetchNotifications,
    loadMore,
    refresh,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    setFilters,
    openPanel,
    closePanel,
    togglePanel,
    dismissToast,
    pausePolling,
    resumePolling,
    isPollingActive,
  };
}
