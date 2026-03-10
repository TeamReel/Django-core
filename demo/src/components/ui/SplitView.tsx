/**
 * SplitView — responsive sidebar + main content layout.
 *
 * Desktop: fixed-width sidebar + flexible main area.
 * Mobile: full-width stacked layout.
 */
import React from 'react';
import styles from './SplitView.module.css';

export interface SplitViewProps {
  /** Sidebar content */
  sidebar: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Sidebar width — defaults to '280px' */
  sidebarWidth?: string;
  /** Which side the sidebar is on — defaults to 'left' */
  sidebarPosition?: 'left' | 'right';
  /** Gap between sidebar and main — defaults to 0 */
  gap?: number;
  className?: string;
}

export function SplitView({
  sidebar,
  children,
  sidebarWidth = '280px',
  sidebarPosition = 'left',
  gap = 0,
  className = '',
}: SplitViewProps) {
  const isRight = sidebarPosition === 'right';

  return (
    <div
      className={`split-view ${styles.container} ${isRight ? styles.containerReverse : ''} ${className}`}
      style={{ gap }}
    >
      <aside
        className={`split-view__sidebar ${styles.sidebar}`}
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </aside>
      <main className={`split-view__main ${styles.main}`}>
        {children}
      </main>
    </div>
  );
}
