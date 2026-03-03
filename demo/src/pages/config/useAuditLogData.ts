import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import type { AuditEvent } from '../../types';
import { getApiBaseUrl } from '../../utils/apiBase';

const LIMIT = 50;

export const eventTypeColorMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  user_login: 'success',
  user_logout: 'info',
  org_created: 'success',
  project_created: 'success',
  permission_changed: 'warning',
  user_invited: 'info',
  user_removed: 'error',
  credits_used: 'warning',
  credits_refunded: 'success',
};

export const getEventOutcome = (event: AuditEvent): string => {
  const metadata = event.metadata || {};
  const permissionGranted = metadata.granted;
  if (event.event_type === 'permission.checked' && permissionGranted !== undefined) {
    return permissionGranted ? 'allowed' : 'denied';
  }
  const successEvents = ['auth.login', 'auth.logout', 'resource.created', 'role.assigned', 'config.updated'];
  const failureEvents = ['auth.login_failed'];
  if (successEvents.includes(event.event_type)) return 'success';
  if (failureEvents.includes(event.event_type)) return 'failed';
  return '';
};

export function useAuditLogData() {
  const { user: authUser } = useAuth();
  const { context } = useContextSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  // Query params
  const eventType = searchParams.get('event_type') || '';
  const user = searchParams.get('user') || '';
  const outcome = searchParams.get('outcome') || '';
  const organization = searchParams.get('organization') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = searchParams.get('page') || '1';

  const contextOrgId = String((context as any)?.organisation?.id || '').trim();

  // Default to org-scoped audit
  useEffect(() => {
    if (!contextOrgId) return;
    if (searchParams.get('organization')) return;
    const next = new URLSearchParams(searchParams);
    next.set('organization', contextOrgId);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [contextOrgId, searchParams, setSearchParams]);

  // Fetch audit events
  useEffect(() => {
    const fetchAuditEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.append('limit', LIMIT.toString());
        params.append('offset', ((parseInt(page) - 1) * LIMIT).toString());
        if (eventType) params.append('event_type', eventType);
        if (user) params.append('user__name__icontains', user);
        if (dateFrom) params.append('created_at__gte', `${dateFrom}T00:00:00`);
        if (dateTo) params.append('created_at__lte', `${dateTo}T23:59:59`);
        if (organization) params.append('organization', organization);

        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/activity/?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Audit API error:', response.status, errorText);
          throw new Error(`Failed to load audit log. Backend error: ${response.status}`);
        }

        const rawData = await response.json();
        const data = rawData.data || rawData;
        let filteredEvents = data.results || [];

        if (outcome) {
          filteredEvents = filteredEvents.filter((event: AuditEvent) => getEventOutcome(event) === outcome);
        }
        setEvents(filteredEvents);
        setTotal(outcome ? filteredEvents.length : (data.count || 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log. Backend error.');
        console.error('Audit fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditEvents();
  }, [eventType, user, outcome, organization, dateFrom, dateTo, page]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (page !== '1' || dateFrom || dateTo || !authUser) return;
    let ws: WebSocket | null = null;
    let reconnectTimer: number;
    let isMounted = true;

    const connect = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const tokenResponse = await fetch(`${baseUrl}/api/ws/token/`, { credentials: 'include' });
        if (!tokenResponse.ok) {
          console.error('[AuditLog] Failed to get WebSocket token', tokenResponse.status);
          reconnectTimer = setTimeout(connect, 5000);
          return;
        }
        const { token } = await tokenResponse.json();
        if (!isMounted) return;

        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${token}`;
        console.log(`[AuditLog] Connecting to WebSocket at ${wsUrl}...`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log('[AuditLog] Connected to real-time updates');

        ws.onmessage = (event) => {
          try {
            console.log('[AuditLog] Received message:', event.data);
            const data = JSON.parse(event.data);
            if (data.type === 'audit.created' && data.payload) {
              const newEvent = data.payload as AuditEvent;
              if (eventType && newEvent.event_type !== eventType) return;
              setEvents(prev => {
                if (prev.some(e => e.id === newEvent.id)) return prev;
                return [newEvent, ...prev].slice(0, LIMIT);
              });
              setTotal(prev => prev + 1);
            }
          } catch (e) {
            console.error('[AuditLog] Failed to parse WebSocket message', e);
          }
        };

        ws.onclose = () => {
          console.log('[AuditLog] Disconnected');
          if (isMounted) reconnectTimer = setTimeout(connect, 3000);
        };
      } catch (e) {
        console.error('[AuditLog] Connection failed', e);
        if (isMounted) reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => { isMounted = false; if (ws) ws.close(); clearTimeout(reconnectTimer); };
  }, [page, dateFrom, dateTo, eventType, authUser]);

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEvent) setSelectedEvent(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedEvent]);

  // Filter handlers
  const handleEventTypeFilter = (type: string) => {
    if (type) searchParams.set('event_type', type);
    else searchParams.delete('event_type');
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handleUserFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) searchParams.set('user', e.target.value);
    else searchParams.delete('user');
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handlePageChange = (newPage: number) => {
    searchParams.set('page', newPage.toString());
    setSearchParams(searchParams);
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = parseInt(page);

  return {
    events, loading, error, total, selectedEvent,
    eventType, user, outcome, dateFrom, dateTo,
    totalPages, currentPage,
    searchParams, setSearchParams,
    setSelectedEvent,
    handleEventTypeFilter, handleUserFilter, handlePageChange,
  };
}
