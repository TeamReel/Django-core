/**
 * useMatchWizardData — State, effects, and handlers for MatchWizard.
 *
 * Single-wizard approach: handles match selection, content type choice,
 * lineup editing, content options, generation dispatch, and result display.
 * Eliminates the need for a separate ContentGenerationModal.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities, Activity } from '../hooks/useActivities';
import { getApiBaseUrl } from '../utils/apiBase';
import { useToast } from '../components/ui/Toast';
import { CheckCircle, Clock } from 'lucide-react';
import type { ContentTemplate, GeneratedVariant, GeneratedOutput } from '../pages/identity/ContentGenerationModal/types';
import { useSeasonSquadData } from '../pages/identity/ContentGenerationModal/useSeasonSquadData';
import { useVideoJobPolling } from '../pages/identity/ContentGenerationModal/useVideoJobPolling';
import { useContentOptions } from '../pages/identity/ContentGenerationModal/useContentOptions';
import {
  generateLineupFlyer,
  generateTeamPoster,
  generateMatchFlyer,
  generateMatchSummary,
  generateGenericAI,
  saveGeneratedVariant,
} from '../pages/identity/ContentGenerationModal/contentGenerationApi';
import {
  generateLineupVideo,
  generateGoalCelebration,
  generateMatchIntro,
} from '../pages/identity/ContentGenerationModal/contentGenerationVideoApi';
import {
  WizardStep, ContentPhase, SquadMember,
  LINEUP_REQUIRED_SUBTYPES, HAS_OPTIONS_SUBTYPES, POSITIONS, getSquadMemberName,
} from './matchWizardTypes';

export function useMatchWizardData(isOpen: boolean, onClose: () => void, initialMatchId?: string) {
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();
  const { pushToast } = useToast();

  // ── Wizard step & match state ───────────────────────────
  const [currentStep, setCurrentStep] = useState<WizardStep>('match');
  const [selectedMatch, setSelectedMatch] = useState<Activity | null>(null);
  const [lineupSlots, setLineupSlots] = useState<{ goalkeeper: string[]; player: string[] }>({ goalkeeper: [], player: [] });
  const [lineupFormation, setLineupFormation] = useState('4-3-3');
  const [squadGroups, setSquadGroups] = useState<Record<string, SquadMember[]>>({ goalkeeper: [], player: [] });
  const [guestPlayers, setGuestPlayers] = useState<SquadMember[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [selectedContentPhase, setSelectedContentPhase] = useState<ContentPhase>('pre');
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [lineupSaving, setLineupSaving] = useState(false);

  // Matches
  const { activities, loading: matchesLoading, error: matchesLoadError } = useActivities({ limit: 10 });

  // Error states per step
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const matchesError = matchesLoadError ? 'Kon wedstrijden niet laden. Controleer je verbinding.' : null;

  // Content / template selection
  const [pendingContent, setPendingContent] = useState<{
    key: string; label: string; subtype: string; templateType: string;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState('');

  // Templates
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── Generation state ────────────────────────────────────
  const [progress, setProgress] = useState(0);
  const [generationStartedAtMs, setGenerationStartedAtMs] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [savingAsset, setSavingAsset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedVariantIndices, setSavedVariantIndices] = useState<Set<number>>(new Set());

  // ── Sub-hooks: content options, season squad, video polling ─
  const matchDataForApi = useMemo(() => {
    if (!selectedMatch) return null;
    return {
      id: String(selectedMatch.id),
      title: selectedMatch.title,
      project: (selectedMatch as any).project,
      opponent_project: (selectedMatch as any).opponent_project,
      participations: (selectedMatch as any).participations,
      start_time: selectedMatch.start_time,
      location: (selectedMatch as any).location,
      metadata: {
        ...((selectedMatch as any).metadata || {}),
        formation: lineupFormation,
        lineup: { formation: lineupFormation, goalkeeper: lineupSlots.goalkeeper, player: lineupSlots.player },
      },
    };
  }, [selectedMatch, lineupFormation, lineupSlots]);

  const options = useContentOptions({ isOpen, matchData: matchDataForApi });

  // Keep options hook's formation in sync with wizard's
  useEffect(() => { options.setLineupFormation(lineupFormation); }, [lineupFormation]);

  const projectId = (selectedMatch as any)?.project?.id || null;

  const seasonSquad = useSeasonSquadData({
    isOpen: isOpen && !!selectedMatch,
    projectId: projectId ? String(projectId) : null,
    seasonId: null,
    selectedTemplate,
  });

  // Sync lineup slots → seasonSquad.selectedMembers for generation APIs
  const lineupSlotsRef = useRef(lineupSlots);
  lineupSlotsRef.current = lineupSlots;
  useEffect(() => {
    if (selectedMatch && ['options', 'review', 'generating'].includes(currentStep)) {
      seasonSquad.setSelectedMembers({
        goalkeeper: lineupSlotsRef.current.goalkeeper.filter(Boolean),
        player: lineupSlotsRef.current.player.filter(Boolean),
        coach: [],
        assistant: [],
      });
    }
  }, [currentStep, selectedMatch]);

  const videoPoll = useVideoJobPolling({
    isOpen,
    step: currentStep,
    onGenerated: undefined,
  });

  // ── Derived ─────────────────────────────────────────────
  const upcomingMatches = activities.filter(a => {
    const isMatch = a.activity_type.toLowerCase().includes('match');
    return isMatch && new Date(a.start_time) > new Date();
  });

  const gkPool = squadGroups.goalkeeper || [];
  const playerPool = squadGroups.player || [];
  const allPlayers = [...gkPool, ...playerPool, ...guestPlayers];

  const filledPositions = lineupSlots.goalkeeper.filter(Boolean).length + lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS.length;

  const selectedType = useMemo(() => {
    if (!pendingContent) return null;
    return { type: pendingContent.templateType, subtype: pendingContent.subtype, label: pendingContent.label };
  }, [pendingContent]);

  const isLineupFlow = pendingContent ? ['lineup', 'lineup_flyer', 'poster'].includes(pendingContent.subtype) : false;

  const homeTeamName = matchDataForApi?.project?.name || 'Thuis';
  const awayTeamName = matchDataForApi?.opponent_project?.name || 'Uit';

  const organisationId = (selectedMatch as any)?.project?.organisation_id
    || (selectedMatch as any)?.organisation?.id || null;

  // ── Effects ─────────────────────────────────────────────

  // Auto-select match (and skip to content step when initialMatchId provided)
  useEffect(() => {
    if (isOpen && !selectedMatch) {
      if (initialMatchId) {
        const m = activities.find(a => a.id === initialMatchId || (a as any).slug === initialMatchId);
        if (m) {
          setSelectedMatch(m);
          setCurrentStep('content');
        } else if (!matchesLoading) {
          // Match not in initial fetch — load it directly from API
          (async () => {
            try {
              const res = await fetch(
                `${apiBaseUrl}/api/v1/activities/${encodeURIComponent(initialMatchId)}/`,
                { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
              );
              if (res.ok) {
                const raw = await res.json();
                const data = raw?.data || raw;
                if (data?.id) {
                  setSelectedMatch(data as Activity);
                  setCurrentStep('content');
                }
              }
            } catch (err) {
              console.error(err);
              console.error('[MatchWizard] Failed to fetch match by id:', err);
            }
          })();
        }
      } else if (upcomingMatches.length > 0) {
        setSelectedMatch(upcomingMatches[0]);
      }
    }
  }, [isOpen, activities, initialMatchId, upcomingMatches, selectedMatch, matchesLoading, apiBaseUrl]);

  // Reset to initial state when wizard closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMatch(null);
      setCurrentStep('match');
      setSelectedContentPhase('pre');
      setPendingContent(null);
      setSelectedTemplate(null);
      setSelectedContentTypeLabel('');
      // Reset generation state
      setProgress(0);
      setGenerationStartedAtMs(null);
      setGenerationError(null);
      setGeneratedOutput(null);
      setGeneratedVariants([]);
      setSelectedVariantIndex(0);
      setSavingAsset(false);
      setSaveSuccess(false);
      setSavedVariantIndices(new Set());
      videoPoll.resetVideo();
    }
  }, [isOpen]);

  // Load saved lineup from match metadata
  useEffect(() => {
    if (!selectedMatch) return;
    const metadata = (selectedMatch as any).metadata;
    const saved = metadata?.lineup;
    if (saved) {
      if (saved.formation) setLineupFormation(saved.formation);
      if (saved.goalkeeper || saved.player) setLineupSlots({ goalkeeper: saved.goalkeeper || [], player: saved.player || [] });
    } else if (metadata?.formation) {
      setLineupFormation(metadata.formation);
    }
  }, [selectedMatch]);

  // Fetch squad when entering lineup
  useEffect(() => {
    if (selectedMatch && currentStep === 'lineup') fetchSquad();
  }, [selectedMatch, currentStep]);

  // Fetch templates when entering content
  useEffect(() => {
    if (selectedMatch && currentStep === 'content') fetchTemplates();
  }, [selectedMatch, currentStep]);

  // ── Fetch helpers ───────────────────────────────────────

  const fetchSquad = async () => {
    if (!selectedMatch) return;
    const pid = (selectedMatch as any).project?.id;
    if (!pid) return;

    setSquadLoading(true);
    setSquadError(null);
    try {
      const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(pid))}/members/?page_size=100`;
      const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { setSquadError('Kon spelers niet laden'); setSquadLoading(false); return; }

      const raw = await res.json();
      let members: SquadMember[] = [];
      if (raw?.data?.data && Array.isArray(raw.data.data)) members = raw.data.data;
      else if (raw?.data?.results && Array.isArray(raw.data.results)) members = raw.data.results;
      else if (raw?.results && Array.isArray(raw.results)) members = raw.results;
      else if (Array.isArray(raw?.data)) members = raw.data;
      else if (Array.isArray(raw)) members = raw;

      let nextUrl = raw?.meta?.pagination?.next;
      while (nextUrl) {
        const nr = await fetch(nextUrl, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (!nr.ok) break;
        const nd = await nr.json();
        let nm: SquadMember[] = [];
        if (nd?.data?.data && Array.isArray(nd.data.data)) nm = nd.data.data;
        else if (Array.isArray(nd?.data)) nm = nd.data;
        else if (Array.isArray(nd)) nm = nd;
        members = [...members, ...nm];
        nextUrl = nd?.meta?.pagination?.next;
      }

      const groups: Record<string, SquadMember[]> = { goalkeeper: [], player: [] };
      members.forEach(p => {
        let roles: string[] = [];
        if (p.functional_roles?.length) roles = p.functional_roles;
        else if (p.metadata?.functional_roles?.length) roles = p.metadata.functional_roles;
        else if (p.data?.functional_role) roles = [p.data.functional_role];
        else if (p.metadata?.team_role) roles = [p.metadata.team_role];
        else roles = ['player'];

        roles.forEach(role => {
          const nr = role.toLowerCase();
          if (nr === 'goalkeeper' || nr === 'keeper' || nr === 'gk') groups.goalkeeper.push(p);
          else if (groups[nr]) groups[nr].push(p);
          else groups.player.push(p);
        });
      });
      setSquadGroups(groups);
    } catch (err) {
      console.error(err);
      console.error('Failed to fetch squad:', err);
      setSquadError('Kon spelers niet laden. Controleer je verbinding.');
    } finally {
      setSquadLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?is_active=true&page_size=500`, {
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) { setTemplatesError('Kon sjablonen niet laden'); setTemplatesLoading(false); return; }
      const data = await res.json();
      const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
      const all: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];
      const grouped: Record<string, ContentTemplate[]> = {};
      all.forEach(t => {
        const subtype = t.template_subtype || t.template_type;
        if (!grouped[subtype]) grouped[subtype] = [];
        grouped[subtype].push(t);
      });
      setAvailableTemplates(grouped);
    } catch (err) {
      console.error(err);
      console.error('Failed to fetch templates:', err);
      setTemplatesError('Kon sjablonen niet laden. Controleer je verbinding.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const saveLineup = async () => {
    if (!selectedMatch) return;
    setLineupSaving(true);
    setSaveError(null);
    try {
      const matchId = (selectedMatch as any).slug || selectedMatch.id;
      const existingMetadata = (selectedMatch as any).metadata || {};
      const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';
      await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(matchId))}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          metadata: { ...existingMetadata, formation: lineupFormation, lineup: { formation: lineupFormation, goalkeeper: lineupSlots.goalkeeper, player: lineupSlots.player } },
        }),
      });
    } catch (err) {
      console.error(err);
      console.error('Failed to save lineup:', err);
      setSaveError('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setLineupSaving(false);
    }
  };

  // ── Template resolution ─────────────────────────────────

  const resolveTemplate = (subtype: string): ContentTemplate | null => {
    const templates = availableTemplates[subtype] || [];
    let matchedTemplate: ContentTemplate | undefined;

    if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
      if (lineupFormation) {
        matchedTemplate = templates.find(t =>
          t.formation_detail?.code === lineupFormation ||
          t.name.toLowerCase().includes(lineupFormation.toLowerCase().replace(/-/g, '')),
        );
      }
      if (!matchedTemplate) matchedTemplate = templates[0];
    } else {
      matchedTemplate = templates[0];
    }

    const syntheticAllowed = ['match_intro', 'goal', 'poster'];
    if (!matchedTemplate && syntheticAllowed.includes(subtype)) {
      const synthetic: Record<string, ContentTemplate> = {
        match_intro: { id: 0, name: 'Match Intro', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'match_intro', is_active: true, input_requirements: {} } as any,
        goal: { id: 0, name: 'Goal Celebration', description: '', style_variant: '', template_type: 'during_match', template_subtype: 'goal', is_active: true, input_requirements: {} } as any,
        poster: { id: 0, name: 'Elftalfoto', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'poster', is_active: true, input_requirements: { members: { goalkeeper: { count: 1, asset_types: ['in_tenue'] }, player: { count: 10, asset_types: ['in_tenue'] } } } } as any,
      };
      matchedTemplate = synthetic[subtype];
    }

    return matchedTemplate || null;
  };

  // ── Step handlers ───────────────────────────────────────

  const handleSelectPlayer = (positionIdx: number, isGoalkeeper: boolean, memberId: string | null) => {
    if (isGoalkeeper) {
      const newGk = [...lineupSlots.goalkeeper];
      newGk[positionIdx] = memberId || '';
      setLineupSlots({ ...lineupSlots, goalkeeper: newGk.filter(Boolean) as string[] });
    } else {
      const newPlayers = [...lineupSlots.player];
      while (newPlayers.length <= positionIdx) newPlayers.push('');
      newPlayers[positionIdx] = memberId || '';
      setLineupSlots({ ...lineupSlots, player: newPlayers });
    }
    setEditingPosition(null);
  };

  const handleContentSelect = (contentKey: string, contentLabel: string, subtype: string, templateType: string) => {
    if (!selectedMatch) return;
    setPendingContent({ key: contentKey, label: contentLabel, subtype, templateType });
    setSelectedContentTypeLabel(contentLabel);

    // Resolve template immediately so it's ready for generation
    const template = resolveTemplate(subtype);
    setSelectedTemplate(template);

    if (LINEUP_REQUIRED_SUBTYPES.has(subtype)) {
      setCurrentStep('lineup');
    } else if (HAS_OPTIONS_SUBTYPES.has(subtype)) {
      setCurrentStep('options');
    } else {
      setCurrentStep('review');
    }
  };

  const handleLineupConfirm = () => {
    saveLineup();
    if (pendingContent && HAS_OPTIONS_SUBTYPES.has(pendingContent.subtype)) {
      setCurrentStep('options');
    } else {
      setCurrentStep('review');
    }
  };

  const handleOptionsConfirm = () => {
    setCurrentStep('review');
  };

  const handleReviewConfirm = () => {
    handleGenerate();
  };

  // ── Generation dispatch ─────────────────────────────────

  const handleGenerate = async () => {
    setCurrentStep('generating');
    setGenerationError(null);
    setGeneratedOutput(null);
    setGeneratedVariants([]);
    setSelectedVariantIndex(0);
    setSaveSuccess(false);
    setSavedVariantIndices(new Set());
    setGenerationStartedAtMs(Date.now());
    videoPoll.resetVideo();

    // ── Pre-flight validation for lineup types ──
    const subtype = pendingContent?.subtype || '';
    if (subtype === 'lineup' || subtype === 'lineup_flyer') {
      const expectedFieldPlayers = lineupFormation.split('-').reduce((sum, n) => sum + parseInt(n, 10), 0);
      const filledGk = lineupSlots.goalkeeper.filter(Boolean).filter(id => !id.startsWith('guest-')).length;
      const filledPlayers = lineupSlots.player.filter(Boolean).filter(id => !id.startsWith('guest-')).length;
      if (filledGk < 1 || filledPlayers < expectedFieldPlayers) {
        const missing: string[] = [];
        if (filledGk < 1) missing.push('keeper');
        if (filledPlayers < expectedFieldPlayers) missing.push(`${expectedFieldPlayers - filledPlayers} veldspeler(s)`);
        setGenerationError(
          `Opstelling niet compleet voor formatie ${lineupFormation}: ${missing.join(' en ')} ontbre(e)k(en). ` +
          `Vul alle posities met echte spelers (geen gast-spelers) en probeer opnieuw.`,
        );
        setCurrentStep('error');
        return;
      }
    }

    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 10;
      if (p > 85) p = 85;
      setProgress(Math.min(p, 85));
    }, 500);

    try {
      const seasonProjectId = projectId;
      const matchData = matchDataForApi;

      // ── Flyer-type generators (return GeneratedVariant[]) ──
      const flyerGenerators: Record<string, () => Promise<GeneratedVariant[]>> = {
        lineup_flyer: () => generateLineupFlyer({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          lineupFormation, lineupCloseupStyle: options.lineupCloseupStyle,
          selectedTemplateId: selectedTemplate?.id,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
        poster: () => generateTeamPoster({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          lineupFormation, selectedTemplateId: selectedTemplate?.id,
        }),
        flyer: () => generateMatchFlyer({
          matchData, seasonProjectId,
          matchFlyerVariant: options.matchFlyerVariant,
          flyerPhotoLayout: options.flyerPhotoLayout,
          flyerPhotoSlots: options.flyerPhotoSlots,
          flyerMemberId: options.flyerMemberId,
          flyerActionStyle: options.flyerActionStyle,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
        match_summary: () => generateMatchSummary({
          matchData, seasonProjectId,
          summaryScoreHome: options.summaryScoreHome,
          summaryScoreAway: options.summaryScoreAway,
          summaryGoalScorers: options.summaryGoalScorers,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
      };

      if (flyerGenerators[subtype]) {
        clearInterval(progressInterval);
        setProgress(10);
        const variants = await flyerGenerators[subtype]();
        setGeneratedVariants(variants);
        setProgress(100);
        setTimeout(() => setCurrentStep('success'), 300);
        return;
      }

      // ── Video generators (return jobId) ──
      const videoGenerators: Record<string, () => Promise<string>> = {
        lineup: () => generateLineupVideo({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          selectedType, selectedTemplate, lineupFormation,
          lineupCloseupStyle: options.lineupCloseupStyle,
          lineupAnimationStyle: options.lineupAnimationStyle,
          lineupIntroStyle: options.lineupIntroStyle,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
          getMemberAssetUrl: seasonSquad.getMemberAssetUrl,
          getMemberNameById: seasonSquad.getMemberNameById,
        }),
        goal: () => generateGoalCelebration({
          matchData, seasonProjectId,
          goalScorerId: options.goalScorerId,
          goalScoreHome: options.goalScoreHome,
          goalScoreAway: options.goalScoreAway,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
        match_intro: () => generateMatchIntro({ matchData, seasonProjectId }),
      };

      if (videoGenerators[subtype]) {
        clearInterval(progressInterval);
        videoPoll.abortActiveVideoJobPoll();
        setProgress(10);
        const jobId = await videoGenerators[subtype]();
        videoPoll.setVideoJobId(jobId);
        setProgress(100);
        setCurrentStep('video_queued');
        const labels: Record<string, string> = {
          lineup: 'Lineup video staat in de wachtrij en wordt op de achtergrond verwerkt.',
          goal: 'Goal celebration staat in de wachtrij en wordt op de achtergrond verwerkt.',
          match_intro: 'Match intro staat in de wachtrij en wordt op de achtergrond verwerkt.',
        };
        pushToast({
          message: labels[subtype] || 'Video staat in de wachtrij.',
          type: 'info',
          icon: Clock,
          actions: [{ label: 'Naar queue', onClick: () => navigate('/approvals') }],
        });
        window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
        return;
      }

      // ── Generic AI generation (catch-all) ──
      const result = await generateGenericAI({
        selectedType, selectedTemplate, matchData, organisationId, assetType: null,
      });
      clearInterval(progressInterval);
      setGeneratedVariants(result.variants);
      if (result.generatedOutput) setGeneratedOutput(result.generatedOutput);
      setProgress(100);
      setTimeout(() => setCurrentStep('success'), 300);
    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
      if ((err as any)?.name === 'AbortError') return;
      console.error('[!] Generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      setCurrentStep('error');
    }
  };

  // ── Save handlers ───────────────────────────────────────

  const handleSaveVariantByIndex = async (variantIdx: number, opts?: { skipAutoClose?: boolean }) => {
    const variant = generatedVariants[variantIdx];
    if (!variant) return;

    setSavingAsset(true);
    try {
      const result = await saveGeneratedVariant({
        variant, variantIdx, totalVariants: generatedVariants.length,
        selectedType, selectedTemplate, assetType: null,
        matchData: matchDataForApi, organisationId,
      });

      setSavedVariantIndices(prev => new Set([...prev, variantIdx]));

      if (result.brand_asset_id || result.media_item_id) {
        const nextStorageInfo: NonNullable<GeneratedVariant['storage_info']> = variant.storage_info
          ? { ...variant.storage_info }
          : {
              storage_backend: 's3',
              storage_path: result.storage_path || variant.presigned_url || '',
              file_size_bytes: 0,
              mime_type: variant.mime_type || 'image/png',
            };

        if (result.storage_path) nextStorageInfo.storage_path = result.storage_path;
        if (result.file_asset_id) (nextStorageInfo as any).file_asset_id = result.file_asset_id;
        if (result.brand_asset_id) (nextStorageInfo as any).brand_asset_id = result.brand_asset_id;
        if (result.media_item_id) (nextStorageInfo as any).media_item_id = result.media_item_id;

        const updatedVariants = [...generatedVariants];
        updatedVariants[variantIdx] = { ...variant, storage_info: nextStorageInfo };
        setGeneratedVariants(updatedVariants);
      }

      if (!opts?.skipAutoClose && generatedVariants.length <= 1) {
        setSaveSuccess(true);
        const previewUrl = variant.presigned_url || generatedOutput?.presigned_url;
        pushToast({
          message: `${pendingContent?.label || 'Content'} opgeslagen!`,
          type: 'success',
          icon: CheckCircle,
          actions: [
            ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
            { label: 'Naar queue', onClick: () => navigate('/approvals') },
          ],
        });
        window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
        setTimeout(() => handleClose(), 1200);
      }
    } catch (err) {
      console.error(err);
      console.error(`[!] Failed to save variant ${variantIdx + 1}:`, err);
      setGenerationError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleSaveAsAsset = async () => { await handleSaveVariantByIndex(selectedVariantIndex); };

  const handleSaveAllAsAssets = async () => {
    setSavingAsset(true);
    setSaveSuccess(false);
    for (let i = 0; i < generatedVariants.length; i++) {
      if (savedVariantIndices.has(i)) continue;
      await handleSaveVariantByIndex(i, { skipAutoClose: true });
    }
    setSaveSuccess(true);
    setSavingAsset(false);
    const previewUrl = generatedVariants[0]?.presigned_url || generatedOutput?.presigned_url;
    pushToast({
      message: `${generatedVariants.length} varianten opgeslagen!`,
      type: 'success',
      icon: CheckCircle,
      actions: [
        ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
        { label: 'Naar queue', onClick: () => navigate('/approvals') },
      ],
    });
    window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
    setTimeout(() => handleClose(), 1200);
  };

  // ── Navigation handlers ─────────────────────────────────

  const handleBack = () => {
    if (currentStep === 'error') setCurrentStep('review');
    else if (currentStep === 'review') {
      if (pendingContent && HAS_OPTIONS_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('options');
      else if (pendingContent && LINEUP_REQUIRED_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('lineup');
      else setCurrentStep('content');
    }
    else if (currentStep === 'options') {
      if (pendingContent && LINEUP_REQUIRED_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('lineup');
      else setCurrentStep('content');
    }
    else if (currentStep === 'lineup') { setPendingContent(null); setCurrentStep('content'); }
    else if (currentStep === 'content') setCurrentStep('match');
    else handleClose();
  };

  const handleClose = () => {
    setCurrentStep('match');
    setSelectedMatch(null);
    setLineupSlots({ goalkeeper: [], player: [] });
    setSquadGroups({ goalkeeper: [], player: [] });
    setGuestPlayers([]);
    setEditingPosition(null);
    setPendingContent(null);
    setSelectedTemplate(null);
    setSelectedContentTypeLabel('');
    onClose();
  };

  // ── Title ───────────────────────────────────────────────

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'match': return 'Selecteer wedstrijd';
      case 'content': return 'Kies content';
      case 'lineup': return pendingContent ? `Opstelling — ${pendingContent.label}` : 'Opstelling';
      case 'options': return pendingContent?.label ? `${pendingContent.label} instellen` : 'Opties';
      case 'review': return 'Bevestig generatie';
      case 'generating': return 'Bezig met genereren...';
      case 'video_queued': return 'In de wachtrij';
      case 'success': return 'Content klaar';
      case 'error': return 'Fout opgetreden';
    }
  };

  // ── Guest player helpers ────────────────────────────────

  const addGuestPlayer = (name: string, jerseyNumber?: string) => {
    const guest: SquadMember = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user: { name },
      metadata: jerseyNumber ? { shirt_number: jerseyNumber } : undefined,
      isGuest: true,
    };
    setGuestPlayers(prev => [...prev, guest]);
  };

  const removeGuestPlayer = (guestId: string) => {
    setGuestPlayers(prev => prev.filter(g => g.id !== guestId));
    // Clear from lineup slots if assigned
    setLineupSlots(prev => ({
      goalkeeper: prev.goalkeeper.map(id => id === guestId ? '' : id).filter(Boolean),
      player: prev.player.map(id => id === guestId ? '' : id),
    }));
  };

  const getMemberById = (memberId: string) => allPlayers.find(m => m.id === memberId);
  const getMemberName = (memberId: string) => { const m = getMemberById(memberId); return m ? getSquadMemberName(m) : 'Onbekend'; };
  const getMemberJersey = (memberId: string) => { const m = getMemberById(memberId); const j = m?.metadata?.shirt_number || m?.data?.jersey_number; return j ? String(j) : null; };

  return {
    navigate,
    // Step
    currentStep, setCurrentStep, selectedMatch, setSelectedMatch,
    // Lineup
    lineupSlots, lineupFormation, setLineupFormation, squadGroups, squadLoading,
    editingPosition, setEditingPosition, lineupSaving,
    filledPositions, totalPositions, allPlayers,
    // Content
    selectedContentPhase, setSelectedContentPhase, pendingContent,
    selectedTemplate, selectedContentTypeLabel,
    selectedType, isLineupFlow,
    // Options (from useContentOptions sub-hook)
    options,
    // Generation state
    progress, generationError, generatedOutput,
    generatedVariants, selectedVariantIndex, setSelectedVariantIndex,
    savingAsset, saveSuccess, savedVariantIndices,
    // Season squad (for MembersStep and generation APIs)
    seasonSquad,
    // Video job polling
    videoPoll,
    // Team names
    homeTeamName, awayTeamName,
    // Match data for API (also used as props for step components)
    matchDataForApi, organisationId,
    // Errors
    matchesError, templatesError, squadError, saveError,
    // Matches
    matchesLoading, upcomingMatches,
    // Handlers
    handleSelectPlayer, handleContentSelect, handleLineupConfirm,
    handleOptionsConfirm, handleReviewConfirm,
    handleGenerate, handleSaveAsAsset, handleSaveAllAsAssets, handleSaveVariantByIndex,
    handleBack, handleClose,
    // Guest players
    guestPlayers, addGuestPlayer, removeGuestPlayer,
    // Helpers
    getStepTitle, getMemberName, getMemberJersey, getMemberById,
    // Retry
    retrySquad: fetchSquad, retryTemplates: fetchTemplates,
  };
}
