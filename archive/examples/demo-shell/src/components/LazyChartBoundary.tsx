import React, { Suspense } from 'react';
import LoadingState from './LoadingState';

interface LazyChartBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Lazy loading boundary for Chart.js components.
 *
 * Ensures Chart.js is code-split from the main bundle and only loaded
 * when chart components are rendered. Uses Suspense to handle loading states.
 */
export const LazyChartBoundary: React.FC<LazyChartBoundaryProps> = ({
  children,
  fallback = <LoadingState message="Loading chart..." />
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

/**
 * HOC for lazy loading chart components.
 *
 * Usage:
 * ```tsx
 * const MyChart = lazy(() => import('./MyChart'));
 *
 * <LazyChartBoundary>
 *   <MyChart data={data} />
 * </LazyChartBoundary>
 * ```
 */
export const withLazyChart = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <LazyChartBoundary>
      <Component {...props} />
    </LazyChartBoundary>
  );
};
