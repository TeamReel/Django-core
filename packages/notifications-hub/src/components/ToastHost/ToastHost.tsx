import React, { useEffect, useState, useCallback } from 'react';
import { Notification, NotificationSeverity } from '@/types';
import { Toast } from './Toast';
import { ToastContainer, ToastPosition } from './ToastContainer';

export interface ToastHostConfig {
  position?: ToastPosition;
  maxVisible?: number;
  defaultDuration?: {
    INFO: number;
    SUCCESS: number;
    WARNING: number;
    ERROR: number | null;
    CRITICAL: number | null;
  };
}

export interface ToastHostProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onAction?: (notificationId: string, actionId: string) => void;
  config?: ToastHostConfig;
}

interface TimerEntry {
  id: string;
  timerId: number;
}

const DEFAULT_CONFIG: Required<ToastHostConfig> = {
  position: 'top-right',
  maxVisible: 3,
  defaultDuration: {
    INFO: 5000,
    SUCCESS: 5000,
    WARNING: 9000,
    ERROR: null, // Manual dismiss
    CRITICAL: null, // Manual dismiss
  },
};

/**
 * Toast queue manager component.
 * Manages toast display lifecycle, auto-dismiss timers, and visibility limits.
 *
 * Features:
 * - Maximum 3 visible toasts at once
 * - Auto-dismiss based on severity (INFO/SUCCESS: 4-6s, WARNING: 8-10s, ERROR/CRITICAL: manual)
 * - Newest toasts appear on top
 * - Integrates with NotificationsContext for state updates
 *
 * @example
 * ```tsx
 * <ToastHost
 *   notifications={toastNotifications}
 *   onDismiss={handleDismiss}
 *   onAction={handleAction}
 *   config={{ position: 'top-right', maxVisible: 3 }}
 * />
 * ```
 */
export function ToastHost({
  notifications,
  onDismiss,
  onAction,
  config = {},
}: ToastHostProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [timers, setTimers] = useState<TimerEntry[]>([]);

  // Get severity variant for Toast styling
  const getSeverityVariant = (severity: NotificationSeverity): 'info' | 'success' | 'warning' | 'error' => {
    switch (severity) {
      case 'INFO':
        return 'info';
      case 'SUCCESS':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'ERROR':
      case 'CRITICAL':
        return 'error';
      default:
        return 'info';
    }
  };

  // Get duration for notification based on severity
  const getDuration = (severity: NotificationSeverity): number | null => {
    return mergedConfig.defaultDuration[severity];
  };

  // Clear timer for a notification
  const clearTimer = useCallback((notificationId: string) => {
    setTimers((prev) => {
      const entry = prev.find((t) => t.id === notificationId);
      if (entry) {
        window.clearTimeout(entry.timerId);
        return prev.filter((t) => t.id !== notificationId);
      }
      return prev;
    });
  }, []);

  // Handle dismiss with timer cleanup
  const handleDismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      onDismiss(id);
    },
    [clearTimer, onDismiss]
  );

  // Setup auto-dismiss timers for new notifications
  useEffect(() => {
    const visibleNotifications = notifications.slice(0, mergedConfig.maxVisible);

    visibleNotifications.forEach((notification) => {
      const duration = getDuration(notification.severity);

      // Only set timer if duration is specified (not null for manual dismiss)
      if (duration !== null && !timers.some((t) => t.id === notification.id)) {
        const timerId = window.setTimeout(() => {
          handleDismiss(notification.id);
        }, duration);

        setTimers((prev) => [...prev, { id: notification.id, timerId }]);
      }
    });

    // Cleanup timers for notifications no longer visible
    const visibleIds = new Set(visibleNotifications.map((n) => n.id));
    timers.forEach((timer) => {
      if (!visibleIds.has(timer.id)) {
        window.clearTimeout(timer.timerId);
      }
    });

    setTimers((prev) => prev.filter((t) => visibleIds.has(t.id)));

    // Cleanup on unmount
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer.timerId));
    };
  }, [notifications, mergedConfig.maxVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Limit to max visible toasts (newest first)
  const visibleToasts = notifications.slice(0, mergedConfig.maxVisible);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <ToastContainer position={mergedConfig.position}>
      {visibleToasts.map((notification) => (
        <div key={notification.id} style={{ pointerEvents: 'auto' }}>
          <Toast
            notification={notification}
            variant={getSeverityVariant(notification.severity)}
            duration={getDuration(notification.severity)}
            onDismiss={handleDismiss}
            onAction={onAction}
          />
        </div>
      ))}
    </ToastContainer>
  );
}
