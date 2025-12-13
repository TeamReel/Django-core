import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardGrid } from './DashboardGrid';
import { DashboardFilterBar } from './DashboardFilterBar';
import { DefaultLoading } from '../states/DefaultLoading';
import { DefaultEmpty } from '../states/DefaultEmpty';
import { DefaultError } from '../states/DefaultError';

export interface DashboardProps {
  /** Child components (Header, FilterBar, Grid) */
  children: React.ReactNode;

  /** Loading state (controls default loading UI) */
  loading?: boolean;

  /** Error state (shows error UI if provided) */
  error?: Error | null;

  /** Empty state (shows empty UI if true and no children) */
  isEmpty?: boolean;

  /** Override default loading UI */
  renderLoading?: () => React.ReactNode;

  /** Override default empty UI */
  renderEmpty?: () => React.ReactNode;

  /** Override default error UI */
  renderError?: (error: Error) => React.ReactNode;

  /** ARIA label for the main region */
  'aria-label'?: string;

  /** Additional CSS class name */
  className?: string;

  /** Additional inline styles */
  style?: React.CSSProperties;
}

export interface DashboardComponent extends React.FC<DashboardProps> {
  Header: typeof DashboardHeader;
  Grid: typeof DashboardGrid;
  FilterBar: typeof DashboardFilterBar;
}

/**
 * Dashboard template component for displaying application dashboards with widgets.
 *
 * @example
 * ```tsx
 * <Dashboard>
 *   <Dashboard.Header title="Analytics" actions={<RefreshButton />} />
 *   <Dashboard.FilterBar>
 *     <DateRangePicker />
 *   </Dashboard.FilterBar>
 *   <Dashboard.Grid columns={3}>
 *     <Widget title="Revenue" value="$45,231" />
 *     <Widget title="Users" value="1,234" />
 *   </Dashboard.Grid>
 * </Dashboard>
 * ```
 */
export const Dashboard: DashboardComponent = ({
  children,
  loading = false,
  error = null,
  isEmpty = false,
  renderLoading,
  renderEmpty,
  renderError,
  'aria-label': ariaLabel = 'Dashboard',
  className,
  style,
}) => {
  // State rendering priority:
  // 1. Loading state
  if (loading) {
    return renderLoading ? <>{renderLoading()}</> : <DefaultLoading />;
  }

  // 2. Error state
  if (error) {
    return renderError ? <>{renderError(error)}</> : <DefaultError error={error} />;
  }

  // 3. Empty state
  if (isEmpty) {
    return renderEmpty ? <>{renderEmpty()}</> : <DefaultEmpty message="No dashboard widgets to display" />;
  }

  // 4. Success state - render children
  return (
    <main
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </main>
  );
};

// Attach sub-components to create compound component pattern
Dashboard.Header = DashboardHeader;
Dashboard.Grid = DashboardGrid;
Dashboard.FilterBar = DashboardFilterBar;

Dashboard.displayName = 'Dashboard';
