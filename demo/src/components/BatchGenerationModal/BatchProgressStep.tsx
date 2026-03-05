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
      <div style={{
        padding: '10px 12px',
        marginBottom: '12px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#60a5fa',
      }}>
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
      <div style={{
        height: '4px',
        borderRadius: '2px',
        background: 'var(--app-border, #333)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${members.length > 0 ? (completedCount / members.length) * 100 : 0}%`,
          background: errorCount > 0 ? 'var(--color-amber-400)' : '#22c55e',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>

    {/* Member status list */}
    {members.map((member) => {
      const job = jobStatuses[member.id];
      const statusIcon =
        job?.status === 'running' ? <Loader2 size={14} className="animate-spin" style={{ color: '#60a5fa' }} /> :
        job?.status === 'success' ? <CheckCircle2 size={14} color="#22c55e" /> :
        job?.status === 'error' ? <XCircle size={14} color="#ef4444" /> :
        job?.status === 'skipped' ? <SkipForward size={14} color="#f59e0b" /> :
        <Circle size={14} color="#6b7280" />;

      return (
        <div key={member.id} className={configStyles.memberRow} style={{ cursor: 'default' }}>
          {member.profilePhotoUrl ? (
            <img src={getAssetUrl(member.profilePhotoUrl) || ''} alt="" className={configStyles.avatar} />
          ) : (
            <div className={`flex-center ${configStyles.avatarFallback}`}>
              ?
            </div>
          )}
          <div className="flex-1-min">
            <div className="fs-13 fw-500">{member.name}</div>
            {job?.error && (
              <div className="fs-10" style={{ color: 'var(--color-red-500)' }}>{job.error}</div>
            )}
            {job?.status === 'running' && (
              <div className="fs-10" style={{ color: '#60a5fa' }}>
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
