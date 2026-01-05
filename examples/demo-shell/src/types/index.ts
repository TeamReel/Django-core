/**
 * Shared Type Definitions for Demo Shell
 *
 * Types for API responses, entities, and domain models.
 * Aligned with B05-B15 backend contracts.
 */

/**
 * User entity
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  avatar_url?: string;
}

/**
 * Organisation entity
 */
export interface Organisation {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  member_count?: number;
  project_count?: number;
  credit_balance?: number;
  marketing_hub_balance?: number;
  is_active?: boolean;
  enable_theme_toggle?: boolean;
  created_at?: string;
  updated_at?: string;
  logo_url?: string;
  user_role?: 'admin' | 'member';
}

/**
 * Project entity
 */
export interface Project {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  organisation_id: string;
  member_count?: number;
  is_active: boolean;
  is_private?: boolean;
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'archived' | 'completed';
  current_user_access?: {
    effective_role: string;
    source: string;
    permissions: string[];
  };
}

/**
 * Audit event entity
 */
export interface AuditEvent {
  id: string;
  event_type: string;
  timestamp: string;
  user?: User;
  organisation_id?: string;
  project_id?: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  details?: string;
}

/**
 * Permission entity
 */
export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource_type?: string;
  action?: string;
}

/**
 * Role entity
 */
export interface Role {
  id: string;
  name: 'admin' | 'member' | 'viewer';
  description?: string;
  permissions?: Permission[];
}

/**
 * RoleAssignment tracking
 */
export interface RoleAssignment {
  id: string;
  user_id: string;
  organisation_id?: string;
  project_id?: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
}

/**
 * Health status from B18 module
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  checks?: {
    database?: boolean;
    cache?: boolean;
    api?: boolean;
    [key: string]: boolean | undefined;
  };
  details?: string;
}

/**
 * Observability metrics from B18 module
 */
export interface ObservabilityMetrics {
  timestamp: string;
  response_time_p99?: number;
  response_time_p95?: number;
  error_rate?: number;
  request_count?: number;
  active_connections?: number;
  cpu_usage?: number;
  memory_usage?: number;
  [key: string]: unknown;
}

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  rollout_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Credit transaction
 */
export interface CreditTransaction {
  id: string;
  organisation_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'adjustment';
  description?: string;
  timestamp: string;
  balance_after?: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp?: string;
    version?: string;
  };
}

/**
 * Paginated list response
 */
export interface ListResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
  page_size?: number;
  total_pages?: number;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  detail?: string;
  code?: string;
  status?: number;
}

/**
 * Request state for async operations
 */
export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  offset?: number;
  limit?: number;
}

/**
 * Sort/filter parameters
 */
export interface FilterParams {
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

/**
 * Context for multi-tenancy
 */
export interface TenancyContext {
  organisation_id?: string;
  project_id?: string;
  user_id?: string;
}
