import { forwardRef, type HTMLAttributes } from 'react';
import { alert, alertIcon, alertContent, alertClose, type AlertVariant } from './Alert.css';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const icons: Record<AlertVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = 'info',
      title,
      dismissible = false,
      onDismiss,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

    return (
      <div
        ref={ref}
        role={role}
        aria-live={role === 'alert' ? 'assertive' : 'polite'}
        className={`${alert({ variant })} ${className ?? ''}`}
        {...props}
      >
        <span className={alertIcon({ variant })} aria-hidden="true">
          {icons[variant]}
        </span>
        <div className={alertContent}>
          {title && <strong>{title}</strong>}
          <div>{children}</div>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={alertClose}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
