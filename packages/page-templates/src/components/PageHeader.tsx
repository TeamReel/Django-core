import { ReactNode, HTMLAttributes } from 'react';

export interface BreadcrumbItem {
  label: string;
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
  return (
    <div
      style={{
        padding: '24px',
        borderBottom: '1px solid #e5e5e5',
        backgroundColor: '#fff',
      }}
      {...props}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {index > 0 && <span>/</span>}
              {(crumb.path || crumb.href || crumb.onClick) && !crumb.current ? (
                <a
                  href={crumb.path || crumb.href || '#'}
                  onClick={(e) => {
                    if (crumb.onClick) {
                      e.preventDefault();
                      crumb.onClick();
                    }
                  }}
                  style={{
                    color: '#6b7280',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {crumb.label}
                </a>
              ) : (
                <span
                  style={{
                    color: crumb.current ? '#1f2937' : '#6b7280',
                    fontWeight: crumb.current ? 600 : 400,
                  }}
                >
                  {crumb.label}
                </span>
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
              color: '#1f2937',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
