import React, { forwardRef, type HTMLAttributes, type CSSProperties } from 'react';
import { stack } from './Stack.css';
import { themeVars } from '../../tokens/theme.css';

type SpacingKey = keyof typeof themeVars.spacing;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: SpacingKey;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: boolean;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ direction = 'column', gap = '4', align, justify, wrap, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${stack({ direction, wrap })} ${className ?? ''}`}
        style={{
          gap: themeVars.spacing[gap],
          alignItems: align,
          justifyContent: justify,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';
