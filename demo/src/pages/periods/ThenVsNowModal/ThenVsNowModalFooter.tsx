/**
 * ThenVsNowModalFooter - Footer with action buttons
 */
import React from 'react';
import type { ModalStep } from './types';
import s from '../ProjectSeasonDetailPage.module.css';
import styles from '../ThenVsNowModal.module.css';

interface ThenVsNowModalFooterProps {
  step: ModalStep;
  selectedCount: number;
  onClose: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function ThenVsNowModalFooter({
  step,
  selectedCount,
  onClose,
  onSubmit,
  onBack,
}: ThenVsNowModalFooterProps) {
  return (
    <div className={s.thenNowFooter}>
      {step === 'members' && (
        <>
          <button onClick={onClose} className={s.modalBtnSecondary}>Annuleren</button>
          <button
            onClick={onSubmit}
            disabled={selectedCount === 0}
            className={`${s.modalBtnPrimary} ${styles.submitBtn}`}
            data-disabled={selectedCount === 0 || undefined}
          >{"\uD83C\uDFAC"} Genereer Video ({selectedCount})</button>
        </>
      )}
      {step === 'submitted' && (
        <button onClick={onClose} className={s.modalBtnSecondary}>Sluiten</button>
      )}
      {step === 'error' && (
        <>
          <button onClick={onBack} className={s.modalBtnSecondary}>{"\u2190"} Terug</button>
          <button onClick={onClose} className={s.modalBtnSecondary}>Sluiten</button>
        </>
      )}
    </div>
  );
}
