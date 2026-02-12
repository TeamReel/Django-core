/**
 * WorkflowPanel — Complete workflow status + actions + timeline for an entity.
 * Drop this into any detail page tab to show the full workflow state.
 */
import { useState, useCallback } from 'react';
import {
  useWorkflowInstances,
  useTransitionHistory,
  type WorkflowInstance,
  type TransitionHistoryEntry,
} from '../../hooks/useWorkflows';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { WorkflowActionButtons } from './WorkflowActionButtons';
import { WorkflowTimeline } from './WorkflowTimeline';

interface WorkflowPanelProps {
  /** Project ID to scope workflows */
  projectId: string | number;
  /** Django content type name, e.g. 'activity', 'projectmembership' */
  contentTypeName: string;
  /** Object PK of the entity */
  objectId: string | number;
  /** Optional title override */
  title?: string;
}

export function WorkflowPanel({ projectId, contentTypeName, objectId, title }: WorkflowPanelProps) {
  const { instances, loading, error, refresh } = useWorkflowInstances({
    project_id: projectId,
    content_type_name: contentTypeName,
    object_id: objectId,
    page_size: 10,
  });

  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-select first instance when loaded
  const activeInstance = selectedInstance || instances[0] || null;

  const { history, loading: historyLoading } = useTransitionHistory(activeInstance?.id ?? null);

  const handleTransitionComplete = useCallback(
    (_entry: TransitionHistoryEntry) => {
      setActionError(null);
      refresh();
    },
    [refresh]
  );

  if (loading) {
    return (
      <div style={{ padding: 20, color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
        Loading workflows...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: '#dc2626', fontSize: 13 }}>
        Failed to load workflows: {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--app-text, #111)' }}>
          {title || 'Workflow'}
        </h3>
        {instances.length > 1 && (
          <span style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>
            {instances.length} workflows
          </span>
        )}
      </div>

      {/* No workflows */}
      {instances.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--app-text-secondary, #9ca3af)',
            fontSize: 13,
            backgroundColor: 'var(--app-surface-2, #f9fafb)',
            borderRadius: 8,
            border: '1px dashed var(--app-border, #e5e7eb)',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div>No workflow attached to this item yet.</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Workflows are automatically created when content enters the approval pipeline.</div>
        </div>
      )}

      {/* Instance selector (if multiple) */}
      {instances.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {instances.map(inst => (
            <button
              key={inst.id}
              onClick={() => setSelectedInstance(inst)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${activeInstance?.id === inst.id ? 'var(--app-primary, #2563eb)' : 'var(--app-border, #e5e7eb)'}`,
                backgroundColor: activeInstance?.id === inst.id ? 'var(--app-primary-light, #dbeafe)' : 'transparent',
                color: 'var(--app-text, #111)',
                cursor: 'pointer',
                fontWeight: activeInstance?.id === inst.id ? 600 : 400,
              }}
            >
              {inst.workflow_name} <WorkflowStatusBadge state={inst.current_state} size="sm" />
            </button>
          ))}
        </div>
      )}

      {/* Active instance detail */}
      {activeInstance && (
        <>
          {/* Current state card */}
          <div
            style={{
              padding: 16,
              backgroundColor: 'var(--app-surface, #fff)',
              borderRadius: 8,
              border: '1px solid var(--app-border, #e5e7eb)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Status
                </div>
                <WorkflowStatusBadge state={activeInstance.current_state} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>
                  {activeInstance.workflow_name} v{activeInstance.workflow_version}
                </div>
                <div style={{ fontSize: 11, color: 'var(--app-text-secondary, #9ca3af)' }}>
                  Created {new Date(activeInstance.created_at).toLocaleDateString()}
                  {activeInstance.created_by_username && ` by ${activeInstance.created_by_username}`}
                </div>
              </div>
            </div>

            {/* Action error */}
            {actionError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {actionError}
              </div>
            )}

            {/* Action buttons */}
            {activeInstance.available_actions.length > 0 && (
              <WorkflowActionButtons
                instanceId={activeInstance.id}
                availableActions={activeInstance.available_actions}
                onTransitionComplete={handleTransitionComplete}
                onError={setActionError}
              />
            )}
          </div>

          {/* Timeline */}
          <div
            style={{
              padding: 16,
              backgroundColor: 'var(--app-surface, #fff)',
              borderRadius: 8,
              border: '1px solid var(--app-border, #e5e7eb)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text, #111)', marginBottom: 12 }}>
              History
            </div>
            <WorkflowTimeline history={history} loading={historyLoading} />
          </div>
        </>
      )}
    </div>
  );
}
