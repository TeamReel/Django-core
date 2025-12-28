import { Notification, NotificationTypeMapping, NotificationDisplayConfig } from '../types';

export function applyNotificationMapping(
  notification: Notification,
  typeMappings: NotificationTypeMapping
): Notification & { displayConfig: NotificationDisplayConfig } {
  const defaultConfig: NotificationDisplayConfig = {
    toastVariant: 'info',
    toastDuration: 5000,
    showInToast: true,
    showInInbox: true,
  };

  const typeConfig = typeMappings[notification.type] || {};

  // Merge configs: custom type mapping overrides defaults
  const displayConfig: NotificationDisplayConfig = {
    ...defaultConfig,
    ...typeConfig,
  };

  // Create result with severity override if specified in mapping (without mutating original)
  const result = {
    ...notification,
    displayConfig,
  };

  // Override severity if specified in mapping
  if (displayConfig.severity && displayConfig.severity !== notification.severity) {
    result.severity = displayConfig.severity;
  }

  return result;
}

export function getToastVariant(severity: string): 'info' | 'success' | 'warning' | 'error' {
  const map: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'error',
  };
  return map[severity] || 'info';
}
