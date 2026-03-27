/**
 * MatchSheetFlow — Unified multi-view match panel.
 *
 * Replaces the three separate sheets (MatchSheet, LineupSheet, ContentSheet)
 * with a single NavigationSheet containing an integrated view stack:
 *
 *   overview → lineup editing   (match roster)
 *            → content picker   → [lineup] → [options] → review → generating → result
 *
 * Architecture:
 *   MatchWizardProvider   (domain state for content creation)
 *     → WizardProvider    (step navigation with history stack)
 *       → NavigationSheet (single persistent panel)
 *         → WizardStep × N (conditionally rendered views)
 *
 * All content creation steps are embedded inline so the user never leaves
 * the match panel. Back navigation returns to the overview at any point.
 */
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Users, FileImage } from 'lucide-react';
import { Spinner } from '@django-core/design-system';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';

import { NavigationSheet } from '../ui/NavigationSheet';
import { WizardProvider, WizardStep, useWizard, type WizardStepConfig } from '../Wizard';
import { MatchWizardProvider, useMatchWizard } from '../MatchWizardV2/MatchWizardContext';
import {
  ContentTypeStep,
  LineupStep,
  OptionsStep,
  ReviewStep,
} from '../MatchWizardV2/steps';
import { GeneratingStep } from '@/pages/identity/ContentGenerationModal/GeneratingStep';
import { VideoQueuedStep } from '@/pages/identity/ContentGenerationModal/VideoQueuedStep';
import { SuccessStep } from '@/pages/identity/ContentGenerationModal/SuccessStep';
import ErrorStep from '@/pages/identity/ContentGenerationModal/ErrorStep';
import { useMatchWizardGeneration } from '../MatchWizardV2/useMatchWizardGeneration';
import { useTemplatesData } from '../MatchWizardV2/hooks';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, HAS_OPTIONS_SUBTYPES } from '../MatchWizardV2/types';
import type { ContentPhase } from '../MatchWizardV2/types';

import { useLineupSheet } from './useLineupSheet';
import { MatchOverview } from './MatchOverview';
import type { Match } from './ActiveMatchCard';
import type { UseMatchSheetReturn } from './useMatchSheet';
import type { Activity } from '@/hooks/useActivities';
import type { SavedAssetPreview } from '@/pages/activities/match-detail/types';

const MatchLineupTab = lazy(() =>
  import('../../pages/activities/match-detail/MatchLineupTab'),
);

const SavedAssetPreviewModal = lazy(() =>
  import('../../pages/activities/match-detail/MatchModals').then((m) => ({
    default: m.SavedAssetPreviewModal,
  })),
);

// ─── Step configuration ───────────────────────────────────

const SHEET_STEPS: WizardStepConfig[] = [
  { id: 'overview', title: 'Wedstrijd', showBack: false },
  { id: 'matchLineup', title: 'Opstelling' },
  { id: 'content', title: 'Kies content' },
  { id: 'lineup', title: 'Opstelling' },
  { id: 'options', title: 'Opties' },
  { id: 'review', title: 'Bevestig generatie' },
  { id: 'generating', title: 'Genereren...', showBack: false, hidden: true },
  { id: 'video_queued', title: 'In de wachtrij', showBack: false, hidden: true },
  { id: 'success', title: 'Content klaar', showBack: false, hidden: true },
  { id: 'error', title: 'Fout opgetreden', hidden: true },
];

// ─── Match → Activity adapter ─────────────────────────────

function matchToActivity(match: Match): Activity {
  return {
    id: match.id,
    slug: match.slug,
    title: match.title,
    activity_type: 'match',
    start_time: match.start_time,
    end_time: match.end_time ?? '',
    location: match.location ?? '',
    description: '',
    metadata: match.metadata,
    organisation: match.organisation,
    project: {
      id: match.project.id,
      name: match.project.name,
      slug: match.project.slug,
      organisation_id: match.organisation?.id,
    },
    period: match.period ? { id: match.period.id, name: match.period.name } : undefined,
    opponent_project: match.opponent_project
      ? { id: '', name: match.opponent_project.name, slug: match.opponent_project.slug }
      : null,
    participations: [],
  };
}

// ─── Props ────────────────────────────────────────────────

interface MatchSheetFlowProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  sheet: UseMatchSheetReturn;
  onNavigateToMatch: (tab?: string) => void;
  /** Own club logo URL (from useBrandProfile). */
  clubLogoUrl?: string;
}

