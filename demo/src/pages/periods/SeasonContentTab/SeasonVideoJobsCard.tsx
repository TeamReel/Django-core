/**
 * SeasonVideoJobsCard - Grid of completed video jobs
 */
import React from 'react';
import { Card } from '@django-core/design-system';
import { getJobTypeDisplay, type VideoJob } from '../../../hooks/useVideoJobs';
import s from '../ProjectSeasonDetailPage.module.css';

interface SeasonVideoJobsCardProps {
  completedVideoJobs: VideoJob[];
  contentVideoLoading: boolean;
  getStableVideoUrl: (job: VideoJob) => string | null;
  onPreviewVideo: (url: string, label: string) => void;
}

export function SeasonVideoJobsCard({
  completedVideoJobs,
  contentVideoLoading,
  getStableVideoUrl,
  onPreviewVideo,
}: SeasonVideoJobsCardProps) {
  return (
    <Card title={`Generated Content${completedVideoJobs.length ? ` (${completedVideoJobs.length})` : ''}`}>
      {contentVideoLoading && completedVideoJobs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-sm">Loading video jobs…</div>
        </div>
      )}
      {!contentVideoLoading && completedVideoJobs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">{"\uD83D\uDCED"}</div>
          <p>No content generated yet</p>
          <p className="text-sm">Generated videos will appear here</p>
        </div>
      )}
      {completedVideoJobs.length > 0 && (
        <div className={s.videoGrid}>
          {completedVideoJobs.map(job => {
            const typeDisplay = getJobTypeDisplay(job.job_type);
            const videoType = job.config?.video_type;
            const compStyle = job.config?.composition_style;
            const tileLabel = (() => {
              if (videoType === 'transformation') return { icon: '\uD83D\uDD04', label: 'Transformation' };
              if (videoType === 'walking_composite') return { icon: '\uD83D\uDEB6', label: 'Walking Composite' };
              if (videoType === 'duo_portret' || videoType === 'photo_composite') {
                if (compStyle === 'cover') return { icon: '\uD83D\uDC65', label: 'Duo Portret Cover' };
                if (compStyle === 'overlay') return { icon: '\uD83D\uDC65', label: 'Duo Portret Overlay' };
                return { icon: '\uD83D\uDC65', label: 'Duo Portret' };
              }
              if (videoType === 'sidebyside') {
                if (compStyle === 'cover') return { icon: '\u23EA', label: 'Then vs Now Cover' };
                if (compStyle === 'overlay') return { icon: '\u23EA', label: 'Then vs Now Overlay' };
                return { icon: '\u23EA', label: 'Then & Now' };
              }
              return typeDisplay;
            })();
            const ago = (() => {
              const diff = Date.now() - new Date(job.completed_at || job.created_at).getTime();
              const mins = Math.floor(diff / 60000);
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              return `${Math.floor(hrs / 24)}d ago`;
            })();
            const fileSize = (() => {
              const bytes = (job.output_file as any)?.file_size;
              if (!bytes) return null;
              if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
              return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            })();
            const stableUrl = getStableVideoUrl(job);

            return (
              <div
                key={job.id}
                onClick={() => {
                  if (stableUrl) {
                    onPreviewVideo(stableUrl, `${tileLabel.icon} ${tileLabel.label}`);
                  }
                }}
                className={s.videoCard}
                style={{
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-card-bg, var(--app-surface))',
                  cursor: stableUrl ? 'pointer' : 'default',
                  transition: 'box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => { if (stableUrl) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                {stableUrl && (
                  <div className={s.videoThumbnail} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <video
                      src={stableUrl}
                      preload="metadata"
                      {...(job.thumbnail_url ? { poster: job.thumbnail_url } : {})}
                      muted
                      playsInline
                      className={s.videoFill}
                    />
                  </div>
                )}
                <div className={s.videoCardMeta}>
                  <div className={s.videoCardHeader}>
                    <span className={s.videoCardTitle}>
                      {tileLabel.icon} {tileLabel.label}
                    </span>
                    <span className={s.statusPillComplete}>
                      \u2705 Completed
                    </span>
                  </div>
                  <div className={s.videoCardInfo}>
                    <span>{ago}</span>
                    {fileSize && <span>{fileSize}</span>}
                    <span className={s.monoId}>{job.id.slice(0, 8)}</span>
                  </div>
                  {stableUrl && (
                    <a
                      href={stableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={s.downloadLink}
                    >
                      \u2B07 Download
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
