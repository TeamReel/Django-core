import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Badge, Card } from '@django-core/design-system';
import {
  useVideoJobs,
  getJobTypeDisplay,
  type VideoJob,
} from '../../hooks/useVideoJobs';
import ContentGenerationModal, { CONTENT_TYPES, type ContentTemplate } from '../identity/ContentGenerationModal';
import VideoPreviewModal from './VideoPreviewModal';
import ThenVsNowModal, { type ThenVsNowVideoType } from './ThenVsNowModal';
import type { SeasonOrganisation as Organisation } from '../../types/season';
import s from './ProjectSeasonDetailPage.module.css';

/** Squad member record with metadata and media assets */
interface SquadMember {
  id?: string;
  user?: { id?: string; first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  user_id?: string;
  shirt_number?: string | number;
  position?: string;
  metadata?: { teamreel_assets?: Record<string, any>; shirt_number?: string | number; position?: string; [key: string]: unknown };
  [key: string]: any;
}

export interface SeasonContentTabProps {
  org: Organisation | null;
  projectId: string;
  seasonId: string;
  apiBaseUrl: string;
  members: SquadMember[];
  pushToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

const SeasonContentTab: React.FC<SeasonContentTabProps> = ({
  org,
  projectId,
  seasonId,
  apiBaseUrl,
  members,
  pushToast,
}) => {
  // ── Internalized content state ──
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoLabel, setPreviewVideoLabel] = useState('');
  const stableVideoUrlsRef = useRef<Map<string, string>>(new Map());

  // Then vs Now modal state
  const [thenVsNowModalOpen, setThenVsNowModalOpen] = useState(false);
  const [thenVsNowModalType, setThenVsNowModalType] = useState<ThenVsNowVideoType>('duo_portret_cover');

  // ── Video jobs hook ──
  const {
    jobs: contentVideoJobs,
    loading: contentVideoLoading,
  } = useVideoJobs({
    projectId: projectId || null,
    jobType: 'then_vs_now',
    autoRefresh: true,
    refreshInterval: 15_000,
  });

  const completedVideoJobs = useMemo<VideoJob[]>(() =>
    contentVideoJobs.filter(j => j.status === 'completed' && j.output_url),
  [contentVideoJobs]);

