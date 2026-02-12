/**
 * WorkflowTimeline — Vertical timeline of transition history entries.
 * Shows who did what, when, with optional comments.
 */
import { type TransitionHistoryEntry, getStateDisplay, getActionDisplay } from '../../hooks/useWorkflows';

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
      <div style={{ padding: 16, color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
        Loading history...
      </div>
    );
  }

  if (!history.length) {
    return (
      <div style={{ padding: 16, color: 'var(--app-text-secondary, #6b7280)', fontSize: 13 }}>
        No transitions recorded yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
      {history.map((entry, idx) => {
        const actionDisplay = getActionDisplay(entry.action);
        const toStateDisplay = getStateDisplay(entry.to_state);
        const isLast = idx === history.length - 1;

        return (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              gap: 12,
              position: 'relative',
              paddingBottom: isLast ? 0 : 20,
            }}
          >
            {/* Timeline bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 24,
                flexShrink: 0,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: toStateDisplay.color,
                  border: `2px solid ${toStateDisplay.bgColor}`,
                  marginTop: 4,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              />
              {/* Line */}
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    backgroundColor: 'var(--app-border, #e5e7eb)',
                    marginTop: 4,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: 4 }}>
              {/* Action + actor */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: actionDisplay.bgColor,
                    backgroundColor: `${actionDisplay.bgColor}15`,
                    borderRadius: 10,
                    padding: '1px 8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  {actionDisplay.icon} {entry.action.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--app-text-secondary, #6b7280)' }}>
                  {entry.from_state} → {entry.to_state}
                </span>
              </div>

              {/* By whom + when */}
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--app-text-secondary, #9ca3af)',
                  marginTop: 3,
                  display: 'flex',
                  gap: 8,
                }}
              >
                {entry.actor_username && (
                  <span>by <strong style={{ color: 'var(--app-text, #6b7280)' }}>{entry.actor_username}</strong></span>
                )}
                <span title={new Date(entry.created_at).toLocaleString()}>
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>

              {/* Comment */}
              {entry.comment && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--app-text, #374151)',
                    marginTop: 6,
                    padding: '6px 10px',
                    backgroundColor: 'var(--app-surface-2, #f9fafb)',
                    borderRadius: 6,
                    borderLeft: `3px solid ${toStateDisplay.color}`,
                    fontStyle: 'italic',
                  }}
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
