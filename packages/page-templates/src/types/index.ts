// Common TypeScript types for page templates

import * as React from 'react';

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

// Dashboard types
export interface DashboardProps extends A11yProps, StateRenderProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: Error;
  isEmpty?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface DashboardHeaderProps extends A11yProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export interface DashboardGridProps extends A11yProps {
  children: React.ReactNode;
  columns?: number | { mobile?: number; tablet?: number; desktop?: number };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface DashboardFilterBarProps extends A11yProps {
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export interface DashboardComponent extends React.FC<DashboardProps> {
  Header: React.FC<DashboardHeaderProps>;
  Grid: React.FC<DashboardGridProps>;
  FilterBar: React.FC<DashboardFilterBarProps>;
}

// ListDetail types
export interface ListDetailProps extends A11yProps, StateRenderProps, ResponsiveProps {
  children: React.ReactNode;
  defaultSelectedId?: string | number | null;
  selectedId?: string | number | null;
  onSelectedIdChange?: (id: string | number | null) => void;
  splitRatio?: [number, number];
  listMinWidth?: number;
  mobileLayout?: 'stack' | 'overlay';
  className?: string;
}

export interface ListDetailListProps extends A11yProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  isEmpty?: boolean;
  className?: string;
}

export interface ListDetailDetailProps extends A11yProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  loading?: boolean;
  className?: string;
}

export interface ListDetailComponent extends React.FC<ListDetailProps> {
  List: React.FC<ListDetailListProps>;
  Detail: React.FC<ListDetailDetailProps>;
}

// Wizard types
export interface WizardStepConfig {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
  validate?: (data: unknown) => boolean | Promise<boolean>;
  icon?: React.ComponentType<{ size?: number }>;
}

export interface WizardProps extends A11yProps, StateRenderProps {
  steps: WizardStepConfig[];
  children: React.ReactNode;
  defaultStepIndex?: number;
  stepIndex?: number;
  onStepIndexChange?: (index: number) => void;
  onComplete?: (data: unknown) => void | Promise<void>;
  onCancel?: () => void;
  showStepIndicator?: boolean;
  stepIndicatorVariant?: 'dots' | 'numbers' | 'labels';
  allowFreeNavigation?: boolean;
  className?: string;
}

export interface WizardStepProps extends A11yProps {
  stepId: string;
  children: React.ReactNode;
  className?: string;
}

export interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onFinish: () => void;
  previousLabel?: string;
  nextLabel?: string;
  cancelLabel?: string;
  finishLabel?: string;
  className?: string;
}

export interface WizardComponent extends React.FC<WizardProps> {
  Step: React.FC<WizardStepProps>;
  Navigation: React.FC<WizardNavigationProps>;
}

// ============================================================================
// Settings Template Types
// ============================================================================

export interface SettingsSectionConfig {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number }>;
  requiredPermission?: string;
}

export interface SettingsProps extends A11yProps, StateRenderProps, ResponsiveProps {
  sections: SettingsSectionConfig[];
  children: React.ReactNode;
  defaultActiveSection?: string;
  activeSection?: string;
  onActiveSectionChange?: (sectionId: string) => void;
  sidebarLayout?: 'sticky' | 'scrollable';
  mobileLayout?: 'tabs' | 'dropdown';
  showSectionActions?: boolean;
  className?: string;
}

export interface SettingsSectionProps extends A11yProps {
  sectionId: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
  showDivider?: boolean;
  className?: string;
}

export interface SettingsNavigationProps {
  sections: SettingsSectionConfig[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  className?: string;
}

export interface SettingsComponent extends React.FC<SettingsProps> {
  Section: React.FC<SettingsSectionProps>;
  Navigation: React.FC<SettingsNavigationProps>;
}
