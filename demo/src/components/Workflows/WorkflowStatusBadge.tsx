/**
 * WorkflowStatusBadge — Pill badge showing the current workflow state.
 * Reusable on any entity card, table row, or detail page.
 */
import { getStateDisplay } from '../../hooks/useWorkflows';

interface WorkflowStatusBadgeProps {
  state: string;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function WorkflowStatusBadge({ state, size = 'md', style }: WorkflowStatusBadgeProps) {
  const display = getStateDisplay(state);
  const fontSize = size === 'sm' ? 10 : 12;
  const padding = size === 'sm' ? '2px 6px' : '3px 10px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontSize,
        fontWeight: 'var(--font-semibold)',
        color: display.color,
        backgroundColor: display.bgColor,
        borderRadius: 'var(--radius-lg)',
        padding,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        ...style,
      }}
    >
      <span>{display.icon}</span>
      <span>{display.label}</span>
    </span>
  );
}
