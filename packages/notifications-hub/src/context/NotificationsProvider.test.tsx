import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { NotificationsProvider } from './NotificationsProvider';
import { NotificationsContext } from './NotificationsContext';
import { NotificationsConfig } from '@/types';
import * as apiClient from './apiClient';

// Mock API client
jest.mock('./apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock F02 auth
jest.mock('@django-core/auth-ui', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User' },
  })),
}), { virtual: true });

// Mock F03 context switcher
jest.mock('@django-core/context-switcher', () => ({
  useContext: jest.fn(() => ({
    orgId: 'org-123',
    projectId: undefined,
    organisationName: 'Test Organisation',
  })),
}), { virtual: true });

// Mock config module
jest.mock('@/config');

// Import mocked functions
import { useAuth } from '@django-core/auth-ui';
import { useContext as useF03Context } from '@django-core/context-switcher';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseF03Context = useF03Context as jest.MockedFunction<typeof useF03Context>;

describe('NotificationsProvider', () => {
  const mockConfig: NotificationsConfig = {
    apiBaseUrl: '/api/v1',
    pollingInterval: 30000,
    toastPosition: {
      desktop: 'top-right',
      mobile: 'top-center',
    },
    maxToasts: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default API mock responses
    mockApiClient.fetchNotifications.mockResolvedValue({
      results: [],
      count: 0,
      next: null,
      previous: null,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should provide context value with initial state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current?.notifications).toEqual([]);
    expect(result.current?.loading).toBe(false);
    expect(result.current?.panelOpen).toBe(false);
    expect(result.current?.unreadCount).toBe(0);
  });

  it('should provide all action functions', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    expect(typeof result.current?.fetchNotifications).toBe('function');
    expect(typeof result.current?.loadMore).toBe('function');
    expect(typeof result.current?.refresh).toBe('function');
    expect(typeof result.current?.markAsRead).toBe('function');
    expect(typeof result.current?.markAsUnread).toBe('function');
    expect(typeof result.current?.markAllAsRead).toBe('function');
    expect(typeof result.current?.setFilters).toBe('function');
    expect(typeof result.current?.openPanel).toBe('function');
    expect(typeof result.current?.closePanel).toBe('function');
    expect(typeof result.current?.togglePanel).toBe('function');
    expect(typeof result.current?.dismissToast).toBe('function');
    expect(typeof result.current?.pausePolling).toBe('function');
    expect(typeof result.current?.resumePolling).toBe('function');
  });

  it('should handle setFilters action', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    act(() => {
      result.current?.setFilters({ status: 'unread' });
    });

    expect(result.current?.filters.status).toBe('unread');
  });

  it('should handle panel open/close', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    expect(result.current?.panelOpen).toBe(false);

    act(() => {
      result.current?.openPanel();
    });

    expect(result.current?.panelOpen).toBe(true);

    act(() => {
      result.current?.closePanel();
    });

    expect(result.current?.panelOpen).toBe(false);
  });

  it('should handle panel toggle', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    expect(result.current?.panelOpen).toBe(false);

    act(() => {
      result.current?.togglePanel();
    });

    expect(result.current?.panelOpen).toBe(true);

    act(() => {
      result.current?.togglePanel();
    });

    expect(result.current?.panelOpen).toBe(false);
  });

  it('should handle dismissToast action', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    // Note: TOAST_ADD would normally be called by API integration
    // This test just verifies the dismissToast function doesn't error
    act(() => {
      result.current?.dismissToast('toast-123');
    });

    expect(result.current?.toasts).toEqual([]);
  });

  it('should handle pausePolling and resumePolling', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    expect(result.current?.isPollingActive).toBe(true);

    act(() => {
      result.current?.pausePolling();
    });

    expect(result.current?.isPollingActive).toBe(false);

    act(() => {
      result.current?.resumePolling();
    });

    expect(result.current?.isPollingActive).toBe(true);
  });

  it('should call fetchNotifications on mount', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    renderHook(() => React.useContext(NotificationsContext), { wrapper });

    expect(consoleSpy).toHaveBeenCalledWith('[F04] fetchNotifications called');

    consoleSpy.mockRestore();
  });

  it('should setup polling interval', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    renderHook(() => React.useContext(NotificationsContext), { wrapper });

    // Clear initial fetch call
    consoleSpy.mockClear();

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(consoleSpy).toHaveBeenCalledWith('[F04] fetchNotifications called');

    consoleSpy.mockRestore();
  });

  it('should react to orgId changes', () => {
    mockUseF03Context.mockReturnValue({
      orgId: 'org-123',
      projectId: undefined,
      organisationName: 'Test Organisation',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { rerender } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Change orgId
    mockUseF03Context.mockReturnValue({
      orgId: 'org-456',
      projectId: undefined,
      organisationName: 'Different Organisation',
    });

    rerender();

    // Should trigger CONTEXT_CHANGE and refetch
    expect(consoleSpy).toHaveBeenCalledWith('[F04] fetchNotifications called');

    consoleSpy.mockRestore();
  });

  it('should react to authentication changes', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationsProvider config={mockConfig}>{children}</NotificationsProvider>
    );

    const { result, rerender } = renderHook(() => React.useContext(NotificationsContext), { wrapper });

    expect(result.current?.isPollingActive).toBe(true);

    // User logs out
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: { id: '', email: '', displayName: '' },
    });

    act(() => {
      rerender();
    });

    expect(result.current?.isPollingActive).toBe(false);
  });
});
