/**
 * Tests for projectsApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { projectsApi } from '../../api';
import { buildProject } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('projectsApi', () => {
  it('list() returns paginated projects', async () => {
    const items = [buildProject(), buildProject()];
    mockApiList('/api/v1/projects/', items);

    const result = await projectsApi.list();
    expect(result.results).toHaveLength(2);
  });

  it('list() filters by parent project', async () => {
    mockApiList('/api/v1/projects/', [buildProject()]);

    const result = await projectsApi.list({ parentProjectIsNull: true });
    expect(result.results).toHaveLength(1);
  });

  it('get() returns single project by ID', async () => {
    const project = buildProject({ id: 42, name: 'FC Test' });
    mockApiResponse('/api/v1/projects/42/', project);

    const result = await projectsApi.get(42);
    expect(result.id).toBe(42);
    expect(result.name).toBe('FC Test');
  });

  it('update() patches project', async () => {
    const updated = buildProject({ id: 42, name: 'Updated Name' });
    mockApiResponse('/api/v1/projects/42/', updated, 'PATCH');

    const result = await projectsApi.update(42, { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('listMembers() returns project members', async () => {
    mockApiList('/api/v1/projects/42/members/', [{ id: 1, user: 10, role: 'player' }]);

    const result = await projectsApi.listMembers(42);
    expect(result.results).toHaveLength(1);
  });
});
