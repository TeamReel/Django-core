import { forwardRef, type ElementType, type ComponentPropsWithoutRef } from 'react';
import { text, type TextSize, type TextWeight, type TextColor } from './Text.css';

type TextOwnProps = {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  as?: ElementType;
};

export type TextProps<T extends ElementType = 'p'> = TextOwnProps &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps>;

export const Text = forwardRef<HTMLElement, TextProps>(
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
