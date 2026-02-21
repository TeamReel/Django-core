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
import { PageContent, PageHeader } from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
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
      return jobs.filter(j => j.status === 'completed');
    case 'rejected':
      return jobs.filter(j => j.status === 'failed' || j.status === 'cancelled');
    case 'review':
    case 'ai_queue':
      return []; // these tabs don't show video jobs
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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text, #111)' }}>{job.label || job.template_id}</div>
            <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)', marginTop: 2 }}>
              {job.output_type} · {new Date(job.created_at).toLocaleString()}
              {reviewList.length > 0 && ` · ${currentIdx + 1} van ${reviewList.length}`}
              {variants.length > 1 && ` · ${variants.length} varianten`}
            </div>
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
                    {/* Per-variant approve/reject */}
                    {isCanReview && (
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
          {isCanReview && <div style={{ flex: 1 }} />}
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
                {reviewing === 'reject' ? '...' : '✘ Alles afwijzen'}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { context } = useContextSwitcher();
  const projectId = context.project?.id;
  const location = useLocation();
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const filter: FilterState = (['all', 'review', 'active', 'completed', 'rejected', 'ai_queue', 'video'] as const).includes(rawTab as FilterState)
    ? (rawTab as FilterState)
    : 'all';
  const [actionError, setActionError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentTypeFilter>('all');

  // Review modal
  const [modalJob, setModalJob] = useState<GenerationJob | null>(null);

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
  const {
    jobs: videoJobs,
    loading: videoLoading,
    error: videoError,
    refresh: refreshVideoJobs,
    cancelJob: cancelVideoJob,
    retryJob: retryVideoJob,
  } = useVideoJobs({ projectId: projectId || null });

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
      await reviewJob(taskId, action);
      pushToast(action === 'approve' ? '✅ Goedgekeurd!' : '❌ Afgewezen', 'success');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Review mislukt', 'error');
      // Revert
      setOptimisticApprovals(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    }
  }, [modalJob, needsReviewJobs, pushToast]);

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
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
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

      <PageHeader
        title={tabTitles[filter].title}
        subtitle={tabTitles[filter].subtitle}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            <div style={{ fontSize: 12 }}>Er zijn geen items voor dit filter.</div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: filtered.length > 0 ? 24 : 0 }}>
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
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{statusIcon[job.status]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text, #111)', marginBottom: 2 }}>{job.label || job.template_id}</div>
                      <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>{job.output_type} · {new Date(job.created_at).toLocaleString()}</div>
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

                return (
                  <div
                    key={`video-${vJob.id}`}
                    style={{
                      padding: '14px 16px', backgroundColor: 'var(--app-surface, #fff)', borderRadius: 10,
                      border: `1px solid ${vJob.status === 'failed' ? '#fca5a5' : isActive ? '#93c5fd' : 'var(--app-border, #e5e7eb)'}`,
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{typeDisplay.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--app-text)' }}>{typeDisplay.label}</span>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--app-text-secondary, #6b7280)' }}>{vJob.id.slice(0, 8)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', backgroundColor: '#0891b218', borderRadius: 99, padding: '2px 8px', letterSpacing: '0.04em' }}>
                          {vJob.job_type === 'lineup' ? 'LINEUP' : 'VIDEO'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, color: statusDisplay.color, backgroundColor: `${statusDisplay.color}18`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    {isActive && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      </div>
                    )}

                    {/* Actions */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
