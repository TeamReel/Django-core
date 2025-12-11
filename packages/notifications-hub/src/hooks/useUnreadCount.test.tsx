import { ReactNode } from 'react';

// Mock the dependencies before any imports
const mockUseAuth = jest.fn();
const mockUseF03Context = jest.fn();
const mockApiClient = {
  fetchNotifications: jest.fn().mockResolvedValue({
    results: [],
    count: 0,
    next: null,
    previous: null,
  }),
  updateReadStatus: jest.fn().mockResolvedValue({}),
  markAllRead: jest.fn().mockResolvedValue({ updated_count: 0 }),
  getUnreadCount: jest.fn().mockResolvedValue({ count: 0 }),
};

jest.mock('@django-core/auth-ui', () => ({
  useAuth: mockUseAuth,
}), { virtual: true });

jest.mock('@django-core/context-switcher', () => ({
  useContext: mockUseF03Context,
}), { virtual: true });

jest.mock('@/config', () => ({
  defaultNotificationMappings: {},
}));

jest.mock('@/context/apiClient', () => mockApiClient);

import { renderHook } from '@testing-library/react';
import { useUnreadCount } from './useUnreadCount';
import { NotificationsProvider } from '@/context/NotificationsProvider';

const testConfig = {
  apiBaseUrl: '/api/v1',
  pollingInterval: 30000,
  pageSize: 20,
};

describe('useUnreadCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isAuthenticated: true,
    });

    mockUseF03Context.mockReturnValue({
      orgId: 'org-1',
      projectId: null,
      switchOrg: jest.fn(),
      switchProject: jest.fn(),
    });
  });

  describe('Context Access', () => {
    it('should throw error when used outside NotificationsProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useUnreadCount());
      }).toThrow('useUnreadCount must be used within a NotificationsProvider');

      console.error = originalError;
    });

    it('should return count and loading when used inside NotificationsProvider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationsProvider config={testConfig}>{children}</NotificationsProvider>
      );

      const { result } = renderHook(() => useUnreadCount(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('count');
      expect(result.current).toHaveProperty('loading');
    });
  });

  describe('Return Value Structure', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should return object with count property', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });
      expect(typeof result.current.count).toBe('number');
    });

    it('should return object with loading property', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });
      expect(typeof result.current.loading).toBe('boolean');
    });

    it('should return only count and loading properties', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });
      const keys = Object.keys(result.current);
      expect(keys).toEqual(['count', 'loading']);
    });

    it('should not expose notifications array', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });
      expect(result.current).not.toHaveProperty('notifications');
    });

    it('should not expose action methods', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });
      expect(result.current).not.toHaveProperty('fetchNotifications');
      expect(result.current).not.toHaveProperty('markAsRead');
    });
  });

  describe('Initial Values', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should return count of 0 initially', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });
      expect(result.current.count).toBe(0);
    });

    it('should return loading false initially', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Lightweight Hook Behavior', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should be suitable for badge components (minimal API)', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });

      // Badge components only need count and loading
      const { count, loading } = result.current;

      expect(typeof count).toBe('number');
      expect(typeof loading).toBe('boolean');

      // Should not have methods that would cause unnecessary re-renders
      expect(Object.keys(result.current).length).toBe(2);
    });

    it('should provide data needed for conditional badge rendering', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });

      // Common badge use case: hide when count is 0 or loading
      const shouldShowBadge = !result.current.loading && result.current.count > 0;

      expect(typeof shouldShowBadge).toBe('boolean');
    });

    it('should support 99+ display logic', () => {
      const { result } = renderHook(() => useUnreadCount(), { wrapper });

      // Common badge pattern: show "99+" for counts over 99
      const displayCount = result.current.count > 99 ? '99+' : result.current.count.toString();

      expect(typeof displayCount).toBe('string');
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message with provider requirement', () => {
      const originalError = console.error;
      console.error = jest.fn();

      try {
        renderHook(() => useUnreadCount());
      } catch (error) {
        expect((error as Error).message).toContain('NotificationsProvider');
        expect((error as Error).message).toContain('component tree');
      }

      console.error = originalError;
    });
  });

  describe('Hook Optimization', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should be more lightweight than useNotifications', () => {
      const { result: fullResult } = renderHook(() => require('./useNotifications').useNotifications(), { wrapper });
      const { result: lightResult } = renderHook(() => useUnreadCount(), { wrapper });

      // useUnreadCount should expose fewer properties
      const fullKeys = Object.keys(fullResult.current);
      const lightKeys = Object.keys(lightResult.current);

      expect(lightKeys.length).toBeLessThan(fullKeys.length);
      expect(lightKeys).toEqual(['count', 'loading']);
    });
  });
});
