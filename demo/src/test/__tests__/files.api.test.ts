/**
 * Tests for filesApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { filesApi } from '../../api';
import { buildFileAsset } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('filesApi', () => {
  it('list() returns paginated file assets', async () => {
    const items = [buildFileAsset(), buildFileAsset()];
    mockApiList('/api/v1/files/', items);

    const result = await filesApi.list();
    expect(result.results).toHaveLength(2);
  });

  it('list() filters by path prefix', async () => {
    mockApiList('/api/v1/files/', [buildFileAsset({ storage_path: 'photos/test.jpg' })]);

    const result = await filesApi.list({ pathPrefix: 'photos/' });
    expect(result.results).toHaveLength(1);
  });

  it('getDownloadUrl() returns presigned URL', async () => {
    mockApiResponse('/api/v1/files/f-123/download/', { url: 'https://s3.example.com/file' });

    const result = await filesApi.getDownloadUrl('f-123');
    expect(result.url).toBe('https://s3.example.com/file');
  });

  it('getPresignedUrl() returns upload URL', async () => {
    mockApiResponse('/api/v1/files/presigned-urls/', {
      upload_url: 'https://s3.example.com/upload',
      file_id: 'new-file-id',
    }, 'POST');

    const result = await filesApi.getPresignedUrl({
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
    });
    expect(result.upload_url).toBe('https://s3.example.com/upload');
    expect(result.file_id).toBe('new-file-id');
  });

  it('list() throws on server error', async () => {
    mockApiError('/api/v1/files/', 500, { detail: 'Internal server error' });

    await expect(filesApi.list()).rejects.toThrow();
  });
});
