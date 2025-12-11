// Main package exports
// Components, hooks, and types will be exported here as they are implemented

export * from './types';
export * from './config/types';

// Hooks
export * from './hooks';

// Components
export * from './components/ToastHost';
export * from './components/NotificationList';
export * from './components/NotificationPanel';
export * from './components/UnreadBadge';
export * from './components/ErrorBoundary';

// Context (for provider)
export { NotificationsProvider } from './context/NotificationsProvider';
export type { NotificationsContextValue, NotificationsState, NotificationsActions } from './context/NotificationsContext';
