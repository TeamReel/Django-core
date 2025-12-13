/**
 * Theme contract validation tests
 *
 * Validates theme contract structure and ensures light/dark themes
 * match the contract definition.
 */

import { describe, it, expect } from 'vitest';
import { themeVars } from '../../../src/themes/contract.css';
import { lightTheme } from '../../../src/themes/light.css';
import { darkTheme } from '../../../src/themes/dark.css';

describe('Theme Contract', () => {
  describe('themeVars structure', () => {
    it('should define color tokens', () => {
      expect(themeVars.color).toBeDefined();
      expect(themeVars.color.bg).toBeDefined();
      expect(themeVars.color.text).toBeDefined();
      expect(themeVars.color.border).toBeDefined();
      expect(themeVars.color.action).toBeDefined();
      expect(themeVars.color.state).toBeDefined();
    });

    it('should define spacing tokens', () => {
      expect(themeVars.spacing).toBeDefined();
      expect(themeVars.spacing.xs).toBeDefined();
      expect(themeVars.spacing.sm).toBeDefined();
      expect(themeVars.spacing.md).toBeDefined();
      expect(themeVars.spacing.lg).toBeDefined();
      expect(themeVars.spacing.xl).toBeDefined();
    });

    it('should define radius tokens', () => {
      expect(themeVars.radius).toBeDefined();
      expect(themeVars.radius.sm).toBeDefined();
      expect(themeVars.radius.md).toBeDefined();
      expect(themeVars.radius.lg).toBeDefined();
      expect(themeVars.radius.full).toBeDefined();
    });

    it('should define shadow tokens', () => {
      expect(themeVars.shadow).toBeDefined();
      expect(themeVars.shadow.sm).toBeDefined();
      expect(themeVars.shadow.md).toBeDefined();
      expect(themeVars.shadow.lg).toBeDefined();
    });
  });

  describe('Background color tokens', () => {
    it('should define all required bg levels', () => {
      expect(themeVars.color.bg.primary).toBeDefined();
      expect(themeVars.color.bg.secondary).toBeDefined();
      expect(themeVars.color.bg.tertiary).toBeDefined();
      expect(themeVars.color.bg.inverse).toBeDefined();
    });
  });

  describe('Text color tokens', () => {
    it('should define all required text levels', () => {
      expect(themeVars.color.text.primary).toBeDefined();
      expect(themeVars.color.text.secondary).toBeDefined();
      expect(themeVars.color.text.tertiary).toBeDefined();
      expect(themeVars.color.text.inverse).toBeDefined();
      expect(themeVars.color.text.link).toBeDefined();
    });
  });

  describe('Action color tokens', () => {
    it('should define all required action states', () => {
      expect(themeVars.color.action.primary).toBeDefined();
      expect(themeVars.color.action.primaryHover).toBeDefined();
      expect(themeVars.color.action.secondary).toBeDefined();
      expect(themeVars.color.action.secondaryHover).toBeDefined();
      expect(themeVars.color.action.danger).toBeDefined();
      expect(themeVars.color.action.dangerHover).toBeDefined();
    });
  });

  describe('Light Theme', () => {
    it('should be a valid CSS class name', () => {
      expect(typeof lightTheme).toBe('string');
      expect(lightTheme.length).toBeGreaterThan(0);
    });
  });

  describe('Dark Theme', () => {
    it('should be a valid CSS class name', () => {
      expect(typeof darkTheme).toBe('string');
      expect(darkTheme.length).toBeGreaterThan(0);
    });

    it('should be different from light theme', () => {
      expect(darkTheme).not.toBe(lightTheme);
    });
  });
});
