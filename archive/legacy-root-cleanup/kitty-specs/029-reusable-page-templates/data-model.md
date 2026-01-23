# Component API Contracts: Reusable Page Templates
*Path: [kitty-specs/029-reusable-page-templates/data-model.md](kitty-specs/029-reusable-page-templates/data-model.md)*

**Feature**: F08 - Reusable Page Templates
**Phase**: Phase 1 - Design & Contracts
**Date**: 2025-12-13

## Overview

This document defines TypeScript interfaces and prop contracts for all page template components. These contracts establish the public API surface and serve as implementation contracts for Phase 3 tasks.

**Design Principles**:
1. **Type-safe**: 100% TypeScript strict mode, no `any` types
2. **Composable**: Sub-components work independently or together
3. **Flexible**: Hybrid controlled/uncontrolled patterns
4. **Predictable**: Consistent naming conventions across templates

---

## Common Types & Interfaces

### Base State Types

```typescript
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
```

---

## 1. Dashboard Template

### Core Dashboard Component

```typescript
/**
 * Main Dashboard template component
 *
 * @example
 * ```tsx
 * <Dashboard>
 *   <Dashboard.Header
 *     title="Analytics Dashboard"
 *     actions={<RefreshButton />}
 *   />
 *   <Dashboard.FilterBar>
 *     <DateRangePicker />
 *   </Dashboard.FilterBar>
 *   <Dashboard.Grid columns={3}>
 *     <Widget title="Revenue" value="$45,231" />
 *     <Widget title="Users" value="1,234" />
 *     <Widget title="Conversion" value="12.5%" />
 *   </Dashboard.Grid>
 * </Dashboard>
 * ```
 */
export interface DashboardProps extends A11yProps, StateRenderProps {
  /** Child components (Header, FilterBar, Grid) */
  children: React.ReactNode;

  /** Loading state (controls default loading UI) */
  loading?: boolean;

  /** Error state (shows error UI if provided) */
  error?: Error | null;

  /** Empty state (shows empty UI if true and no children) */
  isEmpty?: boolean;

  /** Additional CSS class name */
  className?: string;

  /** Additional inline styles */
  style?: React.CSSProperties;
}
```

### Dashboard Sub-components

```typescript
/**
 * Dashboard header region with title and actions
 */
export interface DashboardHeaderProps extends A11yProps {
  /** Page title */
  title: string | React.ReactNode;

  /** Subtitle or description */
  subtitle?: string | React.ReactNode;

  /** Action buttons (e.g., refresh, export, settings) */
  actions?: React.ReactNode;

  /** Breadcrumb navigation */
  breadcrumbs?: React.ReactNode;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Dashboard grid layout for widgets
 */
export interface DashboardGridProps extends ResponsiveProps {
  /** Widget components */
  children: React.ReactNode;

  /** Number of columns (responsive) */
  columns?: number | {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  /** Gap between widgets (in F01 spacing units) */
  gap?: 'sm' | 'md' | 'lg';

  /** Additional CSS class name */
  className?: string;
}

/**
 * Dashboard filter bar for data controls
 */
export interface DashboardFilterBarProps extends A11yProps {
  /** Filter components (e.g., dropdowns, date pickers) */
  children: React.ReactNode;

  /** Collapse on mobile (shows as expandable panel) */
  collapsible?: boolean;

  /** Initially collapsed state (if collapsible) */
  defaultCollapsed?: boolean;

  /** Controlled collapsed state */
  collapsed?: boolean;

  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;

  /** Additional CSS class name */
  className?: string;
}
```

---

## 2. List-Detail Template

### Core List-Detail Component

