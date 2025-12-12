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
import { useNotifications } from './useNotifications';
import { NotificationsProvider } from '@/context/NotificationsProvider';

const testConfig = {
  apiBaseUrl: '/api/v1',
  pollingInterval: 30000,
  pageSize: 20,
};

describe('useNotifications', () => {
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
        renderHook(() => useNotifications());
      }).toThrow('useNotifications must be used within a NotificationsProvider');

      console.error = originalError;
    });

    it('should return context value when used inside NotificationsProvider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationsProvider config={testConfig}>{children}</NotificationsProvider>
      );

      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.notifications).toEqual([]);
      expect(typeof result.current.loading).toBe('boolean'); // Can be true or false depending on fetch state
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('State Properties', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider config={testConfig}>{children}</NotificationsProvider>
    );

    it('should expose notifications array', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(Array.isArray(result.current.notifications)).toBe(true);
    });

    it('should expose pagination state', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(result.current.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalCount: 0,
        hasMore: false,
      });
    });

    it('should expose filters state', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(result.current.filters).toEqual({
        status: 'all',
        type: undefined,
      });
    });

    it('should expose unreadCount', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.unreadCount).toBe('number');
    });

    it('should expose lastFetch timestamp', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(result.current.lastFetch).toBeNull();
    });

    it('should expose loading states', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.loadingMore).toBe('boolean');
    });

    it('should expose error state', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(result.current.error).toBeNull();
    });

    it('should expose UI state', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.panelOpen).toBe('boolean');
      expect(Array.isArray(result.current.toasts)).toBe(true);
    });
  });

  describe('Action Methods', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotificationsProvider config={testConfig}>{children}</NotificationsProvider>
    );

    it('should expose data operation methods', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.fetchNotifications).toBe('function');
      expect(typeof result.current.loadMore).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should expose mark-as-read operation methods', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAsUnread).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
    });

    it('should expose filter operation methods', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.setFilters).toBe('function');
    });

    it('should expose panel control methods', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.openPanel).toBe('function');
      expect(typeof result.current.closePanel).toBe('function');
      expect(typeof result.current.togglePanel).toBe('function');
    });

    it('should expose toast control methods', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.dismissToast).toBe('function');
    });

    it('should expose polling control methods', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      expect(typeof result.current.pausePolling).toBe('function');
      expect(typeof result.current.resumePolling).toBe('function');
      expect(typeof result.current.isPollingActive).toBe('boolean');
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message with provider requirement', () => {
      const originalError = console.error;
      console.error = jest.fn();

      try {
        renderHook(() => useNotifications());
      } catch (error) {
        expect((error as Error).message).toContain('NotificationsProvider');
        expect((error as Error).message).toContain('component tree');
      }

      console.error = originalError;
    });
  });
});
