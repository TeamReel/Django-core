/**
 * API Contract: B18 Platform Observability & Health Monitoring
 *
 * This file defines TypeScript interfaces for B18 (Health Monitoring) API responses.
 * These interfaces serve as contracts between F05 components and the B18 backend.
 *
 * Feature: 027-resource-display-alerts (F05)
 * Backend Dependency: B18 (Platform Observability Foundation)
 * Date: 2025-12-12
 */

// ============================================================================
// Health Status Types
// ============================================================================

/**
 * Overall health status enumeration
 */
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Health check result severity
 */
export type HealthSeverity = 'info' | 'warning' | 'error' | 'critical';

// ============================================================================
// Health Status API
// ============================================================================

/**
 * Response from GET /api/health/status
 *
 * Provides health status for all monitored services and infrastructure components.
 */
export interface HealthStatusResponse {
  /** Overall system health (aggregate of all services) */
  overall: HealthStatusType;
  /** Individual service health statuses */
  services: ServiceHealth[];
  /** Metadata about the health check */
  meta?: {
    /** ISO 8601 timestamp of health check */
    checkedAt: string;
    /** Duration of health check in milliseconds */
    checkDuration?: number;
    /** Health check version/schema */
    version?: string;
  };
}

/**
 * Individual service health status
 */
export interface ServiceHealth {
  /** Service identifier (e.g., "database", "cache", "api") */
  id: string;
  /** Human-readable service name (e.g., "PostgreSQL", "Redis", "External API") */
  name: string;
  /** Current health status */
  status: HealthStatusType;
  /** Optional detailed message (e.g., error description) */
  details?: string;
  /** ISO 8601 timestamp of last successful health check */
  lastChecked: string;
  /** Performance metrics (optional) */
  metrics?: HealthMetrics;
  /** Service dependencies (optional) */
  dependencies?: string[];
  /** Severity level (for alerting) */
  severity?: HealthSeverity;
}

/**
 * Service performance metrics
 */
export interface HealthMetrics {
  /** Average response time in milliseconds */
  responseTime?: number;
  /** Error rate as percentage (0-100) */
  errorRate?: number;
  /** Uptime percentage (0-100) over monitoring period */
  uptime?: number;
  /** Number of active connections (for databases/caches) */
  activeConnections?: number;
  /** Memory usage in MB */
  memoryUsageMB?: number;
  /** CPU usage as percentage (0-100) */
  cpuUsage?: number;
  /** Custom metric key-value pairs */
  custom?: Record<string, number>;
}

// ============================================================================
// Detailed Health Check API (Single Service)
// ============================================================================

/**
 * Response from GET /api/health/services/{serviceId}
 *
 * Provides detailed health information for a specific service.
 */
export interface ServiceHealthDetailResponse {
  service: ServiceHealth;
  /** Historical health data (optional) */
  history?: HealthHistoryEntry[];
  /** Recent incidents/alerts (optional) */
  incidents?: HealthIncident[];
}

/**
 * Historical health data point
 */
export interface HealthHistoryEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Health status at this point */
  status: HealthStatusType;
  /** Response time in milliseconds */
  responseTime?: number;
}

/**
 * Health-related incident
 */
export interface HealthIncident {
  /** Incident identifier */
  id: string;
  /** Incident title */
  title: string;
  /** Incident description */
  description: string;
  /** Severity level */
  severity: HealthSeverity;
  /** ISO 8601 timestamp when incident started */
  startedAt: string;
  /** ISO 8601 timestamp when incident resolved (null if ongoing) */
  resolvedAt?: string | null;
  /** Affected services */
  affectedServices: string[];
}

// ============================================================================
// Normalization Utilities (for F05 components)
// ============================================================================

/**
 * Normalize B18 ServiceHealth to F05 HealthStatus component props
 *
 * @example
 * ```typescript
 * const apiResponse = await fetch('/api/health/status').then(r => r.json());
 * const dbHealth = apiResponse.services.find(s => s.id === 'database');
 * const healthData = normalizeServiceHealth(dbHealth);
 *
 * // Pass to HealthStatus component
 * <HealthStatus
 *   name={healthData.name}
 *   status={healthData.status}
 *   details={healthData.details}
 * />
 * ```
 */
export function normalizeServiceHealth(service: ServiceHealth): {
  name: string;
  status: HealthStatusType;
  details?: string;
  lastChecked?: string;
  metrics?: HealthMetrics;
} {
  return {
    name: service.name,
    status: service.status,
    details: service.details,
    lastChecked: service.lastChecked,
    metrics: service.metrics,
  };
}

/**
 * Determine alert severity from health status
 *
 * Maps health status to F05 Alert severity prop.
 */
export function healthStatusToAlertSeverity(
  status: HealthStatusType
): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'unhealthy':
      return 'error';
    case 'unknown':
    default:
      return 'info';
  }
}

/**
 * Check if any service is unhealthy
 */
export function hasUnhealthyServices(response: HealthStatusResponse): boolean {
  return response.services.some(s => s.status === 'unhealthy');
}

/**
 * Get all services with specific status
 */
