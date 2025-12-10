import { getCsrfToken } from './csrfToken';
import { normalizeError } from './errorNormalizer';
import type { ApiClientConfig, RequestOptions, ApiResponse } from './types';

export function createApiClient(config: ApiClientConfig = {}): {
  request: <T>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
  get: <T>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<ApiResponse<T>>;
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<ApiResponse<T>>;
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<ApiResponse<T>>;
  delete: <T>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
} {
  const baseUrl = config.baseUrl || '';
  const defaultHeaders = config.headers || {};
  const credentials = config.credentials || 'include';

  return {
    async request<T>(
      endpoint: string,
      options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
      const { skipCsrf = false, ...fetchOptions } = options;

      // Build headers
      const headers = new Headers(fetchOptions.headers);
      Object.entries(defaultHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      // Inject CSRF token for mutating requests
      const method = (fetchOptions.method || 'GET').toUpperCase();
      if (!skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          headers.set('X-CSRFToken', csrfToken);
        }
      }

      // Make request
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          ...fetchOptions,
          headers,
          credentials,
        });

        // Parse response
        const contentType = response.headers.get('Content-Type') || '';
        const isJson = contentType.includes('application/json');
        const data: unknown = isJson ? await response.json() : await response.text();

        // Handle errors
        if (!response.ok) {
          const error = normalizeError(response.status, data);
          return { error };
        }

        return { data: data as T };
      } catch (err) {
        // Network error
        return {
          error: {
            code: 0,
            message: 'Network error. Please check your connection and try again.',
            details: err,
          },
        };
      }
    },

    // Convenience methods
    get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { ...options, method: 'GET' });
    },
    post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
    },
    put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
    },
    patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
    },
    delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    },
  };
}
