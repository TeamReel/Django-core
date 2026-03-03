import React from 'react';

/**
 * PanelHeader Component
 *
 * Header for the notification panel with title, close button, and filter controls.
 * Filters allow users to view All, Unread, or Read notifications.
 *
 * Uses F01 placeholder styling until F01 components are available.
 *
 * @component
 * @example
 * <PanelHeader
 *   title="Notifications"
 *   filter="all"
 *   unreadCount={5}
 *   onFilterChange={(filter) => handleFilterChange(filter)}
 *   onClose={() => handleClose()}
 * />
 */

export type NotificationFilter = 'all' | 'unread' | 'read';

export interface PanelHeaderProps {
  /** Panel title */
  title?: string;

  /** Current active filter */
  filter: NotificationFilter;

  /** Number of unread notifications (shown in filter button) */
  unreadCount: number;

  /** Callback when filter changes */
  onFilterChange: (filter: NotificationFilter) => void;

  /** Callback when close button is clicked */
  onClose: () => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title = 'Notifications',
  filter,
  unreadCount,
  onFilterChange,
  onClose,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Title and Close Button Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#212121',
          }}
        >
          {title}
        </h2>

        <button
          onClick={onClose}
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
          aria-label="Close notifications panel"
          title="Close"
        >
          {/* Close icon (X) */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="#757575"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Filter Buttons Row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <FilterButton
          label="All"
          isActive={filter === 'all'}
          onClick={() => onFilterChange('all')}
        />
        <FilterButton
          label={`Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
          isActive={filter === 'unread'}
          onClick={() => onFilterChange('unread')}
        />
        <FilterButton
          label="Read"
          isActive={filter === 'read'}
          onClick={() => onFilterChange('read')}
        />
      </div>
    </div>
  );
};

// Internal FilterButton component
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: '14px',
        fontWeight: isActive ? 'bold' : 'normal',
        color: isActive ? '#2196f3' : '#616161',
        backgroundColor: isActive ? '#e3f2fd' : 'transparent',
        border: '1px solid',
        borderColor: isActive ? '#2196f3' : '#e0e0e0',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
          e.currentTarget.style.borderColor = '#bdbdbd';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = '#e0e0e0';
        }
      }}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
};
