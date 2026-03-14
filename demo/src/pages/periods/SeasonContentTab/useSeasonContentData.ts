/**
 * useSeasonContentData - Data hook for SeasonContentTab
 */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { useVideoJobs, type VideoJob } from '@/hooks/useVideoJobs';
import { contentApi } from '@/api';
import { CONTENT_TYPES, type ContentTemplate } from '../../identity/ContentGenerationModal';
import type { ThenVsNowVideoType } from '../ThenVsNowModal';
import type { SeasonContentTabProps, SquadMember, ThenVsNowEligibleMember } from './types';

export function useSeasonContentData({
  org,
  projectId,
  seasonId,
  apiBaseUrl,
  members,
  pushToast,
}: SeasonContentTabProps) {
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
      const params: Record<string, string> = { is_active: 'true' };
      if (org?.id) params.organisation = String(org.id);

      const data = await contentApi.listTemplates(params as Record<string, string>) as Record<string, any>;
      const rawResults = data?.results || data?.data?.results || data?.data || data || [];
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
    } catch (err) {
      logger.error('Error fetching templates', err);
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
  const thenVsNowEligibleMembers = useMemo<ThenVsNowEligibleMember[]>(() => {
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

  const getStableVideoUrl = useCallback((job: VideoJob): string | null => {
    if (!job.output_url) return null;
    const cached = stableVideoUrlsRef.current.get(job.id);
    if (cached) return cached;
    stableVideoUrlsRef.current.set(job.id, job.output_url);
    return job.output_url;
  }, []);

  return {
    // Templates
    availableTemplates,
    templatesLoading,

    // Content modal
    isContentModalOpen,
    selectedTemplate,
    selectedContentTypeLabel,
    openContentModal,
    closeContentModal,
    handleContentGenerated,

    // Video preview
    previewVideoUrl,
    setPreviewVideoUrl,
    previewVideoLabel,
    setPreviewVideoLabel,
    getStableVideoUrl,

    // Then vs Now
    thenVsNowModalOpen,
    setThenVsNowModalOpen,
    thenVsNowModalType,
    openThenVsNowModal,
    thenVsNowEligibleMembers,
    thenVsNowCounts,

    // Video jobs
    completedVideoJobs,
    contentVideoLoading,

    // Constants
    CONTENT_TYPES,
  };
}
