import React from 'react';
import { Notification } from '../../types/notification';
import { NotificationSkeleton } from './NotificationSkeleton';
import { VirtualizedList } from './VirtualizedList';

/**
 * NotificationList Component
 *
 * Main list component that handles loading, empty, and error states.
 * Integrates virtualization for large lists (1000+ items).
 *
 * @component
 * @example
 * <NotificationList
 *   notifications={notifications}
 *   loading={isLoading}
 *   error={error}
 *   onNotificationClick={handleClick}
 *   onMarkRead={handleMarkRead}
 *   onRetry={handleRetry}
 * />
 */

export interface NotificationListProps {
  /** Array of notifications to display */
  notifications: Notification[];

  /** Whether notifications are currently loading */
  loading: boolean;

  /** Error object if fetch failed */
  error?: Error | null;

  /** Height of the list container in pixels (default: 400) */
  height?: number;

  /** Width of the list container (default: '100%') */
  width?: number | string;

  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: Notification) => void;

  /** Callback when mark as read/unread is triggered */
  onMarkRead?: (notification: Notification, read: boolean) => void;

  /** Callback when retry button is clicked (error state) */
  onRetry?: () => void;

  /** T073: Callback to load more notifications (pagination) */
  onLoadMore?: () => void;

  /** T073: Whether there are more notifications to load */
  hasMore?: boolean;

  /** T073: Whether a loadMore request is currently in progress */
  isLoadingMore?: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  loading,
  error,
  height = 400,
  width = '100%',
  onNotificationClick,
  onMarkRead,
  onRetry,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  // Loading state
  if (loading && notifications.length === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <NotificationSkeleton rows={5} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#ffebee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 22h20L12 2z"
              fill="#f44336"
            />
            <path
              d="M12 10v4M12 16h.01"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#212121', marginBottom: '8px' }}>
            Failed to load notifications
          </div>
          <div style={{ fontSize: '14px', color: '#616161' }}>
            {error.message || 'An unexpected error occurred'}
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1976d2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2196f3';
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#e3f2fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="#2196f3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.73 21a2 2 0 0 1-3.46 0"
              stroke="#2196f3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#212121', marginBottom: '8px' }}>
            No notifications
          </div>
          <div style={{ fontSize: '14px', color: '#616161' }}>
            You're all caught up! Check back later for new notifications.
          </div>
        </div>
      </div>
    );
  }

  // Notifications list
  return (
    <VirtualizedList
      notifications={notifications}
      height={height}
      width={width}
      onNotificationClick={onNotificationClick}
      onMarkRead={onMarkRead}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
    />
  );
};
