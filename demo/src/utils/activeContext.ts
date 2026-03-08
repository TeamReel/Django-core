import { getApiBaseUrl } from './apiBase';
import { getCsrfToken } from './csrf';

export type ActiveContextKind =
  | 'organisation'
  | 'club'
  | 'team'
  | 'season'
  | 'competition'
  | 'match'
  | 'membership'
  | 'clear';

export const ACTIVE_CONTEXT_CHANGED_EVENT = 'activeContextChanged';

export function emitActiveContextChanged() {
  try {
    window.dispatchEvent(new Event(ACTIVE_CONTEXT_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export async function setActiveContext(kind: ActiveContextKind, id?: string | number) {
  const baseUrl = getApiBaseUrl();
  const csrfToken = getCsrfToken();

  const res = await fetch(`${baseUrl}/api/v1/auth/active-context/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ kind, id }),
  });

  if (!res.ok) {
    let message = `Failed to set active context (${res.status})`;
    try {
      const raw = await res.json();
      const details = raw?.error?.message || raw?.message;
      if (details) message = String(details);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  emitActiveContextChanged();
  return true;
}

export async function getActiveContext() {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/active-context/`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load active context (${res.status})`);
  }

  const raw = await res.json().catch(() => null);
  return raw?.data ?? raw;
}
