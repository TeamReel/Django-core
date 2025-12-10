export interface ApiClientConfig {
  baseUrl?: string; // Default: ''
  headers?: Record<string, string>; // Additional headers
  credentials?: RequestCredentials; // Default: 'include'
}

export interface RequestOptions extends RequestInit {
  skipCsrf?: boolean; // Skip CSRF injection (for GET requests, optional)
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: number; // HTTP status code
  message: string; // User-facing message
  details?: unknown; // Additional error details
  fieldErrors?: Record<string, string[]>; // B13 field validation errors
  formErrors?: string[]; // B13 form-level errors
}
