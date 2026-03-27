import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import type { ListResult } from '@/api';

export type { WorkflowState, WorkflowTransition, WorkflowDefinition, WorkflowTemplate, AvailableAction, WorkflowInstance, TransitionHistoryEntry } from './workflowTypes';
export type { WorkflowStateCategory } from './workflowDisplayHelpers';
export { classifyState, getStateDisplay, getActionDisplay } from './workflowDisplayHelpers';

import type { WorkflowTemplate, WorkflowInstance, TransitionHistoryEntry } from './workflowTypes';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

// ─── Helpers ────────────────────────────────────────────────────────────────

function unwrapResults<T>(payload: unknown): T[] {
  const p = payload as Record<string, unknown> | undefined;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(p?.results)) return p.results as T[];
  const d = p?.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.results)) return d.results as T[];
  if (d && Array.isArray(d)) return d as T[];
  return [];
}

// ─── useWorkflowTemplates ───────────────────────────────────────────────────

export interface UseWorkflowTemplatesReturn {
  templates: WorkflowTemplate[];
  loading: boolean;
  error: string | null;
}

export function useWorkflowTemplates(): UseWorkflowTemplatesReturn {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        const data = await api.get<unknown>('/workflows/templates/?is_active=true');
        setTemplates(unwrapResults<WorkflowTemplate>(data));
        setError(null);
      } catch (err: unknown) {
        logger.error('useWorkflowTemplates error', err);
        setError(err instanceof Error ? err.message : 'Failed to load workflow templates');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  return { templates, loading, error };
}

// ─── useWorkflowInstances ───────────────────────────────────────────────────

interface UseWorkflowInstancesOptions {
  project_id?: string | number;
  current_state?: string;
  content_type_name?: string;
  object_id?: string | number;
  page_size?: number;
}

export interface UseWorkflowInstancesReturn {
  instances: WorkflowInstance[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkflowInstances(options: UseWorkflowInstancesOptions = {}): UseWorkflowInstancesReturn {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Auto-refresh when workflow changes are dispatched by other components
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('workflowChanged', handler);
    return () => window.removeEventListener('workflowChanged', handler);
  }, [refresh]);

  useEffect(() => {
    async function fetchInstances() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (options.project_id) params.append('project', String(options.project_id));
        if (options.current_state) params.append('current_state', options.current_state);
        if (options.page_size) params.append('page_size', String(options.page_size));

        const data = await api.get<unknown>(`/workflows/instances/?${params.toString()}`);
        let results = unwrapResults<WorkflowInstance>(data);

        // Client-side filter by content_type_name and object_id if provided
        if (options.content_type_name) {
          results = results.filter(i => i.content_type_name === options.content_type_name);
        }
        if (options.object_id) {
          results = results.filter(i => String(i.object_id) === String(options.object_id));
        }

        setInstances(results);
        setError(null);
      } catch (err: unknown) {
        logger.error('useWorkflowInstances error', err);
        setError(err instanceof Error ? err.message : 'Failed to load workflow instances');
      } finally {
        setLoading(false);
      }
    }
    fetchInstances();
  }, [options.project_id, options.current_state, options.content_type_name, options.object_id, options.page_size, refreshKey]);

  return { instances, loading, error, refresh };
}

// ─── useWorkflowInstance (single) ───────────────────────────────────────────

export interface UseWorkflowInstanceReturn {
  instance: WorkflowInstance | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkflowInstance(instanceId: number | string | null): UseWorkflowInstanceReturn {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!instanceId) return;

    async function fetchInstance() {
      try {
        setLoading(true);
        const data = await api.get<WorkflowInstance>(`/workflows/instances/${instanceId}/`);
        setInstance(data);
        setError(null);
      } catch (err: unknown) {
        logger.error('useWorkflowInstance error', err);
        setError(err instanceof Error ? err.message : 'Failed to load workflow instance');
      } finally {
        setLoading(false);
      }
    }
    fetchInstance();
  }, [instanceId, refreshKey]);

  return { instance, loading, error, refresh };
}

// ─── useTransitionHistory ───────────────────────────────────────────────────

export interface UseTransitionHistoryReturn {
  history: TransitionHistoryEntry[];
  loading: boolean;
  error: string | null;
}

export function useTransitionHistory(instanceId: number | string | null): UseTransitionHistoryReturn {
  const [history, setHistory] = useState<TransitionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId) return;

    async function fetchHistory() {
      try {
        setLoading(true);
        const data = await api.get<unknown>(`/workflows/history/?instance=${instanceId}&ordering=-created_at`);
        setHistory(unwrapResults<TransitionHistoryEntry>(data));
        setError(null);
      } catch (err: unknown) {
        logger.error('useTransitionHistory error', err);
        setError(err instanceof Error ? err.message : 'Failed to load transition history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [instanceId]);

  return { history, loading, error };
}

// ─── Mutation: Execute Transition ───────────────────────────────────────────

export async function executeTransition(
  instanceId: number | string,
  action: string,
  comment?: string,
  contextUpdates?: Record<string, unknown>
): Promise<TransitionHistoryEntry> {
  const body: Record<string, unknown> = { action };
  if (comment) body.comment = comment;
  if (contextUpdates) body.context_updates = contextUpdates;

  return api.post<TransitionHistoryEntry>(
    `/workflows/instances/${instanceId}/execute/`,
    body,
  );
}

// ─── Mutation: Create Workflow Instance ──────────────────────────────────────

export async function createWorkflowInstance(data: {
  workflow: number;
  project: number;
  content_type: number;
  object_id: number;
  context?: Record<string, unknown>;
}): Promise<WorkflowInstance> {
  return api.post<WorkflowInstance>(
    '/workflows/instances/',
    data,
  );
}
