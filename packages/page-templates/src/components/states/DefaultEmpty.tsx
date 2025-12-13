import React from 'react';

export interface DefaultEmptyProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

/**
 * Default empty state component
 * Shows when no data is available with optional action slot
 *
 * TODO: Replace with F01 design system empty state component when available
 */
export const DefaultEmpty: React.FC<DefaultEmptyProps> = ({
  title = 'No data available',
  message = 'There is no content to display at this time.',
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        minHeight: '200px',
        textAlign: 'center',
      }}
      role="status"
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '1rem',
          opacity: 0.3,
        }}
      >
        📭
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#666', maxWidth: '400px' }}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
