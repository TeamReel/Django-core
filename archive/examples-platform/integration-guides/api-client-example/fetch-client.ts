import type {
  ApiClient,
  ApiResponse,
  RequestOptions,
  AuthProvider,
  ContextProvider,
  CachePolicy,
  RequestConfig,
} from '../contracts/index.js';

/**
 * Fetch-based ApiClient implementation
 *
 * Integrates authentication, context headers, CSRF protection, and error normalization.
 * Automatically injects:
 * - X-CSRFToken header (from meta tag or cookie)
 * - Authorization header (from AuthProvider)
 * - X-Organization-ID and X-Project-ID headers (from ContextProvider)
 *
 * @example
 * ```typescript
 * const auth = createAuthProvider({ baseURL: 'https://api.example.com' });
 * const context = createContextProvider({ baseURL: 'https://api.example.com' });
 * const apiClient = createApiClient({
 *   baseURL: 'https://api.example.com',
 *   authProvider: auth,
 *   contextProvider: context,
 * });
 *
 * // All requests now include CSRF, auth, and context headers
 * const projects = await apiClient.get<Project[]>('/api/projects');
 * ```
 */

interface FetchClientOptions {
  baseURL: string;
  authProvider: AuthProvider;
  contextProvider: ContextProvider;
  cachePolicy?: CachePolicy;
}

type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = (response: ApiResponse<unknown>) => ApiResponse<unknown> | Promise<ApiResponse<unknown>>;
type ErrorInterceptor = (error: Error) => Error | Promise<Error>;

export class FetchApiClient implements ApiClient {
  readonly baseURL: string;
  readonly authProvider: AuthProvider;
  readonly contextProvider: ContextProvider;
  readonly cachePolicy?: CachePolicy;

  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(options: FetchClientOptions) {
    this.baseURL = options.baseURL;
    this.authProvider = options.authProvider;
    this.contextProvider = options.contextProvider;
    this.cachePolicy = options.cachePolicy;
  }

  /**
   * Build headers for request with CSRF, auth, and context injection
   */
  private buildHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // Get CSRF token from meta tag (Django convention)
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

    if (csrfToken) {
      headers.set('X-CSRFToken', csrfToken);
    } else {
      // Get CSRF token from cookie as fallback
      const cookieToken = this.getCookie('csrftoken');

      if (cookieToken) {
        headers.set('X-CSRFToken', cookieToken);
      }
    }

    // Get context headers from ContextProvider
    const currentOrg = this.contextProvider.currentOrganization;

    if (currentOrg) {
      headers.set('X-Organization-ID', currentOrg.id);
    }

    const currentProject = this.contextProvider.currentProject;

    if (currentProject) {
      headers.set('X-Project-ID', currentProject.id);
    }

    return headers;
  }

  /**
   * Extract CSRF token from cookie
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const cookies = document.cookie.split('; ');

    for (const cookie of cookies) {
      const [key, ...parts] = cookie.split('=');

      if (key === name && parts.length > 0) {
        return decodeURIComponent(parts.join('='));
      }
    }

    return null;
  }

  /**
   * Normalize HTTP errors to typed exceptions
   */
  private normalizeError(response: Response, data?: unknown): Error {
    let message = `HTTP ${response.status} ${response.statusText}`;

    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;

      if ('detail' in record) {
        message = String(record['detail']);
      }
    }

    switch (response.status) {
      case 400:
        return new BadRequestError(message, data);

      case 401:
        return new UnauthorizedError(message);

      case 403:
        return new PermissionDeniedError(message);

      case 404:
        return new NotFoundError(message);

      case 429:
        return new RateLimitError(message);

      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(message);

      default:
        return new ApiError(message, response.status);
    }
  }

  /**
   * Execute fetch request with caching support
   */
  private async executeFetch<T>(
    path: string,
    method: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const url = new URL(path.startsWith('/') ? `${this.baseURL}${path}` : path, this.baseURL);

    // Add query parameters if provided
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value) {
          url.searchParams.append(key, value);
        }
      }
    }

    // Build headers
    const headers = this.buildHeaders();

    // Merge custom headers
    if (options?.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value);
      }
    }

    // Create request config for interceptors
    let config: RequestConfig = {
      method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path,
      headers,
      body,
      params: options?.params,
      signal: options?.signal,
    };

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    // Execute fetch
    const response = await fetch(url.toString(), {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      credentials: 'include', // Include httpOnly cookies
      signal: config.signal,
    });

    // Parse response
    let data: unknown;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // Handle errors
    if (!response.ok) {
      const error = this.normalizeError(response, data);

      // Run error interceptors
      let finalError: Error = error;

      for (const interceptor of this.errorInterceptors) {
        try {
          finalError = await interceptor(finalError);
        } catch (e) {
          finalError = e instanceof Error ? e : new Error(String(e));
        }
      }

      throw finalError;
    }

    // Create response object
    const apiResponse: ApiResponse<T> = {
      status: response.status,
      data: data as T,
      headers: response.headers,
    };

    // Run response interceptors
    let finalResponse: ApiResponse<unknown> = apiResponse;

    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }

    return finalResponse as ApiResponse<T>;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    // Check cache first
    if (this.cachePolicy && this.cachePolicy.shouldCache(path, 'GET')) {
      const cached = this.cachePolicy.get<T>(path);

      if (cached) {
        return {
          status: 200,
          data: cached.data,
          headers: new Headers(),
        };
      }
    }

    const response = await this.executeFetch<T>(path, 'GET', undefined, options);

    // Store in cache
    if (this.cachePolicy && this.cachePolicy.shouldCache(path, 'GET')) {
      const duration = this.cachePolicy.getCacheDuration(path);

      this.cachePolicy.set(path, response.data, duration);
    }

    return response;
  }

  async post<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.executeFetch<T>(path, 'POST', body, options);
  }

  async put<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.executeFetch<T>(path, 'PUT', body, options);
  }

  async patch<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.executeFetch<T>(path, 'PATCH', body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.executeFetch<T>(path, 'DELETE', undefined, options);
  }

  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);

    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);

      if (index > -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);

    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);

      if (index > -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);

    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);

      if (index > -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }
}

/**
 * Factory function to create ApiClient instance
 */
export function createApiClient(options: FetchClientOptions): ApiClient {
  return new FetchApiClient(options);
}

// ============================================================================
// Error Classes (Typed Exceptions)
// ============================================================================

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 400 Bad Request - validation errors
 */
export class BadRequestError extends ApiError {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message, 400);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized - auth required or expired
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - auth successful but permission denied
 */
export class PermissionDeniedError extends ApiError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'PermissionDeniedError';
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

/**
 * 404 Not Found - resource does not exist
 */
export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 429 Too Many Requests - rate limit exceeded
 */
export class RateLimitError extends ApiError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 5xx Server Error - temporary server issue
 */
export class ServerError extends ApiError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}
