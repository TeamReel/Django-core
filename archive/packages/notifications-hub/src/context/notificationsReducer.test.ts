import { notificationsReducer, initialState, type NotificationsAction } from './notificationsReducer';
import { Notification } from '@/types';

describe('notificationsReducer', () => {
  const mockNotification: Notification = {
    id: '123',
    type: 'job.completed',
    severity: 'SUCCESS',
    title: 'Test notification',
    message: 'Test message',
    timestamp: '2025-12-11T14:30:00Z',
    read: false,
    org_id: 'org-123',
  };

  describe('FETCH_START', () => {
    it('should set loading to true and clear error', () => {
      const action: NotificationsAction = { type: 'FETCH_START' };
      const result = notificationsReducer(initialState, action);

      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('FETCH_SUCCESS', () => {
    it('should update notifications and pagination', () => {
      const action: NotificationsAction = {
        type: 'FETCH_SUCCESS',
        payload: {
          results: [mockNotification],
          count: 10,
          page: 1,
        },
      };
      const result = notificationsReducer(initialState, action);

      expect(result.loading).toBe(false);
      expect(result.notifications).toEqual([mockNotification]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalCount).toBe(10);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.unreadCount).toBe(1);
      expect(result.lastFetch).toBeTruthy();
    });

    it('should calculate unread count correctly', () => {
      const action: NotificationsAction = {
        type: 'FETCH_SUCCESS',
        payload: {
          results: [
            mockNotification,
            { ...mockNotification, id: '456', read: true },
          ],
          count: 2,
          page: 1,
        },
      };
      const result = notificationsReducer(initialState, action);

      expect(result.unreadCount).toBe(1);
    });

    it('should set hasMore to false when all results fetched', () => {
      const action: NotificationsAction = {
        type: 'FETCH_SUCCESS',
        payload: {
          results: [mockNotification],
          count: 1,
          page: 1,
        },
      };
      const result = notificationsReducer(initialState, action);

      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('FETCH_ERROR', () => {
    it('should set error and stop loading', () => {
      const error = new Error('Fetch failed');
      const action: NotificationsAction = { type: 'FETCH_ERROR', payload: error };
      const result = notificationsReducer(initialState, action);

      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('LOAD_MORE_START', () => {
    it('should set loadingMore to true', () => {
      const action: NotificationsAction = { type: 'LOAD_MORE_START' };
      const result = notificationsReducer(initialState, action);

      expect(result.loadingMore).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('LOAD_MORE_SUCCESS', () => {
    it('should append new notifications', () => {
      const stateWithData = {
        ...initialState,
        notifications: [mockNotification],
        pagination: { page: 1, pageSize: 20, totalCount: 3, hasMore: true },
      };

      const newNotification = { ...mockNotification, id: '456' };
      const action: NotificationsAction = {
        type: 'LOAD_MORE_SUCCESS',
        payload: {
          results: [newNotification],
          count: 3,
          page: 2,
        },
      };
      const result = notificationsReducer(stateWithData, action);

      expect(result.loadingMore).toBe(false);
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[1]).toEqual(newNotification);
      expect(result.pagination.page).toBe(2);
    });

    it('should update hasMore correctly', () => {
      const stateWithData = {
        ...initialState,
        notifications: [mockNotification],
        pagination: { page: 1, pageSize: 20, totalCount: 2, hasMore: true },
      };

      const action: NotificationsAction = {
        type: 'LOAD_MORE_SUCCESS',
        payload: {
          results: [{ ...mockNotification, id: '456' }],
          count: 2,
          page: 2,
        },
      };
      const result = notificationsReducer(stateWithData, action);

      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('MARK_READ_OPTIMISTIC', () => {
    it('should mark notification as read optimistically', () => {
      const stateWithData = {
        ...initialState,
        notifications: [mockNotification],
        unreadCount: 1,
      };

      const action: NotificationsAction = {
        type: 'MARK_READ_OPTIMISTIC',
        payload: { id: '123', previousRead: false },
      };
      const result = notificationsReducer(stateWithData, action);

      expect(result.notifications[0].read).toBe(true);
      expect(result.unreadCount).toBe(0);
    });

    it('should not go below 0 for unread count', () => {
      const stateWithData = {
        ...initialState,
        notifications: [mockNotification],
        unreadCount: 0,
      };

      const action: NotificationsAction = {
        type: 'MARK_READ_OPTIMISTIC',
        payload: { id: '123', previousRead: false },
      };
      const result = notificationsReducer(stateWithData, action);

      expect(result.unreadCount).toBe(0);
    });
  });

  describe('MARK_READ_SUCCESS', () => {
    it('should return state unchanged (optimistic update already applied)', () => {
      const action: NotificationsAction = {
        type: 'MARK_READ_SUCCESS',
        payload: { id: '123' },
      };
      const result = notificationsReducer(initialState, action);

      expect(result).toBe(initialState);
    });
  });

  describe('MARK_READ_FAILED', () => {
    it('should rollback optimistic update', () => {
      const stateWithOptimisticUpdate = {
        ...initialState,
        notifications: [{ ...mockNotification, read: true }],
        unreadCount: 0,
      };

      const error = new Error('Mark read failed');
      const action: NotificationsAction = {
        type: 'MARK_READ_FAILED',
        payload: { id: '123', previousRead: false, error },
      };
      const result = notificationsReducer(stateWithOptimisticUpdate, action);

      expect(result.notifications[0].read).toBe(false);
      expect(result.unreadCount).toBe(1);
      expect(result.error).toBe(error);
    });

    it('should not increment unread count if was already read', () => {
      const stateWithOptimisticUpdate = {
        ...initialState,
        notifications: [{ ...mockNotification, read: false }],
        unreadCount: 5,
      };

      const error = new Error('Mark read failed');
      const action: NotificationsAction = {
        type: 'MARK_READ_FAILED',
        payload: { id: '123', previousRead: true, error },
      };
      const result = notificationsReducer(stateWithOptimisticUpdate, action);

      expect(result.notifications[0].read).toBe(true);
      expect(result.unreadCount).toBe(5);
    });
  });

  describe('FILTER_CHANGE', () => {
    it('should update filters and reset to page 1', () => {
      const stateWithPagination = {
        ...initialState,
        pagination: { page: 3, pageSize: 20, totalCount: 100, hasMore: true },
      };

      const action: NotificationsAction = {
        type: 'FILTER_CHANGE',
        payload: { status: 'unread' },
      };
      const result = notificationsReducer(stateWithPagination, action);

      expect(result.filters.status).toBe('unread');
      expect(result.pagination.page).toBe(1);
    });

    it('should merge filter changes', () => {
      const stateWithFilters = {
        ...initialState,
        filters: { status: 'all' as const, type: 'job.completed' },
      };

      const action: NotificationsAction = {
        type: 'FILTER_CHANGE',
        payload: { status: 'unread' },
      };
      const result = notificationsReducer(stateWithFilters, action);

      expect(result.filters.status).toBe('unread');
      expect(result.filters.type).toBe('job.completed');
    });
  });

  describe('CONTEXT_CHANGE', () => {
    it('should clear notifications but preserve filters and panel state', () => {
      const stateWithData = {
        ...initialState,
        notifications: [mockNotification],
        filters: { status: 'unread' as const },
        panelOpen: true,
        unreadCount: 5,
      };

      const action: NotificationsAction = { type: 'CONTEXT_CHANGE' };
      const result = notificationsReducer(stateWithData, action);

      expect(result.notifications).toEqual([]);
      expect(result.unreadCount).toBe(0);
      expect(result.filters).toEqual(stateWithData.filters);
      expect(result.panelOpen).toBe(true);
    });
  });

  describe('TOAST_ADD', () => {
    it('should add toast to queue', () => {
      const action: NotificationsAction = {
        type: 'TOAST_ADD',
        payload: { toast: mockNotification },
      };
      const result = notificationsReducer(initialState, action);

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].notification).toEqual(mockNotification);
      expect(result.toasts[0].visible).toBe(true);
    });

    it('should limit toast queue to 3 items', () => {
      const stateWithToasts = {
        ...initialState,
        toasts: [
          { id: '1', notification: mockNotification, visible: true },
          { id: '2', notification: { ...mockNotification, id: '2' }, visible: true },
          { id: '3', notification: { ...mockNotification, id: '3' }, visible: true },
        ],
      };

      const newNotification = { ...mockNotification, id: '4' };
      const action: NotificationsAction = {
        type: 'TOAST_ADD',
        payload: { toast: newNotification },
      };
      const result = notificationsReducer(stateWithToasts, action);

      expect(result.toasts).toHaveLength(3);
      expect(result.toasts[0].id).toBe('2'); // First one removed
      expect(result.toasts[2].id).toBe('4'); // New one added
    });
  });

  describe('TOAST_DISMISS', () => {
    it('should remove toast from queue', () => {
      const stateWithToasts = {
        ...initialState,
        toasts: [
          { id: '1', notification: mockNotification, visible: true },
          { id: '2', notification: { ...mockNotification, id: '2' }, visible: true },
        ],
      };

      const action: NotificationsAction = {
        type: 'TOAST_DISMISS',
        payload: { id: '1' },
      };
      const result = notificationsReducer(stateWithToasts, action);

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });
  });

  describe('PANEL_OPEN', () => {
    it('should set panelOpen to true', () => {
      const action: NotificationsAction = { type: 'PANEL_OPEN' };
      const result = notificationsReducer(initialState, action);

      expect(result.panelOpen).toBe(true);
    });
  });

  describe('PANEL_CLOSE', () => {
    it('should set panelOpen to false', () => {
      const stateWithOpenPanel = { ...initialState, panelOpen: true };
      const action: NotificationsAction = { type: 'PANEL_CLOSE' };
      const result = notificationsReducer(stateWithOpenPanel, action);

      expect(result.panelOpen).toBe(false);
    });
  });

  describe('CLEAR_ERROR', () => {
    it('should clear error', () => {
      const stateWithError = { ...initialState, error: new Error('Test error') };
      const action: NotificationsAction = { type: 'CLEAR_ERROR' };
      const result = notificationsReducer(stateWithError, action);

      expect(result.error).toBeNull();
    });
  });
});
