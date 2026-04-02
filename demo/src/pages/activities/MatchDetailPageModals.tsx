/**
 * MatchDetailPageModals — Modal orchestrator for MatchDetailPage.
 * Renders all modals + toasts in a dedicated component to keep the page lean.
 */
import React from 'react';
import MatchDetailModal from '../identity/MatchDetailModal';
import MatchEditModal from '../identity/MatchEditModal';
import ContentGenerationModal from '../identity/ContentGenerationModal';
import { ContentPreviewModal, SavedAssetPreviewModal, ToastNotifications } from './MatchDetailModals';
import type { MatchDetailDataReturn, MatchDetail } from './matchDetailTypes';

interface MatchDetailPageModalsProps {
  d: MatchDetailDataReturn;
  match: MatchDetail;
}

export function MatchDetailPageModals({ d, match }: MatchDetailPageModalsProps) {
  return (
    <>
      <MatchDetailModal
        opened={d.isMatchDetailModalOpen}
        onClose={() => d.setIsMatchDetailModalOpen(false)}
        match={match}
      />

      <MatchEditModal
        opened={d.isMatchEditModalOpen}
        onClose={() => d.setIsMatchEditModalOpen(false)}
        match={match}
        onSave={async (payload) => {
          await d.saveMatchEdits(match, payload);
        }}
      />

      <ContentGenerationModal
        isOpen={d.isContentModalOpen}
        onClose={d.closeContentModal}
        onGenerated={d.handleContentGenerated}
        matchData={match}
        season={d.season}
        organisationSport={d.org?.sport}
        organisationId={d.org?.id || d.orgSlugOrId}
        template={d.selectedTemplate}
        contentTypeLabel={d.selectedContentTypeLabel}
        homeLogoUrl={d.homeLogoUrl}
        awayLogoUrl={d.awayLogoUrl}
        homeTeamName={d.homeTeamName}
        awayTeamName={d.awayTeamName}
      />

      <ContentPreviewModal
        isOpen={d.isContentPreviewOpen}
        selectedContentItem={d.selectedContentItem}
        onClose={d.closeContentPreview}
      />

      <SavedAssetPreviewModal
        preview={d.savedAssetPreview}
        onClose={() => d.setSavedAssetPreview(null)}
      />

      <ToastNotifications toasts={d.toasts} onDismiss={d.dismissToast} />
    </>
  );
}
