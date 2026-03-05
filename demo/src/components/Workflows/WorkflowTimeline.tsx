/**
 * WorkflowTimeline — Vertical timeline of transition history entries.
 * Shows who did what, when, with optional comments.
 */
import SlotIcon from '../SlotIcon';
import { type TransitionHistoryEntry, getStateDisplay, getActionDisplay } from '../../hooks/useWorkflows';
import styles from './WorkflowTimeline.module.css';

interface WorkflowTimelineProps {
  history: TransitionHistoryEntry[];
  loading?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function WorkflowTimeline({ history, loading }: WorkflowTimelineProps) {
  if (loading) {
    return (
      <div className={styles.placeholder}>
        Loading history...
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className={styles.placeholder}>
        No transitions recorded yet.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {history.map((entry, idx) => {
        const actionDisplay = getActionDisplay(entry.action);
        const toStateDisplay = getStateDisplay(entry.to_state);
        const isLast = idx === history.length - 1;

        return (
          <div
            key={entry.id}
            className={styles.entryRow}
            data-last={isLast}
          >
            {/* Timeline bar */}
            <div className={styles.timelineBar}>
              {/* Dot */}
              <div
                className={styles.dot}
                style={{
                  '--dot-color': toStateDisplay.color,
                  '--dot-border-color': toStateDisplay.bgColor,
                } as React.CSSProperties}
              />
              {/* Line */}
              {!isLast && <div className={styles.line} />}
            </div>

            {/* Content */}
            <div className={styles.content}>
              {/* Action + actor */}
              <div className={styles.actionRow}>
                <span
                  className={styles.actionBadge}
                  style={{
                    '--action-color': actionDisplay.bgColor,
                    '--action-bg': `${actionDisplay.bgColor}15`,
                  } as React.CSSProperties}
                >
                  <SlotIcon name={actionDisplay.icon} size={12} /> {entry.action.replace(/_/g, ' ')}
                </span>
                <span className={styles.stateTransition}>
                  {entry.from_state} → {entry.to_state}
                </span>
              </div>

              {/* By whom + when */}
              <div className={styles.meta}>
                {entry.actor_username && (
                  <span>by <strong className={styles.actorName}>{entry.actor_username}</strong></span>
                )}
                <span title={new Date(entry.created_at).toLocaleString()}>
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>

              {/* Comment */}
              {entry.comment && (
                <div
                  className={styles.comment}
                  style={{
                    '--comment-accent': toStateDisplay.color,
                  } as React.CSSProperties}
                >
                  "{entry.comment}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
