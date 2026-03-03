import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isLocalStorageAvailable,
  getItem,
  setItem,
  removeItem,
  getAlertStorageKey,
} from '../../src/utils/localStorage';

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('isLocalStorageAvailable', () => {
    it('returns true when localStorage works', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('returns false when localStorage throws', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(isLocalStorageAvailable()).toBe(false);

      setItemSpy.mockRestore();
    });
  });

  describe('getItem', () => {
    it('returns null for non-existent key', () => {
      expect(getItem('nonexistent')).toBeNull();
    });

    it('retrieves string value', () => {
      localStorage.setItem('test', 'value');
      expect(getItem('test')).toBe('value');
    });

    it('parses JSON value', () => {
      localStorage.setItem('test', JSON.stringify({ foo: 'bar' }));
      expect(getItem<{ foo: string }>('test')).toEqual({ foo: 'bar' });
    });

    it('returns null when localStorage unavailable', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });

      expect(getItem('test')).toBeNull();

      getItemSpy.mockRestore();
    });
  });

  describe('setItem', () => {
    it('stores string value', () => {
      expect(setItem('test', 'value')).toBe(true);
      expect(localStorage.getItem('test')).toBe('value');
    });

    it('serializes object value', () => {
      expect(setItem('test', { foo: 'bar' })).toBe(true);
      expect(localStorage.getItem('test')).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('returns false on quota exceeded', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(setItem('test', 'value')).toBe(false);

      setItemSpy.mockRestore();
    });

    it('returns false on generic error', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Generic error');
      });

      expect(setItem('test', 'value')).toBe(false);

      setItemSpy.mockRestore();
    });
  });

  describe('removeItem', () => {
    it('removes existing key', () => {
      localStorage.setItem('test', 'value');
      expect(removeItem('test')).toBe(true);
      expect(localStorage.getItem('test')).toBeNull();
    });

    it('returns true even if key does not exist', () => {
      expect(removeItem('nonexistent')).toBe(true);
    });

    it('returns false when localStorage unavailable', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });

      expect(removeItem('test')).toBe(false);

      removeItemSpy.mockRestore();
    });
  });

  describe('getAlertStorageKey', () => {
    it('generates correct key format', () => {
      expect(getAlertStorageKey('low-credits')).toBe('django_core_alert_low-credits');
    });

    it('handles special characters in alert ID', () => {
      expect(getAlertStorageKey('test_alert.123')).toBe('django_core_alert_test_alert.123');
    });
  });
});
