import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../utils/apiBase';
import type { UsageEvent } from './usageEvents.types';

const LIMIT = 50;

function getCookie(name: string) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

export function useUsageEvents() {
  const { context, organisations } = useContextSwitcher();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<UsageEvent | null>(null);
  const [editMode, setEditMode] = useState<'global' | 'org'>(
    () => (localStorage.getItem('usage-events-edit-mode') as 'global' | 'org') || 'org'
  );

  // Query params for filtering
  const eventType = searchParams.get('event_type') || '';
  const userFilter = searchParams.get('user') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = searchParams.get('page') || '1';

  // Derived state
  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';
  const currentOrganisation = context.organisation;
  const currentProject = context.project;
  const isSuperadmin = (user as any)?.is_superuser || (user as any)?.role === 'Superadmin';

  console.log('[UsageEventsPage] User:', user, 'isSuperadmin:', isSuperadmin);

  // Breadcrumb context switcher
  const { organisationOptions } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    console.log('[UsageEventsPage] Switching to org:', option.label, option.id);
    localStorage.setItem('django-core:currentOrgId', option.id);
    localStorage.removeItem('django-core:currentProjectId');
    localStorage.setItem('usage-events-edit-mode', 'org');
    window.location.reload();
  };

  // Persist editMode
  useEffect(() => {
    localStorage.setItem('usage-events-edit-mode', editMode);
  }, [editMode]);

  // Force non-superadmins to org mode
  useEffect(() => {
    if (!isSuperadmin && currentOrgId && editMode !== 'org') {
      setEditMode('org');
    }
  }, [isSuperadmin, currentOrgId, editMode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = getApiBaseUrl();
      let url = `${baseUrl}/api/v1/usage-events/`;
      const params = new URLSearchParams();

      if (editMode === 'org' && currentOrganisation) {
        params.append('organization_id', currentOrganisation.id);
      }

      params.append('page_size', LIMIT.toString());
      params.append('page', page);

      if (eventType) params.append('event_type', eventType);
      if (userFilter) params.append('user__email__icontains', userFilter);
      if (dateFrom) params.append('timestamp__gte', `${dateFrom}T00:00:00`);
      if (dateTo) params.append('timestamp__lte', `${dateTo}T23:59:59`);

      if (params.toString()) url += `?${params.toString()}`;

      console.log('[UsageEventsPage] Fetching events from:', url, 'mode:', editMode);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      console.log('[UsageEventsPage] Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('[UsageEventsPage] Response data:', result);
        console.log('[UsageEventsPage] result.data:', result.data);
        console.log('[UsageEventsPage] result.data.count:', result.data?.count);
        console.log('[UsageEventsPage] result.meta:', result.meta);

        // Extract from B13 envelope — handle multiple DRF pagination shapes
        let eventList: UsageEvent[] = [];
        let totalCount = 0;

        if (result.data?.data?.results) {
          eventList = result.data.data.results;
          totalCount = result.data.data.count || eventList.length;
        } else if (result.data?.data && Array.isArray(result.data.data)) {
          eventList = result.data.data;
          totalCount = result.data?.count || result.meta?.pagination?.count || eventList.length;
        } else if (result.data?.results) {
          eventList = result.data.results;
          totalCount = result.data?.count || eventList.length;
        } else if (result.data && Array.isArray(result.data)) {
          eventList = result.data;
          totalCount = result.meta?.pagination?.count || eventList.length;
        } else if (Array.isArray(result)) {
          eventList = result;
          totalCount = eventList.length;
        }

        console.log('[UsageEventsPage] Extracted events:', eventList, 'Total:', totalCount);
        setEvents(eventList);
        setTotal(totalCount);
        setDemoMode(false);
      } else if (response.status === 404) {
        // Demo mode fallback
        const demoEvents: UsageEvent[] = [
          {
            id: 'demo-1',
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            event_type: 'project.created',
            user_email: 'admin@example.com',
            user_full_name: 'Admin User',
            organization_name: currentOrganisation?.name || 'Demo Organisation',
            project_name: currentProject?.name || 'Demo Project',
            metadata: { source: 'demo', action: 'create' },
          },
          {
            id: 'demo-2',
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            event_type: 'user.login',
            user_email: 'coach@example.com',
            user_full_name: 'Coach User',
            organization_name: currentOrganisation?.name || 'Demo Organisation',
            metadata: { source: 'demo', ip: '192.168.1.1' },
          },
          {
            id: 'demo-3',
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            event_type: 'api.request',
            user_email: 'player@example.com',
            user_full_name: 'Player User',
            organization_name: currentOrganisation?.name || 'Demo Organisation',
            project_name: currentProject?.name,
            metadata: { source: 'demo', endpoint: '/api/v1/projects/' },
          },
        ];
        setEvents(demoEvents);
        setDemoMode(true);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage events');
      console.error('Usage events fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentOrganisation, currentProject, editMode, eventType, userFilter, dateFrom, dateTo, page]);

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEvent) {
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedEvent]);

  const handleGenerateTestEvent = async () => {
    if (editMode === 'org' && !currentOrganisation) {
      setError('Please select an organisation first');
      return;
    }

    if (!user || !(user as any).id) {
      setError('User information not available');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const userId = (user as any).id;
      const testEvent: any = {
        event_type: 'test_action',
        user_id: userId,
        metadata: { source: 'demo', mode: editMode },
      };

      if (editMode === 'org' && currentOrganisation) {
        testEvent.organization_id = currentOrganisation.id;
        testEvent.project_id = currentProject?.id || null;
      }

      // Optimistic update
      const optimisticEvent: UsageEvent = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: 'test_action',
        user_email: (user as any).email,
        user_full_name: (user as any).name || (user as any).email,
        organization_name: editMode === 'org' ? currentOrganisation?.name : undefined,
        project_name: editMode === 'org' ? currentProject?.name : undefined,
        metadata: { source: 'demo', mode: editMode },
      };
      setEvents([optimisticEvent, ...events]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (!demoMode) {
        const csrfToken = getCookie('csrftoken');
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/usage-events/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken || '',
          },
          credentials: 'include',
          body: JSON.stringify(testEvent),
        });

        if (response.ok) {
          await fetchEvents();
        } else {
          const errorData = await response.json().catch(() => null);
          console.error('Backend error:', response.status, errorData);
          if (response.status === 404) {
            setDemoMode(true);
          } else {
            setError(`Backend error: ${response.status} - ${JSON.stringify(errorData)}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate test event:', err);
    } finally {
      setGenerating(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return {
    // State
    events,
    loading,
    generating,
    error,
    success,
    demoMode,
    total,
    selectedEvent,
    editMode,
    // Derived
    eventType,
    userFilter,
    dateFrom,
    dateTo,
    page,
    currentOrgId,
    currentOrgName,
    currentOrganisation,
    currentProject,
    isSuperadmin,
    totalPages,
    organisationOptions,
    // Setters
    setEditMode,
    setSelectedEvent,
    searchParams,
    setSearchParams,
    // Actions
    handleOrganisationSwitch,
    handleGenerateTestEvent,
  };
}
