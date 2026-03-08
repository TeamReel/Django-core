/**
 * Files domain API — S3 file assets, uploads, presigned URLs.
 *
 * ```ts
 * import { filesApi } from '@/api';
 * const { results } = await filesApi.list({ pathPrefix: 'photos/' });
 * const asset = await filesApi.upload(file, { organization: orgId });
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type { FileAsset } from '../types/api';

/* ------------------------------------------------------------------ */
/*  File Assets                                                        */
/* ------------------------------------------------------------------ */

export const filesApi = {
  /** List file assets (paginated). */
  list(params?: { pathPrefix?: string }, opts?: ListOptions) {
    return api.list<FileAsset>('/files/', {
      ...opts,
      params: { path_prefix: params?.pathPrefix, ...opts?.params },
    });
  },

  /** List ALL file assets across pages. */
  listAll(params?: { pathPrefix?: string }, opts?: ListAllOptions) {
    return api.listAll<FileAsset>('/files/', {
      ...opts,
      params: { path_prefix: params?.pathPrefix, ...opts?.params },
    });
  },

  /** Upload a file. */
  upload(file: File, fields?: { organization?: string; [key: string]: string | undefined }, opts?: MutateOptions) {
    // Filter out undefined values
    const cleanFields: Record<string, string> = {};
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) cleanFields[k] = v;
      }
    }
    return api.upload<FileAsset>('/files/', file, cleanFields, opts);
  },

  /** Get a download URL for a file. */
  getDownloadUrl(id: string, signal?: AbortSignal) {
    return api.get<{ url: string }>(`/files/${id}/download/`, signal);
  },

  /** Get a presigned upload URL. */
  getPresignedUrl(data: { filename: string; content_type: string; organization?: string }, opts?: MutateOptions) {
    return api.post<{ upload_url: string; file_id: string }>('/files/presigned-urls/', data, opts);
  },
};
