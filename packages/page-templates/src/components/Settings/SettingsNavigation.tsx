import * as React from 'react';
import type { SettingsNavigationProps, SettingsSectionConfig } from '../../types';

/**
 * Settings navigation component
 * Renders section list with active highlighting
 */
export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  sections,
  activeSection,
  onSectionChange,
  className,
}) => {
  // Handle keyboard navigation (arrow keys)
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, sectionId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSectionChange(sectionId);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = sections.findIndex(s => s.id === sectionId);
        const nextIndex = e.key === 'ArrowDown'
          ? (currentIndex + 1) % sections.length
          : (currentIndex - 1 + sections.length) % sections.length;
        onSectionChange(sections[nextIndex].id);
      }
    },
    [sections, onSectionChange]
  );

  const renderSectionItem = (section: SettingsSectionConfig) => {
    const isActive = section.id === activeSection;

    return (
      <div
        key={section.id}
        role="button"
        tabIndex={0}
        onClick={() => onSectionChange(section.id)}
        onKeyDown={(e) => handleKeyDown(e, section.id)}
        aria-current={isActive ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          borderRadius: '4px',
          backgroundColor: isActive ? '#e3f2fd' : 'transparent',
          color: isActive ? '#1976d2' : '#333',
          fontWeight: isActive ? 600 : 400,
          fontSize: '0.875rem',
          transition: 'all 0.2s',
          border: '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#1976d2';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'transparent';
        }}
      >
        {/* Icon */}
        {section.icon && (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <section.icon size={20} />
          </span>
        )}

        {/* Label */}
        <span style={{ flex: 1 }}>{section.label}</span>

        {/* Active Indicator */}
        {isActive && (
          <span
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#1976d2',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <nav
      className={className}
      role="navigation"
      aria-label="Settings navigation"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {sections.map(renderSectionItem)}
      </div>
    </nav>
  );
};

SettingsNavigation.displayName = 'SettingsNavigation';
