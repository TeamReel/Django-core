/**
 * Theme switching integration tests.
 *
 * Validates end-to-end theme switching behavior with provider and hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../src/components/ThemeProvider';
import { useTheme } from '../../src/hooks/useTheme';
import type { ThemeStorage } from '../../src/storage/types';

function TestComponent() {
  const { mode, resolvedMode, brand, setTheme, toggleMode } = useTheme();

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolvedMode}</span>
      <span data-testid="brand">{brand}</span>
      <button data-testid="toggle" onClick={toggleMode}>
        Toggle
      </button>
      <button data-testid="set-dark" onClick={() => setTheme({ mode: 'dark' })}>
        Set Dark
      </button>
      <button data-testid="set-light" onClick={() => setTheme({ mode: 'light' })}>
        Set Light
      </button>
      <button data-testid="set-brand" onClick={() => setTheme({ brand: 'acme' })}>
        Set Brand
      </button>
    </div>
  );
}

describe('Theme Switching Integration', () => {
  describe('Toggle Functionality', () => {
    it('should toggle between light and dark', async () => {
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('mode')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved')).toHaveTextContent('light');

      await act(async () => {
        screen.getByTestId('toggle').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('mode')).toHaveTextContent('dark');
        expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should toggle from dark to light', async () => {
      render(
        <ThemeProvider defaultMode="dark">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');

      await act(async () => {
        screen.getByTestId('toggle').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('resolved')).toHaveTextContent('light');
      });
    });
  });

  describe('Direct Mode Setting', () => {
    it('should set dark mode explicitly', async () => {
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('mode')).toHaveTextContent('light');

      await act(async () => {
        screen.getByTestId('set-dark').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('mode')).toHaveTextContent('dark');
        expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set light mode explicitly', async () => {
      render(
        <ThemeProvider defaultMode="dark">
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        screen.getByTestId('set-light').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('mode')).toHaveTextContent('light');
      });
    });
  });

  describe('Brand Switching', () => {
    it('should update brand variant', async () => {
      render(
        <ThemeProvider defaultBrand="default">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('brand')).toHaveTextContent('default');

      await act(async () => {
        screen.getByTestId('set-brand').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('brand')).toHaveTextContent('acme');
      });

      expect(document.documentElement.getAttribute('data-brand')).toBe('acme');
    });
  });

  describe('Storage Persistence', () => {
    it('should persist theme changes to storage', async () => {
      const mockStorage: ThemeStorage = {
        getTheme: vi.fn().mockResolvedValue(null),
        setTheme: vi.fn().mockResolvedValue(undefined),
      };

      render(
        <ThemeProvider storage={mockStorage} defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        screen.getByTestId('set-dark').click();
      });

      await waitFor(() => {
        expect(mockStorage.setTheme).toHaveBeenCalledWith({
          mode: 'dark',
          brand: 'default',
        });
      });
    });

    it('should persist brand changes to storage', async () => {
      const mockStorage: ThemeStorage = {
        getTheme: vi.fn().mockResolvedValue(null),
        setTheme: vi.fn().mockResolvedValue(undefined),
      };

      render(
        <ThemeProvider storage={mockStorage} defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        screen.getByTestId('set-brand').click();
      });

      await waitFor(() => {
        expect(mockStorage.setTheme).toHaveBeenCalledWith({
          mode: 'light',
          brand: 'acme',
        });
      });
    });
  });

  describe('Data Attribute Synchronization', () => {
    it('should update data-theme attribute when mode changes', async () => {
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      await act(async () => {
        screen.getByTestId('toggle').click();
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('should update data-brand attribute when brand changes', async () => {
      render(
        <ThemeProvider defaultBrand="default">
          <TestComponent />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-brand')).toBe('default');

      await act(async () => {
        screen.getByTestId('set-brand').click();
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-brand')).toBe('acme');
      });
    });
  });

  describe('Multiple Components', () => {
    it('should synchronize theme across multiple consumers', async () => {
      function Consumer1() {
        const { resolvedMode } = useTheme();
        return <span data-testid="consumer1">{resolvedMode}</span>;
      }

      function Consumer2() {
        const { resolvedMode, toggleMode } = useTheme();
        return (
          <div>
            <span data-testid="consumer2">{resolvedMode}</span>
            <button data-testid="toggle2" onClick={toggleMode}>
              Toggle
            </button>
          </div>
        );
      }

      render(
        <ThemeProvider defaultMode="light">
          <Consumer1 />
          <Consumer2 />
        </ThemeProvider>
      );

      expect(screen.getByTestId('consumer1')).toHaveTextContent('light');
      expect(screen.getByTestId('consumer2')).toHaveTextContent('light');

      await act(async () => {
        screen.getByTestId('toggle2').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('consumer1')).toHaveTextContent('dark');
        expect(screen.getByTestId('consumer2')).toHaveTextContent('dark');
      });
    });
  });
});
