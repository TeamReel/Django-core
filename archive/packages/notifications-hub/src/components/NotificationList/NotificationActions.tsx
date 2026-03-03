import React from 'react';
import { Notification } from '../../types/notification';

/**
 * NotificationActions Component
 *
 * Displays action buttons for a notification (mark as read/unread).
 * Future enhancement: Add delete action.
 *
 * Uses icon buttons to save space. Buttons appear on hover on desktop.
 *
 * @component
 * @example
 * <NotificationActions
 *   notification={notification}
 *   onMarkRead={(read) => handleMarkRead(notification.id, read)}
 * />
 */

export interface NotificationActionsProps {
  /** The notification these actions apply to */
  notification: Notification;

  /** Callback when mark as read/unread is triggered */
  onMarkRead?: (read: boolean) => void;
}

export const NotificationActions: React.FC<NotificationActionsProps> = ({
  notification,
  onMarkRead,
}) => {
  const handleMarkReadClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick
    if (onMarkRead) {
      onMarkRead(!notification.read);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        flexShrink: 0,
      }}
      onClick={(e) => e.stopPropagation()} // Prevent parent click
    >
      {/* Mark as read/unread button */}
      <button
        onClick={handleMarkReadClick}
        style={{
          width: '32px',
          height: '32px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
          e.currentTarget.style.borderColor = '#bdbdbd';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.borderColor = '#e0e0e0';
        }}
        aria-label={notification.read ? 'Mark as unread' : 'Mark as read'}
        title={notification.read ? 'Mark as unread' : 'Mark as read'}
      >
        {notification.read ? (
          // Unread icon (empty circle)
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="#757575"
              strokeWidth="2"
            />
          </svg>
        ) : (
          // Read icon (filled circle with checkmark)
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="7"
              fill="#2196f3"
            />
            <path
              d="M5 8L7 10L11 6"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
};
