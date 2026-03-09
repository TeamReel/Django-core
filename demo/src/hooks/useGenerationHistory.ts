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
import { api, contentApi, generativeApi } from '@/api';

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
      // Fetch both template types in parallel
      const [assetData, contentData] = await Promise.all([
        api.get<any>('/generative/assets/templates/', controller.signal).catch(() => null),
        api.list<ContentTemplate>('/content-generation/templates/', {
          signal: controller.signal,
          params: orgId ? { organisation: orgId } : undefined,
        }).catch(() => null),
      ]);

      if (assetData) {
        const arr = Array.isArray(assetData?.templates) ? assetData.templates : Array.isArray(assetData?.results) ? assetData.results : Array.isArray(assetData) ? assetData : [];
        setAssetTemplates(arr);
      }

      if (contentData) {
        setContentTemplates(contentData.results);
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get<any>('/generative/assets/history/');
      const arr = Array.isArray(data?.history) ? data.history : Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setHistory(arr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  return { assetTemplates, contentTemplates, history, loading, error, fetchTemplates, fetchHistory };
}
