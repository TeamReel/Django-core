import { forwardRef, type HTMLAttributes } from 'react';
import { grid } from './Grid.css';
import { themeVars } from '../../tokens/theme.css';

type SpacingKey = keyof typeof themeVars.spacing;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: number | string;
  gap?: SpacingKey;
  rowGap?: SpacingKey;
  columnGap?: SpacingKey;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ columns = 12, gap = '4', rowGap, columnGap, className, style, children, ...props }, ref) => {
    const gridTemplateColumns = typeof columns === 'number'
      ? `repeat(${columns}, 1fr)`
      : columns;

    return (
      <div
        ref={ref}
        className={`${grid} ${className ?? ''}`}
        style={{
          gridTemplateColumns,
          gap: themeVars.spacing[gap],
          rowGap: rowGap ? themeVars.spacing[rowGap] : undefined,
          columnGap: columnGap ? themeVars.spacing[columnGap] : undefined,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
