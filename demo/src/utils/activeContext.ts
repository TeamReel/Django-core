import { api } from '@/api';

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

export interface ActiveContext {
  updated_at?: string | null;
  organisation?: { id: string; slug: string; name: string } | null;
  club?: { id: string; slug: string; name: string } | null;
  team?: { id: string; slug: string; name: string } | null;
  season?: { id: string; key?: string; name?: string; slug?: string } | null;
  competition?: { id: string; key?: string; slug?: string; name?: string } | null;
  match?: { id: string; key?: string; slug?: string; title?: string } | null;
  membership?: Record<string, unknown> | null;
  org?: { id: string } | null;
  project?: { id: string } | null;
  [key: string]: unknown;
}

export async function getActiveContext(): Promise<ActiveContext> {
  const raw = await api.get<ActiveContext>('/auth/active-context/');
  const envelope = raw as ActiveContext & { data?: ActiveContext };
  return envelope.data ?? raw;
}
