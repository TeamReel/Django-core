/**
 * Avatar — circular user/entity avatar with image, initials fallback, and
 * optional status indicator.
 *
 * Part of the UI Primitives layer (components/ui/).
 */
import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Image source URL */
  src?: string | null;
  /** Alt text for accessibility */
  alt?: string;
  /** Fallback text — first 1-2 characters used as initials */
  name?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Online/offline/busy status indicator dot */
  status?: 'online' | 'offline' | 'busy';
  /** Additional CSS class */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<AvatarSize, { px: number; fontSize: string }> = {
  xs: { px: 24, fontSize: 'var(--text-2xs)' },
  sm: { px: 32, fontSize: 'var(--text-xs)' },
  md: { px: 40, fontSize: 'var(--text-base)' },
  lg: { px: 56, fontSize: 'var(--text-xl)' },
  xl: { px: 80, fontSize: 'var(--text-3xl)' },
};

const STATUS_COLOR: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'var(--app-success)',
  offline: 'var(--app-muted-text)',
  busy: 'var(--app-error)',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Simple deterministic color from name hash */
function hashColor(name?: string): string {
  if (!name) return 'var(--color-primary-400)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 45%)`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  className,
  onClick,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const { px, fontSize } = SIZE_MAP[size];
  const showImage = src && !imgError;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: px,
    height: px,
    minWidth: px,
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    backgroundColor: showImage ? 'var(--app-surface-2)' : hashColor(name),
    color: 'var(--color-white, #fff)',
    fontSize,
    fontWeight: 'var(--font-semibold)' as never,
    lineHeight: 1,
    userSelect: 'none',
    cursor: onClick ? 'pointer' : undefined,
    transition: `box-shadow var(--duration-fast) var(--ease-default)`,
  };

  const statusDotSize = Math.max(8, Math.round(px * 0.25));

  return (
    <div
      className={className}
      style={containerStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={alt || name || 'avatar'}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || ''}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}

      {status && (
        <span
          aria-label={status}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: statusDotSize,
            height: statusDotSize,
            borderRadius: 'var(--radius-full)',
            backgroundColor: STATUS_COLOR[status],
            border: '2px solid var(--app-surface)',
          }}
        />
      )}
    </div>
  );
};
