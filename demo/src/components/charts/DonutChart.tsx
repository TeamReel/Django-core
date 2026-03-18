/**
 * DonutChart — Lightweight SVG donut/ring chart.
 *
 * No dependencies. Uses SVG `stroke-dasharray` + `stroke-dashoffset`
 * for segment rendering. Accessible via aria-label.
 *
 * @example
 * <DonutChart
 *   segments={[
 *     { value: 64, color: 'var(--app-success)', label: 'Goedgekeurd' },
 *     { value: 2, color: 'var(--app-warning)', label: 'In review' },
 *     { value: 0, color: 'var(--app-error)', label: 'Afgewezen' },
 *   ]}
 *   size={120}
 * />
 */
import React from 'react';
import styles from './Charts.module.css';

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Diameter in px (default 120) */
  size?: number;
  /** Stroke width in px (default 16) */
  strokeWidth?: number;
  /** Show total in center */
  showTotal?: boolean;
  /** Custom center label */
  centerLabel?: string;
  className?: string;
}

export function DonutChart({
  segments,
  size = 120,
  strokeWidth = 16,
  showTotal = true,
  centerLabel,
  className,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let cumulativeOffset = 0;

  const ariaLabel = segments
    .map((s) => `${s.label}: ${s.value}`)
    .join(', ');

  return (
    <div className={`${styles.donutWrapper} ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={ariaLabel}
        className={styles.donutSvg}
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

        {/* Segments */}
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((segment) => {
              const segmentLength = (segment.value / total) * circumference;
              const offset = cumulativeOffset;
              cumulativeOffset += segmentLength;

              return (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  className={styles.donutSegment}
                />
              );
            })}
      </svg>

      {/* Center label */}
      {(showTotal || centerLabel) && (
        <div className={styles.donutCenter}>
          <span className={styles.donutTotal}>{centerLabel ?? total}</span>
        </div>
      )}
    </div>
  );
}
