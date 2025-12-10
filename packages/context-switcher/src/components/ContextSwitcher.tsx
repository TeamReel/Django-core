import React, { useState } from 'react';
import { Text } from '@django-core/design-system';
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
    border: 'none',
    background: 'transparent',
    padding: '0',
    cursor: 'pointer',
    font: 'inherit',
  };

  const projectButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    cursor: projectPickerDisabled ? 'not-allowed' : 'pointer',
    opacity: projectPickerDisabled ? 0.5 : 1,
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Organisation indicator button */}
      <button
        type="button"
        onClick={() => setOrgPickerOpen(true)}
        aria-label="Change organisation"
        aria-haspopup="dialog"
        aria-expanded={orgPickerOpen}
        style={buttonBaseStyle}
      >
        <ContextIndicator />
      </button>

      {/* Visual separator (horizontal only) */}
      {variant === 'horizontal' && (
        <Text
          size="sm"
          color="tertiary"
          style={{ userSelect: 'none' }}
          aria-hidden="true"
        >
          /
        </Text>
      )}

      {/* Project picker button */}
      <button
        type="button"
        onClick={() => !projectPickerDisabled && setProjectPickerOpen(true)}
        aria-label="Change project"
        aria-haspopup="dialog"
        aria-expanded={projectPickerOpen}
        disabled={projectPickerDisabled}
        style={projectButtonStyle}
      >
        <Text
          size="sm"
          color={projectPickerDisabled ? 'tertiary' : 'primary'}
          style={{
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
          }}
        >
          {context.project?.name || 'Select project'}
        </Text>
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
