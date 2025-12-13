import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

export interface DashboardGridProps {
  /** Widget components */
  children: React.ReactNode;

  /** Number of columns (responsive) */
  columns?:
    | number
    | {
        mobile?: number;
        tablet?: number;
        desktop?: number;
      };

  /** Gap between widgets (in spacing units) */
  gap?: 'sm' | 'md' | 'lg';

  /** Additional CSS class name */
  className?: string;
}

const GAP_MAP = {
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
};

/**
 * Dashboard grid layout for arranging widgets responsively.
 *
 * @example
 * ```tsx
 * <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
 *   <Widget title="Revenue" value="$45,231" />
 *   <Widget title="Users" value="1,234" />
 *   <Widget title="Conversion" value="12.5%" />
 * </Dashboard.Grid>
 * ```
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className,
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Determine column count based on responsive breakpoint
  const columnCount = React.useMemo(() => {
    if (typeof columns === 'number') {
      return columns;
    }

    if (isMobile) {
      return columns.mobile ?? 1;
    }

    if (isTablet) {
      return columns.tablet ?? 2;
    }

    return columns.desktop ?? 3;
  }, [columns, isMobile, isTablet]);

  const gapValue = GAP_MAP[gap];

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: gapValue,
      }}
      role="group"
      aria-label="Dashboard widgets"
    >
      {children}
    </div>
  );
};

DashboardGrid.displayName = 'DashboardGrid';
