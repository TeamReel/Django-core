/**
 * HealthStatus Component
 * Displays system health status with color-coded indicators
 */

import React from 'react';
import {
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
  formatRelativeTime,
} from './utils';
import type { HealthStatusType } from './utils';
import styles from './HealthStatus.module.css';

export interface HealthStatusProps {
  /**
   * Service or resource name
   * @example "Database"
   */
  name: string;

  /**
   * Current health status
   */
  status: HealthStatusType;

  /**
   * Optional details or error message
   * @example "High response time (1.2s avg)"
   */
  details?: string;

  /**
   * Optional last checked timestamp (ISO 8601 format)
   * @example "2025-12-12T10:30:00Z"
   */
  lastChecked?: string;

  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Size variant
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Component for displaying system health status with visual indicators
 */
export const HealthStatus: React.FC<HealthStatusProps> = ({
  name,
  status,
  details,
  lastChecked,
  className,
  size = 'medium',
}) => {
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  const statusIcon = getStatusIcon(status);
  const formattedTime = lastChecked ? formatRelativeTime(lastChecked) : null;

  return (
    <div className={`${styles.container} ${styles[size]} ${className || ''}`}>
      <div className={styles.header}>
        <span
          className={styles.icon}
          style={{ color: statusColor }}
          role="img"
          aria-label={`${statusLabel} status`}
        >
          {statusIcon}
        </span>
        <span className={styles.name}>{name}</span>
        <span className={styles.status} style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {details && <div className={styles.details}>{details}</div>}

      {formattedTime && (
        <div className={styles.timestamp}>Last checked {formattedTime}</div>
      )}
    </div>
  );
};
