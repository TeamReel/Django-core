/**
 * Unit tests for projectsApi.
 */

import { fetchProjects } from '../../src/api/projectsApi';
import { server } from '../mocks/server';
import { rest } from 'msw';

const BASE_URL = 'http://localhost/api';

describe('fetchProjects', () => {
  it('fetches projects for organisation', async () => {
    const projects = await fetchProjects('org_123', BASE_URL);

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Website Redesign');
    expect(projects[0].slug).toBe('website-redesign');
    expect(projects[0].organisationId).toBe('org_123');
  });

  it('returns empty array for org with no projects', async () => {
    const projects = await fetchProjects('org_456', BASE_URL);

    expect(projects).toHaveLength(0);
  });

  it('handles 403 Forbidden (no access to org)', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/:orgId/projects/', (req, res, ctx) => {
        return res(
          ctx.status(403),
          ctx.json({ error: { code: 403, message: 'No access to this organisation' } })
        );
      })
    );

    await expect(fetchProjects('org_999', BASE_URL)).rejects.toThrow(
      'No access to this organisation'
    );
  });

  it('handles 404 Not Found', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/:orgId/projects/', (req, res, ctx) => {
        return res(
          ctx.status(404),
          ctx.json({ error: { code: 404, message: 'Organisation not found' } })
        );
      })
    );

    await expect(fetchProjects('org_999', BASE_URL)).rejects.toThrow(
      'Organisation not found'
    );
  });

  it('handles 500 Server Error', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/:orgId/projects/', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: { code: 500, message: 'Internal server error' } })
        );
      })
    );

    await expect(fetchProjects('org_123', BASE_URL)).rejects.toThrow(
      'Internal server error'
    );
  });

  it('handles network errors', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/:orgId/projects/', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );

    await expect(fetchProjects('org_123', BASE_URL)).rejects.toThrow();
  });
});
