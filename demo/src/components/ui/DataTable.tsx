/**
 * DataTable — generic sortable data table.
 *
 * A headless-ish table that accepts typed column definitions and renders
 * a styled table with optional sorting, row click, and empty state.
 *
 * Uses CSS utility classes + CSS custom properties from the app theme.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  /** Unique key — also used as the sort key when sortable */
  key: string;
  /** Column header label */
  header: React.ReactNode;
  /** Render the cell content for a row */
  render: (row: T, index: number) => React.ReactNode;
  /** Allow sorting on this column */
  sortable?: boolean;
  /** Custom sort comparator (defaults to string comparison of the key) */
  sortFn?: (a: T, b: T) => number;
  /** Column width (CSS value) */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Row data */
  data: T[];
  /** Unique key extractor for each row */
  rowKey: (row: T, index: number) => string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Extra className on the table wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = 'No data',
  loading = false,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortable) return data;

    const compare =
      col.sortFn ??
      ((a: T, b: T) => {
        const va = String((a as Record<string, unknown>)[sortKey] ?? '');
        const vb = String((b as Record<string, unknown>)[sortKey] ?? '');
        return va.localeCompare(vb);
      });

    const sorted = [...data].sort(compare);
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [data, columns, sortKey, sortDir]);

  return (
    <div className={`overflow-auto ${className}`}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...thStyle,
                  width: col.width,
                  textAlign: col.align ?? 'left',
                  cursor: col.sortable ? 'pointer' : 'default',
                }}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="flex-row gap-4" style={{ alignItems: 'center' }}>
                  {col.header}
                  {col.sortable && (
                    <span style={{ opacity: sortKey === col.key ? 1 : 0.3, lineHeight: 0 }}>
                      {sortKey === col.key && sortDir === 'asc' && <ChevronUp size={14} />}
                      {sortKey === col.key && sortDir === 'desc' && <ChevronDown size={14} />}
                      {sortKey !== col.key && <ChevronsUpDown size={14} />}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} style={{ ...cellStyle, textAlign: 'center', padding: 32 }}>
                <span style={{ color: 'var(--app-text-secondary)', fontSize: 14 }}>Loading…</span>
              </td>
            </tr>
          )}
          {!loading && sortedData.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ ...cellStyle, textAlign: 'center', padding: 32 }}>
                <span style={{ color: 'var(--app-text-secondary)', fontSize: 14 }}>{emptyMessage}</span>
              </td>
            </tr>
          )}
          {!loading &&
            sortedData.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderBottom: '1px solid var(--app-border)',
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ ...cellStyle, textAlign: col.align ?? 'left' }}>
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--app-text-secondary)',
  borderBottom: '2px solid var(--app-border)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const cellStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--app-text)',
};
