/**
 * Public barrel for `@/api`.
 *
 * ```ts
 * import { api, ApiError } from '@/api';
 * ```
 */

export { api } from './client';
export type { ApiClient, ListResult, ListOptions, ListAllOptions, MutateOptions } from './client';
export { ApiError } from './errors';
