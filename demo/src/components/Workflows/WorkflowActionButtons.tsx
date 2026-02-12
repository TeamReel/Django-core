/**
 * WorkflowActionButtons — Renders available workflow transition actions.
 * Shows confirm dialog before executing destructive actions (reject/cancel).
 */
import { useState } from 'react';
import {
  executeTransition,
  getActionDisplay,
  type TransitionHistoryEntry,
} from '../../hooks/useWorkflows';

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

  const fontSize = size === 'sm' ? 11 : 13;
  const padding = size === 'sm' ? '4px 10px' : '6px 14px';
  const gap = size === 'sm' ? 6 : 8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {/* Action buttons row */}
      <div
        style={{
          display: 'flex',
          flexDirection: layout === 'stack' ? 'column' : 'row',
          flexWrap: 'wrap',
          gap,
        }}
      >
        {availableActions.map(action => {
          const display = getActionDisplay(action);
          const isExecuting = executing === action;

          return (
            <button
              key={action}
              onClick={() => handleActionClick(action)}
              disabled={!!executing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize,
                fontWeight: 600,
                color: display.color,
                backgroundColor: isExecuting ? display.hoverBgColor : display.bgColor,
                border: 'none',
                borderRadius: 6,
                padding,
                cursor: executing ? 'wait' : 'pointer',
                opacity: executing && !isExecuting ? 0.5 : 1,
                transition: 'background-color 0.15s, opacity 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!executing) (e.target as HTMLElement).style.backgroundColor = display.hoverBgColor;
              }}
              onMouseLeave={e => {
                if (!executing) (e.target as HTMLElement).style.backgroundColor = display.bgColor;
              }}
            >
              <span>{display.icon}</span>
              <span>{isExecuting ? 'Processing...' : display.label}</span>
            </button>
          );
        })}
      </div>

      {/* Comment dialog for destructive actions */}
      {commentAction && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            backgroundColor: 'var(--app-surface-2, #f9fafb)',
            borderRadius: 8,
            border: '1px solid var(--app-border, #e5e7eb)',
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-secondary, #6b7280)' }}>
            Reason for {commentAction} (optional):
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder={`Why are you ${commentAction.toLowerCase()}ing this?`}
            style={{
              fontSize: 13,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--app-border, #e5e7eb)',
              backgroundColor: 'var(--app-surface, #fff)',
              color: 'var(--app-text, #111)',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleExecute(commentAction, comment)}
              disabled={!!executing}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                backgroundColor: '#dc2626',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              {executing ? 'Processing...' : `Confirm ${commentAction}`}
            </button>
            <button
              onClick={() => { setCommentAction(null); setComment(''); }}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--app-text, #111)',
                backgroundColor: 'transparent',
                border: '1px solid var(--app-border, #e5e7eb)',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
