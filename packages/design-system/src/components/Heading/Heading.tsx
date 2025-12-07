import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { heading, type HeadingLevel } from './Heading.css';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: ElementType;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 1, as, className, children, ...props }, ref) => {
    const Component = as || (`h${level}` as ElementType);

    return (
      <Component
        ref={ref}
        className={`${heading({ level })} ${className ?? ''}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = 'Heading';
