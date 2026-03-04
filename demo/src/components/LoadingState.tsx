/**
 * LoadingState component provides reusable loading UI patterns.
 * Uses simple CSS animations to create skeleton screens and spinners.
 */

import styles from './LoadingState.module.css';

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
      <span className={styles.inlineSpinner} />
    );
  }

  if (type === 'skeleton') {
    return (
      <div className={styles.skeletonContainer}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={styles.skeletonLine}
            data-variant={index === 0 ? 'first' : index === lines - 1 ? 'last' : undefined}
          />
        ))}
      </div>
    );
  }

  // Default: centered spinner
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner} />

      {message && (
        <p className={styles.message}>
          {message}
        </p>
      )}
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
    <div className={styles.overlayBackdrop}>
      <div className={styles.overlayContent}>
        <div className={styles.overlaySpinner} />

        <p className={styles.overlayMessage}>
          {message}
        </p>
      </div>
    </div>
  );
}
