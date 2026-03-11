/**
 * Integration test — ApprovalsWorkflowList
 *
 * Tests: render workflow instance cards → status badges → action buttons.
 * Note: ApprovalsWorkflowList is a NAMED export.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { ApprovalsWorkflowList } from '../../pages/ApprovalsPage/ApprovalsWorkflowList';

vi.mock('../../components/Workflows/WorkflowStatusBadge', () => ({
  WorkflowStatusBadge: ({ state }: { state: string }) =>
    <span data-testid="status-badge">{state}</span>,
}));

vi.mock('../../components/Workflows/WorkflowActionButtons', () => ({
  WorkflowActionButtons: ({ instanceId }: { instanceId: string }) =>
    <div data-testid={`actions-${instanceId}`}>Actions</div>,
}));

vi.mock('../../pages/approvalsTypes', () => ({
  getEntityLabel: (contentType: string) => contentType || 'Item',
}));

vi.mock('../../pages/ApprovalsPage.module.css', () => ({
  default: {
    workflowCard: '',
    workflowCardHeader: '',
    workflowBadgeRow: '',
    entityTypeBadge: '',
    entityTitle: '',
    workflowMeta: '',
  },
}));

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const buildInstance = (id: string, title: string, status: string) => ({
  id,
  content_type_name: 'activity',
  object_id: `ent-${id}`,
  context: { title },
  workflow_name: 'Content Approval',
  current_state: status,
  available_actions: ['approve'],
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T12:00:00Z',
  created_by_username: 'admin',
});

describe('ApprovalsWorkflowList integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders workflow instance cards', () => {
    renderWithProviders(
      <ApprovalsWorkflowList
        instances={[buildInstance('w1', 'Match Video A', 'pending_review')] as any}
        onTransitionComplete={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(screen.getByText('Match Video A')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    renderWithProviders(
      <ApprovalsWorkflowList
        instances={[buildInstance('w1', 'Video', 'pending_review')] as any}
        onTransitionComplete={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(screen.getByTestId('status-badge')).toHaveTextContent('pending_review');
  });

  it('renders action buttons', () => {
    renderWithProviders(
      <ApprovalsWorkflowList
        instances={[buildInstance('w1', 'Video', 'pending')] as any}
        onTransitionComplete={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(screen.getByTestId('actions-w1')).toBeInTheDocument();
  });

  it('returns null for empty list', () => {
    const { container } = renderWithProviders(
      <ApprovalsWorkflowList instances={[]} onTransitionComplete={vi.fn()} onError={vi.fn()} />
    );
    expect(container.textContent).toBe('');
  });
});
