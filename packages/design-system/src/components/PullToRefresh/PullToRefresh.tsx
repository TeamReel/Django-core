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
  const currentY = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state === 'refreshing') return;

      const container = containerRef.current;
      if (!container) return;

      // Only enable pull-to-refresh when scrolled to top
      if (container.scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
    },
    [disabled, state]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || state === 'refreshing') return;
      if (startY.current === 0) return;

      const container = containerRef.current;
      if (!container) return;

      // Only enable when at top of scroll
      if (container.scrollTop > 0) {
        startY.current = 0;
        return;
      }

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0) {
        // Apply resistance for natural feel
        const distance = Math.min(diff * 0.5, maxPullDistance);
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
    if (disabled || state === 'refreshing') return;

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
  }, [disabled, state, threshold, onRefresh]);

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
