import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import {
  useWorkflowTemplates,
  useWorkflowInstances,
  useWorkflowInstance,
  executeTransition,
  classifyState,
  type WorkflowTemplate,
  type WorkflowInstance,
} from './useWorkflows';

function buildTemplate(overrides: Partial<WorkflowTemplate> = {}): WorkflowTemplate {
  return {
    id: 1,
    name: 'Content Approval',
    description: 'Standard approval flow',
    version: '1.0',
    definition: {
      states: [{ name: 'draft', is_initial: true }, { name: 'approved' }],
      transitions: [{ from_state: 'draft', to_state: 'approved', action: 'approve' }],
    },
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function buildInstance(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    id: 10,
    workflow: 1,
    workflow_name: 'Content Approval',
    workflow_version: '1.0',
    workflow_snapshot: {
      states: [{ name: 'draft' }, { name: 'approved' }],
      transitions: [{ from_state: 'draft', to_state: 'approved', action: 'approve' }],
    },
    project: 1,
    content_type: 5,
    content_type_name: 'activity',
    object_id: 42,
    current_state: 'draft',
    context: {},
    version: 1,
    created_by: null,
    created_by_username: null,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    available_actions: ['approve'],
    ...overrides,
  };
}

describe('useWorkflowTemplates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches active templates on mount', async () => {
    mockGet.mockResolvedValue({ results: [buildTemplate()] });

    const { result } = renderHook(() => useWorkflowTemplates());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].name).toBe('Content Approval');
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useWorkflowTemplates());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Server error');
    expect(result.current.templates).toEqual([]);
  });
});

describe('useWorkflowInstances', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches instances with project filter', async () => {
    const instances = [buildInstance()];
    mockGet.mockResolvedValue({ results: instances });

    const { result } = renderHook(() =>
      useWorkflowInstances({ project_id: 1 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.instances).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('project=1'));
  });

  it('refresh triggers a new fetch', async () => {
    mockGet.mockResolvedValue({ results: [] });

    const { result } = renderHook(() => useWorkflowInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGet.mockResolvedValue({ results: [buildInstance()] });
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.instances).toHaveLength(1));
  });
});

describe('useWorkflowInstance (single)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches a single instance by id', async () => {
    mockGet.mockResolvedValue(buildInstance({ id: 10 }));

    const { result } = renderHook(() => useWorkflowInstance(10));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.instance?.id).toBe(10);
    expect(result.current.error).toBeNull();
  });
});

describe('classifyState', () => {
  it('classifies known state names', () => {
    expect(classifyState('draft')).toBe('initial');
    expect(classifyState('approved')).toBe('terminal_success');
    expect(classifyState('rejected')).toBe('terminal_failure');
    expect(classifyState('in_review')).toBe('review');
    expect(classifyState('in_progress')).toBe('active');
  });
});
