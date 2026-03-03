/**
 * BatchProgressStep — progress bar, member status list (running + done views).
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import type { AssetTemplate } from '../../constants/assetTemplates';
import type { BatchMember, MemberJobStatus } from './batchTypes';
import { memberRowStyle, avatarStyle } from './batchTypes';

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
        padding: '12px',
        marginBottom: '16px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#60a5fa',
      }}>
        💡 Video processing draait op de server. Je kunt dit tabblad sluiten - de verwerking gaat door. Refresh de pagina later om de resultaten te zien.
      </div>
    )}

    {/* Progress overview */}
    <div className="mb-16">
      <div className="flex-row gap-12 mb-8">
        <Badge variant="info">{completedCount}/{members.length} verwerkt</Badge>
        {successCount > 0 && <Badge variant="success">{successCount} gelukt</Badge>}
        {errorCount > 0 && <Badge variant="error">{errorCount} mislukt</Badge>}
        {skippedCount > 0 && <Badge variant="warning">{skippedCount} overgeslagen</Badge>}
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
          background: errorCount > 0 ? '#f59e0b' : '#22c55e',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>

    {/* Member status list */}
    {members.map((member) => {
      const job = jobStatuses[member.id];
      const statusIcon =
        job?.status === 'running' ? '⏳' :
        job?.status === 'success' ? '✅' :
        job?.status === 'error' ? '❌' :
        job?.status === 'skipped' ? '⏭️' :
        '⬜';

      return (
        <div key={member.id} style={memberRowStyle}>
          {member.profilePhotoUrl ? (
            <img src={getAssetUrl(member.profilePhotoUrl) || ''} alt="" style={avatarStyle} />
          ) : (
            <div style={{ ...avatarStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              👤
            </div>
          )}
          <div className="flex-1-min">
            <div className="fs-14 fw-500">{member.name}</div>
            {job?.error && (
              <div className="fs-11" style={{ color: '#ef4444' }}>{job.error}</div>
            )}
            {job?.status === 'running' && (
              <div className="fs-11" style={{ color: '#60a5fa' }}>
                {job.totalFrames && job.progressFrames
                  ? `Frame ${job.progressFrames}/${job.totalFrames} (${Math.round((job.progressFrames / job.totalFrames) * 100)}%)`
                  : 'Bezig met verwerken...'}
              </div>
            )}
          </div>
          <span style={{ fontSize: '16px' }}>{statusIcon}</span>
        </div>
      );
    })}
  </>
);
