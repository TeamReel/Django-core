import React from 'react';
import { Notification } from '../../types/notification';
import { formatDistanceToNow } from 'date-fns';
import { NotificationActions } from './NotificationActions';

/**
 * NotificationItem Component
 *
 * Displays a single notification with read/unread styling, timestamp,
 * and action buttons. Handles click events to mark as read and trigger actions.
 *
 * Uses F01 placeholder styling until F01 components are available.
 *
 * @component
 * @example
 * <NotificationItem
 *   notification={notification}
 *   onClick={() => handleNotificationClick(notification.id)}
 *   onMarkRead={() => handleMarkRead(notification.id)}
 * />
 */

export interface NotificationItemProps {
  /** The notification to display */
  notification: Notification;

  /** Callback when notification is clicked (opens detail or navigates) */
  onClick?: (notification: Notification) => void;

  /** Callback when mark as read/unread action is triggered */
  onMarkRead?: (notification: Notification, read: boolean) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onMarkRead,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
  };

  const handleMarkRead = (read: boolean) => {
    if (onMarkRead) {
      onMarkRead(notification, read);
    }
  };

  // Format timestamp as relative time (e.g., "2 hours ago")
  const formattedTime = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });
    } catch (error) {
      return notification.timestamp;
    }
  }, [notification.timestamp]);

  // Map severity to color
  const severityColors: Record<string, string> = {
    INFO: '#2196f3',
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    CRITICAL: '#d32f2f',
  };

  const iconColor = severityColors[notification.severity] || '#757575';

  return (
    <div
      style={{
        display: 'flex',
        padding: '12px 16px',
        gap: '12px',
        backgroundColor: notification.read ? '#ffffff' : '#f0f7ff',
        borderLeft: `4px solid ${iconColor}`,
        borderBottom: '1px solid #e0e0e0',
        cursor: 'pointer',
        minHeight: '70px',
        transition: 'background-color 0.2s ease',
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Notification: ${notification.title}. ${notification.read ? 'Read' : 'Unread'}`}
    >
      {/* Icon placeholder (circle with first letter of severity) */}
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: iconColor,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {notification.severity.charAt(0)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <div
              style={{
                fontSize: '14px',
                fontWeight: notification.read ? 'normal' : 'bold',
                color: '#212121',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.title}
            </div>

            {/* Message */}
            <div
              style={{
                fontSize: '13px',
                color: '#616161',
                marginTop: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {notification.message}
            </div>
          </div>

          {/* Actions */}
          <NotificationActions
            notification={notification}
            onMarkRead={handleMarkRead}
          />
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontSize: '12px',
            color: '#9e9e9e',
          }}
        >
          {formattedTime}
        </div>
      </div>
    </div>
  );
};
