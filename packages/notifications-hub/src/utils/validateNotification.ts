import { Notification, NotificationSeverity } from '@/types';

const SEVERITY_VALUES: NotificationSeverity[] = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'];

/**
 * Log malformed notification data with structured context
 *
 * @param reason Validation failure reason
 * @param data Raw notification data
 */
function logMalformedNotification(reason: string, data: any): void {
  console.warn('[F04] Malformed notification:', {
    timestamp: new Date().toISOString(),
    reason,
    data: JSON.stringify(data, null, 2),
    context: 'validateNotification',
  });
}

/**
 * Validate notification payload from backend API
 *
 * Filters out invalid notifications and logs them for observability.
 * Returns null for invalid data (which will be excluded from display).
 *
 * @param data Raw notification data from API
 * @returns Validated Notification or null if invalid
 */
export function validateNotification(data: any): Notification | null {
  try {
    // Required fields check
    if (!data.id || typeof data.id !== 'string') {
      logMalformedNotification('Missing or invalid id field', data);
      return null;
    }

    if (!data.type || typeof data.type !== 'string') {
      logMalformedNotification('Missing or invalid type field', data);
      return null;
    }

    if (!data.title || typeof data.title !== 'string') {
      logMalformedNotification('Missing or invalid title field', data);
      return null;
    }

    if (!data.message || typeof data.message !== 'string') {
      logMalformedNotification('Missing or invalid message field', data);
      return null;
    }

    if (!data.timestamp || typeof data.timestamp !== 'string') {
      logMalformedNotification('Missing or invalid timestamp field', data);
      return null;
    }

    // Severity validation with fallback
    if (!SEVERITY_VALUES.includes(data.severity)) {
      console.warn('[F04] Invalid severity, defaulting to INFO:', {
        timestamp: new Date().toISOString(),
        receivedSeverity: data.severity,
        defaultSeverity: 'INFO',
        notificationId: data.id,
      });
      data.severity = 'INFO';
    }

    // Timestamp validation
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      logMalformedNotification('Invalid ISO 8601 timestamp format', data);
      return null;
    }

    // Truncate title/message if too long (with logging)
    if (data.title.length > 200) {
      console.warn('[F04] Notification title truncated:', {
        timestamp: new Date().toISOString(),
        notificationId: data.id,
        originalLength: data.title.length,
        truncatedLength: 200,
      });
      data.title = data.title.substring(0, 197) + '...';
    }
    if (data.message.length > 1000) {
      console.warn('[F04] Notification message truncated:', {
        timestamp: new Date().toISOString(),
        notificationId: data.id,
        originalLength: data.message.length,
        truncatedLength: 1000,
      });
      data.message = data.message.substring(0, 997) + '...';
    }

    return data as Notification;
  } catch (error) {
    console.error('[F04] Notification validation exception:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      data: JSON.stringify(data, null, 2),
    });
    return null;
  }
}
