/**
 * @django-core/context-switcher
 *
 * Multi-tenancy context switching for Django-based applications.
 * Provides React Context, hooks, and UI components for managing
 * organisation and project selection with URL synchronization.
 *
 * @packageDocumentation
 */

// Types
export * from './types';

// Context
export { ContextSwitcherContext } from './context/ContextSwitcherContext';
export type { ContextSwitcherContextValue } from './context/ContextSwitcherContext';

// Provider
export {
  ContextSwitcherProvider,
  type ContextSwitcherProviderProps,
} from './context/ContextSwitcherProvider';

// Hooks
export { useContextSwitcher } from './hooks';
export { useDebouncedValue } from './hooks/useDebouncedValue';
export { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
export type { KeyboardShortcutOptions } from './hooks/useKeyboardShortcut';

// Components
export { ContextSwitcher, type ContextSwitcherProps } from './components/ContextSwitcher';
export { ContextIndicator, type ContextIndicatorProps } from './components/ContextIndicator';
export { OrganisationPicker, type OrganisationPickerProps } from './components/OrganisationPicker';
export { ProjectPicker, type ProjectPickerProps } from './components/ProjectPicker';
