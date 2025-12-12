import { useContext } from 'react';
import { NotificationsContext } from '@/context/NotificationsContext';

/**
 * Hook for controlling notification polling behavior.
 * Useful for debugging, control panels, or scenarios where
 * polling needs to be temporarily disabled.
 *
 * @throws {Error} If used outside of NotificationsProvider
 * @returns {{ pausePolling: () => void; resumePolling: () => void; isPollingActive: boolean }}
 *
 * @example
 * ```tsx
 * function PollingControl() {
 *   const { pausePolling, resumePolling, isPollingActive } = usePolling();
 *
 *   return (
 *     <Button onClick={isPollingActive ? pausePolling : resumePolling}>
 *       {isPollingActive ? 'Pause' : 'Resume'} Polling
 *     </Button>
 *   );
 * }
 * ```
 */
export function usePolling(): {
  pausePolling: () => void;
  resumePolling: () => void;
  isPollingActive: boolean;
} {
  const context = useContext(NotificationsContext);

  if (context === undefined) {
    throw new Error(
      'usePolling must be used within a NotificationsProvider. ' +
      'Ensure your component tree is wrapped with <NotificationsProvider>.'
    );
  }

  return {
    pausePolling: context.pausePolling,
    resumePolling: context.resumePolling,
    isPollingActive: context.isPollingActive,
  };
}
