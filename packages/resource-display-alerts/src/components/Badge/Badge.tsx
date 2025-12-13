/**
 * Badge Component
 * Badge for displaying counts or status labels
 */

import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  /**
   * Badge content (usually a number or short text)
   */
  children: React.ReactNode;

  /**
   * Color variant (maps to F01 color tokens)
   * @default "neutral"
   */
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info';

  /**
   * Size variant
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * Get background color for badge variant
 */
const getBadgeBackgroundColor = (variant: BadgeProps['variant']): string => {
  switch (variant) {
    case 'success':
      return 'var(--color-success-100, #dcfce7)'; // Light green
    case 'warning':
      return 'var(--color-warning-100, #fef3c7)'; // Light yellow
    case 'error':
      return 'var(--color-error-100, #fee2e2)'; // Light red
    case 'info':
      return 'var(--color-info-100, #dbeafe)'; // Light blue
    case 'neutral':
    default:
      return 'var(--color-neutral-200, #e5e7eb)'; // Light gray
  }
};

/**
 * Get text color for badge variant (dark shade for contrast)
 */
const getBadgeTextColor = (variant: BadgeProps['variant']): string => {
  switch (variant) {
    case 'success':
      return 'var(--color-success-800, #166534)';
    case 'warning':
      return 'var(--color-warning-800, #92400e)';
    case 'error':
      return 'var(--color-error-800, #991b1b)';
    case 'info':
      return 'var(--color-info-800, #1e40af)';
    case 'neutral':
    default:
      return 'var(--color-neutral-800, #1f2937)';
  }
};

/**
 * Badge component for displaying counts or status labels
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'medium',
  className,
}) => {
  const backgroundColor = getBadgeBackgroundColor(variant);
  const textColor = getBadgeTextColor(variant);

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${className || ''}`}
      style={{ backgroundColor, color: textColor }}
    >
      {children}
    </span>
  );
};
