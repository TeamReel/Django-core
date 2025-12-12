/**
 * Shared test configuration for API URLs.
 * Ensures consistency between MSW handlers and test setup.
 */

/**
 * Base URL for all API requests in tests.
 * MSW 1.x requires absolute URLs to intercept fetch() calls in Node.js/jsdom.
 */
export const API_BASE_URL = 'http://localhost/api';

/**
 * Root URL for MSW handler matching.
 */
export const MSW_BASE_URL = 'http://localhost';