  // ── Fetch templates ──
  const fetchAvailableTemplates = useCallback(async () => {
    if (!org?.sport?.id) return;
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      if (org?.id) params.append('organisation', String(org.id));

      const response = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const rawResults = data?.data?.results || data?.results || data?.data || data || [];
        const allTemplates: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];

        const sportId = org.sport.id;
        const matchingTemplates = allTemplates.filter(t => {
          if (!t.sport) return true;
          if (t.sport === sportId) return true;
          if (t.sport_detail?.id === sportId) return true;
          return false;
        });

        const grouped: Record<string, ContentTemplate[]> = {};
        matchingTemplates.forEach(t => {
          const subtype = t.template_subtype || t.template_type;
          if (!grouped[subtype]) grouped[subtype] = [];
          grouped[subtype].push(t);
        });
        setAvailableTemplates(grouped);
      }
    } catch (err) {
      console.error(err);
      console.error('Error fetching templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [org?.sport?.id, org?.id, apiBaseUrl]);

  useEffect(() => {
    if (org?.sport?.id) fetchAvailableTemplates();
  }, [org?.sport?.id, fetchAvailableTemplates]);

  // ── Content modal helpers ──
  const openContentModal = (template: ContentTemplate, typeLabel: string) => {
    setSelectedTemplate(template);
    setSelectedContentTypeLabel(typeLabel);
    setIsContentModalOpen(true);
  };

  const closeContentModal = () => {
    setIsContentModalOpen(false);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
  };

  const handleContentGenerated = useCallback((_message?: string) => {
    // Toast is now handled globally by useContentGeneration
  }, []);

  const openThenVsNowModal = (videoType: ThenVsNowVideoType) => {
    setThenVsNowModalType(videoType);
    setThenVsNowModalOpen(true);
  };

  // ── Then vs Now eligible members ──
  const thenVsNowEligibleMembers = useMemo(() => {
    return (members || []).map((m) => {
      const videos = m?.metadata?.teamreel_assets?.videos || {};
      const thenVsNow = videos?.then_vs_now || {};

      const transformationKeys: string[] = [];
      for (const k of Object.keys(thenVsNow)) {
        if (!k.startsWith('transformation')) continue;
        const v = thenVsNow[k];
        if (v && (v.processed || v.raw)) transformationKeys.push(k);
      }
      const hasTransformation = transformationKeys.length > 0;

      const compositeVideo = videos?.photo_composite?.default;
      const hasDuoPortret = !!(
        compositeVideo && typeof compositeVideo === 'object'
        && compositeVideo.processing_state === 'processed' && compositeVideo.processed
      );
      const hasDuoPortretCover = !!(
        compositeVideo && typeof compositeVideo === 'object' && compositeVideo.raw
      );
      const hasDuoPortretOverlay = hasDuoPortret;

      const sideData = thenVsNow?.sidebyside;
      const hasSidebysideCover = !!(
        sideData && typeof sideData === 'object' && (sideData.raw || (typeof sideData === 'string'))
      );
      const hasSidebysideOverlay = !!(
        sideData && typeof sideData === 'object'
        && sideData.processing_state === 'processed' && sideData.processed
      );

      const walkingVideo = videos?.walking_composite?.default;
      const hasWalkingComposite = !!(
        walkingVideo && typeof walkingVideo === 'object'
        && walkingVideo.processing_state === 'processed' && walkingVideo.processed
      );

      return {
        id: String(m.id || ''),
        userId: String(m.user?.id || m.user_id || ''),
        name: m.user ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() || m.user.email || 'Unknown' : 'Unknown',
        shirtNumber: String(m.metadata?.shirt_number || m.shirt_number || '') || undefined,
        position: String(m.metadata?.position || m.position || '') || undefined,
        hasDuoPortret,
        hasDuoPortretCover,
        hasDuoPortretOverlay,
        hasSidebysideCover,
        hasSidebysideOverlay,
        hasTransformation,
        hasWalkingComposite,
        transformationKeys,
      };
    }).filter((m) => m.id);
  }, [members]);

  const thenVsNowCounts = useMemo(() => {
    let duo_portret = 0, duo_portret_cover = 0, duo_portret_overlay = 0;
    let sidebyside_cover = 0, sidebyside_overlay = 0, transformation = 0, walking_composite = 0;
    for (const m of thenVsNowEligibleMembers) {
      if (m.hasDuoPortret) duo_portret++;
      if (m.hasDuoPortretCover) duo_portret_cover++;
      if (m.hasDuoPortretOverlay) duo_portret_overlay++;
      if (m.hasSidebysideCover) sidebyside_cover++;
      if (m.hasSidebysideOverlay) sidebyside_overlay++;
      if (m.hasTransformation) transformation++;
      if (m.hasWalkingComposite) walking_composite++;
    }
    return { duo_portret, duo_portret_cover, duo_portret_overlay, sidebyside_cover, sidebyside_overlay, transformation, walking_composite };
  }, [thenVsNowEligibleMembers]);

  return (
    <div className={s.contentGrid}>
      {/* Sport info header */}
      {org?.sport && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Templates for: <Badge variant="info" size="sm">{'\u26BD'} {org.sport.name}</Badge>
          </div>
          {templatesLoading && (
            <div className="text-sm text-gray-400">Loading templates...</div>
          )}
        </div>
      )}

      {/* Season content types */}
      <Card title="Season Content">
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}>
          {CONTENT_TYPES.season?.items.map(item => {
            const templates = availableTemplates[item.subtype] || [];
            const matchedTemplate = templates[0];
            const hasTemplate = !!matchedTemplate;
            const isThenVsNow = item.subtype === 'transformation' || item.subtype === 'duo_portret' || item.subtype === 'duo_portret_cover' || item.subtype === 'duo_portret_overlay' || item.subtype === 'sidebyside_cover' || item.subtype === 'sidebyside_overlay' || item.subtype === 'walking_composite';

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isThenVsNow) {
                    openThenVsNowModal(item.subtype as ThenVsNowVideoType);
                  } else if (hasTemplate) {
                    openContentModal(matchedTemplate, item.label);
                  }
                }}
                title={isThenVsNow
                  ? `Create ${item.label}`
                  : hasTemplate
                  ? `Create ${item.label}${matchedTemplate?.style_variant ? ` (${matchedTemplate.style_variant})` : ''}`
                  : `No ${item.label} template available`
                }
                className={s.contentTile}
                style={{
                  border: (isThenVsNow || hasTemplate) ? '1px solid var(--app-border)' : '1px dashed var(--app-border)',
                  cursor: (isThenVsNow || hasTemplate) ? 'pointer' : 'not-allowed',
                  opacity: (isThenVsNow || hasTemplate) ? 1 : 0.5,
                  backgroundColor: (isThenVsNow || hasTemplate) ? 'var(--app-card-bg)' : 'var(--app-bg)',
                }}
                onMouseEnter={(e) => {
                  if (isThenVsNow || hasTemplate) {
                    e.currentTarget.style.borderColor = 'var(--app-primary)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--app-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className={s.contentTileIcon} style={{
                  filter: (isThenVsNow || hasTemplate) ? 'none' : 'grayscale(100%)',
                }}>
                  {item.icon}
                </div>
                <div className={s.contentTileLabel} style={{
                  color: (isThenVsNow || hasTemplate) ? 'var(--app-text)' : 'var(--app-muted-text)',
                }}>
                  {item.label}
                </div>
                {hasTemplate && matchedTemplate && (
                  <div className={s.contentTileMeta}>
                    {matchedTemplate.style_variant && (
                      <Badge variant="info" size="sm" className={s.badgeXs}>{matchedTemplate.style_variant}</Badge>
                    )}
                    {matchedTemplate.credits_required && matchedTemplate.credits_required > 0 && (
                      <span className={s.creditsText}>
                        {matchedTemplate.credits_required} cr
                      </span>
                    )}
                  </div>
                )}
                {!hasTemplate && (
                  <div className={s.noTemplate}>\u2014</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Generated Content — completed video jobs */}
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
              const stableUrl = (() => {
                if (!job.output_url) return null;
                const cached = stableVideoUrlsRef.current.get(job.id);
                if (cached) return cached;
                stableVideoUrlsRef.current.set(job.id, job.output_url);
                return job.output_url;
              })();
              return (
                <div
                  key={job.id}
                  onClick={() => {
                    if (stableUrl) {
                      setPreviewVideoUrl(stableUrl);
                      setPreviewVideoLabel(`${tileLabel.icon} ${tileLabel.label}`);
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

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <VideoPreviewModal
          videoUrl={previewVideoUrl}
          videoLabel={previewVideoLabel}
          onClose={() => { setPreviewVideoUrl(null); setPreviewVideoLabel(''); }}
        />
      )}

      {/* Content Generation Modal */}
      <ContentGenerationModal
        isOpen={isContentModalOpen}
        onClose={closeContentModal}
        onGenerated={handleContentGenerated}
        matchData={null}
        organisationSport={org?.sport || null}
        organisationId={org?.id || null}
        template={selectedTemplate}
        contentTypeLabel={selectedContentTypeLabel}
      />

      {/* Then vs Now compilation modal */}
      {thenVsNowModalOpen && (
        <ThenVsNowModal
          videoType={thenVsNowModalType}
          eligibleMembers={thenVsNowEligibleMembers}
          apiBaseUrl={apiBaseUrl}
          projectId={projectId}
          seasonId={seasonId}
          onClose={() => setThenVsNowModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SeasonContentTab;
