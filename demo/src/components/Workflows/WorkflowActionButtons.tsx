/**
 * WorkflowActionButtons — Renders available workflow transition actions.
 * Shows confirm dialog before executing destructive actions (reject/cancel).
 */
import React, { useState } from 'react';
import {
  executeTransition,
  getActionDisplay,
  type TransitionHistoryEntry,
} from '../../hooks/useWorkflows';
import styles from './WorkflowActionButtons.module.css';

interface WorkflowActionButtonsProps {
  instanceId: number | string;
  availableActions: string[];
  onTransitionComplete?: (entry: TransitionHistoryEntry) => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md';
  layout?: 'inline' | 'stack';
}

export function WorkflowActionButtons({
  instanceId,
  availableActions,
  onTransitionComplete,
  onError,
  size = 'md',
  layout = 'inline',
}: WorkflowActionButtonsProps) {
  const [executing, setExecuting] = useState<string | null>(null);
  const [commentAction, setCommentAction] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const destructiveActions = new Set(['reject', 'cancel', 'close']);

  async function handleExecute(action: string, withComment?: string) {
    try {
      setExecuting(action);
      const entry = await executeTransition(instanceId, action, withComment || undefined);
      setCommentAction(null);
      setComment('');
      onTransitionComplete?.(entry);
    } catch (err: any) {
      onError?.(err.message || `Failed to execute "${action}"`);
    } finally {
      setExecuting(null);
    }
  }

  function handleActionClick(action: string) {
    if (destructiveActions.has(action.toLowerCase())) {
      setCommentAction(action);
    } else {
      handleExecute(action);
    }
  }

  if (!availableActions.length) return null;

  return (
    <div className={styles.container} data-size={size}>
      {/* Action buttons row */}
      <div
        className={styles.actionsRow}
        data-layout={layout}
        data-size={size}
      >
        {availableActions.map(action => {
          const display = getActionDisplay(action);
          const isExecuting = executing === action;

          return (
            <button
              key={action}
              onClick={() => handleActionClick(action)}
              disabled={!!executing}
              className={styles.actionButton}
              data-size={size}
              data-executing={isExecuting ? 'self' : executing ? 'other' : undefined}
              style={{
                '--action-color': display.color,
                '--action-bg': display.bgColor,
                '--action-hover-bg': display.hoverBgColor,
              } as React.CSSProperties}
            >
              <span>{display.icon}</span>
              <span>{isExecuting ? 'Processing...' : display.label}</span>
            </button>
          );
        })}
      </div>

      {/* Comment dialog for destructive actions */}
      {commentAction && (
        <div className={styles.commentDialog}>
          <label className={styles.commentLabel}>
            Reason for {commentAction} (optional):
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder={`Why are you ${commentAction.toLowerCase()}ing this?`}
            className={styles.commentTextarea}
          />
          <div className={styles.commentActions}>
            <button
              onClick={() => handleExecute(commentAction, comment)}
              disabled={!!executing}
              className={styles.confirmButton}
            >
              {executing ? 'Processing...' : `Confirm ${commentAction}`}
            </button>
            <button
              onClick={() => { setCommentAction(null); setComment(''); }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
