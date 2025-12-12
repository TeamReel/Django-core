import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function formatTimestamp(timestamp: string, mode: 'relative' | 'absolute' = 'relative'): string {
  try {
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    if (mode === 'relative') {
      // "5 minutes ago", "2 hours ago"
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // Absolute format
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  } catch (error) {
    console.error('[F04] Timestamp formatting error', error);
    return timestamp;
  }
}
