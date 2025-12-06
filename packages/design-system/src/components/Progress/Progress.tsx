import { forwardRef, type HTMLAttributes } from 'react';
import { progress, progressBar, progressLabel, type ProgressSize } from './Progress.css';

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  value: number;
  max?: number;
  size?: ProgressSize;
  label?: string;
  showLabel?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      label,
      showLabel = false,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const accessibleLabel = ariaLabel || label || `${percentage.toFixed(0)}% complete`;

    return (
      <div className={className} ref={ref} {...props}>
        {showLabel && label && <div className={progressLabel}>{label}</div>}
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={accessibleLabel}
          className={progress({ size })}
        >
          <div className={progressBar} style={{ width: `${percentage}%` }} />
        </div>
        {showLabel && !label && (
          <div className={progressLabel}>{percentage.toFixed(0)}%</div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';
