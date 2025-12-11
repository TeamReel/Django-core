import { applyNotificationMapping, getToastVariant } from './notificationMapper';
import { Notification, NotificationTypeMapping } from '@/types';

describe('applyNotificationMapping', () => {
  const notification: Notification = {
    id: '123',
    type: 'job.completed',
    severity: 'INFO',
    title: 'Test',
    message: 'Test message',
    timestamp: '2025-12-11T14:30:00Z',
    read: false,
    org_id: 'org-123',
  };

  it('should apply default config when no mapping exists', () => {
    const result = applyNotificationMapping(notification, {});
    expect(result.displayConfig).toMatchObject({
      toastVariant: 'info',
      toastDuration: 5000,
      showInToast: true,
      showInInbox: true,
    });
  });

  it('should preserve original notification properties', () => {
    const result = applyNotificationMapping(notification, {});
    expect(result.id).toBe('123');
    expect(result.type).toBe('job.completed');
    expect(result.title).toBe('Test');
    expect(result.message).toBe('Test message');
  });

  it('should apply custom type mapping', () => {
    const mappings: NotificationTypeMapping = {
      'job.completed': {
        severity: 'SUCCESS',
        toastVariant: 'success',
        toastDuration: 3000,
        icon: 'CheckCircle',
      },
    };

    const result = applyNotificationMapping(notification, mappings);
    expect(result.severity).toBe('SUCCESS');
    expect(result.displayConfig.toastVariant).toBe('success');
    expect(result.displayConfig.toastDuration).toBe(3000);
    expect(result.displayConfig.icon).toBe('CheckCircle');
  });

  it('should override severity if specified in mapping', () => {
    const mappings: NotificationTypeMapping = {
      'job.completed': { severity: 'SUCCESS' },
    };
    const result = applyNotificationMapping(notification, mappings);
    expect(result.severity).toBe('SUCCESS');
  });

  it('should not override severity if not specified in mapping', () => {
    const mappings: NotificationTypeMapping = {
      'job.completed': { toastDuration: 3000 },
    };
    const result = applyNotificationMapping(notification, mappings);
    expect(result.severity).toBe('INFO');
  });

  it('should merge default and custom configs', () => {
    const mappings: NotificationTypeMapping = {
      'job.completed': {
        toastDuration: 3000,
        icon: 'CheckCircle',
      },
    };

    const result = applyNotificationMapping(notification, mappings);
    // Custom values
    expect(result.displayConfig.toastDuration).toBe(3000);
    expect(result.displayConfig.icon).toBe('CheckCircle');
    // Default values preserved
    expect(result.displayConfig.toastVariant).toBe('info');
    expect(result.displayConfig.showInToast).toBe(true);
    expect(result.displayConfig.showInInbox).toBe(true);
  });

  it('should handle notification types not in mapping', () => {
    const mappings: NotificationTypeMapping = {
      'other.type': { severity: 'SUCCESS' },
    };
    const result = applyNotificationMapping(notification, mappings);
    expect(result.displayConfig).toMatchObject({
      toastVariant: 'info',
      toastDuration: 5000,
      showInToast: true,
      showInInbox: true,
    });
  });

  it('should handle null duration for manual dismiss', () => {
    const mappings: NotificationTypeMapping = {
      'job.completed': { toastDuration: null },
    };
    const result = applyNotificationMapping(notification, mappings);
    expect(result.displayConfig.toastDuration).toBeNull();
  });
});

describe('getToastVariant', () => {
  it('should map severity to toast variant', () => {
    expect(getToastVariant('INFO')).toBe('info');
    expect(getToastVariant('SUCCESS')).toBe('success');
    expect(getToastVariant('WARNING')).toBe('warning');
    expect(getToastVariant('ERROR')).toBe('error');
    expect(getToastVariant('CRITICAL')).toBe('error');
  });

  it('should default to info for unknown severity', () => {
    expect(getToastVariant('UNKNOWN')).toBe('info');
    expect(getToastVariant('')).toBe('info');
    expect(getToastVariant('random')).toBe('info');
  });

  it('should be case-sensitive', () => {
    expect(getToastVariant('info')).toBe('info'); // lowercase falls through to default
    expect(getToastVariant('Success')).toBe('info'); // mixed case falls through to default
  });
});
