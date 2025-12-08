/**
 * Configuration for the authentication module.
 */
export interface AuthConfig {
  /**
   * Base URL for API requests (e.g., "http://localhost:8000" or "https://api.example.com")
   */
  apiBaseUrl: string;

  /**
   * API endpoint paths
   */
  endpoints: {
    /** Sign in endpoint - POST */
    signIn: string;
    /** Sign out endpoint - POST */
    signOut: string;
    /** Request password reset endpoint - POST */
    requestPasswordReset: string;
    /** Confirm password reset endpoint - POST */
    confirmPasswordReset: string;
    /** Current user session verification - GET */
    me: string;
    /** Update user profile - PATCH */
    updateProfile: string;
  };

  /**
   * Application route paths for redirects
   */
  routes: {
    /** Login page route */
    login: string;
    /** Default route after successful login */
    defaultAfterLogin: string;
    /** Route after logout */
    afterLogout: string;
  };

  /**
   * Optional security configuration
   */
  security?: {
    /** Enable periodic session verification polling */
    enableSessionPolling?: boolean;
    /** Session polling interval in milliseconds (default: 60000 = 1 minute) */
    sessionPollingInterval?: number;
  };
}
