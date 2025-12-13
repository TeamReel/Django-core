import { useState, useEffect } from 'react';

/**
 * Breakpoint configuration
 * TODO: Import from @django-core/layouts when F06 is available
 */
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

/**
 * Hook for responsive breakpoint detection
 * Returns current breakpoint state
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 * ```
 */
export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: windowWidth < BREAKPOINTS.mobile,
    isTablet: windowWidth >= BREAKPOINTS.mobile && windowWidth < BREAKPOINTS.tablet,
    isDesktop: windowWidth >= BREAKPOINTS.tablet,
    windowWidth,
  };
}
