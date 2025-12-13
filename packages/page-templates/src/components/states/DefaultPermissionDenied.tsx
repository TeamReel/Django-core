import React from 'react';

export interface DefaultPermissionDeniedProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

/**
 * Default permission denied state component
 * Shows when user lacks permissions to view content
 *
 * TODO: Replace with F01 design system permission denied component when available
 */
export const DefaultPermissionDenied: React.FC<DefaultPermissionDeniedProps> = ({
  title = 'Access Denied',
  message = 'You do not have permission to view this content.',
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
        🔒
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#666', maxWidth: '400px' }}>
        {message}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
