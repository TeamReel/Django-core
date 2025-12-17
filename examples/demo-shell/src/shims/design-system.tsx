import type { ReactNode, TableHTMLAttributes, CSSProperties } from 'react';
// @ts-expect-error: dist package has no bundled .d.ts in this snapshot
import * as RealDesignSystem from '../../../../packages/design-system/dist/index.js';

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
    {title ? <h1 style={{ margin: 0 }}>{title}</h1> : null}
    {subtitle ? <p style={{ margin: '4px 0', color: '#555' }}>{subtitle}</p> : null}
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

export type TableProps = TableHTMLAttributes<HTMLTableElement>;
export const Table = ({ children, ...rest }: TableProps) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }} {...rest}>
    {children}
  </table>
);

// Fallbacks for named exports expected by demos
export const { Card, Button, Badge, Text, Spinner, Alert, Modal, Input, Stack, ThemeProvider } =
  RealDesignSystem as Record<string, unknown>;
