/**
 * Tests for videoApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { videoApi } from '../../api';
import { buildVideoJob } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('videoApi', () => {
  it('listJobs() returns paginated video jobs', async () => {
    const items = [buildVideoJob(), buildVideoJob()];
    mockApiList('/api/v1/video/jobs/', items);

    const result = await videoApi.listJobs();
    expect(result.results).toHaveLength(2);
  });

  it('getJob() returns single video job', async () => {
    const job = buildVideoJob({ id: 'job-123', status: 'completed' });
    mockApiResponse('/api/v1/video/jobs/job-123/', job);

    const result = await videoApi.getJob('job-123');
    expect(result.id).toBe('job-123');
    expect(result.status).toBe('completed');
  });

  it('createJob() posts new video job', async () => {
    const created = buildVideoJob({ job_type: 'transcode' });
    mockApiResponse('/api/v1/video/jobs/', created, 'POST');

    const result = await videoApi.createJob({ job_type: 'transcode' });
    expect(result.job_type).toBe('transcode');
  });

  it('retryJob() retries failed job', async () => {
    const retried = buildVideoJob({ id: 'job-123', status: 'pending' });
    mockApiResponse('/api/v1/video/jobs/job-123/retry/', retried, 'POST');

    const result = await videoApi.retryJob('job-123');
    expect(result.status).toBe('pending');
  });

  it('deleteJob() cancels video job', async () => {
    mockApiResponse('/api/v1/video/jobs/job-123/', {}, 'DELETE');

    await expect(videoApi.deleteJob('job-123')).resolves.not.toThrow();
  });
});
