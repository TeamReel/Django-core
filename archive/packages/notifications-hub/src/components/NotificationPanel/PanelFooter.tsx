import React from 'react';

/**
 * PanelFooter Component
 *
 * Footer for the notification panel with "Mark all as read" action.
 * Shows confirmation dialog if unread count exceeds 10.
 *
 * Uses F01 placeholder styling until F01 components are available.
 *
 * @component
 * @example
 * <PanelFooter
 *   unreadCount={5}
 *   onMarkAllRead={() => handleMarkAllRead()}
 *   disabled={false}
 * />
 */

export interface PanelFooterProps {
  /** Number of unread notifications */
  unreadCount: number;

  /** Callback when "Mark all as read" is clicked */
  onMarkAllRead: () => void;

  /** Whether the button is disabled (e.g., during loading) */
  disabled?: boolean;
}

export const PanelFooter: React.FC<PanelFooterProps> = ({
  unreadCount,
  onMarkAllRead,
  disabled = false,
}) => {
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  const handleClick = () => {
    // Show confirmation dialog if unread count > 10
    if (unreadCount > 10) {
      setShowConfirmation(true);
    } else {
      onMarkAllRead();
    }
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    onMarkAllRead();
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  // Don't render footer if no unread notifications
  if (unreadCount === 0) {
    return null;
  }

  return (
    <>
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#ffffff',
        }}
      >
        <button
          onClick={handleClick}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: disabled ? '#9e9e9e' : '#2196f3',
            backgroundColor: disabled ? '#f5f5f5' : '#e3f2fd',
            border: '1px solid',
            borderColor: disabled ? '#e0e0e0' : '#2196f3',
            borderRadius: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = '#bbdefb';
              e.currentTarget.style.borderColor = '#1976d2';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = '#e3f2fd';
              e.currentTarget.style.borderColor = '#2196f3';
            }
          }}
          aria-label={`Mark all ${unreadCount} notifications as read`}
        >
          Mark all as read ({unreadCount})
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-title"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="confirmation-title"
              style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#212121',
              }}
            >
              Mark all as read?
            </h3>
            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: '#616161',
                lineHeight: '1.5',
              }}
            >
              You have {unreadCount} unread notifications. This will mark all of them as read.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#616161',
                  backgroundColor: 'transparent',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#bdbdbd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  backgroundColor: '#2196f3',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1976d2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2196f3';
                }}
                autoFocus
              >
                Mark all as read
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
