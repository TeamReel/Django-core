import React, { Profiler, ProfilerOnRenderCallback } from 'react';

/**
 * PerformanceMonitor Component
 *
 * T075: Wraps components with React Profiler to monitor render performance.
 * Logs slow renders (>16ms) to help identify performance bottlenecks.
 *
 * @component
 * @example
 * <PerformanceMonitor id="NotificationList" enabled={isDevelopment}>
 *   <NotificationList notifications={notifications} />
 * </PerformanceMonitor>
 */

export interface PerformanceMonitorProps {
  /** Unique identifier for this profiler instance */
  id: string;

  /** Child components to monitor */
  children: React.ReactNode;

  /** Whether to enable profiling (default: true in development, false in production) */
  enabled?: boolean;

  /** Custom threshold in milliseconds for logging slow renders (default: 16ms) */
  slowThreshold?: number;
}

/**
 * T075: React Profiler callback
 *
 * Logs render metrics when actual render time exceeds threshold.
 * Helps identify performance issues with pagination and list rendering.
 *
 * Metrics:
 * - actualDuration: Time spent rendering the committed update
 * - baseDuration: Estimated time to render without memoization
 * - startTime: Timestamp when React began rendering
 * - commitTime: Timestamp when React committed the update
 * - phase: "mount" or "update"
 *
 * @see https://react.dev/reference/react/Profiler
 */
const createOnRenderCallback = (
  slowThreshold: number
): ProfilerOnRenderCallback => {
  return (
    profilerId: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    // Only log slow renders
    if (actualDuration > slowThreshold) {
      console.warn(`[F04 Performance] Slow render detected: ${profilerId}`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        improvement: baseDuration > actualDuration
          ? `${((1 - actualDuration / baseDuration) * 100).toFixed(1)}% faster`
          : 'No optimization',
        startTime: new Date(startTime).toISOString(),
        commitTime: new Date(commitTime).toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    // T075: Additional logging for development insights
    if (process.env.NODE_ENV === 'development') {
      // Log every 10th render for sampling
      const shouldLog = Math.random() < 0.1;
      if (shouldLog && actualDuration <= slowThreshold) {
        console.debug(`[F04 Performance] ${profilerId} render`, {
          phase,
          actualDuration: `${actualDuration.toFixed(2)}ms`,
          baseDuration: `${baseDuration.toFixed(2)}ms`,
          memoizedOptimization: baseDuration > actualDuration,
        });
      }
    }
  };
};

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  id,
  children,
  enabled = process.env.NODE_ENV === 'development',
  slowThreshold = 16, // 60fps = 16.67ms per frame
}) => {
  // Skip profiling if disabled
  if (!enabled) {
    return <>{children}</>;
  }

  const onRender = createOnRenderCallback(slowThreshold);

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
};
