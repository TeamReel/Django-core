import React, { useState, useRef, useCallback } from 'react';
import { useSwipeToDismiss } from '@django-core/design-system';

export interface SwipeableCardProps {
  children: React.ReactNode;
  /** Callback when card is swiped to dismiss */
  onDismiss: () => void;
  /** Direction(s) to allow swiping (default: 'left') */
  direction?: 'left' | 'right' | 'both';
  /** Threshold in pixels to trigger dismiss (default: 100) */
  threshold?: number;
  /** Background color/content revealed on swipe left */
  leftReveal?: React.ReactNode;
  /** Background color/content revealed on swipe right */
  rightReveal?: React.ReactNode;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Additional className */
  className?: string;
}

/**
 * SwipeableCard - A card wrapper that can be swiped to dismiss
 *
 * Useful for notification lists, to-do items, or any dismissible content.
 *
 * @example
 * ```tsx
 * <SwipeableCard
 *   onDismiss={() => markAsRead(notification.id)}
 *   leftReveal={
 *     <div style={{ background: '#22c55e', color: 'white', padding: 16 }}>
 *       ✓ Mark as Read
 *     </div>
 *   }
 * >
 *   <NotificationCard notification={notification} />
 * </SwipeableCard>
 * ```
 */
export default function SwipeableCard({
  children,
  onDismiss,
  direction = 'left',
  threshold = 100,
  leftReveal,
  rightReveal,
  disabled = false,
  style,
  className,
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startX.current = e.touches[0].clientX;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || disabled) return;

      const currentX = e.touches[0].clientX;
      const diff = currentX - startX.current;

      // Limit direction based on props
      if (direction === 'left' && diff > 0) return;
      if (direction === 'right' && diff < 0) return;

      // Apply resistance at edges
      const resistance = 0.5;
      const resistedDiff = diff * resistance;

      // Limit max drag distance
      const maxDrag = 150;
      const clampedDiff = Math.max(-maxDrag, Math.min(maxDrag, resistedDiff));

      setOffsetX(clampedDiff);
    },
    [isDragging, disabled, direction]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    const absOffset = Math.abs(offsetX);

    if (absOffset >= threshold) {
      // Animate off-screen then dismiss
      setIsDismissing(true);
      const dismissDirection = offsetX < 0 ? -1 : 1;
      setOffsetX(dismissDirection * window.innerWidth);

      setTimeout(() => {
        onDismiss();
        // Reset after dismiss callback
        setOffsetX(0);
        setIsDismissing(false);
      }, 200);
    } else {
      // Snap back
      setOffsetX(0);
    }
  }, [isDragging, disabled, offsetX, threshold, onDismiss]);

  // Mouse support for desktop testing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      startX.current = e.clientX;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || disabled) return;

      const diff = e.clientX - startX.current;

      if (direction === 'left' && diff > 0) return;
      if (direction === 'right' && diff < 0) return;

      const resistance = 0.5;
      const resistedDiff = diff * resistance;
      const maxDrag = 150;
      const clampedDiff = Math.max(-maxDrag, Math.min(maxDrag, resistedDiff));

      setOffsetX(clampedDiff);
    },
    [isDragging, disabled, direction]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    const absOffset = Math.abs(offsetX);

    if (absOffset >= threshold) {
      setIsDismissing(true);
      const dismissDirection = offsetX < 0 ? -1 : 1;
      setOffsetX(dismissDirection * window.innerWidth);

      setTimeout(() => {
        onDismiss();
        setOffsetX(0);
        setIsDismissing(false);
      }, 200);
    } else {
      setOffsetX(0);
    }
  }, [isDragging, disabled, offsetX, threshold, onDismiss]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setOffsetX(0);
    }
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Reveal backgrounds */}
      {leftReveal && offsetX < 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: Math.abs(offsetX),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            overflow: 'hidden',
          }}
        >
          {leftReveal}
        </div>
      )}
      {rightReveal && offsetX > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: offsetX,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflow: 'hidden',
          }}
        >
          {rightReveal}
        </div>
      )}

      {/* Swipeable content */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          opacity: isDismissing ? 0.5 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}
