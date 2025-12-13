/**
 * ThemeToggle component for switching between theme modes.
 *
 * Provides three variants:
 * - icon: Simple icon button that cycles through modes
 * - switch: Toggle switch for light/dark only
 * - dropdown: Full menu with all mode options
 *
 * @module components/ThemeToggle
 */

import React from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { Button } from '@django-core/design-system';
import { themeVars } from '@django-core/design-system';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode } from '../types/theme';

/**
 * Variant types for ThemeToggle component.
 */
export type ThemeToggleVariant = 'icon' | 'switch' | 'dropdown';

/**
 * Props for ThemeToggle component.
 */
export interface ThemeToggleProps {
  /**
   * Visual variant of the toggle.
   * @default 'icon'
   */
  variant?: ThemeToggleVariant;

  /**
   * Whether to show a text label alongside the toggle.
   * @default false
   */
  showLabel?: boolean;

  /**
   * Additional CSS class names.
   */
  className?: string;

  /**
   * Accessible label for screen readers.
   */
  'aria-label'?: string;
}

/**
 * Icon variant - Simple button with sun/moon/system icon using F01 Button component
 */
function IconVariant({
  showLabel,
  'aria-label': ariaLabel,
  className,
}: Pick<ThemeToggleProps, 'showLabel' | 'aria-label' | 'className'>) {
  const { mode, toggleMode } = useTheme();

  const icons = {
    light: SunIcon,
    dark: MoonIcon,
    system: ComputerDesktopIcon,
  };

  const Icon = icons[mode];
  const nextMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';

  return (
    <Button
      variant="ghost"
      size="md"
      onClick={toggleMode}
      aria-label={ariaLabel ?? `Switch to ${nextMode} mode`}
      className={className}
      style={{
        minWidth: '44px',
        minHeight: '44px',
        padding: showLabel ? `${themeVars.spacing['2']} ${themeVars.spacing['4']}` : themeVars.spacing['2'],
      }}
    >
      <Icon style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
      {showLabel && <span style={{ marginLeft: themeVars.spacing['2'] }}>{mode}</span>}
    </Button>
  );
}

/**
 * Switch variant - Toggle for light/dark only using F01 design tokens
 */
function SwitchVariant({
  showLabel,
  className,
}: Pick<ThemeToggleProps, 'showLabel' | 'className'>) {
  const { mode, setTheme } = useTheme();
  const isDark = mode === 'dark';

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: themeVars.spacing['2'],
      }}
    >
      {showLabel && (
        <span style={{ fontSize: themeVars.typography.fontSize.sm }}>
          Dark mode
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        onClick={() => {
          setTheme({ mode: isDark ? 'light' : 'dark' });
        }}
        style={{
          position: 'relative',
          display: 'inline-block',
          width: '44px',
          height: '24px',
          backgroundColor: isDark
            ? themeVars.color.interactive.primary
            : themeVars.color.background.secondary,
          borderRadius: themeVars.radius.full,
          border: 'none',
          cursor: 'pointer',
          transition: `background-color ${themeVars.motion.duration.fast} ${themeVars.motion.easing.default}`,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: isDark ? '22px' : '2px',
            width: '20px',
            height: '20px',
            backgroundColor: themeVars.color.text.inverse,
            borderRadius: themeVars.radius.full,
            transition: `left ${themeVars.motion.duration.fast} ${themeVars.motion.easing.default}`,
          }}
        />
      </button>
    </div>
  );
}

/**
 * Dropdown variant - Full menu with all mode options using F01 Button and design tokens
 */
function DropdownVariant({
  'aria-label': ariaLabel,
  className,
}: Pick<ThemeToggleProps, 'aria-label' | 'className'>) {
  const { mode, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const modes: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  ];

  const CurrentIcon = mode === 'dark' ? MoonIcon : mode === 'light' ? SunIcon : ComputerDesktopIcon;

  // Focus menu item when index changes
  React.useEffect(() => {
    if (isOpen && menuRef.current) {
      const menuItems = menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      menuItems[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % modes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + modes.length) % modes.length);
    }
  };

  // Handle blur to close menu when focus leaves
  const handleBlur = (e: React.FocusEvent) => {
    // Check if the new focus is still within the dropdown
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div style={{ position: 'relative' }} className={className} onBlur={handleBlur}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="md"
        onClick={() => {
          setIsOpen(!isOpen);
          setFocusedIndex(modes.findIndex((m) => m.value === mode));
        }}
        aria-label={ariaLabel ?? 'Theme menu'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          minWidth: '44px',
          minHeight: '44px',
          padding: themeVars.spacing['2'],
        }}
      >
        <CurrentIcon style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop - use button instead of div for keyboard accessibility */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: themeVars.zIndex.dropdown,
              border: 'none',
              background: 'transparent',
              cursor: 'default',
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: themeVars.spacing['1'],
              minWidth: '150px',
              backgroundColor: themeVars.color.background.primary,
              border: `1px solid ${themeVars.color.border.primary}`,
              borderRadius: themeVars.radius.md,
              boxShadow: themeVars.shadow.lg,
              padding: themeVars.spacing['1'],
              zIndex: themeVars.zIndex.dropdown + 10,
            }}
          >
            {modes.map(({ value, label, icon: Icon }, index) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                tabIndex={index === focusedIndex ? 0 : -1}
                onClick={() => {
                  setTheme({ mode: value });
                  closeMenu();
                }}
                onFocus={() => setFocusedIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: themeVars.spacing['2'],
                  width: '100%',
                  padding: `${themeVars.spacing['2']} ${themeVars.spacing['3']}`,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: themeVars.radius.sm,
                  fontSize: themeVars.typography.fontSize.sm,
                  color: themeVars.color.text.primary,
                  transition: `background-color ${themeVars.motion.duration.fast} ${themeVars.motion.easing.default}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeVars.color.background.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
                <span>{label}</span>
                {mode === value && <span style={{ marginLeft: 'auto' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * ThemeToggle component - Switch between light, dark, and system modes.
 *
 * Integrates with ThemeProvider context. Uses inline styles for F01 independence.
 *
 * @example Icon variant (default)
 * ```tsx
 * <ThemeToggle />
 * ```
 *
 * @example Icon with label
 * ```tsx
 * <ThemeToggle variant="icon" showLabel />
 * ```
 *
 * @example Switch variant
 * ```tsx
 * <ThemeToggle variant="switch" showLabel />
 * ```
 *
 * @example Dropdown menu
 * ```tsx
 * <ThemeToggle variant="dropdown" />
 * ```
 */
export function ThemeToggle({
  variant = 'icon',
  showLabel = false,
  className,
  'aria-label': ariaLabel,
}: ThemeToggleProps): React.ReactElement {
  if (variant === 'switch') {
    return <SwitchVariant showLabel={showLabel} className={className} />;
  }

  if (variant === 'dropdown') {
    return <DropdownVariant aria-label={ariaLabel} className={className} />;
  }

  return <IconVariant showLabel={showLabel} aria-label={ariaLabel} className={className} />;
}
