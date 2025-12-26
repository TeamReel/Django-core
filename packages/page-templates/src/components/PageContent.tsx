import { ReactNode, HTMLAttributes } from 'react';

export interface PageContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * PageContent - Simple content wrapper for pages
 * Provides consistent padding and background
 */
export function PageContent({ children, ...props }: PageContentProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--app-bg)',
        color: 'var(--app-text)',
        minHeight: 'calc(100vh - 140px)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
