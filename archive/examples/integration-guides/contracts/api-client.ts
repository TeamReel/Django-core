/**
 * API Client Interface
 *
 * Implement this interface to create a standardized HTTP client for Core-App backend.
 * Handles authentication, context propagation, CSRF protection, and error normalization.
 *
 * @see {@link https://docs.django-core.example.com/integration-guides/api-client | API Client Guide}
 * @packageDocumentation
 */

import type { AuthProvider } from './auth';
import type { ContextProvider } from './context';
import type { RequestOptions, ApiResponse } from './types';

/**
 * Standardized HTTP client for Core-App backend
 *
 * This interface defines the contract for API communication.
 * Implementations MUST handle:
 * - CSRF token injection (X-CSRFToken header from cookie or meta tag)
 * - Authentication headers (from AuthProvider)
 * - Context headers (X-Organization-ID, X-Project-ID from ContextProvider)
 * - Error normalization (convert HTTP errors to typed exceptions)
 * - Request/response interceptors (for logging, retries, etc.)
 *
 * @example Fetch-based Implementation
 * ```typescript
 * class FetchApiClient implements ApiClient {
 *   constructor(
 *     private baseURL: string,
 *     private authProvider: AuthProvider,
 *     private contextProvider: ContextProvider
 *   ) {}
 *
 *   async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
 *     const headers = this.buildHeaders(options);
 *     const url = this.buildUrl(path, options?.params);
 *
 *     const response = await fetch(url, {
 *       method: 'GET',
 *       headers,
 *       credentials: 'include',
 *       signal: options?.signal,
 *     });
 *
 *     if (!response.ok) {
 *       throw this.normalizeError(response);
 *     }
 *
 *     const data = await response.json();
 *     return { data, status: response.status, headers: response.headers };
 *   }
 *
 *   private buildHeaders(options?: RequestOptions): Headers {
 *     const headers = new Headers(options?.headers);
 *
 *     // CSRF token
 *     headers.set('X-CSRFToken', getCsrfToken());
 *
 *     // Context headers
 *     if (!options?.skipContext) {
 *       const org = this.contextProvider.currentOrganization;
 *       const project = this.contextProvider.currentProject;
 *       if (org) headers.set('X-Organization-ID', org.id);
 *       if (project) headers.set('X-Project-ID', project.id);
 *     }
 *
 *     return headers;
 *   }
 * }
 * ```
 */
export interface ApiClient {
  /**
   * Base URL for API requests (e.g., "https://api.example.com")
   */
  readonly baseURL: string;

  /**
   * Authentication provider for session/token management
   */
  readonly authProvider: AuthProvider;

  /**
   * Context provider for organization/project headers
   */
  readonly contextProvider: ContextProvider;

  /**
   * Perform GET request
   *
   * @param path - API path (relative to baseURL, e.g., "/api/projects")
   * @param options - Request options
   * @returns Promise resolving to API response
   * @throws {PermissionDeniedError} 403 - Permission denied
   * @throws {ClientError} 4xx - Client error
   * @throws {ServerError} 5xx - Server error
   * @throws {NetworkError} Network failure
   *
   * @example
   * ```typescript
   * const { data: projects } = await apiClient.get<Project[]>('/api/projects');
   * ```
   */
  get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;

  /**
   * Perform POST request
   *
   * @param path - API path
   * @param body - Request body (will be JSON.stringify'd)
   * @param options - Request options
   * @returns Promise resolving to API response
   * @throws {PermissionDeniedError} 403 - Permission denied
   * @throws {ClientError} 4xx - Client error
   * @throws {ServerError} 5xx - Server error
   * @throws {NetworkError} Network failure
   *
   * @example
   * ```typescript
   * const { data: newProject } = await apiClient.post<Project>('/api/projects', {
   *   name: 'New Project',
   *   description: 'Project description',
   * });
   * ```
   */
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;

  /**
   * Perform PUT request
   *
   * @param path - API path
   * @param body - Request body (will be JSON.stringify'd)
   * @param options - Request options
   * @returns Promise resolving to API response
   * @throws {PermissionDeniedError} 403 - Permission denied
   * @throws {ClientError} 4xx - Client error
   * @throws {ServerError} 5xx - Server error
   * @throws {NetworkError} Network failure
   *
   * @example
   * ```typescript
   * const { data: updated } = await apiClient.put<Project>(`/api/projects/${id}`, {
   *   name: 'Updated Name',
   * });
   * ```
   */
  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;

