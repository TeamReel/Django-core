/**
 * MatchWizardV2 – Main orchestrator
 *
 * Combines the generic Wizard system (WizardProvider + WizardShell)
 * with the domain-specific MatchWizardProvider to create a clean,
 * modular match content creation wizard.
 *
 * Flow: match → content → lineup → options → review → generating → result
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';

import { WizardProvider, WizardStep, WizardShell, type WizardStepConfig } from '../Wizard';
import { MatchWizardProvider, useMatchWizard } from './MatchWizardContext';
import {
  MatchSelectStep,
  ContentTypeStep,
  LineupStep,
  OptionsStep,
  ReviewStep,
} from './steps';
import { GeneratingStep } from '../../pages/identity/ContentGenerationModal/GeneratingStep';
import { VideoQueuedStep } from '../../pages/identity/ContentGenerationModal/VideoQueuedStep';
import { SuccessStep } from '../../pages/identity/ContentGenerationModal/SuccessStep';
import ErrorStep from '../../pages/identity/ContentGenerationModal/ErrorStep';
import type { ContentTemplate, GeneratedVariant, GeneratedOutput } from '../../pages/identity/ContentGenerationModal/types';

import { useContentOptions } from '../../pages/identity/ContentGenerationModal/useContentOptions';
import { useSeasonSquadData } from '../../pages/identity/ContentGenerationModal/useSeasonSquadData';
import { useVideoJobPolling } from '../../pages/identity/ContentGenerationModal/useVideoJobPolling';
import {
  generateLineupFlyer,
  generateTeamPoster,
  generateMatchFlyer,
  generateMatchSummary,
  generateGenericAI,
  saveGeneratedVariant,
} from '../../pages/identity/ContentGenerationModal/contentGenerationApi';
import {
  generateLineupVideo,
  generateGoalCelebration,
  generateMatchIntro,
} from '../../pages/identity/ContentGenerationModal/contentGenerationVideoApi';
import { useToast } from '../ui/Toast';

// ─── Wizard step configuration ────────────────────────────

const WIZARD_STEPS: WizardStepConfig[] = [
  { id: 'match', title: 'Selecteer wedstrijd', showBack: false },
  { id: 'content', title: 'Kies content' },
  { id: 'lineup', title: 'Opstelling' },
  { id: 'options', title: 'Opties' },
  { id: 'review', title: 'Bevestig generatie' },
  { id: 'generating', title: 'Bezig met genereren...', showBack: false },
  { id: 'video_queued', title: 'In de wachtrij', showBack: false },
  { id: 'success', title: 'Content klaar', showBack: false },
  { id: 'error', title: 'Fout opgetreden' },
];

// ─── Props ────────────────────────────────────────────────

export interface MatchWizardV2Props {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}

// ─── Inner Component (needs both contexts) ────────────────

export function MatchWizardInner({ isOpen, initialMatchId }: { isOpen: boolean; initialMatchId?: string }) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const mw = useMatchWizard();

  // ── Generation state (owned here, not in context) ─────
  const [progress, setProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [savingAsset, setSavingAsset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedVariantIndices, setSavedVariantIndices] = useState<Set<number>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Derived match data ──────────────────────────────────
  const matchDataForApi = useMemo(() => {
    if (!mw.selectedMatch) return null;
    return {
      id: String(mw.selectedMatch.id),
      title: mw.selectedMatch.title,
      project: mw.selectedMatch.project,
      opponent_project: mw.selectedMatch.opponent_project ?? undefined,
      participations: mw.selectedMatch.participations,
      start_time: mw.selectedMatch.start_time,
      location: mw.selectedMatch.location,
      metadata: {
        ...(mw.selectedMatch.metadata || {}),
        formation: mw.lineupFormation,
        lineup: {
          formation: mw.lineupFormation,
          goalkeeper: mw.lineupSlots.goalkeeper,
          player: mw.lineupSlots.player,
        },
      },
    };
  }, [mw.selectedMatch, mw.lineupFormation, mw.lineupSlots]);

  const projectId = mw.selectedMatch?.project?.id || undefined;
  const organisationId = mw.selectedMatch?.project?.organisation_id
    || mw.selectedMatch?.organisation?.id || null;

  const selectedType = useMemo(() => {
    if (!mw.pendingContent) return null;
    return {
      type: mw.pendingContent.templateType,
      subtype: mw.pendingContent.subtype,
      label: mw.pendingContent.label,
    };
  }, [mw.pendingContent]);

  const isLineupFlow = mw.pendingContent
    ? ['lineup', 'lineup_flyer', 'poster'].includes(mw.pendingContent.subtype)
    : false;

  // ── Sub-hooks ───────────────────────────────────────────
  const options = useContentOptions({ isOpen, matchData: matchDataForApi });

  // Keep options formation in sync
  useEffect(() => { options.setLineupFormation(mw.lineupFormation); }, [mw.lineupFormation]);

  const seasonSquad = useSeasonSquadData({
    isOpen: isOpen && !!mw.selectedMatch,
    projectId: projectId ? String(projectId) : null,
    seasonId: null,
    selectedTemplate: mw.selectedTemplate,
  });

  // Sync lineup slots → selectedMembers for generation APIs
  const lineupSlotsRef = useRef(mw.lineupSlots);
  lineupSlotsRef.current = mw.lineupSlots;

  const videoPoll = useVideoJobPolling({
    isOpen,
    step: 'generating', // simplified — poll is controlled by videoJobId
    onGenerated: undefined,
  });

  // ── Auto-select match from initialMatchId ───────────────
  useEffect(() => {
    if (isOpen && !mw.selectedMatch && initialMatchId && mw.upcomingMatches.length > 0) {
      const found = mw.upcomingMatches.find(
        a => a.id === initialMatchId || a.slug === initialMatchId,
      );
      if (found) {
        mw.setSelectedMatch(found);
      }
    }
  }, [isOpen, initialMatchId, mw.upcomingMatches, mw.selectedMatch]);

  // ── Reset generation state when wizard closes ───────────
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setGenerationError(null);
      setGeneratedOutput(null);
      setGeneratedVariants([]);
      setSelectedVariantIndex(0);
      setSavingAsset(false);
      setSaveSuccess(false);
      setSavedVariantIndices(new Set());
      setSaveError(null);
      videoPoll.resetVideo();
    }
  }, [isOpen]);

  // ── Generation dispatch ─────────────────────────────────

  const handleGenerate = async () => {
    setGenerationError(null);
    setGeneratedOutput(null);
    setGeneratedVariants([]);
    setSelectedVariantIndex(0);
    setSaveSuccess(false);
    setSavedVariantIndices(new Set());
    videoPoll.resetVideo();

    // Pre-flight validation for lineup types
    const subtype = mw.pendingContent?.subtype || '';
    if (subtype === 'lineup' || subtype === 'lineup_flyer') {
      const expectedFieldPlayers = mw.lineupFormation.split('-').reduce((s, n) => s + parseInt(n, 10), 0);
      const filledGk = mw.lineupSlots.goalkeeper.filter(Boolean).filter(id => !id.startsWith('guest-')).length;
      const filledPlayers = mw.lineupSlots.player.filter(Boolean).filter(id => !id.startsWith('guest-')).length;
      if (filledGk < 1 || filledPlayers < expectedFieldPlayers) {
        const missing: string[] = [];
        if (filledGk < 1) missing.push('keeper');
        if (filledPlayers < expectedFieldPlayers) missing.push(`${expectedFieldPlayers - filledPlayers} veldspeler(s)`);
        setGenerationError(
          `Opstelling niet compleet voor formatie ${mw.lineupFormation}: ${missing.join(' en ')} ontbre(e)k(en). ` +
          `Vul alle posities met echte spelers (geen gast-spelers) en probeer opnieuw.`,
        );
        return;
      }
    }

    // Sync lineup to selectedMembers before generation
    seasonSquad.setSelectedMembers({
      goalkeeper: lineupSlotsRef.current.goalkeeper.filter(Boolean),
      player: lineupSlotsRef.current.player.filter(Boolean),
      coach: [],
      assistant: [],
    });

    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 10;
      if (p > 85) p = 85;
      setProgress(Math.min(p, 85));
    }, 500);

    try {
      const seasonProjectId = projectId;
      const matchData = matchDataForApi;

      // ── Flyer generators (return GeneratedVariant[]) ──
      const flyerGenerators: Record<string, () => Promise<GeneratedVariant[]>> = {
        lineup_flyer: () => generateLineupFlyer({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          lineupFormation: mw.lineupFormation,
          lineupCloseupStyle: options.lineupCloseupStyle,
          selectedTemplateId: mw.selectedTemplate?.id,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
        poster: () => generateTeamPoster({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          lineupFormation: mw.lineupFormation,
          selectedTemplateId: mw.selectedTemplate?.id,
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
        return 'success';
      }

      // ── Video generators (return jobId) ──
      const videoGenerators: Record<string, () => Promise<string>> = {
        lineup: () => generateLineupVideo({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          selectedType, selectedTemplate: mw.selectedTemplate,
          lineupFormation: mw.lineupFormation,
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
        return 'video_queued';
      }

      // ── Generic AI (catch-all) ──
      const result = await generateGenericAI({
        selectedType, selectedTemplate: mw.selectedTemplate, matchData, organisationId, assetType: null,
      });
      clearInterval(progressInterval);
      setGeneratedVariants(result.variants);
      if (result.generatedOutput) setGeneratedOutput(result.generatedOutput);
      setProgress(100);
      return 'success';
    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
      if ((err as any)?.name === 'AbortError') return 'abort';
      console.error('[!] Generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      return 'error';
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
        selectedType, selectedTemplate: mw.selectedTemplate, assetType: null,
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
        if (result.file_asset_id) nextStorageInfo.file_asset_id = result.file_asset_id;
        if (result.brand_asset_id) nextStorageInfo.brand_asset_id = result.brand_asset_id;
        if (result.media_item_id) nextStorageInfo.media_item_id = result.media_item_id;

        const updated = [...generatedVariants];
        updated[variantIdx] = { ...variant, storage_info: nextStorageInfo };
        setGeneratedVariants(updated);
      }

      if (!opts?.skipAutoClose && generatedVariants.length <= 1) {
        setSaveSuccess(true);
        const previewUrl = variant.presigned_url || generatedOutput?.presigned_url;
        pushToast({
          message: `${mw.pendingContent?.label || 'Content'} opgeslagen!`,
          type: 'success',
          icon: CheckCircle,
          actions: [
            ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
            { label: 'Naar queue', onClick: () => navigate('/approvals') },
          ],
        });
        window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
      }
    } catch (err) {
      console.error(err);
      console.error(`[!] Failed to save variant ${variantIdx + 1}:`, err);
      setSaveError(err instanceof Error ? err.message : 'Opslaan mislukt');
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
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <>
      {/* Step 1: Match selection */}
      <WizardStep stepId="match">
        <MatchSelectStep />
      </WizardStep>

      {/* Step 2: Content type */}
      <WizardStep stepId="content">
        <ContentTypeStep />
      </WizardStep>

      {/* Step 3: Lineup */}
      <WizardStep stepId="lineup">
        <LineupStep />
      </WizardStep>

      {/* Step 4: Options */}
      <WizardStep stepId="options">
        <OptionsStep
          selectedType={selectedType}
          selectedTemplate={mw.selectedTemplate}
          matchDataForApi={matchDataForApi}
          seasonSquad={seasonSquad}
          options={options}
        />
      </WizardStep>

      {/* Step 5: Review */}
      <WizardStep stepId="review">
        <ReviewStep onGenerate={handleGenerate} saveError={saveError} />
      </WizardStep>

      {/* Step 6: Generating */}
      <WizardStep stepId="generating">
        <GeneratingStep
          progress={progress}
          selectedType={selectedType}
          selectedTemplate={mw.selectedTemplate}
          videoJobStatus={videoPoll.videoJobStatus || ''}
          videoJobProgressRaw={videoPoll.videoJobProgressRaw}
          videoJobMeta={videoPoll.videoJobMeta}
          videoJobId={videoPoll.videoJobId}
          onClose={() => {}}
        />
      </WizardStep>

      {/* Step 7a: Video Queued */}
      <WizardStep stepId="video_queued">
        <VideoQueuedStep
          videoOutputUrl={videoPoll.videoOutputUrl}
          videoJobStatus={videoPoll.videoJobStatus || ''}
          videoJobError={videoPoll.videoJobError}
          videoJobProgressRaw={videoPoll.videoJobProgressRaw}
          videoThumbnailUrl={videoPoll.videoThumbnailUrl}
          videoApprovalStatus={videoPoll.videoApprovalStatus}
          videoApprovalError={videoPoll.videoApprovalError}
          handleVideoApproval={videoPoll.handleVideoApproval}
          selectedType={selectedType}
          onClose={() => {}}
        />
      </WizardStep>

      {/* Step 7b: Success */}
      <WizardStep stepId="success">
        <SuccessStep
          generatedOutput={generatedOutput}
          generatedVariants={generatedVariants}
          selectedVariantIndex={selectedVariantIndex}
          setSelectedVariantIndex={setSelectedVariantIndex}
          savingAsset={savingAsset}
          saveSuccess={saveSuccess}
          savedVariantIndices={savedVariantIndices}
          selectedType={selectedType}
          selectedTemplate={mw.selectedTemplate}
          matchData={matchDataForApi}
          handleSaveAsAsset={handleSaveAsAsset}
          handleSaveAllAsAssets={handleSaveAllAsAssets}
          handleSaveVariantByIndex={handleSaveVariantByIndex}
          handleGenerateInternal={handleGenerate}
          onClose={() => {}}
        />
      </WizardStep>

      {/* Step 7c: Error */}
      <WizardStep stepId="error">
        <ErrorStep
          error={generationError}
          onRetry={() => {}}
          onClose={() => {}}
        />
      </WizardStep>
    </>
  );
}

/** Step config — exported for reuse in ContentFlow */
export { WIZARD_STEPS as MATCH_WIZARD_STEPS };

// ─── Main Export ──────────────────────────────────────────

export default function MatchWizardV2({ isOpen, onClose, initialMatchId }: MatchWizardV2Props) {
  return (
    <MatchWizardProvider>
      <WizardProvider
        steps={WIZARD_STEPS}
        initialStepId="match"
        onClose={onClose}
      >
        <WizardShell isOpen={isOpen}>
          <MatchWizardInner isOpen={isOpen} initialMatchId={initialMatchId} />
        </WizardShell>
      </WizardProvider>
    </MatchWizardProvider>
  );
}
