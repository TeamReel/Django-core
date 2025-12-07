import { forwardRef, type HTMLAttributes } from 'react';
import { card, type CardVariant, type CardPadding } from './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'outlined', padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${card({ variant, padding })} ${className ?? ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
