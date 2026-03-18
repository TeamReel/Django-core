/**
 * ProgressRing — Animated circular progress indicator.
 *
 * @example
 * <ProgressRing value={75} max={100} size={48} />
 */
import React from 'react';
import styles from './Charts.module.css';

interface ProgressRingProps {
  /** Current value */
  value: number;
  /** Max value (default 100) */
  max?: number;
  /** Diameter in px (default 48) */
  size?: number;
  /** Stroke width (default 4) */
  strokeWidth?: number;
  /** Color (default --app-primary) */
  color?: string;
  /** Show percentage label */
  showLabel?: boolean;
  className?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = 'var(--app-primary)',
  showLabel = false,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / max, 0), 1);
  const dashoffset = circumference * (1 - progress);
  const percentage = Math.round(progress * 100);

  return (
    <div
      className={`${styles.progressRingWrapper} ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${percentage}%`}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--app-border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={styles.progressRingArc}
        />
      </svg>
      {showLabel && (
        <span className={styles.progressRingLabel}>{percentage}%</span>
      )}
    </div>
  );
}
