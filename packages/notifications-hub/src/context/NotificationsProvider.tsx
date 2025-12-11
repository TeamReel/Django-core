import React, { useReducer, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContext as useF03Context } from '@django-core/context-switcher';
import { NotificationsContext, NotificationsState } from './NotificationsContext';
import { notificationsReducer, initialState } from './notificationsReducer';
import { NotificationsConfig, NotificationTypeMapping } from '@/types';
import { defaultNotificationMappings } from '@/config';

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
  const { isAuthenticated } = useAuth();

  // F03 multi-tenancy context
  const { orgId, projectId } = useF03Context();

  // Actions will be implemented in T017-T019 (WP04)
  // Placeholder implementations for now
  const fetchNotifications = useCallback(async () => {
    console.log('[F04] fetchNotifications called');
  }, []);

  const loadMore = useCallback(async () => {
    console.log('[F04] loadMore called');
  }, []);

  const refresh = useCallback(async () => {
    console.log('[F04] refresh called');
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    console.log('[F04] markAsRead called', id);
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    console.log('[F04] markAsUnread called', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    console.log('[F04] markAllAsRead called');
  }, []);

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
