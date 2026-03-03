export interface UsageEvent {
  id: string;
  timestamp: string;
  event_type: string;
  user?: any;
  user_email?: string;
  user_full_name?: string;
  organization?: any;
  organization_name?: string;
  project?: any;
  project_name?: string;
  metadata: Record<string, any>;
}

export const EVENT_TYPE_OPTIONS = [
  { value: 'user.login', label: 'User Login' },
  { value: 'user.logout', label: 'User Logout' },
  { value: 'user.profile_updated', label: 'User Profile Updated' },
  { value: 'project.created', label: 'Project Created' },
  { value: 'project.updated', label: 'Project Updated' },
  { value: 'project.archived', label: 'Project Archived' },
  { value: 'project.deleted', label: 'Project Deleted' },
  { value: 'organization.settings_changed', label: 'Organization Settings Changed' },
  { value: 'organization.member_added', label: 'Organization Member Added' },
  { value: 'organization.member_removed', label: 'Organization Member Removed' },
  { value: 'api.request', label: 'API Request' },
  { value: 'feature.enabled', label: 'Feature Enabled' },
  { value: 'feature.disabled', label: 'Feature Disabled' },
  { value: 'notification.sent', label: 'Notification Sent' },
  { value: 'notification.read', label: 'Notification Read' },
  { value: 'document.uploaded', label: 'Document Uploaded' },
  { value: 'document.downloaded', label: 'Document Downloaded' },
  { value: 'search.performed', label: 'Search Performed' },
  { value: 'export.generated', label: 'Export Generated' },
  { value: 'import.completed', label: 'Import Completed' },
  { value: 'permission.granted', label: 'Permission Granted' },
  { value: 'permission.revoked', label: 'Permission Revoked' },
  { value: 'audit.log_viewed', label: 'Audit Log Viewed' },
  { value: 'session.expired', label: 'Session Expired' },
] as const;
