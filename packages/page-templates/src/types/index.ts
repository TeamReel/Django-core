// Common TypeScript types for page templates

/**
 * Page loading states
 */
export type TemplateLoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Page state types
 */
export type PageState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'permission-denied'
  | 'partial-data'
  | 'offline'
  | 'ready';

/**
 * Render props for state overrides
 */
export interface StateRenderProps {
  renderLoading?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error?: Error) => React.ReactNode;
  renderPermissionDenied?: () => React.ReactNode;
}

/**
 * Responsive breakpoint props
 */
export interface ResponsiveProps {
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
}

/**
 * Accessibility props
 */
export interface A11yProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  role?: string;
}

/**
 * Controlled state props pattern
 */
export interface ControlledStateProps<T> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
}
