/**
 * Unit tests for contextApi.
 */

import {
  fetchCurrentContext,
  setCurrentContext,
} from '../../src/api/contextApi';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('fetchCurrentContext', () => {
  it('fetches current context successfully', async () => {
    const context = await fetchCurrentContext('/api');

    expect(context).toEqual({
      organisationId: 'org_123',
      projectId: 'proj_789',
    });
  });

  it('returns null if endpoint does not exist (404)', async () => {
    server.use(
      http.get('/api/context/current/', () => {
        return HttpResponse.json(
          { error: { code: 404, message: 'Not found' } },
          { status: 404 }
        );
      })
    );

    const context = await fetchCurrentContext('/api');
    expect(context).toBeNull();
  });

  it('returns null on network error', async () => {
    server.use(
      http.get('/api/context/current/', () => {
        return HttpResponse.error();
      })
    );

    const context = await fetchCurrentContext('/api');
    expect(context).toBeNull();
  });

  it('throws on non-404 error', async () => {
    server.use(
      http.get('/api/context/current/', () => {
        return HttpResponse.json(
          { error: { code: 500, message: 'Server error' } },
          { status: 500 }
        );
      })
    );

    await expect(fetchCurrentContext('/api')).rejects.toThrow('Server error');
  });
});

describe('setCurrentContext', () => {
  it('sets current context successfully', async () => {
    await expect(
      setCurrentContext('org_123', 'proj_789', '/api')
    ).resolves.not.toThrow();
  });

  it('sets org-only context (no project)', async () => {
    await expect(
      setCurrentContext('org_123', null, '/api')
    ).resolves.not.toThrow();
  });

  it('handles endpoint not existing gracefully (404)', async () => {
    server.use(
      http.post('/api/context/set/', () => {
        return HttpResponse.json(
          { error: { code: 404, message: 'Not found' } },
          { status: 404 }
        );
      })
    );

    await expect(
      setCurrentContext('org_123', 'proj_789', '/api')
    ).resolves.not.toThrow();
  });

  it('handles network error gracefully', async () => {
    server.use(
      http.post('/api/context/set/', () => {
        return HttpResponse.error();
      })
    );

    await expect(
      setCurrentContext('org_123', 'proj_789', '/api')
    ).resolves.not.toThrow();
  });
});
