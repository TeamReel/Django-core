import type { ReactNode, TableHTMLAttributes, CSSProperties } from 'react';
import { themeVars } from '@django-core/design-system';
import styles from './design-system.module.css';

export * from '@django-core/design-system';

export type PageHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
};
export const PageHeader = ({ title, subtitle, children, ...rest }: PageHeaderProps) => (
  <div className={styles.pageHeader} {...rest}>
    {title ? <h1 className={styles.pageTitle} style={{ '--title-color': themeVars.color.text.primary } as CSSProperties}>{title}</h1> : null}
    {subtitle ? <p className={styles.pageSubtitle} style={{ '--subtitle-color': themeVars.color.text.secondary } as CSSProperties}>{subtitle}</p> : null}
    {children}
  </div>
);

export type PageContentProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};
export const PageContent = ({ children, className, style }: PageContentProps) => (
  <div className={`${styles.pageContent}${className ? ` ${className}` : ''}`} style={style}>
    {children}
  </div>
);

export type FileUploadFile = unknown;

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
  responsive?: boolean;
};

export const Table = ({ children, columns, rows, loading, style, responsive = true, className: userClassName, ...rest }: TableProps) => {
  const tableClassName = `${styles.table}${userClassName ? ` ${userClassName}` : ''}`;

  const wrap = (tableEl: ReactNode) => {
    if (!responsive) return tableEl;
    return (
      <div className={styles.tableWrapper}>
        {tableEl}
      </div>
    );
  };

  if (columns && rows) {
    return wrap(
      <table className={tableClassName} style={style} {...rest}>
        <thead>
          <tr className={styles.headerRow}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={styles.tableHeaderCell}
                data-sortable={col.sortable ? 'true' : undefined}
                onClick={col.onSort}
              >
                {col.label}
                {col.sorted === 'asc' && ' \u25B2'}
                {col.sorted === 'desc' && ' \u25BC'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            // key={i} acceptable: generic rows without guaranteed unique field
            <tr key={i} className={styles.dataRow}>
              {columns.map((col) => (
                <td key={col.key} className={styles.tableCell}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return wrap(
    <table className={tableClassName} style={style} {...rest}>
      {children}
    </table>
  );
};
