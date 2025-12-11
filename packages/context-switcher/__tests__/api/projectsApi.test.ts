/**
 * Unit tests for projectsApi.
 */

import { fetchProjects } from '../../src/api/projectsApi';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('fetchProjects', () => {
  it('fetches projects for organisation', async () => {
    const projects = await fetchProjects('org_123', '/api');

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Website Redesign');
    expect(projects[0].slug).toBe('website-redesign');
    expect(projects[0].organisationId).toBe('org_123');
  });

  it('returns empty array for org with no projects', async () => {
    const projects = await fetchProjects('org_456', '/api');

    expect(projects).toHaveLength(0);
  });

  it('handles 403 Forbidden (no access to org)', async () => {
    server.use(
      http.get('/api/organisations/:orgId/projects/', () => {
        return HttpResponse.json(
          {
            error: { code: 403, message: 'No access to this organisation' },
          },
          { status: 403 }
        );
      })
    );

    await expect(fetchProjects('org_999', '/api')).rejects.toThrow(
      'No access to this organisation'
    );
  });

  it('handles 404 Not Found', async () => {
    server.use(
      http.get('/api/organisations/:orgId/projects/', () => {
        return HttpResponse.json(
          { error: { code: 404, message: 'Organisation not found' } },
          { status: 404 }
        );
      })
    );

    await expect(fetchProjects('org_999', '/api')).rejects.toThrow(
      'Organisation not found'
    );
  });

  it('handles 500 Server Error', async () => {
    server.use(
      http.get('/api/organisations/:orgId/projects/', () => {
        return HttpResponse.json(
          { error: { code: 500, message: 'Internal server error' } },
          { status: 500 }
        );
      })
    );

    await expect(fetchProjects('org_123', '/api')).rejects.toThrow(
      'Internal server error'
    );
  });

  it('handles network errors', async () => {
    server.use(
      http.get('/api/organisations/:orgId/projects/', () => {
        return HttpResponse.error();
      })
    );

    await expect(fetchProjects('org_123', '/api')).rejects.toThrow();
  });
});
