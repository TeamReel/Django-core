import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { api } from '../../api/client';
import type { UsageEvent } from './usageEvents.types';

const LIMIT = 50;

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
  const isSuperadmin = user?.is_superuser || user?.role === 'superadmin';

  // Breadcrumb context switcher
  const { organisationOptions } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
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

      const queryParams: Record<string, string | number | boolean | undefined> = {
        page: parseInt(page),
        ...(editMode === 'org' && currentOrganisation ? { organization_id: currentOrganisation.id } : {}),
        ...(eventType ? { event_type: eventType } : {}),
        ...(userFilter ? { user__email__icontains: userFilter } : {}),
        ...(dateFrom ? { timestamp__gte: `${dateFrom}T00:00:00` } : {}),
        ...(dateTo ? { timestamp__lte: `${dateTo}T23:59:59` } : {}),
      };

      try {
        const { results: eventList, count: totalCount } = await api.list<UsageEvent>('/usage-events/', {
          pageSize: LIMIT,
          params: queryParams,
        });
        setEvents(eventList);
        setTotal(totalCount);
        setDemoMode(false);
      } catch (fetchErr: any) {
        if (fetchErr?.status === 404) {
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
          throw fetchErr;
        }
      }
    } catch (err) {
      console.error(err);
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

    if (!user || !user.id) {
      setError('User information not available');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const userId = user.id;
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
        user_email: user.email,
        user_full_name: user.name || user.email,
        organization_name: editMode === 'org' ? currentOrganisation?.name : undefined,
        project_name: editMode === 'org' ? currentProject?.name : undefined,
        metadata: { source: 'demo', mode: editMode },
      };
      setEvents([optimisticEvent, ...events]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (!demoMode) {
        try {
          await api.post('/usage-events/', testEvent);
          await fetchEvents();
        } catch (postErr: any) {
          console.error('Backend error:', postErr?.status, postErr?.body);
          if (postErr?.status === 404) {
            setDemoMode(true);
          } else {
            setError(`Backend error: ${postErr?.status || 'unknown'} - ${JSON.stringify(postErr?.body)}`);
          }
        }
      }
    } catch (err) {
      console.error(err);
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
