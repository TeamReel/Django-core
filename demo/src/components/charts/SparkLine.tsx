/**
 * SparkLine — Minimal SVG sparkline for inline trend display.
 *
 * No dependencies. Pure SVG polyline.
 *
 * @example
 * <SparkLine data={[3, 7, 4, 8, 2, 6]} width={80} height={24} />
 */
import React from 'react';
import styles from './Charts.module.css';

interface SparkLineProps {
  /** Data points (will be normalized to height) */
  data: number[];
  /** Width in px (default 80) */
  width?: number;
  /** Height in px (default 24) */
  height?: number;
  /** Line color (default --app-primary) */
  color?: string;
  /** Fill below line */
  showFill?: boolean;
  className?: string;
}

export function SparkLine({
  data,
  width = 80,
  height = 24,
  color = 'var(--app-primary)',
  showFill = false,
  className,
}: SparkLineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  // Fill path: close the polyline at the bottom
  const fillPath = showFill
    ? `M${padding},${height - padding} ${data
        .map((value, i) => {
          const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
          const y = height - padding - ((value - min) / range) * (height - padding * 2);
          return `L${x},${y}`;
        })
        .join(' ')} L${width - padding},${height - padding} Z`
    : undefined;

  const ariaLabel = `Trendlijn: ${data.join(', ')}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      className={`${styles.sparkLine} ${className ?? ''}`}
    >
      {showFill && fillPath && (
        <path d={fillPath} fill={color} opacity={0.15} />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.sparkLinePath}
      />
    </svg>
  );
}
