import type { ApiError } from './types';

/**
 * Normalize B13 error response to ApiError format.
 * @param status HTTP status code
 * @param body Response body (parsed JSON or text)
 * @returns Normalized ApiError
 */
export function normalizeError(status: number, body: unknown): ApiError {
  // B13 error envelope format: { error: { code, message, fieldErrors?, formErrors? } }
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null
  ) {
    const err = body.error as Record<string, unknown>;
    return {
      code: status,
      message: typeof err.message === 'string' ? err.message : getDefaultMessage(status),
      fieldErrors: isFieldErrors(err.fieldErrors) ? err.fieldErrors : undefined,
      formErrors: isFormErrors(err.formErrors) ? err.formErrors : undefined,
      details: body,
    };
  }

  // Fallback: Non-B13 error format
  return {
    code: status,
    message: getDefaultMessage(status),
    details: body,
  };
}

function getDefaultMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please wait and try again.';
    case 500:
    case 502:
    case 503:
      return 'Server error. Please try again later.';
    default:
      return `An error occurred (status: ${status}). Please try again.`;
  }
}

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((v) => Array.isArray(v) && v.every((s) => typeof s === 'string'))
  );
}

function isFormErrors(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((s) => typeof s === 'string');
}
