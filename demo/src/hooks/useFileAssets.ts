/**
 * useFileAssets Hook
 *
 * Fetches file assets (raw uploads) from the files API.
 * Requires X-Organization-ID header for org scoping.
 *
 * API: GET /api/v1/files/
 */

import { useState, useCallback, useRef } from 'react';
import { api, filesApi } from '@/api';
import type { ListResult } from '@/api';

// ============================================================================
// Types
// ============================================================================

export interface FileAsset {
  id: string;
  organization: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  original_name: string;
  file_size: number;
  mime_type: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  /** Download URL — fetched separately via /files/{id}/download/ */
  download_url?: string;
}

export type FileTypeFilter = 'all' | 'image' | 'video' | 'document' | 'font';

export function getFileTypeFilter(mimeType: string): FileTypeFilter {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('font/') || mimeType === 'application/x-font-ttf' || mimeType === 'application/x-font-opentype') return 'font';
  return 'document';
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'film';
  if (mimeType.startsWith('audio/')) return 'music';
  if (mimeType.includes('pdf')) return 'file-text';
  if (mimeType.startsWith('font/')) return 'type';
  return 'folder';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export interface UseFileAssetsReturn {
  files: FileAsset[];
  loading: boolean;
  error: string | null;
  fetchFiles: (orgId: string) => Promise<void>;
  getDownloadUrl: (fileId: string) => Promise<string | null>;
}

// ============================================================================
// Hook
// ============================================================================

export function useFileAssets(): UseFileAssetsReturn {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getHeaders = (orgId?: string): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (orgId) headers['X-Organization-ID'] = orgId;
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    if (csrfToken) headers['X-CSRFToken'] = csrfToken;
    return headers;
  };

  const fetchFiles = useCallback(async (orgId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const all = await api.listAll<FileAsset>('/files/', {
        pageSize: 100,
        signal: controller.signal,
        params: { 'X-Organization-ID': orgId },
      });
      setFiles(all);
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === 'AbortError') && !(typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to load files');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const getDownloadUrl = useCallback(async (fileId: string): Promise<string | null> => {
    try {
      const data = await filesApi.getDownloadUrl(fileId);
      return data.url || null;
    } catch {
      return null;
    }
  }, []);

  return { files, loading, error, fetchFiles, getDownloadUrl };
}
