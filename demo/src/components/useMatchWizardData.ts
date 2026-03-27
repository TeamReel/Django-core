/** useMatchWizardData — Slim orchestrator for MatchWizard state & handlers. */
import { useReducer, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities, Activity } from '../hooks/useActivities';
import { api } from '@/api';
import { useToast } from '../components/ui/Toast';
import { CheckCircle } from 'lucide-react';
import type { ContentTemplate, GeneratedOutput, GeneratedVariant } from '../pages/identity/ContentGenerationModal/types';
import { useSeasonSquadData } from '../pages/identity/ContentGenerationModal/useSeasonSquadData';
import { useVideoJobPolling } from '../pages/identity/ContentGenerationModal/useVideoJobPolling';
import { useContentOptions } from '../pages/identity/ContentGenerationModal/useContentOptions';
import {
  WizardStep, ContentPhase, SquadMember,
  LINEUP_REQUIRED_SUBTYPES, HAS_OPTIONS_SUBTYPES, POSITIONS, getSquadMemberName,
} from './matchWizardTypes';
import type { UseMatchWizardDataReturn } from './matchWizardTypes';
import { fetchSquadMembers, fetchContentTemplates, saveLineupToApi, resolveTemplate } from './matchWizardFetchers';
import { executeGeneration } from './matchWizardGeneration';
import { executeSaveVariant } from './matchWizardSaving';
import { logger } from '@/utils/logger';
import { formReducer, makeSetter } from '@/utils/formReducer';

export type { UseMatchWizardDataReturn } from './matchWizardTypes';

// ── State interface ──────────────────────────────────────────────────────────

interface WizardState {
  currentStep: WizardStep;
  selectedMatch: Activity | null;
  lineupSlots: { goalkeeper: string[]; player: string[] };
  lineupFormation: string;
  squadGroups: Record<string, SquadMember[]>;
  guestPlayers: SquadMember[];
  squadLoading: boolean;
  selectedContentPhase: ContentPhase;
  editingPosition: number | null;
  lineupSaving: boolean;
  templatesError: string | null;
  squadError: string | null;
  saveError: string | null;
  pendingContent: { key: string; label: string; subtype: string; templateType: string } | null;
  selectedTemplate: ContentTemplate | null;
  selectedContentTypeLabel: string;
  availableTemplates: Record<string, ContentTemplate[]>;
  progress: number;
  generationError: string | null;
  generatedOutput: GeneratedOutput | null;
  generatedVariants: GeneratedVariant[];
  selectedVariantIndex: number;
  savingAsset: boolean;
  saveSuccess: boolean;
  savedVariantIndices: Set<number>;
}

const initialWizardState: WizardState = {
  currentStep: 'match', selectedMatch: null,
  lineupSlots: { goalkeeper: [], player: [] }, lineupFormation: '4-3-3',
  squadGroups: { goalkeeper: [], player: [] }, guestPlayers: [],
  squadLoading: false, selectedContentPhase: 'pre',
  editingPosition: null, lineupSaving: false,
  templatesError: null, squadError: null, saveError: null,
  pendingContent: null, selectedTemplate: null, selectedContentTypeLabel: '',
  availableTemplates: {}, progress: 0, generationError: null,
  generatedOutput: null, generatedVariants: [], selectedVariantIndex: 0,
  savingAsset: false, saveSuccess: false, savedVariantIndices: new Set(),
};

