import { useEffect, useState, type Dispatch, type SetStateAction, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import type { AuditEvent } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { api } from '../../api/client';
import { getApiBaseUrl } from '../../utils/apiBase';
import { logger } from '@/utils/logger';

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

export interface UseAuditLogDataReturn {
  events: AuditEvent[];
  loading: boolean;
  error: string | null;
  total: number;
  selectedEvent: AuditEvent | null;
  eventType: string;
  user: string;
  outcome: string;
  dateFrom: string;
  dateTo: string;
  totalPages: number;
  currentPage: number;
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
  setSelectedEvent: Dispatch<SetStateAction<AuditEvent | null>>;
  handleEventTypeFilter: (type: string) => void;
  handleUserFilter: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePageChange: (newPage: number) => void;
}

export function useAuditLogData(): UseAuditLogDataReturn {
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

  const contextOrgId = String((context as { organisation?: { id: string } })?.organisation?.id || '').trim();
  const baseUrl = getApiBaseUrl();

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
        const { results, count } = await api.list<AuditEvent>('/activity/', {
          params: {
            limit: LIMIT,
            offset: (parseInt(page) - 1) * LIMIT,
            ...(eventType ? { event_type: eventType } : {}),
            ...(user ? { user__name__icontains: user } : {}),
            ...(dateFrom ? { created_at__gte: `${dateFrom}T00:00:00` } : {}),
            ...(dateTo ? { created_at__lte: `${dateTo}T23:59:59` } : {}),
            ...(organization ? { organization } : {}),
          },
        });
        let filteredEvents = results;

        if (outcome) {
          filteredEvents = filteredEvents.filter((event: AuditEvent) => getEventOutcome(event) === outcome);
        }
        setEvents(filteredEvents);
        setTotal(outcome ? filteredEvents.length : count);
      } catch (err) {
        logger.error('Audit fetch error', err);
        setError(err instanceof Error ? err.message : 'Failed to load audit log. Backend error.');
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
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const connect = async () => {
      try {
        const tokenResponse = await apiFetch('/api/ws/token/');
        if (!tokenResponse.ok) {
          logger.error('AuditLog: Failed to get WebSocket token', tokenResponse.status);
          reconnectTimer = setTimeout(connect, 5000);
          return;
        }
        const { token } = await tokenResponse.json();
        if (!isMounted) return;

        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${token}`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
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
            logger.error('AuditLog: Failed to parse WebSocket message', e);
          }
        };

        ws.onclose = () => {
          if (isMounted) reconnectTimer = setTimeout(connect, 3000);
        };
      } catch (e) {
        logger.error('AuditLog connection failed', e);
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
