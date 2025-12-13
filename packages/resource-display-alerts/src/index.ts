// Component exports
export { Alert } from './components/Alert';
export type { AlertProps } from './components/Alert';

export { ResourceUsageBar } from './components/ResourceUsageBar';
export type { ResourceUsageBarProps } from './components/ResourceUsageBar';

export { HealthStatus } from './components/HealthStatus';
export type { HealthStatusProps } from './components/HealthStatus';

export { Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';

export { ResourceCard, useResourceCardContext } from './components/ResourceCard';
export type {
  ResourceCardProps,
  ResourceCardContextValue,
  ResourceCardHeaderProps,
  ResourceCardBodyProps,
  ResourceCardFooterProps,
} from './components/ResourceCard';

export { AlertStack } from './components/AlertStack';
export type { AlertStackProps } from './components/AlertStack';

// Hook exports
export { useAlertDismissal } from './hooks/useAlertDismissal';
export type {
  AlertDismissalState,
  UseAlertDismissalOptions,
  UseAlertDismissalResult,
} from './hooks/useAlertDismissal';

// Hook exports (will be populated in WP06)
// export { useResourceUsage } from './hooks/useResourceUsage';
// export { useHealthStatus } from './hooks/useHealthStatus';

// Utility exports
export {
  isLocalStorageAvailable,
  getItem as getLocalStorageItem,
  setItem as setLocalStorageItem,
  removeItem as removeLocalStorageItem,
  getAlertStorageKey,
} from './utils/localStorage';

// Type exports
export type {
  Severity,
  ResourceUsageData,
  HealthStatusType,
  HealthStatusData,
} from './types';
