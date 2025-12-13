import * as React from 'react';
import type { SettingsSectionProps } from '../../types';
import { useSettingsContext } from './Settings';

/**
 * Individual settings section container
 * Only renders when active
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  sectionId,
  children,
  title,
  description,
  showDivider = false,
  className,
  'aria-label': ariaLabel,
  ...props
}) => {
  const { activeSectionId, sections } = useSettingsContext();

  // Only render if this section is active
  if (sectionId !== activeSectionId) {
    return null;
  }

  // Get section config for title/description defaults
  const sectionConfig = sections.find((s) => s.id === sectionId);
  const displayTitle = title || sectionConfig?.label || '';
  const displayDescription = description || sectionConfig?.description;

  return (
    <div
      className={className}
      role="region"
      aria-label={ariaLabel || `${displayTitle} settings`}
      {...props}
    >
      {/* Section Header */}
      {displayTitle && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{displayTitle}</h2>
          {displayDescription && (
            <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.875rem' }}>
              {displayDescription}
            </p>
          )}
        </div>
      )}

      {/* Section Content */}
      <div>{children}</div>

      {/* Optional Divider */}
      {showDivider && (
        <hr
          style={{
            marginTop: '2rem',
            border: 'none',
            borderTop: '1px solid #e0e0e0',
          }}
        />
      )}
    </div>
  );
};

SettingsSection.displayName = 'SettingsSection';
