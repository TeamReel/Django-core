import React from 'react';

export interface DashboardHeaderProps {
  /** Page title */
  title: string | React.ReactNode;

  /** Subtitle or description */
  subtitle?: string | React.ReactNode;

  /** Action buttons (e.g., refresh, export, settings) */
  actions?: React.ReactNode;

  /** Breadcrumb navigation */
  breadcrumbs?: React.ReactNode;

  /** ARIA label for the header region */
  'aria-label'?: string;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Dashboard header region with title, subtitle, and actions.
 *
 * @example
 * ```tsx
 * <Dashboard.Header
 *   title="Analytics Dashboard"
 *   subtitle="Real-time metrics and insights"
 *   actions={<RefreshButton />}
 * />
 * ```
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  'aria-label': ariaLabel = 'Dashboard header',
  className,
}) => {
  return (
    <header
      className={className}
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1.5rem',
      }}
    >
      {breadcrumbs && (
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #666)' }}>
          {breadcrumbs}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          {typeof title === 'string' ? (
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600 }}>{title}</h1>
          ) : (
            title
          )}
          {subtitle && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary, #666)' }}>
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

DashboardHeader.displayName = 'DashboardHeader';
