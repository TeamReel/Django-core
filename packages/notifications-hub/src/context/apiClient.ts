/**
 * API Client for Notifications
 *
 * Wrapper around fetch API with CSRF token handling, error normalization,
 * and retry logic.
 *
 * TODO: Extract to @django-core/api-client shared package (per F03 spec)
 */

import { Notification } from '@/types';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface FetchNotificationsParams {
  org: string;
  project?: string;
  status?: 'all' | 'read' | 'unread';
  type?: string;
  page?: number;
  page_size?: number;
}

export interface MarkAllReadParams {
  org_id: string;
  project_id?: string;
  filters?: {
    status?: 'unread';
    type?: string;
  };
}

export interface MarkAllReadResponse {
  updated_count: number;
  timestamp: string;
}

/**
 * Get CSRF token from cookie
 * Django's default CSRF cookie name is 'csrftoken'
 */
function getCSRFToken(): string | null {
  const name = 'csrftoken';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Create an ApiError from fetch response
 */
async function createApiError(response: Response): Promise<ApiError> {
  const error = new Error() as ApiError;
  error.status = response.status;

  try {
    const data = await response.json();
    error.message = data.error || data.detail || response.statusText;
    error.code = data.code;
    error.details = data;
  } catch {
    error.message = response.statusText;
  }

  return error;
}

/**
 * Make authenticated API request with CSRF token
 *
 * @param url API endpoint URL
 * @param options fetch options
 * @param includeCSRF Whether to include CSRF token (required for mutating operations)
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  includeCSRF = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add CSRF token for mutating operations
  if (includeCSRF && (options.method === 'POST' || options.method === 'PATCH' || options.method === 'DELETE')) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    } else {
      console.warn('[F04] CSRF token not found in cookies');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for auth
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Fetch notifications with pagination
 *
 * GET /api/v1/notifications
 */
export async function fetchNotifications(
  baseUrl: string,
  params: FetchNotificationsParams
): Promise<PaginatedResponse<Notification>> {
  const queryParams = new URLSearchParams({
    org: params.org,
    ...(params.project && { project: params.project }),
    ...(params.status && params.status !== 'all' && { status: params.status }),
    ...(params.type && { type: params.type }),
    ...(params.page && { page: String(params.page) }),
    ...(params.page_size && { page_size: String(params.page_size) }),
  });

  const url = `${baseUrl}/notifications?${queryParams}`;

  return retryWithBackoff(() => apiRequest<PaginatedResponse<Notification>>(url));
}

/**
 * Mark notification as read or unread
 *
 * PATCH /api/v1/notifications/:id/read
 */
export async function updateReadStatus(
  baseUrl: string,
  id: string,
  read: boolean
): Promise<{ id: string; read: boolean; updated_at: string }> {
  const url = `${baseUrl}/notifications/${id}/read`;

  return retryWithBackoff(() =>
    apiRequest(
      url,
      {
        method: 'PATCH',
        body: JSON.stringify({ read }),
      },
      true // Include CSRF token
    )
  );
}

/**
 * Mark all notifications as read
 *
 * POST /api/v1/notifications/mark-all-read
 */
export async function markAllRead(
  baseUrl: string,
  params: MarkAllReadParams
): Promise<MarkAllReadResponse> {
  const url = `${baseUrl}/notifications/mark-all-read`;

  return retryWithBackoff(() =>
    apiRequest(
      url,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      true // Include CSRF token
    )
  );
}

/**
 * Get unread notification count
 *
 * GET /api/v1/notifications/unread-count
 */
export async function getUnreadCount(
  baseUrl: string,
  org: string,
  project?: string
): Promise<{ count: number; org_id: string; project_id: string | null; last_updated: string }> {
  const queryParams = new URLSearchParams({
    org,
    ...(project && { project }),
  });

  const url = `${baseUrl}/notifications/unread-count?${queryParams}`;

  return retryWithBackoff(() => apiRequest(url));
}