```typescript
/**
 * Main List-Detail template component
 *
 * @example
 * ```tsx
 * <ListDetail
 *   defaultSelectedId={null}
 *   onSelectedIdChange={(id) => console.log('Selected:', id)}
 * >
 *   <ListDetail.List>
 *     {projects.map(project => (
 *       <ProjectListItem key={project.id} project={project} />
 *     ))}
 *   </ListDetail.List>
 *   <ListDetail.Detail>
 *     {selectedProject && <ProjectDetails project={selectedProject} />}
 *   </ListDetail.Detail>
 * </ListDetail>
 * ```
 */
export interface ListDetailProps extends A11yProps, StateRenderProps, ResponsiveProps {
  /** Child components (List, Detail) */
  children: React.ReactNode;

  /** Default selected item ID (uncontrolled) */
  defaultSelectedId?: string | number | null;

  /** Controlled selected item ID */
  selectedId?: string | number | null;

  /** Callback when selection changes */
  onSelectedIdChange?: (id: string | number | null) => void;

  /** Split ratio (list width : detail width) */
  splitRatio?: [number, number]; // e.g., [1, 2] = 33% list, 67% detail

  /** Minimum width for list panel (prevents collapse) */
  listMinWidth?: number; // pixels

  /** Mobile layout mode */
  mobileLayout?: 'stack' | 'overlay'; // stack = full-width panels, overlay = detail over list

  /** Additional CSS class name */
  className?: string;
}
```

### List-Detail Sub-components

```typescript
/**
 * List panel of List-Detail template
 */
export interface ListDetailListProps extends A11yProps {
  /** List items (typically <button> or <a> elements) */
  children: React.ReactNode;

  /** Show search/filter bar */
  showSearch?: boolean;

  /** Search placeholder text */
  searchPlaceholder?: string;

  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;

  /** Loading state for list items */
  loading?: boolean;

  /** Empty state (no items) */
  isEmpty?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Detail panel of List-Detail template
 */
export interface ListDetailDetailProps extends A11yProps {
  /** Detail content */
  children: React.ReactNode;

  /** Show back button (mobile only) */
  showBackButton?: boolean;

  /** Callback when back button clicked */
  onBack?: () => void;

  /** Loading state for detail content */
  loading?: boolean;

  /** Additional CSS class name */
  className?: string;
}
```

---

## 3. Wizard Template

### Core Wizard Component

```typescript
/**
 * Multi-step wizard configuration
 */
export interface WizardStepConfig {
  /** Unique step identifier */
  id: string;

  /** Display label */
  label: string;

  /** Optional description */
  description?: string;

  /** Step is optional (can skip) */
  optional?: boolean;

  /** Validation function (async supported) */
  validate?: (data: unknown) => boolean | Promise<boolean>;

  /** Icon component */
  icon?: React.ComponentType<{ size?: number }>;
}

/**
 * Main Wizard template component
 *
 * @example
 * ```tsx
 * const steps: WizardStepConfig[] = [
 *   { id: 'basic', label: 'Basic Info' },
 *   { id: 'details', label: 'Details', optional: true },
 *   { id: 'review', label: 'Review' },
 * ];
 *
 * <Wizard steps={steps}>
 *   <Wizard.Step stepId="basic">
 *     <BasicInfoForm />
 *   </Wizard.Step>
 *   <Wizard.Step stepId="details">
 *     <DetailsForm />
 *   </Wizard.Step>
 *   <Wizard.Step stepId="review">
 *     <ReviewSummary />
 *   </Wizard.Step>
 * </Wizard>
 * ```
 */
export interface WizardProps extends A11yProps, StateRenderProps {
  /** Step configuration array */
  steps: WizardStepConfig[];

  /** Child components (Wizard.Step elements) */
  children: React.ReactNode;

  /** Default current step index (uncontrolled) */
  defaultStepIndex?: number;

  /** Controlled current step index */
  stepIndex?: number;

  /** Callback when step changes */
  onStepIndexChange?: (index: number) => void;

  /** Callback when wizard completes */
  onComplete?: (data: unknown) => void | Promise<void>;

  /** Callback when wizard cancelled */
  onCancel?: () => void;

  /** Show step indicator (progress bar/breadcrumb) */
  showStepIndicator?: boolean;

  /** Step indicator variant */
  stepIndicatorVariant?: 'dots' | 'numbers' | 'labels';

  /** Allow free navigation (skip validation) */
  allowFreeNavigation?: boolean;

  /** Additional CSS class name */
  className?: string;
}
```

