import { normalizeError } from '../src/errorNormalizer';

describe('normalizeError', () => {
  it('parses B13 error envelope', () => {
    const body = {
      error: {
        code: 400,
        message: 'Invalid input',
        fieldErrors: { email: ['Invalid email format'] },
      },
    };

    const result = normalizeError(400, body);

    expect(result).toEqual({
      code: 400,
      message: 'Invalid input',
      fieldErrors: { email: ['Invalid email format'] },
      details: body,
    });
  });

  it('returns default message for non-B13 errors', () => {
    const body = 'Internal Server Error';

    const result = normalizeError(500, body);

    expect(result.code).toBe(500);
    expect(result.message).toContain('Server error');
    expect(result.details).toBe(body);
  });

  it('handles 401 Unauthorized', () => {
    const result = normalizeError(401, {});

    expect(result.message).toContain('Authentication required');
  });

  it('handles 403 Forbidden', () => {
    const result = normalizeError(403, {});

    expect(result.message).toContain('permission');
  });

  it('handles 404 Not Found', () => {
    const result = normalizeError(404, {});

    expect(result.message).toContain('not found');
  });

  it('handles B13 error with formErrors', () => {
    const body = {
      error: {
        code: 400,
        message: 'Form validation failed',
        formErrors: ['This form has errors', 'Please try again'],
      },
    };

    const result = normalizeError(400, body);

    expect(result.formErrors).toEqual(['This form has errors', 'Please try again']);
  });

  it('handles 400 Bad Request', () => {
    const result = normalizeError(400, {});

    expect(result.message).toContain('Invalid request');
  });

  it('handles 429 Too Many Requests', () => {
    const result = normalizeError(429, {});

    expect(result.message).toContain('Too many requests');
  });

  it('handles 502/503 server errors', () => {
    const result502 = normalizeError(502, {});
    const result503 = normalizeError(503, {});

    expect(result502.message).toContain('Server error');
    expect(result503.message).toContain('Server error');
  });

  it('handles unknown status codes', () => {
    const result = normalizeError(418, {});

    expect(result.message).toContain('An error occurred');
    expect(result.message).toContain('418');
  });

  it('ignores invalid fieldErrors format', () => {
    const body = {
      error: {
        code: 400,
        message: 'Bad request',
        fieldErrors: 'not an object', // Invalid format
      },
    };

    const result = normalizeError(400, body);

    expect(result.fieldErrors).toBeUndefined();
  });

  it('ignores invalid formErrors format', () => {
    const body = {
      error: {
        code: 400,
        message: 'Bad request',
        formErrors: { invalid: 'format' }, // Should be array
      },
    };

    const result = normalizeError(400, body);

    expect(result.formErrors).toBeUndefined();
  });
});
