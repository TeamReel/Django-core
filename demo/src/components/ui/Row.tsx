/**
 * Row — horizontal flex container with consistent gap spacing.
 *
 * Replaces the 200+ occurrences of `flex-row gap-*` pattern.
 */
import React from 'react';

export type RowGap = 0 | 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24;

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spacing between children in px — defaults to 8 */
  gap?: RowGap;
  /** Vertical alignment */
  align?: 'stretch' | 'start' | 'center' | 'end' | 'baseline';
  /** Horizontal distribution */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** Allow wrapping */
  wrap?: boolean;
  children: React.ReactNode;
}

const GAP_CLASSES: Record<RowGap, string> = {
  0: 'flex-row',
  2: 'flex-row gap-2',
  4: 'flex-row gap-4',
  6: 'flex-row gap-6',
  8: 'flex-row gap-8',
  10: 'flex-row gap-10',
  12: 'flex-row gap-12',
  16: 'flex-row gap-16',
  20: 'flex-row gap-20',
  24: 'flex-row gap-24',
};

const ALIGN_MAP: Record<string, string> = {
  stretch: '',
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
};

const JUSTIFY_MAP: Record<string, React.CSSProperties> = {
  start: {},
  center: { justifyContent: 'center' },
  end: { justifyContent: 'flex-end' },
  between: { justifyContent: 'space-between' },
  around: { justifyContent: 'space-around' },
};

export function Row({
  gap = 8,
  align = 'center',
  justify = 'start',
  wrap = false,
  children,
  className = '',
  style,
  ...rest
}: RowProps) {
  const cls = [
    GAP_CLASSES[gap],
    ALIGN_MAP[align],
    wrap ? 'flex-wrap' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ ...JUSTIFY_MAP[justify], ...style }} {...rest}>
      {children}
    </div>
  );
}