// ─── Outer wrapper (providers) ────────────────────────────

export function MatchSheetFlow({ isOpen, onClose, match, sheet, onNavigateToMatch, clubLogoUrl }: MatchSheetFlowProps) {
  return (
    <MatchWizardProvider>
      <WizardProvider steps={SHEET_STEPS} initialStepId="overview" onClose={onClose}>
        <MatchSheetShell
          isOpen={isOpen}
          onClose={onClose}
          match={match}
          sheet={sheet}
          onNavigateToMatch={onNavigateToMatch}
          clubLogoUrl={clubLogoUrl}
        />
      </WizardProvider>
    </MatchWizardProvider>
  );
}

// ─── Shell (reads both contexts) ──────────────────────────

function MatchSheetShell({ isOpen, onClose, match, sheet, onNavigateToMatch, clubLogoUrl }: MatchSheetFlowProps) {
  const { currentStepId, back, goTo, reset } = useWizard();
  const mw = useMatchWizard();
  const gen = useMatchWizardGeneration(isOpen && currentStepId !== 'overview' && currentStepId !== 'matchLineup');

  // ── Lineup editing state (for matchLineup view) ───────
  const lineup = useLineupSheet(match, sheet.handleLineupSaved);

  // ── Auto-open lineup when triggered via SmartActionsCard ──
  useEffect(() => {
    if (isOpen && sheet.pendingAutoLineup) {
      sheet.clearPendingAutoLineup();
      // Small delay to let sheet animate open, then navigate to lineup
      requestAnimationFrame(() => goTo('matchLineup'));
    }
  }, [isOpen, sheet.pendingAutoLineup, sheet.clearPendingAutoLineup, goTo]);

  // ── Active match state ────────────────────────────────
  const [isActiveMatch, setIsActiveMatch] = useState(false);

  useEffect(() => {
    if (!isOpen || !match?.id) return;
    let cancelled = false;
    getActiveContext().then(ctx => {
      if (!cancelled) setIsActiveMatch(ctx?.match?.id === match.id);
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [isOpen, match?.id]);

  const handleToggleActive = useCallback(async () => {
    if (!match?.id) return;
    const next = !isActiveMatch;
    setIsActiveMatch(next);
    try {
      if (next) {
        await setActiveContext('match', match.id);
      } else {
        await setActiveContext('match');
      }
    } catch {
      setIsActiveMatch(!next); // rollback on error
    }
  }, [match?.id, isActiveMatch]);

  // ── Template resolution (for content creation) ────────
  const { fetchTemplates, selectTemplateForSubtype } = useTemplatesData();

  // ── Preview modal state ───────────────────────────────
  const [previewAsset, setPreviewAsset] = React.useState<SavedAssetPreview>(null);

  // ── Sync match → MatchWizardContext on open ───────────
  const syncedMatchRef = useRef<string | null>(null);
  useEffect(() => {
    if (isOpen && match && syncedMatchRef.current !== match.id) {
      syncedMatchRef.current = match.id;
      mw.setSelectedMatch(matchToActivity(match));
    }
  }, [isOpen, match?.id, mw.setSelectedMatch]);

  // ── Reset wizard when sheet closes ────────────────────
  useEffect(() => {
    if (!isOpen) {
      syncedMatchRef.current = null;
      reset();
    }
  }, [isOpen, reset]);

  // ── Regeneration handler ──────────────────────────────
  const handleRegenerate = useCallback(async () => {
    goTo('generating');
    try {
      const result = await gen.handleGenerate();
      switch (result) {
        case 'success': goTo('success'); break;
        case 'video_queued': goTo('video_queued'); break;
        case 'error': goTo('error'); break;
      }
    } catch {
      goTo('error');
    }
  }, [gen.handleGenerate, goTo]);

  // ── Start content creation for a specific subtype ─────
  const handleStartContent = useCallback(async (subtype: string, phase: ContentPhase) => {
    const allPhases = ['pre', 'during', 'post'] as const;
    const searchPhases = phase ? [phase] : allPhases;

    for (const p of searchPhases) {
      const found = CONTENT_TYPES[p].find(c => c.subtype === subtype);
      if (found) {
        mw.setSelectedContentPhase(p);
        mw.setPendingContent({
          key: found.key,
          label: found.label,
          subtype: found.subtype,
          templateType: found.templateType,
        });

        // Fetch templates, resolve for subtype, then navigate
        const loaded = await fetchTemplates();
        selectTemplateForSubtype(found.subtype, loaded);

        if (LINEUP_REQUIRED_SUBTYPES.has(found.subtype)) {
          goTo('lineup');
        } else if (HAS_OPTIONS_SUBTYPES.has(found.subtype)) {
          goTo('options');
        } else {
          goTo('review');
        }
        return;
      }
    }
  }, [mw, fetchTemplates, selectTemplateForSubtype, goTo]);

  // ── Browse all content types for a phase ──────────────
  const handleBrowseContent = useCallback((phase?: ContentPhase) => {
    if (phase) mw.setSelectedContentPhase(phase);
    goTo('content');
  }, [mw.setSelectedContentPhase, goTo]);

  // ── Edit match lineup ─────────────────────────────────
  const handleEditLineup = useCallback(() => {
    goTo('matchLineup');
  }, [goTo]);

  // ── Preview content (Bekijk) ──────────────────────────
  const handlePreviewContent = useCallback((url: string, isVideo: boolean, title?: string) => {
    setPreviewAsset({ url, isVideo, title: title ?? 'Preview' });
  }, []);

  // ── Return to overview after generation ───────────────
  const handleReturnToOverview = useCallback(() => {
    // Reset content creation state
    mw.setPendingContent(null);
    mw.setSelectedTemplate(null);
    mw.reset();
    mw.setSelectedMatch(matchToActivity(match));
    // Navigate back
    goTo('overview');
    // Notify parent of content generation
    sheet.handleContentGenerated(sheet.contentCount + 1);
  }, [mw, match, goTo, sheet]);

  // ── Dynamic title ─────────────────────────────────────
  const stepTitles: Record<string, string> = useMemo(() => ({
    overview: match.title || `${sheet.teamName} vs ${sheet.opponent}`,
    matchLineup: 'Opstelling',
    content: 'Kies content',
    lineup: 'Opstelling',
    options: 'Opties',
    review: 'Bevestig generatie',
    generating: 'Genereren...',
    video_queued: 'In de wachtrij',
    success: 'Content klaar!',
    error: 'Fout opgetreden',
  }), [match.title, sheet.teamName, sheet.opponent]);

  // ── Back handler ──────────────────────────────────────
  const isTerminalStep = ['generating', 'video_queued', 'success'].includes(currentStepId);
  const showBack = currentStepId !== 'overview' && !isTerminalStep;

  const handleBack = useCallback(() => {
    // From success/error → return to overview
    if (currentStepId === 'success' || currentStepId === 'error') {
      handleReturnToOverview();
      return;
    }
    back();
  }, [currentStepId, back, handleReturnToOverview]);

  // ── Icon for title ────────────────────────────────────
  const titleIcon = currentStepId === 'overview'
    ? <Trophy size={18} />
    : currentStepId === 'matchLineup' || currentStepId === 'lineup'
      ? <Users size={18} />
      : <FileImage size={18} />;

  return (
    <>
      <NavigationSheet
        isOpen={isOpen}
        onClose={onClose}
        title={stepTitles[currentStepId] || 'Wedstrijd'}
        icon={!showBack ? titleIcon : undefined}
        onBack={showBack ? handleBack : undefined}
      >
        {/* ── Overview ───────────────────────────────── */}
        <WizardStep stepId="overview">
          <MatchOverview
            match={match}
            sheet={sheet}
            isActiveMatch={isActiveMatch}
            onToggleActive={handleToggleActive}
            onNavigateToMatch={onNavigateToMatch}
            onStartContent={handleStartContent}
            onBrowseContent={handleBrowseContent}
            onEditLineup={handleEditLineup}
            onPreviewContent={handlePreviewContent}
            clubLogoUrl={clubLogoUrl}
          />
        </WizardStep>

        {/* ── Match Lineup Editing ────────────────────── */}
        <WizardStep stepId="matchLineup">
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}><Spinner size="md" /></div>}>
            <MatchLineupTab
              lineupFormation={lineup.lineupFormation}
              setLineupFormation={lineup.setLineupFormation}
              lineupSlots={lineup.lineupSlots}
              setLineupSlots={lineup.setLineupSlots}
              lineupSquad={lineup.lineupSquad}
              lineupSquadLoading={lineup.lineupSquadLoading}
              lineupBenchStatus={lineup.lineupBenchStatus}
              setLineupBenchStatus={lineup.setLineupBenchStatus}
              lineupSaving={lineup.lineupSaving}
              lineupSaveSuccess={lineup.lineupSaveSuccess}
              saveLineup={lineup.saveLineup}
            />
          </Suspense>
        </WizardStep>

        {/* ── Content Type Selection ──────────────────── */}
        <WizardStep stepId="content">
          <ContentTypeStep />
        </WizardStep>

        {/* ── Lineup for content (e.g. lineup video) ──── */}
        <WizardStep stepId="lineup">
          <LineupStep />
        </WizardStep>

        {/* ── Options (style, background, score) ─────── */}
        <WizardStep stepId="options">
          <OptionsStep
            selectedType={gen.selectedType}
            selectedTemplate={mw.selectedTemplate}
            matchDataForApi={gen.matchDataForApi}
            seasonSquad={gen.seasonSquad}
            options={gen.options}
          />
        </WizardStep>

        {/* ── Review & Confirm ────────────────────────── */}
        <WizardStep stepId="review">
          <ReviewStep onGenerate={gen.handleGenerate} saveError={gen.saveError} />
        </WizardStep>

        {/* ── Generating Progress ─────────────────────── */}
        <WizardStep stepId="generating">
          <GeneratingStep
            progress={gen.progress}
            selectedType={gen.selectedType}
            selectedTemplate={mw.selectedTemplate}
            videoJobStatus={gen.videoPoll.videoJobStatus || ''}
            videoJobProgressRaw={gen.videoPoll.videoJobProgressRaw}
            videoJobMeta={gen.videoPoll.videoJobMeta}
            videoJobId={gen.videoPoll.videoJobId}
            onClose={handleReturnToOverview}
          />
        </WizardStep>

        {/* ── Video Queued ────────────────────────────── */}
        <WizardStep stepId="video_queued">
          <VideoQueuedStep
            videoOutputUrl={gen.videoPoll.videoOutputUrl}
            videoJobStatus={gen.videoPoll.videoJobStatus || ''}
            videoJobError={gen.videoPoll.videoJobError}
            videoJobProgressRaw={gen.videoPoll.videoJobProgressRaw}
            videoThumbnailUrl={gen.videoPoll.videoThumbnailUrl}
            videoApprovalStatus={gen.videoPoll.videoApprovalStatus}
            videoApprovalError={gen.videoPoll.videoApprovalError}
            handleVideoApproval={gen.videoPoll.handleVideoApproval}
            selectedType={gen.selectedType}
            onClose={handleReturnToOverview}
          />
        </WizardStep>

        {/* ── Success ─────────────────────────────────── */}
        <WizardStep stepId="success">
          <SuccessStep
            generatedOutput={gen.generatedOutput}
            generatedVariants={gen.generatedVariants}
            selectedVariantIndex={gen.selectedVariantIndex}
            setSelectedVariantIndex={gen.setSelectedVariantIndex}
            savingAsset={gen.savingAsset}
            saveSuccess={gen.saveSuccess}
            savedVariantIndices={gen.savedVariantIndices}
            selectedType={gen.selectedType}
            selectedTemplate={mw.selectedTemplate}
            matchData={gen.matchDataForApi}
            handleSaveAsAsset={gen.handleSaveAsAsset}
            handleSaveAllAsAssets={gen.handleSaveAllAsAssets}
            handleSaveVariantByIndex={gen.handleSaveVariantByIndex}
            handleGenerateInternal={handleRegenerate}
            onClose={handleReturnToOverview}
          />
        </WizardStep>

        {/* ── Error ───────────────────────────────────── */}
        <WizardStep stepId="error">
          <ErrorStep
            error={gen.generationError}
            onRetry={handleRegenerate}
            onClose={handleReturnToOverview}
          />
        </WizardStep>
      </NavigationSheet>

      {/* ── Fullscreen Preview Modal (portal) ────────── */}
      {previewAsset && createPortal(
        <Suspense fallback={null}>
          <SavedAssetPreviewModal
            preview={previewAsset}
            onClose={() => setPreviewAsset(null)}
          />
        </Suspense>,
        document.body,
      )}
    </>
  );
}
