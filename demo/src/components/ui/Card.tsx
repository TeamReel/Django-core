/**
 * Card — lightweight card wrapper with variant presets.
 *
 * Uses CSS utility classes consistent with the rest of the codebase.
 * Wraps the common pattern: `border rounded-12 bg-surface` + optional padding/shadow.
 */
import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CardVariant = 'outlined' | 'elevated' | 'filled' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant — defaults to 'outlined' */
  variant?: CardVariant;
  /** Padding preset — defaults to 'md' */
  padding?: CardPadding;
  /** Make the card clickable (cursor-pointer + hover effect) */
  clickable?: boolean;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const VARIANT_CLASSES: Record<CardVariant, string> = {
  outlined: 'border rounded-12',
  elevated: 'rounded-12',
  filled: 'rounded-12',
  flat: 'rounded-12',
};

const VARIANT_STYLES: Record<CardVariant, React.CSSProperties> = {
  outlined: { background: 'var(--app-surface, #1a1a2e)' },
  elevated: {
    background: 'var(--app-surface, #1a1a2e)',
    boxShadow: 'var(--shadow-sm)',
  },
  filled: { background: 'var(--app-surface-2, #252540)' },
  flat: { background: 'transparent' },
};

const PADDING_MAP: Record<CardPadding, string> = {
  none: '',
  sm: 'p-12',
  md: 'p-16',
  lg: 'p-20',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Card({
  variant = 'outlined',
  padding = 'md',
  clickable = false,
  children,
  className = '',
  style,
  ...rest
}: CardProps) {
  const cls = [
    VARIANT_CLASSES[variant],
    PADDING_MAP[padding],
    clickable ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      style={{ ...VARIANT_STYLES[variant], ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
