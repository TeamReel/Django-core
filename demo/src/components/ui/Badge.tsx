/**
 * StatusBadge — app-level badge that maps domain status strings to
 * design-system Badge variants automatically.
 *
 * Re-exports the design-system Badge for direct use, plus a thin
 * StatusBadge helper for status-to-variant mapping.
 */
import React, { memo } from 'react';
import { Badge } from '@django-core/design-system';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary';

export interface StatusBadgeProps {
  /** The display label */
  children: React.ReactNode;
  /** Visual variant — auto-maps from `status` if not provided */
  variant?: StatusVariant;
  /** Domain status string (e.g. 'active', 'completed', 'draft') */
  status?: string;
  /** Size — defaults to 'sm' */
  size?: 'sm' | 'md';
  /** Optional Lucide icon to prepend */
  icon?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Status → Variant mapping
// ---------------------------------------------------------------------------

const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  // Success states
  active: 'success',
  completed: 'success',
  approved: 'success',
  published: 'success',
  done: 'success',
  ready: 'success',
  // Warning states
  pending: 'warning',
  processing: 'warning',
  in_progress: 'warning',
  review: 'warning',
  draft: 'warning',
  // Error states
  failed: 'error',
  error: 'error',
  rejected: 'error',
  cancelled: 'error',
  expired: 'error',
  // Info states
  scheduled: 'info',
  queued: 'info',
  new: 'info',
};

function resolveVariant(status?: string, variant?: StatusVariant): StatusVariant {
  if (variant) return variant;
  if (status) return STATUS_VARIANT_MAP[status.toLowerCase()] ?? 'default';
  return 'default';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StatusBadge = memo(function StatusBadge({
  children,
  variant,
  status,
  size = 'sm',
  icon,
  className,
}: StatusBadgeProps) {
  const resolved = resolveVariant(status, variant);

  return (
    <Badge variant={resolved} size={size} className={className}>
      {icon && <span className="inline-flex mr-4">{icon}</span>}
      {children}
    </Badge>
  );
});

// Re-export core Badge for direct use
export { Badge } from '@django-core/design-system';
