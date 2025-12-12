/**
 * Unit tests for organisationsApi.
 */

import { fetchOrganisations } from '../../src/api/organisationsApi';
import { server } from '../mocks/server';
import { rest } from 'msw';

const BASE_URL = 'http://localhost/api';

describe('fetchOrganisations', () => {
  it('fetches organisations successfully', async () => {
    const orgs = await fetchOrganisations(BASE_URL);

    expect(orgs).toHaveLength(2);
    expect(orgs[0].name).toBe('Acme Corp');
    expect(orgs[0].slug).toBe('acme-corp');
    expect(orgs[1].name).toBe('Beta Inc');
    expect(orgs[1].slug).toBe('beta-inc');
  });

  it('handles 401 Unauthorized', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/', (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({ error: { code: 401, message: 'Authentication required' } })
        );
      })
    );

    await expect(fetchOrganisations(BASE_URL)).rejects.toThrow(
      'Authentication required'
    );
  });

  it('handles 403 Forbidden', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/', (req, res, ctx) => {
        return res(
          ctx.status(403),
          ctx.json({ error: { code: 403, message: 'Permission denied' } })
        );
      })
    );

    await expect(fetchOrganisations(BASE_URL)).rejects.toThrow(
      'Permission denied'
    );
  });

  it('handles 500 Server Error', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: { code: 500, message: 'Server error' } })
        );
      })
    );

    await expect(fetchOrganisations(BASE_URL)).rejects.toThrow('Server error');
  });

  it('handles network errors', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );

    await expect(fetchOrganisations(BASE_URL)).rejects.toThrow();
  });

  it('returns empty array when no organisations', async () => {
    server.use(
      rest.get('http://localhost/api/organisations/', (req, res, ctx) => {
        return res(ctx.json({
          organisations: [],
        }));
      })
    );

    const orgs = await fetchOrganisations(BASE_URL);
    expect(orgs).toHaveLength(0);
  });
});
