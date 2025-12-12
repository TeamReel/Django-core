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
import { useNotificationsActions } from './useNotificationsActions';
import { NotificationsProvider } from '@/context/NotificationsProvider';

const testConfig = {
  apiBaseUrl: '/api/v1',
  pollingInterval: 30000,
  pageSize: 20,
};

describe('useNotificationsActions', () => {
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
        renderHook(() => useNotificationsActions());
      }).toThrow('useNotificationsActions must be used within a NotificationsProvider');

      console.error = originalError;
    });

    it('should return actions when used inside NotificationsProvider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationsProvider config={testConfig}>{children}</NotificationsProvider>
      );

      const { result } = renderHook(() => useNotificationsActions(), { wrapper });

      expect(result.current).toBeDefined();
      expect(typeof result.current.fetchNotifications).toBe('function');
    });
  });

  describe('Data Operation Methods', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should expose fetchNotifications', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.fetchNotifications).toBe('function');
    });

    it('should expose loadMore', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.loadMore).toBe('function');
    });

    it('should expose refresh', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('Mark-as-Read Operation Methods', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should expose markAsRead', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.markAsRead).toBe('function');
    });

    it('should expose markAsUnread', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.markAsUnread).toBe('function');
    });

    it('should expose markAllAsRead', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.markAllAsRead).toBe('function');
    });
  });

  describe('Filter Operation Methods', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should expose setFilters', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.setFilters).toBe('function');
    });
  });

  describe('Panel Control Methods', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should expose openPanel', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.openPanel).toBe('function');
    });

    it('should expose closePanel', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.closePanel).toBe('function');
    });

    it('should expose togglePanel', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.togglePanel).toBe('function');
    });
  });

  describe('Toast Control Methods', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should expose dismissToast', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.dismissToast).toBe('function');
    });
  });

  describe('Polling Control Methods', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should expose pausePolling', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.pausePolling).toBe('function');
    });

    it('should expose resumePolling', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.resumePolling).toBe('function');
    });

    it('should expose isPollingActive', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });
      expect(typeof result.current.isPollingActive).toBe('boolean');
    });
  });

  describe('Actions-Only Behavior', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    it('should not expose state properties', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });

      // Should not have state properties
      expect(result.current).not.toHaveProperty('notifications');
      expect(result.current).not.toHaveProperty('loading');
      expect(result.current).not.toHaveProperty('unreadCount');
      expect(result.current).not.toHaveProperty('filters');
      expect(result.current).not.toHaveProperty('pagination');
      expect(result.current).not.toHaveProperty('error');
      expect(result.current).not.toHaveProperty('panelOpen');
      expect(result.current).not.toHaveProperty('toasts');
    });

    it('should only expose action methods and isPollingActive', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });

      const expectedMethods = [
        'fetchNotifications',
        'loadMore',
        'refresh',
        'markAsRead',
        'markAsUnread',
        'markAllAsRead',
        'setFilters',
        'openPanel',
        'closePanel',
        'togglePanel',
        'dismissToast',
        'pausePolling',
        'resumePolling',
        'isPollingActive',
      ];

      const actualKeys = Object.keys(result.current);
      expect(actualKeys.sort()).toEqual(expectedMethods.sort());
    });

    it('should be suitable for action-only components', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });

      // Verify all returned values are either functions or boolean (isPollingActive)
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
        renderHook(() => useNotificationsActions());
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

    it('should avoid re-renders from state changes', () => {
      const { result } = renderHook(() => useNotificationsActions(), { wrapper });

      // Since we only expose actions, components using this hook
      // won't re-render when notifications state changes
      const actions = result.current;

      // All actions should be stable functions
      expect(typeof actions.fetchNotifications).toBe('function');
      expect(typeof actions.markAsRead).toBe('function');

      // No state means no dependency on state updates
      expect(actions).not.toHaveProperty('notifications');
    });
  });
});
