import { useCallback } from 'react';

/**
 * useHapticFeedback — thin wrapper around the Vibration API.
 *
 * Works in PWA/mobile browsers that support `navigator.vibrate()`.
 * Falls back silently on unsupported browsers (Safari, desktop).
 *
 * Usage:
 * ```ts
 * const haptic = useHapticFeedback();
 * haptic.light();          // quick tap
 * haptic.success();        // tap–pause–tap (confirm)
 * haptic.error();          // long buzz (error)
 * haptic.vibrate([20,40,20]); // custom pattern
 * ```
 */
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // silently ignore on unsupported platforms
      }
    }
  }, []);

  return {
    /** Subtle 10 ms tap — button press, selection change */
    light: useCallback(() => vibrate(10), [vibrate]),

    /** Medium 25 ms tap — toggle, drag threshold crossed */
    medium: useCallback(() => vibrate(25), [vibrate]),

    /** Strong 50 ms buzz — destructive action, long-press */
    heavy: useCallback(() => vibrate(50), [vibrate]),

    /** Double-tap pattern — action confirmed */
    success: useCallback(() => vibrate([10, 50, 10]), [vibrate]),

    /** Triple-buzz pattern — error or rejected action */
    error: useCallback(() => vibrate([50, 30, 50, 30, 50]), [vibrate]),

    /** Raw vibrate with custom pattern */
    vibrate,
  };
}
