import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { text, type TextSize, type TextWeight, type TextColor } from './Text.css';

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  as?: ElementType;
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ size = 'md', weight = 'normal', color = 'primary', as: Component = 'p', className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={`${text({ size, weight, color })} ${className ?? ''}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';
