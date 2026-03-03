import React, { useRef, useEffect, useCallback } from 'react';
import { FixedSizeList as FixedSizeListType, ListChildComponentProps } from 'react-window';
import * as ReactWindow from 'react-window';
import { Notification } from '../../types/notification';
import { NotificationItem } from './NotificationItem';

const FixedSizeList = ReactWindow.FixedSizeList;

/**
 * VirtualizedList Component
 *
 * Efficiently renders large lists of notifications (1000+) using react-window.
 * Only renders items currently visible in the viewport for performance.
 *
 * T073: Implements IntersectionObserver for automatic pagination when user scrolls to bottom.
 *
 * @component
 * @example
 * <VirtualizedList
 *   notifications={notifications}
 *   height={500}
 *   onNotificationClick={handleClick}
 *   onMarkRead={handleMarkRead}
 *   onLoadMore={handleLoadMore}
 *   hasMore={true}
 *   isLoadingMore={false}
 * />
 */

export interface VirtualizedListProps {
  /** Array of notifications to display */
  notifications: Notification[];

  /** Height of the list container in pixels */
  height: number;

  /** Width of the list container (default: '100%') */
  width?: number | string;

  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: Notification) => void;

  /** Callback when mark as read/unread is triggered */
  onMarkRead?: (notification: Notification, read: boolean) => void;

  /** T073: Callback to load more notifications (pagination) */
  onLoadMore?: () => void;

  /** T073: Whether there are more notifications to load */
  hasMore?: boolean;

  /** T073: Whether a loadMore request is currently in progress */
  isLoadingMore?: boolean;
}

const ITEM_HEIGHT = 70; // Fixed row height in pixels

export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  notifications,
  height,
  width = '100%',
  onNotificationClick,
  onMarkRead,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  // T073: Ref to track the sentinel element for IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<FixedSizeListType | null>(null);

  // T073: IntersectionObserver callback for scroll-to-bottom detection
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;

    // T075: Performance monitoring - log intersection events
    if (entry.isIntersecting) {
      console.debug('[F04] Sentinel visible - triggering loadMore', {
        hasMore,
        isLoadingMore,
        timestamp: new Date().toISOString(),
      });
    }

    // Trigger loadMore when sentinel becomes visible
    if (entry.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // T073: Set up IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      root: null, // Use viewport as root
      rootMargin: '100px', // Trigger 100px before reaching sentinel
      threshold: 0.1, // Trigger when 10% of sentinel is visible
    });

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, hasMore]);

  // Row renderer for react-window
  const Row: React.FC<ListChildComponentProps> = ({ index, style }) => {
    const notification = notifications[index];

    if (!notification) {
      return null;
    }

    return (
      <div style={style}>
        <NotificationItem
          notification={notification}
          onClick={onNotificationClick}
          onMarkRead={onMarkRead}
        />
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <FixedSizeList
        ref={listRef}
        height={height}
        itemCount={notifications.length}
        itemSize={ITEM_HEIGHT}
        width={width}
        overscanCount={5} // Render 5 extra items above/below viewport for smooth scrolling
      >
        {Row}
      </FixedSizeList>

      {/* T073: Sentinel element for IntersectionObserver */}
      {hasMore && (
        <div
          ref={sentinelRef}
          style={{
            height: '1px',
            width: '100%',
            position: 'absolute',
            bottom: '200px', // Position 200px from bottom to trigger early
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}

      {/* T073: Loading indicator when fetching more */}
      {isLoadingMore && (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: '#757575',
            fontSize: '14px',
          }}
          aria-live="polite"
        >
          Loading more notifications...
        </div>
      )}
    </div>
  );
};
