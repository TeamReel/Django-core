/**
 * Custom Notification Type Mappings Example
 *
 * This example shows how to override default notification type mappings
 * to customize severity levels and icons for your application-specific
 * notification types.
 */

import React from 'react';
import { NotificationsProvider } from '@django-core/notifications-hub';
import type { NotificationTypeMapping } from '@django-core/notifications-hub';

/**
 * Define custom mappings for your notification types
 */
const customNotificationMappings: Record<string, NotificationTypeMapping> = {
  // Task management notifications
  'task.assigned': {
    severity: 'INFO',
    icon: 'TaskAssign',
    defaultAction: { label: 'View Task', url: '/tasks/{id}' },
  },
  'task.completed': {
    severity: 'SUCCESS',
    icon: 'TaskCheck',
    defaultAction: { label: 'View Task', url: '/tasks/{id}' },
  },
  'task.overdue': {
    severity: 'WARNING',
    icon: 'Clock',
    defaultAction: { label: 'View Task', url: '/tasks/{id}' },
  },
  'task.cancelled': {
    severity: 'ERROR',
    icon: 'TaskCancel',
  },

  // Payment notifications
  'payment.success': {
    severity: 'SUCCESS',
    icon: 'CreditCard',
    defaultAction: { label: 'View Invoice', url: '/billing/invoices/{id}' },
  },
  'payment.failed': {
    severity: 'ERROR',
    icon: 'CreditCard',
    defaultAction: { label: 'Update Payment', url: '/billing/payment-method' },
  },
  'payment.pending': {
    severity: 'INFO',
    icon: 'Clock',
  },

  // Team notifications
  'team.member_joined': {
    severity: 'INFO',
    icon: 'UserPlus',
    defaultAction: { label: 'View Team', url: '/team' },
  },
  'team.member_left': {
    severity: 'INFO',
    icon: 'UserMinus',
  },
  'team.invitation': {
    severity: 'INFO',
    icon: 'Mail',
    defaultAction: { label: 'Accept Invitation', url: '/team/invitations/{id}' },
  },

  // System notifications
  'system.maintenance': {
    severity: 'WARNING',
    icon: 'AlertTriangle',
  },
  'system.update_available': {
    severity: 'INFO',
    icon: 'Download',
    defaultAction: { label: 'Update Now', url: '/settings/updates' },
  },
  'system.error': {
    severity: 'ERROR',
    icon: 'AlertCircle',
  },

  // Project notifications
  'project.created': {
    severity: 'SUCCESS',
    icon: 'FolderPlus',
    defaultAction: { label: 'View Project', url: '/projects/{id}' },
  },
  'project.archived': {
    severity: 'INFO',
    icon: 'Archive',
  },
  'project.deadline_approaching': {
    severity: 'WARNING',
    icon: 'Calendar',
    defaultAction: { label: 'View Project', url: '/projects/{id}' },
  },
};

/**
 * App with custom notification mappings
 */
export function AppWithCustomMappings() {
  return (
    <NotificationsProvider
      config={{
        apiBaseUrl: 'https://api.example.com/api/v1',
        pollingInterval: 30000,
        typeMappings: customNotificationMappings,
      }}
    >
      <YourAppContent />
    </NotificationsProvider>
  );
}

/**
 * Example: Merging custom mappings with defaults
 */
import { defaultNotificationMappings } from '@django-core/notifications-hub/config';

const mergedMappings = {
  ...defaultNotificationMappings,
  ...customNotificationMappings,
};

export function AppWithMergedMappings() {
  return (
    <NotificationsProvider
      config={{
        apiBaseUrl: 'https://api.example.com/api/v1',
        typeMappings: mergedMappings,
      }}
    >
      <YourAppContent />
    </NotificationsProvider>
  );
}

/**
 * Example: Dynamic mappings based on user preferences
 */
export function AppWithDynamicMappings() {
  const [userPreferences, setUserPreferences] = React.useState({
    taskNotificationsEnabled: true,
    paymentNotificationsEnabled: true,
    severityOverrides: {} as Record<string, 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'>,
  });

  const dynamicMappings = React.useMemo(() => {
    const mappings = { ...customNotificationMappings };

    // Apply user severity overrides
    Object.entries(userPreferences.severityOverrides).forEach(([type, severity]) => {
      if (mappings[type]) {
        mappings[type] = { ...mappings[type], severity };
      }
    });

    // Filter out disabled notification types
    if (!userPreferences.taskNotificationsEnabled) {
      Object.keys(mappings).forEach((key) => {
        if (key.startsWith('task.')) {
          delete mappings[key];
        }
      });
    }

    if (!userPreferences.paymentNotificationsEnabled) {
      Object.keys(mappings).forEach((key) => {
        if (key.startsWith('payment.')) {
          delete mappings[key];
        }
      });
    }

    return mappings;
  }, [userPreferences]);

  return (
    <NotificationsProvider
      config={{
        apiBaseUrl: 'https://api.example.com/api/v1',
        typeMappings: dynamicMappings,
      }}
    >
      <YourAppContent />
    </NotificationsProvider>
  );
}

/**
 * Example: Fallback mapping for unknown types
 */
const mappingsWithFallback: Record<string, NotificationTypeMapping> = {
  ...customNotificationMappings,
  // Catch-all for unknown notification types
  '*': {
    severity: 'INFO',
    icon: 'Info',
    defaultAction: undefined,
  },
};

export function AppWithFallbackMapping() {
  return (
    <NotificationsProvider
      config={{
        apiBaseUrl: 'https://api.example.com/api/v1',
        typeMappings: mappingsWithFallback,
      }}
    >
      <YourAppContent />
    </NotificationsProvider>
  );
}

// Placeholder component
function YourAppContent() {
  return (
    <div>
      <h1>Your App</h1>
      <p>Notifications will use custom type mappings</p>
    </div>
  );
}
