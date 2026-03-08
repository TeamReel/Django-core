/**
 * Smoke tests for `api` client and `ApiError`.
 *
 * Validates the core client works with the test infrastructure:
 *   - fetch mocking
 *   - typed responses
 *   - error handling
 *   - list / pagination
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../api';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { buildProject, buildActivity } from '../factories';
import type { Project, Activity } from '../../types/api';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('api.get', () => {
  it('returns typed single object', async () => {
    const project = buildProject({ id: 42, name: 'FC Smoke' });
    mockApiResponse('/api/v1/projects/42/', project);

    const result = await api.get<Project>('/projects/42/');
    expect(result.id).toBe(42);
    expect(result.name).toBe('FC Smoke');
  });

  it('unwraps { data: T } envelope', async () => {
    const project = buildProject({ id: 1 });
    mockApiResponse('/api/v1/projects/1/', { data: project });

    const result = await api.get<Project>('/projects/1/');
    expect(result.id).toBe(1);
  });
});

describe('api.list', () => {
  it('returns paginated results', async () => {
    const items = [buildActivity(), buildActivity()];
    mockApiList('/api/v1/activities/', items, 50);

    const result = await api.list<Activity>('/activities/');
    expect(result.results).toHaveLength(2);
    expect(result.count).toBe(50);
  });
});

describe('api.post', () => {
  it('sends body and returns result', async () => {
    const created = buildProject({ id: 99, name: 'New Team' });
    mockApiResponse('/api/v1/projects/', created, 'POST');

    const result = await api.post<Project>('/projects/', { name: 'New Team' });
    expect(result.name).toBe('New Team');
  });
});

describe('ApiError', () => {
  it('is thrown on non-2xx response', async () => {
    mockApiError('/api/v1/projects/999/', 404, { detail: 'Not found.' });

    await expect(api.get('/projects/999/')).rejects.toThrow(ApiError);
  });

  it('contains status, body, and detail', async () => {
    mockApiError('/api/v1/projects/999/', 403, { detail: 'Permission denied.' });

    try {
      await api.get('/projects/999/');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.detail).toBe('Permission denied.');
      expect(apiErr.isClientError).toBe(true);
      expect(apiErr.isServerError).toBe(false);
    }
  });

  it('exposes field errors', async () => {
    mockApiError('/api/v1/projects/', 400, {
      name: ['This field is required.'],
      slug: ['Slug already exists.'],
    }, 'POST');

    try {
      await api.post('/projects/', {});
      expect.unreachable();
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.fieldErrors).toEqual({
        name: ['This field is required.'],
        slug: ['Slug already exists.'],
      });
    }
  });
});
