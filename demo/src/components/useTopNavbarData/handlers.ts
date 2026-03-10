/**
 * Event handlers for useTopNavbarData hook
 */
import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react';
import type { GenerationJob } from '../../hooks/useGenerationJobs';
import type { QueueCounts } from '../../hooks/useQueueCounts';
import { reviewJob } from '../../hooks/useGenerationJobs';
import type { PhotoCompositeFollowUpInfo } from '../topNavbarHelpers';
import type { LanguageCode } from './types';

interface UseTopNavbarHandlersParams {
  isTouchDevice: boolean;
  closeTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  isDropdownHoveredRef: RefObject<boolean>;
  pendingReviewJobs: GenerationJob[];
  quickReviewIdx: number;
  quickReviewBusy: boolean;
  selectedVariantIdxs: Set<number>;
  queueCounts: QueueCounts;
  mode: string;
  setTheme: (config: Record<string, unknown>) => void;
  setOpenDropdown: Dispatch<SetStateAction<string | null>>;
  setLanguage: (lang: LanguageCode) => void;
  setLanguageMenuOpen: (open: boolean) => void;
  setQueueModalTab: (tab: 'review' | 'in-progress') => void;
  setQuickReviewIdx: (idx: number) => void;
  setSelectedVariantIdxs: (idxs: Set<number>) => void;
  setQuickReviewOpen: (open: boolean) => void;
  setQuickReviewBusy: (busy: boolean) => void;
  setPhotoCompositeFollowUp: (info: PhotoCompositeFollowUpInfo | null) => void;
  refreshAiJobs: () => Promise<void>;
}

export function useTopNavbarHandlers(params: UseTopNavbarHandlersParams) {
  const {
    isTouchDevice, closeTimerRef, isDropdownHoveredRef,
    pendingReviewJobs, quickReviewIdx, quickReviewBusy, selectedVariantIdxs,
    queueCounts, mode, setTheme, setOpenDropdown, setLanguage,
    setLanguageMenuOpen, setQueueModalTab, setQuickReviewIdx,
    setSelectedVariantIdxs, setQuickReviewOpen, setQuickReviewBusy,
    setPhotoCompositeFollowUp, refreshAiJobs,
  } = params;

  const handleMouseEnterTrigger = useCallback((groupId: string) => {
    if (isTouchDevice) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); (closeTimerRef as any).current = null; }
    setOpenDropdown(groupId);
  }, [isTouchDevice, closeTimerRef, setOpenDropdown]);

  const handleMouseLeaveTrigger = useCallback((_groupId: string) => {
    if (isTouchDevice) return;
    if (isDropdownHoveredRef.current) return;
    (closeTimerRef as any).current = setTimeout(() => { setOpenDropdown(null); }, 300);
  }, [isTouchDevice, closeTimerRef, isDropdownHoveredRef, setOpenDropdown]);

  const handleMouseEnterDropdown = useCallback((_groupId: string) => {
    if (isTouchDevice) return;
    (isDropdownHoveredRef as any).current = true;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); (closeTimerRef as any).current = null; }
  }, [isTouchDevice, closeTimerRef, isDropdownHoveredRef]);

  const handleMouseLeaveDropdown = useCallback((_groupId: string) => {
    if (isTouchDevice) return;
    (isDropdownHoveredRef as any).current = false;
    (closeTimerRef as any).current = setTimeout(() => { setOpenDropdown(null); }, 200);
  }, [isTouchDevice, closeTimerRef, isDropdownHoveredRef, setOpenDropdown]);

  const handleClickTrigger = useCallback((groupId: string, e: React.MouseEvent) => {
    if (!isTouchDevice) return;
    e.preventDefault();
    setOpenDropdown((prev: string | null) => prev === groupId ? null : groupId);
  }, [isTouchDevice, setOpenDropdown]);

  const handleKeyDown = useCallback((groupId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpenDropdown((prev: string | null) => prev === groupId ? null : groupId);
    } else if (e.key === 'Escape') {
      setOpenDropdown(null);
    }
  }, [setOpenDropdown]);

  const handleLanguageChange = useCallback((lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem('demo_language', lang);
    setLanguageMenuOpen(false);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }, [setLanguage, setLanguageMenuOpen]);

  const toggleTheme = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setTheme({ mode: newMode });
  }, [mode, setTheme]);

  const openQuickReview = useCallback(() => {
    setQueueModalTab(queueCounts.review > 0 ? 'review' : 'in-progress');
    setQuickReviewIdx(0);
    setSelectedVariantIdxs(new Set());
    setQuickReviewOpen(true);
  }, [queueCounts.review, setQueueModalTab, setQuickReviewIdx, setSelectedVariantIdxs, setQuickReviewOpen]);

  const handleQuickReview = useCallback(async (action: 'approve' | 'reject') => {
    const job = pendingReviewJobs[quickReviewIdx];
    if (!job || quickReviewBusy) return;
    setQuickReviewBusy(true);
    try {
      const variantIndices = selectedVariantIdxs.size > 0 ? Array.from(selectedVariantIdxs) : undefined;
      const result = await reviewJob(job.task_id, action, variantIndices);
      setSelectedVariantIdxs(new Set());
      refreshAiJobs();
      if (quickReviewIdx >= pendingReviewJobs.length - 1) {
        setQuickReviewIdx(Math.max(0, pendingReviewJobs.length - 2));
      }
      // After approving photo_composite_gemini, offer to generate video
      if (action === 'approve' && job.template_id === 'photo_composite_gemini' && job.membership_id) {
        const approvedVariants = result?.output_variants?.filter((v) => v.approved === true) || [];
        const imageUrl = approvedVariants[0]?.presigned_url || job.output_url;
        if (imageUrl) {
          setQuickReviewOpen(false);
          setPhotoCompositeFollowUp({
            membershipId: job.membership_id,
            projectId: job.project_id || '',
            approvedImageUrl: imageUrl,
            memberName: job.membership_name || job.label || 'Speler',
          });
        }
      }
    } catch (e) {
      console.error('Quick review failed:', e);
    } finally {
      setQuickReviewBusy(false);
    }
  }, [pendingReviewJobs, quickReviewIdx, quickReviewBusy, selectedVariantIdxs, refreshAiJobs, setQuickReviewBusy, setSelectedVariantIdxs, setQuickReviewIdx, setQuickReviewOpen, setPhotoCompositeFollowUp]);

  return {
    handleMouseEnterTrigger,
    handleMouseLeaveTrigger,
    handleMouseEnterDropdown,
    handleMouseLeaveDropdown,
    handleClickTrigger,
    handleKeyDown,
    handleLanguageChange,
    toggleTheme,
    openQuickReview,
    handleQuickReview,
  };
}
