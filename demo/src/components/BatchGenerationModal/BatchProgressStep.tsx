/**
 * BatchProgressStep — progress bar, member status list (running + done views).
 */
import React from 'react';
import { CheckCircle2, XCircle, Loader2, SkipForward, Circle } from 'lucide-react';
import { Badge } from '@django-core/design-system';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import type { AssetTemplate } from '../../constants/assetTemplates';
import type { BatchMember, MemberJobStatus } from './batchTypes';
import configStyles from './BatchConfigureStep.module.css';
import styles from './BatchProgressStep.module.css';

interface BatchProgressStepProps {
  step: 'running' | 'done';
  members: BatchMember[];
  selectedTemplate: AssetTemplate;
  jobStatuses: Record<string, MemberJobStatus>;
  completedCount: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
}

export const BatchProgressStep: React.FC<BatchProgressStepProps> = ({
  step,
  members,
  selectedTemplate,
  jobStatuses,
  completedCount,
  successCount,
  errorCount,
  skippedCount,
}) => (
  <>
    {/* Background processing notice for video types */}
    {step === 'running' && (selectedTemplate?.category === 'intro' || selectedTemplate?.category === 'celebration') && (
      <div className={styles.backgroundNotice}>
        Video processing draait op de server. Je kunt dit sluiten — de verwerking gaat door.
      </div>
    )}

    {/* Progress overview */}
    <div className="mb-12">
      <div className="flex-row gap-8 flex-wrap mb-6">
        <Badge variant="info">{completedCount}/{members.length}</Badge>
        {successCount > 0 && <Badge variant="success">{successCount} gelukt</Badge>}
        {errorCount > 0 && <Badge variant="error">{errorCount} mislukt</Badge>}
        {skippedCount > 0 && <Badge variant="warning">{skippedCount} overgesl.</Badge>}
      </div>

      {/* Progress bar */}
      <div className={styles.progressBarTrack}>
        <div className={`${styles.progressBarFill} ${errorCount > 0 ? styles.progressBarFillWarning : styles.progressBarFillSuccess}`} style={{
          width: `${members.length > 0 ? (completedCount / members.length) * 100 : 0}%`,
        }} />
      </div>
    </div>

    {/* Member status list */}
    {members.map((member) => {
      const job = jobStatuses[member.id];
      const statusIcon =
        job?.status === 'running' ? <span className="status-running"><Loader2 size={14} className="animate-spin" /></span> :
        job?.status === 'success' ? <span className="status-success"><CheckCircle2 size={14} /></span> :
        job?.status === 'error' ? <span className="status-error"><XCircle size={14} /></span> :
        job?.status === 'skipped' ? <span className="status-skipped"><SkipForward size={14} /></span> :
        <span className="status-muted"><Circle size={14} /></span>;

      return (
        <div key={member.id} className={`${configStyles.memberRow} ${styles.cursorDefault}`}>
          {member.profilePhotoUrl ? (
            <img src={getAssetUrl(member.profilePhotoUrl) || ''} alt="" className={configStyles.avatar} loading="lazy" />
          ) : (
            <div className={`flex-center ${configStyles.avatarFallback}`}>
              ?
            </div>
          )}
          <div className="flex-1-min">
            <div className="fs-13 fw-500">{member.name}</div>
            {job?.error && (
              <div className={`fs-10 ${styles.errorText}`}>{job.error}</div>
            )}
            {job?.status === 'running' && (
              <div className="fs-10 status-running">
                {job.totalFrames && job.progressFrames
                  ? `Frame ${job.progressFrames}/${job.totalFrames} (${Math.round((job.progressFrames / job.totalFrames) * 100)}%)`
                  : 'Bezig...'}
              </div>
            )}
          </div>
          <span>{statusIcon}</span>
        </div>
      );
    })}
  </>
);
