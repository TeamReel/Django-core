/**
 * Types for useTopNavbarData hook
 */
import type React from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';
import type { User } from '@django-core/auth-ui';
import type { QueueCounts } from '../../hooks/useQueueCounts';
import type { GenerationJob } from '../../hooks/useGenerationJobs';
import type { NavGroup, NavItem, PhotoCompositeFollowUpInfo } from '../topNavbarHelpers';

export interface UseTopNavbarDataReturn {
  // Auth / roles
  user: User | null;
  signOut: () => Promise<void>;
  signOutLoading: boolean;
  isSystemAdmin: boolean;
  isLandAdmin: boolean;
  isOrgAdmin: boolean;
  hasOrgRole: boolean;
  isAdmin: boolean;
  // Navigation
  location: Location;
  navigate: NavigateFunction;
  showBreadcrumbs: boolean;
  // Theme
  currentThemeMode: string;
  toggleTheme: () => void;
  // Dropdown / mega-menu
  openDropdown: string | null;
  setOpenDropdown: React.Dispatch<React.SetStateAction<string | null>>;
  filteredNavGroups: NavGroup[];
  dashboardItem: NavItem;
  isItemActive: (path: string) => boolean;
  isGroupActive: (group: NavGroup) => boolean;
  handleMouseEnterTrigger: (groupId: string) => void;
  handleMouseLeaveTrigger: (groupId: string) => void;
  handleMouseEnterDropdown: (groupId: string) => void;
  handleMouseLeaveDropdown: (groupId: string) => void;
  handleClickTrigger: (groupId: string, e: React.MouseEvent) => void;
  handleKeyDown: (groupId: string, e: React.KeyboardEvent) => void;
  // Mobile
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Language
  language: 'EN' | 'NL' | 'DE' | 'IT' | 'FR';
  languageMenuOpen: boolean;
  setLanguageMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleLanguageChange: (lang: 'EN' | 'NL' | 'DE' | 'IT' | 'FR') => void;
  // Search
  navSearchHasQuery: boolean;
  setNavSearchHasQuery: React.Dispatch<React.SetStateAction<boolean>>;
  commandOpen: boolean;
  setCommandOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Create menu
  createMenuOpen: boolean;
  setCreateMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createMenuRef: React.RefObject<HTMLDivElement | null>;
  // Queue / quick-review
  queueCounts: QueueCounts;
  queueBadgeCount: number;
  queueBadgeColor: string;
  quickReviewOpen: boolean;
  setQuickReviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openQuickReview: () => void;
  queueModalTab: 'review' | 'in-progress';
  setQueueModalTab: React.Dispatch<React.SetStateAction<'review' | 'in-progress'>>;
  quickReviewIdx: number;
  setQuickReviewIdx: React.Dispatch<React.SetStateAction<number>>;
  quickReviewBusy: boolean;
  selectedVariantIdxs: Set<number>;
  setSelectedVariantIdxs: React.Dispatch<React.SetStateAction<Set<number>>>;
  pendingReviewJobs: GenerationJob[];
  inProgressJobs: GenerationJob[];
  refreshAiJobs: () => Promise<void>;
  handleQuickReview: (action: 'approve' | 'reject') => Promise<void>;
  // Photo composite follow-up
  photoCompositeFollowUp: PhotoCompositeFollowUpInfo | null;
  setPhotoCompositeFollowUp: React.Dispatch<React.SetStateAction<PhotoCompositeFollowUpInfo | null>>;
  // Notifications
  unreadCount: number;
  notificationsModalOpen: boolean;
  setNotificationsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  notificationsList: NotificationItem[];
  // Credits
  myCreditsBalance: string | null;
  formattedCredits: string | null;
  creditsBadgeColor: string;
  creditsTooltip: string;
  creditsModalOpen: boolean;
  setCreditsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface NotificationItem {
  id: string;
  title?: string;
  message: string;
  is_read: boolean;
  read?: boolean;
  action_url?: string | null;
  created_at: string;
}

export type LanguageCode = 'EN' | 'NL' | 'DE' | 'IT' | 'FR';
