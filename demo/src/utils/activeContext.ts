import { api } from '../api';

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
  await api.patch('/auth/active-context/', { kind, id });
  emitActiveContextChanged();
  return true;
}

export async function getActiveContext() {
  const raw = await api.get<any>('/auth/active-context/');
  return raw?.data ?? raw;
}
