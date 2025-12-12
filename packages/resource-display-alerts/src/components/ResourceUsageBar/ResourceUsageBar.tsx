/**
 * ResourceUsageBar Component
 * Visualizes resource usage (credits, storage, API calls) with severity-based colors
 */

import React from 'react';
import {
  calculatePercentage,
  getSeverity,
  formatDisplayText,
  getSeverityColor,
} from './utils';
import styles from './ResourceUsageBar.module.css';

export interface ResourceUsageBarProps {
  /**
   * Current usage value (numeric)
   */
  value: number;

  /**
   * Maximum value (denominator for percentage calculation)
   */
  max: number;

  /**
   * Optional label shown above or beside the progress bar
   * @example "API Credits"
   */
  label?: string;

  /**
   * Optional unit for value display
   * @example "credits", "GB", "calls"
   */
  unit?: string;

  /**
   * Whether to show percentage (e.g., "85%") or value/max (e.g., "850/1000")
   * @default false (shows value/max)
   */
  showPercentage?: boolean;

  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Optional ARIA label (overrides default)
   */
  'aria-label'?: string;
}

/**
 * Progress bar component for visualizing resource usage with severity-based colors
 */
export const ResourceUsageBar: React.FC<ResourceUsageBarProps> = ({
  value,
  max,
  label,
  unit,
  showPercentage = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const percentage = calculatePercentage(value, max);
  const severity = getSeverity(percentage);
  const displayText = formatDisplayText(value, max, unit, showPercentage);
  const barColor = getSeverityColor(severity);

  // Enhanced ARIA label with severity warning for high usage
  const ariaLabelText =
    ariaLabel ||
    (() => {
      const severityText = severity === 'high' ? 'warning: high usage' : '';
      return `${label || 'Resource usage'}: ${displayText} ${severityText}`.trim();
    })();

  return (
    <div className={className}>
      {label && <div className={styles.label}>{label}</div>}

      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabelText}
        className={styles.container}
      >
        <div
          className={styles.bar}
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      <div className={styles.text}>{displayText}</div>
    </div>
  );
};
