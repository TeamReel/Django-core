/**
 * Pure display helpers for workflow state classification and rendering.
 */

export type WorkflowStateCategory = 'initial' | 'active' | 'review' | 'terminal_success' | 'terminal_failure';

/** Classify a state name into a visual category */
export function classifyState(stateName: string): WorkflowStateCategory {
  const s = stateName.toLowerCase();
  if (s === 'draft' || s === 'new' || s === 'created') return 'initial';
  if (s === 'review' || s === 'in_review' || s === 'pending_review' || s === 'pending') return 'review';
  if (s === 'approved' || s === 'published' || s === 'completed' || s === 'resolved' || s === 'done') return 'terminal_success';
  if (s === 'rejected' || s === 'cancelled' || s === 'closed' || s === 'failed') return 'terminal_failure';
  return 'active';
}

/** Map a state category to display properties */
export function getStateDisplay(stateName: string): { color: string; bgColor: string; icon: string; label: string } {
  const category = classifyState(stateName);
  const label = stateName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  switch (category) {
    case 'initial':
      return { color: 'var(--app-muted-text)', bgColor: 'var(--app-surface-2)', icon: 'file-text', label };
    case 'active':
      return { color: 'var(--color-blue-600)', bgColor: 'var(--color-blue-100)', icon: 'refresh-cw', label };
    case 'review':
      return { color: 'var(--color-amber-500)', bgColor: 'var(--color-amber-100)', icon: 'eye', label };
    case 'terminal_success':
      return { color: 'var(--color-green-600)', bgColor: 'var(--color-green-100)', icon: 'check-circle-2', label };
    case 'terminal_failure':
      return { color: 'var(--color-red-500)', bgColor: 'var(--color-red-100)', icon: 'x-circle', label };
  }
}

/** Map an action name to a display style */
export function getActionDisplay(action: string): { color: string; bgColor: string; hoverBgColor: string; icon: string; label: string } {
  const a = action.toLowerCase();
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (a === 'approve' || a === 'publish' || a === 'resolve' || a === 'complete') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-green-600)', hoverBgColor: 'var(--color-green-600)', icon: 'check-circle-2', label };
  }
  if (a === 'reject' || a === 'cancel' || a === 'close') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-red-500)', hoverBgColor: 'var(--color-red-600)', icon: 'x-circle', label };
  }
  if (a === 'submit' || a === 'request_review') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-blue-600)', hoverBgColor: 'var(--color-blue-700)', icon: 'send', label };
  }
  if (a === 'revise' || a === 'reopen' || a === 'resubmit') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-amber-500)', hoverBgColor: 'var(--color-amber-600)', icon: 'refresh-cw', label };
  }
  // Default
  return { color: 'var(--color-white, #fff)', bgColor: 'var(--app-muted-text)', hoverBgColor: 'var(--color-neutral-500)', icon: 'play', label };
}
