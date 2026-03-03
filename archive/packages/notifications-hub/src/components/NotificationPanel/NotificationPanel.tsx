import React from 'react';
import { Notification } from '../../types/notification';
import { PanelHeader, NotificationFilter } from './PanelHeader';
import { PanelFooter } from './PanelFooter';
import { NotificationList } from '../NotificationList/NotificationList';

/**
 * NotificationPanel Component
 *
 * Slide-out drawer panel for displaying notification inbox.
 * Integrates header (with filters), notification list (virtualized), and footer (mark all read).
 *
 * Supports:
 * - Configurable slide-in position (right or left)
 * - Responsive width (400px desktop, full-width mobile)
 * - Escape key to close
 * - Focus trap when open
 * - Animations (slide-in/out)
 *
 * Uses F01 placeholder styling until F01 Drawer component is available.
 *
 * @component
 * @example
 * <NotificationPanel
 *   open={isPanelOpen}
 *   position="right"
 *   notifications={notifications}
 *   loading={isLoading}
 *   error={error}
 *   filter="unread"
 *   unreadCount={5}
 *   onClose={() => setIsPanelOpen(false)}
 *   onFilterChange={(filter) => setFilter(filter)}
 *   onNotificationClick={(notification) => handleClick(notification)}
 *   onMarkRead={(notification, read) => handleMarkRead(notification, read)}
 *   onMarkAllRead={() => handleMarkAllRead()}
 *   onRetry={() => handleRetry()}
 * />
 */

export type PanelPosition = 'right' | 'left';

export interface NotificationPanelProps {
  /** Whether the panel is open */
  open: boolean;

  /** Position to slide in from (default: 'right') */
  position?: PanelPosition;

  /** Panel title (default: 'Notifications') */
  title?: string;

  /** Array of notifications to display */
  notifications: Notification[];

  /** Whether notifications are currently loading */
  loading: boolean;

  /** Error object if fetch failed */
  error?: Error | null;

  /** Current active filter */
  filter: NotificationFilter;

  /** Number of unread notifications */
  unreadCount: number;

  /** Callback when close button is clicked or Escape is pressed */
  onClose: () => void;

  /** Callback when filter changes */
  onFilterChange: (filter: NotificationFilter) => void;

  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: Notification) => void;

  /** Callback when mark as read/unread is triggered */
  onMarkRead?: (notification: Notification, read: boolean) => void;

  /** Callback when "Mark all as read" is clicked */
  onMarkAllRead: () => void;

  /** Callback when retry button is clicked (error state) */
  onRetry?: () => void;

  /** Whether mark all read action is disabled */
  markAllReadDisabled?: boolean;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open,
  position = 'right',
  title,
  notifications,
  loading,
  error,
  filter,
  unreadCount,
  onClose,
  onFilterChange,
  onNotificationClick,
  onMarkRead,
  onMarkAllRead,
  onRetry,
  markAllReadDisabled = false,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Handle Escape key to close panel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Focus trap: Focus panel when opened
  React.useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  // Animation state management
  React.useEffect(() => {
    if (open) {
      setIsAnimating(true);
      // Animation duration: 250ms
      const timer = setTimeout(() => setIsAnimating(false), 250);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  // Don't render anything if panel is closed and not animating
  if (!open && !isAnimating) {
    return null;
  }

  // Panel width: 400px on desktop, 100% on mobile (< 768px)
  const panelWidth = '400px';
  const slideFrom = position === 'right' ? 'translateX(100%)' : 'translateX(-100%)';
  const slideTo = 'translateX(0)';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: open ? 1 : 0,
          transition: 'opacity 250ms ease',
          zIndex: 9999,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Notifications'}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [position]: 0,
          width: panelWidth,
          maxWidth: '100%',
          backgroundColor: '#ffffff',
          boxShadow: position === 'right'
            ? '-2px 0 8px rgba(0, 0, 0, 0.1)'
            : '2px 0 8px rgba(0, 0, 0, 0.1)',
          transform: open ? slideTo : slideFrom,
          transition: 'transform 250ms ease',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <PanelHeader
          title={title}
          filter={filter}
          unreadCount={unreadCount}
          onFilterChange={onFilterChange}
          onClose={onClose}
        />

        {/* Notification List (scrollable) */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <NotificationList
            notifications={notifications}
            loading={loading}
            error={error}
            height={window.innerHeight - 200} // Subtract header/footer height
            onNotificationClick={onNotificationClick}
            onMarkRead={onMarkRead}
            onRetry={onRetry}
          />
        </div>

        {/* Footer */}
        <PanelFooter
          unreadCount={unreadCount}
          onMarkAllRead={onMarkAllRead}
          disabled={markAllReadDisabled}
        />
      </div>
    </>
  );
};
