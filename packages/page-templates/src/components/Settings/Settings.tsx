import * as React from 'react';
import type {
  SettingsProps,
  SettingsComponent,
  SettingsSectionConfig,
} from '../../types';
import { useControlledState } from '../../hooks/useControlledState';
import { SettingsSection } from './SettingsSection';
import { SettingsNavigation } from './SettingsNavigation';
import { DefaultLoading } from '../states/DefaultLoading';
import { DefaultEmpty } from '../states/DefaultEmpty';
import { DefaultError } from '../states/DefaultError';
import { DefaultPermissionDenied } from '../states/DefaultPermissionDenied';

interface SettingsContextValue {
  sections: SettingsSectionConfig[];
  activeSectionId: string;
}

export const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export const useSettingsContext = () => {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within Settings component');
  }
  return context;
};

/**
 * Settings template component
 *
 * @example
 * ```tsx
 * const sections = [
 *   { id: 'profile', label: 'Profile' },
 *   { id: 'security', label: 'Security' },
 *   { id: 'notifications', label: 'Notifications' },
 * ];
 *
 * <Settings sections={sections}>
 *   <Settings.Section sectionId="profile"><ProfileForm /></Settings.Section>
 *   <Settings.Section sectionId="security"><SecurityForm /></Settings.Section>
 *   <Settings.Section sectionId="notifications"><NotificationPreferences /></Settings.Section>
 * </Settings>
 * ```
 */
const SettingsFC: React.FC<SettingsProps> = ({
  sections,
  children,
  defaultActiveSection,
  activeSection: controlledActiveSection,
  onActiveSectionChange,
  sidebarLayout = 'sticky',
  mobileLayout = 'dropdown',
  showSectionActions = false,
  loading = false,
  error = null,
  isEmpty = false,
  permissionDenied = false,
  renderLoading,
  renderEmpty,
  renderError,
  renderPermissionDenied,
  className,
  'aria-label': ariaLabel = 'Settings',
  ...props
}) => {
  // State rendering priority:
  // 1. Loading state
  if (loading) {
    return renderLoading ? <>{renderLoading()}</> : <DefaultLoading />;
  }

  // 2. Permission denied state
  if (permissionDenied) {
    return renderPermissionDenied ? <>{renderPermissionDenied()}</> : <DefaultPermissionDenied />;
  }

  // 3. Error state
  if (error) {
    return renderError ? <>{renderError(error)}</> : <DefaultError error={error} />;
  }

  // 4. Empty state
  if (isEmpty) {
    return renderEmpty ? <>{renderEmpty()}</> : <DefaultEmpty message="No settings sections configured" />;
  }

  // 5. Success state - render settings
  // Validate sections configuration
  React.useEffect(() => {
    if (!sections || sections.length === 0) {
      console.warn('Settings requires at least one section');
    }

    // Check for unique section IDs
    const ids = sections.map(s => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.error('Settings section IDs must be unique');
    }
  }, [sections]);

  // Determine default section (first section if not specified)
  const firstSectionId = sections[0]?.id || '';
  const defaultSection = defaultActiveSection || firstSectionId;

  // Controlled/uncontrolled active section
  const [activeSectionId, setActiveSectionId] = useControlledState(
    controlledActiveSection,
    defaultSection,
    onActiveSectionChange
  );

  // Validate active section exists
  const validActiveSectionId = React.useMemo(() => {
    const exists = sections.some(s => s.id === activeSectionId);
    if (!exists) {
      console.warn(`Active section "${activeSectionId}" not found, defaulting to "${firstSectionId}"`);
      return firstSectionId;
    }
    return activeSectionId;
  }, [activeSectionId, sections, firstSectionId]);

  // Context value
  const contextValue: SettingsContextValue = React.useMemo(
    () => ({
      sections,
      activeSectionId: validActiveSectionId,
    }),
    [sections, validActiveSectionId]
  );

  // Handle section change
  const handleSectionChange = React.useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId);
    },
    [setActiveSectionId]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      <div
        className={className}
        aria-label={ariaLabel}
        style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
        {...props}
      >
        {/* Navigation Sidebar */}
        <div style={{ position: sidebarLayout === 'sticky' ? 'sticky' : 'relative', top: sidebarLayout === 'sticky' ? '1rem' : '0', height: 'fit-content' }}>
          <SettingsNavigation
            sections={sections}
            activeSection={validActiveSectionId}
            onSectionChange={handleSectionChange}
          />
        </div>

        {/* Content Area */}
        <div>
          {children}
        </div>
      </div>
    </SettingsContext.Provider>
  );
};

SettingsFC.displayName = 'Settings';

// Create compound component
export const Settings = Object.assign(SettingsFC, {
  Section: SettingsSection,
  Navigation: SettingsNavigation,
}) as SettingsComponent;
