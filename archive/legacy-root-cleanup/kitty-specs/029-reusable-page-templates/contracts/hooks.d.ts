/**
 * Shared Hook Contracts
 */

import * as React from 'react';

/**
 * Hook for controlled/uncontrolled state management
 * Used internally by all templates
 *
 * @example
 * ```tsx
 * function MyComponent({ value, defaultValue, onChange }) {
 *   const [state, setState] = useControlledState(value, defaultValue ?? 0, onChange);
 *   // state is controlled if value is provided, uncontrolled otherwise
 * }
 * ```
 */
export function useControlledState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange: ((value: T) => void) | undefined
): [T, (value: T) => void];

/**
 * Hook for responsive breakpoint detection
 * Integrates with F06 breakpoints
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
 *   return isMobile ? <MobileView /> : <DesktopView />;
 * }
 * ```
 */
export function useResponsive(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
};

/**
 * Hook for keyboard navigation
 * Used by ListDetail and Settings for arrow key navigation
 *
 * @example
 * ```tsx
 * function MyList({ items, activeItem, onItemChange }) {
 *   const { handleKeyDown } = useKeyboardNavigation({
 *     items,
 *     activeItem,
 *     onItemChange,
 *     orientation: 'vertical',
 *   });
 *   return <div onKeyDown={handleKeyDown}>{...}</div>;
 * }
 * ```
 */
export function useKeyboardNavigation(options: {
  items: string[];
  activeItem: string;
  onItemChange: (item: string) => void;
  orientation?: 'vertical' | 'horizontal';
}): {
  handleKeyDown: (event: React.KeyboardEvent) => void;
};
