/**
 * ApprovalsModals - All modal components for the approvals page
 */
import React from 'react';
import { VideoFollowUpModal, PhotoCompositeFollowUpModal } from '../FollowUpModals';
import { ReviewModal, VideoReviewModal } from '../ReviewModals';
import type { GenerationJob } from '../../hooks/useGenerationJobs';
import type { VideoJob } from '../../hooks/useVideoJobs';
import type { VideoFollowUpInfo, PhotoCompositeFollowUpInfo } from '../approvalsTypes';

interface ApprovalsModalsProps {
  // Review modal
  resolvedModalJob: GenerationJob | null;
  needsReviewJobs: GenerationJob[];
  onCloseReviewModal: () => void;
  onReviewed: (taskId: string, action: 'approve' | 'reject') => void;

  // Video review modal
  modalVideoJob: VideoJob | null;
  onCloseVideoModal: () => void;
  onVideoActionComplete: () => void;
  pushToast: (message: string, type: 'success' | 'error') => void;
  approveVideoJob: (id: string) => Promise<VideoJob | void>;
  rejectVideoJob: (id: string) => Promise<VideoJob | void>;

  // Follow-up modals
  videoFollowUp: VideoFollowUpInfo | null;
  onCloseVideoFollowUp: () => void;
  onVideoFollowUpSubmitted: (count: number) => void;

  photoCompositeFollowUp: PhotoCompositeFollowUpInfo | null;
  onClosePhotoCompositeFollowUp: () => void;
  onPhotoCompositeFollowUpSubmitted: () => void;
}

export function ApprovalsModals({
  resolvedModalJob,
  needsReviewJobs,
  onCloseReviewModal,
  onReviewed,
  modalVideoJob,
  onCloseVideoModal,
  onVideoActionComplete,
  pushToast,
  approveVideoJob,
  rejectVideoJob,
  videoFollowUp,
  onCloseVideoFollowUp,
  onVideoFollowUpSubmitted,
  photoCompositeFollowUp,
  onClosePhotoCompositeFollowUp,
  onPhotoCompositeFollowUpSubmitted,
}: ApprovalsModalsProps) {
  return (
    <>
      {resolvedModalJob && (
        <ReviewModal
          job={resolvedModalJob}
          reviewList={needsReviewJobs}
          onClose={onCloseReviewModal}
          onReviewed={onReviewed}
        />
      )}

      {modalVideoJob && (
        <VideoReviewModal
          job={modalVideoJob}
          onClose={onCloseVideoModal}
          onActionComplete={onVideoActionComplete}
          pushToast={pushToast}
          approveJob={async (id) => { await approveVideoJob(id); }}
          rejectJob={async (id) => { await rejectVideoJob(id); }}
        />
      )}

      {videoFollowUp && (
        <VideoFollowUpModal
          info={videoFollowUp}
          onClose={onCloseVideoFollowUp}
          onSubmitted={onVideoFollowUpSubmitted}
        />
      )}

      {photoCompositeFollowUp && (
        <PhotoCompositeFollowUpModal
          info={photoCompositeFollowUp}
          onClose={onClosePhotoCompositeFollowUp}
          onSubmitted={onPhotoCompositeFollowUpSubmitted}
        />
      )}
    </>
  );
}
