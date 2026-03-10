/**
 * Tests for mediaApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { mediaApi } from '../../api';
import { buildMediaItem } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('mediaApi', () => {
  it('listItems() returns paginated media items', async () => {
    const items = [buildMediaItem(), buildMediaItem()];
    mockApiList('/api/v1/media/items/', items);

    const result = await mediaApi.listItems();
    expect(result.results).toHaveLength(2);
  });

  it('listItems() filters by activity', async () => {
    mockApiList('/api/v1/media/items/', [buildMediaItem()]);

    const result = await mediaApi.listItems({ activityId: 'act-123' });
    expect(result.results).toHaveLength(1);
  });

  it('updateItem() patches media item', async () => {
    const updated = buildMediaItem({ id: 'm-123', title: 'Updated Title' });
    mockApiResponse('/api/v1/media/items/m-123/', updated, 'PATCH');

    const result = await mediaApi.updateItem('m-123', { title: 'Updated Title' });
    expect(result.title).toBe('Updated Title');
  });

  it('deleteItem() removes media item', async () => {
    mockApiResponse('/api/v1/media/items/m-123/', {}, 'DELETE');

    await expect(mediaApi.deleteItem('m-123')).resolves.not.toThrow();
  });

  it('listTags() returns media tags', async () => {
    mockApiList('/api/v1/media/tags/', [{ id: 1, name: 'goals' }]);

    const result = await mediaApi.listTags();
    expect(result.results).toHaveLength(1);
  });
});
