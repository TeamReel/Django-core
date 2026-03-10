/**
 * Tests for organisationsApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { organisationsApi } from '../../api';
import { buildOrganisation, buildProject } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('organisationsApi', () => {
  it('list() returns paginated organisations', async () => {
    const items = [buildOrganisation(), buildOrganisation()];
    mockApiList('/api/v1/organisations/', items);

    const result = await organisationsApi.list();
    expect(result.results).toHaveLength(2);
  });

  it('get() returns single organisation by slug', async () => {
    const org = buildOrganisation({ slug: 'fc-test', name: 'FC Test' });
    mockApiResponse('/api/v1/organisations/fc-test/', org);

    const result = await organisationsApi.get('fc-test');
    expect(result.slug).toBe('fc-test');
    expect(result.name).toBe('FC Test');
  });

  it('create() posts new organisation', async () => {
    const created = buildOrganisation({ name: 'New Club' });
    mockApiResponse('/api/v1/organisations/', created, 'POST');

    const result = await organisationsApi.create({ name: 'New Club' });
    expect(result.name).toBe('New Club');
  });

  it('listProjects() returns organisation projects', async () => {
    const projects = [buildProject(), buildProject()];
    mockApiList('/api/v1/organisations/fc-test/projects/', projects);

    const result = await organisationsApi.listProjects('fc-test');
    expect(result.results).toHaveLength(2);
  });

  it('get() throws on 404', async () => {
    mockApiError('/api/v1/organisations/unknown/', 404);

    await expect(organisationsApi.get('unknown')).rejects.toThrow();
  });
});
