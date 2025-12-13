/**
 * Dashboard Template Component Contracts
 */

import * as React from 'react';
import { A11yProps, StateRenderProps, ResponsiveProps } from './common';

/**
 * Main Dashboard template component
 *
 * @example
 * ```tsx
 * <Dashboard>
 *   <Dashboard.Header
 *     title="Analytics Dashboard"
 *     actions={<RefreshButton />}
 *   />
 *   <Dashboard.FilterBar>
 *     <DateRangePicker />
 *   </Dashboard.FilterBar>
 *   <Dashboard.Grid columns={3}>
 *     <Widget title="Revenue" value="$45,231" />
 *     <Widget title="Users" value="1,234" />
 *     <Widget title="Conversion" value="12.5%" />
 *   </Dashboard.Grid>
 * </Dashboard>
 * ```
 */
export interface DashboardProps extends A11yProps, StateRenderProps {
  /** Child components (Header, FilterBar, Grid) */
  children: React.ReactNode;

  /** Loading state (controls default loading UI) */
  loading?: boolean;

  /** Error state (shows error UI if provided) */
  error?: Error | null;

  /** Empty state (shows empty UI if true and no children) */
  isEmpty?: boolean;

  /** Additional CSS class name */
  className?: string;

  /** Additional inline styles */
  style?: React.CSSProperties;
}

/**
 * Dashboard header region with title and actions
 */
export interface DashboardHeaderProps extends A11yProps {
  /** Page title */
  title: string | React.ReactNode;

  /** Subtitle or description */
  subtitle?: string | React.ReactNode;

  /** Action buttons (e.g., refresh, export, settings) */
  actions?: React.ReactNode;

  /** Breadcrumb navigation */
  breadcrumbs?: React.ReactNode;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Dashboard grid layout for widgets
 */
export interface DashboardGridProps extends ResponsiveProps {
  /** Widget components */
  children: React.ReactNode;

  /** Number of columns (responsive) */
  columns?: number | {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  /** Gap between widgets (in F01 spacing units) */
  gap?: 'sm' | 'md' | 'lg';

  /** Additional CSS class name */
  className?: string;
}

/**
 * Dashboard filter bar for data controls
 */
export interface DashboardFilterBarProps extends A11yProps {
  /** Filter components (e.g., dropdowns, date pickers) */
  children: React.ReactNode;

  /** Collapse on mobile (shows as expandable panel) */
  collapsible?: boolean;

  /** Initially collapsed state (if collapsible) */
  defaultCollapsed?: boolean;

  /** Controlled collapsed state */
  collapsed?: boolean;

  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Dashboard component with sub-components
 */
export interface DashboardComponent extends React.FC<DashboardProps> {
  Header: React.FC<DashboardHeaderProps>;
  Grid: React.FC<DashboardGridProps>;
  FilterBar: React.FC<DashboardFilterBarProps>;
}

export declare const Dashboard: DashboardComponent;
export declare const DashboardHeader: React.FC<DashboardHeaderProps>;
export declare const DashboardGrid: React.FC<DashboardGridProps>;
export declare const DashboardFilterBar: React.FC<DashboardFilterBarProps>;
