import { createApiClient } from '../src/client';

// Mock global fetch
(globalThis as any).fetch = jest.fn();

describe('createApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear all cookies first
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
    // Set test token
    document.cookie = 'csrftoken=test-token; path=/';
  });

  it('injects CSRF token on POST request', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const client = createApiClient();
    await client.post('/api/test', { data: 'value' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      })
    );

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = call[1].headers as Headers;
    expect(headers.get('X-CSRFToken')).toBe('test-token');
  });

  it('does not inject CSRF token on GET request', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const client = createApiClient();
    await client.get('/api/test');

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = call[1].headers as Headers;
    expect(headers.get('X-CSRFToken')).toBeNull();
  });

  it('returns error for 403 response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: { code: 403, message: 'Forbidden' },
      }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const client = createApiClient();
    const result = await client.get('/api/test');

    expect(result.error).toEqual({
      code: 403,
      message: 'Forbidden',
      details: { error: { code: 403, message: 'Forbidden' } },
    });
  });

  it('handles network errors', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

    const client = createApiClient();
    const result = await client.get('/api/test');

    expect(result.error?.code).toBe(0);
    expect(result.error?.message).toContain('Network error');
  });

  it('PUT request injects CSRF token', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const client = createApiClient();
    await client.put('/api/test/1', { name: 'updated' });

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = call[1].headers as Headers;
    expect(headers.get('X-CSRFToken')).toBe('test-token');
    expect(call[1].method).toBe('PUT');
  });

  it('PATCH request injects CSRF token', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const client = createApiClient();
    await client.patch('/api/test/1', { status: 'active' });

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = call[1].headers as Headers;
    expect(headers.get('X-CSRFToken')).toBe('test-token');
    expect(call[1].method).toBe('PATCH');
  });

  it('DELETE request injects CSRF token', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const client = createApiClient();
    await client.delete('/api/test/1');

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = call[1].headers as Headers;
    expect(headers.get('X-CSRFToken')).toBe('test-token');
    expect(call[1].method).toBe('DELETE');
  });

  it('handles non-JSON responses', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => 'Plain text response',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    });

    const client = createApiClient();
    const result = await client.get('/api/test');

    expect(result.data).toBe('Plain text response');
  });

  it('applies custom baseUrl and headers', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const client = createApiClient({
      baseUrl: '/api/v1',
      headers: { 'X-Custom': 'value' },
    });
    await client.get('/test');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/test',
      expect.any(Object)
    );

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = call[1].headers as Headers;
    expect(headers.get('X-Custom')).toBe('value');
  });
});
