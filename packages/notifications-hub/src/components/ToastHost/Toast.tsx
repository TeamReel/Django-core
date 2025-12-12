import React from 'react';
import { Notification } from '@/types';

export interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  onAction?: (notificationId: string, actionId: string) => void;
  variant?: 'info' | 'success' | 'warning' | 'error';
  duration?: number | null;
}

/**
 * Individual toast notification component.
 * Displays a single notification with optional action buttons and dismiss control.
 *
 * Uses F01 design system styling (placeholder until F01 package available).
 *
 * @example
 * ```tsx
 * <Toast
 *   notification={notification}
 *   variant="success"
 *   onDismiss={handleDismiss}
 *   onAction={handleAction}
 * />
 * ```
 */
export function Toast({
  notification,
  onDismiss,
  onAction,
  variant = 'info',
  duration,
}: ToastProps) {
  const handleDismiss = () => {
    onDismiss(notification.id);
  };

  const handleActionClick = (actionId: string) => {
    if (onAction) {
      onAction(notification.id, actionId);
    }
  };

  // Variant styling (placeholder for F01)
  const variantStyles: Record<string, React.CSSProperties> = {
    info: {
      backgroundColor: '#e3f2fd',
      borderLeft: '4px solid #2196f3',
      color: '#0d47a1',
    },
    success: {
      backgroundColor: '#e8f5e9',
      borderLeft: '4px solid #4caf50',
      color: '#1b5e20',
    },
    warning: {
      backgroundColor: '#fff3e0',
      borderLeft: '4px solid #ff9800',
      color: '#e65100',
    },
    error: {
      backgroundColor: '#ffebee',
      borderLeft: '4px solid #f44336',
      color: '#b71c1c',
    },
  };

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 16px',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    marginBottom: '8px',
    minWidth: '320px',
    maxWidth: '560px',
    ...variantStyles[variant],
  };

  return (
    <div
      style={baseStyle}
      role="status"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
          {notification.title}
        </div>
        {notification.message && (
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {notification.message}
          </div>
        )}
        {notification.action && (
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => handleActionClick(notification.action!.label)}
              style={{
                padding: '4px 12px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid currentColor',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
              }}
              aria-label={notification.action.label}
            >
              {notification.action.label}
            </button>
          </div>
        )}
      </div>
      {duration !== null && (
        <button
          onClick={handleDismiss}
          style={{
            marginLeft: '12px',
            padding: '4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '20px',
            lineHeight: 1,
            color: 'inherit',
            opacity: 0.7,
          }}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
}
