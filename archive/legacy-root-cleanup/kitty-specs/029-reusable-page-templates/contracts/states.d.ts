/**
 * Default State Component Contracts
 * Centralized state UI components
 */

import * as React from 'react';

/**
 * Default loading indicator
 */
export interface DefaultLoadingProps {
  /** Loading message */
  message?: string;

  /** Show spinner */
  showSpinner?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Default empty state
 */
export interface DefaultEmptyProps {
  /** Empty state title */
  title?: string;

  /** Empty state description */
  description?: string;

  /** Call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
  };

  /** Illustration component */
  illustration?: React.ComponentType;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Default error state
 */
export interface DefaultErrorProps {
  /** Error object */
  error: Error;

  /** Error title (overrides default) */
  title?: string;

  /** Show retry button */
  showRetry?: boolean;

  /** Retry button callback */
  onRetry?: () => void;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Default permission denied state
 */
export interface DefaultPermissionDeniedProps {
  /** Permission denied title */
  title?: string;

  /** Permission denied description */
  description?: string;

  /** Show contact support button */
  showContactSupport?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Default offline/retry state
 */
export interface DefaultOfflineRetryProps {
  /** Offline message */
  message?: string;

  /** Retry button label */
  retryLabel?: string;

  /** Retry callback */
  onRetry?: () => void;

  /** Additional CSS class name */
  className?: string;
}

export declare const DefaultLoading: React.FC<DefaultLoadingProps>;
export declare const DefaultEmpty: React.FC<DefaultEmptyProps>;
export declare const DefaultError: React.FC<DefaultErrorProps>;
export declare const DefaultPermissionDenied: React.FC<DefaultPermissionDeniedProps>;
export declare const DefaultOfflineRetry: React.FC<DefaultOfflineRetryProps>;
