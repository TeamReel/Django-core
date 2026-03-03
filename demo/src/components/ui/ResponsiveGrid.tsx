/**
 * ResponsiveGrid — auto-responsive CSS Grid container.
 *
 * Replaces ~64 inline `gridTemplateColumns` patterns with a typed component.
 */
import React from 'react';

export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum column width — defaults to '240px' */
  minWidth?: string;
  /** Fixed number of columns (overrides auto-fill) */
  columns?: number;
  /** Gap between items in px — defaults to 16 */
  gap?: number;
  children: React.ReactNode;
}

export function ResponsiveGrid({
  minWidth = '240px',
  columns,
  gap = 16,
  children,
  className = '',
  style,
  ...rest
}: ResponsiveGridProps) {
  const gridTemplateColumns = columns
    ? `repeat(${columns}, 1fr)`
    : `repeat(auto-fill, minmax(${minWidth}, 1fr))`;

  return (
    <div
      className={className}
      style={{ display: 'grid', gridTemplateColumns, gap, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
