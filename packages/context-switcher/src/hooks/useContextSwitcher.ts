/**
 * React hooks for context switcher.
 *
 * @packageDocumentation
 */

import { useContext } from 'react';
import {
  ContextSwitcherContext,
  type ContextSwitcherContextValue,
} from '../context/ContextSwitcherContext';

/**
 * Hook to access context switcher state and actions.
 * Must be used within a ContextSwitcherProvider.
 *
 * @throws Error if used outside of ContextSwitcherProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { context, switchContext } = useContextSwitcher();
 *
 *   return (
 *     <div>
 *       Current org: {context.organisation?.name}
 *     </div>
 *   );
 * }
 * ```
 */
export function useContextSwitcher(): ContextSwitcherContextValue {
  const contextValue = useContext(ContextSwitcherContext);

  if (!contextValue) {
    throw new Error(
      'useContextSwitcher must be used within a ContextSwitcherProvider'
    );
  }

  return contextValue;
}
