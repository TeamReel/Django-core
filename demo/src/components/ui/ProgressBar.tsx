/**
 * ProgressBar — thin UI primitive for progress indication.
 *
 * Wraps the common inline progress-bar pattern found in 10+ files.
 * For the design-system version, use `import { Progress } from '@django-core/design-system'`.
 */
import React from 'react';

export interface ProgressBarProps {
  /** 0–100 percent complete */
  percent: number;
  /** Height in px — defaults to 8 */
  height?: number;
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Show percentage label */
  showLabel?: boolean;
  /** Extra className on wrapper */
  className?: string;
}

const VARIANT_COLORS: Record<string, string> = {
  primary: 'var(--color-primary-400, #3B8EA5)',
  success: 'var(--color-green-500, #06D6A0)',
  warning: 'var(--color-amber-400, #f59e0b)',
  error:   'var(--color-red-400, #E63946)',
};

export function ProgressBar({
  percent,
  height = 8,
  variant = 'primary',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={className}>
      <div
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: 'var(--app-surface-2, #e5e5e5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: height / 2,
            backgroundColor: VARIANT_COLORS[variant],
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {showLabel && (
        <div className="fs-12 text-muted mt-4" style={{ textAlign: 'right' }}>
          {Math.round(clamped)}%
        </div>
      )}
    </div>
  );
}
