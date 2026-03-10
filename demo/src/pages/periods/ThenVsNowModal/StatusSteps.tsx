/**
 * StatusSteps - Status step UIs for ThenVsNowModal (generating, submitted, error)
 */
import React from 'react';
import type { ModalStep } from './types';
import s from '../ProjectSeasonDetailPage.module.css';

interface StatusStepProps {
  step: ModalStep;
  selectedCount: number;
  error: string | null;
}

export function StatusSteps({ step, selectedCount, error }: StatusStepProps) {
  if (step === 'generating') {
    return (
      <div className={s.statusStep}>
        <div className={s.statusEmoji}>{"\u23F3"}</div>
        <div className={s.statusTitle}>Job wordt aangemaakt...</div>
      </div>
    );
  }

  if (step === 'submitted') {
    return (
      <div className={s.statusStep}>
        <div className={s.statusEmoji}>{"\u2705"}</div>
        <div className={s.statusTitle}>Job gestart!</div>
        <div className={s.statusDesc}>
          {selectedCount} speler{selectedCount !== 1 ? 's' : ''} • Video wordt op de achtergrond verwerkt
        </div>
        <div className={s.statusDesc}>
          Bekijk de voortgang bij <strong>Workflow</strong> of in de <strong>Video Jobs</strong> queue.
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className={s.statusStep}>
        <div className={s.statusEmoji}>{"\u274C"}</div>
        <div className={s.statusTitleError}>Generatie mislukt</div>
        <div className={s.statusDesc}>{error || 'Unknown error'}</div>
      </div>
    );
  }

  return null;
}
