/**
 * Type-safe localStorage utilities with error handling
 */

export class LocalStorageError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'LocalStorageError';
  }
}

/**
 * Check if localStorage is available (may be disabled in private browsing)
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get item from localStorage with type safety
 */
export const getItem = <T = string>(key: string): T | null => {
  if (!isLocalStorageAvailable()) {
    console.warn('[F05] localStorage unavailable, returning null');
    return null;
  }

  try {
    const value = localStorage.getItem(key);
    if (value === null) return null;

    // Try parsing as JSON, fall back to string
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    console.error(`[F05] Failed to get localStorage key "${key}":`, error);
    return null;
  }
};

/**
 * Set item in localStorage with type safety
 */
export const setItem = <T>(key: string, value: T): boolean => {
  if (!isLocalStorageAvailable()) {
    console.warn('[F05] localStorage unavailable, skipping write');
    return false;
  }

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('[F05] localStorage quota exceeded');
    } else {
      console.error(`[F05] Failed to set localStorage key "${key}":`, error);
    }
    return false;
  }
};

/**
 * Remove item from localStorage
 */
export const removeItem = (key: string): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[F05] Failed to remove localStorage key "${key}":`, error);
    return false;
  }
};

/**
 * Generate storage key for alert dismissal
 */
export const getAlertStorageKey = (alertId: string): string => {
  return `django_core_alert_${alertId}`;
};
