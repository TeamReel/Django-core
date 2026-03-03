import { useState, useCallback } from 'react';
import { getItem, setItem, removeItem, getAlertStorageKey } from '../utils/localStorage';

export interface AlertDismissalState {
  isDismissed: boolean;
  isPermanentlyDismissed: boolean;
}

export interface UseAlertDismissalOptions {
  /**
   * Unique identifier for this alert (used as localStorage key suffix)
   */
  alertId: string;

  /**
   * Default visibility state (if no localStorage data found)
   * @default false
   */
  defaultDismissed?: boolean;
}

export interface UseAlertDismissalResult {
  /**
   * Current dismissal state
   */
  state: AlertDismissalState;

  /**
   * Dismiss alert temporarily (until page reload)
   */
  dismiss: () => void;

  /**
   * Dismiss alert permanently (persisted to localStorage)
   */
  dismissForever: () => void;

  /**
   * Reset dismissal state (show alert again)
   */
  reset: () => void;

  /**
   * Whether alert should be visible
   */
  isVisible: boolean;
}

/**
 * Hook to manage alert dismissal with localStorage persistence
 *
 * @example
 * const { isVisible, dismiss, dismissForever } = useAlertDismissal({ alertId: 'low-credits-warning' });
 *
 * if (!isVisible) return null;
 *
 * return (
 *   <Alert
 *     title="Low Credits"
 *     onClose={dismiss}
 *     actions={<Button onClick={dismissForever}>Never show again</Button>}
 *   />
 * );
 */
export const useAlertDismissal = ({
  alertId,
  defaultDismissed = false,
}: UseAlertDismissalOptions): UseAlertDismissalResult => {
  const storageKey = getAlertStorageKey(alertId);

  // Initialize from localStorage
  const [state, setState] = useState<AlertDismissalState>(() => {
    const stored = getItem<{ permanent: boolean }>(storageKey);

    if (stored && stored.permanent) {
      return { isDismissed: true, isPermanentlyDismissed: true };
    }

    return {
      isDismissed: defaultDismissed,
      isPermanentlyDismissed: false,
    };
  });

  // Temporary dismiss (session only)
  const dismiss = useCallback(() => {
    setState({ isDismissed: true, isPermanentlyDismissed: false });
  }, []);

  // Permanent dismiss (persisted to localStorage)
  const dismissForever = useCallback(() => {
    setState({ isDismissed: true, isPermanentlyDismissed: true });
    setItem(storageKey, { permanent: true });
  }, [storageKey]);

  // Reset (show alert again)
  const reset = useCallback(() => {
    setState({ isDismissed: false, isPermanentlyDismissed: false });
    removeItem(storageKey);
  }, [storageKey]);

  const isVisible = !state.isDismissed;

  return {
    state,
    dismiss,
    dismissForever,
    reset,
    isVisible,
  };
};
