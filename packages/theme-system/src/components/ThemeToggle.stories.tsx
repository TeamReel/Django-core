/**
 * Storybook stories for ThemeToggle component.
 *
 * Demonstrates all variants and states.
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    (Story: () => ReactNode) => (
      <ThemeProvider>
        <div style={{ padding: '2rem' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

/**
 * Default icon variant - Simple icon button that cycles through light → dark → system
 */
export const IconDefault: Story = {
  args: {
    variant: 'icon',
  },
};

/**
 * Icon variant with text label showing current mode
 */
export const IconWithLabel: Story = {
  args: {
    variant: 'icon',
    showLabel: true,
  },
};

/**
 * Switch variant - Toggle between light and dark modes only
 */
export const SwitchDefault: Story = {
  args: {
    variant: 'switch',
  },
};

/**
 * Switch variant with "Dark mode" label
 */
export const SwitchWithLabel: Story = {
  args: {
    variant: 'switch',
    showLabel: true,
  },
};

/**
 * Dropdown menu variant - Shows all three mode options
 */
export const DropdownMenu: Story = {
  args: {
    variant: 'dropdown',
  },
};

/**
 * Icon variant in dark mode context
 */
export const DarkMode: Story = {
  args: {
    variant: 'icon',
  },
  decorators: [
    (Story: () => ReactNode) => (
      <ThemeProvider defaultMode="dark">
        <div style={{ padding: '2rem', backgroundColor: '#1a1a1a', minHeight: '200px' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

/**
 * All variants side by side for comparison
 */
export const AllVariants: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '2rem' }}>
        <div>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Icon</h4>
          <ThemeToggle variant="icon" />
        </div>
        <div>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Icon with Label</h4>
          <ThemeToggle variant="icon" showLabel />
        </div>
        <div>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Switch</h4>
          <ThemeToggle variant="switch" showLabel />
        </div>
        <div>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Dropdown</h4>
          <ThemeToggle variant="dropdown" />
        </div>
      </div>
    </ThemeProvider>
  ),
};

/**
 * Custom ARIA label example
 */
export const CustomAriaLabel: Story = {
  args: {
    variant: 'icon',
    'aria-label': 'Toggle between light and dark themes',
  },
};

/**
 * With custom className for styling integration
 */
export const WithCustomClass: Story = {
  args: {
    variant: 'icon',
    className: 'custom-theme-toggle',
  },
};
