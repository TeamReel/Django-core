import React from 'react';
import type { DashboardProps, DashboardComponent } from '../../types';
import { DashboardHeader } from './DashboardHeader';
import { DashboardGrid } from './DashboardGrid';
import { DashboardFilterBar } from './DashboardFilterBar';
import { DefaultLoading } from '../states/DefaultLoading';
import { DefaultEmpty } from '../states/DefaultEmpty';
import { DefaultError } from '../states/DefaultError';

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
const DashboardFC: React.FC<DashboardProps> = ({
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

// Create compound component by attaching sub-components
export const Dashboard = DashboardFC as DashboardComponent;
Dashboard.Header = DashboardHeader;
Dashboard.Grid = DashboardGrid;
Dashboard.FilterBar = DashboardFilterBar;
Dashboard.displayName = 'Dashboard';
