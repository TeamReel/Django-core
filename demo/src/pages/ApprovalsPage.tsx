/**
 * ApprovalsPage â€” Global approval inbox showing all workflow instances
 * that require action, prioritized by state (review > active > draft).
 * Also contains the AI Generation Queue tab with full review workflow.
 *
 * Route: /approvals
 * Sidebar: CONTENT section
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { getApiBaseUrl } from '../utils/apiBase';

type FilterState = 'all' | 'review' | 'active' | 'completed' | 'rejected' | 'ai_queue';
type AiSubTab = 'needs_review' | 'in_progress' | 'approved' | 'rejected' | 'all';

const FILTER_OPTIONS: { value: FilterState; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'ðŸ“‹' },
  { value: 'review', label: 'Needs Review', icon: 'ðŸ‘€' },
  { value: 'active', label: 'In Progress', icon: 'ðŸ”„' },
  { value: 'completed', label: 'Approved', icon: 'âœ…' },
  { value: 'rejected', label: 'Rejected', icon: 'âŒ' },
  { value: 'ai_queue', label: 'AI Queue', icon: 'ðŸ¤–' },
];

const AI_SUB_TABS: { value: AiSubTab; label: string }[] = [
  { value: 'needs_review', label: 'Te Beoordelen' },
  { value: 'in_progress', label: 'Bezig' },
  { value: 'approved', label: 'Goedgekeurd' },
  { value: 'rejected', label: 'Afgewezen' },
  { value: 'all', label: 'Alles' },
];

function filterAiJobs(jobs: GenerationJob[], sub: AiSubTab): GenerationJob[] {
  switch (sub) {
    case 'needs_review':
      return jobs.filter(j => j.status === 'completed' && (j.approval_status === 'pending_review' || !j.approval_status));
    case 'in_progress':
      return jobs.filter(j => j.status === 'queued' || j.status === 'waiting' || j.status === 'processing');
    case 'approved':
      return jobs.filter(j => j.approval_status === 'approved');
    case 'rejected':
      return jobs.filter(j => j.approval_status === 'rejected');
    default:
      return jobs;
  }
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

// â”€â”€â”€ Review Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ReviewModalProps {
  job: GenerationJob;
  reviewList: GenerationJob[];
  onClose: () => void;
  /** Called with the reviewed task_id + action, or '__prev__' / '__next__' for navigation */
  onReviewed: (taskId: string, action: 'approve' | 'reject') => void;
}

