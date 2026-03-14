import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MembersStep } from '../pages/identity/ContentGenerationModal/MembersStep';
import { ConfirmStep } from '../pages/identity/ContentGenerationModal/ConfirmStep';
import { LINEUP_OPTIONS_SUBTYPES } from './matchWizardTypes';
import type { useMatchWizardData } from './useMatchWizardData';
import styles from './MatchWizard.module.css';

type Data = ReturnType<typeof useMatchWizardData>;

interface OptionsStepProps {
  pendingContent: Data['pendingContent'];
  selectedTemplate: Data['selectedTemplate'];
  selectedType: Data['selectedType'];
  selectedContentTypeLabel: Data['selectedContentTypeLabel'];
  isLineupFlow: Data['isLineupFlow'];
  options: Data['options'];
  seasonSquad: Data['seasonSquad'];
  lineupFormation: Data['lineupFormation'];
  setLineupFormation: Data['setLineupFormation'];
  handleOptionsConfirm: Data['handleOptionsConfirm'];
  homeTeamName: Data['homeTeamName'];
  awayTeamName: Data['awayTeamName'];
  matchDataForApi: Data['matchDataForApi'];
}

export function OptionsStep({
  pendingContent,
  selectedTemplate,
  selectedType,
  selectedContentTypeLabel,
  isLineupFlow,
  options,
  seasonSquad,
  lineupFormation,
  setLineupFormation,
  handleOptionsConfirm,
  homeTeamName,
  awayTeamName,
  matchDataForApi,
}: OptionsStepProps) {
  if (!pendingContent) return null;

  const subtype = pendingContent.subtype;

  // Lineup-type options: formation, closeup style, animation, background
  if (LINEUP_OPTIONS_SUBTYPES.has(subtype) && selectedTemplate) {
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
        <div className={styles.optionsActionsInline}>
          <button
            onClick={handleOptionsConfirm}
            className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
          >
            Verder<ChevronRight size={18} />
          </button>
        </div>
      </>
    );
  }

  // Type-specific config: flyer variant, goal score, match summary
  const isGoal = pendingContent.subtype === 'goal';
  return (
    <>
      <ConfirmStep
        selectedType={selectedType}
        selectedTemplate={selectedTemplate}
        contentTypeLabel={selectedContentTypeLabel}
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
      <div className={styles.optionsActionsInline}>
        <button
          onClick={handleOptionsConfirm}
          disabled={isGoal && !options.goalScorerId}
          className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
        >
          Verder<ChevronRight size={18} />
        </button>
      </div>
    </>
  );
}
