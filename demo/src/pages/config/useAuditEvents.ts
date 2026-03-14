/**
 * useAuditEvents — My audit events state.
 *
 * Fetches audit events for the current user when the audit tab is active.
 * Extracted from usePreferencesData to reduce its useState count.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { logger } from '@/utils/logger';
import { api } from '@/api';
import type { AuditEvent } from '../../types';

export interface AuditEventsReturn {
  myAuditEvents: AuditEvent[];
  myAuditLoading: boolean;
  myAuditError: string | null;
}

export function useAuditEvents(activeTab: string): AuditEventsReturn {
  const { user } = useAuth();

  const [myAuditEvents, setMyAuditEvents] = useState<AuditEvent[]>([]);
  const [myAuditLoading, setMyAuditLoading] = useState(false);
  const [myAuditError, setMyAuditError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'audit') return;
    const myUserId = String(user?.id || '').trim();
    const myEmail = String(user?.email || '').trim().toLowerCase();
    if (!myUserId && !myEmail) return;

    let cancelled = false;
    const run = async () => {
      try {
        setMyAuditLoading(true);
        setMyAuditError(null);
        const data = await api.list<AuditEvent>('/activity/', { params: { limit: 200, offset: 0 } });
        const results: AuditEvent[] = data.results;
        const filtered = results
          .filter((e) => {
            const uid = String(e?.user?.id || '').trim();
            const email = String(e?.user?.email || '').trim().toLowerCase();
            return (myUserId && uid === myUserId) || (myEmail && email === myEmail);
          })
          .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
        if (!cancelled) setMyAuditEvents(filtered);
      } catch (e) {
        logger.error('Failed to load audit events', e);
        if (!cancelled) setMyAuditError(e instanceof Error ? e.message : 'Failed to load audit events');
      } finally {
        if (!cancelled) setMyAuditLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [activeTab, user]);

  return { myAuditEvents, myAuditLoading, myAuditError };
}
