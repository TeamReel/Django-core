import { ReactNode } from 'react';

export interface PageContentProps {
  children: ReactNode;
  [key: string]: any;
}

/**
 * PageContent - Simple content wrapper for pages
 * Provides consistent padding and background
 */
export function PageContent({ children, ...props }: PageContentProps) {
  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        minHeight: 'calc(100vh - 140px)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
