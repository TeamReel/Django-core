/** useMatchWizardData — Slim orchestrator for MatchWizard state & handlers. */
import { useState, useEffect, useRef, useMemo } from 'react';
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

export type { UseMatchWizardDataReturn } from './matchWizardTypes';

export function useMatchWizardData(
  isOpen: boolean, onClose: () => void, initialMatchId?: string,
): UseMatchWizardDataReturn {
  const navigate = useNavigate();
  const { pushToast } = useToast();

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
  const { activities, loading: matchesLoading, error: matchesLoadError } = useActivities({ limit: 10 });
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const matchesError = matchesLoadError ? 'Kon wedstrijden niet laden. Controleer je verbinding.' : null;
  const [pendingContent, setPendingContent] = useState<{ key: string; label: string; subtype: string; templateType: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedContentTypeLabel, setSelectedContentTypeLabel] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [progress, setProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [savingAsset, setSavingAsset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedVariantIndices, setSavedVariantIndices] = useState<Set<number>>(new Set());

  const matchDataForApi = useMemo(() => selectedMatch ? {
    id: String(selectedMatch.id), title: selectedMatch.title, project: selectedMatch.project,
    opponent_project: selectedMatch.opponent_project ?? undefined,
    participations: selectedMatch.participations,
    start_time: selectedMatch.start_time, location: selectedMatch.location,
    metadata: { ...(selectedMatch.metadata || {}), formation: lineupFormation,
      lineup: { formation: lineupFormation, goalkeeper: lineupSlots.goalkeeper, player: lineupSlots.player } },
  } : null, [selectedMatch, lineupFormation, lineupSlots]);

  const options = useContentOptions({ isOpen, matchData: matchDataForApi });
  useEffect(() => { options.setLineupFormation(lineupFormation); }, [lineupFormation]);

  const projectId = selectedMatch?.project?.id || undefined;
  const seasonSquad = useSeasonSquadData({ isOpen: isOpen && !!selectedMatch, projectId: projectId ? String(projectId) : null, seasonId: null, selectedTemplate });

  const lineupSlotsRef = useRef(lineupSlots);
  lineupSlotsRef.current = lineupSlots;
  useEffect(() => {
    if (selectedMatch && ['options', 'review', 'generating'].includes(currentStep))
      seasonSquad.setSelectedMembers({ goalkeeper: lineupSlotsRef.current.goalkeeper.filter(Boolean), player: lineupSlotsRef.current.player.filter(Boolean), coach: [], assistant: [] });
  }, [currentStep, selectedMatch]);
  const videoPoll = useVideoJobPolling({ isOpen, step: currentStep, onGenerated: undefined });

  const upcomingMatches = activities.filter(a => a.activity_type.toLowerCase().includes('match') && new Date(a.start_time) > new Date());
  const allPlayers = [...(squadGroups.goalkeeper || []), ...(squadGroups.player || []), ...guestPlayers];
  const filledPositions = lineupSlots.goalkeeper.filter(Boolean).length + lineupSlots.player.filter(Boolean).length;
  const totalPositions = POSITIONS.length;
  const selectedType = useMemo(() => pendingContent
    ? { type: pendingContent.templateType, subtype: pendingContent.subtype, label: pendingContent.label } : null, [pendingContent]);
  const isLineupFlow = pendingContent ? ['lineup', 'lineup_flyer', 'poster'].includes(pendingContent.subtype) : false;
  const homeTeamName = matchDataForApi?.project?.name || 'Thuis';
  const awayTeamName = matchDataForApi?.opponent_project?.name || 'Uit';
  const organisationId = selectedMatch?.project?.organisation_id || selectedMatch?.organisation?.id || null;

  useEffect(() => {
    if (!isOpen || selectedMatch) return;
    if (initialMatchId) {
      const m = activities.find(a => a.id === initialMatchId || a.slug === initialMatchId);
      if (m) { setSelectedMatch(m); setCurrentStep('content'); }
      else if (!matchesLoading) {
        api.get<any>(`/activities/${encodeURIComponent(initialMatchId)}/`)
          .then(data => { if (data?.id) { setSelectedMatch(data as Activity); setCurrentStep('content'); } })
          .catch(err => console.error('[MatchWizard] Failed to fetch match by id:', err));
      }
    } else if (upcomingMatches.length > 0) setSelectedMatch(upcomingMatches[0]);
  }, [isOpen, activities, initialMatchId, upcomingMatches, selectedMatch, matchesLoading]);

  // Reset when wizard closes
  useEffect(() => {
    if (isOpen) return;
    setSelectedMatch(null); setCurrentStep('match'); setSelectedContentPhase('pre');
    setPendingContent(null); setSelectedTemplate(null); setSelectedContentTypeLabel('');
    setProgress(0); setGenerationError(null); setGeneratedOutput(null);
    setGeneratedVariants([]); setSelectedVariantIndex(0);
    setSavingAsset(false); setSaveSuccess(false); setSavedVariantIndices(new Set());
    videoPoll.resetVideo();
  }, [isOpen]);

  // Load saved lineup from match metadata
  useEffect(() => {
    if (!selectedMatch) return;
    const s = selectedMatch.metadata?.lineup as { formation?: string; goalkeeper?: string[]; player?: string[] } | undefined;
    if (s) {
      if (s.formation) setLineupFormation(s.formation);
      if (s.goalkeeper || s.player) setLineupSlots({ goalkeeper: s.goalkeeper || [], player: s.player || [] });
    } else if (selectedMatch.metadata?.formation) setLineupFormation(String(selectedMatch.metadata.formation));
  }, [selectedMatch]);

  useEffect(() => { if (selectedMatch && currentStep === 'lineup') fetchSquad(); }, [selectedMatch, currentStep]);
  useEffect(() => { if (selectedMatch && currentStep === 'content') fetchTemplates(); }, [selectedMatch, currentStep]);

  const fetchSquad = async () => {
    const pid = selectedMatch?.project?.id;
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
    if (!selectedMatch) return;
    setLineupSaving(true); setSaveError(null);
    try { await saveLineupToApi(String(selectedMatch.slug || selectedMatch.id), selectedMatch.metadata || {}, lineupFormation, lineupSlots); }
    catch { setSaveError('Opslaan mislukt. Probeer opnieuw.'); }
    finally { setLineupSaving(false); }
  };
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
    setSelectedTemplate(resolveTemplate(availableTemplates, subtype, lineupFormation));
    if (LINEUP_REQUIRED_SUBTYPES.has(subtype)) setCurrentStep('lineup');
    else if (HAS_OPTIONS_SUBTYPES.has(subtype)) setCurrentStep('options');
    else setCurrentStep('review');
  };
  const handleLineupConfirm = () => {
    saveLineup();
    if (pendingContent && HAS_OPTIONS_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('options');
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
        subtype: pendingContent?.subtype || '', pendingContent, lineupFormation, lineupSlots,
        projectId: projectId ? String(projectId) : undefined,
        matchDataForApi, seasonSquad, options, selectedTemplate, selectedType, organisationId,
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
    const variant = generatedVariants[variantIdx];
    if (!variant) return;
    setSavingAsset(true);
    try {
      const { updatedVariant } = await executeSaveVariant({
        variant, variantIdx, totalVariants: generatedVariants.length,
        selectedType, selectedTemplate, matchDataForApi, organisationId, assetType: null,
      });
      setSavedVariantIndices(prev => new Set([...prev, variantIdx]));
      if (updatedVariant !== variant) {
        const arr = [...generatedVariants]; arr[variantIdx] = updatedVariant; setGeneratedVariants(arr);
      }
      if (!opts?.skipAutoClose && generatedVariants.length <= 1) {
        setSaveSuccess(true);
        _saveToast(`${pendingContent?.label || 'Content'} opgeslagen!`, variant.presigned_url || generatedOutput?.presigned_url);
        setTimeout(() => handleClose(), 1200);
      }
    } catch (err) {
      console.error(`[!] Failed to save variant ${variantIdx + 1}:`, err);
      setGenerationError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally { setSavingAsset(false); }
  };
  const handleSaveAsAsset = async () => { await handleSaveVariantByIndex(selectedVariantIndex); };
  const handleSaveAllAsAssets = async () => {
    setSavingAsset(true); setSaveSuccess(false);
    for (let i = 0; i < generatedVariants.length; i++) {
      if (!savedVariantIndices.has(i)) await handleSaveVariantByIndex(i, { skipAutoClose: true });
    }
    setSaveSuccess(true); setSavingAsset(false);
    _saveToast(`${generatedVariants.length} varianten opgeslagen!`, generatedVariants[0]?.presigned_url || generatedOutput?.presigned_url);
    setTimeout(() => handleClose(), 1200);
  };
  const handleBack = () => {
    if (currentStep === 'error') setCurrentStep('review');
    else if (currentStep === 'review') {
      if (pendingContent && HAS_OPTIONS_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('options');
      else if (pendingContent && LINEUP_REQUIRED_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('lineup');
      else setCurrentStep('content');
    } else if (currentStep === 'options') {
      if (pendingContent && LINEUP_REQUIRED_SUBTYPES.has(pendingContent.subtype)) setCurrentStep('lineup');
      else setCurrentStep('content');
    } else if (currentStep === 'lineup') { setPendingContent(null); setCurrentStep('content'); }
    else if (currentStep === 'content') setCurrentStep('match');
    else handleClose();
  };
  const handleClose = () => {
    setCurrentStep('match'); setSelectedMatch(null);
    setLineupSlots({ goalkeeper: [], player: [] }); setSquadGroups({ goalkeeper: [], player: [] });
    setGuestPlayers([]); setEditingPosition(null);
    setPendingContent(null); setSelectedTemplate(null); setSelectedContentTypeLabel('');
    onClose();
  };

  const STEP_TITLES: Record<WizardStep, string> = {
    match: 'Selecteer wedstrijd', content: 'Kies content',
    lineup: pendingContent ? `Opstelling — ${pendingContent.label}` : 'Opstelling',
    options: pendingContent?.label ? `${pendingContent.label} instellen` : 'Opties',
    review: 'Bevestig generatie', generating: 'Bezig met genereren...',
    video_queued: 'In de wachtrij', success: 'Content klaar', error: 'Fout opgetreden',
  };
  const getStepTitle = (): string => STEP_TITLES[currentStep];

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
    currentStep, setCurrentStep, selectedMatch, setSelectedMatch,
    lineupSlots, lineupFormation, setLineupFormation, squadGroups, squadLoading,
    editingPosition, setEditingPosition, lineupSaving, filledPositions, totalPositions, allPlayers,
    selectedContentPhase, setSelectedContentPhase, pendingContent,
    selectedTemplate, selectedContentTypeLabel, selectedType, isLineupFlow,
    options,
    progress, generationError, generatedOutput,
    generatedVariants, selectedVariantIndex, setSelectedVariantIndex,
    savingAsset, saveSuccess, savedVariantIndices,
    seasonSquad, videoPoll,
    homeTeamName, awayTeamName, matchDataForApi, organisationId,
    matchesError, templatesError, squadError, saveError,
    matchesLoading, upcomingMatches,
    handleSelectPlayer, handleContentSelect, handleLineupConfirm,
    handleOptionsConfirm, handleReviewConfirm,
    handleGenerate, handleSaveAsAsset, handleSaveAllAsAssets, handleSaveVariantByIndex,
    handleBack, handleClose,
    guestPlayers, addGuestPlayer, removeGuestPlayer,
    getStepTitle, getMemberName, getMemberJersey, getMemberById,
    retrySquad: fetchSquad, retryTemplates: fetchTemplates,
  };
}
