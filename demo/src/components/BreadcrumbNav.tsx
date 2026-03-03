/**
 * BreadcrumbNav — Shared breadcrumb `<nav><ol>` renderer.
 * Replaces 5 duplicate render blocks in Breadcrumbs.tsx.
 */
import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: React.ReactNode;
  path: string;
  isLeaf?: boolean;
}

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex-row">
      <ol className="flex-row p-0 m-0 flex-wrap" style={{ listStyle: 'none' }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}:${item.path}`} className="flex-row">
              {index > 0 && (
                <span className="fs-14" style={{ margin: '0 8px', color: 'var(--app-muted-text)' }}>/</span>
              )}
              {typeof item.label === 'string' ? (
                <Link
                  to={item.path}
                  className="fs-14 whitespace-nowrap"
                  style={{
                    color: isLast ? 'var(--app-text)' : 'var(--app-muted-text)',
                    textDecoration: 'none',
                    fontWeight: isLast ? 600 : 400,
                  }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="inline-flex fs-14 whitespace-nowrap"
                  style={{
                    color: isLast ? 'var(--app-text)' : 'var(--app-muted-text)',
                    fontWeight: isLast ? 600 : 400,
                    alignItems: 'center',
                  }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
