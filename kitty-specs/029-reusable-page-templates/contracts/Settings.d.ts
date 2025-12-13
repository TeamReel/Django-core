/**
 * Settings Template Component Contracts
 */

import * as React from 'react';
import { A11yProps, StateRenderProps, ResponsiveProps } from './common';

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

/**
 * Settings component with sub-components
 */
export interface SettingsComponent extends React.FC<SettingsProps> {
  Section: React.FC<SettingsSectionProps>;
  Navigation: React.FC<SettingsNavigationProps>;
}

export declare const Settings: SettingsComponent;
export declare const SettingsSection: React.FC<SettingsSectionProps>;
export declare const SettingsNavigation: React.FC<SettingsNavigationProps>;
