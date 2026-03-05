import { useState, useEffect } from 'react';

/**
 * Returns `true` when the viewport width is at or below `breakpoint` px.
 * Updates live on window resize / orientation change.
 */
export function useIsMobile(breakpoint = 639): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches); // sync on mount
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