  /**
   * Perform PATCH request
   *
   * @param path - API path
   * @param body - Request body (will be JSON.stringify'd)
   * @param options - Request options
   * @returns Promise resolving to API response
   * @throws {PermissionDeniedError} 403 - Permission denied
   * @throws {ClientError} 4xx - Client error
   * @throws {ServerError} 5xx - Server error
   * @throws {NetworkError} Network failure
   *
   * @example
   * ```typescript
   * const { data: updated } = await apiClient.patch<Project>(`/api/projects/${id}`, {
   *   description: 'New description',
   * });
   * ```
   */
  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;

  /**
   * Perform DELETE request
   *
   * @param path - API path
   * @param options - Request options
   * @returns Promise resolving to API response
   * @throws {PermissionDeniedError} 403 - Permission denied
   * @throws {ClientError} 4xx - Client error
   * @throws {ServerError} 5xx - Server error
   * @throws {NetworkError} Network failure
   *
   * @example
   * ```typescript
   * await apiClient.delete(`/api/projects/${id}`);
   * ```
   */
  delete<T = void>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;

  /**
   * Add request interceptor
   *
   * Use this to:
   * - Log all requests
   * - Add custom headers globally
   * - Implement retry logic
   * - Add request timing metrics
   *
   * @param interceptor - Function called before each request
   * @returns Cleanup function to remove interceptor
   *
   * @example
   * ```typescript
   * const unsubscribe = apiClient.addRequestInterceptor((config) => {
   *   console.log('Request:', config.method, config.path);
   *   return config;
   * });
   *
   * // Later, remove interceptor
   * unsubscribe();
   * ```
   */
  addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): () => void;

  /**
   * Add response interceptor
   *
   * Use this to:
   * - Log all responses
   * - Transform response data
   * - Handle global error cases (e.g., session expiry)
   * - Add response timing metrics
   *
   * @param interceptor - Function called after each response
   * @returns Cleanup function to remove interceptor
   *
   * @example
   * ```typescript
   * const unsubscribe = apiClient.addResponseInterceptor((response) => {
   *   console.log('Response:', response.status, response.data);
   *   return response;
   * });
   * ```
   */
  addResponseInterceptor(
    interceptor: (response: ApiResponse<unknown>) => ApiResponse<unknown> | Promise<ApiResponse<unknown>>
  ): () => void;

  /**
   * Add error interceptor
   *
   * Use this to:
   * - Log all errors
   * - Show global error notifications
   * - Implement retry logic for specific errors
   * - Handle session expiry (redirect to login)
   *
   * @param interceptor - Function called when request fails
   * @returns Cleanup function to remove interceptor
   *
   * @example
   * ```typescript
   * const unsubscribe = apiClient.addErrorInterceptor((error) => {
   *   if (error instanceof ClientError && error.statusCode === 401) {
   *     // Session expired, redirect to login
   *     authProvider.logout();
   *     navigate('/login');
   *   }
   *   throw error; // Re-throw to propagate to caller
   * });
   * ```
   */
  addErrorInterceptor(
    interceptor: (error: Error) => Error | Promise<Error>
  ): () => void;
}

/**
 * Request configuration passed to interceptors
 */
export interface RequestConfig {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** API path (relative to baseURL) */
  path: string;
  /** Request headers */
  headers: Headers;
  /** Request body (for POST/PUT/PATCH) */
  body?: unknown;
  /** Query parameters */
  params?: Record<string, string>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Factory function signature for creating ApiClient instances
 *
 * @example
 * ```typescript
 * const createApiClient: CreateApiClient = (baseURL, auth, context) => {
 *   return new FetchApiClient(baseURL, auth, context);
 * };
 *
 * // Usage
 * const apiClient = createApiClient(
 *   'https://api.example.com',
 *   authProvider,
 *   contextProvider
 * );
 * ```
 */
export type CreateApiClient = (
  baseURL: string,
  authProvider: AuthProvider,
  contextProvider: ContextProvider
) => ApiClient;
