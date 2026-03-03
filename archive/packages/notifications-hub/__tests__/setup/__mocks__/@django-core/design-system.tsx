import React from 'react';

export const Badge = React.forwardRef<HTMLSpanElement, any>(
  ({ children, className, ...props }, ref) => (
    <span ref={ref} className={className} data-testid="badge" {...props}>
      {children}
    </span>
  )
);

Badge.displayName = 'Badge';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: string;
  size?: string;
};

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
export type BadgeSize = 'sm' | 'md';
