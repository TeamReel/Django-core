import React, { useState } from 'react';
import { Text, themeVars } from '@django-core/design-system';
import { ContextIndicator } from './ContextIndicator';
import { OrganisationPicker } from './OrganisationPicker';
import { ProjectPicker } from './ProjectPicker';
import { useContextSwitcher } from '../hooks/useContextSwitcher';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

export interface ContextSwitcherProps {
  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Layout variant
   * - "horizontal": Default, side-by-side layout (for headers)
   * - "vertical": Stacked layout (for sidebars)
   */
  variant?: 'horizontal' | 'vertical';
}

/**
 * ContextSwitcher is the main component that composes ContextIndicator,
 * OrganisationPicker, and ProjectPicker into a unified context switching UI.
 *
 * Requirements:
 * - FR-037 to FR-051: Complete context switching flow
 * - Composes indicator + pickers
 * - Manages picker state (open/closed)
 * - Keyboard accessible (Tab, click)
 * - Works in header/sidebar/standalone variants
 *
 * Usage:
 * ```tsx
 * <ContextSwitcher variant="horizontal" />
 * ```
 */
export function ContextSwitcher({
  className,
  variant = 'horizontal',
}: ContextSwitcherProps): React.ReactElement {
  const { context } = useContextSwitcher();
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  // Global keyboard shortcut: Cmd/Ctrl+K opens organisation picker
  // Detects platform to use correct modifier key
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  useKeyboardShortcut(
    {
      key: 'k',
      ctrlKey: !isMac,  // Ctrl on Windows/Linux
      metaKey: isMac,   // Cmd on macOS
    },
    () => {
      setOrgPickerOpen(true);
    }
  );

  // Determine if project picker should be disabled
  const projectPickerDisabled = !context.organisation;

  // Layout styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: variant === 'horizontal' ? 'row' : 'column',
    alignItems: variant === 'horizontal' ? 'center' : 'stretch',
    gap: variant === 'horizontal' ? '8px' : '12px',
  };

  const buttonBaseStyle: React.CSSProperties = {
    border: `1px solid ${themeVars.color.border.secondary}`,
    background: themeVars.color.background.secondary,
    color: themeVars.color.text.primary,
    padding: '6px 12px',
    cursor: 'pointer',
    font: 'inherit',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  };

  const projectButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    cursor: projectPickerDisabled ? 'not-allowed' : 'pointer',
    opacity: projectPickerDisabled ? 0.5 : 1,
  };

  const handleClick = () => {
    // If project is selected, open project picker; otherwise org picker
    if (context.project) {
      setProjectPickerOpen(true);
    } else {
      setOrgPickerOpen(true);
    }
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Context indicator button - click to switch organisation or project */}
      <button
        type="button"
        onClick={handleClick}
        aria-label={context.project ? 'Change project or organisation' : 'Change organisation'}
        aria-haspopup="dialog"
        aria-expanded={orgPickerOpen || projectPickerOpen}
        style={{
          ...buttonBaseStyle,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        title="Click to switch organisation or project"
      >
        <ContextIndicator />
        <Text size="sm" color="tertiary" aria-hidden="true">▼</Text>
      </button>

      {/* Organisation picker modal */}
      <OrganisationPicker
        isOpen={orgPickerOpen}
        onClose={() => setOrgPickerOpen(false)}
      />

      {/* Project picker modal */}
      <ProjectPicker
        isOpen={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
      />
    </div>
  );
}
