import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@django-core/design-system';
import { getApiBaseUrl } from '../../../utils/apiBase';

// Step components
import TypeStep from './TypeStep';
import { TemplateStep } from './TemplateStep';
import { MembersStep } from './MembersStep';
import { LineupSquadStep } from './LineupSquadStep';
import { ConfirmStep } from './ConfirmStep';
import { GeneratingStep } from './GeneratingStep';
import { VideoQueuedStep } from './VideoQueuedStep';
import { SuccessStep } from './SuccessStep';
import ErrorStep from './ErrorStep';

// Types, constants, utils
import type {
  ContentTemplate,
  GeneratedVariant,
  GeneratedOutput,
  Participation,
  ContentGenerationModalProps,
  StepType,
} from './types';
import { CONTENT_TYPES, ASSET_TYPE_TO_MEDIA_KEY } from './constants';
import { getCsrfToken, getSecureMimeType, groupParticipationsByRole } from './utils';

// Re-exports for backwards compatibility
export type { ContentTemplate, FormationPosition } from './types';
export { CONTENT_TYPES, FORMATION_LAYOUTS } from './constants';
export { groupParticipationsByRole } from './utils';

export default function ContentGenerationModal({
  isOpen,
  onClose,
  matchData,
  season,
  organisationSport,
  organisationId,
  template: initialTemplate,
  contentTypeLabel,
  assetType,
  onGenerated,
  homeLogoUrl,
  awayLogoUrl,
  homeTeamName: homeTeamNameProp,
  awayTeamName: awayTeamNameProp,
}: ContentGenerationModalProps) {
  // Resolve team names: prefer explicit props (club names), fallback to project names
  const homeTeamName = homeTeamNameProp || matchData?.project?.name || 'Thuis';
  const awayTeamName = awayTeamNameProp || matchData?.opponent_project?.name || 'Uit';

  // ─── State ──────────────────────────────────────────────
  const [step, setStep] = useState<StepType>('type');
  const [selectedType, setSelectedType] = useState<{ type: string; subtype: string; label: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [progress, setProgress] = useState(0);
  const [generationStartedAtMs, setGenerationStartedAtMs] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multiple variants support
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [savingAsset, setSavingAsset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedVariantIndices, setSavedVariantIndices] = useState<Set<number>>(new Set());

  // Lineup flyer options
  const [lineupFormation, setLineupFormation] = useState<string>(matchData?.metadata?.formation || '4-3-3');
  const [lineupCloseupStyle, setLineupCloseupStyle] = useState<'popout' | 'badge'>('popout');
  const [lineupAnimationStyle, setLineupAnimationStyle] = useState<'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade'>('slide_up');
  const [lineupIntroStyle, setLineupIntroStyle] = useState<'per_line' | 'per_player'>('per_line');
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<string | null>(null);
  const [appBackgrounds, setAppBackgrounds] = useState<Array<{ id: string; url: string; label?: string; profile_name?: string }>>([]);

  // Match flyer options
  const [matchFlyerVariant, setMatchFlyerVariant] = useState<'modern' | 'action' | 'stadium'>('modern');
  const [flyerMemberId, setFlyerMemberId] = useState<string | null>(null);
  const [flyerActionStyle, setFlyerActionStyle] = useState<string>('dribbling');
  const [flyerPhotoLayout, setFlyerPhotoLayout] = useState<'single' | 'triple' | 'hero_duo'>('single');
  const [flyerPhotoSlots, setFlyerPhotoSlots] = useState<Array<{ member_id: string | null; style_variant: string }>>([
    { member_id: null, style_variant: 'dribbling' },
    { member_id: null, style_variant: 'dribbling' },
    { member_id: null, style_variant: 'dribbling' },
  ]);

  // Goal celebration options
  const [goalScoreHome, setGoalScoreHome] = useState<number>(0);
  const [goalScoreAway, setGoalScoreAway] = useState<number>(0);
  const [goalScorerId, setGoalScorerId] = useState<string | null>(null);

  // Match summary options
  const [summaryScoreHome, setSummaryScoreHome] = useState<number>(0);
  const [summaryScoreAway, setSummaryScoreAway] = useState<number>(0);
  const [summaryGoalScorers, setSummaryGoalScorers] = useState<string>('');

  // Selected members per role
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string[]>>({
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  });

  // Season squad members grouped by functional role
  const [seasonSquad, setSeasonSquad] = useState<Record<string, Participation[]>>({
    goalkeeper: [],
    player: [],
    coach: [],
    assistant: [],
  });

  // Video job polling
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoJobStatus, setVideoJobStatus] = useState<string | null>(null);
  const [videoJobProgressRaw, setVideoJobProgressRaw] = useState<number>(0);
  const [videoJobMeta, setVideoJobMeta] = useState<Record<string, unknown>>({});
  const [videoOutputUrl, setVideoOutputUrl] = useState<string | null>(null);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string | null>(null);

  // In-modal video approval
  const [videoApprovalStatus, setVideoApprovalStatus] = useState<'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected'>('idle');
  const [videoApprovalError, setVideoApprovalError] = useState<string | null>(null);

  // Abortable polling controller
  const activeVideoJobPollRef = useRef<AbortController | null>(null);

  const abortActiveVideoJobPoll = () => {
    const ctrl = activeVideoJobPollRef.current;
    if (ctrl) {
      ctrl.abort();
      activeVideoJobPollRef.current = null;
    }
  };

  // ─── Derived values ─────────────────────────────────────
  const isLineupFlow =
    selectedType?.subtype === 'lineup' ||
    selectedType?.subtype === 'lineup_flyer' ||
    selectedType?.subtype === 'poster' ||
    selectedTemplate?.template_subtype === 'lineup' ||
    selectedTemplate?.template_subtype === 'lineup_flyer' ||
    selectedTemplate?.template_subtype === 'poster' ||
    initialTemplate?.template_subtype === 'lineup' ||
    initialTemplate?.template_subtype === 'lineup_flyer' ||
    initialTemplate?.template_subtype === 'poster';

  const memberSelectionValid = useMemo(() => {
    if (!selectedTemplate?.input_requirements?.members) return true;
    const reqs = selectedTemplate.input_requirements.members;

    for (const role of ['goalkeeper', 'player', 'coach', 'assistant'] as const) {
      const req = reqs[role];
      if (req && typeof req !== 'boolean' && req.count > 0) {
        const filledCount = selectedMembers[role].filter(Boolean).length;
        if (filledCount !== req.count) return false;
      }
    }
    return true;
  }, [selectedTemplate, selectedMembers]);

  // ─── Effects ────────────────────────────────────────────

  // Fetch season squad on mount
  useEffect(() => {
    if (!isOpen) return;

    const projectId = matchData?.project?.id || season?.project_id;
    if (!projectId) return;

    const fetchSeasonSquad = async () => {
      try {
        const url = `${getApiBaseUrl()}/api/v1/projects/${projectId}/members/?page_size=100`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          let members: any[] = [];
          if (data?.data?.data && Array.isArray(data.data.data)) {
            members = data.data.data;
          } else if (data?.data?.results && Array.isArray(data.data.results)) {
            members = data.data.results;
          } else if (data?.results && Array.isArray(data.results)) {
            members = data.results;
          } else if (Array.isArray(data?.data)) {
            members = data.data;
          } else if (Array.isArray(data)) {
            members = data;
          }

          // Handle pagination
          let nextUrl = data?.meta?.pagination?.next;
          while (nextUrl) {
            const nextResp = await fetch(nextUrl, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (!nextResp.ok) break;
            const nextData = await nextResp.json();
            let nextMembers: any[] = [];
            if (nextData?.data?.data && Array.isArray(nextData.data.data)) {
              nextMembers = nextData.data.data;
            } else if (Array.isArray(nextData?.data)) {
              nextMembers = nextData.data;
            } else if (Array.isArray(nextData)) {
              nextMembers = nextData;
            }
            members = [...members, ...nextMembers];
            nextUrl = nextData?.meta?.pagination?.next;
          }

          const grouped = groupParticipationsByRole(members);
          setSeasonSquad(grouped);
        }
      } catch (err) {
        console.error('Error fetching season squad:', err);
      }
    };

    fetchSeasonSquad();
  }, [isOpen, matchData?.project?.id, season?.project_id, season?.id]);

  // Fetch app-level backgrounds
  useEffect(() => {
    if (!isOpen) return;

    const fetchBackgrounds = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/branding/assets/app-backgrounds/`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.data || data?.results || []);
          const bgs = items
            .filter((a: any) => a.url)
            .map((a: any) => ({
              id: a.id,
              url: a.url,
              label: a.label || '',
              profile_name: a.project_name || a.profile_name || '',
            }));
          setAppBackgrounds(bgs);
        }
      } catch (err) {
        console.warn('Failed to fetch app backgrounds:', err);
      }
    };

    fetchBackgrounds();
  }, [isOpen]);

  // Track initialization
  const hasInitializedRef = useRef(false);
  const lastOpenStateRef = useRef(false);

  // Reset state when opening
  useEffect(() => {
    const freshOpen = isOpen && !lastOpenStateRef.current;
    lastOpenStateRef.current = isOpen;

    if (isOpen) {
      // Always reset transient state
      setProgress(0);
      setGenerationStartedAtMs(null);
      setError(null);
      setGenerationError(null);
      setGeneratedOutput(null);
      setGeneratedVariants([]);
      setSelectedVariantIndex(0);
      setSavingAsset(false);
      setSaveSuccess(false);
      setSavedVariantIndices(new Set());
      setVideoJobId(null);
      setVideoJobStatus(null);
      setVideoJobProgressRaw(0);
      setVideoJobMeta({});
      setVideoOutputUrl(null);
      setVideoThumbnailUrl(null);
      setVideoApprovalStatus('idle');
      setVideoApprovalError(null);

      // Only reset selections on fresh open
      if (freshOpen && !hasInitializedRef.current) {
        hasInitializedRef.current = true;

        // Pre-load saved lineup from match metadata if available
        const savedLineup = matchData?.metadata?.lineup;
        if (savedLineup && (savedLineup.goalkeeper?.length || savedLineup.player?.length)) {
          setSelectedMembers({
            goalkeeper: savedLineup.goalkeeper || [],
            player: savedLineup.player || [],
            coach: [],
            assistant: [],
          });
          if (savedLineup.formation && savedLineup.formation !== lineupFormation) {
            setLineupFormation(savedLineup.formation);
          }
        } else {
          setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
        }
        setTemplates([]);

        // If template is provided, skip to appropriate step
        if (initialTemplate) {
          setSelectedTemplate(initialTemplate);
          setSelectedType({
            type: initialTemplate.template_type,
            subtype: initialTemplate.template_subtype || '',
            label: contentTypeLabel || initialTemplate.name,
          });

          if (initialTemplate.template_subtype === 'goal' || initialTemplate.template_subtype === 'match_intro') {
            setStep('confirm');
          } else if (initialTemplate.template_subtype === 'poster') {
            setStep('members');
          } else {
            const needsMembers = initialTemplate.input_requirements?.members &&
              Object.entries(initialTemplate.input_requirements.members).some(([key, val]) =>
                key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
              );
            setStep(needsMembers ? 'members' : 'confirm');
          }
        } else {
          setStep('type');
          setSelectedType(null);
          setSelectedTemplate(null);
        }
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [isOpen, initialTemplate, contentTypeLabel]);

  // Abort video poll on close
  useEffect(() => {
    if (!isOpen) abortActiveVideoJobPoll();
    return () => abortActiveVideoJobPoll();
  }, [isOpen]);

  // Poll video job status
  useEffect(() => {
    if (step !== 'video_queued' || !videoJobId || !isOpen) return;

    const controller = new AbortController();
    activeVideoJobPollRef.current = controller;

    let attempts = 0;
    const maxAttempts = 120;

    const poll = async () => {
      while (!controller.signal.aborted && attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch(
            `${getApiBaseUrl()}/api/v1/video/jobs/${videoJobId}/`,
            { credentials: 'include', signal: controller.signal }
          );
          if (!res.ok) break;
          const data = await res.json();
          const job = data?.data || data;

          setVideoJobStatus(job.status);
          setVideoJobProgressRaw(job.progress_percent || 0);

          if (job.status === 'completed') {
            const outUrl = job.output_url || job.output_file?.url;
            if (outUrl) setVideoOutputUrl(outUrl);
            if (job.thumbnail_url) setVideoThumbnailUrl(job.thumbnail_url);
            break;
          }
          if (job.status === 'failed') break;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
          console.warn('Poll error:', err);
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    };

    poll();
    return () => controller.abort();
  }, [step, videoJobId, isOpen]);

  // ─── Helpers ────────────────────────────────────────────

  const getMemberAssetUrl = (memberId: string, assetType: string, memberRole?: string): string | null => {
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant']) {
      const member = seasonSquad[role]?.find(p => p.id === memberId);
      if (member) {
        const mediaKey = ASSET_TYPE_TO_MEDIA_KEY[assetType] || assetType;
        const meta = member.metadata || {};
        const tr = (meta as any)?.teamreel_assets || {};
        const media = tr?.media || {};
        const videos = tr?.videos || {};
        const images = tr?.images || {};
        const legacyKit = tr?.kit || {};

        const effectiveRole = memberRole || role;
        let roleKey = 'home';
        if (effectiveRole === 'goalkeeper') roleKey = 'goalkeeper';
        else if (effectiveRole === 'coach' || effectiveRole === 'assistant') roleKey = 'coach';

        const imageStructureKey = mediaKey === 'kit' ? 'fullbody' : mediaKey;

        // 1. Check images structure
        if (images[imageStructureKey]?.[roleKey]?.url) {
          return images[imageStructureKey][roleKey].url;
        }
        if (roleKey !== 'home' && images[imageStructureKey]?.home?.url) {
          return images[imageStructureKey].home.url;
        }

        // 2. Check videos structure
        if (['intro', 'closeup', 'celebration'].includes(mediaKey) && videos[mediaKey]) {
          const variants = videos[mediaKey] || {};
          const roleVariantEntries = Object.entries(variants).filter(([k]) =>
            k.toLowerCase().includes(roleKey) || k.toLowerCase().startsWith(roleKey)
          );
          for (const [, val] of roleVariantEntries) {
            if (val && typeof val === 'object' && (val as any).processed) return (val as any).processed;
          }
          for (const [, val] of roleVariantEntries) {
            if (val && typeof val === 'object' && (val as any).raw) return (val as any).raw;
            if (val && typeof val === 'string' && val.trim()) return val;
          }
          for (const [, val] of Object.entries(variants)) {
            if (val && typeof val === 'object' && (val as any).processed) return (val as any).processed;
          }
          for (const [, val] of Object.entries(variants)) {
            if (val && typeof val === 'object' && (val as any).raw) return (val as any).raw;
            if (val && typeof val === 'string' && val.trim()) return val;
          }
        }

        // 3. Check media format
        if (media[mediaKey]?.url) return media[mediaKey].url;

        // 4. Legacy format
        if (mediaKey === 'profile' && legacyKit?.profile_photo_url) return legacyKit.profile_photo_url;
        if (mediaKey === 'kit' && legacyKit?.full_body_url) return legacyKit.full_body_url;
        if (mediaKey === 'celebration' && legacyKit?.goal_celebration_url) return legacyKit.goal_celebration_url;
      }
    }
    return null;
  };

  const getMemberNameById = (memberId: string): string => {
    for (const role of ['goalkeeper', 'player', 'coach', 'assistant']) {
      const member = seasonSquad[role]?.find(p => p.id === memberId);
      if (member) {
        const user = member.user || member.member;
        if (user) {
          if ('name' in user && user.name) return user.name;
          if ('user_name' in user && user.user_name) return user.user_name;
          const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          if (fullName) return fullName;
        }
      }
    }
    return 'Unknown';
  };

  // ─── Fetch templates ────────────────────────────────────

  const fetchTemplates = async (templateType: string, templateSubtype: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('is_active', 'true');
      params.append('template_type', templateType);
      params.append('template_subtype', templateSubtype);

      const contentTypeConfig = CONTENT_TYPES[templateType as keyof typeof CONTENT_TYPES];
      const sportRequired = contentTypeConfig?.sportRequired !== false;

      if (organisationSport?.id && sportRequired) {
        params.append('sport', String(organisationSport.id));
      }

      const response = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      let results = data.results || data || [];

      // Fallback: try without sport filter
      if (results.length === 0 && organisationSport?.id && sportRequired) {
        const paramsAll = new URLSearchParams();
        paramsAll.append('is_active', 'true');
        paramsAll.append('template_type', templateType);
        paramsAll.append('template_subtype', templateSubtype);

        const responseAll = await fetch(`${getApiBaseUrl()}/api/v1/content-generation/templates/?${paramsAll.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (responseAll.ok) {
          const dataAll = await responseAll.json();
          results = dataAll.results || dataAll || [];
        }
      }

      setTemplates(results);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // ─── Generation handlers ────────────────────────────────

  const handleGenerateLineupFlyer = async () => {
    setProgress(10);
    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) throw new Error('No project ID available');
      if (!matchData?.id) throw new Error('No match/activity data available for flyer generation');

      const targetGKs = selectedMembers.goalkeeper?.slice(0, 1) || [];
      const targetPlayers = selectedMembers.player?.slice(0, 10) || [];
      const formation = lineupFormation || matchData?.metadata?.formation || '4-3-3';

      setProgress(30);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/lineup-flyer/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          template_id: selectedTemplate?.id || null,
          formation,
          closeup_style: lineupCloseupStyle,
          selected_member_ids: { goalkeeper: targetGKs, player: targetPlayers },
          ...(selectedBackgroundUrl ? { background_url: selectedBackgroundUrl } : {}),
        }),
      });

      setProgress(70);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to generate lineup flyer: ${response.status}`);
      }

      const data = await response.json();
      const flyerUrl = data.data?.flyer_url || data.flyer_url;
      if (!flyerUrl) throw new Error('Flyer generated but no URL returned');

      setGeneratedVariants([{
        variant_index: 0,
        image_base64: null,
        presigned_url: flyerUrl,
        mime_type: 'image/png',
        filename: `lineup_flyer_${matchData.id}.png`,
        error: null,
        storage_info: null,
        metadata: { type: 'lineup_flyer', formation, activity_id: matchData.id },
      }]);

      setProgress(100);
      setTimeout(() => setStep('success'), 300);
    } catch (err) {
      console.error('[!] Lineup flyer generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Flyer generation failed');
      setStep('error');
    }
  };

  const handleGenerateTeamPoster = async () => {
    setProgress(10);
    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) throw new Error('No project ID available');
      if (!matchData?.id) throw new Error('No match/activity data available for poster generation');

      const targetGKs = selectedMembers.goalkeeper?.slice(0, 1) || [];
      const targetPlayers = selectedMembers.player?.slice(0, 10) || [];
      const formation = lineupFormation || matchData?.metadata?.formation || '4-3-3';

      setProgress(20);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/team-poster/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          template_id: selectedTemplate?.id || null,
          formation,
          selected_member_ids: { goalkeeper: targetGKs, player: targetPlayers },
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to generate team poster: ${response.status}`);
      }

      const data = await response.json();
      const posterUrl = data.poster_url || data.data?.poster_url;
      if (!posterUrl) throw new Error('Poster generated but no URL returned');

      setGeneratedVariants([{
        variant_index: 0,
        image_base64: null,
        presigned_url: posterUrl,
        mime_type: 'image/png',
        filename: `team_poster_${matchData.id}.png`,
        error: null,
        storage_info: null,
        metadata: { type: 'poster', formation, activity_id: matchData.id },
      }]);

      setProgress(100);
      setTimeout(() => setStep('success'), 300);
    } catch (err) {
      console.error('[!] Team poster generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Poster generation failed');
      setStep('error');
    }
  };

  const handleGenerateMatchFlyer = async () => {
    setProgress(10);
    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) throw new Error('No project ID available');
      if (!matchData?.id) throw new Error('No match/activity data available for flyer generation');

      setProgress(30);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/match-flyer/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          variant: matchFlyerVariant,
          ...(matchFlyerVariant === 'action' && flyerPhotoLayout !== 'single' ? {
            photo_slots: flyerPhotoSlots.filter(s => s.member_id).length > 0
              ? flyerPhotoSlots.map(s => ({
                  member_id: s.member_id,
                  style_variant: s.style_variant,
                }))
              : undefined,
          } : {}),
          ...(matchFlyerVariant === 'action' && flyerPhotoLayout === 'single' && flyerMemberId ? {
            member_id: flyerMemberId,
            style_variant: flyerActionStyle,
          } : {}),
          ...(matchFlyerVariant === 'action' && selectedBackgroundUrl ? {
            background_url: selectedBackgroundUrl,
          } : {}),
          ...(matchFlyerVariant === 'action' ? {
            photo_layout: flyerPhotoLayout,
          } : {}),
        }),
      });

      setProgress(70);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || errData?.error?.detail || (typeof errData?.error === 'string' ? errData.error : null) || errData?.detail || `Failed to generate match flyer: ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      const flyerUrl = data.data?.flyer_url || data.flyer_url;
      if (!flyerUrl) throw new Error('Flyer generated but no URL returned');

      setGeneratedVariants([{
        variant_index: 0,
        image_base64: null,
        presigned_url: flyerUrl,
        mime_type: 'image/png',
        filename: `match_flyer_${matchFlyerVariant}_${matchData.id}.png`,
        error: null,
        storage_info: null,
        metadata: { type: 'match_flyer', variant: matchFlyerVariant, activity_id: matchData.id },
      }]);

      setProgress(100);
      setTimeout(() => setStep('success'), 300);
    } catch (err) {
      console.error('[!] Match flyer generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Match flyer generation failed');
      setStep('error');
    }
  };

  const handleGenerateMatchSummary = async () => {
    setProgress(10);
    try {
      if (!matchData?.id) throw new Error('No match data available');
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) throw new Error('No project ID found');

      setProgress(30);

      const scorers = summaryGoalScorers
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/match-flyer/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          variant: 'summary',
          score_home: summaryScoreHome,
          score_away: summaryScoreAway,
          goal_scorers: scorers.length > 0 ? scorers : undefined,
          ...(selectedBackgroundUrl ? { background_url: selectedBackgroundUrl } : {}),
        }),
      });

      setProgress(70);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to generate match summary: ${response.status}`);
      }

      const data = await response.json();
      const flyerUrl = data.data?.flyer_url || data.flyer_url;
      if (!flyerUrl) throw new Error('Summary generated but no URL returned');

      setGeneratedVariants([{
        variant_index: 0,
        image_base64: null,
        presigned_url: flyerUrl,
        mime_type: 'image/png',
        filename: `match_summary_${matchData.id}.png`,
        error: null,
        storage_info: null,
        metadata: { type: 'match_summary', activity_id: matchData.id },
      }]);

      setProgress(100);
      setTimeout(() => setStep('success'), 300);
    } catch (err) {
      console.error('[!] Match summary generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Match summary generation failed');
      setStep('error');
    }
  };

  const handleGenerateLineupVideo = async () => {
    abortActiveVideoJobPoll();
    setProgress(10);

    try {
      const segments: Array<{type: string; url: string; duration?: number; label?: string; scale?: number}> = [];

      let targetGKs = selectedMembers.goalkeeper;
      let targetPlayers = selectedMembers.player;
      let targetCoach = selectedMembers.coach;
      let targetAssistant = selectedMembers.assistant;

      let gkAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      let playerAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      let coachAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      let assistantAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];

      if (selectedTemplate?.input_requirements?.members) {
        const reqs = selectedTemplate.input_requirements.members;
        if (reqs.goalkeeper?.asset_types?.length) gkAssets = reqs.goalkeeper.asset_types;
        if (reqs.player?.asset_types?.length) playerAssets = reqs.player.asset_types;
        if (reqs.coach?.asset_types?.length) coachAssets = reqs.coach.asset_types;
        if (reqs.assistant?.asset_types?.length) assistantAssets = reqs.assistant.asset_types;

        if (selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer') {
          gkAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
          playerAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
          targetGKs = targetGKs.slice(0, 1);
          targetPlayers = targetPlayers.slice(0, 10);
          targetCoach = [];
          targetAssistant = [];
        }
      }

      const addMemberSegments = (members: string[], assets: string[], role?: string) => {
        for (const memberId of members) {
          const memberName = getMemberNameById(memberId);
          for (const assetType of assets) {
            const url = getMemberAssetUrl(memberId, assetType, role);
            if (!url) {
              if (assetType === 'close_up') {
                const altUrl = getMemberAssetUrl(memberId, 'profile_photo', role);
                if (altUrl) {
                  segments.push({ type: 'image', url: altUrl, duration: 2.0, label: memberName, scale: 0.6 });
                  continue;
                }
              }
              continue;
            }

            let isImage = ['profile_photo', 'in_tenue', 'legacy_photo', 'legacy', 'full_body'].includes(assetType);
            if (!isImage && url) {
              const lowerUrl = url.toLowerCase();
              if (lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.webp')) {
                isImage = true;
              }
            }

            const isCloseup = assetType === 'close_up';
            segments.push({
              type: isImage ? 'image' : 'video',
              url,
              duration: isImage ? (isCloseup ? 2.0 : 3.0) : undefined,
              label: memberName,
              ...(isCloseup ? { scale: 0.6 } : {}),
            });
          }
        }
      };

      setProgress(20);

      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) throw new Error('No project ID available — cannot create video job');

      let jobId: string;

      if (matchData?.id) {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/lineup-from-template/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Project-ID': String(projectId),
          },
          body: JSON.stringify({
            activity_id: matchData.id,
            template_id: selectedTemplate?.id || null,
            output_resolution: 'vertical_1080p',
            formation: lineupFormation || '4-3-3',
            closeup_style: lineupCloseupStyle || 'popout',
            animation_style: lineupAnimationStyle || 'slide_up',
            intro_style: lineupIntroStyle || 'per_line',
            selected_member_ids: {
              goalkeeper: targetGKs,
              player: targetPlayers,
              coach: targetCoach,
              assistant: targetAssistant,
            },
            ...(selectedBackgroundUrl ? { background_url: selectedBackgroundUrl } : {}),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = typeof errData?.error === 'string'
            ? errData.error
            : errData?.error?.message || errData?.detail || `Failed to create video job: ${response.status}`;
          throw new Error(errMsg);
        }

        const jobData = await response.json();
        jobId = jobData.data?.id || jobData.id;
      } else {
        addMemberSegments(targetGKs, gkAssets, 'goalkeeper');
        addMemberSegments(targetPlayers, playerAssets, 'player');
        addMemberSegments(targetCoach, coachAssets, 'coach');
        addMemberSegments(targetAssistant, assistantAssets, 'assistant');

        if (segments.length === 0) {
          throw new Error('No valid segments found. Make sure selected members have the required assets.');
        }

        const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Project-ID': String(projectId),
          },
          body: JSON.stringify({
            job_type: 'lineup',
            config: {
              segments,
              output_resolution: 'auto',
              output_fps: 30,
              fade_duration: 0.5,
              match_id: null,
              activity_id: null,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
        }

        const jobData = await response.json();
        jobId = jobData.data?.id || jobData.id;
      }

      setVideoJobId(jobId);
      setVideoJobStatus('queued');
      setVideoJobProgressRaw(0);
      setProgress(100);
      setStep('video_queued');
      onGenerated?.('Lineup video staat in de wachtrij en wordt op de achtergrond verwerkt.');
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.error('[!] Lineup video generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setStep('error');
    }
  };

  const handleGenerateGoalCelebration = async () => {
    abortActiveVideoJobPoll();
    setProgress(10);

    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) throw new Error('No project ID available — cannot create video job');
      if (!matchData?.id) throw new Error('No match/activity data available for goal celebration');
      if (!goalScorerId) throw new Error('No goal scorer selected');

      setProgress(20);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/goal-celebration-from-template/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          scorer_member_id: goalScorerId,
          score_home: goalScoreHome,
          score_away: goalScoreAway,
          output_resolution: 'vertical_1080p',
          ...(selectedBackgroundUrl ? { background_url: selectedBackgroundUrl } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
      }

      const jobData = await response.json();
      const jobId = jobData.data?.id || jobData.id;

      setVideoJobId(jobId);
      setVideoJobStatus('queued');
      setVideoJobProgressRaw(0);
      setProgress(100);
      setStep('video_queued');
      onGenerated?.('Goal celebration staat in de wachtrij en wordt op de achtergrond verwerkt.');
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.error('[!] Goal celebration video generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setStep('error');
    }
  };

  const handleGenerateMatchIntro = async () => {
    abortActiveVideoJobPoll();
    setProgress(10);

    try {
      const projectId = matchData?.project?.id || season?.project_id;
      if (!projectId) throw new Error('No project ID available — cannot create video job');
      if (!matchData?.id) throw new Error('No match/activity data available for match intro');

      setProgress(20);

      const response = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/match-intro-from-template/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Project-ID': String(projectId),
        },
        body: JSON.stringify({
          activity_id: matchData.id,
          output_resolution: 'vertical_1080p',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to create video job: ${response.status}`);
      }

      const jobData = await response.json();
      const jobId = jobData.data?.id || jobData.id;

      setVideoJobId(jobId);
      setVideoJobStatus('queued');
      setVideoJobProgressRaw(0);
      setProgress(100);
      setStep('video_queued');
      onGenerated?.('Match intro staat in de wachtrij en wordt op de achtergrond verwerkt.');
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.error('[!] Match intro video generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setStep('error');
    }
  };

  // ─── Core generation dispatcher ─────────────────────────

  const handleGenerateInternal = async () => {
    setStep('generating');
    setGenerationError(null);
    setGeneratedOutput(null);
    setGeneratedVariants([]);
    setSelectedVariantIndex(0);
    setSaveSuccess(false);
    setSavedVariantIndices(new Set());
    setGenerationStartedAtMs(Date.now());
    setVideoJobId(null);
    setVideoJobStatus(null);
    setVideoJobProgressRaw(0);
    setVideoJobMeta({});
    setVideoOutputUrl(null);
    setVideoThumbnailUrl(null);

    // Simulate initial progress
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 10;
      if (p > 85) p = 85;
      setProgress(Math.min(p, 85));
    }, 500);

    try {
      const templateSubtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';

      if (templateSubtype === 'lineup_flyer') { clearInterval(progressInterval); await handleGenerateLineupFlyer(); return; }
      if (templateSubtype === 'poster') { clearInterval(progressInterval); await handleGenerateTeamPoster(); return; }
      if (templateSubtype === 'flyer') { clearInterval(progressInterval); await handleGenerateMatchFlyer(); return; }
      if (templateSubtype === 'match_summary') { clearInterval(progressInterval); await handleGenerateMatchSummary(); return; }
      if (templateSubtype === 'lineup') { clearInterval(progressInterval); await handleGenerateLineupVideo(); return; }
      if (templateSubtype === 'goal') { clearInterval(progressInterval); await handleGenerateGoalCelebration(); return; }
      if (templateSubtype === 'match_intro') { clearInterval(progressInterval); await handleGenerateMatchIntro(); return; }

      // Generic AI generation
      const isStandardize = templateSubtype.includes('standardize') || templateSubtype.includes('logo') || templateSubtype.includes('sponsor');
      const variantCount = isStandardize ? 3 : 1;

      const response = await fetch(`${getApiBaseUrl()}/api/v1/generative/assets/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          template_id: selectedTemplate?.id?.toString() || 'default',
          params: {
            template_type: selectedType?.type || selectedTemplate?.template_type,
            template_subtype: selectedType?.subtype || selectedTemplate?.template_subtype,
            style_variant: selectedTemplate?.style_variant || 'default',
            match_id: matchData?.id,
            project_name: matchData?.project?.name,
            opponent_name: matchData?.opponent_project?.name,
          },
          variant_count: variantCount,
          input_images: {},
          input_image_urls: {},
          project_id: matchData?.project?.id || null,
          organisation_id: organisationId || null,
          activity_id: matchData?.id || null,
          asset_type: assetType || selectedTemplate?.template_subtype || null,
          save_to_brand: false,
          save_to_media_library: false,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const responseData = data.data || data;
      const variants: GeneratedVariant[] = responseData.variants || [];

      const firstError = variants.find((v: GeneratedVariant) => v.error);
      if (firstError?.error) throw new Error(firstError.error);

      setGeneratedVariants(variants);
      setSelectedVariantIndex(0);

      // Legacy backwards compatibility
      const firstVariant = variants[0];
      if (firstVariant) {
        setGeneratedOutput({
          image_base64: firstVariant.image_base64 || null,
          presigned_url: firstVariant.presigned_url || null,
          storage_info: firstVariant.storage_info || null,
          metadata: firstVariant.metadata || {},
        });
      } else if (responseData.image_base64 || responseData.presigned_url) {
        const singleVariant: GeneratedVariant = {
          variant_index: 0,
          image_base64: responseData.image_base64,
          presigned_url: responseData.presigned_url,
          mime_type: responseData.mime_type,
          filename: responseData.filename,
          error: null,
          storage_info: responseData.storage_info,
          metadata: responseData.metadata || {},
        };
        setGeneratedVariants([singleVariant]);
        setGeneratedOutput({
          image_base64: singleVariant.image_base64,
          presigned_url: singleVariant.presigned_url,
          storage_info: singleVariant.storage_info,
          metadata: singleVariant.metadata,
        });
      }

      setProgress(100);
      setTimeout(() => setStep('success'), 300);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('[!] Generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      setStep('error');
    }
  };

  // ─── Save handlers ──────────────────────────────────────

  const handleSaveVariantByIndex = async (variantIdx: number, opts?: { skipAutoClose?: boolean }) => {
    const variant = generatedVariants[variantIdx];
    if (!variant) return;

    setSavingAsset(true);

    try {
      const templateSubtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';
      let brandAssetType = assetType;
      const isVideo = (variant.mime_type || '').startsWith('video/');

      if (templateSubtype.includes('logo')) {
        brandAssetType = 'logo';
      } else if (templateSubtype.includes('sponsor')) {
        brandAssetType = 'sponsor_logo';
      } else if (templateSubtype.includes('kit') || templateSubtype.includes('tenue')) {
        const kitType = (selectedTemplate as ContentTemplate & { params?: { kit_type?: string } })?.params?.kit_type || 'home';
        brandAssetType = `kit_${kitType}`;
      } else if (templateSubtype === 'lineup_flyer') {
        brandAssetType = `lineup_flyer_${(matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
      } else if (templateSubtype === 'flyer') {
        brandAssetType = `match_flyer_${(matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
      } else if (templateSubtype === 'goal' || templateSubtype === 'goal_celebration') {
        brandAssetType = `goal_${(matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
      } else if (templateSubtype === 'match_intro') {
        brandAssetType = `match_intro_${(matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
      } else if (templateSubtype === 'poster') {
        brandAssetType = `poster_${(matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
      } else if (templateSubtype === 'lineup' || isVideo) {
        brandAssetType = `lineup_${(matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
      }

      if (!brandAssetType) brandAssetType = 'other';
      if (generatedVariants.length > 1) brandAssetType = `${brandAssetType}_v${variantIdx + 1}`;

      const filename = variant.filename || (isVideo ? 'lineup.mp4' : 'saved_asset.png');

      const response = await fetch(`${getApiBaseUrl()}/api/v1/generative/assets/save/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          storage_path: variant.storage_info?.storage_path,
          presigned_url: variant.presigned_url,
          video_url: isVideo ? variant.presigned_url : null,
          image_base64: variant.image_base64,
          filename,
          mime_type: variant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
          file_size_bytes: variant.storage_info?.file_size_bytes || 0,
          organisation_id: organisationId,
          project_id: matchData?.project?.id,
          activity_id: matchData?.id || null,
          asset_type: brandAssetType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `Failed to save: ${response.status}`);
      }

      const result = await response.json();
      setSavedVariantIndices(prev => new Set([...prev, variantIdx]));

      // Update variant storage_info with returned IDs
      if (result.data?.brand_asset_id || result.brand_asset_id || result.data?.media_item_id || result.media_item_id) {
        const returnedFileAssetId = result.data?.file_asset_id || result.file_asset_id;
        const returnedBrandAssetId = result.data?.brand_asset_id || result.brand_asset_id;
        const returnedMediaItemId = result.data?.media_item_id || result.media_item_id;
        const returnedStoragePath = result.data?.storage_path || result.storage_path;

        const nextStorageInfo: NonNullable<GeneratedVariant['storage_info']> = variant.storage_info
          ? { ...variant.storage_info }
          : {
              storage_backend: 's3',
              storage_path: returnedStoragePath || variant.presigned_url || '',
              file_size_bytes: 0,
              mime_type: variant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
            };

        if (returnedStoragePath) nextStorageInfo.storage_path = returnedStoragePath;
        if (returnedFileAssetId) nextStorageInfo.file_asset_id = returnedFileAssetId;
        if (returnedBrandAssetId) nextStorageInfo.brand_asset_id = returnedBrandAssetId;
        if (returnedMediaItemId) (nextStorageInfo as Record<string, unknown>).media_item_id = returnedMediaItemId;

        const updatedVariants = [...generatedVariants];
        updatedVariants[variantIdx] = { ...variant, storage_info: nextStorageInfo };
        setGeneratedVariants(updatedVariants);
      }

      if (!opts?.skipAutoClose && generatedVariants.length <= 1) {
        setSaveSuccess(true);
        setTimeout(() => { onClose(); }, 1200);
      }
    } catch (err) {
      console.error(`[!] Failed to save variant ${variantIdx + 1}:`, err);
      setGenerationError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleSaveAsAsset = async () => {
    await handleSaveVariantByIndex(selectedVariantIndex);
  };

  const handleSaveAllAsAssets = async () => {
    setSavingAsset(true);
    setSaveSuccess(false);

    for (let i = 0; i < generatedVariants.length; i++) {
      if (savedVariantIndices.has(i)) continue;
      await handleSaveVariantByIndex(i, { skipAutoClose: true });
    }

    setSaveSuccess(true);
    setSavingAsset(false);
    setTimeout(() => { onClose(); }, 1200);
  };

  // ─── Navigation handlers ────────────────────────────────

  const handleSelectType = (type: string, subtype: string, label: string) => {
    setSelectedType({ type, subtype, label });

    if (subtype === 'goal' || subtype === 'match_intro') {
      setStep('confirm');
      return;
    }

    if (subtype === 'poster') {
      setSelectedTemplate({
        id: 0,
        name: 'Elftalfoto',
        description: '',
        style_variant: '',
        template_type: 'pre_match',
        template_subtype: 'poster',
        is_active: true,
        input_requirements: {
          members: {
            goalkeeper: { count: 1, asset_types: ['in_tenue'] },
            player: { count: 10, asset_types: ['in_tenue'] },
          },
        },
      } as ContentTemplate);
      setStep('members');
      return;
    }

    setStep('template');
    fetchTemplates(type, subtype);
  };

  const handleSelectTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);

    const needsMembers = template.input_requirements?.members &&
      Object.entries(template.input_requirements.members).some(([key, val]) =>
        key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
      );

    setStep(needsMembers ? 'members' : 'confirm');
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    handleGenerateInternal();
  };

  const handleBack = () => {
    if (initialTemplate && step === 'members') {
      onClose();
      return;
    }

    if (step === 'template') {
      setStep('type');
      setSelectedType(null);
      setTemplates([]);
    } else if (step === 'members') {
      if (selectedType?.subtype === 'poster') {
        setStep('type');
        setSelectedType(null);
        setSelectedTemplate(null);
      } else {
        setStep('template');
        setSelectedTemplate(null);
      }
    } else if (step === 'lineup_squad') {
      setStep('members');
    } else if (step === 'confirm') {
      const needsMembers = selectedTemplate?.input_requirements?.members &&
        Object.entries(selectedTemplate.input_requirements.members).some(([key, val]) =>
          key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0
        );
      const isLineup = selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer' || selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'lineup' || selectedTemplate?.template_subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'poster';
      const isGoal = selectedType?.subtype === 'goal';
      if (isGoal) {
        setStep('type');
        setSelectedType(null);
      } else if (isLineup && needsMembers) {
        setStep('lineup_squad');
      } else if (needsMembers) {
        setStep('members');
      } else {
        setStep('template');
        setSelectedTemplate(null);
      }
    }
  };

  const handleVideoApproval = async (action: 'approve' | 'reject') => {
    if (!videoJobId) return;
    const isApprove = action === 'approve';
    setVideoApprovalStatus(isApprove ? 'approving' : 'rejecting');
    setVideoApprovalError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/video/jobs/${videoJobId}/${action}/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.detail || `${action} failed`);
      }
      setVideoApprovalStatus(isApprove ? 'approved' : 'rejected');
      if (isApprove) onGenerated?.('Video goedgekeurd en opgeslagen.');
    } catch (err) {
      setVideoApprovalError(err instanceof Error ? err.message : `${action} failed`);
      setVideoApprovalStatus('idle');
    }
  };

  // ─── Render ─────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--app-surface, white)',
          padding: '0',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderBottom: '1px solid var(--app-border, #e5e7eb)',
          flexShrink: 0,
        }}>
          {(step !== 'type' || initialTemplate) ? (
            <button
              onClick={handleBack}
              aria-label="Terug"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: 'var(--app-surface-2, #f3f4f6)', border: '1px solid var(--app-border, #e5e7eb)',
                cursor: 'pointer', color: 'var(--app-text, #111)', fontSize: '20px', lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ←
            </button>
          ) : (
            <div style={{ width: '40px', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--app-text, #111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {step === 'type' && 'Content aanmaken'}
              {step === 'template' && `${selectedType?.label || 'Template'} kiezen`}
              {step === 'members' && (isLineupFlow ? 'Lineup opties' : `${contentTypeLabel || selectedType?.label || 'Content'} instellen`)}
              {step === 'lineup_squad' && 'Opstelling kiezen'}
              {step === 'confirm' && (contentTypeLabel || selectedType?.label || 'Bevestigen')}
              {step === 'generating' && 'Bezig met genereren...'}
              {step === 'video_queued' && 'In de wachtrij'}
              {step === 'success' && 'Content klaar'}
              {step === 'error' && 'Fout opgetreden'}
            </div>
            {matchData && (
              <div style={{ fontSize: '13px', color: 'var(--app-text-muted, #6b7280)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {matchData.project?.name} vs {matchData.opponent_project?.name || 'Tegenstander'}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'var(--app-surface-2, #f3f4f6)', border: '1px solid var(--app-border, #e5e7eb)',
              cursor: 'pointer', color: 'var(--app-text, #111)', fontSize: '20px', lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {step === 'type' && (
            <TypeStep onSelectType={handleSelectType} />
          )}

          {step === 'template' && (
            <TemplateStep
              loading={loading}
              error={error}
              templates={templates}
              selectedType={selectedType}
              organisationSport={organisationSport ?? null}
              fetchTemplates={fetchTemplates}
              onSelectTemplate={handleSelectTemplate}
            />
          )}

          {step === 'members' && selectedTemplate && (
            <MembersStep
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              isLineupFlow={!!isLineupFlow}
              seasonSquad={seasonSquad}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              lineupFormation={lineupFormation}
              setLineupFormation={setLineupFormation}
              lineupCloseupStyle={lineupCloseupStyle}
              setLineupCloseupStyle={setLineupCloseupStyle}
              lineupAnimationStyle={lineupAnimationStyle}
              setLineupAnimationStyle={setLineupAnimationStyle}
              lineupIntroStyle={lineupIntroStyle}
              setLineupIntroStyle={setLineupIntroStyle}
              selectedBackgroundUrl={selectedBackgroundUrl}
              setSelectedBackgroundUrl={setSelectedBackgroundUrl}
              appBackgrounds={appBackgrounds}
            />
          )}

          {step === 'lineup_squad' && selectedTemplate && (
            <LineupSquadStep
              selectedTemplate={selectedTemplate}
              seasonSquad={seasonSquad}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              lineupFormation={lineupFormation}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              contentTypeLabel={contentTypeLabel}
              matchData={matchData}
              seasonSquad={seasonSquad}
              matchFlyerVariant={matchFlyerVariant}
              setMatchFlyerVariant={setMatchFlyerVariant}
              flyerMemberId={flyerMemberId}
              setFlyerMemberId={setFlyerMemberId}
              flyerActionStyle={flyerActionStyle}
              setFlyerActionStyle={setFlyerActionStyle}
              flyerPhotoLayout={flyerPhotoLayout}
              setFlyerPhotoLayout={setFlyerPhotoLayout}
              flyerPhotoSlots={flyerPhotoSlots}
              setFlyerPhotoSlots={setFlyerPhotoSlots}
              goalScoreHome={goalScoreHome}
              setGoalScoreHome={setGoalScoreHome}
              goalScoreAway={goalScoreAway}
              setGoalScoreAway={setGoalScoreAway}
              goalScorerId={goalScorerId}
              setGoalScorerId={setGoalScorerId}
              summaryScoreHome={summaryScoreHome}
              setSummaryScoreHome={setSummaryScoreHome}
              summaryScoreAway={summaryScoreAway}
              setSummaryScoreAway={setSummaryScoreAway}
              summaryGoalScorers={summaryGoalScorers}
              setSummaryGoalScorers={setSummaryGoalScorers}
              selectedBackgroundUrl={selectedBackgroundUrl}
              setSelectedBackgroundUrl={setSelectedBackgroundUrl}
              appBackgrounds={appBackgrounds}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              homeLogoUrl={homeLogoUrl}
              awayLogoUrl={awayLogoUrl}
            />
          )}

          {step === 'generating' && (
            <GeneratingStep
              progress={progress}
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              videoJobStatus={videoJobStatus || ''}
              videoJobProgressRaw={videoJobProgressRaw}
              videoJobMeta={videoJobMeta}
              videoJobId={videoJobId}
              onClose={onClose}
            />
          )}

          {step === 'video_queued' && (
            <VideoQueuedStep
              videoOutputUrl={videoOutputUrl}
              videoJobStatus={videoJobStatus || ''}
              videoJobProgressRaw={videoJobProgressRaw}
              videoThumbnailUrl={videoThumbnailUrl}
              videoApprovalStatus={videoApprovalStatus}
              videoApprovalError={videoApprovalError}
              handleVideoApproval={handleVideoApproval}
              selectedType={selectedType}
              onClose={onClose}
            />
          )}

          {step === 'success' && (
            <SuccessStep
              generatedOutput={generatedOutput}
              generatedVariants={generatedVariants}
              selectedVariantIndex={selectedVariantIndex}
              setSelectedVariantIndex={setSelectedVariantIndex}
              savingAsset={savingAsset}
              saveSuccess={saveSuccess}
              savedVariantIndices={savedVariantIndices}
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              matchData={matchData}
              handleSaveAsAsset={handleSaveAsAsset}
              handleSaveAllAsAssets={handleSaveAllAsAssets}
              handleSaveVariantByIndex={handleSaveVariantByIndex}
              handleGenerateInternal={handleGenerateInternal}
              onClose={onClose}
            />
          )}

          {step === 'error' && (
            <ErrorStep
              error={generationError}
              onRetry={() => setStep('confirm')}
              onClose={onClose}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          borderTop: '1px solid var(--app-border, #e5e7eb)',
          flexShrink: 0,
        }}>
          <div>
            {(step === 'template' || step === 'members' || step === 'lineup_squad' || step === 'confirm') && (
              <Button variant="ghost" onClick={handleBack}>Terug</Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step !== 'generating' && step !== 'success' && step !== 'error' && (
              <Button variant="ghost" onClick={onClose}>Annuleren</Button>
            )}
            {step === 'members' && isLineupFlow && (
              <Button onClick={() => setStep('lineup_squad')}>
                Opstelling kiezen
              </Button>
            )}
            {step === 'members' && !isLineupFlow && (
              <Button disabled={!memberSelectionValid} onClick={() => setStep('confirm')}>
                Verder
              </Button>
            )}
            {step === 'lineup_squad' && (
              <Button disabled={!memberSelectionValid} onClick={() => {
                setSelectedMembers(prev => ({
                  ...prev,
                  goalkeeper: prev.goalkeeper.filter(Boolean),
                  player: prev.player.filter(Boolean),
                }));
                setStep('confirm');
              }}>
                Verder
              </Button>
            )}
            {step === 'confirm' && (
              <Button
                onClick={handleGenerate}
                disabled={selectedType?.subtype === 'goal' && !goalScorerId}
              >
                Genereer content
              </Button>
            )}
            {step === 'success' && (
              <>
                {generatedVariants.length === 1 && generatedVariants[0]?.mime_type?.startsWith('video/') ? (
                  <>
                    <Button variant="ghost" onClick={onClose}>Sluiten</Button>
                    <Button
                      variant="secondary"
                      onClick={handleSaveAsAsset}
                      disabled={savingAsset || saveSuccess}
                    >
                      {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Accepteren & Opslaan'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={onClose}>Sluiten</Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleGenerateInternal()}
                    >
                      Opnieuw
                    </Button>
                    {generatedVariants[selectedVariantIndex] && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const variant = generatedVariants[selectedVariantIndex];
                          if (variant.image_base64) {
                            const link = document.createElement('a');
                            const mimeType = getSecureMimeType(variant.image_base64, variant.mime_type);
                            link.href = `data:${mimeType};base64,${variant.image_base64}`;
                            let filename = variant.filename || `generated-variant-${selectedVariantIndex + 1}`;
                            if (mimeType === 'image/jpeg' && (filename.endsWith('.png') || !filename.includes('.'))) {
                              filename = filename.replace(/\.png$/i, '') + '.jpg';
                            }
                            link.download = filename;
                            link.click();
                          } else if (variant.presigned_url) {
                            window.open(variant.presigned_url, '_blank');
                          }
                        }}
                      >
                        Download
                      </Button>
                    )}
                    {generatedVariants.length > 1 ? (
                      <>
                        <Button
                          onClick={handleSaveAsAsset}
                          disabled={savingAsset || savedVariantIndices.has(selectedVariantIndex)}
                          variant="secondary"
                        >
                          {savedVariantIndices.has(selectedVariantIndex)
                            ? 'Opgeslagen'
                            : savingAsset
                              ? 'Opslaan...'
                              : `Variant ${selectedVariantIndex + 1} opslaan`}
                        </Button>
                        <Button
                          onClick={handleSaveAllAsAssets}
                          disabled={savingAsset || savedVariantIndices.size === generatedVariants.length}
                        >
                          {savedVariantIndices.size === generatedVariants.length
                            ? 'Alles opgeslagen'
                            : savingAsset
                              ? 'Opslaan...'
                              : `Alles opslaan (${generatedVariants.length})`}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleSaveAsAsset}
                        disabled={savingAsset || saveSuccess}
                      >
                        {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Opslaan als asset'}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
