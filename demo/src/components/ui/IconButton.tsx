/**
 * IconButton — icon-only button with variant presets.
 *
 * Replaces the many inline `<button className="bg-transparent border-none ...">` patterns
 * scattered across modals and action bars.
 */
import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconButtonVariant = 'ghost' | 'outlined' | 'filled';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide icon or any React element */
  icon: React.ReactNode;
  /** Visual variant — defaults to 'ghost' */
  variant?: IconButtonVariant;
  /** Size preset — defaults to 'md' */
  size?: IconButtonSize;
  /** Accessible label (required for icon-only buttons) */
  'aria-label': string;
  /** Optional tooltip text (shows on hover via title) */
  tooltip?: string;
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<IconButtonSize, React.CSSProperties> = {
  sm: { width: 28, height: 28, padding: 'var(--space-1)' },
  md: { width: 36, height: 36, padding: 'var(--space-2)' },
  lg: { width: 44, height: 44, padding: 'var(--space-3)' },
};

// ---------------------------------------------------------------------------
// Variant styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<IconButtonVariant, React.CSSProperties> = {
  ghost: {
    background: 'transparent',
    border: 'none',
    color: 'var(--app-text-secondary)',
  },
  outlined: {
    background: 'var(--app-surface-2, #252540)',
    border: '1px solid var(--app-border)',
    color: 'var(--app-text)',
  },
  filled: {
    background: 'var(--app-primary)',
    border: 'none',
    color: 'var(--color-white, #fff)',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  tooltip,
  className = '',
  style,
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={`cursor-pointer rounded-6 flex-center ${className}`}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        lineHeight: 0,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      title={tooltip}
      disabled={disabled}
      {...rest}
    >
      {icon}
    </button>
  );
}
