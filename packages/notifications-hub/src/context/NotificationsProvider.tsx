import React, { useReducer, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { NotificationsContext, NotificationsState } from './NotificationsContext';
import { notificationsReducer, initialState } from './notificationsReducer';
import { NotificationsConfig, NotificationTypeMapping } from '@/types';
import { defaultNotificationMappings } from '@/config';
import * as api from './apiClient';
import { handleError, formatErrorForLogging, isAuthenticationError } from '@/utils/errorHandler';
import { validateNotification } from '@/utils/validateNotification';

interface NotificationsProviderProps {
  children: React.ReactNode;
  config: NotificationsConfig;
  typeMappings?: NotificationTypeMapping;
}

export function NotificationsProvider({
  children,
  config,
  typeMappings = defaultNotificationMappings
}: NotificationsProviderProps) {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingActiveRef = useRef(true);

  // F02 auth context
  const { status: authStatus } = useAuth();
  const isAuthenticated = authStatus === 'authenticated';

  // F03 multi-tenancy context
  const { context } = useContextSwitcher();
  const orgId = context.organisation?.id;
  const projectId = context.project?.id;

  // T017: Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!orgId) {
      console.warn('[F04] Cannot fetch notifications: orgId is required');
      return;
    }

    dispatch({ type: 'FETCH_START' });

    try {
      const response = await api.fetchNotifications(config.apiBaseUrl, {
        org: orgId,
        project: projectId,
        status: state.filters.status,
        type: state.filters.type,
        page: state.pagination.page,
        page_size: state.pagination.pageSize,
      });

      // T069: Filter out malformed notifications
      const validNotifications = response.results
        .map(validateNotification)
        .filter((n): n is NonNullable<typeof n> => n !== null);

      dispatch({
        type: 'FETCH_SUCCESS',
        payload: {
          results: validNotifications,
          count: validNotifications.length,
          page: state.pagination.page,
        },
      });
    } catch (error) {
      // T068: Observability - log structured error
      const logData = formatErrorForLogging('fetch_notifications', error as Error);
      console.error('[F04] Failed to fetch notifications:', logData);

      // T066: User-friendly error handling
      const userError = handleError(error as Error);

      // T066: Special handling for 401 - trigger re-authentication
      if (isAuthenticationError(error as Error)) {
        console.warn('[F04] Authentication expired, user needs to re-authenticate');
        // TODO: Trigger F02 re-auth flow when available
        // For now, just show error in state
      }

      dispatch({ type: 'FETCH_ERROR', payload: error as Error });

      // Show user-friendly error toast
      dispatch({
        type: 'TOAST_ADD',
        payload: {
          toast: {
            id: `error-${Date.now()}`,
            type: 'system.error',
            severity: 'ERROR',
            title: 'Failed to load notifications',
            message: userError.message,
            timestamp: new Date().toISOString(),
            read: false,
            org_id: orgId || '',
            metadata: { context: 'fetch_notifications' },
          },
        },
      });
    }
  }, [config.apiBaseUrl, orgId, projectId, state.filters.status, state.filters.type, state.pagination.page, state.pagination.pageSize]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!orgId || !state.pagination.hasMore || state.loadingMore) {
      return;
    }

    dispatch({ type: 'LOAD_MORE_START' });

    try {
      const nextPage = state.pagination.page + 1;
      const response = await api.fetchNotifications(config.apiBaseUrl, {
        org: orgId,
        project: projectId,
        status: state.filters.status,
        type: state.filters.type,
        page: nextPage,
        page_size: state.pagination.pageSize,
      });

      // T069: Filter out malformed notifications
      const validNotifications = response.results
        .map(validateNotification)
        .filter((n): n is NonNullable<typeof n> => n !== null);

      dispatch({
        type: 'LOAD_MORE_SUCCESS',
        payload: {
          results: validNotifications,
          count: validNotifications.length,
          page: nextPage,
        },
      });
    } catch (error) {
      console.error('[F04] Failed to load more notifications:', error);
      dispatch({ type: 'FETCH_ERROR', payload: error as Error });
    }
  }, [config.apiBaseUrl, orgId, projectId, state.filters.status, state.filters.type, state.pagination.page, state.pagination.pageSize, state.pagination.hasMore, state.loadingMore]);

  // Refresh (reset to page 1)
  const refresh = useCallback(async () => {
    // Reset to page 1 and fetch
    dispatch({ type: 'FILTER_CHANGE', payload: {} }); // Resets page to 1
    await fetchNotifications();
  }, [fetchNotifications]);

  // T018: Optimistic mark as read with rollback on failure
  const markAsRead = useCallback(async (id: string) => {
    const notification = state.notifications.find(n => n.id === id);
    if (!notification) {
      console.warn(`[F04] Notification ${id} not found in local state`);
      return;
    }

    const previousRead = notification.read;

    // Optimistic update
    dispatch({
      type: 'MARK_READ_OPTIMISTIC',
      payload: { id, previousRead },
    });

    try {
      await api.updateReadStatus(config.apiBaseUrl, id, true);
      dispatch({ type: 'MARK_READ_SUCCESS', payload: { id } });
    } catch (error) {
      // T068: Observability - log structured error
      const logData = formatErrorForLogging('mark_as_read', error as Error);
      console.error(`[F04] Failed to mark notification ${id} as read:`, logData);

      // T066: User-friendly error handling
      const userError = handleError(error as Error);

      // Rollback optimistic update
      dispatch({
        type: 'MARK_READ_FAILED',
        payload: { id, previousRead, error: error as Error },
      });

      // Show error toast
      dispatch({
        type: 'TOAST_ADD',
        payload: {
          toast: {
            id: `error-mark-read-${Date.now()}`,
            type: 'system.error',
            severity: 'ERROR',
            title: 'Failed to mark as read',
            message: userError.message,
            timestamp: new Date().toISOString(),
            read: false,
            org_id: state.notifications[0]?.org_id || '',
            metadata: { context: 'mark_as_read', notificationId: id },
          },
        },
      });
    }
  }, [config.apiBaseUrl, state.notifications]);

  // Mark as unread (similar to markAsRead but with read: false)
  const markAsUnread = useCallback(async (id: string) => {
    const notification = state.notifications.find(n => n.id === id);
    if (!notification) {
      console.warn(`[F04] Notification ${id} not found in local state`);
      return;
    }

    const previousRead = notification.read;

    // Optimistic update (set to unread)
    dispatch({
      type: 'MARK_READ_OPTIMISTIC',
      payload: { id, previousRead },
    });

    try {
      await api.updateReadStatus(config.apiBaseUrl, id, false);
      dispatch({ type: 'MARK_READ_SUCCESS', payload: { id } });
    } catch (error) {
      // T068: Observability - log structured error
      const logData = formatErrorForLogging('mark_as_unread', error as Error);
      console.error(`[F04] Failed to mark notification ${id} as unread:`, logData);

      // T066: User-friendly error handling
      const userError = handleError(error as Error);

      // Rollback optimistic update
      dispatch({
        type: 'MARK_READ_FAILED',
        payload: { id, previousRead, error: error as Error },
      });

      // Show error toast
      dispatch({
        type: 'TOAST_ADD',
        payload: {
          toast: {
            id: `error-mark-unread-${Date.now()}`,
            type: 'system.error',
            severity: 'ERROR',
            title: 'Failed to mark as unread',
            message: userError.message,
            timestamp: new Date().toISOString(),
            read: false,
            org_id: state.notifications[0]?.org_id || '',
            metadata: { context: 'mark_as_unread', notificationId: id },
          },
        },
      });
    }
  }, [config.apiBaseUrl, state.notifications]);

  // T019: Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!orgId) {
      console.warn('[F04] Cannot mark all as read: orgId is required');
      return;
    }

    try {
      const response = await api.markAllRead(config.apiBaseUrl, {
        org_id: orgId,
        project_id: projectId,
        filters: {
          status: 'unread',
          ...(state.filters.type && { type: state.filters.type }),
        },
      });

      console.log(`[F04] Marked ${response.updated_count} notifications as read`);

      // Refetch to get updated state
      await fetchNotifications();
    } catch (error) {
      console.error('[F04] Failed to mark all as read:', error);
      dispatch({ type: 'FETCH_ERROR', payload: error as Error });
    }
  }, [config.apiBaseUrl, orgId, projectId, state.filters.type, fetchNotifications]);

  const setFilters = useCallback((filters: Partial<NotificationsState['filters']>) => {
    dispatch({ type: 'FILTER_CHANGE', payload: filters });
  }, []);

  const openPanel = useCallback(() => {
    dispatch({ type: 'PANEL_OPEN' });
  }, []);

  const closePanel = useCallback(() => {
    dispatch({ type: 'PANEL_CLOSE' });
  }, []);

  const togglePanel = useCallback(() => {
    if (state.panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }, [state.panelOpen, openPanel, closePanel]);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'TOAST_DISMISS', payload: { id } });
  }, []);

  const pausePolling = useCallback(() => {
    isPollingActiveRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const resumePolling = useCallback(() => {
    isPollingActiveRef.current = true;
    // Polling will restart via effect
  }, []);

  // T014: Polling logic with Page Visibility API
  useEffect(() => {
    const interval = config.pollingInterval || 30000;

    const startPolling = () => {
      if (!isPollingActiveRef.current) return;

      pollingIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible' && isPollingActiveRef.current) {
          fetchNotifications();
        }
      }, interval);
    };

    // Initial fetch
    fetchNotifications();

    // Start polling
    startPolling();

    // Pause polling when document hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else if (document.visibilityState === 'visible' && isPollingActiveRef.current) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.pollingInterval, fetchNotifications]);

  // T015: F03 context change subscription
  useEffect(() => {
    dispatch({ type: 'CONTEXT_CHANGE' });
    fetchNotifications();
  }, [orgId, projectId, fetchNotifications]);

  // T016: F02 auth change subscription
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'CONTEXT_CHANGE' }); // Clear state
      pausePolling();
    } else {
      resumePolling();
    }
  }, [isAuthenticated, pausePolling, resumePolling]);

  const contextValue = {
    ...state,
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
    isPollingActive: isPollingActiveRef.current,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
}
