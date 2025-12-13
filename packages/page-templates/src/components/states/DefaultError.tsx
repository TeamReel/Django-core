import React from 'react';

export interface DefaultErrorProps {
  error?: Error | string;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Default error state component
 * Shows error message with optional retry button
 *
 * TODO: Replace with F01 design system error component when available
 */
export const DefaultError: React.FC<DefaultErrorProps> = ({
  error,
  title = 'Something went wrong',
  message = 'An error occurred while loading the content. Please try again.',
  onRetry,
}) => {
  const errorMessage = error instanceof Error ? error.message : error;

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
      role="alert"
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '1rem',
          opacity: 0.3,
        }}
      >
        ⚠️
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 0.5rem 0', color: '#666', maxWidth: '400px' }}>
        {message}
      </p>
      {errorMessage && (
        <p style={{ margin: '0 0 1.5rem 0', color: '#999', fontSize: '0.875rem', maxWidth: '400px' }}>
          {errorMessage}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
};
