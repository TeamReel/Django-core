import { forwardRef, type ElementType, type ComponentPropsWithoutRef } from 'react';
import { text, type TextSize, type TextWeight, type TextColor } from './Text.css';

type TextOwnProps<T extends ElementType = ElementType> = {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  as?: T;
};

export type TextProps<T extends ElementType = 'p'> = TextOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps>;

export const Text = forwardRef(
  <T extends ElementType = 'p'>(
    { size = 'md', weight = 'normal', color = 'primary', as, className, children, ...props }: TextProps<T>,
    ref: React.Ref<any>
  ) => {
    const Component = as || ('p' as ElementType);
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
) as <T extends ElementType = 'p'>(props: TextProps<T> & { ref?: React.Ref<Element> }) => React.ReactElement;

(Text as any).displayName = 'Text';
