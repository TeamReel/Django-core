/**
 * Centralized logging utility for the frontend.
 *
 * - In development: logs to console with prefixes
 * - In production: only errors are logged (could be extended for error tracking)
 *
 * Usage:
 * ```ts
 * import { logger } from '@/utils/logger';
 * logger.debug('Fetching data...', { id });
 * logger.warn('Deprecated API used');
 * logger.error('Failed to save', error);
 * ```
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logging - only in development mode.
   * Use for verbose debugging information.
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logging - only in development mode.
   * Use for general information.
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Warning logging - only in development mode.
   * Use for non-critical issues.
   */
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error logging - always logs, even in production.
   * Use for actual errors that need attention.
   */
  error: (message: string, error?: unknown): void => {
    // In production, could send to error tracking service
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}:`, error.message);
      if (isDev && error.stack) {
        console.error(error.stack);
      }
    } else if (error !== undefined) {
      console.error(`[ERROR] ${message}:`, error);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },

  /**
   * Group logging - only in development mode.
   * Use for grouping related log messages.
   */
  group: (label: string): void => {
    if (isDev) {
      console.group(label);
    }
  },

  groupEnd: (): void => {
    if (isDev) {
      console.groupEnd();
    }
  },
};

export default logger;
