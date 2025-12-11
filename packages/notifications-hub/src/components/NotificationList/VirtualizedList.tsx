import React from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { Notification } from '../../types/notification';
import { NotificationItem } from './NotificationItem';

/**
 * VirtualizedList Component
 *
 * Efficiently renders large lists of notifications (1000+) using react-window.
 * Only renders items currently visible in the viewport for performance.
 *
 * @component
 * @example
 * <VirtualizedList
 *   notifications={notifications}
 *   height={500}
 *   onNotificationClick={handleClick}
 *   onMarkRead={handleMarkRead}
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
}

const ITEM_HEIGHT = 70; // Fixed row height in pixels

export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  notifications,
  height,
  width = '100%',
  onNotificationClick,
  onMarkRead,
}) => {
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
    <FixedSizeList
      height={height}
      itemCount={notifications.length}
      itemSize={ITEM_HEIGHT}
      width={width}
      overscanCount={5} // Render 5 extra items above/below viewport for smooth scrolling
    >
      {Row}
    </FixedSizeList>
  );
};
