export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface NotificationAction {
  label: string;
  type: 'navigate' | 'api';
  target: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: string;
  severity: NotificationSeverity;
  category?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  org_id: string;
  project_id?: string | null;
  metadata?: Record<string, any>;
  action?: NotificationAction;
}
