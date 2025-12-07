import { forwardRef, type HTMLAttributes } from 'react';
import { spinner, type SpinnerSize } from './Spinner.css';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  label?: string;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', label = 'Loading', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={label}
        className={`${spinner({ size })} ${className ?? ''}`}
        {...props}
      >
        <span className="visually-hidden">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
