/**
 * useGenerationHistory Hook
 *
 * Fetches generation history and available templates from the generative API.
 * Used by AI Studio page for template browsing and generation history.
 *
 * APIs:
 *   GET /api/v1/generative/assets/templates/  — available templates
 *   GET /api/v1/generative/assets/history/     — generation history
 *   GET /api/v1/content-generation/templates/  — content generation templates
 */

import { useState, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

// ============================================================================
// Types
// ============================================================================

export interface AssetTemplate {
  id: string;
  name: string;
  description?: string;
  template_type?: string;
  template_subtype?: string;
  category?: string;
  credits_required?: number;
  is_active?: boolean;
}

export interface ContentTemplate {
  id: number;
  name: string;
  description?: string;
  template_type: string;
  template_subtype?: string;
  sport_type?: string;
  ai_workflow_id: string;
  credits_required: number;
  is_active: boolean;
  organisation?: string;
  project?: number;
}

export interface GenerationHistoryItem {
  id: string;
  template_id?: string;
  template_name?: string;
  variant_count?: number;
  status?: string;
  created_at?: string;
  params?: Record<string, unknown>;
  output_type?: string;
}

export type TemplateCategory = 'all' | 'asset' | 'pre_match' | 'during_match' | 'post_match' | 'season' | 'member' | 'custom';

const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  all: 'All Templates',
  asset: 'Asset Generation',
  pre_match: 'Pre-Match',
  during_match: 'During Match',
  post_match: 'Post-Match',
  season: 'Season',
  member: 'Member',
  custom: 'Custom',
};

export function getTemplateCategoryLabel(category: TemplateCategory): string {
  return TEMPLATE_CATEGORY_LABELS[category] || category;
}

export interface UseGenerationHistoryReturn {
  assetTemplates: AssetTemplate[];
  contentTemplates: ContentTemplate[];
  history: GenerationHistoryItem[];
  loading: boolean;
  error: string | null;
  fetchTemplates: (orgId?: string) => Promise<void>;
  fetchHistory: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useGenerationHistory(): UseGenerationHistoryReturn {
  const [assetTemplates, setAssetTemplates] = useState<AssetTemplate[]>([]);
  const [contentTemplates, setContentTemplates] = useState<ContentTemplate[]>([]);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    if (csrfToken) headers['X-CSRFToken'] = csrfToken;
    return headers;
  };

  const fetchTemplates = useCallback(async (orgId?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const base = getApiBaseUrl();

      // Fetch both template types in parallel
      const [assetRes, contentRes] = await Promise.all([
        fetch(`${base}/api/v1/generative/assets/templates/`, {
          headers: getHeaders(),
          credentials: 'include',
          signal: controller.signal,
        }),
        fetch(`${base}/api/v1/content-generation/templates/${orgId ? `?organisation=${orgId}` : ''}`, {
          headers: getHeaders(),
          credentials: 'include',
          signal: controller.signal,
        }),
      ]);

      if (assetRes.ok) {
        const data = await assetRes.json();
        setAssetTemplates(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      }

      if (contentRes.ok) {
        const data = await contentRes.json();
        setContentTemplates(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load templates');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/v1/generative/assets/history/`, {
        headers: getHeaders(),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  return { assetTemplates, contentTemplates, history, loading, error, fetchTemplates, fetchHistory };
}
