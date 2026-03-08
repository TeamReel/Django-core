/**
 * useFileAssets Hook
 *
 * Fetches file assets (raw uploads) from the files API.
 * Requires X-Organization-ID header for org scoping.
 *
 * API: GET /api/v1/files/
 */

import { useState, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

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
      const base = getApiBaseUrl();

      // Fetch all pages (files API uses BaseAPIPagination: { data: [...], meta: { pagination: { next } } })
      const all: FileAsset[] = [];
      let nextUrl: string | null = `${base}/api/v1/files/?page_size=100`;
      while (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: getHeaders(orgId),
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to load files: ${res.statusText}`);
        const json = await res.json();
        const arr = Array.isArray(json.data) ? json.data : Array.isArray(json.data?.results) ? json.data.results : Array.isArray(json.results) ? json.results : [];
        all.push(...arr);
        nextUrl = json.meta?.pagination?.next || json.data?.next || json.next || null;
      }
      setFiles(all);
    } catch (err: unknown) {
      console.error(err);
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load files');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const getDownloadUrl = useCallback(async (fileId: string): Promise<string | null> => {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/v1/files/${fileId}/download/`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  }, []);

  return { files, loading, error, fetchFiles, getDownloadUrl };
}
