/**
 * Unit tests for contextApi.
 */

import {
  fetchCurrentContext,
  setCurrentContext,
} from '../../src/api/contextApi';
import { server } from '../mocks/server';
import { rest } from 'msw';

const BASE_URL = 'http://localhost/api';

describe('fetchCurrentContext', () => {
  it('fetches current context successfully', async () => {
    const context = await fetchCurrentContext(BASE_URL);

    expect(context).toEqual({
      organisationId: 'org_123',
      projectId: 'proj_789',
    });
  });

  it('returns null if endpoint does not exist (404)', async () => {
    server.use(
      rest.get('http://localhost/api/context/current/', (req, res, ctx) => {
        return res(
          ctx.status(404),
          ctx.json({ error: { code: 404, message: 'Not found' } })
        );
      })
    );

    const context = await fetchCurrentContext(BASE_URL);
    expect(context).toBeNull();
  });

  it('returns null on network error', async () => {
    server.use(
      rest.get('http://localhost/api/context/current/', (req, res) => {
        return res.networkError('Network error');
      })
    );

    const context = await fetchCurrentContext(BASE_URL);
    expect(context).toBeNull();
  });

  it('throws on non-404 error', async () => {
    server.use(
      rest.get('http://localhost/api/context/current/', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: { code: 500, message: 'Server error' } })
        );
      })
    );

    await expect(fetchCurrentContext(BASE_URL)).rejects.toThrow('Server error');
  });
});

describe('setCurrentContext', () => {
  it('sets current context successfully', async () => {
    await expect(
      setCurrentContext('org_123', 'proj_789', BASE_URL)
    ).resolves.not.toThrow();
  });

  it('sets org-only context (no project)', async () => {
    await expect(
      setCurrentContext('org_123', null, BASE_URL)
    ).resolves.not.toThrow();
  });

  it('handles endpoint not existing gracefully (404)', async () => {
    server.use(
      rest.post('http://localhost/api/context/set/', (req, res, ctx) => {
        return res(
          ctx.status(404),
          ctx.json({ error: { code: 404, message: 'Not found' } })
        );
      })
    );

    await expect(
      setCurrentContext('org_123', 'proj_789', BASE_URL)
    ).resolves.not.toThrow();
  });

  it('handles network error gracefully', async () => {
    server.use(
      rest.post('http://localhost/api/context/set/', (req, res) => {
        return res.networkError('Network error');
      })
    );

    await expect(
      setCurrentContext('org_123', 'proj_789', BASE_URL)
    ).resolves.not.toThrow();
  });
});