### Wizard Sub-components

```typescript
/**
 * Individual wizard step container
 */
export interface WizardStepProps extends A11yProps {
  /** Step ID (must match WizardStepConfig.id) */
  stepId: string;

  /** Step content */
  children: React.ReactNode;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Wizard navigation controls (auto-rendered by Wizard)
 */
export interface WizardNavigationProps {
  /** Current step index */
  currentStep: number;

  /** Total steps */
  totalSteps: number;

  /** Can navigate to previous step */
  canGoPrevious: boolean;

  /** Can navigate to next step */
  canGoNext: boolean;

  /** Is last step */
  isLastStep: boolean;

  /** Callback for previous button */
  onPrevious: () => void;

  /** Callback for next button */
  onNext: () => void;

  /** Callback for cancel button */
  onCancel: () => void;

  /** Callback for finish button */
  onFinish: () => void;

  /** Previous button label */
  previousLabel?: string;

  /** Next button label */
  nextLabel?: string;

  /** Cancel button label */
  cancelLabel?: string;

  /** Finish button label */
  finishLabel?: string;

  /** Additional CSS class name */
  className?: string;
}
```

---

## 4. Settings Template

### Core Settings Component

```typescript
/**
 * Settings section configuration
 */
export interface SettingsSectionConfig {
  /** Unique section identifier */
  id: string;

  /** Display label */
  label: string;

  /** Optional description */
  description?: string;

  /** Icon component */
  icon?: React.ComponentType<{ size?: number }>;

  /** Section requires specific permission */
  requiredPermission?: string;
}

/**
 * Main Settings template component
 *
 * @example
 * ```tsx
 * const sections: SettingsSectionConfig[] = [
 *   { id: 'profile', label: 'Profile', icon: UserIcon },
 *   { id: 'security', label: 'Security', icon: LockIcon },
 *   { id: 'notifications', label: 'Notifications', icon: BellIcon },
 * ];
 *
 * <Settings sections={sections}>
 *   <Settings.Section sectionId="profile">
 *     <ProfileForm />
 *   </Settings.Section>
 *   <Settings.Section sectionId="security">
 *     <SecurityForm />
 *   </Settings.Section>
 *   <Settings.Section sectionId="notifications">
 *     <NotificationPreferences />
 *   </Settings.Section>
 * </Settings>
 * ```
 */
export interface SettingsProps extends A11yProps, StateRenderProps, ResponsiveProps {
  /** Section configuration array */
  sections: SettingsSectionConfig[];

  /** Child components (Settings.Section elements) */
  children: React.ReactNode;

  /** Default active section ID (uncontrolled) */
  defaultActiveSection?: string;

  /** Controlled active section ID */
  activeSection?: string;

  /** Callback when section changes */
  onActiveSectionChange?: (sectionId: string) => void;

  /** Sidebar layout mode */
  sidebarLayout?: 'sticky' | 'scrollable';

  /** Mobile layout mode */
  mobileLayout?: 'tabs' | 'dropdown';

  /** Show save/cancel buttons at section level */
  showSectionActions?: boolean;

  /** Additional CSS class name */
  className?: string;
}
```

### Settings Sub-components

```typescript
/**
 * Individual settings section container
 */
export interface SettingsSectionProps extends A11yProps {
  /** Section ID (must match SettingsSectionConfig.id) */
  sectionId: string;

  /** Section content */
  children: React.ReactNode;

  /** Section title (overrides config label) */
  title?: string;

  /** Section description */
  description?: string;

  /** Show divider after section */
  showDivider?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Settings navigation sidebar (auto-rendered by Settings)
 */
export interface SettingsNavigationProps {
  /** Section configuration */
  sections: SettingsSectionConfig[];

  /** Active section ID */
  activeSection: string;

  /** Callback when section clicked */
  onSectionChange: (sectionId: string) => void;

  /** Additional CSS class name */
  className?: string;
}
```

