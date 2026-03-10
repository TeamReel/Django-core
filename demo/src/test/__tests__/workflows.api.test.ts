/**
 * Tests for workflowsApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { workflowsApi } from '../../api';
import { buildWorkflowInstance } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('workflowsApi', () => {
  it('listTemplates() returns workflow templates', async () => {
    mockApiList('/api/v1/workflows/templates/', [
      { id: 'tpl-1', name: 'Approval Flow', is_active: true },
    ]);

    const result = await workflowsApi.listTemplates({ isActive: true });
    expect(result.results).toHaveLength(1);
  });

  it('listInstances() returns workflow instances', async () => {
    const instances = [buildWorkflowInstance(), buildWorkflowInstance()];
    mockApiList('/api/v1/workflows/instances/', instances);

    const result = await workflowsApi.listInstances();
    expect(result.results).toHaveLength(2);
  });

  it('getInstance() returns single instance', async () => {
    const instance = buildWorkflowInstance({ id: 'wf-123', current_state: 'pending_review' });
    mockApiResponse('/api/v1/workflows/instances/wf-123/', instance);

    const result = await workflowsApi.getInstance('wf-123');
    expect(result.id).toBe('wf-123');
    expect(result.current_state).toBe('pending_review');
  });

  it('executeTransition() performs state change', async () => {
    const updated = buildWorkflowInstance({ id: 'wf-123', current_state: 'approved' });
    mockApiResponse('/api/v1/workflows/instances/wf-123/execute/', updated, 'POST');

    const result = await workflowsApi.executeTransition('wf-123', { action: 'approve' });
    expect(result.current_state).toBe('approved');
  });

  it('listHistory() returns transition history', async () => {
    mockApiList('/api/v1/workflows/history/', [
      { id: 'h-1', from_state: 'draft', to_state: 'pending' },
    ]);

    const result = await workflowsApi.listHistory({ instanceId: 'wf-123' });
    expect(result.results).toHaveLength(1);
  });
});
