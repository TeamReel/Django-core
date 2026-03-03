/**
 * Stack — vertical flex container with consistent gap spacing.
 *
 * Replaces the common `flex-col gap-*` pattern used ~155 times across the codebase.
 */
import React from 'react';

export type StackGap = 0 | 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32;

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spacing between children in px — defaults to 16 */
  gap?: StackGap;
  /** Horizontal alignment */
  align?: 'stretch' | 'start' | 'center' | 'end';
  children: React.ReactNode;
}

const GAP_CLASSES: Record<StackGap, string> = {
  0: 'flex-col',
  2: 'flex-col gap-2',
  4: 'flex-col gap-4',
  6: 'flex-col gap-6',
  8: 'flex-col gap-8',
  10: 'flex-col gap-10',
  12: 'flex-col gap-12',
  16: 'flex-col gap-16',
  20: 'flex-col gap-20',
  24: 'flex-col gap-24',
  32: 'flex-col gap-32',
};

const ALIGN_MAP: Record<string, string> = {
  stretch: '',
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

export function Stack({ gap = 16, align = 'stretch', children, className = '', ...rest }: StackProps) {
  const cls = [GAP_CLASSES[gap], ALIGN_MAP[align], className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
