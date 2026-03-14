/**
 * OptionsStep – Step 4: Configure content-specific options
 *
 * Delegates to MembersStep (lineup options) or ConfirmStep (flyer/goal/summary)
 * depending on the content subtype.
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useMatchWizard } from '../MatchWizardContext';
import { MembersStep } from '@/pages/identity/ContentGenerationModal/MembersStep';
import { ConfirmStep } from '@/pages/identity/ContentGenerationModal/ConfirmStep';
import type { ContentTemplate, Participation } from '@/pages/identity/ContentGenerationModal/types';
import type { BackgroundItem } from '@/pages/identity/ContentGenerationModal/BackgroundSelector';
import styles from '../MatchWizardV2.module.css';

// Subtypes that show MembersStep (lineup config: formation, closeup, animation, background)
const LINEUP_OPTIONS_SUBTYPES = new Set(['lineup', 'lineup_flyer', 'walkon', 'poster', 'match_intro']);

interface MatchDataForApi {
  id: string;
  title?: string;
  project?: { id: string; name: string; slug?: string; organisation_id?: string };
  opponent_project?: { id: string; name: string; slug?: string };
  participations?: unknown[];
  start_time?: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface OptionsStepProps {
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;
  matchDataForApi: MatchDataForApi | null;
  seasonSquad: {
    seasonSquad: Record<string, Participation[]>;
    selectedMembers: Record<string, string[]>;
    setSelectedMembers: (members: Record<string, string[]>) => void;
    getMemberAssetUrl: (memberId: string, assetType: string, memberRole?: string) => string | null;
    getMemberNameById: (memberId: string) => string;
  };
  options: {
    // Lineup
    lineupCloseupStyle: 'popout' | 'badge';
    setLineupCloseupStyle: (s: 'popout' | 'badge') => void;
    lineupAnimationStyle: 'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade';
    setLineupAnimationStyle: (s: 'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade') => void;
    lineupIntroStyle: 'per_line' | 'per_player';
    setLineupIntroStyle: (s: 'per_line' | 'per_player') => void;
    // Flyer
    matchFlyerVariant: 'modern' | 'action' | 'stadium';
    setMatchFlyerVariant: (v: 'modern' | 'action' | 'stadium') => void;
    flyerMemberId: string | null;
    setFlyerMemberId: (id: string | null) => void;
    flyerActionStyle: string;
    setFlyerActionStyle: (style: string) => void;
    flyerPhotoLayout: 'single' | 'triple' | 'hero_duo';
    setFlyerPhotoLayout: (layout: 'single' | 'triple' | 'hero_duo') => void;
    flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
    setFlyerPhotoSlots: (slots: Array<{ member_id: string | null; style_variant: string }>) => void;
    // Goal
    goalScoreHome: number;
    setGoalScoreHome: (n: number) => void;
    goalScoreAway: number;
    setGoalScoreAway: (n: number) => void;
    goalScorerId: string | null;
    setGoalScorerId: (id: string | null) => void;
    // Summary
    summaryScoreHome: number;
    setSummaryScoreHome: (n: number) => void;
    summaryScoreAway: number;
    setSummaryScoreAway: (n: number) => void;
    summaryGoalScorers: string;
    setSummaryGoalScorers: (s: string) => void;
    // Background
    selectedBackgroundUrl: string | null;
    setSelectedBackgroundUrl: (url: string | null) => void;
    appBackgrounds: BackgroundItem[];
    // Formation (alias)
    setLineupFormation: (f: string) => void;
  };
}

export function OptionsStep({ selectedType, selectedTemplate, matchDataForApi, seasonSquad, options }: OptionsStepProps) {
  const { goTo } = useWizard();
  const {
    pendingContent,
    lineupFormation,
    setLineupFormation,
    homeTeamName,
    awayTeamName,
  } = useMatchWizard();

  if (!pendingContent) {
    return <div className="text-center p-32 text-muted">Geen content geselecteerd</div>;
  }

  const handleContinue = () => goTo('review');

  const isGoalType = pendingContent.subtype === 'goal';
  const isDisabled = isGoalType && !options.goalScorerId;

  // Lineup-type options: formation, closeup style, animation, background
  if (LINEUP_OPTIONS_SUBTYPES.has(pendingContent.subtype) && selectedTemplate) {
    return (
      <>
        <MembersStep
          selectedType={selectedType}
          selectedTemplate={selectedTemplate}
          isLineupFlow={true}
          seasonSquad={seasonSquad.seasonSquad}
          selectedMembers={seasonSquad.selectedMembers}
          setSelectedMembers={seasonSquad.setSelectedMembers}
          lineupFormation={lineupFormation}
          setLineupFormation={setLineupFormation}
          lineupCloseupStyle={options.lineupCloseupStyle}
          setLineupCloseupStyle={options.setLineupCloseupStyle}
          lineupAnimationStyle={options.lineupAnimationStyle}
          setLineupAnimationStyle={options.setLineupAnimationStyle}
          lineupIntroStyle={options.lineupIntroStyle}
          setLineupIntroStyle={options.setLineupIntroStyle}
          selectedBackgroundUrl={options.selectedBackgroundUrl}
          setSelectedBackgroundUrl={options.setSelectedBackgroundUrl}
          appBackgrounds={options.appBackgrounds}
        />
        <div className={styles.stepActions}>
          <button
            onClick={handleContinue}
            className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
          >
            Verder<ChevronRight size={18} />
          </button>
        </div>
      </>
    );
  }

  // Type-specific config: flyer variant, goal score, match summary
  return (
    <>
      <ConfirmStep
        selectedType={selectedType}
        selectedTemplate={selectedTemplate}
        contentTypeLabel={pendingContent.label}
        matchData={matchDataForApi}
        seasonSquad={seasonSquad.seasonSquad}
        matchFlyerVariant={options.matchFlyerVariant}
        setMatchFlyerVariant={options.setMatchFlyerVariant}
        flyerMemberId={options.flyerMemberId}
        setFlyerMemberId={options.setFlyerMemberId}
        flyerActionStyle={options.flyerActionStyle}
        setFlyerActionStyle={options.setFlyerActionStyle}
        flyerPhotoLayout={options.flyerPhotoLayout}
        setFlyerPhotoLayout={options.setFlyerPhotoLayout}
        flyerPhotoSlots={options.flyerPhotoSlots}
        setFlyerPhotoSlots={options.setFlyerPhotoSlots}
        goalScoreHome={options.goalScoreHome}
        setGoalScoreHome={options.setGoalScoreHome}
        goalScoreAway={options.goalScoreAway}
        setGoalScoreAway={options.setGoalScoreAway}
        goalScorerId={options.goalScorerId}
        setGoalScorerId={options.setGoalScorerId}
        summaryScoreHome={options.summaryScoreHome}
        setSummaryScoreHome={options.setSummaryScoreHome}
        summaryScoreAway={options.summaryScoreAway}
        setSummaryScoreAway={options.setSummaryScoreAway}
        summaryGoalScorers={options.summaryGoalScorers}
        setSummaryGoalScorers={options.setSummaryGoalScorers}
        selectedBackgroundUrl={options.selectedBackgroundUrl}
        setSelectedBackgroundUrl={options.setSelectedBackgroundUrl}
        appBackgrounds={options.appBackgrounds}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
      />
      <div className={styles.stepActions}>
        <button
          onClick={handleContinue}
          disabled={isDisabled}
          className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
        >
          Verder<ChevronRight size={18} />
        </button>
      </div>
    </>
  );
}
