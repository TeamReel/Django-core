/**
 * QueuePage — Unified queue dashboard combining three data sources:
 * 1. Workflow instances (content approval state machines)
 * 2. AI generation jobs (image/video/text AI output)
 * 3. Video processing jobs (transcode, compose, lineup, thumbnail)
 *
 * Route: /approvals (also handles redirects from /studio/videos)
 * Sidebar: CONTENT section → "Queue"
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import MobileTabBar from '../components/MobileTabBar';
import { PageContent, PageHeader } from '@django-core/page-templates';
import {
  useWorkflowInstances,
  type WorkflowInstance,
  type TransitionHistoryEntry,
  classifyState,
} from '../hooks/useWorkflows';
import { WorkflowStatusBadge } from '../components/Workflows/WorkflowStatusBadge';
import { WorkflowActionButtons } from '../components/Workflows/WorkflowActionButtons';
import {
  useGenerationJobs,
  reviewJob,
  type GenerationJob,
  type GenJobStatus,
} from '../hooks/useGenerationJobs';
import {
  useVideoJobs,
  getJobStatusDisplay,
  getJobTypeDisplay,
  type VideoJob,
  type VideoJobStatus,
} from '../hooks/useVideoJobs';

type FilterState = 'all' | 'review' | 'active' | 'completed' | 'rejected' | 'ai_queue' | 'video';
type ContentTypeFilter = 'all' | 'ai_video' | 'ai_image' | 'lineup_video' | 'video_processing';

const CONTENT_TYPE_CHIPS: { key: ContentTypeFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Alles', icon: '📋' },
  { key: 'ai_video', label: 'AI Video', icon: '🎬' },
  { key: 'ai_image', label: 'AI Image', icon: '🖼️' },
  { key: 'lineup_video', label: 'Lineup Video', icon: '⚽' },
  { key: 'video_processing', label: 'Video Processing', icon: '⚙️' },
];

/** Filter AI jobs by the active sidebar tab */
function filterAiJobsByTab(jobs: GenerationJob[], tab: FilterState): GenerationJob[] {
  switch (tab) {
    case 'review':
      return jobs.filter(j => j.status === 'completed' && (j.approval_status === 'pending_review' || !j.approval_status));
    case 'active':
      return jobs.filter(j => j.status === 'queued' || j.status === 'waiting' || j.status === 'processing');
    case 'completed':
      return jobs.filter(j => j.approval_status === 'approved');
    case 'rejected':
      return jobs.filter(j => j.approval_status === 'rejected');
    case 'ai_queue':
      return jobs; // all AI jobs
    case 'video':
      return []; // video tab shows only video jobs
    case 'all':
    default:
      return jobs;
  }
}

/** Filter video jobs by the active sidebar tab */
function filterVideoJobsByTab(jobs: VideoJob[], tab: FilterState): VideoJob[] {
  switch (tab) {
    case 'video':
      return jobs; // all video jobs
    case 'active':
      return jobs.filter(j => j.status === 'queued' || j.status === 'processing');
    case 'completed':
      // Include approved jobs (workflow state 'approved') OR completed without workflow
      return jobs.filter(j =>
        j.status === 'completed' &&
        (!j.workflow_instance || j.workflow_instance.current_state === 'approved')
      );
    case 'rejected':
      return jobs.filter(j =>
        j.status === 'failed' ||
        j.status === 'cancelled' ||
        j.workflow_instance?.current_state === 'rejected'
      );
    case 'review':
      // Video jobs ready for review — completed + workflow in review state
      return jobs.filter(j =>
        j.status === 'completed' &&
        j.workflow_instance?.current_state === 'ready_for_review'
      );
    case 'ai_queue':
      return []; // ai_queue tab shows only AI jobs
    case 'all':
    default:
      return jobs;
  }
}

