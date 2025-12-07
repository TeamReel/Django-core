import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { button, type ButtonVariant, type ButtonSize } from './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      fullWidth,
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`${button({ variant, size, fullWidth })} ${className ?? ''}`}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="spinner" aria-hidden="true">
            ⟳
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
