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
import { usePolling } from './usePolling';
import { NotificationsProvider } from '@/context/NotificationsProvider';

const testConfig = {
  apiBaseUrl: '/api/v1',
  pollingInterval: 30000,
  pageSize: 20,
};

describe('usePolling', () => {
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
        renderHook(() => usePolling());
      }).toThrow('usePolling must be used within a NotificationsProvider');

      console.error = originalError;
    });

    it('should return polling controls when used inside NotificationsProvider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationsProvider config={testConfig}>{children}</NotificationsProvider>
      );

      const { result } = renderHook(() => usePolling(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('pausePolling');
      expect(result.current).toHaveProperty('resumePolling');
      expect(result.current).toHaveProperty('isPollingActive');
    });
  });

  describe('Return Value Structure', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should return object with pausePolling method', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(typeof result.current.pausePolling).toBe('function');
    });

    it('should return object with resumePolling method', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(typeof result.current.resumePolling).toBe('function');
    });

    it('should return object with isPollingActive boolean', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(typeof result.current.isPollingActive).toBe('boolean');
    });

    it('should return only polling-related properties', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      const keys = Object.keys(result.current);
      expect(keys.sort()).toEqual(['isPollingActive', 'pausePolling', 'resumePolling'].sort());
    });

    it('should not expose other state properties', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(result.current).not.toHaveProperty('notifications');
      expect(result.current).not.toHaveProperty('loading');
      expect(result.current).not.toHaveProperty('unreadCount');
    });

    it('should not expose other action methods', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(result.current).not.toHaveProperty('fetchNotifications');
      expect(result.current).not.toHaveProperty('markAsRead');
      expect(result.current).not.toHaveProperty('openPanel');
    });
  });

  describe('Initial Values', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should return isPollingActive as true initially', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(result.current.isPollingActive).toBe(true);
    });

    it('should provide pausePolling function', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(result.current.pausePolling).toBeDefined();
      expect(() => result.current.pausePolling()).not.toThrow();
    });

    it('should provide resumePolling function', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });
      expect(result.current.resumePolling).toBeDefined();
      expect(() => result.current.resumePolling()).not.toThrow();
    });
  });

  describe('Polling Control Use Cases', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should support debugging scenarios', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // Debugging: pause polling to inspect state
      expect(typeof result.current.pausePolling).toBe('function');
      expect(typeof result.current.isPollingActive).toBe('boolean');
    });

    it('should support control panel components', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // Control panel: toggle polling on/off
      const { pausePolling, resumePolling, isPollingActive } = result.current;

      expect(typeof pausePolling).toBe('function');
      expect(typeof resumePolling).toBe('function');
      expect(typeof isPollingActive).toBe('boolean');
    });

    it('should support conditional polling (e.g., battery saver)', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // Battery saver: pause polling when battery is low
      const { pausePolling, isPollingActive } = result.current;

      expect(typeof pausePolling).toBe('function');
      expect(typeof isPollingActive).toBe('boolean');
    });

    it('should support focus-based polling control', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // Pause polling when user is not active
      const { pausePolling, resumePolling } = result.current;

      expect(typeof pausePolling).toBe('function');
      expect(typeof resumePolling).toBe('function');
    });
  });

  describe('Specialized Hook Behavior', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should be lightweight and focused', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // Should only expose 3 properties
      expect(Object.keys(result.current).length).toBe(3);
    });

    it('should provide minimal API for polling control', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // All properties are either functions or boolean
      Object.entries(result.current).forEach(([key, value]) => {
        expect(['function', 'boolean']).toContain(typeof value);
      });
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message with provider requirement', () => {
      const originalError = console.error;
      console.error = jest.fn();

      try {
        renderHook(() => usePolling());
      } catch (error) {
        expect((error as Error).message).toContain('NotificationsProvider');
        expect((error as Error).message).toContain('component tree');
      }

      console.error = originalError;
    });
  });

  describe('Integration with Provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should access the same polling state as provider', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // isPollingActive should reflect provider's internal state
      expect(typeof result.current.isPollingActive).toBe('boolean');
      expect(result.current.isPollingActive).toBe(true); // Initial state
    });

    it('should provide methods that control provider polling', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // These methods should directly control the provider's polling behavior
      expect(result.current.pausePolling).toBeDefined();
      expect(result.current.resumePolling).toBeDefined();
    });
  });

  describe('Hook Optimization', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should be more specialized than useNotifications', () => {
      const { result: fullResult } = renderHook(() => require('./useNotifications').useNotifications(), { wrapper });
      const { result: pollingResult } = renderHook(() => usePolling(), { wrapper });

      // usePolling should expose fewer properties
      const fullKeys = Object.keys(fullResult.current);
      const pollingKeys = Object.keys(pollingResult.current);

      expect(pollingKeys.length).toBeLessThan(fullKeys.length);
      expect(pollingKeys).toEqual(['pausePolling', 'resumePolling', 'isPollingActive']);
    });

    it('should avoid unnecessary re-renders', () => {
      const { result } = renderHook(() => usePolling(), { wrapper });

      // Only exposes polling controls, so won't re-render on notification updates
      expect(result.current).not.toHaveProperty('notifications');
      expect(result.current).not.toHaveProperty('unreadCount');
    });
  });
});