/** Format duration for video jobs */
function formatVideoDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.round((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

/** Map filter to state categories */
function matchesFilter(instance: WorkflowInstance, filter: FilterState): boolean {
  if (filter === 'all') return true;
  const category = classifyState(instance.current_state);
  switch (filter) {
    case 'review': return category === 'review';
    case 'active': return category === 'active' || category === 'initial';
    case 'completed': return category === 'terminal_success';
    case 'rejected': return category === 'terminal_failure';
    default: return true;
  }
}

/** Entity display name from content_type_name */
function getEntityLabel(contentTypeName: string): string {
  const labels: Record<string, string> = {
    activity: 'Match',
    projectmembership: 'Member',
    mediitem: 'Media',
    videojob: 'Video',
    contentitem: 'Content',
    project: 'Project',
    period: 'Season',
  };
  return labels[contentTypeName?.toLowerCase()] || contentTypeName || 'Item';
}

/** Sort priority: review first, then active, then terminal */
function sortPriority(a: WorkflowInstance, b: WorkflowInstance): number {
  const order: Record<string, number> = {
    review: 0,
    active: 1,
    initial: 2,
    terminal_failure: 3,
    terminal_success: 4,
  };
  const aOrder = order[classifyState(a.current_state)] ?? 2;
  const bOrder = order[classifyState(b.current_state)] ?? 2;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

// ─── Video Follow-Up Modal (after fullbody_in_tenue approval) ──────────

interface VideoFollowUpInfo {
  membershipId: string;
  projectId: string;
  organisationId: string;
  approvedImageUrl: string; // presigned URL of the approved fullbody variant
  kitType: string;          // parsed from template params/filename
  memberName: string;
}

const INTRO_POSES = [
  { value: 'arms_crossed', label: '🙅 Armen over elkaar', desc: 'Armen gekruist voor de borst, zelfverzekerde powerpose' },
  { value: 'hand_up', label: '✋ Hand omhoog', desc: 'Eén hand omhoog als begroeting' },
  { value: 'thumbs_up', label: '👍 Duim omhoog', desc: 'Duim omhoog naar de camera' },
] as const;

const CELEBRATION_STYLES = [
  { value: 'arms_wide', label: '🙌 Armen wijd', desc: 'Armen wijd gespreid, juichend' },
  { value: 'fist_pump', label: '✊ Vuist omhoog', desc: 'Vuist de lucht in pompen' },
  { value: 'point_to_sky', label: '☝️ Wijs naar hemel', desc: 'Wijst met één vinger naar de hemel' },
  { value: 'slide', label: '🛝 Knieën slide', desc: 'Op de knieën glijden over het veld' },
] as const;

interface VideoFollowUpModalProps {
  info: VideoFollowUpInfo;
  onClose: () => void;
  onSubmitted: (count: number) => void;
}

function VideoFollowUpModal({ info, onClose, onSubmitted }: VideoFollowUpModalProps) {
  const [selectedIntro, setSelectedIntro] = useState<string | null>(null);
  const [selectedCelebration, setSelectedCelebration] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCount = (selectedIntro ? 1 : 0) + (selectedCelebration ? 1 : 0);

  const handleSubmit = async () => {
    if (submitCount === 0) { onClose(); return; }
    setSubmitting(true);
    setError(null);

    const { getApiBaseUrl } = await import('../utils/apiBase');
    const apiBase = getApiBaseUrl();
    const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';

    const jobs: { templateId: string; styleVariant: string; outputAssetType: string }[] = [];
    if (selectedIntro) {
      jobs.push({ templateId: 'member_intro', styleVariant: selectedIntro, outputAssetType: 'member_intro' });
    }
    if (selectedCelebration) {
      jobs.push({ templateId: 'member_goal_celebration', styleVariant: selectedCelebration, outputAssetType: 'member_goal_celebration' });
    }

    let succeeded = 0;
    for (const job of jobs) {
      try {
        const body: Record<string, unknown> = {
          template_id: job.templateId,
          parameters: { kit_type: info.kitType, style_variant: job.styleVariant },
          variant_count: 1,
          project_id: info.projectId,
          membership_id: info.membershipId,
          output_asset_type: job.outputAssetType,
          input_image_urls: { person_photo: info.approvedImageUrl },
          output_type: 'video',
          require_approval: true,
        };
        if (info.organisationId) body.organisation_id = info.organisationId;
        const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.data?.error || err?.error || `HTTP ${res.status}`);
        }
        succeeded++;
      } catch (e) {
        console.error(`Failed to submit ${job.templateId}:`, e);
        setError(e instanceof Error ? e.message : 'Generatie mislukt');
      }
    }
    setSubmitting(false);
    if (succeeded > 0) onSubmitted(succeeded);
  };

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
    border: `2px solid ${selected ? '#2563eb' : 'var(--app-border, #e5e7eb)'}`,
    backgroundColor: selected ? '#eff6ff' : 'var(--app-surface, #fff)',
    transition: 'all 0.15s',
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10001, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 560, backgroundColor: 'var(--app-surface, #fff)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.36)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid var(--app-border, #e5e7eb)' }}>
          <div className="flex-between">
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text, #111)' }}>🎬 Video's genereren?</div>
              <div style={{ fontSize: 12, color: 'var(--app-text-secondary, #6b7280)', marginTop: 4 }}>
                Fullbody goedgekeurd voor <strong>{info.memberName}</strong> ({info.kitType}). Wil je ook video's genereren?
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-col gap-20 overflow-y-auto" style={{ padding: '16px 24px', maxHeight: '60vh' }}>

          {/* Short Intro section */}
          <div>
            <div className="fs-14 fw-700 mb-8" style={{ color: 'var(--app-text, #111)' }}>🎬 Short Intro</div>
            <div style={{ fontSize: 12, color: 'var(--app-text-secondary, #6b7280)', marginBottom: 10 }}>Korte intro video (6 sec) — kies een pose:</div>
            <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {INTRO_POSES.map(pose => (
                <div
                  key={pose.value}
                  onClick={() => setSelectedIntro(prev => prev === pose.value ? null : pose.value)}
                  style={chipStyle(selectedIntro === pose.value)}
                >
                  <div className="fs-13 fw-600" style={{ color: 'var(--app-text, #111)' }}>{pose.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--app-text-secondary, #6b7280)', lineHeight: 1.3 }}>{pose.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Celebration section */}
          <div>
            <div className="fs-14 fw-700 mb-8" style={{ color: 'var(--app-text, #111)' }}>⚽ Goal Celebration</div>
            <div style={{ fontSize: 12, color: 'var(--app-text-secondary, #6b7280)', marginBottom: 10 }}>Korte viering video (6 sec) — kies een stijl:</div>
            <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {CELEBRATION_STYLES.map(style => (
                <div
                  key={style.value}
                  onClick={() => setSelectedCelebration(prev => prev === style.value ? null : style.value)}
                  style={chipStyle(selectedCelebration === style.value)}
                >
                  <div className="fs-13 fw-600" style={{ color: 'var(--app-text, #111)' }}>{style.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--app-text-secondary, #6b7280)', lineHeight: 1.3 }}>{style.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#dc2626', backgroundColor: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-between" style={{ padding: '14px 24px', borderTop: '1px solid var(--app-border, #e5e7eb)' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--app-border, #e5e7eb)', background: 'transparent', color: 'var(--app-text-secondary, #6b7280)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
          >
            Overslaan
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitCount === 0}
            style={{
              padding: '9px 24px', borderRadius: 8, border: 'none',
              background: submitCount > 0 ? '#2563eb' : '#94a3b8', color: '#fff',
              fontWeight: 600, fontSize: 13, cursor: submitting ? 'wait' : submitCount > 0 ? 'pointer' : 'not-allowed',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Bezig...' : submitCount > 0 ? `🚀 Genereer ${submitCount} video${submitCount > 1 ? "'s" : ''}` : 'Selecteer een optie'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Photo Composite Follow-Up Modal (after photo_composite_gemini approval) ──────────

interface PhotoCompositeFollowUpInfo {
  membershipId: string;
  projectId: string;
  approvedImageUrl: string; // presigned URL of the approved photo composite
  memberName: string;
  backgroundUrl?: string; // carry over the background if available
}

interface PhotoCompositeFollowUpModalProps {
  info: PhotoCompositeFollowUpInfo;
  onClose: () => void;
  onSubmitted: () => void;
}

function PhotoCompositeFollowUpModal({ info, onClose, onSubmitted }: PhotoCompositeFollowUpModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const { getApiBaseUrl } = await import('../utils/apiBase');
      const apiBase = getApiBaseUrl();
      const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';

      const body: Record<string, unknown> = {
        template_id: 'photo_composite_video',
        parameters: {},
        variant_count: 1,
        project_id: info.projectId,
        membership_id: info.membershipId,
        output_asset_type: 'photo_composite_video',
        input_image_urls: { person_photo: info.approvedImageUrl },
        output_type: 'video',
        require_approval: true,
      };
      if (info.backgroundUrl) {
        body.input_image_urls = { person_photo: info.approvedImageUrl, background: info.backgroundUrl };
      }

      const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.data?.error || err?.error || `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (e) {
      console.error('Failed to submit photo_composite_video:', e);
      setError(e instanceof Error ? e.message : 'Generatie mislukt');
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10001, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 480, backgroundColor: 'var(--app-surface, #fff)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.36)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid var(--app-border, #e5e7eb)' }}>
          <div className="flex-between">
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text, #111)' }}>
                {submitted ? '✅ Video in de wachtrij!' : '🎬 Video genereren?'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--app-text-secondary, #6b7280)', marginTop: 4 }}>
                {submitted
                  ? `De video wordt gegenereerd en verschijnt binnenkort in de approval queue.`
                  : `Foto composite goedgekeurd voor ${info.memberName}. Wil je de geanimeerde video versie genereren?`
                }
              </div>
            </div>
            {!submitting && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>✕</button>}
          </div>
        </div>

        {/* Preview */}
        {!submitted && (
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'center' }}>
            <img
              src={info.approvedImageUrl}
              alt="Approved composite"
              style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
            />
          </div>
        )}

        {error && (
          <div style={{ margin: '0 24px 16px', fontSize: 12, color: '#dc2626', backgroundColor: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>{error}</div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--app-border, #e5e7eb)', display: 'flex', justifyContent: submitted ? 'center' : 'space-between', alignItems: 'center' }}>
          {submitted ? (
            <button
              onClick={() => { onSubmitted(); onClose(); }}
              style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Sluiten
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--app-border, #e5e7eb)', background: 'transparent', color: 'var(--app-text-secondary, #6b7280)', fontWeight: 500, fontSize: 13, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.5 : 1 }}
              >
                Overslaan
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: '#2563eb', color: '#fff',
                  fontWeight: 600, fontSize: 13, cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Bezig...' : '🚀 Genereer Video'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────

interface ReviewModalProps {
  job: GenerationJob;
  reviewList: GenerationJob[];
  onClose: () => void;
  onReviewed: (taskId: string, action: 'approve' | 'reject') => void;
}

function ReviewModal({ job, reviewList, onClose, onReviewed }: ReviewModalProps) {
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Per-variant selection: variant_index → true (approve) | false (reject) | null (pending)
  const initSelections = () => {
    const m: Record<number, boolean | null> = {};
    if (job.output_variants?.length) {
      for (const v of job.output_variants) {
        m[v.variant_index] = v.approved ?? null;
      }
    }
    return m;
  };
  const [selections, setSelections] = useState<Record<number, boolean | null>>(initSelections);

  // Reset selections when job changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSelections(initSelections()); setReviewError(null); }, [job.task_id]);

  const currentIdx = reviewList.findIndex(j => j.task_id === job.task_id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < reviewList.length - 1;
  const isCanReview = job.approval_status === 'pending_review' || !job.approval_status;

  // Build display variants: prefer output_variants, fall back to output_url
  const variants = job.output_variants?.length
    ? job.output_variants
    : job.output_url
    ? [{ variant_index: 0, presigned_url: job.output_url, storage_path: '', file_asset_id: null as null, mime_type: job.output_type === 'video' ? 'video/mp4' : 'image/jpeg', filename: '', approved: null as null }]
    : [];

  const toggleVariant = (idx: number, val: boolean) =>
    setSelections(prev => ({ ...prev, [idx]: prev[idx] === val ? null : val }));

  const selectAll = (val: boolean) => {
    const next: Record<number, boolean | null> = {};
    for (const v of variants) next[v.variant_index] = val;
    setSelections(next);
  };

  const handleSubmit = async (action: 'approve' | 'reject') => {
    setReviewing(action);
    setReviewError(null);
    try { onReviewed(job.task_id, action); } catch { /* handled externally */ } finally { setReviewing(null); }
  };

  const isVideo = (v: { mime_type: string; filename: string }) =>
    v.mime_type?.startsWith('video/') || v.filename?.endsWith('.mp4') || v.filename?.endsWith('.webm') || job.output_type === 'video';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: variants.length > 1 ? 980 : 740, backgroundColor: 'var(--app-surface, #fff)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh', boxShadow: '0 24px 64px rgba(0,0,0,0.36)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--app-border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div className="flex-1">
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text, #111)' }}>{job.label || job.template_id}</div>
            <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)', marginTop: 2 }}>
              {job.output_type} · {new Date(job.created_at).toLocaleString()}
              {reviewList.length > 0 && ` · ${currentIdx + 1} van ${reviewList.length}`}
              {variants.length > 1 && ` · ${variants.length} varianten`}
            </div>
            {(job.provider || job.model || job.duration_seconds != null) && (
              <div style={{ fontSize: 10, color: 'var(--app-text-secondary, #9ca3af)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {job.provider && <span>🤖 <strong>{job.provider}</strong></span>}
                {job.model && <span>📦 {job.model}</span>}
                {job.duration_seconds != null && <span>⏱️ {job.duration_seconds < 60 ? `${Math.round(job.duration_seconds)}s` : `${Math.floor(job.duration_seconds / 60)}m ${Math.round(job.duration_seconds % 60)}s`}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={!hasPrev} onClick={() => onReviewed('__prev__', 'approve')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'transparent', cursor: hasPrev ? 'pointer' : 'default', opacity: hasPrev ? 1 : 0.3, fontSize: 16 }}>&#8249;</button>
            <button disabled={!hasNext} onClick={() => onReviewed('__next__', 'reject')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'transparent', cursor: hasNext ? 'pointer' : 'default', opacity: hasNext ? 1 : 0.3, fontSize: 16 }}>&#8250;</button>
          </div>
          <button onClick={onClose} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>&times;</button>
        </div>

        {/* Variants gallery */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0f172a', padding: variants.length > 1 ? 12 : 0 }}>
          {variants.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, padding: 24, color: '#6b7280', fontSize: 13, textAlign: 'center', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 32 }}>&#128679;</div>
              <div>Preview niet beschikbaar</div>
              <div style={{ fontSize: 11, color: '#4b5563' }}>Bestand nog niet opgeslagen — genereer opnieuw om op te slaan</div>
            </div>
          )}
          {variants.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {variants.map(v => {
                const url = v.presigned_url || '';
                const sel = selections[v.variant_index];
                const borderColor = sel === true ? '#16a34a' : sel === false ? '#dc2626' : '#334155';
                return (
                  <div key={v.variant_index} style={{ display: 'flex', flexDirection: 'column', width: variants.length === 1 ? '100%' : 'calc(50% - 8px)', minWidth: 260, maxWidth: 460 }}>
                    {/* Media */}
                    <div style={{ position: 'relative', backgroundColor: '#1e293b', borderRadius: 8, overflow: 'hidden', border: `2px solid ${borderColor}`, transition: 'border-color 0.15s' }}>
                      {url ? (
                        isVideo(v) ? (
                          <video src={url} controls autoPlay={variants.length === 1} loop style={{ width: '100%', maxHeight: variants.length === 1 ? 450 : 260, display: 'block' }} />
                        ) : (
                          <img src={url} alt={`Variant ${v.variant_index + 1}`} style={{ width: '100%', maxHeight: variants.length === 1 ? 450 : 260, objectFit: 'contain', display: 'block' }} />
                        )
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: variants.length === 1 ? 280 : 160, color: '#475569', fontSize: 12, flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 28 }}>&#128679;</div>
                          <div>Geen preview</div>
                          {v.storage_path && <div style={{ fontSize: 10, color: '#334155', wordBreak: 'break-all', padding: '0 8px' }}>{v.storage_path}</div>}
                        </div>
                      )}
                      {variants.length > 1 && (
                        <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, fontWeight: 700, color: '#e2e8f0', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 6px' }}>
                          Variant {v.variant_index + 1}
                        </div>
                      )}
                    </div>
                    {/* Per-variant approve/reject — only for multi-variant jobs */}
                    {isCanReview && variants.length > 1 && (
                      <div style={{ display: 'flex', gap: 6, padding: '8px 2px' }}>
                        <button
                          onClick={() => toggleVariant(v.variant_index, true)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: `1.5px solid ${sel === true ? '#16a34a' : '#c6f0d4'}`, background: sel === true ? '#16a34a' : '#f0fdf4', color: sel === true ? '#fff' : '#15803d', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s' }}
                        >
                          {sel === true ? '✔ Geselecteerd' : '✔ Kies'}
                        </button>
                        <button
                          onClick={() => toggleVariant(v.variant_index, false)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: `1.5px solid ${sel === false ? '#dc2626' : '#fca5a5'}`, background: sel === false ? '#dc2626' : '#fff5f5', color: sel === false ? '#fff' : '#dc2626', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.12s' }}
                        >
                          {sel === false ? '✘ Afgewezen' : '✘ Afwijzen'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--app-border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          {reviewError && <div style={{ flex: 1, fontSize: 12, color: '#dc2626' }}>{reviewError}</div>}
          {!isCanReview && !reviewError && (
            <div style={{ flex: 1, fontSize: 12, color: '#6b7280' }}>
              {job.approval_status === 'approved' ? '✔ Goedgekeurd' : '✘ Afgewezen'}
            </div>
          )}
          {isCanReview && <div className="flex-1" />}
          {isCanReview && variants.length > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => selectAll(true)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #c6f0d4', background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Alles ✔</button>
              <button onClick={() => selectAll(false)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Alles ✘</button>
            </div>
          )}
          {isCanReview && (
            <>
              <button
                onClick={() => handleSubmit('reject')}
                disabled={!!reviewing}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #fca5a5', background: reviewing === 'reject' ? '#fee2e2' : '#fff5f5', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: reviewing ? 'default' : 'pointer', opacity: reviewing && reviewing !== 'reject' ? 0.5 : 1 }}
              >
                {reviewing === 'reject' ? '...' : '✘ Afwijzen'}
              </button>
              <button
                onClick={() => handleSubmit('approve')}
                disabled={!!reviewing}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: reviewing === 'approve' ? '#15803d' : '#16a34a', color: '#fff', fontWeight: 600, fontSize: 13, cursor: reviewing ? 'default' : 'pointer', opacity: reviewing && reviewing !== 'approve' ? 0.5 : 1 }}
              >
                {reviewing === 'approve' ? '...' : '✔ Goedkeuren'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Video Review Modal ───────────────────────────────────────────────────────

interface VideoReviewModalProps {
  job: VideoJob;
  onClose: () => void;
  onActionComplete: () => void;
  pushToast: (msg: string, type: 'success' | 'error') => void;
  approveJob: (jobId: string) => Promise<any>;
  rejectJob: (jobId: string) => Promise<any>;
}

function VideoReviewModal({ job, onClose, onActionComplete, pushToast, approveJob, rejectJob }: VideoReviewModalProps) {
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const wf = job.workflow_instance;
  const metaStatus = (job as any).metadata?.approval_status;
  const isApproved = wf?.current_state === 'approved' || metaStatus === 'approved';
  const isRejected = wf?.current_state === 'rejected' || metaStatus === 'rejected';
  const isCompleted = job.status === 'completed';
  const isCanReview = isCompleted && !isApproved && !isRejected;

  const handleAction = async (action: 'approve' | 'reject') => {
    setReviewing(action);
    try {
      if (action === 'approve') {
        await approveJob(job.id);
      } else {
        await rejectJob(job.id);
      }
      pushToast(
        action === 'approve' ? '✅ Video goedgekeurd' : '✘ Video afgewezen',
        'success'
      );
      onActionComplete();
    } catch (err: any) {
      pushToast(err?.message || `Actie "${action}" mislukt`, 'error');
    } finally {
      setReviewing(null);
    }
  };

  const typeDisplay = getJobTypeDisplay(job.job_type);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 740, backgroundColor: 'var(--app-surface, #fff)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh', boxShadow: '0 24px 64px rgba(0,0,0,0.36)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--app-border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div className="flex-1">
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text, #111)' }}>{typeDisplay.icon} {typeDisplay.label}</div>
            <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)', marginTop: 2 }}>
              video · {new Date(job.created_at).toLocaleString('nl-NL')}
              {job.preset_name && <> · Preset: {job.preset_name}</>}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>&times;</button>
        </div>

        {/* Video Preview */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0f172a' }}>
          {job.output_url ? (
            <video
              src={job.output_url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: 450, display: 'block' }}
              poster={job.thumbnail_url || undefined}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, padding: 24, color: '#6b7280', fontSize: 13, textAlign: 'center', gap: 8 }}>
              <div style={{ fontSize: 32 }}>🎬</div>
              <div>Video preview niet beschikbaar</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--app-border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          {isApproved && <div style={{ flex: 1, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✔ Goedgekeurd</div>}
          {isRejected && <div style={{ flex: 1, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>✘ Afgewezen</div>}
          {isCanReview && <div className="flex-1" />}
          {!isCanReview && !isApproved && !isRejected && (
            <div style={{ flex: 1, fontSize: 12, color: '#6b7280' }}>Status: {job.status}</div>
          )}
          {isCanReview && (
            <>
              <button
                onClick={() => handleAction('reject')}
                disabled={!!reviewing}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #fca5a5', background: reviewing === 'reject' ? '#fee2e2' : '#fff5f5', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: reviewing ? 'default' : 'pointer', opacity: reviewing && reviewing !== 'reject' ? 0.5 : 1 }}
              >
                {reviewing === 'reject' ? '...' : '✘ Afwijzen'}
              </button>
              <button
                onClick={() => handleAction('approve')}
                disabled={!!reviewing}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: reviewing === 'approve' ? '#15803d' : '#16a34a', color: '#fff', fontWeight: 600, fontSize: 13, cursor: reviewing ? 'default' : 'pointer', opacity: reviewing && reviewing !== 'approve' ? 0.5 : 1 }}
              >
                {reviewing === 'approve' ? '...' : '✔ Goedkeuren'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const location = useLocation();
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const filter: FilterState = (['all', 'review', 'active', 'completed', 'rejected', 'ai_queue', 'video'] as const).includes(rawTab as FilterState)
    ? (rawTab as FilterState)
    : 'all';
  const [actionError, setActionError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentTypeFilter>('all');

  // Review modal
  const [modalJob, setModalJob] = useState<GenerationJob | null>(null);

  // Video review modal
  const [modalVideoJob, setModalVideoJob] = useState<VideoJob | null>(null);

  // Video follow-up modal (shown after fullbody_in_tenue approval)
  const [videoFollowUp, setVideoFollowUp] = useState<VideoFollowUpInfo | null>(null);

  // Photo composite follow-up modal (shown after photo_composite_gemini approval)
  const [photoCompositeFollowUp, setPhotoCompositeFollowUp] = useState<PhotoCompositeFollowUpInfo | null>(null);

  // Optimistic approval overrides (task_id → approval_status string)
  const [optimisticApprovals, setOptimisticApprovals] = useState<Record<string, string>>({});

  // ── Toast notifications ──────────────────────────────────────────
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const pushToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const askedPushRef = useRef(false);
  useEffect(() => {
    if (filter === 'ai_queue' && !askedPushRef.current && 'Notification' in window && Notification.permission === 'default') {
      askedPushRef.current = true;
      Notification.requestPermission();
    }
  }, [filter]);

  // ── AI Generation Jobs ───────────────────────────────────────────
  const handleJobStatusChange = useCallback((job: GenerationJob, _prev: GenJobStatus) => {
    const label = job.label || job.template_id;
    if (job.status === 'completed') {
      pushToast(`✅ AI job voltooid: ${label} — open AI Queue om te beoordelen`, 'success');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Generatie voltooid', { body: `${label} — klaar voor beoordeling`, icon: '/favicon.ico' });
      }
    } else if (job.status === 'failed') {
      pushToast(`❌ AI job mislukt: ${label}`, 'error');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Generatie mislukt', { body: label, icon: '/favicon.ico' });
      }
    }
  }, [pushToast]);

  const { jobs: aiJobs, loading: aiLoading, error: aiError, refresh: refreshAiJobs } = useGenerationJobs({
    pollInterval: filter === 'ai_queue' ? 5000 : 15000,
    onStatusChange: handleJobStatusChange,
  });

  // Merge with optimistic state
  const mergedJobs = aiJobs.map(j =>
    optimisticApprovals[j.task_id]
      ? { ...j, approval_status: optimisticApprovals[j.task_id] as any }
      : j
  );

  const { instances, loading, error, refresh } = useWorkflowInstances({ page_size: 100 });

  // ── Video Processing Jobs ────────────────────────────────────────
  // NOTE: Pass null (not projectId) so the queue shows jobs across ALL
  // projects the user is a member of.  Sending a single context-switcher
  // project_id caused 403 when the user wasn't a direct member.
  const {
    jobs: videoJobs,
    loading: videoLoading,
    error: videoError,
    refresh: refreshVideoJobs,
    cancelJob: cancelVideoJob,
    retryJob: retryVideoJob,
    approveJob: approveVideoJob,
    rejectJob: rejectVideoJob,
  } = useVideoJobs({ projectId: null });

  const handleTransitionComplete = useCallback(
    (_entry: TransitionHistoryEntry) => {
      setActionError(null);
      refresh();
    },
    [refresh]
  );

  const filtered = instances.filter(i => matchesFilter(i, filter)).sort(sortPriority);

  const needsReviewJobs = mergedJobs.filter(j => j.status === 'completed' && (j.approval_status === 'pending_review' || !j.approval_status));

  // Resolved modal job (reflects optimistic approvals)
  const resolvedModalJob = modalJob
    ? mergedJobs.find(j => j.task_id === modalJob.task_id) ?? modalJob
    : null;

  const openModal = (job: GenerationJob) => setModalJob(job);

  // Handle review action or navigation from modal
  const handleModalAction = useCallback(async (taskId: string, action: 'approve' | 'reject') => {
    // Navigation only
    if (taskId === '__prev__') {
      const cur = modalJob ? needsReviewJobs.findIndex(j => j.task_id === modalJob.task_id) : 0;
      const prev = needsReviewJobs[cur - 1];
      if (prev) setModalJob(prev);
      return;
    }
    if (taskId === '__next__') {
      const cur = modalJob ? needsReviewJobs.findIndex(j => j.task_id === modalJob.task_id) : 0;
      const next = needsReviewJobs[cur + 1];
      if (next) setModalJob(next);
      return;
    }

    // Optimistic update immediately
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    setOptimisticApprovals(prev => ({ ...prev, [taskId]: newStatus }));

    // Auto-advance: find next needs-review item
    const remaining = needsReviewJobs.filter(j => j.task_id !== taskId);
    const curIdx = needsReviewJobs.findIndex(j => j.task_id === taskId);
    if (remaining.length > 0) {
      const nextIdx = Math.min(curIdx, remaining.length - 1);
      setModalJob(remaining[nextIdx]);
    } else {
      setModalJob(null);
    }

    // API call
    try {
      const result = await reviewJob(taskId, action);
      pushToast(action === 'approve' ? '✅ Goedgekeurd!' : '❌ Afgewezen', 'success');

      // After approving a fullbody_in_tenue job, offer to generate videos
      if (action === 'approve') {
        const approvedJob = mergedJobs.find(j => j.task_id === taskId);
        if (approvedJob && approvedJob.template_id === 'fullbody_in_tenue' && approvedJob.membership_id) {
          // Find the first approved variant's presigned URL
          const approvedVariants = result?.output_variants?.filter((v: any) => v.approved === true) || [];
          const imageUrl = approvedVariants[0]?.presigned_url || approvedJob.output_url;
          if (imageUrl) {
            // Parse kit_type from the job label or filename (e.g. "Player in Tenue (home)")
            const kitMatch = approvedJob.label?.match(/\((home|away|third|goalkeeper)\)/i);
            const kitType = kitMatch ? kitMatch[1].toLowerCase() : 'home';
            setVideoFollowUp({
              membershipId: approvedJob.membership_id,
              projectId: approvedJob.project_id || '',
              organisationId: '',  // Will be filled from context
              approvedImageUrl: imageUrl,
              kitType,
              memberName: approvedJob.membership_name || approvedJob.label || 'Speler',
            });
          }
        }

        // After approving a photo_composite_gemini job, offer to generate video
        if (approvedJob && approvedJob.template_id === 'photo_composite_gemini' && approvedJob.membership_id) {
          const approvedVariants = result?.output_variants?.filter((v: any) => v.approved === true) || [];
          const imageUrl = approvedVariants[0]?.presigned_url || approvedJob.output_url;
          if (imageUrl) {
            setPhotoCompositeFollowUp({
              membershipId: approvedJob.membership_id,
              projectId: approvedJob.project_id || '',
              approvedImageUrl: imageUrl,
              memberName: approvedJob.membership_name || approvedJob.label || 'Speler',
            });
          }
        }
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Review mislukt', 'error');
      // Revert
      setOptimisticApprovals(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    }
  }, [modalJob, mergedJobs, needsReviewJobs, pushToast]);

  const visibleAiJobs = filterAiJobsByTab(mergedJobs, filter);
  const visibleVideoJobs = useMemo(() => filterVideoJobsByTab(videoJobs, filter), [videoJobs, filter]);

  // ── Content type filter counts ───────────────────────────────────
  const contentTypeCounts = useMemo(() => ({
    all: visibleAiJobs.length + visibleVideoJobs.length,
    ai_video: visibleAiJobs.filter(j => j.output_type === 'video').length,
    ai_image: visibleAiJobs.filter(j => j.output_type === 'image').length,
    lineup_video: visibleVideoJobs.filter(j => j.job_type === 'lineup').length,
    video_processing: visibleVideoJobs.filter(j => j.job_type !== 'lineup').length,
  }), [visibleAiJobs, visibleVideoJobs]);

  // ── Unified items: merge AI + video jobs in one chronological list ──
  type UnifiedItem =
    | { kind: 'ai'; job: GenerationJob; sortDate: number }
    | { kind: 'video'; job: VideoJob; sortDate: number };

  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    for (const job of visibleAiJobs) {
      if (contentType === 'ai_video' && job.output_type !== 'video') continue;
      if (contentType === 'ai_image' && job.output_type !== 'image') continue;
      if (contentType === 'lineup_video' || contentType === 'video_processing') continue;
      items.push({ kind: 'ai', job, sortDate: new Date(job.created_at).getTime() });
    }
    for (const vj of visibleVideoJobs) {
      if (contentType === 'ai_video' || contentType === 'ai_image') continue;
      if (contentType === 'lineup_video' && vj.job_type !== 'lineup') continue;
      if (contentType === 'video_processing' && vj.job_type === 'lineup') continue;
      items.push({ kind: 'video', job: vj, sortDate: new Date(vj.created_at).getTime() });
    }
    return items.sort((a, b) => b.sortDate - a.sortDate);
  }, [visibleAiJobs, visibleVideoJobs, contentType]);

  const tabTitles: Record<FilterState, { title: string; subtitle: string }> = {
    all: { title: 'Queue', subtitle: 'Alle items — workflows, AI-generatie en video processing.' },
    review: { title: 'Needs Review', subtitle: 'Items die wachten op beoordeling.' },
    active: { title: 'In Progress', subtitle: 'Actieve workflows, AI-jobs en video processing.' },
    completed: { title: 'Approved', subtitle: 'Goedgekeurde en afgeronde items.' },
    rejected: { title: 'Rejected', subtitle: 'Afgewezen en mislukte items.' },
    ai_queue: { title: 'AI Queue', subtitle: 'Alle AI-generatie jobs.' },
    video: { title: 'Video Processing', subtitle: 'Transcode, compose en lineup jobs.' },
  };

  const statusIcon: Record<GenJobStatus, string> = {
    queued: '⏳', waiting: '⏳', processing: '', completed: '✅', failed: '❌', cancelled: '',
  };
  const statusColor: Record<GenJobStatus, string> = {
    queued: '#6b7280', waiting: '#6b7280', processing: '#2563eb', completed: '#16a34a', failed: '#dc2626', cancelled: '#9ca3af',
  };

  return (
    <>
      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 88, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#fff', backgroundColor: t.type === 'success' ? '#16a34a' : '#dc2626', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'auto', maxWidth: 360 }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Review modal */}
      {resolvedModalJob && (
        <ReviewModal
          job={resolvedModalJob}
          reviewList={needsReviewJobs}
          onClose={() => setModalJob(null)}
          onReviewed={handleModalAction}
        />
      )}

      {/* Video review modal */}
      {modalVideoJob && (
        <VideoReviewModal
          job={modalVideoJob}
          onClose={() => setModalVideoJob(null)}
          onActionComplete={() => {
            setModalVideoJob(null);
            refreshVideoJobs();
          }}
          pushToast={pushToast}
          approveJob={approveVideoJob}
          rejectJob={rejectVideoJob}
        />
      )}

      {/* Video follow-up modal (after fullbody approval) */}
      {videoFollowUp && (
        <VideoFollowUpModal
          info={videoFollowUp}
          onClose={() => setVideoFollowUp(null)}
          onSubmitted={(count) => {
            pushToast(`🎬 ${count} video${count > 1 ? "'s" : ''} in de wachtrij gezet!`, 'success');
            setVideoFollowUp(null);
            refreshAiJobs();
          }}
        />
      )}

      {/* Photo composite video follow-up modal (after photo_composite_gemini approval) */}
      {photoCompositeFollowUp && (
        <PhotoCompositeFollowUpModal
          info={photoCompositeFollowUp}
          onClose={() => setPhotoCompositeFollowUp(null)}
          onSubmitted={() => {
            pushToast('🎬 Video in de wachtrij gezet!', 'success');
            setPhotoCompositeFollowUp(null);
            refreshAiJobs();
          }}
        />
      )}

      <PageHeader
        title={tabTitles[filter].title}
        subtitle={tabTitles[filter].subtitle}
        actions={
          <div className="flex-row gap-8">
            {needsReviewJobs.length > 0 && (filter === 'ai_queue' || filter === 'review' || filter === 'all') && (
              <button
                onClick={() => openModal(needsReviewJobs[0])}
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d97706', background: '#fffbeb', color: '#d97706', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Begin beoordelen ({needsReviewJobs.length})
              </button>
            )}
            <button onClick={() => { refresh(); refreshAiJobs(); refreshVideoJobs(); }} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--app-border, #e5e7eb)', backgroundColor: 'transparent', color: 'var(--app-text, #111)', cursor: 'pointer' }}>
              ↻ Refresh
            </button>
          </div>
        }
      />

      <PageContent>
        {/* ── Mobile tab bar (filter tabs from Panel B) ── */}
        <MobileTabBar
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'review', label: 'Needs Review' },
            { id: 'active', label: 'In Progress' },
            { id: 'completed', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'ai_queue', label: 'AI Queue' },
            { id: 'video', label: 'Video' },
          ]}
          activeTab={filter}
          basePath="/approvals"
        />

        {/* ── Errors ── */}
        {(error || actionError || aiError || videoError) && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {actionError || error || aiError || videoError}
          </div>
        )}

        {/* ── Loading ── */}
        {(loading || aiLoading || videoLoading) && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
            Loading...
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !aiLoading && !videoLoading && filtered.length === 0 && unifiedItems.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--app-text-secondary, #9ca3af)', backgroundColor: 'var(--app-surface-2, #f9fafb)', borderRadius: 12, border: '1px dashed var(--app-border, #e5e7eb)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Geen items</div>
            <div className="fs-12">Er zijn geen items voor dit filter.</div>
          </div>
        )}

        {/* ── Content type filter chips ── */}
        {!aiLoading && !videoLoading && (visibleAiJobs.length > 0 || visibleVideoJobs.length > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {CONTENT_TYPE_CHIPS.map(chip => {
              const count = contentTypeCounts[chip.key];
              const isActive = contentType === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setContentType(chip.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${isActive ? '#2563eb' : 'var(--app-border, #e5e7eb)'}`,
                    backgroundColor: isActive ? '#2563eb' : 'var(--app-surface, #fff)',
                    color: isActive ? '#fff' : 'var(--app-text-secondary, #6b7280)',
                    cursor: count > 0 || chip.key === 'all' ? 'pointer' : 'default',
                    opacity: count > 0 || chip.key === 'all' ? 1 : 0.4,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--app-surface-2, #f3f4f6)',
                    borderRadius: 99, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Unified Jobs List (AI + Video interleaved by date) ── */}
        {!aiLoading && !videoLoading && unifiedItems.length > 0 && (
          <div className="flex-col gap-8" style={{ marginBottom: filtered.length > 0 ? 24 : 0 }}>
            {unifiedItems.map(item => {
              if (item.kind === 'ai') {
                const job = item.job;
                const isActive = job.status === 'processing' || job.status === 'queued' || job.status === 'waiting';
                const isReviewable = job.status === 'completed' && (job.approval_status === 'pending_review' || !job.approval_status);
                const approvalBadge = job.approval_status === 'approved'
                  ? { label: 'Goedgekeurd', color: '#16a34a' }
                  : job.approval_status === 'rejected'
                  ? { label: 'Afgewezen', color: '#dc2626' }
                  : job.status === 'completed' ? { label: 'Te beoordelen', color: '#d97706' }
                  : null;
                const typeBadgeColor = job.output_type === 'video' ? '#8b5cf6' : job.output_type === 'image' ? '#d946ef' : '#6366f1';
                const typeBadgeLabel = job.output_type === 'video' ? 'AI VIDEO' : job.output_type === 'image' ? 'AI IMAGE' : 'AI';

                return (
                  <div
                    key={`ai-${job.task_id}`}
                    onClick={() => job.status === 'completed' && openModal(job)}
                    style={{
                      padding: '14px 16px', backgroundColor: 'var(--app-surface, #fff)', borderRadius: 10,
                      border: `1px solid ${job.status === 'failed' ? '#fca5a5' : isReviewable ? '#fde68a' : 'var(--app-border, #e5e7eb)'}`,
                      transition: 'box-shadow 0.15s', cursor: job.status === 'completed' ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}
                    onMouseEnter={e => { if (job.status === 'completed') e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.09)'; }}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <span className="fs-20" style={{ flexShrink: 0 }}>{statusIcon[job.status]}</span>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text, #111)', marginBottom: 2 }}>{job.label || job.template_id}</div>
                      <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>
                        {job.output_type} · {new Date(job.created_at).toLocaleString()}
                        {job.provider && <> · <span className="fw-600">{job.provider}</span></>}
                        {job.model && <> · {job.model}</>}
                        {job.duration_seconds != null && <> · {job.duration_seconds < 60 ? `${Math.round(job.duration_seconds)}s` : `${Math.floor(job.duration_seconds / 60)}m ${Math.round(job.duration_seconds % 60)}s`}</>}
                        {(job.variant_count ?? 0) > 1 && <> · {job.variant_count} varianten</>}
                      </div>
                      {isActive && (
                        <div style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                          <div style={{ height: '100%', width: `${job.progress || 0}%`, backgroundColor: '#2563eb', borderRadius: 99, transition: 'width 0.4s ease', minWidth: job.progress ? 0 : '8%' }} />
                        </div>
                      )}
                      {job.status === 'failed' && job.error_message && (
                        <div style={{ fontSize: 11, color: '#dc2626', backgroundColor: '#fee2e2', borderRadius: 6, padding: '3px 8px', marginTop: 4 }}>{job.error_message}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: typeBadgeColor, backgroundColor: `${typeBadgeColor}18`, borderRadius: 99, padding: '2px 8px', letterSpacing: '0.04em' }}>
                        {typeBadgeLabel}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[job.status], backgroundColor: `${statusColor[job.status]}18`, borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {job.status}
                      </span>
                      {approvalBadge && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: approvalBadge.color, backgroundColor: `${approvalBadge.color}18`, borderRadius: 99, padding: '2px 8px' }}>
                          {approvalBadge.label}
                        </span>
                      )}
                    </div>
                    {job.status === 'completed' && <span style={{ color: '#d1d5db', fontSize: 16, flexShrink: 0 }}>›</span>}
                  </div>
                );
              } else {
                const vJob = item.job;
                const statusDisplay = getJobStatusDisplay(vJob.status);
                const typeDisplay = getJobTypeDisplay(vJob.job_type);
                const isActive = vJob.status === 'queued' || vJob.status === 'processing';

                const isClickable = vJob.status === 'completed';

                return (
                  <div
                    key={`video-${vJob.id}`}
                    onClick={() => isClickable && setModalVideoJob(vJob)}
                    style={{
                      padding: '14px 16px', backgroundColor: 'var(--app-surface, #fff)', borderRadius: 10,
                      border: `1px solid ${vJob.status === 'failed' ? '#fca5a5' : isActive ? '#93c5fd' : isClickable && vJob.workflow_instance?.current_state === 'ready_for_review' ? '#fde68a' : 'var(--app-border, #e5e7eb)'}`,
                      display: 'flex', flexDirection: 'column', gap: 10,
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { if (isClickable) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.09)'; }}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Header */}
                    <div className="flex-between">
                      <div className="flex-row gap-8">
                        <span className="fs-18">{typeDisplay.icon}</span>
                        <span className="fw-600 fs-13 text-primary">{typeDisplay.label}</span>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--app-text-secondary, #6b7280)' }}>{vJob.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex-row gap-6">
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', backgroundColor: '#0891b218', borderRadius: 99, padding: '2px 8px', letterSpacing: '0.04em' }}>
                          {vJob.job_type === 'lineup' ? 'LINEUP' : vJob.job_type === 'goal_celebration' ? 'GOAL' : 'VIDEO'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, color: statusDisplay.color, backgroundColor: `${statusDisplay.color}18`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    {isActive && (
                      <div className="flex-row gap-8">
                        <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'var(--app-border, #e5e7eb)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(vJob.progress_percent, 100)}%`, height: '100%', borderRadius: 3, backgroundColor: vJob.progress_percent >= 100 ? '#059669' : '#2563eb', transition: 'width 0.5s ease-out' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--app-text-secondary, #6b7280)', minWidth: 32 }}>{vJob.progress_percent}%</span>
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--app-text-secondary, #6b7280)', flexWrap: 'wrap' }}>
                      <span>{new Date(vJob.created_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      {vJob.started_at && <span>Duur: {formatVideoDuration(vJob.started_at, vJob.completed_at)}</span>}
                      {vJob.preset_name && <span>Preset: {vJob.preset_name}</span>}
                      {vJob.retry_count > 0 && <span>Retries: {vJob.retry_count}</span>}
                    </div>

                    {/* Error */}
                    {vJob.error_message && (
                      <div style={{ fontSize: 12, color: '#dc2626', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #dc2626' }}>
                        {vJob.error_message}
                      </div>
                    )}

                    {/* Workflow info */}
                    {vJob.workflow_instance && (
                      <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #6b7280)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🔄 Workflow: {vJob.workflow_instance.template_name} — {vJob.workflow_instance.current_state}
                        {vJob.workflow_instance.current_state === 'ready_for_review' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', backgroundColor: '#d9770618', borderRadius: 99, padding: '2px 8px' }}>
                            Te beoordelen
                          </span>
                        )}
                        {vJob.workflow_instance.current_state === 'approved' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', backgroundColor: '#16a34a18', borderRadius: 99, padding: '2px 8px' }}>
                            Goedgekeurd
                          </span>
                        )}
                        {vJob.workflow_instance.current_state === 'rejected' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', backgroundColor: '#dc262618', borderRadius: 99, padding: '2px 8px' }}>
                            Afgewezen
                          </span>
                        )}
                      </div>
                    )}

                    {/* Clickable hint for completed jobs */}
                    {isClickable && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>
                          {vJob.workflow_instance?.available_actions?.length ? 'Klik om te beoordelen' : 'Klik voor preview'}
                        </span>
                        <span style={{ color: '#d1d5db', fontSize: 16 }}>›</span>
                      </div>
                    )}

                    {/* Cancel/Retry actions */}
                    {(isActive || vJob.status === 'failed') && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {isActive && (
                          <button
                            onClick={() => cancelVideoJob(vJob.id)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #dc2626', backgroundColor: 'transparent', color: '#dc2626', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        )}
                        {vJob.status === 'failed' && (
                          <button
                            onClick={() => retryVideoJob(vJob.id)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #2563eb', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer' }}
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* ── Workflow instances (hidden on ai_queue and video tabs) ── */}
        {filter !== 'ai_queue' && filter !== 'video' && !loading && filtered.length > 0 && (
          <div className="flex-col gap-10">
            {filtered.map(instance => (
              <div
                key={instance.id}
                style={{ padding: 16, backgroundColor: 'var(--app-surface, #fff)', borderRadius: 10, border: '1px solid var(--app-border, #e5e7eb)', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', backgroundColor: '#f3f4f6', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {getEntityLabel(instance.content_type_name)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text, #111)' }}>
                        {instance.context?.title || instance.context?.name || `#${instance.object_id}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>
                      {instance.workflow_name} · Updated {new Date(instance.updated_at).toLocaleDateString()}
                      {instance.created_by_username && ` · by ${instance.created_by_username}`}
                    </div>
                  </div>
                  <WorkflowStatusBadge state={instance.current_state} />
                </div>
                {instance.available_actions.length > 0 && (
                  <WorkflowActionButtons
                    instanceId={instance.id}
                    availableActions={instance.available_actions}
                    onTransitionComplete={handleTransitionComplete}
                    onError={setActionError}
                    size="sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </PageContent>

    </>
  );
}