export function useMatchWizardData(
  isOpen: boolean, onClose: () => void, initialMatchId?: string,
): UseMatchWizardDataReturn {
  const navigate = useNavigate();
  const { pushToast } = useToast();

  /* ── Reducer state ── */
  const [s, dispatch] = useReducer(formReducer<WizardState>, initialWizardState);

  /* ── Backward-compatible setters ── */
  const setCurrentStep = useMemo(() => makeSetter<WizardState, 'currentStep'>(dispatch, 'currentStep'), [dispatch]);
  const setSelectedMatch = useMemo(() => makeSetter<WizardState, 'selectedMatch'>(dispatch, 'selectedMatch'), [dispatch]);
  const setLineupSlots = useMemo(() => makeSetter<WizardState, 'lineupSlots'>(dispatch, 'lineupSlots'), [dispatch]);
  const setLineupFormation = useMemo(() => makeSetter<WizardState, 'lineupFormation'>(dispatch, 'lineupFormation'), [dispatch]);
  const setSquadGroups = useMemo(() => makeSetter<WizardState, 'squadGroups'>(dispatch, 'squadGroups'), [dispatch]);
  const setGuestPlayers = useMemo(() => makeSetter<WizardState, 'guestPlayers'>(dispatch, 'guestPlayers'), [dispatch]);
  const setSquadLoading = useMemo(() => makeSetter<WizardState, 'squadLoading'>(dispatch, 'squadLoading'), [dispatch]);
  const setSelectedContentPhase = useMemo(() => makeSetter<WizardState, 'selectedContentPhase'>(dispatch, 'selectedContentPhase'), [dispatch]);
  const setEditingPosition = useMemo(() => makeSetter<WizardState, 'editingPosition'>(dispatch, 'editingPosition'), [dispatch]);
  const setLineupSaving = useMemo(() => makeSetter<WizardState, 'lineupSaving'>(dispatch, 'lineupSaving'), [dispatch]);
  const setTemplatesError = useMemo(() => makeSetter<WizardState, 'templatesError'>(dispatch, 'templatesError'), [dispatch]);
  const setSquadError = useMemo(() => makeSetter<WizardState, 'squadError'>(dispatch, 'squadError'), [dispatch]);
  const setSaveError = useMemo(() => makeSetter<WizardState, 'saveError'>(dispatch, 'saveError'), [dispatch]);
  const setPendingContent = useMemo(() => makeSetter<WizardState, 'pendingContent'>(dispatch, 'pendingContent'), [dispatch]);
  const setSelectedTemplate = useMemo(() => makeSetter<WizardState, 'selectedTemplate'>(dispatch, 'selectedTemplate'), [dispatch]);
  const setSelectedContentTypeLabel = useMemo(() => makeSetter<WizardState, 'selectedContentTypeLabel'>(dispatch, 'selectedContentTypeLabel'), [dispatch]);
  const setAvailableTemplates = useMemo(() => makeSetter<WizardState, 'availableTemplates'>(dispatch, 'availableTemplates'), [dispatch]);
  const setProgress = useMemo(() => makeSetter<WizardState, 'progress'>(dispatch, 'progress'), [dispatch]);
  const setGenerationError = useMemo(() => makeSetter<WizardState, 'generationError'>(dispatch, 'generationError'), [dispatch]);
  const setGeneratedOutput = useMemo(() => makeSetter<WizardState, 'generatedOutput'>(dispatch, 'generatedOutput'), [dispatch]);
  const setGeneratedVariants = useMemo(() => makeSetter<WizardState, 'generatedVariants'>(dispatch, 'generatedVariants'), [dispatch]);
  const setSelectedVariantIndex = useMemo(() => makeSetter<WizardState, 'selectedVariantIndex'>(dispatch, 'selectedVariantIndex'), [dispatch]);
  const setSavingAsset = useMemo(() => makeSetter<WizardState, 'savingAsset'>(dispatch, 'savingAsset'), [dispatch]);
  const setSaveSuccess = useMemo(() => makeSetter<WizardState, 'saveSuccess'>(dispatch, 'saveSuccess'), [dispatch]);
  const setSavedVariantIndices = useMemo(() => makeSetter<WizardState, 'savedVariantIndices'>(dispatch, 'savedVariantIndices'), [dispatch]);

  const { activities, loading: matchesLoading, error: matchesLoadError } = useActivities({ limit: 10 });
  const matchesError = matchesLoadError ? 'Kon wedstrijden niet laden. Controleer je verbinding.' : null;

  const matchDataForApi = useMemo(() => s.selectedMatch ? {
    id: String(s.selectedMatch.id), title: s.selectedMatch.title, project: s.selectedMatch.project,
    opponent_project: s.selectedMatch.opponent_project ?? undefined,
    participations: s.selectedMatch.participations,
    start_time: s.selectedMatch.start_time, location: s.selectedMatch.location,
    metadata: { ...(s.selectedMatch.metadata || {}), formation: s.lineupFormation,
      lineup: { formation: s.lineupFormation, goalkeeper: s.lineupSlots.goalkeeper, player: s.lineupSlots.player } },
  } : null, [s.selectedMatch, s.lineupFormation, s.lineupSlots]);

  const options = useContentOptions({ isOpen, matchData: matchDataForApi });
  useEffect(() => { options.setLineupFormation(s.lineupFormation); }, [s.lineupFormation]);

  const projectId = s.selectedMatch?.project?.id || undefined;
  const seasonSquad = useSeasonSquadData({ isOpen: isOpen && !!s.selectedMatch, projectId: projectId ? String(projectId) : null, seasonId: null, selectedTemplate: s.selectedTemplate });

  const lineupSlotsRef = useRef(s.lineupSlots);
  lineupSlotsRef.current = s.lineupSlots;
  useEffect(() => {
    if (s.selectedMatch && ['options', 'review', 'generating'].includes(s.currentStep))
      seasonSquad.setSelectedMembers({ goalkeeper: lineupSlotsRef.current.goalkeeper.filter(Boolean), player: lineupSlotsRef.current.player.filter(Boolean), coach: [], assistant: [] });
  }, [s.currentStep, s.selectedMatch]);
  const videoPoll = useVideoJobPolling({ isOpen, step: s.currentStep, onGenerated: undefined });

  const upcomingMatches = activities.filter(a => a.activity_type.toLowerCase().includes('match') && new Date(a.start_time) > new Date());
  const allPlayers = [...(s.squadGroups.goalkeeper || []), ...(s.squadGroups.player || []), ...s.guestPlayers];
  const filledPositions = s.lineupSlots.goalkeeper.filter(Boolean).length + s.lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS.length;
  const selectedType = useMemo(() => s.pendingContent
    ? { type: s.pendingContent.templateType, subtype: s.pendingContent.subtype, label: s.pendingContent.label } : null, [s.pendingContent]);
  const isLineupFlow = s.pendingContent ? ['lineup', 'lineup_flyer', 'poster'].includes(s.pendingContent.subtype) : false;
  const homeTeamName = matchDataForApi?.project?.name || 'Thuis';
  const awayTeamName = matchDataForApi?.opponent_project?.name || 'Uit';
  const organisationId = s.selectedMatch?.project?.organisation_id || s.selectedMatch?.organisation?.id || null;

  useEffect(() => {
    if (!isOpen || s.selectedMatch) return;
    if (initialMatchId) {
      const m = activities.find(a => a.id === initialMatchId || a.slug === initialMatchId);
      if (m) { setSelectedMatch(m); setCurrentStep('content'); }
      else if (!matchesLoading) {
        api.get<Activity>(`/activities/${encodeURIComponent(initialMatchId)}/`)
          .then(data => { if (data?.id) { setSelectedMatch(data as Activity); setCurrentStep('content'); } })
          .catch(err => logger.error('[MatchWizard] Failed to fetch match by id', err));
      }
    } else if (upcomingMatches.length > 0) setSelectedMatch(upcomingMatches[0]);
  }, [isOpen, activities, initialMatchId, upcomingMatches, s.selectedMatch, matchesLoading]);

  // Reset when wizard closes
  useEffect(() => {
    if (isOpen) return;
    dispatch({
      type: 'patch',
      payload: {
        selectedMatch: null, currentStep: 'match', selectedContentPhase: 'pre',
        pendingContent: null, selectedTemplate: null, selectedContentTypeLabel: '',
        progress: 0, generationError: null, generatedOutput: null,
        generatedVariants: [], selectedVariantIndex: 0,
        savingAsset: false, saveSuccess: false, savedVariantIndices: new Set(),
      },
    });
    videoPoll.resetVideo();
  }, [isOpen]);

  // Load saved lineup from match metadata
  useEffect(() => {
    if (!s.selectedMatch) return;
    const meta = s.selectedMatch.metadata?.lineup as { formation?: string; goalkeeper?: string[]; player?: string[] } | undefined;
    if (meta) {
      if (meta.formation) setLineupFormation(meta.formation);
      if (meta.goalkeeper || meta.player) setLineupSlots({ goalkeeper: meta.goalkeeper || [], player: meta.player || [] });
    } else if (s.selectedMatch.metadata?.formation) setLineupFormation(String(s.selectedMatch.metadata.formation));
  }, [s.selectedMatch]);

  useEffect(() => { if (s.selectedMatch && s.currentStep === 'lineup') fetchSquad(); }, [s.selectedMatch, s.currentStep]);
  useEffect(() => { if (s.selectedMatch && s.currentStep === 'content') fetchTemplates(); }, [s.selectedMatch, s.currentStep]);

  const fetchSquad = async () => {
    const pid = s.selectedMatch?.project?.id;
    if (!pid) return;
    setSquadLoading(true); setSquadError(null);
    try { setSquadGroups(await fetchSquadMembers(String(pid))); }
    catch { setSquadError('Kon spelers niet laden. Controleer je verbinding.'); }
    finally { setSquadLoading(false); }
  };

  const fetchTemplates = async () => {
    setTemplatesError(null);
    try { setAvailableTemplates(await fetchContentTemplates()); }
    catch { setTemplatesError('Kon sjablonen niet laden. Controleer je verbinding.'); }
  };

  const saveLineup = async () => {
    if (!s.selectedMatch) return;
    setLineupSaving(true); setSaveError(null);
    try { await saveLineupToApi(String(s.selectedMatch.slug || s.selectedMatch.id), s.selectedMatch.metadata || {}, s.lineupFormation, s.lineupSlots); }
    catch { setSaveError('Opslaan mislukt. Probeer opnieuw.'); }
    finally { setLineupSaving(false); }
  };
  const handleSelectPlayer = (positionIdx: number, isGoalkeeper: boolean, memberId: string | null) => {
    if (isGoalkeeper) {
      const newGk = [...s.lineupSlots.goalkeeper];
      newGk[positionIdx] = memberId || '';
      setLineupSlots({ ...s.lineupSlots, goalkeeper: newGk.filter(Boolean) as string[] });
    } else {
      const newPlayers = [...s.lineupSlots.player];
      while (newPlayers.length <= positionIdx) newPlayers.push('');
      newPlayers[positionIdx] = memberId || '';
      setLineupSlots({ ...s.lineupSlots, player: newPlayers });
    }
    setEditingPosition(null);
  };
  const handleContentSelect = (contentKey: string, contentLabel: string, subtype: string, templateType: string) => {
    if (!s.selectedMatch) return;
    setPendingContent({ key: contentKey, label: contentLabel, subtype, templateType });
    setSelectedContentTypeLabel(contentLabel);
    setSelectedTemplate(resolveTemplate(s.availableTemplates, subtype, s.lineupFormation));
    if (LINEUP_REQUIRED_SUBTYPES.has(subtype)) setCurrentStep('lineup');
    else if (HAS_OPTIONS_SUBTYPES.has(subtype)) setCurrentStep('options');
    else setCurrentStep('review');
  };
  const handleLineupConfirm = () => {
    saveLineup();
    if (s.pendingContent && HAS_OPTIONS_SUBTYPES.has(s.pendingContent.subtype)) setCurrentStep('options');
    else setCurrentStep('review');
  };

  const handleOptionsConfirm = () => { setCurrentStep('review'); };
  const handleReviewConfirm = () => { handleGenerate(); };
  const handleGenerate = async () => {
    setCurrentStep('generating'); setGenerationError(null); setGeneratedOutput(null);
    setGeneratedVariants([]); setSelectedVariantIndex(0);
    setSaveSuccess(false); setSavedVariantIndices(new Set());
    videoPoll.resetVideo();
    await executeGeneration(
      {
        subtype: s.pendingContent?.subtype || '', pendingContent: s.pendingContent, lineupFormation: s.lineupFormation, lineupSlots: s.lineupSlots,
        projectId: projectId ? String(projectId) : undefined,
        matchDataForApi, seasonSquad, options, selectedTemplate: s.selectedTemplate, selectedType, organisationId,
      },
      {
        setCurrentStep, setProgress, setGenerationError, setGeneratedOutput, setGeneratedVariants,
        setVideoJobId: videoPoll.setVideoJobId, abortActiveVideoJobPoll: videoPoll.abortActiveVideoJobPoll,
        resetVideo: videoPoll.resetVideo, pushToast, navigate,
      },
    );
  };

  const _saveToast = (msg: string, previewUrl?: string | null) => {
    pushToast({ message: msg, type: 'success', icon: CheckCircle, actions: [
      ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
      { label: 'Naar queue', onClick: () => navigate('/approvals') },
    ] });
    window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
  };

  const handleSaveVariantByIndex = async (variantIdx: number, opts?: { skipAutoClose?: boolean }) => {
    const variant = s.generatedVariants[variantIdx];
    if (!variant) return;
    setSavingAsset(true);
    try {
      const { updatedVariant } = await executeSaveVariant({
        variant, variantIdx, totalVariants: s.generatedVariants.length,
        selectedType, selectedTemplate: s.selectedTemplate, matchDataForApi, organisationId, assetType: null,
      });
      setSavedVariantIndices(prev => new Set([...prev, variantIdx]));
      if (updatedVariant !== variant) {
        const arr = [...s.generatedVariants]; arr[variantIdx] = updatedVariant; setGeneratedVariants(arr);
      }
      if (!opts?.skipAutoClose && s.generatedVariants.length <= 1) {
        setSaveSuccess(true);
        _saveToast(`${s.pendingContent?.label || 'Content'} opgeslagen!`, variant.presigned_url || s.generatedOutput?.presigned_url);
        setTimeout(() => handleClose(), 1200);
      }
    } catch (err) {
      logger.error(`[!] Failed to save variant ${variantIdx + 1}`, err);
      setGenerationError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally { setSavingAsset(false); }
  };
  const handleSaveAsAsset = async () => { await handleSaveVariantByIndex(s.selectedVariantIndex); };
  const handleSaveAllAsAssets = async () => {
    setSavingAsset(true); setSaveSuccess(false);
    for (let i = 0; i < s.generatedVariants.length; i++) {
      if (!s.savedVariantIndices.has(i)) await handleSaveVariantByIndex(i, { skipAutoClose: true });
    }
    setSaveSuccess(true); setSavingAsset(false);
    _saveToast(`${s.generatedVariants.length} varianten opgeslagen!`, s.generatedVariants[0]?.presigned_url || s.generatedOutput?.presigned_url);
    setTimeout(() => handleClose(), 1200);
  };
  const handleBack = () => {
    if (s.currentStep === 'error') setCurrentStep('review');
    else if (s.currentStep === 'review') {
      if (s.pendingContent && HAS_OPTIONS_SUBTYPES.has(s.pendingContent.subtype)) setCurrentStep('options');
      else if (s.pendingContent && LINEUP_REQUIRED_SUBTYPES.has(s.pendingContent.subtype)) setCurrentStep('lineup');
      else setCurrentStep('content');
    } else if (s.currentStep === 'options') {
      if (s.pendingContent && LINEUP_REQUIRED_SUBTYPES.has(s.pendingContent.subtype)) setCurrentStep('lineup');
      else setCurrentStep('content');
    } else if (s.currentStep === 'lineup') { setPendingContent(null); setCurrentStep('content'); }
    else if (s.currentStep === 'content') setCurrentStep('match');
    else handleClose();
  };
  const handleClose = () => {
    dispatch({ type: 'patch', payload: {
      currentStep: 'match', selectedMatch: null,
      lineupSlots: { goalkeeper: [], player: [] }, squadGroups: { goalkeeper: [], player: [] },
      guestPlayers: [], editingPosition: null,
      pendingContent: null, selectedTemplate: null, selectedContentTypeLabel: '',
    } });
    onClose();
  };

  const STEP_TITLES: Record<WizardStep, string> = {
    match: 'Selecteer wedstrijd', content: 'Kies content',
    lineup: s.pendingContent ? `Opstelling — ${s.pendingContent.label}` : 'Opstelling',
    options: s.pendingContent?.label ? `${s.pendingContent.label} instellen` : 'Opties',
    review: 'Bevestig generatie', generating: 'Bezig met genereren...',
    video_queued: 'In de wachtrij', success: 'Content klaar', error: 'Fout opgetreden',
  };
  const getStepTitle = (): string => STEP_TITLES[s.currentStep];

  const addGuestPlayer = (name: string, jerseyNumber?: string) => {
    setGuestPlayers(prev => [...prev, {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user: { name }, metadata: jerseyNumber ? { shirt_number: jerseyNumber } : undefined, isGuest: true,
    }]);
  };
  const removeGuestPlayer = (guestId: string) => {
    setGuestPlayers(prev => prev.filter(g => g.id !== guestId));
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
    currentStep: s.currentStep, setCurrentStep, selectedMatch: s.selectedMatch, setSelectedMatch,
    lineupSlots: s.lineupSlots, lineupFormation: s.lineupFormation, setLineupFormation, squadGroups: s.squadGroups, squadLoading: s.squadLoading,
    editingPosition: s.editingPosition, setEditingPosition, lineupSaving: s.lineupSaving, filledPositions, totalPositions, allPlayers,
    selectedContentPhase: s.selectedContentPhase, setSelectedContentPhase, pendingContent: s.pendingContent,
    selectedTemplate: s.selectedTemplate, selectedContentTypeLabel: s.selectedContentTypeLabel, selectedType, isLineupFlow,
    options,
    progress: s.progress, generationError: s.generationError, generatedOutput: s.generatedOutput,
    generatedVariants: s.generatedVariants, selectedVariantIndex: s.selectedVariantIndex, setSelectedVariantIndex,
    savingAsset: s.savingAsset, saveSuccess: s.saveSuccess, savedVariantIndices: s.savedVariantIndices,
    seasonSquad, videoPoll,
    homeTeamName, awayTeamName, matchDataForApi, organisationId,
    matchesError, templatesError: s.templatesError, squadError: s.squadError, saveError: s.saveError,
    matchesLoading, upcomingMatches,
    handleSelectPlayer, handleContentSelect, handleLineupConfirm,
    handleOptionsConfirm, handleReviewConfirm,
    handleGenerate, handleSaveAsAsset, handleSaveAllAsAssets, handleSaveVariantByIndex,
    handleBack, handleClose,
    guestPlayers: s.guestPlayers, addGuestPlayer, removeGuestPlayer,
    getStepTitle, getMemberName, getMemberJersey, getMemberById,
    retrySquad: fetchSquad, retryTemplates: fetchTemplates,
  };
}
