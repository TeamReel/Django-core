/**
 * Core Type Definitions for Frontend-Backend Integration Guides
 *
 * These types define the interface patterns documented in the integration guides.
 * Downstream products should implement these interfaces with their chosen state
 * management and HTTP client libraries.
 *
 * @packageDocumentation
 */

// ============================================================================
// Request State Types
// ============================================================================

/**
 * Represents the state of an async operation (API call, data fetch, etc.)
 *
 * Use this discriminated union for exhaustive type checking in components.
 *
 * @example
 * ```typescript
 * const [state, setState] = useState<RequestState<User>>({ status: 'idle' });
 *
 * if (state.status === 'success') {
 *   console.log(state.data.name); // Type-safe access
 * }
 * ```
 */
export type RequestState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

// ============================================================================
// User and Authentication Types
// ============================================================================

/**
 * Represents an authenticated user
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User's permission strings (e.g., "projects.create", "orgs.admin") */
  permissions: string[];
}

/**
 * Login credentials
 */
export interface Credentials {
  /** User's email address */
  email: string;
  /** User's password (never logged or stored in localStorage) */
  password: string;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Represents an organization in the system
 */
export interface Organization {
  /** Unique organization identifier */
  id: string;
  /** Organization display name */
  name: string;
  /** URL-safe organization slug */
  slug: string;
}

/**
 * Represents a project within an organization
 */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project display name */
  name: string;
  /** Parent organization identifier */
  organizationId: string;
}

// ============================================================================
// HTTP Request/Response Types
// ============================================================================

/**
 * Options for HTTP requests via ApiClient
 */
export interface RequestOptions {
  /** Additional headers to merge with defaults */
  headers?: Record<string, string>;
  /** Query parameters to append to URL */
  params?: Record<string, string>;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** Skip authentication header injection (for public endpoints) */
  skipAuth?: boolean;
  /** Skip context header injection (rare, use with caution) */
  skipContext?: boolean;
}

/**
 * Standardized API response wrapper
 *
 * @template T - The expected response data type
 */
export interface ApiResponse<T> {
  /** Parsed response body */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Headers;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error for API-related errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thrown when user lacks permissions (HTTP 403)
 */
export class PermissionDeniedError extends ApiError {
  constructor(message: string = 'Permission denied', response?: unknown) {
    super(message, 403, response);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Thrown for client errors (HTTP 4xx)
 */
export class ClientError extends ApiError {
  constructor(message: string, statusCode: number, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'ClientError';
  }
}

/**
 * Thrown for server errors (HTTP 5xx)
 */
export class ServerError extends ApiError {
  constructor(message: string, statusCode: number, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'ServerError';
  }
}

/**
 * Thrown for network-level errors (no response received)
 */
export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Cache Policy Types
// ============================================================================

/**
 * Represents a cached API response
 */
export interface CachedResponse<T> {
  /** Cached data */
  data: T;
  /** Timestamp when data was cached */
  cachedAt: Date;
  /** Duration in milliseconds for which data remains fresh */
  expiresIn: number;
}

/**
 * Options for cache invalidation
 */
export interface CacheInvalidationOptions {
  /** Pattern to match cache keys (supports wildcards) */
  pattern: string;
  /** Whether to invalidate exact match only */
  exact?: boolean;
}

// ============================================================================
// Context Headers
// ============================================================================

/**
 * Context propagation headers
 *
 * ApiClient implementations MUST inject these headers when context is available.
 */
export interface ContextHeaders {
  /** Current organization ID (required for tenant-specific endpoints) */
  'X-Organization-ID'?: string;
  /** Current project ID (optional, for project-specific endpoints) */
  'X-Project-ID'?: string;
}
