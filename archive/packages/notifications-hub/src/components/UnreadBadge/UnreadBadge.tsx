import { Badge, type BadgeProps } from '@django-core/design-system';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import type { CSSProperties } from 'react';

export interface UnreadBadgeProps {
  /**
   * Badge display variant
   * - 'count': Shows numeric count
   * - 'dot': Shows indicator dot only
   * @default 'count'
   */
  variant?: 'count' | 'dot';

  /**
   * Maximum count to display before showing "{max}+"
   * @default 99
   */
  max?: number;

  /**
   * Whether to show the badge when count is 0
   * @default false
   */
  showZero?: boolean;

  /**
   * Additional CSS class name for custom styling
   */
  className?: string;
}

/**
 * Unread notification badge component.
 *
 * Displays unread notification count from useUnreadCount hook.
 * Supports count variant (shows number) and dot variant (shows indicator).
 * Configurable max count (default 99, shows "99+") and hide-when-zero option.
 *
 * @example Count variant
 * ```tsx
 * <UnreadBadge variant="count" max={99} />
 * ```
 *
 * @example Dot variant
 * ```tsx
 * <UnreadBadge variant="dot" />
 * ```
 *
 * @example Show zero count
 * ```tsx
 * <UnreadBadge variant="count" showZero />
 * ```
 */
export function UnreadBadge({
  variant = 'count',
  max = 99,
  showZero = false,
  className,
}: UnreadBadgeProps) {
  const { count, loading } = useUnreadCount();

  // Normalize negative counts to 0
  const normalizedCount = count < 0 ? 0 : count;

  // Hide badge when zero unless showZero is true
  if (!loading && normalizedCount === 0 && !showZero) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <Badge variant="default" size="sm" className={className}>
        ...
      </Badge>
    );
  }

  // Dot variant: show indicator only
  if (variant === 'dot') {
    return (
      <Badge
        variant="error"
        size="sm"
        className={className}
        style={{
          width: '8px',
          height: '8px',
          padding: 0,
          minHeight: '8px',
        }}
        aria-label={`${normalizedCount} unread notification${normalizedCount !== 1 ? 's' : ''}`}
      >
        {/* Empty - just a dot */}
      </Badge>
    );
  }

  // Count variant: show number or "max+" if count exceeds max
  const displayCount = normalizedCount > max ? `${max}+` : normalizedCount.toString();

  return (
    <Badge variant="error" size="sm" className={className}>
      {displayCount}
    </Badge>
  );
}
