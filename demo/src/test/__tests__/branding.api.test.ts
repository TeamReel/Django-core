/**
 * Tests for brandingApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { brandingApi } from '@/api';
import { buildBrandProfile } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('brandingApi', () => {
  it('listProfiles() returns paginated profiles', async () => {
    const items = [buildBrandProfile(), buildBrandProfile()];
    mockApiList('/api/v1/branding/profiles/', items);

    const result = await brandingApi.listProfiles();
    expect(result.results).toHaveLength(2);
  });

  it('listProfiles() filters by project', async () => {
    mockApiList('/api/v1/branding/profiles/', [buildBrandProfile({ project: 42 })]);

    const result = await brandingApi.listProfiles({ project: 42 });
    expect(result.results).toHaveLength(1);
  });

  it('getProfile() returns single profile', async () => {
    const profile = buildBrandProfile({ id: 10, name: 'Team Colors' });
    mockApiResponse('/api/v1/branding/profiles/10/', profile);

    const result = await brandingApi.getProfile(10);
    expect(result.id).toBe(10);
    expect(result.name).toBe('Team Colors');
  });

  it('createProfile() posts new profile', async () => {
    const created = buildBrandProfile({ name: 'New Brand' });
    mockApiResponse('/api/v1/branding/profiles/', created, 'POST');

    const result = await brandingApi.createProfile({ name: 'New Brand' });
    expect(result.name).toBe('New Brand');
  });

  it('listProfileAssets() returns profile assets', async () => {
    mockApiList('/api/v1/branding/profiles/10/assets/', [{ id: 1, asset_type: 'logo' }]);

    const result = await brandingApi.listProfileAssets(10);
    expect(result.results).toHaveLength(1);
  });
});
