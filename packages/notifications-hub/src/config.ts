/**
 * Default notification mappings configuration
 *
 * Maps notification types to display settings (toast variants, durations, icons, etc.)
 */

import { NotificationTypeMapping } from '@/types';

export const defaultNotificationMappings: NotificationTypeMapping = {
  'job.completed': {
    severity: 'SUCCESS',
    toastVariant: 'success',
    toastDuration: 5000,
    showInToast: true,
    showInInbox: true,
    icon: 'CheckCircle',
  },
  'job.failed': {
    severity: 'ERROR',
    toastVariant: 'error',
    toastDuration: null, // Manual dismiss
    showInToast: true,
    showInInbox: true,
    icon: 'XCircle',
  },
  'access.granted': {
    severity: 'SUCCESS',
    toastVariant: 'success',
    toastDuration: 5000,
    showInToast: true,
    showInInbox: true,
    icon: 'CheckCircle',
  },
  'access.revoked': {
    severity: 'WARNING',
    toastVariant: 'warning',
    toastDuration: 10000,
    showInToast: true,
    showInInbox: true,
    icon: 'AlertTriangle',
  },
  'system.error': {
    severity: 'ERROR',
    toastVariant: 'error',
    toastDuration: null, // Manual dismiss
    showInToast: true,
    showInInbox: true,
    icon: 'XCircle',
  },
  'system.maintenance': {
    severity: 'WARNING',
    toastVariant: 'warning',
    toastDuration: null, // Manual dismiss
    showInToast: true,
    showInInbox: true,
    icon: 'AlertTriangle',
  },
};