function ReviewModal({ job, reviewList, onClose, onReviewed }: ReviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const currentIdx = reviewList.findIndex(j => j.task_id === job.task_id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < reviewList.length - 1;

  // Load preview on job change
  useEffect(() => {
    setPreviewUrl('');
    setPreviewLoading(true);
    setReviewError(null);

    if (job.output_url) {
      setPreviewUrl(job.output_url);
      setPreviewLoading(false);
      return;
    }

    // Try status-endpoint cache (image base64 or presigned URL)
    const apiBase = getApiBaseUrl();
    fetch(`${apiBase}/api/v1/generative/assets/generate/${job.task_id}/status/`, { credentials: 'include' })
      .then(r => r.json())
      .then(resp => {
        const payload = resp.data ?? resp;
        const variants: any[] = payload?.data?.variants ?? payload?.variants ?? [];
        const v = variants.find((x: any) => !x.error) ?? variants[0];
        if (!v) return;
        if (v.image_base64) setPreviewUrl(`data:${v.mime_type || 'image/jpeg'};base64,${v.image_base64}`);
        else if (v.presigned_url) setPreviewUrl(v.presigned_url);
        else if (v.video_url) setPreviewUrl(v.video_url);
      })
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [job.task_id, job.output_url]);

  const handleReview = async (action: 'approve' | 'reject') => {
    setReviewing(action);
    setReviewError(null);
    try {
      onReviewed(job.task_id, action);
    } catch {
      // onReviewed handles errors externally
    } finally {
      setReviewing(null);
    }
  };

  const isCanReview = job.approval_status === 'pending_review' || !job.approval_status;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 740,
          backgroundColor: 'var(--app-surface, #fff)',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.36)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--app-border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text, #111)' }}>{job.label || job.template_id}</div>
            <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)', marginTop: 2 }}>
              {job.output_type} Â· {new Date(job.created_at).toLocaleString()}
              {reviewList.length > 0 && ` Â· ${currentIdx + 1} van ${reviewList.length}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={!hasPrev}
              onClick={() => onReviewed('__prev__', 'approve')}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'transparent', cursor: hasPrev ? 'pointer' : 'default', opacity: hasPrev ? 1 : 0.3, fontSize: 14 }}
              title="Vorige"
            >â€¹</button>
            <button
              disabled={!hasNext}
              onClick={() => onReviewed('__next__', 'reject')}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'transparent', cursor: hasNext ? 'pointer' : 'default', opacity: hasNext ? 1 : 0.3, fontSize: 14 }}
              title="Volgende"
            >â€º</button>
          </div>
          <button onClick={onClose} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>âœ•</button>
        </div>

        {/* Preview */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, maxHeight: 460 }}>
          {previewLoading && (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Preview ladenâ€¦</div>
          )}
          {!previewLoading && !previewUrl && (
            <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>ðŸ–¼ï¸</div>
              <div>Preview niet beschikbaar</div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#4b5563' }}>Cache verlopen Â· output opgeslagen in spelersmeta</div>
            </div>
          )}
          {!previewLoading && previewUrl && job.output_type === 'video' && (
            <video src={previewUrl} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: 450, borderRadius: 4 }} />
          )}
          {!previewLoading && previewUrl && job.output_type !== 'video' && (
            <img src={previewUrl} alt="Generated output" style={{ maxWidth: '100%', maxHeight: 450, objectFit: 'contain', borderRadius: 4 }} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--app-border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {reviewError && <div style={{ flex: 1, fontSize: 12, color: '#dc2626' }}>{reviewError}</div>}
          {!isCanReview && !reviewError && (
            <div style={{ flex: 1, fontSize: 12, color: '#6b7280' }}>
              {job.approval_status === 'approved' ? 'âœ… Goedgekeurd' : 'âŒ Afgewezen'}
            </div>
          )}
          {isCanReview && !reviewError && <div style={{ flex: 1 }} />}
          {isCanReview && (
            <>
              <button
                onClick={() => handleReview('reject')}
                disabled={!!reviewing}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #fca5a5', background: reviewing === 'reject' ? '#fee2e2' : '#fff5f5', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: reviewing ? 'default' : 'pointer', opacity: reviewing && reviewing !== 'reject' ? 0.5 : 1 }}
              >
                {reviewing === 'reject' ? 'â€¦' : 'âŒ Afwijzen'}
              </button>
              <button
                onClick={() => handleReview('approve')}
                disabled={!!reviewing}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: reviewing === 'approve' ? '#15803d' : '#16a34a', color: '#fff', fontWeight: 600, fontSize: 13, cursor: reviewing ? 'default' : 'pointer', opacity: reviewing && reviewing !== 'approve' ? 0.5 : 1 }}
              >
                {reviewing === 'approve' ? 'â€¦' : 'âœ… Goedkeuren'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const filter: FilterState = (['all', 'review', 'active', 'completed', 'rejected', 'ai_queue'] as const).includes(rawTab as FilterState)
    ? (rawTab as FilterState)
    : 'all';
  const setFilter = (f: FilterState) => navigate(`/approvals?tab=${f}`, { replace: true });
  const [actionError, setActionError] = useState<string | null>(null);

  // AI sub-tab state
  const [aiSubTab, setAiSubTab] = useState<AiSubTab>('needs_review');

  // Review modal
  const [modalJob, setModalJob] = useState<GenerationJob | null>(null);

  // Optimistic approval overrides (task_id â†’ approval_status string)
  const [optimisticApprovals, setOptimisticApprovals] = useState<Record<string, string>>({});

  // â”€â”€ Toast notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ AI Generation Jobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleJobStatusChange = useCallback((job: GenerationJob, _prev: GenJobStatus) => {
    const label = job.label || job.template_id;
    if (job.status === 'completed') {
      pushToast(`âœ… AI job voltooid: ${label} â€” open AI Queue om te beoordelen`, 'success');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Generatie voltooid', { body: `${label} â€” klaar voor beoordeling`, icon: '/favicon.ico' });
      }
    } else if (job.status === 'failed') {
      pushToast(`âŒ AI job mislukt: ${label}`, 'error');
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

  const handleTransitionComplete = useCallback(
    (_entry: TransitionHistoryEntry) => {
      setActionError(null);
      refresh();
    },
    [refresh]
  );

  const filtered = instances.filter(i => matchesFilter(i, filter)).sort(sortPriority);

  // AI sub-tab counts
  const needsReviewJobs = filterAiJobs(mergedJobs, 'needs_review');
  const aiSubCounts: Record<AiSubTab, number> = {
    needs_review: needsReviewJobs.length,
    in_progress: filterAiJobs(mergedJobs, 'in_progress').length,
    approved: filterAiJobs(mergedJobs, 'approved').length,
    rejected: filterAiJobs(mergedJobs, 'rejected').length,
    all: mergedJobs.length,
  };

  const counts = {
    all: instances.length,
    review: instances.filter(i => classifyState(i.current_state) === 'review').length,
    active: instances.filter(i => ['active', 'initial'].includes(classifyState(i.current_state))).length,
    completed: instances.filter(i => classifyState(i.current_state) === 'terminal_success').length,
    rejected: instances.filter(i => classifyState(i.current_state) === 'terminal_failure').length,
    ai_queue: needsReviewJobs.length, // badge = items awaiting review
  };

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
      pushToast(action === 'approve' ? 'âœ… Goedgekeurd!' : 'âŒ Afgewezen', 'success');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Review mislukt', 'error');
      // Revert
      setOptimisticApprovals(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    }
  }, [modalJob, needsReviewJobs, pushToast]);

  const visibleAiJobs = filterAiJobs(mergedJobs, aiSubTab);

  const statusIcon: Record<GenJobStatus, string> = {
    queued: 'â³', waiting: 'â³', processing: 'ðŸ”„', completed: 'âœ…', failed: 'âŒ', cancelled: 'ðŸš«',
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
        title="Approvals"
        subtitle="Content review queue â€” approve, reject, and track AI generation jobs."
        actions={
          <button onClick={() => { refresh(); refreshAiJobs(); }} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--app-border, #e5e7eb)', backgroundColor: 'transparent', color: 'var(--app-text, #111)', cursor: 'pointer' }}>
            â†» Refresh
          </button>
        }
      />

      <PageContent>
        {/* Main filter tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--app-border, #e5e7eb)', overflowX: 'auto' }}>
          {FILTER_OPTIONS.map(opt => {
            const count = counts[opt.value];
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--app-primary, #2563eb)' : 'var(--app-text-secondary, #6b7280)',
                  backgroundColor: 'transparent', border: 'none',
                  borderBottom: isActive ? '2px solid var(--app-primary, #2563eb)' : '2px solid transparent',
                  borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
                }}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#fff' : '#6b7280', backgroundColor: isActive ? 'var(--app-primary, #2563eb)' : '#e5e7eb', borderRadius: 99, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* â”€â”€ AI Queue panel â”€â”€ */}
        {filter === 'ai_queue' && (
          <div>
            {/* Sub-tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--app-border, #e5e7eb)', alignItems: 'center' }}>
              {AI_SUB_TABS.map(sub => {
                const cnt = aiSubCounts[sub.value];
                const isActive = aiSubTab === sub.value;
                return (
                  <button
                    key={sub.value}
                    onClick={() => setAiSubTab(sub.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                      fontSize: 11, fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--app-primary, #2563eb)' : 'var(--app-text-secondary, #6b7280)',
                      backgroundColor: 'transparent', border: 'none',
                      borderBottom: isActive ? '2px solid var(--app-primary, #2563eb)' : '2px solid transparent',
                      borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
                    }}
                  >
                    {sub.label}
                    {cnt > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#fff' : '#6b7280', backgroundColor: isActive ? (sub.value === 'needs_review' ? '#d97706' : 'var(--app-primary, #2563eb)') : '#e5e7eb', borderRadius: 99, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
              <div style={{ flex: 1 }} />
              {needsReviewJobs.length > 0 && (
                <button
                  onClick={() => { setAiSubTab('needs_review'); openModal(needsReviewJobs[0]); }}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d97706', background: '#fffbeb', color: '#d97706', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 3 }}
                >
                  â–¶ Begin beoordelen ({needsReviewJobs.length})
                </button>
              )}
            </div>

            {aiLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>Loading AI jobs...</div>}
            {aiError && <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{aiError}</div>}

            {!aiLoading && visibleAiJobs.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--app-text-secondary, #9ca3af)', backgroundColor: 'var(--app-surface-2, #f9fafb)', borderRadius: 12, border: '1px dashed var(--app-border, #e5e7eb)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{aiSubTab === 'needs_review' ? 'ðŸŽ‰' : 'ðŸ¤–'}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {aiSubTab === 'needs_review' ? 'Alles beoordeeld!' : 'Geen items'}
                </div>
                <div style={{ fontSize: 12 }}>
                  {aiSubTab === 'needs_review' ? 'Er zijn geen AI-resultaten die nog beoordeeld moeten worden.' : 'Geen AI-jobs gevonden voor dit filter.'}
                </div>
              </div>
            )}

            {!aiLoading && visibleAiJobs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visibleAiJobs.map(job => {
                  const isActive = job.status === 'processing' || job.status === 'queued' || job.status === 'waiting';
                  const isReviewable = job.status === 'completed' && (job.approval_status === 'pending_review' || !job.approval_status);
                  const approvalBadge = job.approval_status === 'approved'
                    ? { label: 'Goedgekeurd', color: '#16a34a' }
                    : job.approval_status === 'rejected'
                    ? { label: 'Afgewezen', color: '#dc2626' }
                    : job.status === 'completed' ? { label: 'Te beoordelen', color: '#d97706' }
                    : null;

                  return (
                    <div
                      key={job.task_id}
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
                        <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>{job.output_type} Â· {new Date(job.created_at).toLocaleString()}</div>
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
                        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[job.status], backgroundColor: `${statusColor[job.status]}18`, borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {job.status}
                        </span>
                        {approvalBadge && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: approvalBadge.color, backgroundColor: `${approvalBadge.color}18`, borderRadius: 99, padding: '2px 8px' }}>
                            {approvalBadge.label}
                          </span>
                        )}
                      </div>
                      {job.status === 'completed' && <span style={{ color: '#d1d5db', fontSize: 16, flexShrink: 0 }}>â€º</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ Workflow panel (all other tabs) â”€â”€ */}
        {filter !== 'ai_queue' && (
          <>
            {(error || actionError) && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {actionError || error}
              </div>
            )}
            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
                Loading approval queue...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--app-text-secondary, #9ca3af)', backgroundColor: 'var(--app-surface-2, #f9fafb)', borderRadius: 12, border: '1px dashed var(--app-border, #e5e7eb)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{filter === 'review' ? 'ðŸŽ‰' : 'ðŸ“­'}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{filter === 'review' ? 'All caught up!' : 'No items found'}</div>
                <div style={{ fontSize: 12 }}>{filter === 'review' ? 'There are no items waiting for review.' : `No workflow items match the "${filter}" filter.`}</div>
              </div>
            )}
            {!loading && filtered.length > 0 && (
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
                          {instance.workflow_name} Â· Updated {new Date(instance.updated_at).toLocaleDateString()}
                          {instance.created_by_username && ` Â· by ${instance.created_by_username}`}
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
          </>
        )}
      </PageContent>
    </>
  );
}
