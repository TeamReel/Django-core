/**
 * QueuePage — Unified queue dashboard combining three data sources:
 * 1. Workflow instances (content approval state machines)
 * 2. AI generation jobs (image/video/text AI output)
 * 3. Video processing jobs (transcode, compose, lineup, thumbnail)
 *
 * Route: /approvals (also handles redirects from /studio/videos)
 * Sidebar: CONTENT section → "Queue"
 */
import React from 'react';
import { useApprovalsData } from './useApprovalsData';
import { ApprovalsPageHeader } from './ApprovalsPageHeader';
import { ApprovalsToastContainer } from './ApprovalsToastContainer';
import { ApprovalsPageContent } from './ApprovalsPageContent';
import { ApprovalsModals } from './ApprovalsModals';
import s from '../ApprovalsPage.module.css';

export default function ApprovalsPage() {
  const data = useApprovalsData();

  const showBeginReview = data.filter === 'ai_queue' || data.filter === 'review' || data.filter === 'all';

  return (
    <>
      <ApprovalsToastContainer toasts={data.toasts} />

      <ApprovalsModals
        resolvedModalJob={data.resolvedModalJob}
        needsReviewJobs={data.needsReviewJobs}
        onCloseReviewModal={() => data.setModalJob(null)}
        onReviewed={data.handleModalAction}
        modalVideoJob={data.modalVideoJob}
        onCloseVideoModal={() => data.setModalVideoJob(null)}
        onVideoActionComplete={() => { data.setModalVideoJob(null); data.refreshVideoJobs(); }}
        pushToast={data.pushToast}
        approveVideoJob={data.approveVideoJob}
        rejectVideoJob={data.rejectVideoJob}
        videoFollowUp={data.videoFollowUp}
        onCloseVideoFollowUp={() => data.setVideoFollowUp(null)}
        onVideoFollowUpSubmitted={(count) => {
          data.pushToast(`${count} video${count > 1 ? "'s" : ''} in de wachtrij gezet`, 'success');
          data.setVideoFollowUp(null);
          data.refreshAiJobs();
        }}
        photoCompositeFollowUp={data.photoCompositeFollowUp}
        onClosePhotoCompositeFollowUp={() => data.setPhotoCompositeFollowUp(null)}
        onPhotoCompositeFollowUpSubmitted={() => {
          data.pushToast('Video in de wachtrij gezet', 'success');
          data.setPhotoCompositeFollowUp(null);
          data.refreshAiJobs();
        }}
      />

      <div className={s.page}>
        <ApprovalsPageHeader
          title={data.tabTitles[data.filter].title}
          subtitle={data.tabTitles[data.filter].subtitle}
          needsReviewCount={data.needsReviewJobs.length}
          showBeginReview={showBeginReview}
          onBeginReview={() => data.openModal(data.needsReviewJobs[0])}
          onRefresh={data.refreshAll}
        />

        <ApprovalsPageContent
          filter={data.filter}
          isAdmin={data.isAdmin}
          isPlayer={data.isPlayer}
          isSupporter={data.isSupporter}
          contentType={data.contentType}
          onContentTypeChange={data.setContentType}
          contentTypeCounts={data.contentTypeCounts}
          loading={data.loading}
          aiLoading={data.aiLoading}
          videoLoading={data.videoLoading}
          error={data.error}
          aiError={data.aiError}
          videoError={data.videoError}
          actionError={data.actionError}
          visibleAiJobs={data.visibleAiJobs}
          visibleVideoJobs={data.visibleVideoJobs}
          filteredInstances={data.filtered}
          onRefresh={data.refreshAll}
          onOpenModal={data.openModal}
          onOpenVideoModal={data.setModalVideoJob}
          onCancelVideoJob={data.cancelVideoJob}
          onRetryVideoJob={data.retryVideoJob}
          onSwipeApproveAi={data.handleSwipeApproveAi}
          onSwipeRejectAi={data.handleSwipeRejectAi}
          onSwipeApproveVideo={data.handleSwipeApproveVideo}
          onSwipeRejectVideo={data.handleSwipeRejectVideo}
          onTransitionComplete={data.handleTransitionComplete}
          onActionError={data.setActionError}
        />
      </div>
    </>
  );
}
