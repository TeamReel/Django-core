import { forwardRef, type HTMLAttributes } from 'react';
import { container, type ContainerMaxWidth } from './Container.css';
import { themeVars } from '../../tokens/theme.css';

type SpacingKey = keyof typeof themeVars.spacing;

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: ContainerMaxWidth;
  padding?: SpacingKey;
  centered?: boolean;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ maxWidth = 'lg', padding = '4', centered = true, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${container({ maxWidth, centered })} ${className ?? ''}`}
        style={{
          paddingInline: themeVars.spacing[padding],
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';
