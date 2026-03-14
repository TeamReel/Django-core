/**
 * Tests for activitiesApi and participationsApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { activitiesApi, participationsApi } from '@/api';
import { buildActivity } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('activitiesApi', () => {
  it('list() returns paginated activities', async () => {
    const items = [buildActivity(), buildActivity()];
    mockApiList('/api/v1/activities/', items);

    const result = await activitiesApi.list();
    expect(result.results).toHaveLength(2);
  });

  it('list() passes query params', async () => {
    mockApiList('/api/v1/activities/', [buildActivity()]);

    const result = await activitiesApi.list({ projectId: '5', activityType: 'match' });
    expect(result.results).toHaveLength(1);
  });

  it('get() returns single activity', async () => {
    const { data: _, ...activity } = buildActivity({ title: 'Cup Final' });
    mockApiResponse(`/api/v1/activities/${activity.id}/`, activity);

    const result = await activitiesApi.get(activity.id);
    expect(result.id).toBe(activity.id);
    expect(result.title).toBe('Cup Final');
  });

  it('create() posts new activity', async () => {
    const { data: _, ...created } = buildActivity({ title: 'Training Session' });
    mockApiResponse(/\/api\/v1\/activities\//, created, 'POST');

    const result = await activitiesApi.create({ title: 'Training Session' });
    expect(result.title).toBe('Training Session');
  });

  it('delete() removes activity', async () => {
    mockApiResponse('/api/v1/activities/abc-123/', {}, 'DELETE');

    await expect(activitiesApi.delete('abc-123')).resolves.not.toThrow();
  });
});

describe('participationsApi', () => {
  it('list() returns paginated participations', async () => {
    mockApiList('/api/v1/participations/', [{ id: '1', member: 1, activity: 'a' }]);

    const result = await participationsApi.list({ activityId: 'a' });
    expect(result.results).toHaveLength(1);
  });
});
