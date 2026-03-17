import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  pullToRefreshContainer,
  pullToRefreshIndicator,
  pullToRefreshIndicatorRefreshing,
  pullToRefreshSpinner,
  pullToRefreshArrow,
  pullToRefreshArrowReady,
  pullToRefreshText,
  pullToRefreshContent,
} from './PullToRefresh.css';

export interface PullToRefreshProps {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Content to wrap with pull-to-refresh capability */
  children: React.ReactNode;
  /** Pull distance threshold to trigger refresh (default: 60) */
  threshold?: number;
  /** Maximum pull distance (default: 120) */
  maxPullDistance?: number;
  /** Custom className for the container */
  className?: string;
  /** Text shown while pulling (default: "Pull to refresh") */
  pullText?: string;
  /** Text shown when ready to release (default: "Release to refresh") */
  releaseText?: string;
  /** Text shown while refreshing (default: "Refreshing...") */
  refreshingText?: string;
  /** Disabled state */
  disabled?: boolean;
}

type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

/**
 * PullToRefresh - Native mobile pull-to-refresh gesture
 *
 * Wrap scrollable content to enable pull-down refresh functionality.
 * Uses touch gestures with smooth animations and visual feedback.
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => {
 *   await fetchLatestData();
 * }}>
 *   <NotificationList notifications={notifications} />
 * </PullToRefresh>
 * ```
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 60,
  maxPullDistance = 120,
  className,
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  refreshingText = 'Refreshing...',
  disabled = false,
}: PullToRefreshProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const startX = useRef(0);
  const currentY = useRef(0);
  const isTracking = useRef(false);
  const directionLocked = useRef<'vertical' | 'horizontal' | null>(null);

  /**
   * Find the nearest scrollable ancestor (the element that actually scrolls).
   * Walks up from our container until it finds an element with
   * overflow-y: auto|scroll that has scrollable content.
   */
  const getScrollParent = useCallback((el: HTMLElement | null): HTMLElement | null => {
    let node = el?.parentElement ?? null;
    while (node && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }, []);

  /**
   * Check if page is scrolled to top (within 2px tolerance).
   * Checks the nearest scrollable ancestor, the container itself,
   * AND the window scroll — whichever is the actual scroll source.
   */
  const isAtTop = useCallback((): boolean => {
    // Check window/document scroll
    const windowScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (windowScrollY > 2) return false;

    // Check nearest scrollable ancestor (e.g. <main> with overflow-y: auto)
    const scrollParent = getScrollParent(containerRef.current);
    if (scrollParent && scrollParent.scrollTop > 2) return false;

    // Also check container scroll (in case it's the scroll container itself)
    const container = containerRef.current;
    if (container && container.scrollTop > 2) return false;

    return true;
  }, [getScrollParent]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state === 'refreshing') return;

      // Only enable pull-to-refresh when scrolled to top
      if (!isAtTop()) return;

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      currentY.current = startY.current;
      isTracking.current = true;
      directionLocked.current = null;
    },
    [disabled, state, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || state === 'refreshing') return;
      if (!isTracking.current) return;

      // If not at top anymore, stop tracking
      if (!isAtTop()) {
        isTracking.current = false;
        directionLocked.current = null;
        setState('idle');
        setPullDistance(0);
        return;
      }

      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const diffY = touchY - startY.current;
      const diffX = touchX - startX.current;

      // Determine direction on first significant movement (10px threshold)
      if (directionLocked.current === null) {
        const absY = Math.abs(diffY);
        const absX = Math.abs(diffX);

        if (absY > 10 || absX > 10) {
          // Lock direction: only pull-to-refresh if clearly vertical (2:1 ratio)
          if (absY > absX * 2 && diffY > 0) {
            directionLocked.current = 'vertical';
          } else {
            directionLocked.current = 'horizontal';
            isTracking.current = false;
            return;
          }
        } else {
          // Not enough movement yet - don't interrupt anything
          return;
        }
      }

      // Only continue if locked to vertical direction
      if (directionLocked.current !== 'vertical') {
        return;
      }

      currentY.current = touchY;

      if (diffY > 0) {
        // Apply resistance for natural feel
        const distance = Math.min(diffY * 0.5, maxPullDistance);
        setPullDistance(distance);

        if (distance >= threshold) {
          setState('ready');
        } else {
          setState('pulling');
        }

        // Prevent default scroll when pulling
        e.preventDefault();
      }
    },
    [disabled, state, threshold, maxPullDistance]
  );

  // Attach touchmove via native addEventListener with { passive: false }
  // to avoid "Unable to preventDefault inside passive event listener" warnings.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleTouchMove]);

  const handleTouchEnd = useCallback(async () => {
    // Reset tracking state
    isTracking.current = false;
    directionLocked.current = null;

    if (disabled || state === 'refreshing') {
      startY.current = 0;
      startX.current = 0;
      return;
    }

    if (state === 'ready') {
      setState('refreshing');
      setPullDistance(threshold);

      try {
        await onRefresh();
      } finally {
        setState('idle');
        setPullDistance(0);
      }
    } else {
      setState('idle');
      setPullDistance(0);
    }

    startY.current = 0;
    startX.current = 0;
  }, [disabled, state, threshold, onRefresh]);

  // Handle touch cancel (browser gesture takeover, system interruption)
  const handleTouchCancel = useCallback(() => {
    isTracking.current = false;
    directionLocked.current = null;
    setState('idle');
    setPullDistance(0);
    startY.current = 0;
    startX.current = 0;
  }, []);

  // Reset on unmount
  useEffect(() => {
    return () => {
      setState('idle');
      setPullDistance(0);
    };
  }, []);

  const indicatorClasses = [
    pullToRefreshIndicator,
    state === 'refreshing' ? pullToRefreshIndicatorRefreshing : '',
  ]
    .filter(Boolean)
    .join(' ');

  const arrowClasses = [pullToRefreshArrow, state === 'ready' ? pullToRefreshArrowReady : '']
    .filter(Boolean)
    .join(' ');

  const getStatusText = () => {
    switch (state) {
      case 'pulling':
        return pullText;
      case 'ready':
        return releaseText;
      case 'refreshing':
        return refreshingText;
      default:
        return pullText;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${pullToRefreshContainer} ${className ?? ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Pull indicator */}
      <div
        className={indicatorClasses}
        style={{
          transform:
            state === 'refreshing'
              ? 'translateY(0)'
              : `translateY(calc(-100% + ${pullDistance}px))`,
        }}
      >
        {state === 'refreshing' ? (
          <div className={pullToRefreshSpinner} />
        ) : (
          <div className={arrowClasses}>↓</div>
        )}
        <span className={pullToRefreshText}>{getStatusText()}</span>
      </div>

      {/* Content */}
      <div
        className={pullToRefreshContent}
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: state === 'idle' ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
