/**
 * Utility functions for HealthStatus component
 */

export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Map health status to F01 color token
 * @param status - Health status type
 * @returns CSS custom property with fallback
 */
export const getStatusColor = (status: HealthStatusType): string => {
  switch (status) {
    case 'healthy':
      return 'var(--color-success-600, #16a34a)'; // Green
    case 'degraded':
      return 'var(--color-warning-600, #d97706)'; // Yellow/Orange
    case 'unhealthy':
      return 'var(--color-error-600, #dc2626)'; // Red
    case 'unknown':
      return 'var(--color-neutral-500, #6b7280)'; // Gray
  }
};

/**
 * Get human-readable status label
 * @param status - Health status type
 * @returns Human-readable label
 */
export const getStatusLabel = (status: HealthStatusType): string => {
  switch (status) {
    case 'healthy':
      return 'Operational';
    case 'degraded':
      return 'Degraded';
    case 'unhealthy':
      return 'Down';
    case 'unknown':
      return 'Unknown';
  }
};

/**
 * Get icon character for status (Unicode symbols)
 * @param status - Health status type
 * @returns Unicode character for icon
 */
export const getStatusIcon = (status: HealthStatusType): string => {
  switch (status) {
    case 'healthy':
      return '✓'; // Checkmark
    case 'degraded':
      return '⚠'; // Warning triangle
    case 'unhealthy':
      return '✕'; // X mark
    case 'unknown':
      return '?'; // Question mark
  }
};

/**
 * Format relative time (e.g., "2 minutes ago")
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
};
