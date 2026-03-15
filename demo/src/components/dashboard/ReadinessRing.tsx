/**
 * ReadinessRing — SVG circular progress indicator.
 *
 * Shows match/content readiness as a ring with percentage label.
 * Color: red < 30%, amber 30-70%, green > 70%.
 * Respects prefers-reduced-motion (instant transition).
 */
import React from 'react';

export interface ReadinessRingProps {
  percent: number;      // 0-100
  size?: number;        // px, default 40
  strokeWidth?: number; // default 3
  showLabel?: boolean;  // show percentage in center
}

export const ReadinessRing: React.FC<ReadinessRingProps> = ({
  percent,
  size = 40,
  strokeWidth = 3,
  showLabel = true,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped < 30
      ? 'var(--color-red-500, #ef4444)'
      : clamped < 70
        ? 'var(--color-amber-400, #fbbf24)'
        : 'var(--color-green-500, #22c55e)';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Wedstrijd gereedheid: ${Math.round(clamped)}%`}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--app-border, #e0e0e0)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="readinessRingProgress"
      />
      {/* Label */}
      {showLabel && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--app-text, #1a1a2e)"
          fontSize={size * 0.28}
          fontWeight={600}
        >
          {Math.round(clamped)}%
        </text>
      )}
    </svg>
  );
};
