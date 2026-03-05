/**
 * BatchGenerationModal — orchestrator.
 *
 * Split into:
 *   batchTypes.ts          — types + style constants
 *   batchExecution.ts      — pure async batch execution + metadata update
 *   useBatchGeneration.ts  — hook: state, memos, effects, helpers
 *   BatchConfigureStep.tsx — template picker, params, member list
 *   BatchProgressStep.tsx  — progress bar + member status list
 */
import React from 'react';
import { Button } from '@django-core/design-system';

import type { BatchGenerationModalProps } from './batchTypes';
import { overlayStyle, modalStyle, headerStyle, bodyStyle, footerStyle } from './batchTypes';
import { useBatchGeneration } from './useBatchGeneration';
import { BatchConfigureStep } from './BatchConfigureStep';
import { BatchProgressStep } from './BatchProgressStep';

export type { BatchMember } from './batchTypes';

export const BatchGenerationModal: React.FC<BatchGenerationModalProps> = (props) => {
  const { isOpen, onClose, members, onBatchComplete } = props;
  const batch = useBatchGeneration(props);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div className="flex-row gap-12">

            <div>
              <h2 className="m-0 fs-18 fw-600">Batch AI Generatie</h2>
              <span className="fs-12 text-muted">
                {members.length} {members.length === 1 ? 'member' : 'members'} geselecteerd
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={batch.step === 'running'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--app-text)',
              fontSize: '20px',
              cursor: batch.step === 'running' ? 'not-allowed' : 'pointer',
              opacity: batch.step === 'running' ? 0.4 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {batch.step === 'configure' && (
            <BatchConfigureStep
              members={members}
              memberTemplates={batch.memberTemplates}
              selectedTemplateId={batch.selectedTemplateId}
              setSelectedTemplateId={batch.setSelectedTemplateId}
              selectedTemplate={batch.selectedTemplate}
              defaultParams={batch.defaultParams}
              setDefaultParams={batch.setDefaultParams}
              memberOverrides={batch.memberOverrides}
              expandedMembers={batch.expandedMembers}
              getEffectiveParams={batch.getEffectiveParams}
              toggleMemberExpanded={batch.toggleMemberExpanded}
              setMemberParam={batch.setMemberParam}
              resetMemberOverrides={batch.resetMemberOverrides}
              isParamVisible={batch.isParamVisible}
              getInputAssetsForMember={batch.getInputAssetsForMember}
            />
          )}

          {(batch.step === 'running' || batch.step === 'done') && (
            <BatchProgressStep
              step={batch.step}
              members={members}
              selectedTemplate={batch.selectedTemplate}
              jobStatuses={batch.jobStatuses}
              completedCount={batch.completedCount}
              successCount={batch.successCount}
              errorCount={batch.errorCount}
              skippedCount={batch.skippedCount}
            />
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          {batch.step === 'configure' && (
            <>
              <div className="fs-12 text-muted">
                💎 {batch.selectedTemplate ? batch.selectedTemplate.creditsCost * members.length : 0} credits totaal ({batch.selectedTemplate?.creditsCost || 0} per member)
              </div>
              <div className="flex-row gap-8">
                <Button variant="secondary" onClick={onClose}>Annuleren</Button>
                <Button variant="primary" onClick={batch.startBatch} disabled={members.length === 0}>
                  🚀 Start Batch ({members.length})
                </Button>
              </div>
            </>
          )}

          {batch.step === 'running' && (
            <>
              <div className="fs-13 text-muted">
                ⏳ {batch.completedCount}/{members.length} verwerkt...
              </div>
              <Button variant="secondary" onClick={batch.cancelBatch}>Stop</Button>
            </>
          )}

          {batch.step === 'done' && (
            <>
              <div className="fs-13">
                {batch.errorCount === 0 ? 'Batch voltooid!' : `${batch.errorCount} van ${members.length} mislukt`}
              </div>
              <Button variant="primary" onClick={() => { onBatchComplete?.(); onClose(); }}>
                Sluiten
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchGenerationModal;
