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
import styles from './WorkflowPanel.module.css';

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
      <div className={`p-20 fs-13 ${styles.loadingText}`}>
        Loading workflows...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-20 fs-13 ${styles.errorText}`}>
        Failed to load workflows: {error}
      </div>
    );
  }

  return (
    <div className="flex-col gap-16">
      {/* Header */}
      <div className="flex-between">
        <h3 className={`m-0 fw-600 ${styles.headerTitle}`}>
          {title || 'Workflow'}
        </h3>
        {instances.length > 1 && (
          <span className={`fs-11 ${styles.workflowCount}`}>
            {instances.length} workflows
          </span>
        )}
      </div>

      {/* No workflows */}
      {instances.length === 0 && (
        <div
          className={`p-24 text-center fs-13 rounded-8 ${styles.emptyState}`}
        >
          <div className="fs-24 mb-8">📋</div>
          <div>No workflow attached to this item yet.</div>
          <div className="fs-11 mt-4">Workflows are automatically created when content enters the approval pipeline.</div>
        </div>
      )}

      {/* Instance selector (if multiple) */}
      {instances.length > 1 && (
        <div className={`gap-6 flex-wrap ${styles.instanceSelector}`}>
          {instances.map(inst => (
            <button
              key={inst.id}
              onClick={() => setSelectedInstance(inst)}
              className={`fs-12 rounded-6 cursor-pointer ${styles.instanceButton}`}
              data-active={activeInstance?.id === inst.id}
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
            className={`p-16 rounded-8 ${styles.card}`}
          >
            <div className="flex-between mb-12">
              <div>
                <div className={`fs-11 mb-4 ${styles.statusLabel}`}>
                  Current Status
                </div>
                <WorkflowStatusBadge state={activeInstance.current_state} />
              </div>
              <div className="text-right">
                <div className={`fs-11 ${styles.secondaryText}`}>
                  {activeInstance.workflow_name} v{activeInstance.workflow_version}
                </div>
                <div className={`fs-11 ${styles.secondaryText}`}>
                  Created {new Date(activeInstance.created_at).toLocaleDateString()}
                  {activeInstance.created_by_username && ` by ${activeInstance.created_by_username}`}
                </div>
              </div>
            </div>

            {/* Action error */}
            {actionError && (
              <div
                className={`py-8 px-12 rounded-6 fs-12 mb-12 ${styles.actionError}`}
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
            className={`p-16 rounded-8 ${styles.card}`}
          >
            <div className={`fs-13 fw-600 mb-12 ${styles.historyTitle}`}>
              History
            </div>
            <WorkflowTimeline history={history} loading={historyLoading} />
          </div>
        </>
      )}
    </div>
  );
}
