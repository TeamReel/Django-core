import React, { createContext } from 'react';
import { Notification } from '@/types';

export interface Toast {
  id: string;
  notification: Notification;
  visible: boolean;
  dismissedAt?: number;
}

export interface NotificationsState {
  // Data
  notifications: Notification[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    hasMore: boolean;
  };

  // Filters
  filters: {
    status: 'all' | 'unread' | 'read';
    type?: string;
  };

  // Metadata
  unreadCount: number;
  lastFetch: string | null;

  // Loading states
  loading: boolean;
  loadingMore: boolean;

  // Error state
  error: Error | null;

  // UI state
  panelOpen: boolean;
  toasts: Toast[];
}

export interface NotificationsActions {
  // Data operations
  fetchNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Mark as read operations
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  // Filter operations
  setFilters: (filters: Partial<NotificationsState['filters']>) => void;

  // Panel control
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Toast control
  dismissToast: (id: string) => void;

  // Polling control
  pausePolling: () => void;
  resumePolling: () => void;
  isPollingActive: boolean;
}

export interface NotificationsContextValue extends NotificationsState, NotificationsActions {}

export const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);
