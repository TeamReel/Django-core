import React from 'react';
import { useControlledState } from '../../hooks/useControlledState';
import { useResponsive } from '../../hooks/useResponsive';

export interface DashboardFilterBarProps {
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

  /** ARIA label for the filter bar */
  'aria-label'?: string;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Dashboard filter bar for data filtering controls.
 * Supports collapsible behavior on mobile devices.
 *
 * @example
 * ```tsx
 * <Dashboard.FilterBar collapsible>
 *   <DateRangePicker />
 *   <CategoryFilter />
 *   <SearchInput />
 * </Dashboard.FilterBar>
 * ```
 */
export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  children,
  collapsible = false,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  'aria-label': ariaLabel = 'Filter options',
  className,
}) => {
  const { isMobile } = useResponsive();
  const [collapsed, setCollapsed] = useControlledState(
    controlledCollapsed,
    defaultCollapsed,
    onCollapsedChange
  );

  const shouldShowCollapse = collapsible && isMobile;

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <nav
      className={className}
      aria-label={ariaLabel}
      style={{
        marginBottom: '1.5rem',
      }}
    >
      {shouldShowCollapse && (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={!collapsed}
          aria-controls="filter-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0.75rem 1rem',
            border: '1px solid var(--color-border, #ddd)',
            borderRadius: '0.375rem',
            background: 'var(--color-background, #fff)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: collapsed ? 0 : '0.75rem',
          }}
        >
          <span>Filters</span>
          <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </button>
      )}
      {(!shouldShowCollapse || !collapsed) && (
        <div
          id="filter-content"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            padding: shouldShowCollapse ? '1rem' : '0',
            border: shouldShowCollapse ? '1px solid var(--color-border, #ddd)' : 'none',
            borderRadius: shouldShowCollapse ? '0.375rem' : '0',
            background: shouldShowCollapse ? 'var(--color-background, #fff)' : 'transparent',
          }}
        >
          {children}
        </div>
      )}
    </nav>
  );
};

DashboardFilterBar.displayName = 'DashboardFilterBar';
