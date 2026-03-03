/**
 * AlertStack Component
 *
 * Manages multiple alerts with positioning and visibility limits.
 * Supports inline and fixed positioning modes.
 *
 * @example
 * ```tsx
 * <AlertStack position="top-center" maxVisible={5}>
 *   <Alert severity="error">Error 1</Alert>
 *   <Alert severity="warning">Warning 2</Alert>
 *   <Alert severity="info">Info 3</Alert>
 * </AlertStack>
 * ```
 */

import React, { Children, useState } from 'react';
import styles from './AlertStack.module.css';

export interface AlertStackProps {
  /**
   * Alert components to stack
   */
  children: React.ReactNode;

  /**
   * Positioning mode
   * - inline: Normal document flow (default)
   * - top-center: Fixed at top center of viewport
   * @default "inline"
   */
  position?: 'inline' | 'top-center';

  /**
   * Maximum visible alerts (rest hidden with "View all" link)
   * @default 5
   */
  maxVisible?: number;

  /**
   * Callback when "View all" is clicked
   */
  onViewAll?: () => void;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

export const AlertStack: React.FC<AlertStackProps> = ({
  children,
  position = 'inline',
  maxVisible = 5,
  onViewAll,
  className = '',
}) => {
  const [showAll, setShowAll] = useState(false);

  const childArray = Children.toArray(children);
  const visibleChildren = showAll ? childArray : childArray.slice(0, maxVisible);
  const hasMore = childArray.length > maxVisible;

  const handleViewAll = () => {
    setShowAll(true);
    onViewAll?.();
  };

  return (
    <div
      className={`${styles.stack} ${styles[position]} ${className}`}
      role="region"
      aria-label="Alert notifications"
    >
      {visibleChildren.map((child, index) => (
        <div key={index} className={styles.item}>
          {child}
        </div>
      ))}

      {hasMore && !showAll && (
        <button
          onClick={handleViewAll}
          className={styles.viewAll}
          type="button"
          aria-label={`View all ${childArray.length} alerts`}
        >
          View all ({childArray.length} alerts)
        </button>
      )}
    </div>
  );
};
