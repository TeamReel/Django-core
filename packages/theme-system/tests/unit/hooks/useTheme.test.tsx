/**
 * useTheme hook tests.
 *
 * Validates hook API and context requirement.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ThemeProvider } from '../../../src/components/ThemeProvider';
import { useTheme } from '../../../src/hooks/useTheme';
import type { ReactNode } from 'react';

describe('useTheme', () => {
  describe('Context Requirement', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within ThemeProvider');

      console.error = originalError;
    });
  });

  describe('Return Value', () => {
    it('should return theme context value with correct shape', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider defaultMode="dark" defaultBrand="acme">
            {children}
          </ThemeProvider>
        ),
      });

      expect(result.current).toHaveProperty('mode');
      expect(result.current).toHaveProperty('resolvedMode');
      expect(result.current).toHaveProperty('brand');
      expect(result.current).toHaveProperty('setTheme');
      expect(result.current).toHaveProperty('toggleMode');
    });

    it('should return correct mode value', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider defaultMode="dark">{children}</ThemeProvider>
        ),
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.resolvedMode).toBe('dark');
    });

    it('should return correct brand value', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider defaultBrand="acme">{children}</ThemeProvider>
        ),
      });

      expect(result.current.brand).toBe('acme');
    });

    it('should provide setTheme function', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider>{children}</ThemeProvider>
        ),
      });

      expect(typeof result.current.setTheme).toBe('function');
    });

    it('should provide toggleMode function', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider>{children}</ThemeProvider>
        ),
      });

      expect(typeof result.current.toggleMode).toBe('function');
    });
  });

  describe('System Mode Resolution', () => {
    it('should resolve system mode to actual mode', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider defaultMode="system">{children}</ThemeProvider>
        ),
      });

      expect(result.current.mode).toBe('system');
      expect(['light', 'dark']).toContain(result.current.resolvedMode);
    });
  });

  describe('Default Values', () => {
    it('should use system mode as default', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider>{children}</ThemeProvider>
        ),
      });

      expect(result.current.mode).toBe('system');
    });

    it('should use default brand as default', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ThemeProvider>{children}</ThemeProvider>
        ),
      });

      expect(result.current.brand).toBe('default');
    });
  });
});
