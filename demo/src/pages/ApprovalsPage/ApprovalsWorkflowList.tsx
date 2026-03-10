/**
 * ApprovalsWorkflowList - List of workflow instances
 */
import React from 'react';
import { WorkflowStatusBadge } from '../../components/Workflows/WorkflowStatusBadge';
import { WorkflowActionButtons } from '../../components/Workflows/WorkflowActionButtons';
import { getEntityLabel } from '../approvalsTypes';
import type { TransitionHistoryEntry, WorkflowInstance } from '../../hooks/useWorkflows';
import s from '../ApprovalsPage.module.css';

interface ApprovalsWorkflowListProps {
  instances: WorkflowInstance[];
  onTransitionComplete: (entry: TransitionHistoryEntry) => void;
  onError: (error: string) => void;
}

export function ApprovalsWorkflowList({
  instances,
  onTransitionComplete,
  onError,
}: ApprovalsWorkflowListProps) {
  if (instances.length === 0) {
    return null;
  }

  return (
    <div className="flex-col gap-10">
      {instances.map(instance => (
        <div
          key={instance.id}
          className={s.workflowCard}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          <div className={s.workflowCardHeader}>
            <div>
              <div className={s.workflowBadgeRow}>
                <span className={s.entityTypeBadge}>{getEntityLabel(instance.content_type_name)}</span>
                <span className={s.entityTitle}>
                  {String(instance.context?.title || instance.context?.name || `#${instance.object_id}`)}
                </span>
              </div>
              <div className={s.workflowMeta}>
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
              onTransitionComplete={onTransitionComplete}
              onError={onError}
              size="sm"
            />
          )}
        </div>
      ))}
    </div>
  );
}
