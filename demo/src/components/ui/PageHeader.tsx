/**
 * PageHeader — consistent page-level header with title, subtitle, and action slot.
 *
 * Unifies the shimmed PageHeader from page-templates and ad-hoc h1 headers.
 */
import React from 'react';

export interface PageHeaderProps {
  /** Page title */
  title: React.ReactNode;
  /** Optional subtitle */
  subtitle?: React.ReactNode;
  /** Action buttons / controls rendered on the right */
  actions?: React.ReactNode;
  /** Additional content below the title row */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, children, className = '' }: PageHeaderProps) {
  return (
    <div className={className}>
      <div className="flex-row gap-12" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 className="m-0 fw-800" style={{ fontSize: 'var(--text-xl)', color: 'var(--app-text)' }}>{title}</h1>
          {subtitle && (
            <p className="m-0 mt-4" style={{ fontSize: 'var(--text-sm)', color: 'var(--app-text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex-row gap-8 flex-wrap">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
