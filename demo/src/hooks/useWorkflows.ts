import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api';
import type { ListResult } from '@/api';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkflowState {
  name: string;
  is_initial?: boolean;
}

export interface WorkflowTransition {
  from_state: string;
  to_state: string;
  action: string;
  required_permission?: string;
  validators?: string[];
}

export interface WorkflowDefinition {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  version: string;
  definition: WorkflowDefinition;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailableAction {
  action: string;
  to_state: string;
  required_permission: string;
}

export interface WorkflowInstance {
  id: number;
  workflow: number;
  workflow_name: string;
  workflow_version: string;
  workflow_snapshot: WorkflowDefinition;
  project: number;
  content_type: number;
  content_type_name: string;
  object_id: number;
  current_state: string;
  context: Record<string, any>;
  version: number;
  created_by: number | null;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
  available_actions: string[];
}

export interface TransitionHistoryEntry {
  id: number;
  instance: number;
  from_state: string;
  to_state: string;
  action: string;
  actor: number | null;
  actor_username?: string;
  comment: string;
  task_id: string | null;
  context_snapshot: Record<string, any>;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function unwrapResults<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (payload?.data && Array.isArray(payload.data.results)) return payload.data.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
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
        const data = await api.get<any>('/workflows/templates/?is_active=true');
        setTemplates(unwrapResults<WorkflowTemplate>(data));
        setError(null);
      } catch (err: unknown) {
        console.error(err);
        if (DEBUG_LOGS) console.error('[useWorkflowTemplates] Error:', err);
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

        const data = await api.get<any>(`/workflows/instances/?${params.toString()}`);
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
        console.error(err);
        if (DEBUG_LOGS) console.error('[useWorkflowInstances] Error:', err);
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
        console.error(err);
        if (DEBUG_LOGS) console.error('[useWorkflowInstance] Error:', err);
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
        const data = await api.get<any>(`/workflows/history/?instance=${instanceId}&ordering=-created_at`);
        setHistory(unwrapResults<TransitionHistoryEntry>(data));
        setError(null);
      } catch (err: unknown) {
        console.error(err);
        if (DEBUG_LOGS) console.error('[useTransitionHistory] Error:', err);
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
  contextUpdates?: Record<string, any>
): Promise<TransitionHistoryEntry> {
  const body: Record<string, any> = { action };
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
  context?: Record<string, any>;
}): Promise<WorkflowInstance> {
  return api.post<WorkflowInstance>(
    '/workflows/instances/',
    data,
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export type WorkflowStateCategory = 'initial' | 'active' | 'review' | 'terminal_success' | 'terminal_failure';

/** Classify a state name into a visual category */
export function classifyState(stateName: string): WorkflowStateCategory {
  const s = stateName.toLowerCase();
  if (s === 'draft' || s === 'new' || s === 'created') return 'initial';
  if (s === 'review' || s === 'in_review' || s === 'pending_review' || s === 'pending') return 'review';
  if (s === 'approved' || s === 'published' || s === 'completed' || s === 'resolved' || s === 'done') return 'terminal_success';
  if (s === 'rejected' || s === 'cancelled' || s === 'closed' || s === 'failed') return 'terminal_failure';
  return 'active';
}

/** Map a state category to display properties */
export function getStateDisplay(stateName: string): { color: string; bgColor: string; icon: string; label: string } {
  const category = classifyState(stateName);
  const label = stateName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  switch (category) {
    case 'initial':
      return { color: 'var(--app-muted-text)', bgColor: 'var(--app-surface-2)', icon: 'file-text', label };
    case 'active':
      return { color: 'var(--color-blue-600)', bgColor: 'var(--color-blue-100)', icon: 'refresh-cw', label };
    case 'review':
      return { color: 'var(--color-amber-500)', bgColor: 'var(--color-amber-100)', icon: 'eye', label };
    case 'terminal_success':
      return { color: 'var(--color-green-600)', bgColor: 'var(--color-green-100)', icon: 'check-circle-2', label };
    case 'terminal_failure':
      return { color: 'var(--color-red-500)', bgColor: 'var(--color-red-100)', icon: 'x-circle', label };
  }
}

/** Map an action name to a display style */
export function getActionDisplay(action: string): { color: string; bgColor: string; hoverBgColor: string; icon: string; label: string } {
  const a = action.toLowerCase();
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (a === 'approve' || a === 'publish' || a === 'resolve' || a === 'complete') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-green-600)', hoverBgColor: 'var(--color-green-600)', icon: 'check-circle-2', label };
  }
  if (a === 'reject' || a === 'cancel' || a === 'close') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-red-500)', hoverBgColor: 'var(--color-red-600)', icon: 'x-circle', label };
  }
  if (a === 'submit' || a === 'request_review') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-blue-600)', hoverBgColor: 'var(--color-blue-700)', icon: 'send', label };
  }
  if (a === 'revise' || a === 'reopen' || a === 'resubmit') {
    return { color: 'var(--color-white, #fff)', bgColor: 'var(--color-amber-500)', hoverBgColor: 'var(--color-amber-600)', icon: 'refresh-cw', label };
  }
  // Default
  return { color: 'var(--color-white, #fff)', bgColor: 'var(--app-muted-text)', hoverBgColor: 'var(--color-neutral-500)', icon: 'play', label };
}
