import { NotificationsState } from './NotificationsContext';
import { Notification } from '../types';

export type NotificationsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { results: Notification[]; count: number; page: number } }
  | { type: 'FETCH_ERROR'; payload: Error }
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; payload: { results: Notification[]; count: number; page: number } }
  | { type: 'MARK_READ_OPTIMISTIC'; payload: { id: string; previousRead: boolean } }
  | { type: 'MARK_READ_SUCCESS'; payload: { id: string } }
  | { type: 'MARK_READ_FAILED'; payload: { id: string; previousRead: boolean; error: Error } }
  | { type: 'FILTER_CHANGE'; payload: Partial<NotificationsState['filters']> }
  | { type: 'CONTEXT_CHANGE' }
  | { type: 'TOAST_ADD'; payload: { toast: Notification } }
  | { type: 'TOAST_DISMISS'; payload: { id: string } }
  | { type: 'PANEL_OPEN' }
  | { type: 'PANEL_CLOSE' }
  | { type: 'CLEAR_ERROR' };

export const initialState: NotificationsState = {
  notifications: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: false,
  },
  filters: {
    status: 'all',
  },
  unreadCount: 0,
  lastFetch: null,
  loading: false,
  loadingMore: false,
  error: null,
  panelOpen: false,
  toasts: [],
};

export function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction
): NotificationsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS': {
      const { results, count, page } = action.payload;
      return {
        ...state,
        loading: false,
        notifications: results,
        pagination: {
          ...state.pagination,
          page,
          totalCount: count,
          hasMore: results.length < count,
        },
        unreadCount: results.filter(n => !n.read).length,
        lastFetch: new Date().toISOString(),
      };
    }

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };

    case 'LOAD_MORE_START':
      return { ...state, loadingMore: true, error: null };

    case 'LOAD_MORE_SUCCESS': {
      const { results, count, page } = action.payload;
      return {
        ...state,
        loadingMore: false,
        notifications: [...state.notifications, ...results],
        pagination: {
          ...state.pagination,
          page,
          totalCount: count,
          hasMore: state.notifications.length + results.length < count,
        },
      };
    }

    case 'MARK_READ_OPTIMISTIC': {
      const { id } = action.payload;
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }

    case 'MARK_READ_SUCCESS':
      return state; // Optimistic update already applied

    case 'MARK_READ_FAILED': {
      const { id, previousRead } = action.payload;
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: previousRead } : n
        ),
        unreadCount: previousRead ? state.unreadCount : state.unreadCount + 1,
        error: action.payload.error,
      };
    }

    case 'FILTER_CHANGE':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 },
      };

    case 'CONTEXT_CHANGE':
      return {
        ...initialState,
        filters: state.filters,
        panelOpen: state.panelOpen,
      };

    case 'TOAST_ADD': {
      const newToast = {
        id: action.payload.toast.id,
        notification: action.payload.toast,
        visible: true,
      };
      return {
        ...state,
        toasts: [...state.toasts.slice(-2), newToast], // Max 3 toasts
      };
    }

    case 'TOAST_DISMISS':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload.id),
      };

    case 'PANEL_OPEN':
      return { ...state, panelOpen: true };

    case 'PANEL_CLOSE':
      return { ...state, panelOpen: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}
