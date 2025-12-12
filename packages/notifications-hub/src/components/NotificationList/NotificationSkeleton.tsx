import React from 'react';

/**
 * NotificationSkeleton Component
 *
 * Displays 3-5 skeleton rows while notifications are loading.
 * Matches the structure of NotificationItem for consistent layout.
 *
 * Uses F01 placeholder styling until F01 Skeleton component is available.
 *
 * @component
 * @example
 * <NotificationSkeleton rows={5} />
 */

export interface NotificationSkeletonProps {
  /** Number of skeleton rows to display (default: 3) */
  rows?: number;
}

export const NotificationSkeleton: React.FC<NotificationSkeletonProps> = ({ rows = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            padding: '12px 16px',
            gap: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            minHeight: '70px',
          }}
          aria-hidden="true"
        >
          {/* Icon skeleton */}
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#e0e0e0',
              flexShrink: 0,
            }}
          />

          {/* Content skeleton */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Title skeleton */}
            <div
              style={{
                height: '16px',
                width: '70%',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
              }}
            />

            {/* Message skeleton */}
            <div
              style={{
                height: '14px',
                width: '90%',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
              }}
            />

            {/* Timestamp skeleton */}
            <div
              style={{
                height: '12px',
                width: '30%',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
