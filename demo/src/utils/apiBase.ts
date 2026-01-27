export function getApiBaseUrl(): string {
  const raw = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  const fromEnv = raw.replace(/\/+$/, '');
  if (fromEnv) return fromEnv;

  // Local dev: rely on Vite proxy + relative paths.
  if (typeof window !== 'undefined') {
    const host = String(window.location.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return '';
    }

    // Production fallback for TeamReel if env var is missing.
    return 'https://api.teamreel.app';
  }

  return '';
}
