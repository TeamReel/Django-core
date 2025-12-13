/**
 * @django-core/page-templates
 * Reusable page template components
 *
 * @packageDocumentation
 */

// Common types
export type {
  TemplateLoadingState,
  StateRenderProps,
  ResponsiveProps,
  A11yProps,
} from './common';

// Dashboard template
export type {
  DashboardProps,
  DashboardHeaderProps,
  DashboardGridProps,
  DashboardFilterBarProps,
  DashboardComponent,
} from './Dashboard';
export {
  Dashboard,
  DashboardHeader,
  DashboardGrid,
  DashboardFilterBar,
} from './Dashboard';

// List-Detail template
export type {
  ListDetailProps,
  ListDetailListProps,
  ListDetailDetailProps,
  ListDetailComponent,
} from './ListDetail';
export {
  ListDetail,
  ListDetailList,
  ListDetailDetail,
} from './ListDetail';

// Wizard template
export type {
  WizardProps,
  WizardStepProps,
  WizardNavigationProps,
  WizardStepConfig,
  WizardComponent,
} from './Wizard';
export {
  Wizard,
  WizardStep,
  WizardNavigation,
} from './Wizard';

// Settings template
export type {
  SettingsProps,
  SettingsSectionProps,
  SettingsNavigationProps,
  SettingsSectionConfig,
  SettingsComponent,
} from './Settings';
export {
  Settings,
  SettingsSection,
  SettingsNavigation,
} from './Settings';

// State components
export type {
  DefaultLoadingProps,
  DefaultEmptyProps,
  DefaultErrorProps,
  DefaultPermissionDeniedProps,
  DefaultOfflineRetryProps,
} from './states';
export {
  DefaultLoading,
  DefaultEmpty,
  DefaultError,
  DefaultPermissionDenied,
  DefaultOfflineRetry,
} from './states';

// Hooks
export {
  useControlledState,
  useResponsive,
  useKeyboardNavigation,
} from './hooks';