export function getServicesByStatus(
  response: HealthStatusResponse,
  status: HealthStatusType
): ServiceHealth[] {
  return response.services.filter(s => s.status === status);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to validate HealthStatusResponse structure
 */
export function isHealthStatusResponse(data: unknown): data is HealthStatusResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  // Check overall status
  if (typeof obj.overall !== 'string') return false;
  const validStatuses: HealthStatusType[] = ['healthy', 'degraded', 'unhealthy', 'unknown'];
  if (!validStatuses.includes(obj.overall as HealthStatusType)) return false;

  // Check services array
  if (!Array.isArray(obj.services)) return false;

  return true;
}

/**
 * Type guard to validate ServiceHealth structure
 */
export function isServiceHealth(data: unknown): data is ServiceHealth {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.lastChecked === 'string'
  );
}

// ============================================================================
// Mock Data (for testing/Storybook)
// ============================================================================

/**
 * Mock health status response with all services healthy
 */
export const mockHealthyStatusResponse: HealthStatusResponse = {
  overall: 'healthy',
  services: [
    {
      id: 'database',
      name: 'PostgreSQL',
      status: 'healthy',
      details: 'All connections active',
      lastChecked: '2025-12-12T15:00:00Z',
      metrics: {
        responseTime: 12,
        errorRate: 0,
        uptime: 99.98,
        activeConnections: 25,
      },
    },
    {
      id: 'cache',
      name: 'Redis',
      status: 'healthy',
      details: 'Cache hit rate: 95%',
      lastChecked: '2025-12-12T15:00:00Z',
      metrics: {
        responseTime: 3,
        errorRate: 0,
        uptime: 99.99,
        memoryUsageMB: 512,
      },
    },
    {
      id: 'api',
      name: 'External API',
      status: 'healthy',
      lastChecked: '2025-12-12T15:00:00Z',
      metrics: {
        responseTime: 150,
        errorRate: 0.1,
        uptime: 99.5,
      },
    },
  ],
  meta: {
    checkedAt: '2025-12-12T15:00:00Z',
    checkDuration: 250,
    version: '1.0',
  },
};

/**
 * Mock health status with degraded service
 */
export const mockDegradedStatusResponse: HealthStatusResponse = {
  overall: 'degraded',
  services: [
    {
      id: 'database',
      name: 'PostgreSQL',
      status: 'healthy',
      lastChecked: '2025-12-12T15:00:00Z',
      metrics: {
        responseTime: 12,
        errorRate: 0,
        uptime: 99.98,
      },
    },
    {
      id: 'cache',
      name: 'Redis',
      status: 'degraded',
      details: 'High memory usage (85%)',
      lastChecked: '2025-12-12T15:00:00Z',
      severity: 'warning',
      metrics: {
        responseTime: 45,
        errorRate: 2.5,
        uptime: 98.5,
        memoryUsageMB: 850,
      },
    },
    {
      id: 'api',
      name: 'External API',
      status: 'healthy',
      lastChecked: '2025-12-12T15:00:00Z',
      metrics: {
        responseTime: 150,
        errorRate: 0.1,
        uptime: 99.5,
      },
    },
  ],
  meta: {
    checkedAt: '2025-12-12T15:00:00Z',
    checkDuration: 300,
    version: '1.0',
  },
};

/**
 * Mock health status with unhealthy service
 */
export const mockUnhealthyStatusResponse: HealthStatusResponse = {
  overall: 'unhealthy',
  services: [
    {
      id: 'database',
      name: 'PostgreSQL',
      status: 'unhealthy',
      details: 'Connection timeout after 5000ms',
      lastChecked: '2025-12-12T15:00:00Z',
      severity: 'critical',
      metrics: {
        responseTime: 5000,
        errorRate: 100,
        uptime: 95.2,
      },
    },
    {
      id: 'cache',
      name: 'Redis',
      status: 'healthy',
      lastChecked: '2025-12-12T15:00:00Z',
      metrics: {
        responseTime: 3,
        errorRate: 0,
        uptime: 99.99,
      },
    },
    {
      id: 'api',
      name: 'External API',
      status: 'degraded',
      details: 'Intermittent 503 errors',
      lastChecked: '2025-12-12T15:00:00Z',
      severity: 'warning',
      metrics: {
        responseTime: 350,
        errorRate: 15.5,
        uptime: 97.8,
      },
    },
  ],
  meta: {
    checkedAt: '2025-12-12T15:00:00Z',
    checkDuration: 6500,
    version: '1.0',
  },
};

/**
 * Mock unknown health status (service not responding)
 */
export const mockUnknownStatusResponse: HealthStatusResponse = {
  overall: 'unknown',
  services: [
    {
      id: 'database',
      name: 'PostgreSQL',
      status: 'unknown',
      details: 'Health check failed to execute',
      lastChecked: '2025-12-12T14:45:00Z', // 15 minutes ago
      severity: 'warning',
    },
  ],
  meta: {
    checkedAt: '2025-12-12T15:00:00Z',
    checkDuration: 100,
    version: '1.0',
  },
};
