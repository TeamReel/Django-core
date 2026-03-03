// Placeholder - will populate with actual types in WP02-WP06

/**
 * Severity levels for alerts and status indicators
 */
export type Severity = 'info' | 'success' | 'warning' | 'error';

/**
 * Resource usage data structure
 */
export interface ResourceUsageData {
  value: number;
  max: number;
  unit?: string;
  label?: string;
}

/**
 * Health status for services
 */
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthStatusData {
  name: string;
  status: HealthStatusType;
  lastChecked?: Date;
}
