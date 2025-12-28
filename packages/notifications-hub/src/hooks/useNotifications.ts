import { useContext } from 'react';
import { NotificationsContext, NotificationsContextValue } from '../context/NotificationsContext';

/**
 * Main hook for accessing the full notifications state and all actions.
 * Use this hook when components need complete access to notifications data.
 *
 * @throws {Error} If used outside of NotificationsProvider
 * @returns {NotificationsContextValue} Full notifications state and actions
 *
 * @example
 * ```tsx
 * function NotificationsList() {
 *   const { notifications, loading, fetchNotifications } = useNotifications();
 *
 *   useEffect(() => {
 *     fetchNotifications();
 *   }, [fetchNotifications]);
 *
 *   if (loading) return <Spinner />;
 *   return <List items={notifications} />;
 * }
 * ```
 */
export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);

  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider. ' +
      'Ensure your component tree is wrapped with <NotificationsProvider>.'
    );
  }

  return context;
}
