/**
 * ComposedStorage tests.
 *
 * Validates multi-adapter composition with parallel writes and sequential reads.
 */

import { describe, it, expect, vi } from 'vitest';
import { ComposedStorage } from '../../../src/storage/ComposedStorage';
import type { ThemeStorage, ThemePreference } from '../../../src/storage/types';

// Mock adapter factory
function createMockAdapter(
  getImpl: () => Promise<ThemePreference | null> = async () => null,
  setImpl: (pref: ThemePreference) => Promise<void> = async () => {}
): ThemeStorage {
  return {
    getTheme: vi.fn(getImpl),
    setTheme: vi.fn(setImpl),
    clearTheme: vi.fn(async () => {}),
  };
}

describe('ComposedStorage', () => {
  describe('Initialization', () => {
    it('should require at least one adapter', () => {
      expect(() => new ComposedStorage([])).toThrow(
        'ComposedStorage requires at least one adapter'
      );
    });

    it('should accept single adapter', () => {
      const adapter = createMockAdapter();
      const storage = new ComposedStorage([adapter]);
      expect(storage).toBeInstanceOf(ComposedStorage);
    });

    it('should accept multiple adapters', () => {
      const adapters = [
        createMockAdapter(),
        createMockAdapter(),
        createMockAdapter(),
      ];
      const storage = new ComposedStorage(adapters);
      expect(storage).toBeInstanceOf(ComposedStorage);
    });
  });

  describe('Reading Themes - Sequential First-With-Data', () => {
    it('should return theme from first adapter', async () => {
      const adapters = [
        createMockAdapter(async () => ({ mode: 'dark', brand: 'acme' })),
        createMockAdapter(async () => ({ mode: 'light', brand: 'default' })),
      ];
      const storage = new ComposedStorage(adapters);

      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
      expect(adapters[0].getTheme).toHaveBeenCalledTimes(1);
      expect(adapters[1].getTheme).not.toHaveBeenCalled();
    });

    it('should skip empty adapters and read from second', async () => {
      const adapters = [
        createMockAdapter(async () => null),
        createMockAdapter(async () => ({ mode: 'light', brand: 'default' })),
      ];
      const storage = new ComposedStorage(adapters);

      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'light', brand: 'default' });
      expect(adapters[0].getTheme).toHaveBeenCalledTimes(1);
      expect(adapters[1].getTheme).toHaveBeenCalledTimes(1);
    });

    it('should return null if all adapters empty', async () => {
      const adapters = [
        createMockAdapter(async () => null),
        createMockAdapter(async () => null),
        createMockAdapter(async () => null),
      ];
      const storage = new ComposedStorage(adapters);

      const theme = await storage.getTheme();
      expect(theme).toBeNull();
      expect(adapters[0].getTheme).toHaveBeenCalledTimes(1);
      expect(adapters[1].getTheme).toHaveBeenCalledTimes(1);
      expect(adapters[2].getTheme).toHaveBeenCalledTimes(1);
    });

    it('should skip failing adapters and continue', async () => {
      const adapters = [
        createMockAdapter(async () => {
          throw new Error('Adapter 1 failed');
        }),
        createMockAdapter(async () => ({ mode: 'dark', brand: 'globex' })),
      ];
      const storage = new ComposedStorage(adapters);

      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'dark', brand: 'globex' });
    });
  });

  describe('Writing Themes - Parallel All', () => {
    it('should write to all adapters in parallel', async () => {
      const adapters = [
        createMockAdapter(),
        createMockAdapter(),
        createMockAdapter(),
      ];
      const storage = new ComposedStorage(adapters);

      await storage.setTheme({ mode: 'light', brand: 'default' });

      expect(adapters[0].setTheme).toHaveBeenCalledWith({
        mode: 'light',
        brand: 'default',
      });
      expect(adapters[1].setTheme).toHaveBeenCalledWith({
        mode: 'light',
        brand: 'default',
      });
      expect(adapters[2].setTheme).toHaveBeenCalledWith({
        mode: 'light',
        brand: 'default',
      });
    });

    it('should continue if one adapter fails', async () => {
      const adapters = [
        createMockAdapter(
          async () => null,
          async () => {
            throw new Error('Write failed');
          }
        ),
        createMockAdapter(),
      ];
      const storage = new ComposedStorage(adapters);

      // Should not throw
      await storage.setTheme({ mode: 'dark', brand: 'acme' });

      expect(adapters[0].setTheme).toHaveBeenCalledTimes(1);
      expect(adapters[1].setTheme).toHaveBeenCalledTimes(1);
    });

    it('should not fail if all writes fail', async () => {
      const adapters = [
        createMockAdapter(
          async () => null,
          async () => {
            throw new Error('Write 1 failed');
          }
        ),
        createMockAdapter(
          async () => null,
          async () => {
            throw new Error('Write 2 failed');
          }
        ),
      ];
      const storage = new ComposedStorage(adapters);

      // Should not throw
      await storage.setTheme({ mode: 'light', brand: 'default' });
    });
  });

  describe('Clearing Themes', () => {
    it('should clear all adapters in parallel', async () => {
      const adapters = [
        createMockAdapter(),
        createMockAdapter(),
        createMockAdapter(),
      ];
      const storage = new ComposedStorage(adapters);

      await storage.clearTheme();

      expect(adapters[0].clearTheme).toHaveBeenCalledTimes(1);
      expect(adapters[1].clearTheme).toHaveBeenCalledTimes(1);
      expect(adapters[2].clearTheme).toHaveBeenCalledTimes(1);
    });

    it('should continue if one clear fails', async () => {
      const adapters = [
        {
          getTheme: vi.fn(),
          setTheme: vi.fn(),
          clearTheme: vi.fn(async () => {
            throw new Error('Clear failed');
          }),
        },
        createMockAdapter(),
      ];
      const storage = new ComposedStorage(adapters);

      // Should not throw
      await storage.clearTheme();

      expect(adapters[0].clearTheme).toHaveBeenCalledTimes(1);
      expect(adapters[1].clearTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe('Common Usage Patterns', () => {
    it('should support Cookie + LocalStorage pattern', async () => {
      // Simulate common pattern: Cookie for SSR, LocalStorage for client
      const cookieAdapter = createMockAdapter(async () => ({
        mode: 'dark',
        brand: 'acme',
      }));
      const localStorageAdapter = createMockAdapter();

      const storage = new ComposedStorage([
        cookieAdapter,
        localStorageAdapter,
      ]);

      // Read should return cookie value
      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'dark', brand: 'acme' });

      // Write should hit both
      await storage.setTheme({ mode: 'light', brand: 'default' });
      expect(cookieAdapter.setTheme).toHaveBeenCalled();
      expect(localStorageAdapter.setTheme).toHaveBeenCalled();
    });

    it('should support LocalStorage + B12 offline-first pattern', async () => {
      // LocalStorage primary, B12 backup (offline-first)
      const localStorageAdapter = createMockAdapter(async () => ({
        mode: 'light',
        brand: 'default',
      }));
      const b12Adapter = createMockAdapter(async () => null); // Offline

      const storage = new ComposedStorage([
        localStorageAdapter,
        b12Adapter,
      ]);

      // Should read from localStorage when API offline
      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'light', brand: 'default' });
      expect(localStorageAdapter.getTheme).toHaveBeenCalledTimes(1);
      expect(b12Adapter.getTheme).not.toHaveBeenCalled();

      // Write should attempt both
      await storage.setTheme({ mode: 'dark', brand: 'acme' });
      expect(localStorageAdapter.setTheme).toHaveBeenCalled();
      expect(b12Adapter.setTheme).toHaveBeenCalled();
    });

    it('should respect adapter priority order', async () => {
      const highPriority = createMockAdapter(async () => ({
        mode: 'dark',
        brand: 'high',
      }));
      const lowPriority = createMockAdapter(async () => ({
        mode: 'light',
        brand: 'low',
      }));

      const storage = new ComposedStorage([highPriority, lowPriority]);

      const theme = await storage.getTheme();
      expect(theme?.brand).toBe('high'); // Should read from first adapter
    });
  });
});
