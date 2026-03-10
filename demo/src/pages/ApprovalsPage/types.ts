/**
 * ApprovalsPage types - Extended from approvalsTypes.ts
 */

export interface ApprovalsPageHeaderProps {
  title: string;
  subtitle: string;
  needsReviewCount: number;
  showBeginReview: boolean;
  onBeginReview: () => void;
  onRefresh: () => void;
}

export interface ApprovalsToast {
  id: string;
  message: string;
  type: 'success' | 'error';
}
