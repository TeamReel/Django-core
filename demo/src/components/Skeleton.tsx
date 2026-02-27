import React from 'react';

/**
 * Skeleton - Shimmer loading placeholder component
 *
 * Use this component to show loading states with smooth shimmer animation.
 * Improves perceived performance over "Loading..." text.
 *
 * @example
 * ```tsx
 * // Single line skeleton
 * <Skeleton width="200px" height="16px" />
 *
 * // Card skeleton
 * <Skeleton variant="card" />
 *
 * // Avatar skeleton
 * <Skeleton variant="avatar" size={48} />
 *
 * // Custom shape
 * <Skeleton width="100%" height="200px" borderRadius="12px" />
 * ```
 */

export interface SkeletonProps {
  /** Preset variant */
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'thumbnail';
  /** Width (CSS value) */
  width?: string | number;
  /** Height (CSS value) */
  height?: string | number;
  /** Border radius (CSS value) */
  borderRadius?: string | number;
  /** Size for avatar/thumbnail variants */
  size?: number;
  /** Number of lines for text variant */
  lines?: number;
  /** Custom className */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
  }
}

const baseStyles: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--app-surface-2) 25%, var(--app-border) 50%, var(--app-surface-2) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

export function Skeleton({
  variant = 'text',
  width,
  height,
  borderRadius,
  size,
  lines = 1,
  className,
  style,
}: SkeletonProps): JSX.Element {
  // Calculate dimensions based on variant
  let computedWidth = width;
  let computedHeight = height;
  let computedRadius = borderRadius;

  switch (variant) {
    case 'avatar':
      computedWidth = computedWidth ?? size ?? 40;
      computedHeight = computedHeight ?? size ?? 40;
      computedRadius = computedRadius ?? '50%';
      break;
    case 'thumbnail':
      computedWidth = computedWidth ?? size ?? 80;
      computedHeight = computedHeight ?? size ?? 80;
      computedRadius = computedRadius ?? '8px';
      break;
    case 'card':
      computedWidth = computedWidth ?? '100%';
      computedHeight = computedHeight ?? '120px';
      computedRadius = computedRadius ?? '12px';
      break;
    case 'button':
      computedWidth = computedWidth ?? '100px';
      computedHeight = computedHeight ?? '36px';
      computedRadius = computedRadius ?? '6px';
      break;
    case 'text':
    default:
      computedWidth = computedWidth ?? '100%';
      computedHeight = computedHeight ?? '16px';
      computedRadius = computedRadius ?? '4px';
      break;
  }

  // Multi-line text
  if (variant === 'text' && lines > 1) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...baseStyles,
              width: i === lines - 1 ? '60%' : computedWidth, // Last line shorter
              height: computedHeight,
              borderRadius: computedRadius,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...baseStyles,
        width: typeof computedWidth === 'number' ? `${computedWidth}px` : computedWidth,
        height: typeof computedHeight === 'number' ? `${computedHeight}px` : computedHeight,
        borderRadius: typeof computedRadius === 'number' ? `${computedRadius}px` : computedRadius,
        ...style,
      }}
    />
  );
}

/**
 * SkeletonCard - Pre-built card skeleton with header, content, and optional image
 */
export function SkeletonCard({
  showImage = false,
  lines = 2,
  className,
  style,
}: {
  showImage?: boolean;
  lines?: number;
  className?: string;
  style?: React.CSSProperties;
}): JSX.Element {
  return (
    <div
      className={className}
      style={{
        padding: '16px',
        backgroundColor: 'var(--app-surface)',
        borderRadius: '12px',
        border: '1px solid var(--app-border)',
        ...style,
      }}
    >
      {showImage && (
        <Skeleton
          width="100%"
          height="160px"
          borderRadius="8px"
          style={{ marginBottom: '12px' }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <Skeleton variant="avatar" size={40} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="14px" style={{ marginBottom: '6px' }} />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      <Skeleton variant="text" lines={lines} />
    </div>
  );
}

/**
 * SkeletonList - Multiple skeleton items in a list
 */
export function SkeletonList({
  count = 3,
  variant = 'card',
  gap = 12,
  className,
  style,
}: {
  count?: number;
  variant?: 'card' | 'row';
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}): JSX.Element {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
        ...style,
      }}
    >
      {Array.from({ length: count }).map((_, i) =>
        variant === 'card' ? (
          <SkeletonCard key={i} />
        ) : (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: 'var(--app-surface)',
              borderRadius: '8px',
              border: '1px solid var(--app-border)',
            }}
          >
            <Skeleton variant="avatar" size={44} />
            <div style={{ flex: 1 }}>
              <Skeleton width="70%" height="14px" style={{ marginBottom: '6px' }} />
              <Skeleton width="50%" height="12px" />
            </div>
            <Skeleton width="60px" height="24px" borderRadius="12px" />
          </div>
        )
      )}
    </div>
  );
}

/**
 * SkeletonGrid - Grid of skeleton thumbnails (for gallery)
 */
export function SkeletonGrid({
  count = 9,
  columns = 3,
  gap = 8,
  aspectRatio = 1,
  className,
  style,
}: {
  count?: number;
  columns?: number;
  gap?: number;
  aspectRatio?: number;
  className?: string;
  style?: React.CSSProperties;
}): JSX.Element {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        ...style,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            aspectRatio: `${aspectRatio}`,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <Skeleton width="100%" height="100%" borderRadius={0} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
