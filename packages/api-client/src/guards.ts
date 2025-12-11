import type { ApiResponse, ApiError } from './types';

/**
 * Type guard to check if an API response contains an error.
 *
 * @param response - The API response to check
 * @returns True if the response contains an error
 *
 * @example
 * ```typescript
 * const response = await client.get<User>('/api/users/me/');
 * if (isApiError(response)) {
 *   console.error(response.error.message);
 *   return;
 * }
 * // TypeScript now knows response.data exists
 * console.log(response.data.name);
 * ```
 */
export function isApiError<T>(
  response: ApiResponse<T>
): response is { error: ApiError } {
  return response.error !== undefined;
}

/**
 * Type guard to check if an API response contains successful data.
 *
 * @param response - The API response to check
 * @returns True if the response contains data
 *
 * @example
 * ```typescript
 * const response = await client.get<User>('/api/users/me/');
 * if (isApiSuccess(response)) {
 *   console.log(response.data.name);
 * }
 * ```
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is { data: T } {
  return response.data !== undefined && response.error === undefined;
}
