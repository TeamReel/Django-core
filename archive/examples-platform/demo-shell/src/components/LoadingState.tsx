/**
 * LoadingState component provides reusable loading UI patterns.
 * Uses simple CSS animations to create skeleton screens and spinners.
 */

interface LoadingStateProps {
  /**
   * Type of loading indicator to display
   * - 'spinner': Centered spinning loader
   * - 'skeleton': Skeleton screen with animated placeholders
   * - 'inline': Small inline spinner for buttons/forms
   */
  type?: 'spinner' | 'skeleton' | 'inline';
  /**
   * Number of skeleton lines to show (only for type='skeleton')
   */
  lines?: number;
  /**
   * Custom message to display below the loader
   */
  message?: string;
}

export default function LoadingState({
  type = 'spinner',
  lines = 3,
  message
}: LoadingStateProps) {
  if (type === 'inline') {
    return (
      <span style={{
        display: 'inline-block',
        width: '16px',
        height: '16px',
        border: '2px solid #f3f3f3',
        borderTop: '2px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        verticalAlign: 'middle'
      }} />
    );
  }

  if (type === 'skeleton') {
    return (
      <div style={{ padding: '20px' }}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            style={{
              height: index === 0 ? '32px' : '20px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              marginBottom: '12px',
              animation: 'pulse 1.5s ease-in-out infinite',
              width: index === 0 ? '60%' : index === lines - 1 ? '80%' : '100%'
            }}
          />
        ))}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // Default: centered spinner
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      padding: '40px 20px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />

      {message && (
        <p style={{
          marginTop: '16px',
          color: '#666',
          fontSize: '16px'
        }}>
          {message}
        </p>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * LoadingOverlay component displays a full-screen loading overlay.
 * Useful for blocking the entire UI during critical operations.
 */
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          border: '6px solid #f3f3f3',
          borderTop: '6px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />

        <p style={{
          marginTop: '24px',
          color: '#333',
          fontSize: '18px',
          fontWeight: 500
        }}>
          {message}
        </p>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
