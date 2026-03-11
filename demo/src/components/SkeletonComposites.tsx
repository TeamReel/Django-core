import React from 'react';
import { Skeleton } from './Skeleton';
import styles from './Skeleton.module.css';

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
    <div className={`${styles.card} ${className ?? ''}`} style={style}>
      {showImage && (
        <Skeleton
          width="100%"
          height="160px"
          borderRadius="8px"
          className={styles.cardImage}
        />
      )}
      <div className={styles.cardHeader}>
        <Skeleton variant="avatar" size={40} />
        <div className={styles.flexFill}>
          <Skeleton width="60%" height="14px" className={styles.mb6} />
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
      className={`${styles.list} ${className ?? ''}`}
      style={{ '--skeleton-gap': `${gap}px`, ...style } as React.CSSProperties}
    >
      {Array.from({ length: count }).map((_, i) =>
        variant === 'card' ? (
          <SkeletonCard key={i} />
        ) : (
          <div key={i} className={styles.row}>
            <Skeleton variant="avatar" size={44} />
            <div className={styles.flexFill}>
              <Skeleton width="70%" height="14px" className={styles.mb6} />
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
      className={`${styles.grid} ${className ?? ''}`}
      style={{
        '--skeleton-columns': columns,
        '--skeleton-gap': `${gap}px`,
        ...style,
      } as React.CSSProperties}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={styles.gridItem}
          style={{ '--skeleton-aspect-ratio': aspectRatio } as React.CSSProperties}
        >
          <Skeleton width="100%" height="100%" borderRadius={0} />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonPageHeader - Matches PageHeader layout (title + subtitle + actions).
 */
export function SkeletonPageHeader({
  showBreadcrumbs = true,
  showSubtitle = true,
  showActions = true,
  className,
}: {
  showBreadcrumbs?: boolean;
  showSubtitle?: boolean;
  showActions?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div className={className}>
      {showBreadcrumbs && (
        <div className={styles.breadcrumbs}>
          <Skeleton width="60px" height="12px" />
          <Skeleton width="4px" height="12px" borderRadius="2px" />
          <Skeleton width="80px" height="12px" />
          <Skeleton width="4px" height="12px" borderRadius="2px" />
          <Skeleton width="100px" height="12px" />
        </div>
      )}
      <div className={styles.headerRow}>
        <div className={styles.flexFill}>
          <Skeleton width="240px" height="28px" borderRadius="6px" className={styles.mb6} />
          {showSubtitle && <Skeleton width="180px" height="14px" />}
        </div>
        {showActions && (
          <div className={styles.headerActions}>
            <Skeleton variant="button" width="80px" />
            <Skeleton variant="button" width="80px" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SkeletonTabBar - Horizontal tab bar placeholder.
 */
export function SkeletonTabBar({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={`${styles.tabBar} ${className ?? ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={`${60 + Math.random() * 40}px`} height="32px" borderRadius="6px" />
      ))}
    </div>
  );
}

/**
 * SkeletonDetailPage - Full detail page skeleton (header + tabs + content card).
 * Matches the layout of ClubOrganisationDetailPage, MemberDetailPage, etc.
 */
export function SkeletonDetailPage({
  tabCount = 5,
  contentLines = 4,
  showImage = false,
  className,
}: {
  tabCount?: number;
  contentLines?: number;
  showImage?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div className={`${styles.detailPage} ${className ?? ''}`}>
      <SkeletonPageHeader />
      <SkeletonTabBar count={tabCount} />
      <div className={styles.detailContent}>
        {showImage && (
          <Skeleton width="100%" height="200px" borderRadius="12px" className={styles.mb6} />
        )}
        <SkeletonList count={2} variant="row" gap={12} />
        <div className={styles.marginTopSpace4}>
          <Skeleton variant="text" lines={contentLines} />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonTablePage - Table/list page skeleton (header + filters + table rows).
 * Matches DirectoryTableShell layout.
 */
export function SkeletonTablePage({
  rows = 5,
  columns = 4,
  showFilters = true,
  className,
}: {
  rows?: number;
  columns?: number;
  showFilters?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div className={`${styles.tablePage} ${className ?? ''}`}>
      {showFilters && (
        <div className={styles.filterBar}>
          <Skeleton width="200px" height="36px" borderRadius="6px" />
          <Skeleton width="120px" height="36px" borderRadius="6px" />
          <Skeleton width="120px" height="36px" borderRadius="6px" />
        </div>
      )}
      <div className={styles.tableContainer}>
        {/* Table header */}
        <div className={`${styles.tableRow} ${styles.tableHeaderRow}`}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width={i === 0 ? '30%' : `${70 / (columns - 1)}%`} height="14px" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className={styles.tableRow}>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                width={colIdx === 0 ? '30%' : `${70 / (columns - 1)}%`}
                height="16px"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonDashboard - Dashboard page skeleton (widgets grid).
 */
export function SkeletonDashboard({ className }: { className?: string }): JSX.Element {
  return (
    <div className={`${styles.dashboard} ${className ?? ''}`}>
      <SkeletonPageHeader showBreadcrumbs={false} showActions={false} />
      <div className={styles.dashboardGrid}>
        <SkeletonCard showImage={false} lines={3} />
        <SkeletonCard showImage={false} lines={2} />
        <SkeletonCard showImage lines={2} />
        <SkeletonCard showImage={false} lines={4} />
      </div>
    </div>
  );
}
