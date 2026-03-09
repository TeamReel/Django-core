import { useState, useEffect, useCallback } from 'react';

/**
 * useOnlineStatus — tracks browser online/offline state.
 *
 * Returns `{ isOnline, wasOffline }`.
 *  - `isOnline` is `true` when the browser reports a network connection.
 *  - `wasOffline` stays `true` for a short grace period after coming back
 *    online so a "reconnected" toast can be shown.
 *
 * Uses `navigator.onLine` + the `online`/`offline` window events.
 */
export interface UseOnlineStatusReturn {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Keep wasOffline=true for 4 s so a "back online" banner can show
    setWasOffline(true);
    const t = setTimeout(() => setWasOffline(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}
