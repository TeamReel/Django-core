import { ApiError } from '../types/ApiError';

/**
 * B13 error envelope structure from backend.
 */
interface B13ErrorEnvelope {
  status: 'error';
  error: {
    code: string;
    message: string;
    details: Record<string, string[]>;
  };
  meta: {
    timestamp: string;
  };
}

/**
 * Normalize a Response into an ApiError structure.
 * Parses B13 error envelope from backend responses.
 *
 * @param response - Fetch Response object (should be error response)
 * @returns Promise resolving to normalized ApiError
 *
 * @example
 * ```typescript
 * try {
 *   const response = await apiClient('/api/v1/auth/login', {
 *     method: 'POST',
 *     body: JSON.stringify({ email, password })
 *   });
 *
 *   if (!response.ok) {
 *     const error = await errorNormalizer(response);
 *     console.error('Field errors:', error.fieldErrors);
 *     console.error('Form errors:', error.formErrors);
 *   }
 * } catch (err) {
 *   // Network error
 * }
 * ```
 */
export async function errorNormalizer(response: Response): Promise<ApiError> {
  const status = response.status;

  try {
    const json = await response.json();

    // Check if it's a B13 error envelope
    if (json.status === 'error' && json.error) {
      const envelope = json as B13ErrorEnvelope;

      return {
        status,
        fieldErrors: envelope.error.details || {},
        formErrors: envelope.error.message ? [envelope.error.message] : [],
      };
    }

    // Check if it's Django REST Framework field errors (direct field objects)
    const hasFieldErrors = Object.keys(json).some(
      (key) => Array.isArray(json[key]) && typeof json[key][0] === 'string'
    );
    if (hasFieldErrors) {
      const fieldErrors: Record<string, string[]> = {};
      let formErrors: string[] = [];

      Object.keys(json).forEach((key) => {
        if (Array.isArray(json[key])) {
          // Django uses __all__ for form-level errors
          if (key === '__all__' || key === 'non_field_errors') {
            formErrors = json[key];
          } else {
            fieldErrors[key] = json[key];
          }
        }
      });

      return {
        status,
        fieldErrors,
        formErrors,
      };
    }

    // Fallback for non-B13 responses with message/error/detail fields
    const message = json.message || json.error || json.detail;
    if (message) {
      return {
        status,
        fieldErrors: {},
        formErrors: [typeof message === 'string' ? message : JSON.stringify(message)],
      };
    }

    // Empty JSON object - use statusText
    return {
      status,
      fieldErrors: {},
      formErrors: [response.statusText || 'An error occurred'],
    };
  } catch {
    // Response body is not JSON
    return {
      status,
      fieldErrors: {},
      formErrors: [response.statusText || `HTTP ${status}: Unknown error`],
    };
  }
}
