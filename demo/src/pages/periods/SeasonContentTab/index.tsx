/**
 * SeasonContentTab - Season content generation interface
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import ContentGenerationModal from '../../identity/ContentGenerationModal';
import VideoPreviewModal from '../VideoPreviewModal';
import ThenVsNowModal from '../ThenVsNowModal';
import { useSeasonContentData } from './useSeasonContentData';
import { SeasonContentTypesCard } from './SeasonContentTypesCard';
import { SeasonVideoJobsCard } from './SeasonVideoJobsCard';
import type { SeasonContentTabProps } from './types';
import s from '../ProjectSeasonDetailPage.module.css';

// Re-export types
export type { SeasonContentTabProps, SquadMember } from './types';

const SeasonContentTab: React.FC<SeasonContentTabProps> = (props) => {
  const { org, projectId, seasonId, apiBaseUrl } = props;
  const data = useSeasonContentData(props);

  return (
    <div className={s.contentGrid}>
      {/* Sport info header */}
      {org?.sport && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Templates for: <Badge variant="info" size="sm">{'\u26BD'} {org.sport.name}</Badge>
          </div>
          {data.templatesLoading && (
            <div className="text-sm text-gray-400">Loading templates...</div>
          )}
        </div>
      )}

      {/* Season content types */}
      <SeasonContentTypesCard
        availableTemplates={data.availableTemplates}
        onOpenContentModal={data.openContentModal}
        onOpenThenVsNowModal={data.openThenVsNowModal}
      />

      {/* Generated Content — completed video jobs */}
      <SeasonVideoJobsCard
        completedVideoJobs={data.completedVideoJobs}
        contentVideoLoading={data.contentVideoLoading}
        getStableVideoUrl={data.getStableVideoUrl}
        onPreviewVideo={(url, label) => {
          data.setPreviewVideoUrl(url);
          data.setPreviewVideoLabel(label);
        }}
      />

      {/* Video Preview Modal */}
      {data.previewVideoUrl && (
        <VideoPreviewModal
          videoUrl={data.previewVideoUrl}
          videoLabel={data.previewVideoLabel}
          onClose={() => { data.setPreviewVideoUrl(null); data.setPreviewVideoLabel(''); }}
        />
      )}

      {/* Content Generation Modal */}
      <ContentGenerationModal
        isOpen={data.isContentModalOpen}
        onClose={data.closeContentModal}
        onGenerated={data.handleContentGenerated}
        matchData={null}
        organisationSport={org?.sport || null}
        organisationId={org?.id || null}
        template={data.selectedTemplate}
        contentTypeLabel={data.selectedContentTypeLabel}
      />

      {/* Then vs Now compilation modal */}
      {data.thenVsNowModalOpen && (
        <ThenVsNowModal
          videoType={data.thenVsNowModalType}
          eligibleMembers={data.thenVsNowEligibleMembers}
          apiBaseUrl={apiBaseUrl}
          projectId={projectId}
          seasonId={seasonId}
          onClose={() => data.setThenVsNowModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SeasonContentTab;
