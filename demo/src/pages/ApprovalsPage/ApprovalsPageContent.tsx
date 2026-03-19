/**
 * ApprovalsPageContent - Main content area of the approvals page
 */
import React from 'react';
import { PullToRefresh } from '@django-core/design-system';
import MobileTabBar from '../../components/MobileTabBar';
import { ApprovalsJobList } from '../ApprovalsJobList';
import { ApprovalsContentTypeChips } from './ApprovalsContentTypeChips';
import { ApprovalsWorkflowList } from './ApprovalsWorkflowList';
import type { FilterState, ContentTypeFilter } from '../approvalsTypes';
import type { GenerationJob } from '../../hooks/useGenerationJobs';
import type { VideoJob } from '../../hooks/useVideoJobs';
import type { TransitionHistoryEntry, WorkflowInstance } from '../../hooks/useWorkflows';
import s from '../ApprovalsPage.module.css';

interface ApprovalsPageContentProps {
  filter: FilterState;
  isAdmin: boolean;
  isPlayer: boolean;
  isSupporter: boolean;
  contentType: ContentTypeFilter;
  onContentTypeChange: (type: ContentTypeFilter) => void;
  contentTypeCounts: Record<string, number>;
  loading: boolean;
  aiLoading: boolean;
  videoLoading: boolean;
  error: string | null;
  aiError: string | null;
  videoError: string | null;
  actionError: string | null;
  visibleAiJobs: GenerationJob[];
  visibleVideoJobs: VideoJob[];
  filteredInstances: WorkflowInstance[];
  onRefresh: () => void;
  onOpenModal: (job: GenerationJob) => void;
  onOpenVideoModal: (job: VideoJob) => void;
  onCancelVideoJob: (id: string) => Promise<VideoJob | void>;
  onRetryVideoJob: (id: string) => Promise<VideoJob | void>;
  onSwipeApproveAi: (taskId: string) => void;
  onSwipeRejectAi: (taskId: string) => void;
  onSwipeApproveVideo: (jobId: string) => void;
  onSwipeRejectVideo: (jobId: string) => void;
  onTransitionComplete: (entry: TransitionHistoryEntry) => void;
  onActionError: (error: string) => void;
}

export function ApprovalsPageContent({
  filter,
  isAdmin,
  isPlayer,
  isSupporter,
  contentType,
  onContentTypeChange,
  contentTypeCounts,
  loading,
  aiLoading,
  videoLoading,
  error,
  aiError,
  videoError,
  actionError,
  visibleAiJobs,
  visibleVideoJobs,
  filteredInstances,
  onRefresh,
  onOpenModal,
  onOpenVideoModal,
  onCancelVideoJob,
  onRetryVideoJob,
  onSwipeApproveAi,
  onSwipeRejectAi,
  onSwipeApproveVideo,
  onSwipeRejectVideo,
  onTransitionComplete,
  onActionError,
}: ApprovalsPageContentProps) {
  const allowedTabs = isAdmin
    ? ['all', 'review', 'active', 'completed', 'rejected', 'ai_queue', 'video'] as const
    : ['all', 'review', 'completed', 'rejected'] as const;

  const tabs = [
    { id: 'all', label: 'Alle' },
    { id: 'review', label: 'Te beoordelen' },
    ...(!isPlayer && !isSupporter ? [{ id: 'active', label: 'In behandeling' }] : []),
    { id: 'completed', label: 'Goedgekeurd' },
    { id: 'rejected', label: 'Afgewezen' },
    ...(!isPlayer && !isSupporter ? [{ id: 'ai_queue', label: 'AI Queue' }] : []),
    ...(!isPlayer && !isSupporter ? [{ id: 'video', label: 'Video' }] : []),
  ];

  return (
    <PullToRefresh
      onRefresh={async () => onRefresh()}
      pullText="Trek om te vernieuwen"
      releaseText="Laat los om te vernieuwen"
      refreshingText="Vernieuwen..."
    >
      <MobileTabBar
        tabs={tabs}
        activeTab={filter}
        basePath="/approvals"
      />

      <div className={s.tabContent}>
        {(error || actionError || aiError || videoError) && (
          <div className={s.errorBanner}>{actionError || error || aiError || videoError}</div>
        )}

        {(loading || aiLoading || videoLoading) && (
          <div className={s.skeleton}>
            <div className={s.skeletonCard} />
            <div className={s.skeletonCard} />
            <div className={s.skeletonCard} />
            <div className={s.skeletonCard} />
          </div>
        )}

        {!loading && !aiLoading && !videoLoading && filteredInstances.length === 0 && visibleAiJobs.length === 0 && visibleVideoJobs.length === 0 && (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}></div>
            <div className={s.emptyTitle}>Geen items</div>
            <div className="fs-12">Er zijn geen items voor dit filter.</div>
          </div>
        )}

        {!aiLoading && !videoLoading && (visibleAiJobs.length > 0 || visibleVideoJobs.length > 0) && (
          <ApprovalsContentTypeChips
            contentType={contentType}
            onContentTypeChange={onContentTypeChange}
            contentTypeCounts={contentTypeCounts}
          />
        )}

        {!aiLoading && !videoLoading && (
          <ApprovalsJobList
            visibleAiJobs={visibleAiJobs}
            visibleVideoJobs={visibleVideoJobs}
            contentType={contentType}
            openModal={onOpenModal}
            openVideoModal={onOpenVideoModal}
            cancelVideoJob={onCancelVideoJob}
            retryVideoJob={onRetryVideoJob}
            hasWorkflowInstances={filteredInstances.length > 0}
            onSwipeApproveAi={onSwipeApproveAi}
            onSwipeRejectAi={onSwipeRejectAi}
            onSwipeApproveVideo={onSwipeApproveVideo}
            onSwipeRejectVideo={onSwipeRejectVideo}
          />
        )}

        {filter !== 'ai_queue' && filter !== 'video' && !loading && filteredInstances.length > 0 && (
          <ApprovalsWorkflowList
            instances={filteredInstances}
            onTransitionComplete={onTransitionComplete}
            onError={onActionError}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
