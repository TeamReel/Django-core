import React from 'react';

export interface DefaultLoadingProps {
  message?: string;
}

/**
 * Default loading state component
 * Shows a simple loading spinner with optional message
 *
 * TODO: Replace with F01 design system loading component when available
 */
export const DefaultLoading: React.FC<DefaultLoadingProps> = ({
  message = 'Loading...',
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
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ marginTop: '1rem', color: '#666' }}>{message}</p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
