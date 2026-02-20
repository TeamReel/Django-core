/**
 * ApprovalsPage — Global approval inbox showing all workflow instances
 * that require action, prioritized by state (review > active > draft).
 * Also contains the AI Generation Queue tab.
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
import { useGenerationJobs, type GenerationJob, type GenJobStatus } from '../hooks/useGenerationJobs';

type FilterState = 'all' | 'review' | 'active' | 'completed' | 'rejected' | 'ai_queue';

const FILTER_OPTIONS: { value: FilterState; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'review', label: 'Needs Review', icon: '👀' },
  { value: 'active', label: 'In Progress', icon: '🔄' },
  { value: 'completed', label: 'Approved', icon: '✅' },
  { value: 'rejected', label: 'Rejected', icon: '❌' },
  { value: 'ai_queue', label: 'AI Queue', icon: '🤖' },
];

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
  // Within same priority, newest first
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Read filter from URL ?tab= (set by sidebar Panel B)
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const filter: FilterState = (['all', 'review', 'active', 'completed', 'rejected', 'ai_queue'] as const).includes(rawTab as FilterState)
    ? (rawTab as FilterState)
    : 'all';
  const setFilter = (f: FilterState) => navigate(`/approvals?tab=${f}`, { replace: true });
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Toast notifications ──────────────────────────────────────────
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const pushToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  // Request browser push permission on first AI Queue visit
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
      pushToast(`✅ AI job voltooid: ${label}`, 'success');
      // Browser push notification (if permitted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Generatie voltooid', { body: label, icon: '/favicon.ico' });
      }
    } else if (job.status === 'failed') {
      pushToast(`❌ AI job mislukt: ${label}`, 'error');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Generatie mislukt', { body: label, icon: '/favicon.ico' });
      }
    }
  }, [pushToast]);

  const { jobs: aiJobs, activeCount: aiActiveCount, loading: aiLoading, error: aiError, refresh: refreshAiJobs } = useGenerationJobs({
    pollInterval: filter === 'ai_queue' ? 5000 : 15000,  // poll faster when tab is open
    onStatusChange: handleJobStatusChange,
  });

  const { instances, loading, error, refresh } = useWorkflowInstances({ page_size: 100 });

  const handleTransitionComplete = useCallback(
    (_entry: TransitionHistoryEntry) => {
      setActionError(null);
      refresh();
    },
    [refresh]
  );

  // Apply filter and sort
  const filtered = instances.filter(i => matchesFilter(i, filter)).sort(sortPriority);

  // Count per filter
  const counts = {
    all: instances.length,
    review: instances.filter(i => classifyState(i.current_state) === 'review').length,
    active: instances.filter(i => ['active', 'initial'].includes(classifyState(i.current_state))).length,
    completed: instances.filter(i => classifyState(i.current_state) === 'terminal_success').length,
    rejected: instances.filter(i => classifyState(i.current_state) === 'terminal_failure').length,
    ai_queue: aiJobs.length,
  };

  return (
    <>
      {/* Toast container */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '12px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              backgroundColor: t.type === 'success' ? '#16a34a' : '#dc2626',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              pointerEvents: 'auto',
              maxWidth: 360,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      <PageHeader
        title="Approvals"
        subtitle="Content review queue — approve, reject, and track AI generation jobs."
        actions={
          <button
            onClick={() => { refresh(); refreshAiJobs(); }}
            style={{
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--app-border, #e5e7eb)',
              backgroundColor: 'transparent',
              color: 'var(--app-text, #111)',
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        }
      />

      <PageContent>

        {/* Filter tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 20,
            borderBottom: '1px solid var(--app-border, #e5e7eb)',
            paddingBottom: 0,
            overflowX: 'auto',
          }}
        >
          {FILTER_OPTIONS.map(opt => {
            const count = counts[opt.value];
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--app-primary, #2563eb)' : 'var(--app-text-secondary, #6b7280)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--app-primary, #2563eb)' : '2px solid transparent',
                  borderRadius: 0,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                }}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isActive ? '#fff' : '#6b7280',
                      backgroundColor: isActive ? 'var(--app-primary, #2563eb)' : '#e5e7eb',
                      borderRadius: 99,
                      padding: '1px 6px',
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── AI Queue panel ── */}
        {filter === 'ai_queue' && (
          <div>
            {aiLoading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
                Loading AI jobs...
              </div>
            )}
            {aiError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {aiError}
              </div>
            )}
            {!aiLoading && aiJobs.length === 0 && (
              <div
                style={{
                  padding: 48,
                  textAlign: 'center',
                  color: 'var(--app-text-secondary, #9ca3af)',
                  backgroundColor: 'var(--app-surface-2, #f9fafb)',
                  borderRadius: 12,
                  border: '1px dashed var(--app-border, #e5e7eb)',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No AI jobs</div>
                <div style={{ fontSize: 12 }}>AI generation jobs will appear here once triggered.</div>
              </div>
            )}
            {aiJobs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiJobs.map(job => {
                  const statusIcon: Record<GenJobStatus, string> = {
                    queued: '⏳',
                    waiting: '⏳',
                    processing: '🔄',
                    completed: '✅',
                    failed: '❌',
                    cancelled: '🚫',
                  };
                  const statusColor: Record<GenJobStatus, string> = {
                    queued: '#6b7280',
                    waiting: '#6b7280',
                    processing: '#2563eb',
                    completed: '#16a34a',
                    failed: '#dc2626',
                    cancelled: '#9ca3af',
                  };
                  const isActive = job.status === 'processing' || job.status === 'queued' || job.status === 'waiting';
                  return (
                    <div
                      key={job.task_id}
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--app-surface, #fff)',
                        borderRadius: 10,
                        border: `1px solid ${job.status === 'failed' ? '#fca5a5' : 'var(--app-border, #e5e7eb)'}`,
                        transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 16 }}>{statusIcon[job.status]}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text, #111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {job.label || job.template_id}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)', marginBottom: isActive || job.status === 'failed' ? 8 : 0 }}>
                            {job.output_type} · {new Date(job.created_at).toLocaleString()}
                          </div>
                          {/* Progress bar for active jobs */}
                          {isActive && (
                            <div style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${job.progress || 0}%`,
                                  backgroundColor: '#2563eb',
                                  borderRadius: 99,
                                  transition: 'width 0.4s ease',
                                  minWidth: job.progress ? 0 : '10%',
                                  animation: job.status === 'processing' && !job.progress ? 'pulse 1.5s infinite' : undefined,
                                }}
                              />
                            </div>
                          )}
                          {/* Error message */}
                          {job.status === 'failed' && job.error_message && (
                            <div style={{ fontSize: 11, color: '#dc2626', backgroundColor: '#fee2e2', borderRadius: 6, padding: '4px 8px' }}>
                              {job.error_message}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: statusColor[job.status],
                            backgroundColor: `${statusColor[job.status]}18`,
                            borderRadius: 99,
                            padding: '3px 9px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {job.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Workflow panel (all other tabs) ── */}
        {filter !== 'ai_queue' && (
          <>
            {/* Error */}
            {(error || actionError) && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {actionError || error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
                Loading approval queue...
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div
                style={{
                  padding: 48,
                  textAlign: 'center',
                  color: 'var(--app-text-secondary, #9ca3af)',
                  backgroundColor: 'var(--app-surface-2, #f9fafb)',
                  borderRadius: 12,
                  border: '1px dashed var(--app-border, #e5e7eb)',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {filter === 'review' ? '🎉' : '📭'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {filter === 'review' ? 'All caught up!' : 'No items found'}
                </div>
                <div style={{ fontSize: 12 }}>
                  {filter === 'review'
                    ? 'There are no items waiting for review.'
                    : `No workflow items match the "${filter}" filter.`}
                </div>
              </div>
            )}

            {/* Instance list */}
            {!loading && filtered.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(instance => (
                  <div
                    key={instance.id}
                    style={{
                      padding: 16,
                      backgroundColor: 'var(--app-surface, #fff)',
                      borderRadius: 10,
                      border: '1px solid var(--app-border, #e5e7eb)',
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Top row: entity info + status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#6b7280',
                              backgroundColor: '#f3f4f6',
                              borderRadius: 4,
                              padding: '2px 6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
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

                    {/* Action buttons (only if actions available) */}
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
