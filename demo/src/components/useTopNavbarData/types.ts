/**
 * Types for useTopNavbarData hook
 */
import type React from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';
import type { User } from '@django-core/auth-ui';
import type { QueueCounts } from '../../hooks/useQueueCounts';
import type { GenerationJob } from '../../hooks/useGenerationJobs';
import type { PhotoCompositeFollowUpInfo } from '../topNavbarHelpers';
import type { LucideIcon } from 'lucide-react';

/** Dashboard nav item type */
export interface DashboardNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

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
  // Dashboard item
  dashboardItem: DashboardNavItem;
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
  hasFailedJobs: boolean;
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
