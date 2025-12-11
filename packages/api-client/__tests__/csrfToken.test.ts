import { getCsrfToken } from '../src/csrfToken';

function clearCookies() {
  // jsdom doesn't clear cookies with document.cookie = ''
  // Instead, expire all cookies
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

describe('getCsrfToken', () => {
  beforeEach(() => {
    clearCookies();
  });

  it('extracts CSRF token from cookie', () => {
    document.cookie = 'csrftoken=abc123; path=/';
    expect(getCsrfToken()).toBe('abc123');
  });

  it('returns null if csrftoken cookie missing', () => {
    document.cookie = 'other=value; path=/';
    expect(getCsrfToken()).toBeNull();
  });

  it('handles multiple cookies', () => {
    clearCookies();
    document.cookie = 'sessionid=xyz; path=/';
    document.cookie = 'csrftoken=token456; path=/';
    document.cookie = 'other=value; path=/';
    expect(getCsrfToken()).toBe('token456');
  });

  it('returns null if cookie is empty', () => {
    clearCookies();
    expect(getCsrfToken()).toBeNull();
  });
});
