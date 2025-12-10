/**
 * Unit tests for organisationsApi.
 */

import { fetchOrganisations } from '../../src/api/organisationsApi';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('fetchOrganisations', () => {
  it('fetches organisations successfully', async () => {
    const orgs = await fetchOrganisations('/api');

    expect(orgs).toHaveLength(2);
    expect(orgs[0].name).toBe('Acme Corp');
    expect(orgs[0].slug).toBe('acme-corp');
    expect(orgs[1].name).toBe('Beta Inc');
    expect(orgs[1].slug).toBe('beta-inc');
  });

  it('handles 401 Unauthorized', async () => {
    server.use(
      http.get('/api/organisations/', () => {
        return HttpResponse.json(
          { error: { code: 401, message: 'Authentication required' } },
          { status: 401 }
        );
      })
    );

    await expect(fetchOrganisations('/api')).rejects.toThrow(
      'Authentication required'
    );
  });

  it('handles 403 Forbidden', async () => {
    server.use(
      http.get('/api/organisations/', () => {
        return HttpResponse.json(
          { error: { code: 403, message: 'Permission denied' } },
          { status: 403 }
        );
      })
    );

    await expect(fetchOrganisations('/api')).rejects.toThrow(
      'Permission denied'
    );
  });

  it('handles 500 Server Error', async () => {
    server.use(
      http.get('/api/organisations/', () => {
        return HttpResponse.json(
          { error: { code: 500, message: 'Server error' } },
          { status: 500 }
        );
      })
    );

    await expect(fetchOrganisations('/api')).rejects.toThrow('Server error');
  });

  it('handles network errors', async () => {
    server.use(
      http.get('/api/organisations/', () => {
        return HttpResponse.error();
      })
    );

    await expect(fetchOrganisations('/api')).rejects.toThrow();
  });

  it('returns empty array when no organisations', async () => {
    server.use(
      http.get('/api/organisations/', () => {
        return HttpResponse.json({
          organisations: [],
        });
      })
    );

    const orgs = await fetchOrganisations('/api');
    expect(orgs).toHaveLength(0);
  });
});
