import type { ReactNode, TableHTMLAttributes, CSSProperties } from 'react';
// @ts-expect-error: dist package has no bundled .d.ts in this snapshot
import * as RealDesignSystem from '../../../../packages/design-system/dist/index.js';
import { themeVars } from '@django-core/theme-system';

// @ts-expect-error: dist package has no bundled .d.ts in this snapshot
export * from '../../../../packages/design-system/dist/index.js';

export type PageHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
};
export const PageHeader = ({ title, subtitle, children, ...rest }: PageHeaderProps) => (
  <div style={{ marginBottom: '16px' }} {...rest}>
    {title ? <h1 style={{ margin: 0, color: themeVars.color.text.primary }}>{title}</h1> : null}
    {subtitle ? <p style={{ margin: '4px 0', color: themeVars.color.text.secondary }}>{subtitle}</p> : null}
    {children}
  </div>
);

export type PageContentProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};
export const PageContent = ({ children, className, style }: PageContentProps) => (
  <div style={{ display: 'grid', gap: '16px', ...style }} className={className}>
    {children}
  </div>
);

export type FileUploadFile = any;

export type TableColumn = {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  sorted?: 'asc' | 'desc';
  onSort?: () => void;
};

export type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  columns?: TableColumn[];
  rows?: Record<string, ReactNode>[];
  loading?: boolean;
};

export const Table = ({ children, columns, rows, loading, ...rest }: TableProps) => {
  if (columns && rows) {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} {...rest}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ padding: '12px', cursor: col.sortable ? 'pointer' : 'default' }}
                onClick={col.onSort}
              >
                {col.label}
                {col.sorted === 'asc' && ' ▲'}
                {col.sorted === 'desc' && ' ▼'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '12px' }}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }} {...rest}>
      {children}
    </table>
  );
};

// Fallbacks for named exports expected by demos
// We need to explicitly export these if they are not found in RealDesignSystem
// But since we do export * from ..., they should be there.
// However, if RealDesignSystem is a CJS module, the named exports might be on .default
const DS = (RealDesignSystem as any).default || RealDesignSystem;

export const { Card, Button, Badge, Text, Spinner, Alert, Modal, Input, Stack, ThemeProvider } =
  DS as Record<string, unknown>;
