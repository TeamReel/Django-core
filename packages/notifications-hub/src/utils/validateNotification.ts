import { Notification, NotificationSeverity } from '@/types';

const SEVERITY_VALUES: NotificationSeverity[] = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'];

export function validateNotification(data: any): Notification | null {
  try {
    // Required fields check
    if (!data.id || typeof data.id !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid id', data);
      return null;
    }

    if (!data.type || typeof data.type !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid type', data);
      return null;
    }

    if (!data.title || typeof data.title !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid title', data);
      return null;
    }

    if (!data.message || typeof data.message !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid message', data);
      return null;
    }

    if (!data.timestamp || typeof data.timestamp !== 'string') {
      console.warn('[F04] Invalid notification: missing or invalid timestamp', data);
      return null;
    }

    // Severity validation with fallback
    if (!SEVERITY_VALUES.includes(data.severity)) {
      console.warn('[F04] Invalid severity, defaulting to INFO', data);
      data.severity = 'INFO';
    }

    // Timestamp validation
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      console.warn('[F04] Invalid timestamp format', data);
      return null;
    }

    // Truncate title/message if too long
    if (data.title.length > 200) {
      data.title = data.title.substring(0, 197) + '...';
    }
    if (data.message.length > 1000) {
      data.message = data.message.substring(0, 997) + '...';
    }

    return data as Notification;
  } catch (error) {
    console.error('[F04] Notification validation error', error, data);
    return null;
  }
}
