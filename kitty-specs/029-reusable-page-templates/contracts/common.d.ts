/**
 * Common Types & Interfaces
 * Shared across all page templates
 */

import * as React from 'react';

/**
 * Standard loading states for templates
 */
export type TemplateLoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Props for render prop overrides
 */
export interface StateRenderProps {
  /** Override default loading UI */
  renderLoading?: () => React.ReactNode;

  /** Override default empty state UI */
  renderEmpty?: () => React.ReactNode;

  /** Override default error UI */
  renderError?: (error: Error) => React.ReactNode;

  /** Override default permission denied UI */
  renderPermissionDenied?: () => React.ReactNode;
}

/**
 * Common responsive behavior props
 */
export interface ResponsiveProps {
  /** Show mobile-optimized layout */
  isMobile?: boolean;

  /** Show tablet-optimized layout */
  isTablet?: boolean;

  /** Show desktop layout (default) */
  isDesktop?: boolean;
}

/**
 * Common accessibility props
 */
export interface A11yProps {
  /** ARIA label for main landmark */
  'aria-label'?: string;

  /** ARIA labelled-by reference */
  'aria-labelledby'?: string;

  /** ARIA described-by reference */
  'aria-describedby'?: string;
}
