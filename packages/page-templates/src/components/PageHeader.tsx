import { ReactNode, HTMLAttributes } from 'react';

export interface BreadcrumbItem {
  label: string | ReactNode;
  path?: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

/**
 * PageHeader - Simple header component for pages
 * Displays title, subtitle, breadcrumbs, and optional action buttons
 */
export function PageHeader({ title, subtitle, breadcrumbs, actions, ...props }: PageHeaderProps) {
  const renderBreadcrumbs = false;
  return (
    <div
      style={{
        padding: '24px',
        borderBottom: '1px solid var(--app-border)',
        backgroundColor: 'var(--app-surface)',
        color: 'var(--app-text)',
      }}
      {...props}
    >
      {renderBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            fontSize: '12px',
            color: 'var(--app-muted-text)',
          }}
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {index > 0 && <span>/</span>}
              {typeof crumb.label === 'string' && (crumb.path || crumb.href || crumb.onClick) && !crumb.current ? (
                <a
                  href={crumb.path || crumb.href || '#'}
                  onClick={(e) => {
                    if (crumb.onClick) {
                      e.preventDefault();
                      crumb.onClick();
                    }
                  }}
                  style={{
                    color: 'var(--app-muted-text)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {crumb.label}
                </a>
              ) : typeof crumb.label === 'string' ? (
                <span
                  style={{
                    color: crumb.current ? 'var(--app-text)' : 'var(--app-muted-text)',
                    fontWeight: crumb.current ? 600 : 400,
                  }}
                >
                  {crumb.label}
                </span>
              ) : (
                // Render ReactNode directly (e.g., BreadcrumbContextSwitcher)
                crumb.label
              )}
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 8px 0',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--app-text)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: 'var(--app-muted-text)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