---

## Default State Components

### Centralized State UI (exported from `@django-core/page-templates/states`)

```typescript
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
```

---

## Hook APIs

### Shared Hooks (exported from `@django-core/page-templates/hooks`)

```typescript
/**
 * Hook for controlled/uncontrolled state management
 * Used internally by all templates
 */
export function useControlledState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange: ((value: T) => void) | undefined
): [T, (value: T) => void];

/**
 * Hook for responsive breakpoint detection
 * Integrates with F06 breakpoints
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
 */
export function useKeyboardNavigation(options: {
  items: string[];
  activeItem: string;
  onItemChange: (item: string) => void;
  orientation?: 'vertical' | 'horizontal';
}): {
  handleKeyDown: (event: React.KeyboardEvent) => void;
};
```

---

## Export Structure

```typescript
// Main package exports
export { Dashboard, DashboardProps } from './components/Dashboard';
export { DashboardHeader, DashboardHeaderProps } from './components/Dashboard/DashboardHeader';
export { DashboardGrid, DashboardGridProps } from './components/Dashboard/DashboardGrid';
export { DashboardFilterBar, DashboardFilterBarProps } from './components/Dashboard/DashboardFilterBar';

export { ListDetail, ListDetailProps } from './components/ListDetail';
export { ListDetailList, ListDetailListProps } from './components/ListDetail/ListDetailList';
export { ListDetailDetail, ListDetailDetailProps } from './components/ListDetail/ListDetailDetail';

export { Wizard, WizardProps, WizardStepConfig } from './components/Wizard';
export { WizardStep, WizardStepProps } from './components/Wizard/WizardStep';
export { WizardNavigation, WizardNavigationProps } from './components/Wizard/WizardNavigation';

export { Settings, SettingsProps, SettingsSectionConfig } from './components/Settings';
export { SettingsSection, SettingsSectionProps } from './components/Settings/SettingsSection';
export { SettingsNavigation, SettingsNavigationProps } from './components/Settings/SettingsNavigation';

// State components
export {
  DefaultLoading,
  DefaultEmpty,
  DefaultError,
  DefaultPermissionDenied,
  DefaultOfflineRetry,
  type DefaultLoadingProps,
  type DefaultEmptyProps,
  type DefaultErrorProps,
  type DefaultPermissionDeniedProps,
  type DefaultOfflineRetryProps,
} from './components/states';

// Hooks
export {
  useControlledState,
  useResponsive,
  useKeyboardNavigation,
} from './hooks';

// Common types
export type {
  TemplateLoadingState,
  StateRenderProps,
  ResponsiveProps,
  A11yProps,
} from './types';
```

---

## Versioning & Stability

**API Stability Guarantees**:
- **Major version (1.x → 2.x)**: Breaking prop changes, removed exports
- **Minor version (1.0 → 1.1)**: New components, new optional props
- **Patch version (1.0.0 → 1.0.1)**: Bug fixes, no API changes

**Deprecation Policy**:
- Deprecated props: Marked `@deprecated` in JSDoc, trigger console warnings
- Removal timeline: 2 minor versions (e.g., deprecated in 1.1, removed in 1.3)
- Migration guides: Provided in CHANGELOG.md

---

## Implementation Notes

1. **All interfaces above are TypeScript contracts** - implementation must match exactly
2. **Prop names follow React conventions** - `on*` for callbacks, `default*` for uncontrolled, no prefixes for controlled
3. **Render props return ReactNode** - consumers can return null, strings, elements, fragments
4. **Callbacks are optional** - templates work without consumer-provided handlers
5. **TypeScript strict mode** - no implicit `any`, all props fully typed

---

## Contract Validation

These interfaces will be extracted to `.d.ts` files in `contracts/` directory and used for:
- Implementation validation (code matches contracts)
- Documentation generation (JSDoc → API docs)
- Downstream consumer types (auto-imported from package)

**Next Step**: Generate TypeScript `.d.ts` files in `contracts/` directory.
