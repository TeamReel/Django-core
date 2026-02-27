import { useRef, useCallback } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeGestureOptions {
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  threshold?: number;
  /** Maximum time in ms for a swipe gesture (default: 300) */
  maxTime?: number;
  /** Callback when swipe left is detected */
  onSwipeLeft?: () => void;
  /** Callback when swipe right is detected */
  onSwipeRight?: () => void;
  /** Callback when swipe up is detected */
  onSwipeUp?: () => void;
  /** Callback when swipe down is detected */
  onSwipeDown?: () => void;
  /** Generic callback for any swipe direction */
  onSwipe?: (direction: SwipeDirection) => void;
  /** Prevent default touch behavior (default: false) */
  preventDefault?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export interface SwipeState {
  /** Whether a swipe is currently in progress */
  isSwiping: boolean;
  /** Current direction being swiped */
  direction: SwipeDirection | null;
  /** Distance traveled in pixels */
  distance: number;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

/**
 * useSwipeGesture - Hook for detecting swipe gestures on touch devices
 *
 * Returns event handlers to attach to a container element.
 * Detects left, right, up, and down swipes based on threshold and timing.
 *
 * @example Basic navigation
 * ```tsx
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => navigate('/next'),
 *   onSwipeRight: () => navigate('/previous'),
 *   threshold: 50,
 * });
 *
 * return <div {...swipeHandlers}>Content</div>;
 * ```
 *
 * @example With swipe state feedback
 * ```tsx
 * const swipeHandlers = useSwipeGesture({
 *   onSwipe: (direction) => {
 *     if (direction === 'left') dismissCard();
 *     if (direction === 'right') saveCard();
 *   },
 * });
 * ```
 */
export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    threshold = 50,
    maxTime = 300,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    preventDefault = false,
    disabled = false,
  } = options;

  const startPoint = useRef<TouchPoint | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      startPoint.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !startPoint.current) return;

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [disabled, preventDefault]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !startPoint.current) return;

      const touch = e.changedTouches[0];
      const endPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const deltaX = endPoint.x - startPoint.current.x;
      const deltaY = endPoint.y - startPoint.current.y;
      const deltaTime = endPoint.time - startPoint.current.time;

      // Check if swipe was fast enough
      if (deltaTime > maxTime) {
        startPoint.current = null;
        return;
      }

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine primary direction
      let direction: SwipeDirection | null = null;

      if (absX > absY && absX >= threshold) {
        // Horizontal swipe
        direction = deltaX > 0 ? 'right' : 'left';
      } else if (absY > absX && absY >= threshold) {
        // Vertical swipe
        direction = deltaY > 0 ? 'down' : 'up';
      }

      if (direction) {
        // Call generic handler
        onSwipe?.(direction);

        // Call specific handlers
        switch (direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
      }

      startPoint.current = null;
    },
    [disabled, threshold, maxTime, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  const handleTouchCancel = useCallback(() => {
    startPoint.current = null;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}

/**
 * useSwipeNavigation - Simplified hook for left/right swipe navigation
 *
 * @example
 * ```tsx
 * const swipeHandlers = useSwipeNavigation({
 *   onNext: () => setIndex(i => i + 1),
 *   onPrevious: () => setIndex(i => i - 1),
 * });
 *
 * return <div {...swipeHandlers}>{slides[index]}</div>;
 * ```
 */
export function useSwipeNavigation(options: {
  onNext?: () => void;
  onPrevious?: () => void;
  threshold?: number;
  disabled?: boolean;
}) {
  return useSwipeGesture({
    onSwipeLeft: options.onNext,
    onSwipeRight: options.onPrevious,
    threshold: options.threshold,
    disabled: options.disabled,
  });
}

/**
 * useSwipeToDismiss - Hook for swipe-to-dismiss pattern
 *
 * @example
 * ```tsx
 * const { handlers, offset, isDismissing } = useSwipeToDismiss({
 *   onDismiss: () => removeItem(id),
 *   direction: 'left',
 * });
 *
 * return (
 *   <div {...handlers} style={{ transform: `translateX(${offset}px)` }}>
 *     {content}
 *   </div>
 * );
 * ```
 */
export function useSwipeToDismiss(options: {
  onDismiss: () => void;
  direction?: 'left' | 'right' | 'both';
  threshold?: number;
  disabled?: boolean;
}) {
  const { onDismiss, direction = 'left', threshold = 100, disabled = false } = options;

  return useSwipeGesture({
    onSwipeLeft: direction === 'left' || direction === 'both' ? onDismiss : undefined,
    onSwipeRight: direction === 'right' || direction === 'both' ? onDismiss : undefined,
    threshold,
    disabled,
  });
}
