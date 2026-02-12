/**
 * ApprovalsPage — Global approval inbox showing all workflow instances
 * that require action, prioritized by state (review > active > draft).
 *
 * Route: /approvals
 * Sidebar: CONTENT section
 */
import { useState, useCallback } from 'react';
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

type FilterState = 'all' | 'review' | 'active' | 'completed' | 'rejected';

const FILTER_OPTIONS: { value: FilterState; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'review', label: 'Needs Review', icon: '👀' },
  { value: 'active', label: 'In Progress', icon: '🔄' },
  { value: 'completed', label: 'Approved', icon: '✅' },
  { value: 'rejected', label: 'Rejected', icon: '❌' },
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
  const filter: FilterState = (['all', 'review', 'active', 'completed', 'rejected'] as const).includes(rawTab as FilterState)
    ? (rawTab as FilterState)
    : 'all';
  const setFilter = (f: FilterState) => navigate(`/approvals?tab=${f}`, { replace: true });
  const [actionError, setActionError] = useState<string | null>(null);

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
  };

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Content review queue — approve or reject items across all projects."
        actions={
          <button
            onClick={refresh}
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
      </PageContent>
    </>
  );
}
