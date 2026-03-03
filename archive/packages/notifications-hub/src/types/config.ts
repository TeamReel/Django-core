import { NotificationSeverity, NotificationAction } from './notification';

export interface NotificationDisplayConfig {
  severity?: NotificationSeverity;
  toastVariant?: 'info' | 'success' | 'warning' | 'error';
  toastDuration?: number | null;
  showInToast?: boolean;
  showInInbox?: boolean;
  action?: NotificationAction;
  icon?: string;
}

export interface NotificationTypeMapping {
  [notificationType: string]: NotificationDisplayConfig;
}

export interface NotificationsConfig {
  apiBaseUrl: string;
  pollingInterval?: number;
  maxToasts?: number;
  pageSize?: number;
  toastPosition?: {
    desktop: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
    mobile: 'top-center' | 'bottom-center';
  };
  debug?: boolean;
}
