/**
 * ThenVsNowModal - Modal for creating Then vs Now compilation videos
 */
import React from 'react';
import { useThenVsNowData } from './useThenVsNowData';
import { MemberSelectionStep } from './MemberSelectionStep';
import { StatusSteps } from './StatusSteps';
import { ThenVsNowModalFooter } from './ThenVsNowModalFooter';
import { VIDEO_TYPE_LABELS, STEP_SUBTITLES } from './types';
import type { ThenVsNowModalProps } from './types';
import s from '../ProjectSeasonDetailPage.module.css';
import styles from '../ThenVsNowModal.module.css';
import { useEscapeKey } from '../../../hooks/useEscapeKey';

// Re-export types
export type { ThenVsNowMember, ThenVsNowVideoType, ThenVsNowModalProps } from './types';

const ThenVsNowModal: React.FC<ThenVsNowModalProps> = (props) => {
  const data = useThenVsNowData(props);
  const { step, videoType, onClose } = data;
  useEscapeKey(step !== 'generating' ? onClose : undefined);

  return (
    <div
      className={s.thenNowBackdrop}
      onClick={() => { if (step !== 'generating') onClose(); }}
    >
      <div className={s.thenNowModal} onClick={(e) => e.stopPropagation()} role="dialog">
        {/* Header */}
        <div className={s.thenNowHeader}>
          <div>
            <h3 className="m-0 fs-16 fw-700">
              Compilatie — {VIDEO_TYPE_LABELS[videoType]}
            </h3>
            <div className={`fs-12 text-muted ${styles.subtitle}`}>
              {STEP_SUBTITLES[step]}
            </div>
          </div>
          {step !== 'generating' && (
            <button onClick={onClose} className={s.modalCloseBtn}>&times;</button>
          )}
        </div>

        {/* Step: Member selection */}
        {step === 'members' && (
          <MemberSelectionStep
            selected={data.selected}
            eligible={data.eligible}
            selectedOrdered={data.selectedOrdered}
            filteredUnselected={data.filteredUnselected}
            unselected={data.unselected}
            search={data.search}
            setSearch={data.setSearch}
            videoType={videoType}
            variantKeys={data.variantKeys}
            setVariantKeys={data.setVariantKeys}
            backgrounds={data.backgrounds}
            selectedBgUrl={data.selectedBgUrl}
            setSelectedBgUrl={data.setSelectedBgUrl}
            moveUp={data.moveUp}
            moveDown={data.moveDown}
            removeItem={data.removeItem}
            addItem={data.addItem}
            toggleSelectAll={data.toggleSelectAll}
          />
        )}

        {/* Status steps */}
        <StatusSteps
          step={step}
          selectedCount={data.selected.length}
          error={data.error}
        />

        {/* Footer */}
        <ThenVsNowModalFooter
          step={step}
          selectedCount={data.selected.length}
          onClose={onClose}
          onSubmit={data.handleSubmit}
          onBack={() => data.setStep('members')}
        />
      </div>
    </div>
  );
};

export default ThenVsNowModal;
